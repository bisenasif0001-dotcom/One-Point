import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PanelHeader, Card, Icon, Badge } from '../Shared';
import { useApp } from '../AppContext';

const WA_TEMPLATES = [
  { id: 'wa_pan_update',    name: 'PAN Application Status Update', category: 'Utility',   content: 'Hello {{name}}, your PAN Card application ({{order_id}}) is now under verification. Expect completion in 1-2 days. Track here: {{link}}' },
  { id: 'wa_festive_offer', name: 'Festive Offer & Discount',       category: 'Marketing', content: 'Special Offer, {{name}}! Get 20% off on your next GST Registration or Passport renewal. Use code: SERVICE20. Valid for 48 hours!' },
  { id: 'wa_doc_reminder',  name: 'Pending Document Reminder',      category: 'Utility',   content: 'Urgent: {{name}}, we are waiting for your Aadhaar card copies to process your order {{order_id}}. Please upload immediately to avoid delays.' },
  { id: 'wa_complete',      name: 'Service Completed Notification',  category: 'Utility',   content: 'Great news, {{name}}! Your order {{order_id}} has been completed. Please visit us to collect your documents. Thank you!' },
  { id: 'wa_payment',       name: 'Payment Confirmation',            category: 'Utility',   content: 'Payment confirmed! ₹{{amount}} received for order {{order_id}}. Our team will now process your application. Track: {{link}}' },
];

const TOKEN = localStorage.getItem('opds_admin_token') || '';

function getCsrf() {
  return document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
}

// AI reply engine — matches keywords and returns smart reply
function aiReply(text: string, customerName = 'Customer', orderId = '') {
  const t = text.toLowerCase();
  if (t.includes('refund') || t.includes('cancel') || t.includes('wapas'))
    return `Dear ${customerName}, our refund policy allows full refund within 7 days if processing hasn't started. Please visit our office or call ${window.location.origin.includes('localhost') ? '9473946181' : '9473946181'} for assistance.`;
  if (t.includes('kab tak') || t.includes('kitne din') || t.includes('how long') || t.includes('time') || t.includes('status'))
    return `${customerName} ji, standard processing times:\n• PAN Card: 1–2 days\n• GST Registration: 2–3 days\n• Passport: 10–15 days\n• Income Certificate: 1–2 days\n\nYour application is on schedule. ${orderId ? `Track: ${window.location.origin}/track-application.html?id=${orderId}` : ''}`;
  if (t.includes('document') || t.includes('upload') || t.includes('paper') || t.includes('dastavez'))
    return `${customerName} ji, required documents for most services:\n1. Aadhaar Card (Front & Back)\n2. Recent Passport Photo\n3. Mobile number linked to Aadhaar\n\nPlease upload at: ${window.location.origin}/track-application.html${orderId ? '?id=' + orderId : ''}`;
  if (t.includes('price') || t.includes('kitna') || t.includes('cost') || t.includes('fees') || t.includes('charge'))
    return `Our service charges:\n• PAN Card: ₹499\n• GST Registration: ₹1,200\n• Passport Assistance: ₹2,000\n• Income Certificate: ₹150\n• Voter ID: ₹200\n\nAll prices include processing fees. Visit: ${window.location.origin}/services.html`;
  if (t.includes('track') || t.includes('where') || t.includes('kahan') || t.includes('progress'))
    return `${customerName} ji, track your application live here:\n${window.location.origin}/track-application.html${orderId ? '?id=' + orderId : ''}\n\nYou can also visit our center with your application number.`;
  if (t.includes('hello') || t.includes('hi') || t.includes('namaste') || t.includes('help'))
    return `Namaste ${customerName} ji! 🙏 Welcome to One Point Digital Services.\n\nMain aapki kaise madad kar sakta hoon? Aap puch sakte hain:\n• Application status\n• Document requirements\n• Service pricing\n• Refund/cancellation\n\nOr type your query directly!`;
  return `${customerName} ji, thank you for contacting One Point Digital Services. Our expert team is reviewing your query.\n\nFor urgent help: 📞 9473946181\nFor tracking: ${window.location.origin}/track-application.html\n\nHuman agent will join shortly if needed.`;
}

