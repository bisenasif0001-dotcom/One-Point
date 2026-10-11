# One Point: implementation checklist

Date: 11 October 2026
Companion: ONE-POINT-UX-MOBILE-PLAN.md

## Current status

- [x] Public repository source audit and initial UX/mobile recommendations prepared.
- [x] Sequential implementation work packages and completion gates defined below.
- [x] Local source, repository instructions and existing changes inspected.
- [x] First application change implemented: PAN direct ordering pilot and checkout/mobile improvements.
- [ ] Runtime, browser and device verification completed.
- [ ] Release completed.

Local execution is working again. Main workspace was inspected; existing untracked One-Point, ai-form-agent and pan-ai-agent directories were preserved. No applicable AGENTS.md was found at the project/checked parent locations. The design-system governance file under .agents was read and the new styles use existing tokens.

Current launch blocker: the final frontend is GitHub Pages HTTPS, while the supplied backend is HTTP-only. Its public health/catalog/CSRF endpoints respond, but HTTPS at the supplied IP refuses connection. HTTPS API origin and cross-origin authentication/CSRF compatibility must be resolved before live ordering. See DEPLOYMENT-READINESS.md. No production deployment or live payment was performed.

## Implementation progress — first batch

| Step | Status | Evidence / remaining work |
| --- | --- | --- |
| 1: Local baseline | Complete for pilot | Main workspace and package scripts checked; separate copies preserved. |
| 2: Deployment | Local implementation verified; live release checks pending | Isolated real backend + 390px browser checkout pass with simulated gateway. Database path/fresh migration and server email validation fixed. Optional HTTPS host routing, cart handoff and deployment templates prepared. Live HTTPS/gateway checks deferred as requested. |
| 3: Service rules | Local policy foundation implemented; business rules pending | 148 stable policies exported; shared aliases/applicant validator/catalog policy; exact-ID selection and task-specific checklists. 5 duplicate pricing/model conflicts and 308 unsupported static entry links recorded. Eligibility, quote/deposit, delivery and configured-print approvals remain explicit. See SERVICE-RULES.md. |
| 4: Direct entry | PAN pilot complete | Home card, home search, directory and directory search offer short variant choice to exact checkout. Other service families pending. |
| 5: Applicant details | Address change complete | Optional address validated; email required; saved customer without address can use existing details. Other conditional fields pending. |
| 6: Documents | Shortcut complete, policies pending | Existing WhatsApp-later capability can now go from details directly to payment. No service eligibility rules were relaxed. Exact per-service checklist pending. |
| 7: Payment clarity | Partial | Mobile pay action displays amount or Confirm Booking for counter payment. Full pricing/backend reconciliation pending. |
| 8: Recovery | Partial | Artificial countdown removed; CSRF renewed at submission. Broader draft expiry/idempotency/payment retry audit pending. |
| 9: Mobile home | Pilot complete | Search prioritized; decorative panels hidden on mobile; six stable service cards replace mobile auto rotation. |
| 10: Mobile directory/details | Directory pilot, details pending | Directory hero compact; search accessible; PAN entry improved. Full detail-page mobile work pending. |
| 11: Mobile checkout | Pilot complete | Compact heading/summary, readable input sizing, correct selected-service column, documents-later shortcut and mobile step scrolling. Real-device upload/gateway checks pending. |
| 12: Performance/accessibility | Partial | Mobile decorative map initialization skipped; reduced-motion carousel support; native selector focus/Escape checked. Field performance data and broader optimization pending. |
| 13: Verification | Browser pilot complete; full matrix pending | 11 viewport captures and functional checks pass. Physical-device, server and payment verification pending. |
| 14–15: Release/expansion | Pending | Resolve HTTPS integration, validate real transactions, then controlled rollout. |

Validation: npm run check; node --check assets/quick-order.js; npm run check:ux; git diff --check. Browser verification passed at 320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280 and 1440px. It checked selector geometry, six variants, Escape/focus return, exact checkout selection, required email, optional address, documents-later routing, mobile payment label, early mobile search and stable mobile cards. Screenshots are under artifacts/ux-pilot. External network requests were blocked during automated UI checks, so these are not live gateway or externally loaded icon/font tests. The legacy npm test command references backend/tests files that are absent in this checkout; that suite was not claimed as passing.

