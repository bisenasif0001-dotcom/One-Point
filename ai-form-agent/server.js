const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { recognize } = require('tesseract.js');

const publicDir = path.join(__dirname, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function extractFields(text) {
  const compact = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const pan = compact.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/i)?.[0]?.toUpperCase() || '';
  const dob = compact.match(/\b(?:0?[1-9]|[12]\d|3[01])[\/-](?:0?[1-9]|1[0-2])[\/-](?:19|20)\d{2}\b/)?.[0] || '';
  const mobile = compact.match(/(?<!\d)(?:\+91[ -]?)?[6-9]\d{9}(?!\d)/)?.[0] || '';
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const nameLine = lines.find(line => /^(?:applicant )?name\s*[:.-]\s*.+/i.test(line));
  const rowContainingDob = dob && lines.find(line => line.includes(dob));
  const extractedName = nameLine
    ? nameLine.replace(/^(?:applicant )?name\s*[:.-]\s*/i, '')
    : rowContainingDob
      ? rowContainingDob.slice(0, rowContainingDob.indexOf(dob))
      : '';
  const applicantName = extractedName.replace(/[^A-Za-z .]/g, '').trim();
  const addressLabel = lines.findIndex(line => /^address\b/i.test(line));
  const address = addressLabel >= 0 ? (lines[addressLabel + 1] || '').trim() : '';
  return { applicantName, dob, pan, mobile, address };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 8 * 1024 * 1024) reject(new Error('Upload is too large.'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/extract') {
    try {
      const { files } = JSON.parse(await readBody(req));
      const image = Array.isArray(files) && files.find(file => /^image\/(png|jpe?g|webp)$/i.test(file.type));
      if (!image?.data) return sendJson(res, 400, { error: 'Select a clear JPG, PNG or WEBP image. PDF extraction will be added next.' });
      const buffer = Buffer.from(image.data, 'base64');
      const { data } = await recognize(buffer, 'eng');
      sendJson(res, 200, { text: data.text, fields: extractFields(data.text) });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Could not read this document.' });
    }
    return;
  }

  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) return res.writeHead(403).end('Forbidden');
  fs.readFile(filePath, (error, content) => {
    if (error) return res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
}).listen(process.env.PORT || 4174, () => console.log('AI Form Agent running on http://localhost:4174'));
