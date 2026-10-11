# Local verification and later release

## Work locally

The existing read-only visual preview stays at http://127.0.0.1:4180/ (`npm run preview:ux`). It does not connect to the production backend or take real orders.

Run `npm run test:booking` for a real local HTTP/backend and 390px browser checkout test. This creates an isolated copy and test SQLite database under scratch/booking-test-*, skips .env, blocks external services and simulates the gateway adapter/checkout script. It verifies mandatory email, optional address, CSRF, server pricing, repeated request identity, pending/captured status, invoice and browser payment return. The simulator exists only in the test harness; production backend does not accept simulated gateway responses. Results: artifacts/local-booking-test.json. Test requires installed Chrome; OPDS_CHROME_PATH can override its path.

Run `npm run test:routing` for host routing, privacy and public cart handoff checks; `npm run test:ux` for the 11-width visual/interaction pilot; `npm run check` for source syntax checks.

## Release later

1. Keep GitHub Pages as the public discovery website. Deploy the same HTML/assets plus Node backend on a trusted HTTPS transaction domain. Checkout, login, account, documents, payment returns and tracking run together on that domain. This retains existing same-origin cookie and CSRF contracts and does not require third-party cookies or broad CORS changes.
2. Use transaction-host.env.example and transaction-host.nginx.conf.example as templates. Replace example host/certificate paths and configure real secrets privately. Back up the existing database before applying updates. Database paths now respect DATABASE_URL; point it at the actual existing SQLite file so a new empty database is not used accidentally. Existing PostgreSQL deployments still retain this codebase's SQLite fallback architecture; migrating database engines is outside this UX update.
3. Set transactionOrigin in assets/deployment-config.js to the HTTPS origin only, e.g. https://orders.your-domain.com. Use exactly the same asset on Pages and the transaction host. Leave empty for local preview. Scripts are included on all 16 transactional pages. Exact service/order selections survive the handoff; applicant/profile/document/session data is never transferred in the URL. A customer signs in on the transaction host; Pages sessions are not shared.
4. Cart handoff transfers slug/type/quantity only in a temporary fragment. Checkout reloads catalog prices; server prices remain authoritative. Existing product customization rules remain as currently implemented; verify configured print products separately in their scheduled work package.
5. Configure gateway callbacks/webhooks on the transaction host. NEXT_PUBLIC_SITE_URL must equal that host, not Pages or the old HTTP IP. Register corresponding OAuth callback URLs if provider sign-in is enabled.
6. Run `npm run check:deployment -- https://orders.your-domain.com` and then a real gateway sandbox transaction in a browser. The read-only report's CORS flags describe direct cross-origin API access; the proposed same-origin transaction journey does not require those flags. Test cancellation, pending/failed/success, guest/account, uploads and tracking. Gateway sandbox and trusted HTTPS behaviour remain release checks; a simulated local payment does not verify them.
7. Publish compatible frontend/backend versions together, verify Pages routes to the transaction host, and retain the previous code/database backup for rollback. Disable handoff by reverting transactionOrigin if necessary; that disables routing and does not make Pages able to process bookings by itself.

No live site, gateway configuration or server files were changed by this local implementation.

## Step 14 package tools

`npm run release:build` creates new matching Pages/transaction packages and runbooks with a hash manifest. `npm run release:verify` checks the latest package and starts only an isolated disposable backend for read-only health/catalog/CSRF smoke checks. `npm run test:pilot-metrics` verifies that local diagnostic counters exclude raw personal parameters and tolerate blocked storage. See PILOT-RELEASE.md, ROLLBACK.md and MONITORING.md for live gates and later update/rollback procedures.