Repeatable commands: npm run test:ux (requires a usable Chrome installation); npm run preview:ux (read-only frontend at http://127.0.0.1:4180/, no live API/payment connection).

## Delivery rules

Preserve desktop brand and styling. Build responsive mobile compositions from shared data/components. Complete and verify each work package before expanding it. Use local changes and a preview first. Keep a record of changed files, behaviour, checks and unresolved issues. Do not mark a source inspection as a browser or payment test.

## Step 1: inspect the local baseline

Actions: read applicable AGENTS.md; inspect repository state and local/remote differences; read package scripts and server startup configuration; map homepage, directory, detail, checkout, catalog and payment modules. Establish how the user previews this revision and whether the Pages URL is preview or production.
Output: verified baseline and instructions, commands/checks for this project, affected-file map.
Completion: local changes are understood and protected; a working preview can be opened.

## Step 2: verify transactional deployment

Actions: inspect actual backend configuration; check health/catalog/CSRF endpoints; inspect payment and booking contracts; verify the origin used by checkout. Determine whether same-origin full-stack hosting or an explicitly configured backend is intended. Handle credentials/CORS/CSRF consistently if origins differ. Inspect environment names without exposing secret values.
Output: deployment decision, working test checkout, clear unavailable-service behaviour.
Completion: a test booking and its status work end to end using the intended deployment. No real charge is necessary for early validation.

## Step 3: define service rules and stable identities

Actions: define stable service IDs and variants, pricing basis, required fields, document policy, delivery type and purchase/quote/assistance modes. Derive from current catalog and fulfilment rules. Unknown policies remain explicit and retain existing requirements until resolved. Review PAN, GST/business, document-heavy and configured print examples.
Output: service-policy map shared by checkout and backend validation.
Completion: no guessed eligibility/document exceptions; exact service and price remain consistent between screens.

## Step 4: pilot direct service entry

Local pilot implemented: PAN six-task selector, exact MSME entry and visiting-card catalog-pack selector. See DIRECT-ORDER-PILOT.md for supported configuration and verification. Remaining print configurations and service families belong to later expansion.

Actions: start with PAN variants. Add a short variant choice where a card describes several tasks; use direct checkout where the exact task is known. Retain optional detail-page access. Inspect runtime CTA rewriting and listeners before editing links. Carry stable selection through search, directory and detail entries. Then apply to one fixed service and one configured product.
Likely source areas: assets/app.js, services.html, relevant service pages and catalog routing.
Completion: exact task requires one action to reach its checkout; a broad task needs at most one short variant choice; back navigation preserves selection; no wrong variant or duplicated click action.

## Step 5: simplify applicant information

Local implementation complete: three initial required fields, expandable optional address/invoice section, saved-profile editing, safe other-applicant selection and order-level applicant snapshots. See APPLICANT-FLOW.md and artifacts/applicant-test.json. Email remains mandatory; address optional. Account profile is no longer rewritten by checkout.

Actions: show only service-relevant fields; require postal address only when fulfilment needs it; adjust email/contact policy together with backend validation; infer business context when already known; retain saved-customer quick fill and explicit ordering for another applicant. Ensure optional blank values pass both client and server contracts.
Likely source areas: checkout.html, assets/checkout.js, booking validation/server handlers.
Completion: pilot guest and returning-customer submissions work; another applicant is not overwritten by the account holder.

## Step 6: make document requirements specific

Local pilot workflow implemented: service-specific checklist, actual private file upload after order creation, authenticated order-linked later submission, retry and separate documents-pending/review-pending state. See DOCUMENT-FLOW.md. Unknown/no-document policies remain explicit; operator approval and real-phone verification are not represented as complete.

Actions: replace generic checklist with selected-service requirements; distinguish required-now, allowed-later and not-needed documents; skip irrelevant stages; retain camera/gallery/file access. Model Awaiting documents separately from Ready for processing. Link later submission to its order.
Completion: required documents cannot be bypassed accidentally; deferred documents produce the correct next action; no-document tasks do not force an upload decision.

## Step 7: clarify pricing and payment

Local implementation complete: server quote/expected-total guard, exact paise on payment actions, catalog tax labels, collapsed unsupported coupon, server rejection of unverified adjustments/plans, scope-review routing and consolidated gateway choices. See PRICING-PAYMENT-FLOW.md. Real gateway verification remains a later release check.

Actions: use one pricing source and server-confirmed totals; show government/service/tax components and exclusions; collapse coupon entry; remove repeated payment choices only when the gateway makes them redundant. Label the final action with amount and intent. Keep quote-only work outside fixed-price checkout.
Completion: totals agree across card/detail/checkout/server; changed configuration updates price; invalid client amounts are rejected; coupons and payment plans follow server rules.

## Step 8: recover drafts and genuine session expiry

Local implementation complete. See CHECKOUT-RECOVERY.md.

Actions: inspect actual timer/token relationship; remove an unsupported artificial deadline or renew genuine expired authorization; preserve suitable draft data with expiry/reset; keep payment cancellation and upload retry usable. Inspect duplicate-request protection and verified success/pending/failed transitions.
Completion: cancellation, refresh and session renewal recover safely; duplicate taps do not create duplicate payments/orders; pending payment is never presented as confirmed payment.

## Step 9: mobile home and navigation

Local implementation complete. See MOBILE-HOME-NAVIGATION.md and artifacts/mobile-home-test.json.

Actions: compact hero; prioritize search and popular exact tasks; simplify category access; reduce competing informational controls. Reuse current mobile menu and navigation. Coordinate fixed elements and safe areas; use lightweight decorative effects and reduced-motion settings.
Completion: search and primary tasks are accessible on short/narrow screens; menu opens/closes/back behaves correctly; desktop appearance is compared with baseline.

## Step 10: mobile directory and service details

Local implementation complete. See MOBILE-SERVICE-DIRECTORY.md and artifacts/mobile-services-test.json.

Actions: simplify search/filter hierarchy; build readable service cards; place selected variant, pricing, delivery and action early; make long explanation/FAQ expandable. Keep broad-task and exact-task actions distinct.
Completion: customer can find and choose the correct task without excessive scrolling or tiny controls; no horizontal overflow at supported widths.

## Step 11: mobile checkout and upload

Local implementation complete. See MOBILE-CHECKOUT-UPLOAD.md and artifacts/mobile-checkout-test.json. Physical-phone keyboard/camera/payment-app checks remain in Step 13.

Actions: single-column service-specific form; one coordinated bottom action; expandable price breakdown; avoid general navigation competing with payment. Handle keyboard/browser chrome/safe areas; maintain focus and accessible drawer behaviour. Verify file previews, progress, error and retry.
Completion: fields, validation and primary action remain usable with keyboard open; upload and gateway app switching work on real phones.

## Step 12: performance and accessibility

Local pilot implementation complete. See PERFORMANCE-ACCESSIBILITY.md, artifacts/performance-before.json, artifacts/performance-after.json and artifacts/accessibility-test.json. Initial home image transfer and directory layout shift improved; field Core Web Vitals targets and full physical-device accessibility remain unverified. Step 13 expands verification.

Actions: measure before optimizing; incrementally split page-specific JS/CSS; compress/resize images; lazy-load below-fold media; defer decorative work; remove conflicting rules in changed components. Check labels, focus, contrast, reduced motion, larger text and touch targets.
Targets: LCP <=2.5s, INP <=200ms, CLS <=0.1 at the 75th percentile where sufficient field data exists. Record lab results separately; file size alone is not proof of a runtime problem.
Completion: measured pilot improvement without interaction or desktop regressions.

## Step 13: full verification

Local automated pilot matrix passed, including fixes for real tracking uploads and order-linked payment retry. See FULL-VERIFICATION.md and artifacts/network-recovery-test.json. Physical Android/iPhone, real camera/keyboard/app switching and production/sandbox hosting checks remain pending in PHYSICAL-DEVICE-CHECKLIST.md; the full release gate is not yet complete. Step 14 release preparation can proceed locally.

Matrix: 320/360/390/430/768px and desktop widths; Android Chrome and iPhone Safari; a slower device; portrait/landscape; enlarged text; keyboard open; slow/interrupted network. Include search, variant, guest/returning/other applicant, upload now/later, configuration, coupon, payment success/pending/failure/cancel, reload and tracking.
Completion: no blocking task failure; existing relevant project checks pass; unresolved nonblocking limits are documented. Test sensitive transactions through sandbox/test facilities where available.

## Step 14: pilot release and monitoring

Local release preparation implemented: matched Pages/transaction packages, SHA-256 manifest, runtime-data exclusions, isolated packaged-backend smoke checks, privacy-limited local counters and release/rollback/monitoring runbooks. See deployment/PILOT-RELEASE.md. No live pilot or site-wide business results are claimed; trusted HTTPS/provider/device verification, staging backup/restore rehearsal and production monitoring remain release gates.

Actions: prepare a reversible pilot release of selected service families; preserve old links and in-progress orders; confirm environment/payment configuration; run smoke checks and monitor funnel/errors/support. Avoid collecting applicant details in analytics.
Measures: service-selected to checkout-start, checkout-start to verified-order, median completion time, validation/upload/payment errors and support requests, split by device.
Completion: pilot results and fulfilment quality support expansion. Numeric business targets are set from actual baseline data.

## Step 15: expand and complete

Local service-family expansion implemented; see SERVICE-EXPANSION.md and artifacts/service-expansion-test.json. Request-only tasks remain explicit; full fulfilment coverage, physical devices and live launch gates are pending. No deployment was performed.

Actions: roll validated policies/components to remaining service families; repeat family-specific checks; clean obsolete routing/forms/styles after regression checks; document maintenance and rollback; launch the full version and monitor.
Completion: all supported services and devices pass the agreed matrix; deployment and post-launch smoke checks succeed; no required work is concealed as complete.

## Immediate next action

User requested all fixes remain on the local drive and will update the live site later. Step 2 therefore has a verified local implementation with a simulated gateway, not a verified production payment deployment. See deployment/LOCAL-AND-RELEASE.md for local commands and later server/Pages configuration. Proceed to step 3 service policy work; live access is not a blocker for that local work.

Step 3 local policy foundation is implemented and described in SERVICE-RULES.md. Unit and isolated API/mobile-browser tests pass. The static export covers 119 service identities and 29 products. Unsupported detailed task IDs require catalog configuration in the subsequent direct-entry/service-family work; do not present them as fully supported online orders. Eligibility, quote/deposit, document-deferral and delivery approvals remain explicitly pending.

Continue local service-family rules and mobile detail work after this pilot. Deployment templates are ready for the user's later live update. User authorization to implement is already present; routine reversible implementation does not need repeated confirmation.

