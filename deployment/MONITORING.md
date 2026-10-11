# Pilot monitoring and measurement

No external analytics destination is configured by this update. Local diagnostic counters save only UTC day, coarse screen class (phone/tablet/desktop), fixed event names and counts for up to seven days. They send no network requests and store no applicant, order, payment/session identifiers, URLs/referrers, filenames, service labels or raw error messages. The old raw `opds_analytics_logs` is removed when the metrics helper loads. Browser storage failures do not block ordering.

The counters describe **one browser/origin**, not unique users/orders. Pages and the transaction host have separate storage. Reloads/attempts can be counted again; do not calculate business conversion by dividing these local counters. `service_selected` is a checkout-link click; `checkout_started` is a checkout page visit, including visits without valid selection; `checkout_error` includes any checkout error; `upload_error` counts rejected upload API responses, not all read/network errors; `payment_pending` includes every unconfirmed server state; `payment_verified` means the status API returned paid/captured/success once during that page visit. These are diagnostic definitions, not site-wide funnel instrumentation.

## Production pilot log

Use `pilot-monitoring.csv` for aggregate observations after release. Leave unavailable values blank. Do not add customer identities/documents/payment IDs to this shared log. Authorized operators can keep references privately in existing support systems.

| Measure | Definition/source |
| --- | --- |
| Selected → checkout rate | Requires a configured privacy-safe production event collector joining consented visits across the public/transaction boundary. Not available from local counters. |
| Checkout → verified order rate | Distinct checkout attempts versus orders with a server/gateway-confirmed capture in the same defined cohort/window; pending is not verified. Requires production collector plus authoritative order data. |
| Median completion time | Define start/end first. For backend-only data, measure order creation to first confirmed capture; do not label that service-selection-to-completion time. |
| Validation/upload/payment errors | Aggregate classified errors by stage/device without raw personal payloads; confirm retry outcomes. Local counts do not cover every error. |
| Fulfilment/support quality | Daily number of orders awaiting documents/review, actionable upload failures, support requests and unresolved issues from the existing operator systems. |

Record the previous-version baseline before setting numeric improvement targets. Compare like-for-like supported families/device classes and windows. Observe frequently immediately after rollout and daily through the agreed pilot; no recurring automation was created by this task.

Immediate stop conditions are in ROLLBACK.md. Investigate new repeated failures, increased unresolved pending payments, unexpected amounts or lost uploads even if headline conversion looks good. Expand only when the pilot has verified order/fulfilment quality and no unresolved blocker. Live baseline, event collector, business targets, results and operator sign-off remain pending.
