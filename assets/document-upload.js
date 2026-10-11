(function () {
  const MAX_BYTES = 3 * 1024 * 1024;
  function headers() {
    const token = localStorage.getItem('opds_customer_session') || '';
    return token ? { 'X-Session-Token': token } : {};
  }
  async function send(orderId, file, docType = 'supporting_document') {
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name) || !file.size || file.size > MAX_BYTES) throw new Error('Choose a PDF, JPG or PNG up to 3MB.');
    const fileData = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('File could not be read.')); reader.readAsDataURL(file); });
    const csrfResponse = await fetch('/api/csrf', { credentials: 'same-origin' });
    if (!csrfResponse.ok) throw new Error('Upload session unavailable. Please retry.');
    const csrf = await csrfResponse.json();
    const response = await fetch('/api/orders/document-files', { method: 'POST', credentials: 'same-origin', headers: { ...headers(), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrfToken }, body: JSON.stringify({ orderId, fileName: file.name, docType, fileData }) });
    const result = await response.json();
    if (!response.ok || !result.ok) { window.OPDSPilotMetrics?.track('upload_error'); throw new Error(result.message || 'Upload failed. Sign in to the account that owns this order and retry.'); }
    return result;
  }
  async function sendFiles(orderId, files, progress = () => {}) {
    const failures = [];
    for (let index = 0; index < files.length; index++) {
      try { await send(orderId, files[index]); } catch (error) { failures.push({ name: files[index].name, message: error.message }); }
      progress(index + 1, files.length, { sent: index + 1 - failures.length, failed: failures.length });
    }
    return failures;
  }
  window.OPDSDocuments = { send, sendFiles, headers, MAX_BYTES };
})();
