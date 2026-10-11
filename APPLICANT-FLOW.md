# Step 5 — applicant details, local implementation

The initial guest form shows three mandatory fields: applicant name, ten-digit mobile number and email. Postal address and invoice preferences live in a native expandable optional section. Business invoice GSTIN is optional; if provided, its format is validated by browser and backend. This invoice field does not replace or waive any selected service's supporting documents or eligibility requirements.

Signed-in customers can continue with saved details, edit those details for this order, or apply for someone else. Another applicant starts with clear fields. Switching between the saved customer and another applicant retains the latter's values during the visit. Validated drafts record their applicant mode and survive reload without being overwritten by the account profile. Explicit application-link values remain editable; a catalog refresh cannot replay old values over new typing. A delayed profile response also preserves typed input. Saved Indian mobile numbers with a country prefix can be used in the ten-digit field.

Backend checkout no longer changes an existing account's name/address from application details. Each new order stores a normalized applicant snapshot separately from its owning account. Gateway contact details, status/tracking, retries, notifications and newly generated invoices use that snapshot. Account ownership and invoice access stay with the signed-in customer. Older orders without snapshots retain their existing account-based fallback; this change does not rewrite old orders or invoices.

Verification:

- `npm run test:applicant`: 11 screen widths, guest requirements, blank optional fields, saved-profile Edit, another applicant, reload, switching, invoice draft, delayed profile and query/catalog refresh.
- `npm run test:booking`: isolated backend/database, authenticated account preservation, applicant contact snapshot, correct applicant invoice after simulated payment, invalid invoice GSTIN, configured product price and existing CSRF/payment checks.
- `npm run test:ux`, `npm run test:policies`, `npm run test:routing`, syntax checks for checkout, payment and invoice modules.

No production publication or real gateway charge was performed. Physical phone keyboard/Safari checks remain in the later full verification stage. Next: Step 6 documents and later-submission workflow.
