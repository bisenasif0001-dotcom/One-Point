# Step 7 — local pricing and payment flow

Checkout uses exact catalog identities, quantities and tax rates. A server quote is requested on entering payment review and immediately before order creation. The order request includes the reviewed expected total in paise; a changed amount stops creation for another review. Card/display/service-policy prices remain previews until server verification succeeds. The read-only static preview explicitly labels that distinction.

Final desktop/mobile Pay labels preserve cents/paise rather than rounding to whole rupees. Government fees show included, payable separately or scope review according to the selected policy. The item/service-fee row no longer incorrectly describes a complete all-inclusive amount as a separate operator charge. Tax is labelled by catalog rate rather than a universal 18% assumption.

The old browser-only ONEPOINT10 discount was not verified or applied by backend checkout. It is replaced by a collapsed coupon section explaining that no server-confirmed offer is configured. No promotion rules were invented. Backend rejects arbitrary client discounts, coupon codes, delivery charges, extra actual charges and unimplemented partial/split plans. Catalog prices/tax determine payable totals. An operator-confirmed additional-charge/delivery quote is a future configuration requirement.

Services priced as `starting_from` use scope/quote assistance instead of a fixed-price charge. Checkout presents an order-context WhatsApp quote link; the backend also refuses direct fixed-price creation for these services. Service-charge-plus-actual services retain their service-fee checkout with government/actual fees explicitly separate.

UPI apps that already route through the same gateway are consolidated into one UPI/QR choice; the gateway handles the app selection. PhonePe remains a separate configured gateway choice. Duplicate Cashfree/PayU fallback choices and unsupported Pay Later are hidden. Existing supported cards, net banking and wallet routes remain. Only full payment is enabled.

Validation: isolated server quote and booking tests reject client price adjustments, unsupported plans, wrong expected totals and scope-only payments; simulated payment and document upload regressions pass. Direct-entry browser checks at 11 widths compare pack totals with tax and assert exact Pay-button amounts and consolidated UPI choices. Syntax, policy and routing checks pass. No real gateway charge, production deployment or physical-phone verification was performed.

Next: Step 8 recovery, request idempotency, cancellation and genuine session expiry.
