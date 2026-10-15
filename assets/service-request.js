(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const confirmedTasks = {
    'tenant-police-verification': 'Tenant Police Verification Assistance',
    'domestic-staff-police-verification': 'Domestic Staff Police Verification Support',
    'cyber-fraud-complaint-filing': 'Cyber Fraud Complaint Filing Assistance'
  };
  const slug = params.get('service');
  if (Object.prototype.hasOwnProperty.call(confirmedTasks, slug)) {
    const query = new URLSearchParams({ service: slug, service_name: confirmedTasks[slug] });
    location.replace('checkout.html?' + query);
    return;
  }
  const name = (params.get('service_name') || params.get('task') || params.get('service') || 'Your service').slice(0, 180);
  const heading = document.querySelector('[data-request-task]');
  if (heading) heading.textContent = name;
  const link = document.querySelector('[data-request-whatsapp]');
  if (link) {
    link.href = 'https://wa.me/919473946181?text=' + encodeURIComponent('Please confirm availability, requirements and the complete price for: ' + name);
    document.querySelectorAll('[data-request-sticky-link]').forEach(action => { action.href = link.href; });
  }
})();
