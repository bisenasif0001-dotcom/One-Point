const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const documents = require('./document-service');
const db = require('./db');
const MAX_BYTES = 3 * 1024 * 1024;
function store(order, body, userId) {
  const extension = path.extname(String(body.fileName || '')).toLowerCase();
  const encoded = String(body.fileData || '');
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4) throw new Error('Valid file data is required.');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Maximum file size is 3MB.');
  const pdf = extension === '.pdf' && bytes.subarray(0, 5).toString() === '%PDF-';
  const png = extension === '.png' && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg = ['.jpg', '.jpeg'].includes(extension) && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!pdf && !png && !jpg) throw new Error('Choose a real PDF, JPG or PNG file.');
  const mimeType = pdf ? 'application/pdf' : png ? 'image/png' : 'image/jpeg';
  const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
  const duplicate = db.get('SELECT id FROM order_documents WHERE order_id = ? AND content_hash = ?', [order.id, contentHash]);
  if (duplicate) return { duplicate: true };
  const directory = path.join(__dirname, 'uploads', 'customer-documents');
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, crypto.randomUUID() + extension);
  fs.writeFileSync(filePath, bytes, { flag: 'wx' });
  try {
    documents.registerUpload({ orderId: order.id, docType: String(body.docType || 'supporting_document').slice(0, 120), fileName: path.basename(String(body.fileName)).replace(/[^a-zA-Z0-9._\-() ]/g, '_').slice(0, 200), filePath, mimeType, fileSizeBytes: bytes.length, contentHash, uploadedBy: 'customer', actorType: 'customer', actorId: userId, source: 'customer_file_upload' });
  } catch (error) { fs.unlinkSync(filePath); throw error; }
  return { duplicate: false };
}
function submission(order) {
  const count = db.get("SELECT COUNT(*) AS count FROM order_documents WHERE order_id = ? AND file_path IS NOT NULL AND file_path != ''", [order.id]).count;
  return { state: count ? 'awaiting_review' : 'awaiting_documents', count, label: count ? 'Documents received — operator review pending' : 'Documents pending — send files for this order', uploadUrl: '/order-documents.html?order=' + encodeURIComponent(order.order_id) };
}
module.exports = { store, submission, MAX_BYTES };
