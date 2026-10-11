# One Point: deployment readiness

Date: 11 October 2026

## Confirmed user decisions

- Final frontend URL: https://bisenasif0001-dotcom.github.io/One-Point/
- Backend URL supplied: http://13.233.73.157/
- Email remains mandatory.
- Complete postal address is optional.

## Public endpoint checks

Read-only HTTP checks returned 200 for /, /api/health, /api/products and /api/csrf. The catalog exposes services, serviceVariants, products, categories and updatedAt. The health response reported healthy. HTTPS connection to the supplied IP refused the connection. No live order or payment was created.

The reviewed frontend currently builds API calls against the page origin. GitHub Pages cannot run this Node backend. Simply changing the origin to the HTTP IP will not work from the HTTPS frontend because browsers block mixed-content API calls.

## Required integration work before launch

1. Obtain a browser-trusted HTTPS endpoint for the backend, normally through its domain and certificate/reverse proxy. The supplied HTTP IP alone is insufficient for the intended frontend.
2. Confirm that the deployed backend revision matches the frontend booking, catalog, identity and payment contracts.
3. Configure a single shared API origin for catalog, checkout, customer authentication, uploads, payment verification and tracking. Keep /One-Point/ frontend links intact. Do not patch just the checkout endpoint and leave tracking/login on GitHub Pages.
4. Permit only the intended frontend origin through CORS; handle OPTIONS and all required headers. Preserve server authorization and CSRF controls. Account for browsers that block third-party cookies; the current SameSite=Lax CSRF-cookie flow cannot simply be assumed to work across sites.
5. Verify gateway callbacks/webhooks and frontend payment return URLs. Keep gateway credentials on the backend.
6. Use a sandbox/test transaction to verify checkout, pending/success/failure states, cancellation/retry, uploads, tracking and guest/returning-customer sessions. Do not report a healthy backend as verified payment functionality.
7. Release the frontend and compatible backend changes together with rollback instructions. The local UX updates have not been deployed.

## Current local implementation scope

PAN direct variant chooser from homepage, home search and directory; email required/address optional; documents-later shortcut; removal of the artificial checkout countdown with CSRF renewed at submission; clearer mobile payment action; mobile home/service discovery composition; compact mobile checkout. Other service families, detailed document policy, real-device testing and deployment remain pending.

## Pending input

At live release only: backend HTTPS URL/domain and supported server deployment method. These are no longer requested for local implementation; the user will publish later. Existing private credentials must not be pasted into this document.

## Step 2 implementation and current verification

Read-only `npm run check:deployment` now checks health, catalog, CSRF and payment-method contracts. It records only status, contract validity and cookie/CORS flags in artifacts/deployment-readiness.json; no cookie/token values, credentials, orders or payments are recorded. An HTTP-only backend returns a failing readiness exit code deliberately. All four supplied HTTP endpoints returned 200 with the expected contracts on 11 October 2026. None returned the required frontend CORS origin/credential headers. CSRF uses SameSite=Lax without Secure on HTTP.

Checkout now rejects an HTML/static-host 200 response as backend readiness, gives an actionable booking-unavailable error, and requires an actual returned order identifier before confirming a booking. The fabricated fallback order identifier was removed. Health-contract positive/negative checks, syntax checks and diff whitespace checks pass.

Contract inspection: service bookings use POST /api/service-bookings; product orders use POST /api/orders; both call createCheckout. Customer name and phone are checked by the backend; email is currently mandatory only in the UI and must be enforced server-side in the service-rules work. Address is already optional server-side. Server pricing derives from catalog/pricing engine. CSRF is cookie/header based; customer sessions also use X-Session-Token. Razorpay verification uses /api/payments/verify; status uses /api/payments/status/:orderId; document routes require order ownership. The client currently generates a new idempotency key for each submission, so uncertain-result retry handling remains a step 8 requirement.

Deployment direction: retain the final Pages discovery frontend and use a trusted HTTPS backend. Prefer an HTTPS backend-hosted transactional journey (checkout, sign-in, uploads, payment return and tracking together) with a link back to Pages, retaining same-origin session/CSRF behaviour. This is a proposal awaiting the backend domain/access decision, not an implemented handoff. Keeping checkout on Pages instead requires an explicit cross-site authentication/CSRF design and browser verification; adding CORS alone is insufficient. NEXT_PUBLIC_SITE_URL currently drives backend callback/return URLs, so its final value must match the chosen transactional host.

Completion remains pending: HTTPS setup, deployed revision compatibility, sandbox gateway configuration, test booking/status/upload/payment return and mobile session checks. No real booking or charge was created, and no production files were changed.

## Local-only delivery requested by user

The user will publish later. Local step 2 now includes server-enforced required email, optional address, DATABASE_URL SQLite path support, fresh-install profile migration order correction and disposal of partial database initialization on failure. Isolated HTTP booking and 390px browser checkout tests pass with a simulated gateway, including CSRF, catalog pricing, request idempotency, payment verification/status and invoice creation. The existing database and .env were not used in those tests. Evidence: artifacts/local-booking-test.json.

Optional transaction-host routing is implemented on the 16 checkout/auth/payment/account/tracking pages. assets/deployment-config.js has an empty transactionOrigin for local mode. When configured for a trusted HTTPS host, it routes the full transactional journey together and transfers only public item selection. Cart prices are reloaded from the catalog; personal details/tokens/documents are excluded. Routing/privacy checks pass. Deployment templates and later release steps are in deployment/LOCAL-AND-RELEASE.md. Live HTTPS, actual gateway sandbox, upload/mobile session and production smoke checks remain deferred, not local implementation blockers.
