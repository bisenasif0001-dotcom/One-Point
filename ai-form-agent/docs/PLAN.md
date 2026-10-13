# Detailed delivery plan

## 1. Product boundary

This is an **assisted application agent**, not an unattended filing bot. It can read permitted customer documents, prepare fields, check missing information and guide browser steps. The customer retains control over authentication, OTP, CAPTCHA, declarations, payment and final submission.

Start with one low-risk workflow and make it reliable before adding more portals. Recommended first workflow: **PAN correction / update assistance**. It has common data fields, clear customer review points and no need to promise automatic submission.

## 2. User journey

1. Customer chooses a service.
2. Show eligibility, required documents, estimated fee and official portal link.
3. Customer grants consent and uploads only required files.
4. OCR + AI creates a field-by-field draft with a confidence value and source document reference.
5. Customer corrects and approves the draft.
6. The agent runs validation rules: required fields, format, conflicting document data and expiry dates.
7. It opens the official portal in a guided session. It may fill fields only after the customer approves the reviewed draft.
8. It pauses for login, OTP, CAPTCHA, payment, declaration and final submission.
9. Save a receipt/reference number only after the customer confirms the result.

## 3. MVP scope

### Include

- Service catalogue with PAN correction as the first workflow.
- Document checklist and consent capture.
- PDF/image upload with virus scan and size/type limits.
- OCR extraction for name, date of birth, address and identification number where appropriate.
- Review screen with source highlights and edit history.
- Rule-based validation and missing-document alerts.
- Guided handoff to the official portal.
- Audit events for consent, review approval, portal handoff and outcome.

### Exclude initially

- CAPTCHA/OTP bypassing or automatic completion.
- Automated financial payments.
- Automatic final submissions or signing declarations.
- Saving portal passwords, OTPs or full card information.
- Trying to automate portals whose terms or technical controls prohibit it.

## 4. Architecture

```text
Customer web app
  -> Intake API
     -> encrypted document storage
     -> malware scan
     -> OCR / extraction service
  -> Review & validation API
     -> workflow rules
     -> consent + audit trail
  -> Browser guidance service
     -> official-portal adapter
     -> mandatory human handoff checkpoints
```

Suggested stack for the first build:

- Frontend: React + TypeScript.
- Backend: Node.js + TypeScript + Express/Fastify.
- Database: PostgreSQL.
- Files: encrypted object storage; retain files only for the agreed period.
- OCR: a provider selected after Hindi/English document accuracy tests.
- AI: structured JSON extraction with field confidence, never direct unreviewed submission data.
- Browser guidance: Playwright-based controlled session only where permitted, otherwise a step-by-step overlay.

## 5. Workflow-adapter contract

Every service gets a separate adapter containing:

- Official portal URL and terms review date.
- Document checklist.
- Field schema and validation rules.
- Mapping from extracted profile fields to form fields.
- Mandatory stop points: login, OTP, CAPTCHA, declaration, payment and final submit.
- Version and last tested date.

Do not make a generic bot that clicks arbitrary portals. A versioned adapter prevents wrong-field submissions when a portal changes.

## 6. Data and security rules

- Ask explicit consent before document processing and portal assistance.
- Encrypt documents and sensitive profile data at rest and in transit.
- Show why each requested document is needed.
- Mask Aadhaar/PAN/other identifiers in ordinary screens and logs.
- Use role-based access for operators; log every operator view or edit.
- Store no passwords, OTPs, CAPTCHA answers or payment credentials.
- Set deletion/retention schedules; give users a clear delete-request path.
- Test for prompt injection in uploaded documents: document text is data, never instructions.

## 7. Milestones

### Phase 0 — Discovery (3–5 days)

- Choose the first service and official portal.
- Confirm terms, consent wording, user roles and data retention.
- Collect anonymized sample documents and build field accuracy tests.

### Phase 1 — Intake and review (1–2 weeks)

- Service selector, document checklist and secure upload.
- OCR/extraction pipeline.
- Review and edit screen with confidence/source display.
- Audit events and basic admin view.

### Phase 2 — PAN workflow (1 week)

- PAN-specific schema, validation and checklist.
- Guided official-portal handoff with hard stops.
- Reference-number/receipt capture.
- Test cases for incomplete, mismatched and low-confidence documents.

### Phase 3 — Controlled browser assistance (1–2 weeks)

- Implement only approved portal steps.
- Pause before every protected or legally binding step.
- Screen/video-style activity trace without capturing secrets.
- Failure recovery when portal fields change.

### Phase 4 — More services (ongoing)

Add one adapter at a time: GST assistance, passport appointment preparation, domicile application preparation. Each gets its own compliance review, checklist and test suite.

## 8. Success measures

- At least 95% correct extraction for high-confidence basic fields on the test set.
- Zero automatic submission of an application.
- 100% of portal sessions show a customer approval checkpoint before data entry.
- Every filed request has consent, reviewed data version and outcome in the audit trail.
- Average application preparation time decreases without increasing correction or rejection rates.

## 9. First implementation sprint

1. Define the customer profile schema and the PAN-correction field schema.
2. Build upload + document checklist screens.
3. Implement mock extraction responses and review UI.
4. Add validation and audit records.
5. Connect real OCR/AI only after the review UI and tests are ready.
6. Add official-portal guidance after permission/terms are reviewed.