export const WhatsAppPanel = () => {
  const { role, customers, addActivity, addNotification } = useApp();
  const isCustomer = role === 'customer';

  // ─── Admin: Chat state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab]           = useState<'chats' | 'broadcast'>('chats');
  const [selectedChatIdx, setSelectedChatIdx] = useState(0);
  const [takeover, setTakeover]             = useState(false);
  const [inputValue, setInputValue]         = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Per-customer message history
  const [chatHistories, setChatHistories] = useState<Record<string, any[]>>({});

  // ─── Broadcast state ──────────────────────────────────────────────────────
  const [campaignName, setCampaignName]       = useState('Summer Special Campaign');
  const [selectedTemplate, setSelectedTemplate] = useState(WA_TEMPLATES[0].id);
  const [selectedAudience, setSelectedAudience] = useState('all');
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [broadcastLogs, setBroadcastLogs]     = useState<any[]>([]);

  // Build chat list from real customers
  const chatList = useMemo(() => {
    const base = customers.map((c, i) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      lastMsg: c.orders[0] ? `Applied for ${c.orders[0].service}` : 'New contact',
      time: c.orders[0]?.date || c.joined || 'Recent',
      unread: Math.random() > 0.6 ? 1 : 0,
      color: c.color || 'var(--blue)',
      initials: c.initials || c.name.slice(0, 2).toUpperCase(),
      latestOrder: c.orders[0]?.id || '',
    }));
    if (base.length === 0) {
      return [
        { id: 'demo1', name: 'Nida Begum',    phone: '+91 98765 43210', lastMsg: 'Mera PAN kab tak banega?', time: '09:42 AM', unread: 1, color: 'var(--blue)',   initials: 'NB', latestOrder: '' },
        { id: 'demo2', name: 'Rahul Sharma',  phone: '+91 87654 32109', lastMsg: 'Document uploaded.',       time: '14m',      unread: 0, color: 'var(--violet)', initials: 'RS', latestOrder: '' },
        { id: 'demo3', name: 'Sanjay Kumar',  phone: '+91 76543 21098', lastMsg: 'Thanks!',                  time: '1h',       unread: 0, color: 'var(--amber)',  initials: 'SK', latestOrder: '' },
      ];
    }
    return base;
  }, [customers]);

  const filteredChats = useMemo(() =>
    searchQuery.trim()
      ? chatList.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery))
      : chatList,
    [chatList, searchQuery]
  );

  const selectedChat = filteredChats[selectedChatIdx] || filteredChats[0] || chatList[0];

  // Get messages for selected chat, initialise with greeting if new
  const messages = useMemo(() => {
    if (!selectedChat) return [];
    if (chatHistories[selectedChat.id]) return chatHistories[selectedChat.id];
    return [
      { id: 1, sender: 'customer', text: selectedChat.lastMsg || 'Hello', time: selectedChat.time || '09:00 AM' },
      { id: 2, sender: 'bot', text: aiReply(selectedChat.lastMsg || 'hello', selectedChat.name, selectedChat.latestOrder), time: selectedChat.time || '09:00 AM' },
    ];
  }, [selectedChat?.id, chatHistories]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChatIdx]);

  // Load broadcast logs
  useEffect(() => {
    fetch('/api/admin/notifications?channel=whatsapp&limit=20', { headers: { 'X-Admin-Token': TOKEN } })
      .then(r => r.json())
      .then(d => {
        if (d.logs?.length) {
          setBroadcastLogs(d.logs.map((l: any) => ({
            name: l.event, template: l.event, audience: l.recipient,
            sent: 1, delivered: l.status === 'sent' ? 1 : 0,
            time: new Date(l.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            status: l.status === 'sent' ? 'Delivered' : 'Logged',
          })));
        }
      }).catch(() => {});
  }, []);

  const pushMsg = (chatId: string, msg: any) => {
    setChatHistories(prev => {
      const existing = prev[chatId] || messages;
      return { ...prev, [chatId]: [...existing, msg] };
    });
  };

  const handleSend = (fromCustomer = false) => {
    if (!inputValue.trim() || !selectedChat) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { id: Date.now(), sender: fromCustomer ? 'customer' : 'agent', text: inputValue, time: now };
    pushMsg(selectedChat.id, newMsg);
    const query = inputValue;
    setInputValue('');

    if (fromCustomer && !takeover) {
      setTimeout(() => {
        pushMsg(selectedChat.id, {
          id: Date.now() + 1, sender: 'bot',
          text: aiReply(query, selectedChat.name, selectedChat.latestOrder),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }, 700);
    }
  };

  const sendQuickTemplate = (templateId: string) => {
    if (!selectedChat) return;
    const t = WA_TEMPLATES.find(x => x.id === templateId);
    if (!t) return;
    const msg = t.content
      .replace('{{name}}', selectedChat.name)
      .replace('{{order_id}}', selectedChat.latestOrder || 'your order')
      .replace('{{link}}', `${window.location.origin}/track-application.html${selectedChat.latestOrder ? '?id=' + selectedChat.latestOrder : ''}`)
      .replace('{{amount}}', '499');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    pushMsg(selectedChat.id, { id: Date.now(), sender: 'agent', text: `[Template: ${t.name}]\n\n${msg}`, time: now });
    addActivity({ text: `WhatsApp template "${t.name}" sent to ${selectedChat.name}`, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'message-circle' });
    addNotification({ title: `WhatsApp Sent`, sub: `Template "${t.name}" sent to ${selectedChat.name}`, time: 'just now', color: 'var(--emerald)', icon: 'message-circle', panelTarget: 'whatsapp' });
  };

  const handleSendBroadcast = async () => {
    if (!campaignName.trim()) return;
    setBroadcastStatus('sending');
    const tObj = WA_TEMPLATES.find(t => t.id === selectedTemplate);
    const msg = tObj?.content.replace('{{name}}', 'Customer').replace('{{order_id}}', 'your order').replace('{{link}}', window.location.origin + '/track-application.html').replace('{{amount}}', '499') || campaignName;
    try {
      const csrf = getCsrf();
      const res  = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ event: `wa_broadcast_${selectedTemplate}`, message: msg, audience: selectedAudience }),
      });
      const data = await res.json();
      const sent = data.sent || customers.length;
      setBroadcastLogs(prev => [{ name: campaignName, template: tObj?.name || 'Template', audience: `${sent} contacts`, sent, delivered: sent, time: 'Just now', status: data.ok ? 'Queued for delivery' : 'Logged' }, ...prev]);
      setBroadcastStatus('success');
      addActivity({ text: `WhatsApp Broadcast "${campaignName}" queued for ${sent} recipients`, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'send' });
      addNotification({ title: 'Broadcast Queued', sub: `"${campaignName}" — ${sent} messages`, time: 'just now', color: 'var(--emerald)', icon: 'check-circle', panelTarget: 'whatsapp' });
      setTimeout(() => setBroadcastStatus('idle'), 3000);
    } catch { setBroadcastStatus('idle'); }
  };

  const activeTpl = WA_TEMPLATES.find(t => t.id === selectedTemplate);

  // ─── Customer view ────────────────────────────────────────────────────────
  if (isCustomer) {
    return (
      <div className="panel active" style={{ display: 'flex', flexDirection: 'column' }}>
        <PanelHeader title="WhatsApp Support" sub="Official One Point Digital Services Support · End-to-End Encrypted" actions={<Badge type="success"><Icon name="check-circle" size={12} /> Official Business Account</Badge>} />
        <div className="panels" style={{ flex: 1, paddingBottom: 0 }}>
          <Card bodyClass="card-body-flush" style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="cust-avatar" style={{ background: 'var(--emerald)', color: '#fff', width: 40, height: 40 }}><Icon name="message-circle" size={22} /></div>
                <div>
                  <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>One Point CSC Expert Support <Icon name="check-circle" size={13} style={{ color: 'var(--blue)', display: 'inline' }} /></div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} /> Online · AI replies instantly</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { const phone = '919473946181'; window.open(`https://wa.me/${phone}`, '_blank'); }}><Icon name="phone" size={14} /> Call Support</button>
            </div>
            <div style={{ flex: 1, minHeight: 360, padding: 20, overflowY: 'auto', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ alignSelf: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-3)', background: 'var(--bg-2)', padding: '3px 14px', borderRadius: 16, border: '1px solid var(--border-1)' }}>Today · 256-bit Encrypted</div>
              {messages.map(m => (
                <div key={m.id} style={{ alignSelf: m.sender === 'customer' ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: m.sender === 'customer' ? 'flex-end' : 'flex-start' }}>
                  {m.sender === 'bot' && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--violet)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><Icon name="sparkles" size={11} /> One Point AI Assistant</div>}
                  {m.sender === 'agent' && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', marginBottom: 2 }}>Asif Bisen (CSC Expert)</div>}
                  <div style={{ background: m.sender === 'customer' ? 'var(--blue)' : 'var(--bg-2)', color: m.sender === 'customer' ? '#fff' : 'var(--text-1)', padding: '10px 14px', borderRadius: 14, borderTopLeftRadius: m.sender === 'customer' ? 14 : 4, borderTopRightRadius: m.sender === 'customer' ? 4 : 14, border: m.sender !== 'customer' ? '1px solid var(--border-1)' : 'none', fontSize: 'var(--fs-sm)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>{m.time}{m.sender === 'bot' ? ' · AI Reply' : ''}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="text" className="form-input" placeholder="Type your message..." style={{ flex: 1, borderRadius: 10 }} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend(true)} />
              <button className="btn btn-primary" style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)', borderRadius: 'var(--radius-sm)' }} onClick={() => handleSend(true)}><Icon name="send" size={14} /></button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Admin view ───────────────────────────────────────────────────────────
  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title="WhatsApp Control Center" sub="1-on-1 conversations, AI chatbot, bulk broadcast campaigns" actions={
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 8, padding: 3 }}>
          {(['chats', 'broadcast'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '4px 14px', borderRadius: 6, border: 'none', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', cursor: 'pointer', background: activeTab === tab ? 'var(--bg-1)' : 'transparent', color: activeTab === tab ? 'var(--text-1)' : 'var(--text-3)', transition: 'all 0.15s' }}>
              <Icon name={tab === 'chats' ? 'message-circle' : 'send'} size={13} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
              {tab === 'chats' ? 'Live Chats' : 'Broadcast Campaigns'}
            </button>
          ))}
        </div>
      } />

      <div className="panels" style={{ flex: 1, paddingBottom: 0, overflow: 'hidden' }}>
        {activeTab === 'chats' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: '100%' }}>

            {/* Chat List */}
            <Card bodyClass="card-body-flush" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)' }}>
                <input type="text" className="form-input" placeholder="Search chats..." style={{ width: '100%' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredChats.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>No chats found</div>
                ) : filteredChats.map((c, i) => (
                  <div key={c.id} onClick={() => { setSelectedChatIdx(i); setTakeover(false); }} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-1)', cursor: 'pointer', background: selectedChatIdx === i ? 'var(--bg-hover, rgba(59,130,246,0.06))' : 'transparent', display: 'flex', gap: 10, alignItems: 'center', transition: 'background 0.1s' }}>
                    <div className="cust-avatar" style={{ background: selectedChatIdx === i ? c.color : 'var(--bg-3)', color: selectedChatIdx === i ? '#fff' : 'var(--text-2)', width: 38, height: 38, fontSize: 'var(--fs-sm)', flexShrink: 0 }}>{c.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        <span style={{ fontSize: 'var(--fs-xs)', color: c.unread ? 'var(--emerald)' : 'var(--text-3)', flexShrink: 0 }}>{typeof c.time === 'string' ? c.time.slice(0, 8) : c.time}</span>
                      </div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMsg}</div>
                    </div>
                    {c.unread > 0 && <div style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--emerald)', color: '#fff', fontSize: 'var(--fs-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'var(--fw-semibold)', flexShrink: 0 }}>{c.unread}</div>}
                  </div>
                ))}
              </div>
            </Card>

            {/* Chat Window */}
            {selectedChat ? (
              <Card bodyClass="card-body-flush" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="cust-avatar" style={{ background: selectedChat.color || 'var(--blue)', width: 38, height: 38, fontSize: 'var(--fs-sm)' }}>{selectedChat.initials}</div>
                    <div>
                      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{selectedChat.name}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{selectedChat.phone}{selectedChat.latestOrder ? ` · Order: ${selectedChat.latestOrder}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Quick template buttons */}
                    <select className="form-input" style={{ fontSize: 'var(--fs-xs)', height: 30, padding: '0 8px' }} onChange={e => { if (e.target.value) { sendQuickTemplate(e.target.value); e.target.value = ''; } }}>
                      <option value="">Quick Template...</option>
                      {WA_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {takeover ? <Badge type="info">Human Agent Active</Badge> : <Badge type="success">AI Bot Active</Badge>}
                    <button className={`btn btn-sm ${takeover ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setTakeover(!takeover)}>
                      <Icon name={takeover ? 'bot' : 'user'} size={13} /> {takeover ? 'Hand to AI' : 'Take Over'}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 200 }}>
                  <div style={{ alignSelf: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-3)', background: 'var(--bg-2)', padding: '2px 12px', borderRadius: 12 }}>Today</div>
                  {messages.map(m => (
                    <div key={m.id} style={{ alignSelf: m.sender === 'customer' ? 'flex-start' : 'flex-end', maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: m.sender === 'customer' ? 'flex-start' : 'flex-end' }}>
                      {m.sender === 'bot'   && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--violet)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', display: 'flex', gap: 4, alignItems: 'center' }}><Icon name="sparkles" size={10} />AI Smart Reply</div>}
                      {m.sender === 'agent' && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Agent Reply</div>}
                      <div style={{ background: m.sender === 'customer' ? 'var(--bg-2)' : 'var(--blue)', color: m.sender === 'customer' ? 'var(--text-1)' : '#fff', padding: '9px 13px', borderRadius: 11, borderTopLeftRadius: m.sender === 'customer' ? 3 : 11, borderTopRightRadius: m.sender === 'customer' ? 11 : 3, border: m.sender === 'customer' ? '1px solid var(--border-1)' : 'none', fontSize: 'var(--fs-sm)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.text}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>{m.time}{m.sender === 'bot' ? ' · FAQ Engine' : ''}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {!takeover && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--amber)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)' }}>
                        <Icon name="flask-conical" size={13} /> Simulate Customer Query (AI Testing)
                      </div>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <input type="text" className="form-input form-input-sm" placeholder="Try: 'kab tak', 'refund', 'document'..." style={{ width: 240 }} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend(true)} />
                        <button className="btn btn-ghost btn-sm" onClick={() => handleSend(true)}>Send</button>
                      </div>
                    </div>
                  )}
                  {takeover && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" className="form-input" placeholder={`Type a message to ${selectedChat.name}...`} style={{ flex: 1 }} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend(false)} />
                      <button className="btn btn-primary btn-sm" style={{ padding: '0 16px' }} onClick={() => handleSend(false)}><Icon name="send" size={14} /></button>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                  <Icon name="message-circle" size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div>Select a chat to start messaging</div>
                </div>
              </Card>
            )}
          </div>
        ) : (
          /* Broadcast tab */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, overflowY: 'auto', paddingRight: 4 }}>
            <Card title="Create WhatsApp Broadcast" sub="Send official template messages to customer segments">
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 6 }}>Campaign Name</label>
                  <input type="text" className="form-input" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Festive Offer June 2026" />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 6 }}>Target Audience</label>
                  <select className="form-input" value={selectedAudience} onChange={e => setSelectedAudience(e.target.value)}>
                    <option value="all">All Registered Customers ({customers.length} contacts)</option>
                    <option value="premium">Premium Tier ({customers.filter(c => c.tier === 'Premium').length} contacts)</option>
                    <option value="pending_payment">Pending Payment Queue</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 6 }}>Message Template</label>
                  <select className="form-input" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                    {WA_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                  </select>
                </div>
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', textTransform: 'uppercase' }}>Preview</span>
                    <Badge type="success">DLT Approved</Badge>
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, background: 'var(--bg-3)', padding: 12, borderRadius: 8, borderLeft: '3px solid var(--emerald)', whiteSpace: 'pre-wrap' }}>{activeTpl?.content}</div>
                  <div style={{ marginTop: 8, fontSize: 'var(--fs-xs)', color: 'var(--text-4)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Variables: {'{{name}}'}, {'{{order_id}}'}, {'{{link}}'}</span>
                    <span>~₹0.50 / delivery</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setActiveTab('chats')}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSendBroadcast} disabled={broadcastStatus === 'sending'} style={{ minWidth: 160, opacity: broadcastStatus === 'sending' ? 0.7 : 1 }}>
                    {broadcastStatus === 'sending' ? <><Icon name="loader-2" size={14} className="spin" /> Sending...</> : broadcastStatus === 'success' ? <><Icon name="check" size={14} /> Sent!</> : <><Icon name="send" size={14} /> Send Broadcast</>}
                  </button>
                </div>
              </div>
            </Card>

            <Card title="Campaign History" sub="Recent broadcast delivery reports from backend">
              <div style={{ padding: '8px 0' }}>
                {broadcastLogs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>No campaigns sent yet. Send a broadcast to see logs here.</div>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Campaign</th><th>Template / Audience</th><th>Sent</th><th>Status</th></tr></thead>
                    <tbody>
                      {broadcastLogs.map((log, i) => (
                        <tr key={i}>
                          <td><div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{log.name}</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{log.time}</div></td>
                          <td><div style={{ fontSize: 'var(--fs-xs)' }}>{log.template}</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{log.audience}</div></td>
                          <td style={{ fontWeight: 'var(--fw-semibold)' }}>{log.sent}</td>
                          <td><Badge type="success">{log.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
