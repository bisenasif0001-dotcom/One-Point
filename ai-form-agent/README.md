# AI Form Agent

Safe assisted-form platform for services such as GST registration, PAN correction, passport applications and domicile certificates.

## MVP goal

Help a customer prepare an application faster:

1. Customer selects a service and uploads documents.
2. AI extracts candidate fields from the documents.
3. Customer checks, edits and approves every field.
4. The agent opens the official portal and guides or pre-fills permitted fields.
5. The customer personally completes OTP, CAPTCHA, declarations, payment and final submission.

The agent must never bypass a portal's security controls or submit a legally binding application without the customer's explicit final action.

## Start here

Read [docs/PLAN.md](docs/PLAN.md) for the product plan and [docs/SAFETY.md](docs/SAFETY.md) for operating rules.

## Initial structure

```text
src/intake/       Document upload, OCR and extraction
src/workflows/    Per-service form mappings and portal adapters
src/review/       Customer review and approval UI
src/audit/        Consent, approvals and non-sensitive event history
tests/            Automated tests
```
