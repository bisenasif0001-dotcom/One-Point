"use strict";

const crypto = require("node:crypto");
const { timingSafeEqualString } = require("../utils");

function issueSignedPayload(payload, secret) {
  if (!secret) throw new Error("A signing secret is required.");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifySignedPayload(token, secret, expectedType) {
  try {
    if (!token || !secret) return null;
    const [data, signature] = String(token).split(".");
    if (!data || !signature) return null;
    const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    if (!timingSafeEqualString(signature, expected)) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (expectedType && payload.type !== expectedType) return null;
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  issueSignedPayload,
  verifySignedPayload
};
