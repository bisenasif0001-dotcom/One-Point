// Read-only checks: never submit bookings, credentials or payment requests.
const fs = require('node:fs');
const path = require('node:path');
const backend = new URL(process.argv[2] || 'http://13.233.73.157/');
const frontend = new URL(process.argv[3] || 'https://bisenasif0001-dotcom.github.io/One-Point/');
if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password) {
  throw new Error('Use an HTTP(S) backend URL without credentials.');
}
const endpoints = ['/api/health', '/api/products', '/api/csrf', '/api/payment-methods'];
async function inspect(endpoint) {
  try {
    const response = await fetch(new URL(endpoint, backend), {
      headers: { Origin: frontend.origin }, signal: AbortSignal.timeout(12000), redirect: 'error'
    });
    const data = await response.json().catch(() => null);
    const cookie = response.headers.get('set-cookie') || '';
    const contract = endpoint === '/api/health' ? !!data && (data.ok === true || data.status === 'healthy')
      : endpoint === '/api/products' ? !!data && Array.isArray(data.products) && Array.isArray(data.services)
      : endpoint === '/api/csrf' ? !!data && typeof data.csrfToken === 'string' && data.csrfToken.length > 0
      : !!data && Array.isArray(data.methods);
    return { endpoint, status: response.status, contract,
      corsOriginMatches: response.headers.get('access-control-allow-origin') === frontend.origin,
      corsCredentials: response.headers.get('access-control-allow-credentials') === 'true',
      ...(endpoint === '/api/csrf' ? { csrfCookiePresent: /opds_csrf=/.test(cookie),
        csrfCookieSecure: /;\s*Secure\b/i.test(cookie),
        csrfCookieSameSite: cookie.match(/SameSite=([^;]+)/i)?.[1] || null } : {}) };
  } catch (error) {
    return { endpoint, status: null, contract: false, error: error.cause?.code || error.name };
  }
}
(async () => {
  const checks = await Promise.all(endpoints.map(inspect));
  const secureBackend = backend.protocol === 'https:';
  const report = { checkedAt: new Date().toISOString(), frontend: frontend.href,
    backend: backend.origin, secureBackend,
    mixedContentBlocked: frontend.protocol === 'https:' && !secureBackend,
    crossSiteSessionNeedsVerification: frontend.hostname !== backend.hostname,
    checks, transactionVerified: false,
    note: 'GET checks only. Healthy endpoints do not verify booking, gateway or browser cookie compatibility.' };
  const output = path.resolve(__dirname, '../artifacts/deployment-readiness.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log('Report: ' + output);
  if (!secureBackend || checks.some(check => !check.contract || check.status !== 200)) process.exitCode = 1;
})();
