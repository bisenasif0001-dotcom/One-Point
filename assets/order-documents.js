(async function () {
  const order = new URLSearchParams(location.search).get('order');
  const state = document.getElementById('document-state');
  if (!order) { state.textContent = 'Open this page from your order to attach documents to the correct request.'; return; }
  document.getElementById('document-order-label').textContent = 'Order: ' + order;
  document.getElementById('document-login').href = 'login.html?' + new URLSearchParams({ returnUrl: location.pathname + location.search });
  async function refresh() {
    const docsResponse = await fetch('/api/orders/' + encodeURIComponent(order) + '/documents', { headers: OPDSDocuments.headers(), credentials: 'same-origin' });
    if (!docsResponse.ok) throw new Error('Sign in to the account that owns this order to view and upload its documents.');
    const docs = await docsResponse.json();
    const response = await fetch('/api/payments/status/' + encodeURIComponent(order), { headers: OPDSDocuments.headers() });
    if (!response.ok) throw new Error('Order details unavailable. Please retry.');
    const data = await response.json();
    state.textContent = data.documentSubmission.label;
    const requirements = document.getElementById('order-document-requirements'); requirements.replaceChildren();
    for (const label of data.documentRequirements.length ? data.documentRequirements : ['The operator will confirm files or artwork needed for this order.']) { const item = document.createElement('li'); item.textContent = label; requirements.append(item); }
    const list = document.getElementById('order-document-list'); list.replaceChildren();
    for (const doc of docs.documents) { const item = document.createElement('li'); item.textContent = doc.file_name + ' — ' + (doc.has_file_content ? (doc.verification_status || 'Review pending') : 'File content still needed'); list.append(item); }
    document.getElementById('order-document-form').hidden = false;
    document.getElementById('document-login').hidden = true;
    const whatsapp = document.getElementById('document-whatsapp'); whatsapp.hidden = false; whatsapp.href = 'https://wa.me/919473946181?text=' + encodeURIComponent('Documents for order ' + order + '. Please review my required documents.');
  }
  const picker = document.getElementById('order-document-files');
  const selection = document.getElementById('order-document-selected');
  let previews = [];
  const clearPreviews = () => { previews.forEach(url => URL.revokeObjectURL(url)); previews = []; selection.replaceChildren(); };
  document.getElementById('order-document-camera').addEventListener('click', () => {
    picker.accept = 'image/jpeg,image/png'; picker.setAttribute('capture', 'environment'); picker.multiple = false; picker.click();
  });
  picker.addEventListener('cancel', () => { picker.removeAttribute('capture'); picker.accept = '.pdf,.jpg,.jpeg,.png'; picker.multiple = true; });
  picker.addEventListener('change', () => {
    picker.removeAttribute('capture'); picker.accept = '.pdf,.jpg,.jpeg,.png'; picker.multiple = true;
    clearPreviews();
    for (const file of picker.files) {
      const item = document.createElement('p'); item.textContent = file.name + ' — ';
      if (/\.(pdf|jpe?g|png)$/i.test(file.name) && file.size && file.size <= OPDSDocuments.MAX_BYTES) {
        const url = URL.createObjectURL(file); previews.push(url);
        const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Preview selected file'; item.append(link);
      } else item.append('Choose a supported non-empty file up to 3MB.');
      selection.append(item);
    }
  });
  window.addEventListener('pagehide', clearPreviews);
  document.getElementById('order-document-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.target.querySelector('button[type=submit]'); const feedback = document.getElementById('order-upload-feedback'); button.disabled = true;
    try { const failures = await OPDSDocuments.sendFiles(order, Array.from(document.getElementById('order-document-files').files), (done, total, result) => { feedback.textContent = `Checked ${done} of ${total} files; ${result.sent} received, ${result.failed} failed`; }); await refresh(); feedback.textContent = failures.length ? failures.map(file => file.name + ': ' + file.message).join('. ') + ' Retry the failed files.' : 'Files received. Operator review is pending.'; if (!failures.length) { event.target.reset(); clearPreviews(); } }
    catch (error) { feedback.textContent = error.message; } finally { button.disabled = false; }
  });
  try { await refresh(); } catch (error) { state.textContent = error.message; }
})();
