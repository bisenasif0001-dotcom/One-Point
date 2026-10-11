# Step 4 — local direct-order pilot

PAN opens a short six-task selector. The selected exact catalog identity reaches checkout and is highlighted when the customer returns with Back. Service details remain available.

MSME/Udyam now opens the exact `msme-registration` checkout from the home quick-service card, home search and directory. The home card retains its separate service-details link.

Visiting cards have a pack selector on home/search, product listings and the product detail Buy action. Each catalog pack contains 100 cards; the pilot permits 1–10 packs. Pack count survives Back and is passed to checkout and backend order metadata. Catalog price and tax determine the total; the client cannot override the backend price. Custom pack sizes and unsupported configuration fields are rejected server-side. Custom sizes/materials require the existing assistance/quote path; no bulk discount or material price was invented.

Desktop colors, typography and existing page composition remain. Selectors reuse the existing responsive dialog and design tokens. The generic configurator for other products remains outside this pilot.

Validation: `node scripts/verify-direct-entry.cjs`, `npm run test:ux`, `npm run test:booking`, `npm run test:policies`, `npm run test:routing`, `npm run check`. Browser checks cover 320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280 and 1440 pixels. Booking tests use an isolated database and simulated gateway; no production payment, publication or real-phone Safari validation is represented as complete.

Next: Step 5 applicant information, including saved customer / another applicant behaviour. Email remains mandatory; address remains optional as requested.
