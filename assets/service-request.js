(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const name = (params.get('service_name') || 'Your service').slice(0, 180);
  const heading = document.querySelector('[data-request-task]');
  if (heading) heading.textContent = name;
  const link = document.querySelector('[data-request-whatsapp]');
  if (link) link.href = 'https://wa.me/919473946181?text=' + encodeURIComponent('Please confirm availability, requirements and the complete price for: ' + name);
})();
