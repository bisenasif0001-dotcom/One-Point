# One Point: faster ordering and mobile experience plan

Date: 11 October 2026
Website: https://bisenasif0001-dotcom.github.io/One-Point/

## Evidence and limits

Reviewed public repository main-branch source: index.html, services.html, service-pan-card.html, design-services.html, checkout.html, assets/app.js, assets/checkout.js, assets/onepoint.css, assets/onepoint-home.css and repository asset inventory. This is a source-based audit. Live browser rendering was unavailable because the browser tool failed to start. The deployed revision has not been compared with repository main. No real payment, upload or mobile-device test was performed. Layout problems below are inspection priorities and proposals, not measured rendering defects.

## Findings

1. Homepage Quick Apply links for PAN and GST lead to detail pages (assets/app.js, setupDynamicQuickServices). Customers already ready to buy still take a detour.
2. The service directory uses category links and popular cards; GST and MSME cards lead to business-solutions.html rather than an exact selected order (services.html). Some exploration is useful, but a known service needs a direct route.
3. PAN detail pages already have exact variant checkout links. Preserve this service identity and make it available from search and directory cards.
4. Shared checkout has three stages: details, documents, payment. Name, mobile, email and complete postal address are required for all services. Personal/business selection appears in the shared form. Make fields conditional on the service and fulfilment method.
5. Documents can already be sent later on WhatsApp, but customers still visit the document stage and must upload at least one file or explicitly select the later option. Use a service-specific document policy; optional documents should not force a separate step.
6. A generic document checklist lists identity, address, photograph and signature/marksheet. Replace it with the actual requirements for the selected service.
7. A frontend 15-minute timer marks checkout expired and blocks submission, asking for refresh. Investigate the actual server session rules; remove an artificial deadline, or renew a real expired token while preserving the draft.
8. Existing strengths: guest-session creation, saved customer quick fill, camera/file upload UI, mobile checkout CTA, price-breakdown drawer and mobile navigation. Improve and test these features rather than duplicating them.
9. CSS and scripts are large and layered: onepoint.css approximately 879 KB, app.js 638 KB, homepage CSS 187 KB, visual polish CSS 99 KB (repository file sizes, not measured transfer sizes). Homepage includes canvas visual effects. Treat parsing, main-thread work and asset delivery as performance audit priorities.
10. Checkout resolves /api/health, /api/csrf and booking endpoints against the page origin. Default launch mode is full. On the supplied GitHub Pages URL, this implies calls to bisenasif0001-dotcom.github.io/api/... . A working backend route is not demonstrated by the reviewed source. Verify deployment and runtime overrides before promising online orders.

## Desired journeys

Fixed service: search/card -> exact service or short variant selector -> compact details and total -> payment -> confirmation.

Document-dependent service: service/variant -> required eligibility or documents -> details and payment -> confirmation.

Configured print product: product -> quantity/material/size and server-confirmed total -> details and payment -> confirmation.

Custom creative project: short scope brief -> quote request -> approved quote/payment. Do not present a variable-price project as an immediately purchasable fixed-price item.

Guest checkout remains available. Account access supports repeat orders; it must not become a new prerequisite. Payment success and application approval are separate states.

## Ordering changes

- Exact-service cards use Order now plus a secondary Details link. Broad cards such as PAN Assistance use Choose service with a short selector, avoiding accidental selection of the wrong variant.
- Search results include exact task, pricing basis, delivery expectation and an appropriate primary action.
- Carry stable service ID, variant, configuration and applicant choice to checkout. Avoid inferring service identity from card text. Validate amount and permitted configuration on the server.
- Require name and contact first; require email, address, business identity and other fields only where fulfilment actually needs them. Update server validation together with the UI.
- For simple services, use one compact checkout page with expandable optional information. Keep a short staged flow for complex applications; one enormous form is not the objective.
- Show payable total before payment. Distinguish service charge, applicable tax, government fee and any later payable amount. Unify prices across directory, detail, catalog and checkout; do not hardcode competing totals.
- Collapse coupon entry; show only relevant payment options. Where the gateway selects the payment method, avoid making the customer repeat that decision.
- Use action labels such as Continue and Pay Rs. X rather than Secure SSL Checkout.
- Preserve non-sensitive draft details on navigation and retry, with expiry and a clear reset option. Do not persist identity documents indiscriminately in browser storage.
- Optional later-document submission must create an explicit Awaiting documents state, show the required list and provide an order-linked submission path.
- Confirmation includes order ID, verified payment state, next action, expected processing time and tracking access.

