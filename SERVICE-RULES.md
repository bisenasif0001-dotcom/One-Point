# Step 3: shared service rules and stable identities

Local implementation, 11 October 2026. Desktop styling is preserved.

## Source and contract

assets/service-policy.js is shared by browser checkout, backend applicant validation, backend pricing aliases and public catalog serialization. assets/service-policy-map.json is a reviewable export of the existing static catalog, with 148 unique service/product identities. It is a snapshot, not a replacement for the live admin catalog. Regenerate with `npm run policies:export` after a catalog snapshot update.

Selection uses type + stable slug. Known aliases come from the existing pricing-engine mapping and are now shared. An explicit unknown slug cannot be substituted by a matching display name. Backend name-only legacy requests remain supported when no slug is supplied. Variant records have exact-ID pricing precedence, matching the existing backend. Checkout displays the catalog identity and amount; arbitrary URL names/prices cannot become the selected service's authority. Order metadata saves a server-derived policy snapshot for subsequent review.

## Confirmed applicant rules

Name, phone and email are mandatory. Full postal address is optional, as requested by the user. The same applicant validator is used by checkout and backend. This does not waive a business address proof or a delivery-address document already required by a service.

## Pilot examples

| Selection | Pricing mode | Requirements retained from existing catalog |
| --- | --- | --- |
| new-pan | All inclusive exact variant | New-application identity/DOB/photo/signature/mobile requirements |
| pan-correction | All inclusive exact variant | Existing PAN, identity and correction proof, photo/signature |
| card-reprint | All inclusive exact variant | PAN details, Aadhaar, linked mobile, delivery details |
| e-pan-download | All inclusive exact variant | PAN/acknowledgement details and linked mobile information |
| pan-aadhaar-link | All inclusive catalog item | PAN, Aadhaar, active linked mobile and applicable challan requirement |
| duplicate-pan-surrender | All inclusive catalog item | Retained/duplicate PAN details, identity and declaration |
| gst-registration | Catalog item | PAN, Aadhaar, business address proof and bank details |
| msme-registration | Exact variant plus same-ID main requirements | Aadhaar/PAN, business and bank details |
| company-registration / banner-design | Starting price; scope review | Existing director/business proofs or size/content/design inputs |
| visiting-cards | Catalog product | Existing reference/contact requirements; configuration rules pending |

The readable table is a summary. The exported policy retains the complete exact labels. When a same-ID main record has detailed requirements and a variant has generic defaults, their required lists are combined so requirements are not silently relaxed. Parent service documents are not automatically assigned to a different-ID variant. Active exact-main document-layer requirements are retained; optional and conditional items stay distinct in the policy model.

## Customer behaviour

The upload step now shows the selected task's checklist rather than a generic list. Existing upload-or-WhatsApp-later behaviour remains available, with an explicit reminder that later submission does not waive review. No document-free exception, eligibility exemption or automatic approval was invented.

Price headings distinguish Total fee, Service charge and Starting price. Actual portal fees are labelled separately; starting-price services retain an explicit scope-review flag and do not claim final scope approval. Their existing booking behaviour is retained pending a confirmed quote/deposit policy; this step does not implement a quote engine or per-document verification workflow.

An unavailable exact task stops at the service-selection stage with an actionable message instead of silently substituting another service or sending the customer through the whole checkout.

## Conflicts and coverage gaps

Five duplicate-ID pricing/model differences exist in the supplied snapshot: birth-certificate, caste-certificate, domicile-certificate, income-certificate and new-pan. The export records both values; checkout follows exact-variant precedence to agree with backend selection. Original catalog prices were not rewritten. Business approval of the intended values remains a review item.

The static HTML entry audit found 308 checkout links whose exact IDs are absent from this snapshot, including detailed education and business-online-setup tasks. These are links, not 308 distinct purchasable services. They are listed in artifacts/service-entry-audit.json for family-by-family catalog/entry work. Runtime-generated links and compatibility with the later deployed admin catalog require separate checks. These entries are not automatically mapped to similarly named tasks or assigned guessed prices.

Still explicitly unconfirmed: per-service eligibility, whether deferral is permitted for fulfilment, delivery type, detailed quote/deposit approvals, and configured print quantity/material pricing. Existing requirements remain until those rules are established. The policy foundation is implemented; all-service fulfilment approval and rollout are not claimed complete.

## Validation

`npm run test:policies` verifies all six PAN identities, specific correction proof, GST/MSME business requirements, optional postal address, mandatory email, known aliases, unknown/inactive IDs, variant pricing precedence and explicit pending scope/product rules.

`npm run test:booking` uses an isolated database, real local API/browser checkout and simulated gateway. It checks catalog policies, unknown-ID rejection, CSRF, required email/optional address, server pricing, request identity, signed payment verification, invoice, mobile payment return, product-cart price recovery and early unavailable-task messaging. No live payment or existing order/database is used.

The 11-width UX pilot verifies selector, selected task, required email, optional address, document-later navigation and home/search entry paths. Full fulfilment, actual gateway and physical-device checks remain later release work.
