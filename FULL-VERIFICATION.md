# Step 13 — full verification record

Status: **local automated pilot verification passed; physical-phone and production verification pending**. This does not certify all devices or complete the live release gate. Changes remain on the local drive.

## Coverage and evidence

| Area | Verified locally | Evidence |
| --- | --- | --- |
| Exact service/product entry | Six PAN variants, direct MSME, catalog visiting-card packs, back/reload selection, unknown task rejection, scope review instead of guessed price | `artifacts/direct-entry-test.json` |
| Applicant | Guest, saved/returning customer, edited profile, another applicant, slow profile arrival, mandatory email, optional address/GSTIN, partial draft, expiry/reset | `artifacts/applicant-test.json`, isolated booking test |
| Pricing | Server catalog quote, exact totals, price-change review; unsupported coupon/discount/delivery/partial payment rejected | `artifacts/local-booking-test.json` |
| Documents | Selected checkout files, order-linked later upload, signatures/private storage/ownership, deduplicated retry, interrupted upload and retry, separate awaiting-documents/review state | `artifacts/local-booking-test.json` |
| Payment | Cancel/reload/reopen same checkout; simulated signed capture and invoice; pending/failed/unavailable states; same-order result-page retry; paid-order retry blocked; other account retry rejected | booking and network recovery reports |
| Tracking | Correct existing order, actual private document bytes, interrupted retry, responsive dashboard | extended isolated booking test |
| UI | Home/search/menu, directory filters/details, checkout drawer/preview/replace/focus, result-page geometry | mobile home/services/checkout and network recovery reports |
| Accessibility | First keyboard stop, main-region focus, visible labels, skip-link contrast, reduced motion, simulated 200% text and reviewed screenshots | `artifacts/accessibility-test.json` |
| Slow/interrupted network | CPU 4×, delayed status API, interrupted/restored status, pending-to-success/failure, failed SDK then successful reload, double-tap guard, uncached home at 150 ms latency and 256 KiB/s | `artifacts/network-recovery-test.json` |
| Routing/policies | Static preview versus transaction host, privacy allowlist, stable IDs and document rules | `test:routing`, `test:policies` |

Screen widths: **320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280, 1440 px**. Existing short-landscape tests and the result-page 600×360 case were included. These use installed Chrome emulation, not eleven physical devices. External fonts/icons/media are blocked in the deterministic browser tests. The throttled test is local asset loading with simulated APIs, not a production carrier-network benchmark.

## Issues found and fixed

1. Tracking's old uploader registered only a filename and claimed upload/automatic verification. It now uses the authenticated real-byte upload helper, enforces PDF/JPG/PNG up to 3 MB, keeps failed selection retryable, and says operator review is pending. No success is shown for a failed transfer.
2. Result/account payment retry opened generic checkout after creating a Razorpay session. A shared recovery helper now opens the returned session for the existing order. Gateway cancellation retains the recovery page, SDK loading failure can be retried, and incomplete verification goes to pending status. API requests/body reading have a 15-second timeout; gateway loading has a 20-second timeout, so stalled requests release the action rather than leaving it blocked indefinitely.
3. Retry API now checks ownership. A pending session for the same gateway is reused; any captured payment on the order blocks a new retry. Client guards prevent repeated taps while a session is opening. This is not a guarantee against every provider-level race, gateway expiry or real bank/app failure.
4. After network recovery, status headings are updated from server state instead of remaining “unavailable”. Missing references disable retry, and confirmed paid state disables retry controls.
5. Query/API payment reference text is escaped before rendering. Copy buttons use data attributes rather than embedding references in executable handlers. Invoice download links accept a local absolute path. The unsupported guaranteed refund timeframe on the failed page was replaced with status/support guidance.

The test harness now treats direct API checks and browser checks as separate QA clients so their accelerated request bursts do not share one rate-limit bucket. Server limits were not increased. Gateway fixture transaction IDs are unique per order, as repeated provider transaction IDs would invalidate a multi-order simulation.

## Repeat locally

`npm run test:verification` runs the relevant checks sequentially and stops on failure. `npm run test:network-recovery` runs the new recovery/slow-loading scenarios. Individual suites were run during this step; no claim is made that the legacy broad `npm test` suite or every service family has been verified.

Booking tests create a disposable scratch database, skip local `.env`, disable external service requests and simulate Razorpay. They do not access existing customer records, charge money or send external messages. `npm run preview:ux` is the static preview; real booking tests use their own isolated backend.

## Remaining release gates

Use [PHYSICAL-DEVICE-CHECKLIST.md](PHYSICAL-DEVICE-CHECKLIST.md) to record Android Chrome, iPhone Safari and a slower real device. Camera permissions/capture, actual keyboard/browser chrome, OS font enlargement, real accessibility tools and UPI/banking app switching are not proven by Chrome emulation.

The final GitHub Pages frontend is HTTPS while the supplied backend is HTTP. HTTPS transaction hosting, session/cookie/CORS behaviour, configured provider sandbox/webhooks, live asset loading and deployment smoke checks must be verified before releasing real orders. Step 13 does not update that server, deploy, or claim production payment readiness. Step 14 can prepare the reversible release package locally while these gates remain explicit.
