const panels = [...document.querySelectorAll('.panel')];
const steps = [...document.querySelectorAll('.step')];
let current = 1;

function show(step) {
  current = Math.min(4, Math.max(1, step));
  panels.forEach(panel => panel.classList.toggle('hidden', panel.id !== `step-${current}`));
  steps.forEach(button => button.classList.toggle('active', Number(button.dataset.step) === current));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.service').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.service').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
}));

document.querySelectorAll('.next').forEach(button => button.addEventListener('click', () => {
  if (current === 3) {
    const blank = [...document.querySelectorAll('[data-required]')].some(input => !input.value.trim());
    if (blank) return alert('Please complete all required draft fields.');
    if (!document.querySelector('#review-approved').checked) return alert('Please review and approve the draft before continuing.');
  }
  show(current + 1);
}));

document.querySelectorAll('.back').forEach(button => button.addEventListener('click', () => show(current - 1)));
steps.forEach(button => button.addEventListener('click', () => {
  const target = Number(button.dataset.step);
  if (target <= current) show(target);
}));

document.querySelector('#documents').addEventListener('change', event => {
  const files = [...event.target.files];
  document.querySelector('#file-status').textContent = files.length ? `${files.length} file(s) selected: ${files.map(file => file.name).join(', ')}` : 'No documents selected.';
});

document.querySelector('#extract').addEventListener('click', async () => {
  const selected = [...document.querySelector('#documents').files];
  if (!document.querySelector('#consent').checked) return alert('Please provide document-processing consent before reading the document.');
  if (!selected.length) return alert('Please choose a clear document image first.');
  const image = selected.find(file => file.type.startsWith('image/'));
  if (!image) return alert('This first OCR version accepts clear JPG, PNG or WEBP images.');
  if (image.size > 5 * 1024 * 1024) return alert('Choose an image smaller than 5 MB.');

  const button = document.querySelector('#extract');
  button.disabled = true;
  button.textContent = 'Reading document…';
  try {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not read selected image.'));
      reader.readAsDataURL(image);
    });
    const response = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: [{ name: image.name, type: image.type, data }] }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Document reading failed.');
    Object.entries(result.fields).forEach(([field, value]) => {
      const input = document.querySelector(`[data-field="${field}"]`);
      if (input && value) input.value = value;
    });
    document.querySelector('[data-field="address"]').focus();
    show(3);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Read document and create draft →';
  }
});

document.querySelector('#handoff').addEventListener('click', () => {
  document.querySelector('#handoff-status').textContent = 'Portal handoff is intentionally disabled in this prototype. The production adapter will open only an approved official portal and pause for every protected action.';
});

document.querySelector('#restart').addEventListener('click', () => show(1));
