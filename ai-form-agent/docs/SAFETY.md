# Safety and human-control rules

## Mandatory human steps

The system must pause and ask the customer to act for:

- Portal login and password entry.
- OTP entry.
- CAPTCHA completion.
- Digital signature, declarations and consent checkboxes.
- Payment confirmation.
- Final submission.

## Prohibited behaviour

- Do not bypass portal security or rate limits.
- Do not invent data, eligibility answers or legal declarations.
- Do not retain secrets or payment credentials.
- Do not send customer data to a portal unless the customer reviewed and approved the exact data.

## Low-confidence data

If a field has weak OCR/AI confidence, conflicting source documents or no clear source, mark it as **Needs customer input**. Never guess.