## Mobile experience

Keep desktop colours, brand, imagery and general styling. Recompose the same content for mobile using responsive components, not a separate duplicated website.

Home: compact header -> short headline -> immediately visible service search -> 4-6 popular exact tasks -> category shortcuts -> compact trust/help -> optional informational sections.

Service list: search -> one category selector -> optional filters -> readable list cards. Avoid displaying several competing browsing modes simultaneously on small screens.

Detail: service title -> variant selector -> pricing and delivery -> main action -> document requirements -> expandable explanation/FAQ.

Checkout: compact selected-service summary -> service-specific form -> optional documents -> total/payment. Use one fixed action bar. Suppress general bottom navigation and competing floating actions during checkout if they overlap or distract.

- Keep normal body text around 16px where suitable and touch targets around 44-48px as design targets.
- Use content-driven breakpoints; verify 320, 360, 390, 430, 768 and desktop widths.
- Respect safe areas, on-screen keyboard, browser chrome changes, zoom and larger text. No sideways page scrolling.
- Camera/gallery upload needs previews, progress, retry, type/size validation and clear per-document status.
- Drawers need keyboard/focus handling, accessible names, close action and sensible browser-back behaviour.
- Decorative canvas/motion should have a lightweight mobile mode and reduced-motion support. Load below-fold media lazily and serve appropriately sized compressed images.
- Consolidate conflicting CSS rules within changed components. Split page-specific assets incrementally; avoid a framework rewrite solely for visual refresh.

## Phased delivery

### Phase 0: deployment and baseline
Confirm live revision, backend origin, catalog source, payment configuration and fulfilment rules. Map direct/search/category entry paths. Verify actual mobile rendering. Record baseline checkout starts, completion, errors and device/browser mix. Do not send personal information to analytics.
Exit: working test environment and verified end-to-end test order path.

### Phase 1: direct ordering pilot
Choose one fixed service, one document-heavy service and one configured print product. Replace unnecessary detours, keep exact variant state, normalize card actions and pricing. Preserve existing desktop styling.
Exit: a ready customer reaches the correct checkout from an exact service card in one action; broad services use at most one short variant decision.

### Phase 2: checkout simplification
Implement service-specific required fields/document rules, optional document deferral, saved-customer behaviour, explicit total, timer renewal/removal and preserved retry state. Update backend contracts and confirmation states.
Exit: all pilot types work for guest and returning customers, including edit/back/failure paths.

### Phase 3: mobile layouts
Recompose home, search/list, service detail and checkout in that order. Coordinate fixed controls. Verify desktop comparisons as each component changes.
Exit: all supported widths and keyboard states remain usable; visual hierarchy and action visibility pass inspection.

### Phase 4: reliability and performance
Test actual Android Chrome and iPhone Safari, an older/slower device, tablet and desktop. Test slow/interrupted network, upload retry, payment cancel/failure/pending/success, refresh, session expiry, duplicate taps, app switching and tracking. Measure loading and interaction performance.
Exit: no blocking task failures; server payment confirmation and duplicate-request protection verified.

### Phase 5: controlled release
Release pilot services behind a reversible switch or limited rollout. Compare with baseline, fix meaningful problems, then expand by service family. Preserve working legacy routes and order tracking. Keep a tested rollback and avoid breaking orders already in progress.
Exit: monitored completion/error metrics and support feedback justify full rollout.

## Success criteria

- Exact service selected once; selection survives checkout/back navigation.
- Email/address/documents are required only under explicit service rules.
- Total and any exclusions are clear before the payment action.
- No overlapping controls or horizontal page overflow at supported sizes.
- Draft recovery works after payment cancellation or genuine session renewal.
- Upload/payment failures produce actionable recovery without duplicate orders or charges.
- Proposed performance targets: LCP <=2.5s, INP <=200ms, CLS <=0.1 at the 75th percentile, assessed separately for mobile and desktop after real measurement.
- Proposed business target: meaningful reduction in median service-selection-to-payment time and checkout abandonment, with stable fulfilment quality. Set numeric targets after baseline; do not promise conversion uplift without evidence.

## Before implementation

Resolve which services permit documents later, which need eligibility before payment, which require postal delivery/email, which are quote-only, and whether the supplied Pages site is a preview or the intended transactional deployment. These decisions determine the minimal legitimate checkout.
