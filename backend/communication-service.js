"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const db = require("./db");
const enterpriseEventService = require("./events/enterprise-event-service");

const CONVERSATION_STATUSES = new Set([
  "Open",
  "Waiting for Customer",
  "Waiting for Staff",
  "Resolved",
  "Closed",
  "Archived"
]);
const PARTICIPANT_TYPES = new Set(["Customer", "Staff", "AI Employee", "Department", "System", "Vendor"]);
const OWNER_TYPES = new Set(["Customer", "Staff", "AI Employee", "Department", "System"]);
const CHANNEL_TYPES = new Set(["Website Chat", "WhatsApp", "SMS", "Email", "Phone", "Future Channel"]);
const MESSAGE_TYPES = new Set(["Text", "Image", "Document", "System", "Workflow Update", "Notification", "Payment", "Voice Placeholder", "Video Placeholder"]);
const MESSAGE_LIFECYCLES = new Set(["Queued", "Sending", "Sent", "Delivered", "Read", "Failed", "Archived"]);
const MESSAGE_DIRECTIONS = new Set(["Inbound", "Outbound", "System"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function ensureEnum(value, allowed, label, fallback) {
  const normalized = cleanText(value || fallback, 80);
  if (!allowed.has(normalized)) {
    const error = new Error(`${label} is not a governed value.`);
    error.code = "COMMUNICATION_VALIDATION_FAILED";
    throw error;
  }
  return normalized;
}

function ensureUuid(value, label) {
  const candidate = cleanText(value || crypto.randomUUID(), 80);
  if (!UUID_PATTERN.test(candidate)) {
    const error = new Error(`${label} must be a valid UUID.`);
    error.code = "COMMUNICATION_VALIDATION_FAILED";
    throw error;
  }
  return candidate;
}

function normalizeChannel(value) {
  const key = cleanText(value, 40).toLowerCase();
  const map = {
    "website chat": "Website Chat",
    website: "Website Chat",
    dashboard: "Website Chat",
    whatsapp: "WhatsApp",
    sms: "SMS",
    email: "Email",
    phone: "Phone",
    voice: "Phone",
    "future channel": "Future Channel"
  };
  return ensureEnum(map[key] || value, CHANNEL_TYPES, "channel_type", "Website Chat");
}

function normalizePhone(value) {
  return cleanText(value, 40).replace(/\D/g, "");
}

function customerIdentity(dbConn, { userId = null, phone = "", email = "", name = "Customer" } = {}) {
  let user = null;
  if (userId) user = dbConn.prepare("SELECT id, name, phone, email FROM users WHERE id = ?").get(userId);
  if (!user && phone) user = dbConn.prepare("SELECT id, name, phone, email FROM users WHERE phone = ?").get(cleanText(phone, 40));
  if (!user && email) user = dbConn.prepare("SELECT id, name, phone, email FROM users WHERE lower(email) = lower(?)").get(cleanText(email, 180));

  if (user) {
    return {
      participantId: String(user.id),
      displayName: cleanText(user.name || name, 180) || "Customer",
      userId: Number(user.id)
    };
  }

  const phoneDigits = normalizePhone(phone);
  if (phoneDigits) return { participantId: `phone:${phoneDigits}`, displayName: cleanText(name, 180) || "Customer", userId: null };
  const cleanEmail = cleanText(email, 180).toLowerCase();
  if (cleanEmail) return { participantId: `email:${cleanEmail}`, displayName: cleanText(name, 180) || "Customer", userId: null };
  return { participantId: `anonymous:${crypto.randomUUID()}`, displayName: cleanText(name, 180) || "Customer", userId: null };
}

function addParticipantRecord(dbConn, conversationId, participant = {}) {
  const participantType = ensureEnum(participant.participantType, PARTICIPANT_TYPES, "participant_type", "System");
  const participantId = cleanText(participant.participantId, 180);
  if (!participantId) {
    const error = new Error("participant_id is required.");
    error.code = "COMMUNICATION_VALIDATION_FAILED";
    throw error;
  }
  dbConn.prepare(`
    INSERT INTO conversation_participants
      (conversation_id, participant_type, participant_id, display_name, active, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(conversation_id, participant_type, participant_id) DO UPDATE SET
      display_name = COALESCE(excluded.display_name, conversation_participants.display_name),
      active = excluded.active
  `).run(
    conversationId,
    participantType,
    participantId,
    cleanText(participant.displayName, 180) || null,
    participant.active === false ? 0 : 1,
    JSON.stringify(participant.metadata || {})
  );
  return dbConn.prepare(`
    SELECT id FROM conversation_participants
    WHERE conversation_id = ? AND participant_type = ? AND participant_id = ?
  `).get(conversationId, participantType, participantId).id;
}

function addChannelRecord(dbConn, conversationId, channel = {}) {
  const channelType = normalizeChannel(channel.channelType || channel);
  const channelReference = cleanText(channel.channelReference, 240) || null;
  dbConn.prepare(`
    INSERT INTO conversation_channels
      (conversation_id, channel_type, channel_reference, active, metadata_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT DO UPDATE SET
      active = excluded.active,
      last_used_at = CURRENT_TIMESTAMP
  `).run(
    conversationId,
    channelType,
    channelReference,
    channel.active === false ? 0 : 1,
    JSON.stringify(channel.metadata || {})
  );
}

function insertConversationRecord(dbConn, input = {}) {
  const participants = Array.isArray(input.participants) ? input.participants.filter(Boolean) : [];
  if (participants.length === 0) {
    const error = new Error("Every conversation must contain at least one participant.");
    error.code = "COMMUNICATION_VALIDATION_FAILED";
    throw error;
  }

  const conversationUuid = ensureUuid(input.conversationUuid, "conversation_uuid");
  const operationalStatus = ensureEnum(input.operationalStatus, CONVERSATION_STATUSES, "operational_status", "Open");
  const ownerType = ensureEnum(input.ownerType, OWNER_TYPES, "owner_type", "System");
  const ownerId = cleanText(input.ownerId || "system", 180);
  const result = dbConn.prepare(`
    INSERT INTO conversations
      (conversation_uuid, operational_status, subject, owner_type, owner_id,
       linked_object_type, linked_object_uuid, created_by_type, created_by_id, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    conversationUuid,
    operationalStatus,
    cleanText(input.subject, 240) || null,
    ownerType,
    ownerId,
    cleanText(input.linkedObjectType, 100) || null,
    cleanText(input.linkedObjectUuid, 180) || null,
    cleanText(input.createdByType || ownerType, 80),
    cleanText(input.createdById || ownerId, 180) || null,
    JSON.stringify(input.metadata || {})
  );
  const conversationId = Number(result.lastInsertRowid);

  const participantIds = new Map();
  for (const participant of participants) {
    const participantId = addParticipantRecord(dbConn, conversationId, participant);
    participantIds.set(`${participant.participantType}:${participant.participantId}`, participantId);
  }
  const channels = Array.isArray(input.channels) && input.channels.length ? input.channels : ["Website Chat"];
  for (const channel of channels) addChannelRecord(dbConn, conversationId, channel);

  return { conversationId, conversationUuid, participantIds };
}

function insertMessageRecord(dbConn, conversation, input = {}) {
  const conversationId = Number(conversation.conversationId || conversation.id);
  if (!conversationId) {
    const error = new Error("A valid conversation is required for every message.");
    error.code = "COMMUNICATION_VALIDATION_FAILED";
    throw error;
  }
  const messageUuid = ensureUuid(input.messageUuid, "message_uuid");
  const messageType = ensureEnum(input.messageType, MESSAGE_TYPES, "message_type", "Text");
  const lifecycleStatus = ensureEnum(input.lifecycleStatus, MESSAGE_LIFECYCLES, "lifecycle_status", "Queued");
  const direction = ensureEnum(input.direction, MESSAGE_DIRECTIONS, "direction", "System");
  const channelType = normalizeChannel(input.channelType || "Website Chat");
  const ownerType = ensureEnum(input.ownerType, OWNER_TYPES, "owner_type", "System");
  const ownerId = cleanText(input.ownerId || "system", 180);
  const result = dbConn.prepare(`
    INSERT INTO conversation_messages
      (message_uuid, conversation_id, message_type, lifecycle_status, direction, channel_type,
       sender_participant_id, owner_type, owner_id, content, linked_object_type,
       linked_object_uuid, metadata_json, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
  `).run(
    messageUuid,
    conversationId,
    messageType,
    lifecycleStatus,
    direction,
    channelType,
    input.senderParticipantId || null,
    ownerType,
    ownerId,
    cleanText(input.content, 10000) || null,
    cleanText(input.linkedObjectType, 100) || null,
    cleanText(input.linkedObjectUuid, 180) || null,
    JSON.stringify(input.metadata || {}),
    cleanText(input.occurredAt, 80) || null
  );
  addChannelRecord(dbConn, conversationId, { channelType });
  dbConn.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);
  enterpriseEventService.publishEventWithDb(dbConn, {
    eventKey: "communication.message.logged",
    publisherKey: "communication_service_publisher",
    linkedObjectType: cleanText(input.linkedObjectType, 100) || "Conversation",
    linkedObjectUuid: cleanText(input.linkedObjectUuid, 180) || cleanText(conversation.conversationUuid, 180) || null,
    sourceTable: "conversation_messages",
    sourcePk: Number(result.lastInsertRowid),
    correlationId: cleanText(conversation.conversationUuid, 180) || messageUuid,
    processContextKey: "communication_context",
    occurredAt: cleanText(input.occurredAt, 80) || null,
    actorType: ownerType,
    actorId: ownerId,
    payload: {
      messageUuid,
      messageType,
      lifecycleStatus,
      direction,
      channelType,
      linkedObjectType: cleanText(input.linkedObjectType, 100) || null,
      linkedObjectUuid: cleanText(input.linkedObjectUuid, 180) || null
    },
    metadata: {
      communicationSource: cleanText(input.metadata?.source, 120) || null
    }
  });
  return { messageId: Number(result.lastInsertRowid), messageUuid };
}

function findReusableConversation(dbConn, { participantId, linkedObjectType = null, linkedObjectUuid = null } = {}) {
  if (linkedObjectType && linkedObjectUuid) {
    const linked = dbConn.prepare(`
      SELECT id AS conversationId, conversation_uuid AS conversationUuid
      FROM conversations
      WHERE linked_object_type = ? AND linked_object_uuid = ?
        AND operational_status NOT IN ('Closed', 'Archived')
      ORDER BY updated_at DESC LIMIT 1
    `).get(linkedObjectType, linkedObjectUuid);
    if (linked) return linked;
  }
  if (!participantId) return null;
  return dbConn.prepare(`
    SELECT c.id AS conversationId, c.conversation_uuid AS conversationUuid
    FROM conversations c
    JOIN conversation_participants p ON p.conversation_id = c.id
    WHERE p.participant_type = 'Customer' AND p.participant_id = ? AND p.active = 1
      AND c.operational_status NOT IN ('Closed', 'Archived')
    ORDER BY c.updated_at DESC LIMIT 1
  `).get(participantId) || null;
}

function ensureCustomerConversation(dbConn, input = {}) {
  const identity = customerIdentity(dbConn, input.customer || {});
  let conversation = findReusableConversation(dbConn, {
    participantId: identity.participantId,
    linkedObjectType: input.linkedObjectType,
    linkedObjectUuid: input.linkedObjectUuid
  });
  if (!conversation) {
    conversation = insertConversationRecord(dbConn, {
      operationalStatus: input.operationalStatus || "Open",
      subject: input.subject,
      ownerType: input.ownerType || "System",
      ownerId: input.ownerId || "system",
      linkedObjectType: input.linkedObjectType,
      linkedObjectUuid: input.linkedObjectUuid,
      createdByType: input.createdByType || "System",
      createdById: input.createdById || "system",
      metadata: input.metadata,
      participants: [
        { participantType: "Customer", participantId: identity.participantId, displayName: identity.displayName },
        { participantType: "System", participantId: "one-point-service-os", displayName: "One Point Service OS" }
      ],
      channels: input.channels || ["Website Chat"]
    });
  } else {
    for (const channel of input.channels || []) addChannelRecord(dbConn, conversation.conversationId, channel);
  }
  return { ...conversation, identity };
}

function notificationMessageType(event, payload = {}) {
  const value = cleanText(event, 100).toLowerCase();
  if (payload.payment || value.includes("payment") || value.includes("refund")) return "Payment";
  if (value.includes("status") || value.includes("workflow") || value.includes("order")) return "Workflow Update";
  return "Notification";
}

function legacyNotificationLifecycle(status) {
  const value = cleanText(status, 40).toLowerCase();
  if (value === "queued") return "Queued";
  if (value === "sending") return "Sending";
  if (value === "sent") return "Sent";
  if (value === "delivered") return "Delivered";
  if (value === "failed") return "Failed";
  return "Sent";
}

function notificationLink(payload = {}) {
  const candidates = [
    ["Order", payload.order?.object?.universalUuid],
    ["Payment", payload.payment?.object?.universalUuid],
    ["Invoice", payload.invoice?.object?.universalUuid],
    ["Refund", payload.refund?.object?.universalUuid]
  ];
  const match = candidates.find(([, uuid]) => uuid);
  return match ? { linkedObjectType: match[0], linkedObjectUuid: match[1] } : {};
}

function insertGovernedNotification({ event, channel, recipient, payload = {}, status = "logged" }) {
  return db.withTransaction((dbConn) => {
    const channelType = normalizeChannel(channel);
    const customer = {
      userId: payload.customer?.object?.sourcePk,
      name: payload.customer?.name,
      phone: channelType === "Email" ? payload.customer?.phone : recipient,
      email: channelType === "Email" ? recipient : payload.customer?.email
    };
    const link = notificationLink(payload);
    const conversation = ensureCustomerConversation(dbConn, {
      customer,
      subject: cleanText(event, 240) || "Customer notification",
      channels: [{ channelType, channelReference: recipient }],
      linkedObjectType: link.linkedObjectType,
      linkedObjectUuid: link.linkedObjectUuid,
      ownerType: "System",
      ownerId: "notification-service",
      metadata: { source: "notifications" }
    });
    const message = insertMessageRecord(dbConn, conversation, {
      messageType: notificationMessageType(event, payload),
      lifecycleStatus: legacyNotificationLifecycle(status),
      direction: "Outbound",
      channelType,
      ownerType: "System",
      ownerId: "notification-service",
      content: payload.message || event,
      linkedObjectType: link.linkedObjectType,
      linkedObjectUuid: link.linkedObjectUuid,
      metadata: { event, source: "notifications" }
    });
    const result = dbConn.prepare(`
      INSERT INTO notifications
        (event, channel, recipient, status, payload_json, conversation_uuid, message_uuid)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(event, channel, recipient, status, JSON.stringify(payload), conversation.conversationUuid, message.messageUuid);
    return {
      notificationId: Number(result.lastInsertRowid),
      conversationUuid: conversation.conversationUuid,
      messageUuid: message.messageUuid
    };
  });
}

function updateNotificationLifecycle(notificationId, lifecycleStatus) {
  const governedStatus = ensureEnum(lifecycleStatus, MESSAGE_LIFECYCLES, "lifecycle_status", "Sent");
  db.run(`
    UPDATE conversation_messages
    SET lifecycle_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE message_uuid = (SELECT message_uuid FROM notifications WHERE id = ?)
  `, [governedStatus, notificationId]);
}

function createSupportTicket(input = {}) {
  return db.withTransaction((dbConn) => {
    const ticketId = cleanText(input.ticketId || `TKT-${Date.now().toString().slice(-6)}`, 80);
    const identity = customerIdentity(dbConn, {
      userId: input.customerUserId,
      phone: input.customerPhone,
      name: input.customerName
    });
    const conversation = insertConversationRecord(dbConn, {
      operationalStatus: "Open",
      subject: cleanText(input.subject, 240) || "Support",
      ownerType: input.ownerType || "Department",
      ownerId: input.ownerId || "support",
      linkedObjectType: "Support Ticket",
      linkedObjectUuid: ticketId,
      createdByType: input.createdByType || "Customer",
      createdById: input.createdById || identity.participantId,
      metadata: { source: "support_tickets" },
      participants: [
        { participantType: "Customer", participantId: identity.participantId, displayName: identity.displayName },
        { participantType: "Department", participantId: "support", displayName: "Support" }
      ],
      channels: [input.channelType || "Website Chat"]
    });
    const customerParticipant = dbConn.prepare(`
      SELECT id FROM conversation_participants
      WHERE conversation_id = ? AND participant_type = 'Customer' AND participant_id = ?
    `).get(conversation.conversationId, identity.participantId);
    const message = insertMessageRecord(dbConn, conversation, {
      messageType: "Text",
      lifecycleStatus: "Sent",
      direction: "Inbound",
      channelType: input.channelType || "Website Chat",
      senderParticipantId: customerParticipant?.id,
      ownerType: "Customer",
      ownerId: identity.participantId,
      content: input.message,
      linkedObjectType: input.orderId ? "Order" : "Support Ticket",
      linkedObjectUuid: input.orderId || ticketId,
      metadata: { ticketId }
    });
    dbConn.prepare(`
      INSERT INTO support_tickets
        (ticket_id, customer_phone, customer_name, subject, message, order_id, status,
         conversation_uuid, initial_message_uuid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticketId,
      cleanText(input.customerPhone, 40) || null,
      cleanText(input.customerName, 180) || identity.displayName,
      cleanText(input.subject, 240) || "Support",
      cleanText(input.message, 10000) || null,
      cleanText(input.orderId, 100) || null,
      cleanText(input.status || "open", 40),
      conversation.conversationUuid,
      message.messageUuid
    );
    return { ticketId, conversationUuid: conversation.conversationUuid, messageUuid: message.messageUuid };
  });
}

function createCustomerConversation(input = {}) {
  return db.withTransaction((dbConn) => {
    const channelType = normalizeChannel(input.channelType || "Website Chat");
    const channelReference = cleanText(input.channelReference || input.customerPhone || input.customerEmail, 240) || null;
    const conversation = ensureCustomerConversation(dbConn, {
      customer: {
        userId: input.customerUserId,
        phone: input.customerPhone,
        email: input.customerEmail,
        name: input.customerName || "Customer"
      },
      subject: input.subject || "Customer conversation",
      channels: [{ channelType, channelReference }],
      linkedObjectType: input.linkedObjectType || null,
      linkedObjectUuid: input.linkedObjectUuid || null,
      ownerType: input.ownerType || "Staff",
      ownerId: input.ownerId || "admin",
      createdByType: input.createdByType || "Staff",
      createdById: input.createdById || "admin",
      metadata: { source: "admin_conversation_api" }
    });
    let messageUuid = null;
    if (cleanText(input.content, 10000)) {
      const direction = ensureEnum(input.direction, MESSAGE_DIRECTIONS, "direction", "Outbound");
      const message = insertMessageRecord(dbConn, conversation, {
        messageType: input.messageType || "Text",
        lifecycleStatus: input.lifecycleStatus || "Sent",
        direction,
        channelType,
        ownerType: direction === "Inbound" ? "Customer" : direction === "System" ? "System" : "Staff",
        ownerId: direction === "Inbound" ? (input.customerUserId || input.customerPhone || input.customerEmail || "customer") : (input.ownerId || "admin"),
        content: input.content,
        linkedObjectType: input.linkedObjectType || null,
        linkedObjectUuid: input.linkedObjectUuid || null,
        metadata: { source: "admin_conversation_api" }
      });
      messageUuid = message.messageUuid;
    }
    return { conversationUuid: conversation.conversationUuid, messageUuid };
  });
}

function conversationStatusForTicket(status) {
  const value = cleanText(status, 40).toLowerCase();
  if (value === "resolved" || value === "solved") return "Resolved";
  if (value === "closed") return "Closed";
  if (value === "archived") return "Archived";
  if (value === "in progress") return "Waiting for Customer";
  return "Open";
}

function updateSupportTicket(ticketId, input = {}) {
  return db.withTransaction((dbConn) => {
    const ticket = dbConn.prepare("SELECT * FROM support_tickets WHERE ticket_id = ?").get(ticketId);
    if (!ticket) {
      const error = new Error("Support ticket not found.");
      error.code = "COMMUNICATION_NOT_FOUND";
      throw error;
    }
    const status = cleanText(input.status || ticket.status || "open", 40);
    const reply = cleanText(input.reply, 10000);
    dbConn.prepare(`
      UPDATE support_tickets
      SET status = ?, reply = CASE WHEN ? <> '' THEN ? ELSE reply END, updated_at = CURRENT_TIMESTAMP
      WHERE ticket_id = ?
    `).run(status, reply, reply, ticketId);
    dbConn.prepare(`
      UPDATE conversations
      SET operational_status = ?, updated_at = CURRENT_TIMESTAMP,
          closed_at = CASE WHEN ? IN ('Closed', 'Archived') THEN CURRENT_TIMESTAMP ELSE closed_at END
      WHERE conversation_uuid = ?
    `).run(conversationStatusForTicket(status), conversationStatusForTicket(status), ticket.conversation_uuid);
    let messageUuid = null;
    if (reply) {
      const conversation = dbConn.prepare(`
        SELECT id AS conversationId, conversation_uuid AS conversationUuid
        FROM conversations WHERE conversation_uuid = ?
      `).get(ticket.conversation_uuid);
      const message = insertMessageRecord(dbConn, conversation, {
        messageType: "Text",
        lifecycleStatus: "Sent",
        direction: "Outbound",
        channelType: input.channelType || "Website Chat",
        ownerType: input.actorType || "Staff",
        ownerId: input.actorId || "admin",
        content: reply,
        linkedObjectType: "Support Ticket",
        linkedObjectUuid: ticketId,
        metadata: { ticketId, source: "support_ticket_reply" }
      });
      messageUuid = message.messageUuid;
    }
    return { ticketId, conversationUuid: ticket.conversation_uuid, messageUuid, status };
  });
}

function registerExistingNotification(row) {
  return db.withTransaction((dbConn) => {
    if (row.conversation_uuid && row.message_uuid) return { skipped: true };
    const payload = parseJson(row.payload_json, {});
    const channelType = normalizeChannel(row.channel);
    const customer = {
      userId: payload.customer?.object?.sourcePk,
      name: payload.customer?.name,
      phone: channelType === "Email" ? payload.customer?.phone : row.recipient,
      email: channelType === "Email" ? row.recipient : payload.customer?.email
    };
    const link = notificationLink(payload);
    const conversation = ensureCustomerConversation(dbConn, {
      customer,
      subject: row.event || "Customer notification",
      channels: [{ channelType, channelReference: row.recipient }],
      linkedObjectType: link.linkedObjectType,
      linkedObjectUuid: link.linkedObjectUuid,
      ownerType: "System",
      ownerId: "notification-service",
      metadata: { source: "notifications", legacyNotificationId: row.id }
    });
    const message = insertMessageRecord(dbConn, conversation, {
      messageType: notificationMessageType(row.event, payload),
      lifecycleStatus: legacyNotificationLifecycle(row.status),
      direction: "Outbound",
      channelType,
      ownerType: "System",
      ownerId: "notification-service",
      content: payload.message || row.event,
      linkedObjectType: link.linkedObjectType,
      linkedObjectUuid: link.linkedObjectUuid,
      occurredAt: row.created_at,
      metadata: { source: "notifications", legacyNotificationId: row.id }
    });
    dbConn.prepare("UPDATE notifications SET conversation_uuid = ?, message_uuid = ? WHERE id = ?")
      .run(conversation.conversationUuid, message.messageUuid, row.id);
    return { conversationUuid: conversation.conversationUuid, messageUuid: message.messageUuid };
  });
}

function registerExistingTicket(row) {
  return db.withTransaction((dbConn) => {
    if (row.conversation_uuid && row.initial_message_uuid) return { skipped: true };
    const identity = customerIdentity(dbConn, { phone: row.customer_phone, name: row.customer_name });
    const conversation = insertConversationRecord(dbConn, {
      operationalStatus: conversationStatusForTicket(row.status),
      subject: row.subject,
      ownerType: "Department",
      ownerId: "support",
      linkedObjectType: "Support Ticket",
      linkedObjectUuid: row.ticket_id,
      createdByType: "Customer",
      createdById: identity.participantId,
      metadata: { source: "support_tickets", legacyTicketId: row.id },
      participants: [
        { participantType: "Customer", participantId: identity.participantId, displayName: identity.displayName },
        { participantType: "Department", participantId: "support", displayName: "Support" }
      ],
      channels: ["Website Chat"]
    });
    const customerParticipant = dbConn.prepare(`
      SELECT id FROM conversation_participants
      WHERE conversation_id = ? AND participant_type = 'Customer' AND participant_id = ?
    `).get(conversation.conversationId, identity.participantId);
    const message = insertMessageRecord(dbConn, conversation, {
      messageType: "Text",
      lifecycleStatus: "Sent",
      direction: "Inbound",
      channelType: "Website Chat",
      senderParticipantId: customerParticipant?.id,
      ownerType: "Customer",
      ownerId: identity.participantId,
      content: row.message || row.subject,
      linkedObjectType: row.order_id ? "Order" : "Support Ticket",
      linkedObjectUuid: row.order_id || row.ticket_id,
      occurredAt: row.created_at,
      metadata: { source: "support_tickets", legacyTicketId: row.id }
    });
    if (row.reply) {
      insertMessageRecord(dbConn, conversation, {
        messageType: "Text",
        lifecycleStatus: "Sent",
        direction: "Outbound",
        channelType: "Website Chat",
        ownerType: "Staff",
        ownerId: row.assigned_to || "admin",
        content: row.reply,
        linkedObjectType: "Support Ticket",
        linkedObjectUuid: row.ticket_id,
        occurredAt: row.updated_at,
        metadata: { source: "support_tickets", legacyTicketId: row.id }
      });
    }
    dbConn.prepare("UPDATE support_tickets SET conversation_uuid = ?, initial_message_uuid = ? WHERE id = ?")
      .run(conversation.conversationUuid, message.messageUuid, row.id);
    return { conversationUuid: conversation.conversationUuid, messageUuid: message.messageUuid };
  });
}

function backfillExistingCommunications({ reportPath = null } = {}) {
  const report = {
    milestone: "Phase 2 - Milestone 2.6",
    startedAt: new Date().toISOString(),
    notifications: { discovered: 0, registered: 0, skipped: 0, failed: 0 },
    supportTickets: { discovered: 0, registered: 0, skipped: 0, failed: 0 },
    failures: []
  };
  const notifications = db.all("SELECT * FROM notifications ORDER BY id", []);
  const tickets = db.all("SELECT * FROM support_tickets ORDER BY id", []);
  report.notifications.discovered = notifications.length;
  report.supportTickets.discovered = tickets.length;

  for (const row of notifications) {
    try {
      const result = registerExistingNotification(row);
      if (result.skipped) report.notifications.skipped += 1;
      else report.notifications.registered += 1;
    } catch (error) {
      report.notifications.failed += 1;
      report.failures.push({ source: "notifications", sourcePk: row.id, error: error.message });
      console.warn(`[communication] notification ${row.id} registration failed:`, error.message);
    }
  }
  for (const row of tickets) {
    try {
      const result = registerExistingTicket(row);
      if (result.skipped) report.supportTickets.skipped += 1;
      else report.supportTickets.registered += 1;
    } catch (error) {
      report.supportTickets.failed += 1;
      report.failures.push({ source: "support_tickets", sourcePk: row.id, error: error.message });
      console.warn(`[communication] support ticket ${row.id} registration failed:`, error.message);
    }
  }
  report.completedAt = new Date().toISOString();
  report.ok = report.failures.length === 0;
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  return report;
}

function listConversationRows({ channelType = null, operationalStatus = null, customerParticipantIds = [], limit = 50 } = {}) {
  const params = [];
  const conditions = [];
  if (channelType) {
    conditions.push("EXISTS (SELECT 1 FROM conversation_channels cc WHERE cc.conversation_id = c.id AND cc.channel_type = ? AND cc.active = 1)");
    params.push(normalizeChannel(channelType));
  }
  if (operationalStatus) {
    conditions.push("c.operational_status = ?");
    params.push(ensureEnum(operationalStatus, CONVERSATION_STATUSES, "operational_status", "Open"));
  }
  if (customerParticipantIds.length) {
    const placeholders = customerParticipantIds.map(() => "?").join(", ");
    conditions.push(`EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = c.id AND cp.participant_type = 'Customer'
        AND cp.participant_id IN (${placeholders}) AND cp.active = 1
    )`);
    params.push(...customerParticipantIds);
  }
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  params.push(boundedLimit);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return db.all(`SELECT c.* FROM conversations c ${where} ORDER BY c.updated_at DESC LIMIT ?`, params);
}

function hydrateConversations(rows) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const participants = db.all(`SELECT * FROM conversation_participants WHERE conversation_id IN (${placeholders}) ORDER BY joined_at`, ids);
  const channels = db.all(`SELECT * FROM conversation_channels WHERE conversation_id IN (${placeholders}) ORDER BY first_used_at`, ids);
  const messages = db.all(`SELECT * FROM conversation_messages WHERE conversation_id IN (${placeholders}) ORDER BY occurred_at, id`, ids);
  return rows.map((row) => ({
    ...row,
    participants: participants.filter((item) => item.conversation_id === row.id),
    channels: channels.filter((item) => item.conversation_id === row.id),
    messages: messages.filter((item) => item.conversation_id === row.id)
  }));
}

function adminProjection(conversation) {
  return {
    conversationUuid: conversation.conversation_uuid,
    operationalStatus: conversation.operational_status,
    subject: conversation.subject,
    ownerType: conversation.owner_type,
    ownerId: conversation.owner_id,
    linkedObjectType: conversation.linked_object_type,
    linkedObjectUuid: conversation.linked_object_uuid,
    metadata: parseJson(conversation.metadata_json, {}),
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    participants: conversation.participants.map((participant) => ({
      participantType: participant.participant_type,
      participantId: participant.participant_id,
      displayName: participant.display_name,
      active: Boolean(participant.active),
      metadata: parseJson(participant.metadata_json, {})
    })),
    channels: conversation.channels.map((channel) => ({
      channelType: channel.channel_type,
      channelReference: channel.channel_reference,
      active: Boolean(channel.active),
      metadata: parseJson(channel.metadata_json, {})
    })),
    messages: conversation.messages.map((message) => ({
      messageUuid: message.message_uuid,
      messageType: message.message_type,
      lifecycleStatus: message.lifecycle_status,
      direction: message.direction,
      channelType: message.channel_type,
      ownerType: message.owner_type,
      ownerId: message.owner_id,
      content: message.content,
      linkedObjectType: message.linked_object_type,
      linkedObjectUuid: message.linked_object_uuid,
      metadata: parseJson(message.metadata_json, {}),
      occurredAt: message.occurred_at
    }))
  };
}

function customerProjection(conversation) {
  return {
    conversationUuid: conversation.conversation_uuid,
    operationalStatus: conversation.operational_status,
    subject: conversation.subject,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    channels: conversation.channels.filter((channel) => channel.active).map((channel) => channel.channel_type),
    messages: conversation.messages.map((message) => ({
      messageUuid: message.message_uuid,
      messageType: message.message_type,
      lifecycleStatus: message.lifecycle_status,
      direction: message.direction,
      channelType: message.channel_type,
      content: message.content,
      occurredAt: message.occurred_at
    }))
  };
}

function listAdminConversations(options = {}) {
  return hydrateConversations(listConversationRows(options)).map(adminProjection);
}

function listCustomerConversations(user, options = {}) {
  const identities = [String(user.id)];
  const phone = normalizePhone(user.phone);
  if (phone) identities.push(`phone:${phone}`);
  const email = cleanText(user.email, 180).toLowerCase();
  if (email) identities.push(`email:${email}`);
  const rows = listConversationRows({ ...options, customerParticipantIds: identities });
  return hydrateConversations(rows).map(customerProjection);
}

function addMessage(conversationUuid, input = {}) {
  return db.withTransaction((dbConn) => {
    const conversation = dbConn.prepare(`
      SELECT id AS conversationId, conversation_uuid AS conversationUuid
      FROM conversations WHERE conversation_uuid = ?
    `).get(conversationUuid);
    if (!conversation) {
      const error = new Error("Conversation not found.");
      error.code = "COMMUNICATION_NOT_FOUND";
      throw error;
    }
    const message = insertMessageRecord(dbConn, conversation, input);
    return { conversationUuid: conversation.conversationUuid, ...message };
  });
}

module.exports = {
  CONVERSATION_STATUSES,
  PARTICIPANT_TYPES,
  CHANNEL_TYPES,
  MESSAGE_TYPES,
  MESSAGE_LIFECYCLES,
  insertGovernedNotification,
  updateNotificationLifecycle,
  createCustomerConversation,
  createSupportTicket,
  updateSupportTicket,
  backfillExistingCommunications,
  listAdminConversations,
  listCustomerConversations,
  addMessage,
  adminProjection,
  customerProjection
};
