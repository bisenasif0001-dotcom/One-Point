"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { config } = require("./config");
const { fromPaise } = require("./utils");

function pdfEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function textLine(text, x, y, size = 12) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
}

function buildSimplePdf(lines) {
  const content = lines.join("\n");
  const objects = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj");
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  objects.push(`5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

function generateInvoicePdf({ invoice, order, transaction, customer, items }) {
  const now = new Date(invoice.issued_at || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const lines = [
    textLine(config.business.name, 48, 790, 22),
    textLine("Payment Invoice", 48, 764, 16),
    textLine(`Invoice No: ${invoice.invoice_no}`, 48, 730),
    textLine(`Order ID: ${order.order_id}`, 48, 712),
    textLine(`Transaction ID: ${transaction?.transaction_id || "Pending"}`, 48, 694),
    textLine(`Date: ${now}`, 48, 676),
    textLine(`Customer: ${customer.name}`, 48, 646),
    textLine(`Phone: ${customer.phone}`, 48, 628),
    textLine(`Email: ${customer.email || "-"}`, 48, 610),
    textLine(`Address: ${customer.address || "-"}`, 48, 592),
    textLine("Items", 48, 558, 14)
  ];

  let y = 536;
  items.slice(0, 12).forEach((item) => {
    lines.push(textLine(`${item.item_name} x ${item.quantity} - Rs. ${fromPaise(item.total_paise).toFixed(2)}`, 58, y));
    y -= 18;
  });

  lines.push(textLine(`Subtotal: Rs. ${fromPaise(order.subtotal_paise).toFixed(2)}`, 360, 230));
  lines.push(textLine(`GST: Rs. ${fromPaise(order.gst_paise).toFixed(2)}`, 360, 212));
  lines.push(textLine(`Discount: Rs. ${fromPaise(order.discount_paise).toFixed(2)}`, 360, 194));
  lines.push(textLine(`Delivery: Rs. ${fromPaise(order.delivery_paise).toFixed(2)}`, 360, 176));
  lines.push(textLine(`Total Paid: Rs. ${fromPaise(order.total_paise).toFixed(2)}`, 360, 150, 15));
  lines.push(textLine("This invoice was generated after server-side payment verification.", 48, 98, 10));
  lines.push(textLine(`Support: ${config.business.phone} | ${config.business.email}`, 48, 82, 10));

  return buildSimplePdf(lines);
}

function saveInvoicePdf(context) {
  const pdfDir = path.join(config.rootDir, "backend", "data", "invoices");
  fs.mkdirSync(pdfDir, { recursive: true });
  const filePath = path.join(pdfDir, `${context.invoice.invoice_no}.pdf`);
  fs.writeFileSync(filePath, generateInvoicePdf(context));
  return filePath;
}

module.exports = {
  generateInvoicePdf,
  saveInvoicePdf
};
