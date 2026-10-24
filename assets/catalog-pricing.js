/* Single Unified Master Pricing Catalog — Authoritative Single Source of Truth across OPDS */
(function(root) {
  'use strict';

  const MASTER_PRICING = Object.freeze({
  "new-pan": {
    "slug": "new-pan",
    "name": "New PAN",
    "category": "E-Services",
    "price": 220,
    "pricePaise": 22000,
    "officialFee": 0,
    "serviceCharge": 220,
    "displayPrice": "₹220",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "2-3 days",
    "requiredDocs": [
      "Aadhaar Card (Identity & Address proof)",
      "DOB Proof (Birth Cert / 10th Marksheet / Passport)",
      "Passport-size photo (2 copies)",
      "Signature / Thumb impression on white paper",
      "Aadhaar-linked Mobile number"
    ]
  },
  "pan-card": {
    "slug": "pan-card",
    "name": "PAN Card",
    "category": "E-Services",
    "price": 220,
    "pricePaise": 22000,
    "officialFee": 0,
    "serviceCharge": 220,
    "displayPrice": "₹220",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "2-3 days",
    "requiredDocs": [
      "Aadhaar Card (Identity & Address proof)",
      "DOB Proof (Birth Cert / 10th Marksheet)",
      "Passport-size photo (2 copies)",
      "Signature / Thumb impression"
    ]
  },
  "pan-correction": {
    "slug": "pan-correction",
    "name": "PAN Correction",
    "category": "E-Services",
    "price": 250,
    "pricePaise": 25000,
    "officialFee": 0,
    "serviceCharge": 250,
    "displayPrice": "₹250",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "2-3 days",
    "requiredDocs": [
      "Existing PAN Card copy / Allotment letter",
      "Aadhaar Card (Identity & Address proof)",
      "Proof of Correction (Gazette / Marriage cert / DOB cert)",
      "Updated Passport-size photo",
      "Signature on white paper"
    ]
  },
  "pan-aadhaar-link": {
    "slug": "pan-aadhaar-link",
    "name": "PAN–Aadhaar Linking & Status Support",
    "category": "E-Services",
    "price": 100,
    "pricePaise": 10000,
    "officialFee": 0,
    "serviceCharge": 100,
    "displayPrice": "₹100",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-2 days",
    "requiredDocs": [
      "PAN Card Number",
      "Aadhaar Card Number",
      "Aadhaar-linked Active Mobile Number (OTP)",
      "Penalty Fee Challan Receipt (if applicable)"
    ]
  },
  "duplicate-pan-surrender": {
    "slug": "duplicate-pan-surrender",
    "name": "Duplicate PAN Surrender Guidance",
    "category": "E-Services",
    "price": 250,
    "pricePaise": 25000,
    "officialFee": 0,
    "serviceCharge": 250,
    "displayPrice": "₹250",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "3-5 days",
    "requiredDocs": [
      "Active PAN details (to retain)",
      "Duplicate PAN number(s) (to surrender)",
      "Aadhaar Card (Identity proof)",
      "Surrender Reason & Declaration Affidavit"
    ]
  },
  "e-pan-download": {
    "slug": "e-pan-download",
    "name": "E-PAN Download",
    "category": "E-Services",
    "price": 150,
    "pricePaise": 15000,
    "officialFee": 0,
    "serviceCharge": 150,
    "displayPrice": "₹150",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Existing PAN Number / Ack receipt",
      "Aadhaar Card number",
      "Aadhaar-linked mobile number (Active for OTP)"
    ]
  },
  "card-reprint": {
    "slug": "card-reprint",
    "name": "Card Reprint",
    "category": "E-Services",
    "price": 100,
    "pricePaise": 10000,
    "officialFee": 0,
    "serviceCharge": 100,
    "displayPrice": "₹100",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "5-7 days",
    "requiredDocs": [
      "Existing PAN Number / PAN Card copy",
      "Aadhaar Card",
      "Aadhaar-linked active mobile number",
      "Delivery address details"
    ]
  },
  "pan-status-check": {
    "slug": "pan-status-check",
    "name": "PAN Application Status Check",
    "category": "E-Services",
    "price": 0,
    "pricePaise": 0,
    "officialFee": 0,
    "serviceCharge": 0,
    "displayPrice": "₹0",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Instant",
    "requiredDocs": [
      "15-Digit Acknowledgment Number / Coupon ID",
      "Applicant Date of Birth",
      "Applicant Full Name & Mobile Number"
    ]
  },
  "aadhaar-new-enrolment-appointment": {
    "slug": "aadhaar-new-enrolment-appointment",
    "name": "New Aadhaar Enrolment Appointment",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar-update-appointment": {
    "slug": "aadhaar-update-appointment",
    "name": "Aadhaar Update Appointment",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar-child-baal-appointment": {
    "slug": "aadhaar-child-baal-appointment",
    "name": "Child / Baal Aadhaar Appointment",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "tenant-police-verification": {
    "slug": "tenant-police-verification",
    "name": "Tenant Police Verification Assistance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Operator review required",
    "requiredDocs": [
      "Tenant / Worker Aadhaar Card",
      "Recent Passport Size Color Photo",
      "Native Permanent Address Proof",
      "Active Mobile Number for Verification",
      "Landlord / Property Owner Aadhaar Card",
      "Property address details"
    ]
  },
  "domestic-staff-police-verification": {
    "slug": "domestic-staff-police-verification",
    "name": "Domestic Staff Police Verification Support",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Operator review required",
    "requiredDocs": [
      "Tenant / Worker Aadhaar Card",
      "Recent Passport Size Color Photo",
      "Native Permanent Address Proof",
      "Active Mobile Number for Verification",
      "Property address details"
    ]
  },
  "cyber-fraud-complaint-filing": {
    "slug": "cyber-fraud-complaint-filing",
    "name": "Cyber Fraud Complaint Filing Assistance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Operator review required",
    "requiredDocs": [
      "Bank Statement / UPI Transaction Screenshot",
      "Scammer Mobile / WhatsApp Chat Screenshot",
      "Complainant Aadhaar Card / ID Proof"
    ]
  },
  "lost-document-report-ldr": {
    "slug": "lost-document-report-ldr",
    "name": "Lost Document Report Ldr",
    "category": "E-Services",
    "price": 100,
    "pricePaise": 10000,
    "officialFee": 0,
    "serviceCharge": 100,
    "displayPrice": "₹100",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "online-fir-police-complaint": {
    "slug": "online-fir-police-complaint",
    "name": "Online Fir Police Complaint",
    "category": "E-Services",
    "price": 150,
    "pricePaise": 15000,
    "officialFee": 0,
    "serviceCharge": 150,
    "displayPrice": "₹150",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "government-grievance-cpgrams": {
    "slug": "government-grievance-cpgrams",
    "name": "Government Grievance Cpgrams",
    "category": "E-Services",
    "price": 150,
    "pricePaise": 15000,
    "officialFee": 0,
    "serviceCharge": 150,
    "displayPrice": "₹150",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "fresh-passport-application-assistance": {
    "slug": "fresh-passport-application-assistance",
    "name": "Fresh Passport Application Assistance",
    "category": "E-Services",
    "price": 350,
    "pricePaise": 35000,
    "officialFee": 0,
    "serviceCharge": 350,
    "displayPrice": "₹350",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "passport-renewal-re-issue-support": {
    "slug": "passport-renewal-re-issue-support",
    "name": "Passport Renewal & Re-Issue Support",
    "category": "E-Services",
    "price": 350,
    "pricePaise": 35000,
    "officialFee": 0,
    "serviceCharge": 350,
    "displayPrice": "₹350",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "tatkaal-passport-processing-help": {
    "slug": "tatkaal-passport-processing-help",
    "name": "Tatkaal Passport Processing Help",
    "category": "E-Services",
    "price": 500,
    "pricePaise": 50000,
    "officialFee": 0,
    "serviceCharge": 500,
    "displayPrice": "₹500",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "3-7 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "minor-passport-application-support": {
    "slug": "minor-passport-application-support",
    "name": "Minor Passport Application Support",
    "category": "E-Services",
    "price": 350,
    "pricePaise": 35000,
    "officialFee": 0,
    "serviceCharge": 350,
    "displayPrice": "₹350",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "police-clearance-certificate-pcc-guidance": {
    "slug": "police-clearance-certificate-pcc-guidance",
    "name": "Police Clearance Certificate (PCC) Guidance",
    "category": "E-Services",
    "price": 250,
    "pricePaise": 25000,
    "officialFee": 0,
    "serviceCharge": 250,
    "displayPrice": "₹250",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "7-15 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "passport-details-correction-updates": {
    "slug": "passport-details-correction-updates",
    "name": "Passport Details Correction & Updates",
    "category": "E-Services",
    "price": 350,
    "pricePaise": 35000,
    "officialFee": 0,
    "serviceCharge": 350,
    "displayPrice": "₹350",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "old-age-pension-application-assistance": {
    "slug": "old-age-pension-application-assistance",
    "name": "Old Age Pension Application Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "widow-pension-application-support": {
    "slug": "widow-pension-application-support",
    "name": "Widow Pension Application Support",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "disability-pension-application-assistance": {
    "slug": "disability-pension-application-assistance",
    "name": "Disability Pension Application Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "atal-pension-yojana-enrollment-support": {
    "slug": "atal-pension-yojana-enrollment-support",
    "name": "Atal Pension Yojana Enrollment Support",
    "category": "E-Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "family-id-registration-update-assistance": {
    "slug": "family-id-registration-update-assistance",
    "name": "Family Id Registration Update Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "digital-life-certificate-jeevan-pramaan-assistance": {
    "slug": "digital-life-certificate-jeevan-pramaan-assistance",
    "name": "Digital Life Certificate Jeevan Pramaan Assistance",
    "category": "E-Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "e-shram-card-registration-assistance": {
    "slug": "e-shram-card-registration-assistance",
    "name": "E Shram Card Registration Assistance",
    "category": "E-Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "e-shram-card-update-download-support": {
    "slug": "e-shram-card-update-download-support",
    "name": "E Shram Card Update Download Support",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "pension-status-dbt-aadhaar-seeding-check": {
    "slug": "pension-status-dbt-aadhaar-seeding-check",
    "name": "Pension Status Dbt Aadhaar Seeding Check",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "new-ration-card-application-assistance": {
    "slug": "new-ration-card-application-assistance",
    "name": "New Ration Card Application Assistance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ration-card-member-addition-support": {
    "slug": "ration-card-member-addition-support",
    "name": "Ration Card Member Addition Support",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ration-card-member-deletion-support": {
    "slug": "ration-card-member-deletion-support",
    "name": "Ration Card Member Deletion Support",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ration-card-name-details-correction": {
    "slug": "ration-card-name-details-correction",
    "name": "Ration Card Name Details Correction",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ration-card-address-ration-shop-transfer-assistance": {
    "slug": "ration-card-address-ration-shop-transfer-assistance",
    "name": "Ration Card Address Ration Shop Transfer Assistance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "duplicate-ration-card-download-assistance": {
    "slug": "duplicate-ration-card-download-assistance",
    "name": "Duplicate Ration Card Download Assistance",
    "category": "E-Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ration-card-application-status-check": {
    "slug": "ration-card-application-status-check",
    "name": "Ration Card Application Status Check",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ration-card-eligibility-beneficiary-list-search": {
    "slug": "ration-card-eligibility-beneficiary-list-search",
    "name": "Ration Card Eligibility Beneficiary List Search",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar-seeding-in-ration-card-assistance": {
    "slug": "aadhaar-seeding-in-ration-card-assistance",
    "name": "Aadhaar Seeding In Ration Card Assistance",
    "category": "E-Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "income-certificate": {
    "slug": "income-certificate",
    "name": "Income Certificate Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "7-10 days",
    "requiredDocs": [
      "Aadhaar card",
      "Income proof",
      "Address proof"
    ]
  },
  "domicile-certificate": {
    "slug": "domicile-certificate",
    "name": "Domicile Certificate Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "7-10 days",
    "requiredDocs": [
      "Aadhaar card",
      "Address proof",
      "Photo"
    ]
  },
  "caste-certificate": {
    "slug": "caste-certificate",
    "name": "Caste Certificate Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "7-15 days",
    "requiredDocs": [
      "Aadhaar card",
      "Caste proof",
      "Address proof"
    ]
  },
  "ncl-certificate": {
    "slug": "ncl-certificate",
    "name": "Ncl Certificate",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ews-certificate": {
    "slug": "ews-certificate",
    "name": "Ews Certificate",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "birth-certificate": {
    "slug": "birth-certificate",
    "name": "Aadhaar Services Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "7-15 days",
    "requiredDocs": [
      "Hospital record",
      "Parent ID proof",
      "Address proof"
    ]
  },
  "delayed-birth-certificate": {
    "slug": "delayed-birth-certificate",
    "name": "Delayed Birth Certificate",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "birth-certificate-correction": {
    "slug": "birth-certificate-correction",
    "name": "Aadhaar Update Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "death-certificate": {
    "slug": "death-certificate",
    "name": "Death Certificate",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "delayed-death-certificate": {
    "slug": "delayed-death-certificate",
    "name": "Delayed Death Certificate",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "death-certificate-correction": {
    "slug": "death-certificate-correction",
    "name": "Death Certificate Correction",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "marriage-registration": {
    "slug": "marriage-registration",
    "name": "Marriage Registration",
    "category": "E-Services",
    "price": 249,
    "pricePaise": 24900,
    "officialFee": 0,
    "serviceCharge": 249,
    "displayPrice": "₹249",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "character-certificate": {
    "slug": "character-certificate",
    "name": "Character Certificate",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "unemployment-certificate": {
    "slug": "unemployment-certificate",
    "name": "Unemployment Certificate",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "udid-card": {
    "slug": "udid-card",
    "name": "Udid Card",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "surviving-member-certificate": {
    "slug": "surviving-member-certificate",
    "name": "Surviving Member Certificate",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "legal-heir-certificate": {
    "slug": "legal-heir-certificate",
    "name": "Legal Heir Certificate",
    "category": "E-Services",
    "price": 249,
    "pricePaise": 24900,
    "officialFee": 0,
    "serviceCharge": 249,
    "displayPrice": "₹249",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "certificate-correction-resubmission": {
    "slug": "certificate-correction-resubmission",
    "name": "Certificate Correction Resubmission",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "learners-licence-online-application-support": {
    "slug": "learners-licence-online-application-support",
    "name": "Learners Licence Online Application Support",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "driving-licence-application-slot-assistance": {
    "slug": "driving-licence-application-slot-assistance",
    "name": "Driving Licence Application Slot Assistance",
    "category": "E-Services",
    "price": 549,
    "pricePaise": 54900,
    "officialFee": 0,
    "serviceCharge": 549,
    "displayPrice": "₹549",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "driving-licence-renewal-support": {
    "slug": "driving-licence-renewal-support",
    "name": "Driving Licence Renewal Support",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "duplicate-driving-licence-application-assistance": {
    "slug": "duplicate-driving-licence-application-assistance",
    "name": "Duplicate Driving Licence Application Assistance",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "driving-licence-address-update-facilitation": {
    "slug": "driving-licence-address-update-facilitation",
    "name": "Driving Licence Address Update Facilitation",
    "category": "E-Services",
    "price": 449,
    "pricePaise": 44900,
    "officialFee": 0,
    "serviceCharge": 449,
    "displayPrice": "₹449",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "driving-licence-name-dob-correction": {
    "slug": "driving-licence-name-dob-correction",
    "name": "Driving Licence Name Dob Correction",
    "category": "E-Services",
    "price": 449,
    "pricePaise": 44900,
    "officialFee": 0,
    "serviceCharge": 449,
    "displayPrice": "₹449",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "addition-of-vehicle-class-in-driving-licence": {
    "slug": "addition-of-vehicle-class-in-driving-licence",
    "name": "Addition Of Vehicle Class In Driving Licence",
    "category": "E-Services",
    "price": 549,
    "pricePaise": 54900,
    "officialFee": 0,
    "serviceCharge": 549,
    "displayPrice": "₹549",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "international-driving-permit-assistance": {
    "slug": "international-driving-permit-assistance",
    "name": "International Driving Permit Assistance",
    "category": "E-Services",
    "price": 1249,
    "pricePaise": 124900,
    "officialFee": 0,
    "serviceCharge": 1249,
    "displayPrice": "₹1,249",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "driving-licence-extract-assistance": {
    "slug": "driving-licence-extract-assistance",
    "name": "Driving Licence Extract Assistance",
    "category": "E-Services",
    "price": 349,
    "pricePaise": 34900,
    "officialFee": 0,
    "serviceCharge": 349,
    "displayPrice": "₹349",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "rc-download-vehicle-details-assistance": {
    "slug": "rc-download-vehicle-details-assistance",
    "name": "Rc Download Vehicle Details Assistance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "rc-transfer-assistance": {
    "slug": "rc-transfer-assistance",
    "name": "Rc Transfer Assistance",
    "category": "E-Services",
    "price": 549,
    "pricePaise": 54900,
    "officialFee": 0,
    "serviceCharge": 549,
    "displayPrice": "₹549",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "rc-address-update-facilitation": {
    "slug": "rc-address-update-facilitation",
    "name": "Rc Address Update Facilitation",
    "category": "E-Services",
    "price": 449,
    "pricePaise": 44900,
    "officialFee": 0,
    "serviceCharge": 449,
    "displayPrice": "₹449",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "duplicate-rc-application-assistance": {
    "slug": "duplicate-rc-application-assistance",
    "name": "Duplicate Rc Application Assistance",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "vehicle-hypothecation-termination-support": {
    "slug": "vehicle-hypothecation-termination-support",
    "name": "Vehicle Hypothecation Termination Support",
    "category": "E-Services",
    "price": 449,
    "pricePaise": 44900,
    "officialFee": 0,
    "serviceCharge": 449,
    "displayPrice": "₹449",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "inter-state-vehicle-noc-assistance": {
    "slug": "inter-state-vehicle-noc-assistance",
    "name": "Inter State Vehicle Noc Assistance",
    "category": "E-Services",
    "price": 549,
    "pricePaise": 54900,
    "officialFee": 0,
    "serviceCharge": 549,
    "displayPrice": "₹549",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "vehicle-fitness-certificate-permit-assistance": {
    "slug": "vehicle-fitness-certificate-permit-assistance",
    "name": "Vehicle Fitness Certificate Permit Assistance",
    "category": "E-Services",
    "price": 699,
    "pricePaise": 69900,
    "officialFee": 0,
    "serviceCharge": 699,
    "displayPrice": "₹699",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "hsrp-number-plate-booking-assistance": {
    "slug": "hsrp-number-plate-booking-assistance",
    "name": "Hsrp Number Plate Booking Assistance",
    "category": "E-Services",
    "price": 549,
    "pricePaise": 54900,
    "officialFee": 0,
    "serviceCharge": 549,
    "displayPrice": "₹549",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "traffic-e-challan-payment-assistance": {
    "slug": "traffic-e-challan-payment-assistance",
    "name": "Traffic E Challan Payment Assistance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "new-voter-id-registration-form-6": {
    "slug": "new-voter-id-registration-form-6",
    "name": "New Voter Id Registration Form 6",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "voter-id-correction-and-update-form-8": {
    "slug": "voter-id-correction-and-update-form-8",
    "name": "Voter Id Correction And Update Form 8",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "e-epic-official-digital-download": {
    "slug": "e-epic-official-digital-download",
    "name": "E Epic Official Digital Download",
    "category": "E-Services",
    "price": 80,
    "pricePaise": 8000,
    "officialFee": 0,
    "serviceCharge": 80,
    "displayPrice": "₹80",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "constituency-transfer-and-shift-form-8": {
    "slug": "constituency-transfer-and-shift-form-8",
    "name": "Constituency Transfer And Shift Form 8",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "duplicate-voter-card-replacement-form-8": {
    "slug": "duplicate-voter-card-replacement-form-8",
    "name": "Duplicate Voter Card Replacement Form 8",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar-voter-id-linking-form-6b": {
    "slug": "aadhaar-voter-id-linking-form-6b",
    "name": "Aadhaar Voter Id Linking Form 6b",
    "category": "E-Services",
    "price": 80,
    "pricePaise": 8000,
    "officialFee": 0,
    "serviceCharge": 80,
    "displayPrice": "₹80",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ayushman": {
    "slug": "ayushman",
    "name": "Ayushman",
    "category": "CSC Services",
    "price": 50,
    "pricePaise": 5000,
    "officialFee": 0,
    "serviceCharge": 50,
    "displayPrice": "₹50",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "Family ID",
      "Mobile number"
    ]
  },
  "banking": {
    "slug": "banking",
    "name": "Banking",
    "category": "CSC Services",
    "price": 30,
    "pricePaise": 3000,
    "officialFee": 0,
    "serviceCharge": 30,
    "displayPrice": "₹30",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "Bank details",
      "Mobile number"
    ]
  },
  "insurance": {
    "slug": "insurance",
    "name": "Insurance",
    "category": "CSC Services",
    "price": 50,
    "pricePaise": 5000,
    "officialFee": 0,
    "serviceCharge": 50,
    "displayPrice": "₹50",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 days",
    "requiredDocs": [
      "Aadhaar",
      "Nominee details",
      "Mobile number"
    ]
  },
  "jan-seva": {
    "slug": "jan-seva",
    "name": "Jan Seva",
    "category": "CSC Services",
    "price": 30,
    "pricePaise": 3000,
    "officialFee": 0,
    "serviceCharge": 30,
    "displayPrice": "₹30",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Identity proof",
      "Service details"
    ]
  },
  "pension": {
    "slug": "pension",
    "name": "Pension",
    "category": "CSC Services",
    "price": 100,
    "pricePaise": 10000,
    "officialFee": 0,
    "serviceCharge": 100,
    "displayPrice": "₹100",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "7-15 days",
    "requiredDocs": [
      "Aadhaar",
      "Bank details",
      "Age/income proof"
    ]
  },
  "pm-kisan": {
    "slug": "pm-kisan",
    "name": "PM Kisan",
    "category": "CSC Services",
    "price": 50,
    "pricePaise": 5000,
    "officialFee": 0,
    "serviceCharge": 50,
    "displayPrice": "₹50",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "Land details",
      "Bank details"
    ]
  },
  "affidavit": {
    "slug": "affidavit",
    "name": "Affidavit",
    "category": "Documentation",
    "price": 100,
    "pricePaise": 10000,
    "officialFee": 0,
    "serviceCharge": 100,
    "displayPrice": "₹100",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "Draft matter",
      "Stamp requirement"
    ]
  },
  "certificates": {
    "slug": "certificates",
    "name": "Certificates",
    "category": "Documentation",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 days",
    "requiredDocs": [
      "Identity proof",
      "Certificate details"
    ]
  },
  "typing": {
    "slug": "typing",
    "name": "Typing",
    "category": "Documentation",
    "price": 30,
    "pricePaise": 3000,
    "officialFee": 0,
    "serviceCharge": 30,
    "displayPrice": "₹30",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Instant",
    "requiredDocs": [
      "Draft content",
      "Language preference"
    ]
  },
  "ayushman-card": {
    "slug": "ayushman-card",
    "name": "Ayushman Card Assistance",
    "category": "E-Services",
    "price": 50,
    "pricePaise": 5000,
    "officialFee": 0,
    "serviceCharge": 50,
    "displayPrice": "₹50",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar card",
      "Ration card or family ID",
      "Mobile number"
    ]
  },
  "passport-assistance": {
    "slug": "passport-assistance",
    "name": "Passport Assistance",
    "category": "E-Services",
    "price": 350,
    "pricePaise": 35000,
    "officialFee": 0,
    "serviceCharge": 350,
    "displayPrice": "₹350",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "2-4 weeks",
    "requiredDocs": [
      "Proof of Present Address (Aadhaar / Utility Bill / Bank Passbook)",
      "Proof of Date of Birth (Birth Cert / 10th Marksheet / PAN Card)",
      "Non-ECR Category Proof (Class 10th Certificate)",
      "Identity Proof (Aadhaar / Voter ID / Driving License)"
    ]
  },
  "pension-welfare-schemes-assistance": {
    "slug": "pension-welfare-schemes-assistance",
    "name": "Pension & Welfare Schemes Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "7-21 days",
    "requiredDocs": [
      "Aadhaar card",
      "Address proof",
      "Photo"
    ]
  },
  "police-verification": {
    "slug": "police-verification",
    "name": "Pension & Welfare Schemes",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "voter-id": {
    "slug": "voter-id",
    "name": "Voter ID Application Assistance",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card (Identity & Age proof)",
      "DOB Proof (Birth Cert / 10th Marksheet)",
      "Address Proof (Aadhaar / Utility Bill)",
      "Passport Size Photo"
    ]
  },
  "admit-card-download": {
    "slug": "admit-card-download",
    "name": "Admit Card Download",
    "category": "EduPoint",
    "price": 80,
    "pricePaise": 8000,
    "officialFee": 0,
    "serviceCharge": 80,
    "displayPrice": "₹80",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "15 min",
    "requiredDocs": [
      "Registration number",
      "DOB or password"
    ]
  },
  "ccc-o-level": {
    "slug": "ccc-o-level",
    "name": "CCC / O Level",
    "category": "EduPoint",
    "price": 150,
    "pricePaise": 15000,
    "officialFee": 0,
    "serviceCharge": 150,
    "displayPrice": "₹150",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Support",
    "requiredDocs": [
      "Photo",
      "Signature",
      "Education proof",
      "Mobile number"
    ]
  },
  "exam-form-filling": {
    "slug": "exam-form-filling",
    "name": "Exam Form Filling",
    "category": "EduPoint",
    "price": 150,
    "pricePaise": 15000,
    "officialFee": 0,
    "serviceCharge": 150,
    "displayPrice": "₹150",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "20 min",
    "requiredDocs": [
      "Student ID",
      "Photo",
      "Signature",
      "Exam details"
    ]
  },
  "online-test": {
    "slug": "online-test",
    "name": "Online Test",
    "category": "EduPoint",
    "price": 80,
    "pricePaise": 8000,
    "officialFee": 0,
    "serviceCharge": 80,
    "displayPrice": "₹80",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "30 min",
    "requiredDocs": [
      "Student details",
      "Test/course details"
    ]
  },
  "result-download": {
    "slug": "result-download",
    "name": "Result Download",
    "category": "EduPoint",
    "price": 80,
    "pricePaise": 8000,
    "officialFee": 0,
    "serviceCharge": 80,
    "displayPrice": "₹80",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "15 min",
    "requiredDocs": [
      "Roll number",
      "DOB or registration details"
    ]
  },
  "resume-builder": {
    "slug": "resume-builder",
    "name": "Resume Builder",
    "category": "EduPoint",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "30 min",
    "requiredDocs": [
      "Education details",
      "Experience details",
      "Photo optional"
    ]
  },
  "scholarship-form": {
    "slug": "scholarship-form",
    "name": "Scholarship Form",
    "category": "EduPoint",
    "price": 150,
    "pricePaise": 15000,
    "officialFee": 0,
    "serviceCharge": 150,
    "displayPrice": "₹150",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "30 min",
    "requiredDocs": [
      "Aadhaar card",
      "Marksheet",
      "Bank details",
      "Income certificate"
    ]
  },
  "university-services": {
    "slug": "university-services",
    "name": "University Services",
    "category": "EduPoint",
    "price": 150,
    "pricePaise": 15000,
    "officialFee": 0,
    "serviceCharge": 150,
    "displayPrice": "₹150",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Support",
    "requiredDocs": [
      "Student ID",
      "Marksheet",
      "Course details"
    ]
  },
  "company-registration": {
    "slug": "company-registration",
    "name": "Company Registration",
    "category": "ProServe",
    "price": 1999,
    "pricePaise": 199900,
    "officialFee": 0,
    "serviceCharge": 1999,
    "displayPrice": "₹1,999",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "10-15 days",
    "requiredDocs": [
      "Director KYC",
      "Address proof",
      "Business details"
    ]
  },
  "digital-signature": {
    "slug": "digital-signature",
    "name": "Digital Signature",
    "category": "ProServe",
    "price": 999,
    "pricePaise": 99900,
    "officialFee": 0,
    "serviceCharge": 999,
    "displayPrice": "₹999",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "2-3 days",
    "requiredDocs": [
      "PAN",
      "Aadhaar",
      "Photo",
      "Email and mobile"
    ]
  },
  "fssai": {
    "slug": "fssai",
    "name": "FSSAI",
    "category": "ProServe",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "7-15 days",
    "requiredDocs": [
      "Owner KYC",
      "Business address",
      "Food business details"
    ]
  },
  "gst-registration": {
    "slug": "gst-registration",
    "name": "GST Registration",
    "category": "ProServe",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "3-7 days",
    "requiredDocs": [
      "PAN",
      "Aadhaar",
      "Business address proof",
      "Bank details"
    ]
  },
  "iec-code": {
    "slug": "iec-code",
    "name": "IEC Code",
    "category": "ProServe",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "5-7 days",
    "requiredDocs": [
      "PAN",
      "Aadhaar",
      "Bank details",
      "Business proof"
    ]
  },
  "msme-registration": {
    "slug": "msme-registration",
    "name": "MSME Registration",
    "category": "ProServe",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "PAN",
      "Business details",
      "Bank details"
    ]
  },
  "shop-license": {
    "slug": "shop-license",
    "name": "Shop License",
    "category": "ProServe",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "3-5 days",
    "requiredDocs": [
      "Owner KYC",
      "Shop address proof",
      "Photo"
    ]
  },
  "trademark": {
    "slug": "trademark",
    "name": "Trademark",
    "category": "ProServe",
    "price": 999,
    "pricePaise": 99900,
    "officialFee": 0,
    "serviceCharge": 999,
    "displayPrice": "₹999",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "30-90 days",
    "requiredDocs": [
      "Logo/brand name",
      "Applicant KYC",
      "Business proof"
    ]
  },
  "fresh-passport": {
    "slug": "fresh-passport",
    "name": "Fresh Passport",
    "category": "E-Services",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "voter-card": {
    "slug": "voter-card",
    "name": "Voter Card",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ration-card-assistance": {
    "slug": "ration-card-assistance",
    "name": "Ration Card Assistance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ration-card": {
    "slug": "ration-card",
    "name": "Ration Card",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "transport-rto-facilitation": {
    "slug": "transport-rto-facilitation",
    "name": "Transport & RTO Facilitation",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "driving-license": {
    "slug": "driving-license",
    "name": "Driving License",
    "category": "E-Services",
    "price": 1100,
    "pricePaise": 110000,
    "officialFee": 0,
    "serviceCharge": 1100,
    "displayPrice": "₹1,100",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "income-tax-assistance": {
    "slug": "income-tax-assistance",
    "name": "Income Tax Assistance",
    "category": "E-Services",
    "price": 699,
    "pricePaise": 69900,
    "officialFee": 0,
    "serviceCharge": 699,
    "displayPrice": "₹699",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "income-tax": {
    "slug": "income-tax",
    "name": "Income Tax",
    "category": "E-Services",
    "price": 699,
    "pricePaise": 69900,
    "officialFee": 0,
    "serviceCharge": 699,
    "displayPrice": "₹699",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "state-certificates-civil-registration": {
    "slug": "state-certificates-civil-registration",
    "name": "State Certificates Civil Registration",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "state-certificates": {
    "slug": "state-certificates",
    "name": "State Certificates",
    "category": "E-Services",
    "price": 200,
    "pricePaise": 20000,
    "officialFee": 0,
    "serviceCharge": 200,
    "displayPrice": "₹200",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar-appointment-assistance": {
    "slug": "aadhaar-appointment-assistance",
    "name": "Aadhaar Appointment Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar-services-assistance": {
    "slug": "aadhaar-services-assistance",
    "name": "Aadhaar Services Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar": {
    "slug": "aadhaar",
    "name": "Aadhaar Appointment Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar-new-enrolment-assistance": {
    "slug": "aadhaar-new-enrolment-assistance",
    "name": "New Aadhaar Enrolment Appointment",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "aadhaar-update-correction-assistance": {
    "slug": "aadhaar-update-correction-assistance",
    "name": "Aadhaar Update Appointment",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "citizen-security-cybercrime-police-help": {
    "slug": "citizen-security-cybercrime-police-help",
    "name": "Citizen Security, Cybercrime & Police Help",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar card",
      "Address proof",
      "Photo"
    ]
  },
  "police-help": {
    "slug": "police-help",
    "name": "Citizen Security, Cybercrime & Police Help",
    "category": "E-Services",
    "price": 150,
    "pricePaise": 15000,
    "officialFee": 0,
    "serviceCharge": 150,
    "displayPrice": "₹150",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "business-registration-corporate-setup": {
    "slug": "business-registration-corporate-setup",
    "name": "Business Registration Corporate Setup",
    "category": "E-Services",
    "price": 1400,
    "pricePaise": 140000,
    "officialFee": 0,
    "serviceCharge": 1400,
    "displayPrice": "₹1,400",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "business-registration": {
    "slug": "business-registration",
    "name": "Business Registration",
    "category": "E-Services",
    "price": 1400,
    "pricePaise": 140000,
    "officialFee": 0,
    "serviceCharge": 1400,
    "displayPrice": "₹1,400",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "legal-drafting-court-services": {
    "slug": "legal-drafting-court-services",
    "name": "Legal Drafting Court Services",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "legal-drafting": {
    "slug": "legal-drafting",
    "name": "Legal Drafting",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ayushman-card-check": {
    "slug": "ayushman-card-check",
    "name": "Ayushman Card Check",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "ayushman-reprint": {
    "slug": "ayushman-reprint",
    "name": "Ayushman Reprint",
    "category": "E-Services",
    "price": 29,
    "pricePaise": 2900,
    "officialFee": 0,
    "serviceCharge": 29,
    "displayPrice": "₹29",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "birth-certificate-duplicate": {
    "slug": "birth-certificate-duplicate",
    "name": "Aadhaar PVC Card Assistance",
    "category": "E-Services",
    "price": 79,
    "pricePaise": 7900,
    "officialFee": 0,
    "serviceCharge": 79,
    "displayPrice": "₹79",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "bus-ticket-one-way": {
    "slug": "bus-ticket-one-way",
    "name": "Bus Ticket One Way",
    "category": "Travel Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "bus-ticket-round": {
    "slug": "bus-ticket-round",
    "name": "Bus Ticket Round",
    "category": "Travel Services",
    "price": 79,
    "pricePaise": 7900,
    "officialFee": 0,
    "serviceCharge": 79,
    "displayPrice": "₹79",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "caste-renewal": {
    "slug": "caste-renewal",
    "name": "Caste Renewal",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "color-copies": {
    "slug": "color-copies",
    "name": "Color Copies",
    "category": "Documentation",
    "price": 5,
    "pricePaise": 500,
    "officialFee": 0,
    "serviceCharge": 5,
    "displayPrice": "₹5",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "photo-print": {
    "slug": "photo-print",
    "name": "Photo Print",
    "category": "Documentation",
    "price": 20,
    "pricePaise": 2000,
    "officialFee": 0,
    "serviceCharge": 20,
    "displayPrice": "₹20",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "llp-registration": {
    "slug": "llp-registration",
    "name": "LLP Registration",
    "category": "ProServe",
    "price": 1499,
    "pricePaise": 149900,
    "officialFee": 0,
    "serviceCharge": 1499,
    "displayPrice": "₹1,499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "opc-registration": {
    "slug": "opc-registration",
    "name": "OPC Registration",
    "category": "ProServe",
    "price": 1999,
    "pricePaise": 199900,
    "officialFee": 0,
    "serviceCharge": 1999,
    "displayPrice": "₹1,999",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "private-limited": {
    "slug": "private-limited",
    "name": "Private Limited",
    "category": "ProServe",
    "price": 1999,
    "pricePaise": 199900,
    "officialFee": 0,
    "serviceCharge": 1999,
    "displayPrice": "₹1,999",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "dsc-class-2": {
    "slug": "dsc-class-2",
    "name": "DSC Class 2",
    "category": "ProServe",
    "price": 999,
    "pricePaise": 99900,
    "officialFee": 0,
    "serviceCharge": 999,
    "displayPrice": "₹999",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "dsc-class-3": {
    "slug": "dsc-class-3",
    "name": "DSC Class 3",
    "category": "ProServe",
    "price": 1499,
    "pricePaise": 149900,
    "officialFee": 0,
    "serviceCharge": 1499,
    "displayPrice": "₹1,499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "dsc-renewal": {
    "slug": "dsc-renewal",
    "name": "DSC Renewal",
    "category": "ProServe",
    "price": 799,
    "pricePaise": 79900,
    "officialFee": 0,
    "serviceCharge": 799,
    "displayPrice": "₹799",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "document-scan": {
    "slug": "document-scan",
    "name": "Document Scan",
    "category": "Documentation",
    "price": 10,
    "pricePaise": 1000,
    "officialFee": 0,
    "serviceCharge": 10,
    "displayPrice": "₹10",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "photo-scan": {
    "slug": "photo-scan",
    "name": "Photo Scan",
    "category": "Documentation",
    "price": 15,
    "pricePaise": 1500,
    "officialFee": 0,
    "serviceCharge": 15,
    "displayPrice": "₹15",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "domicile-renewal": {
    "slug": "domicile-renewal",
    "name": "Domicile Renewal",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "domestic-flight": {
    "slug": "domestic-flight",
    "name": "Domestic Flight",
    "category": "Travel Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "international-flight": {
    "slug": "international-flight",
    "name": "International Flight",
    "category": "Travel Services",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "fssai-basic": {
    "slug": "fssai-basic",
    "name": "FSSAI Basic",
    "category": "ProServe",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "fssai-central": {
    "slug": "fssai-central",
    "name": "FSSAI Central",
    "category": "ProServe",
    "price": 1499,
    "pricePaise": 149900,
    "officialFee": 0,
    "serviceCharge": 1499,
    "displayPrice": "₹1,499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "fssai-state": {
    "slug": "fssai-state",
    "name": "FSSAI State",
    "category": "ProServe",
    "price": 999,
    "pricePaise": 99900,
    "officialFee": 0,
    "serviceCharge": 999,
    "displayPrice": "₹999",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "gst-amendment": {
    "slug": "gst-amendment",
    "name": "GST Amendment",
    "category": "ProServe",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "gst-new-registration": {
    "slug": "gst-new-registration",
    "name": "GST New Registration",
    "category": "ProServe",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "gst-return-filing": {
    "slug": "gst-return-filing",
    "name": "GST Return Filing",
    "category": "ProServe",
    "price": 399,
    "pricePaise": 39900,
    "officialFee": 0,
    "serviceCharge": 399,
    "displayPrice": "₹399",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "hotel-budget-stay": {
    "slug": "hotel-budget-stay",
    "name": "Hotel Budget Stay",
    "category": "Travel Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "hotel-premium-stay": {
    "slug": "hotel-premium-stay",
    "name": "Hotel Premium Stay",
    "category": "Travel Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "iec-modification": {
    "slug": "iec-modification",
    "name": "IEC Modification",
    "category": "ProServe",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "iec-registration": {
    "slug": "iec-registration",
    "name": "IEC Registration",
    "category": "ProServe",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "income-certificate-urgent": {
    "slug": "income-certificate-urgent",
    "name": "Income Certificate Urgent",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "photo-laminate": {
    "slug": "photo-laminate",
    "name": "Photo Laminate",
    "category": "EduPoint",
    "price": 30,
    "pricePaise": 3000,
    "officialFee": 0,
    "serviceCharge": 30,
    "displayPrice": "₹30",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "standard-laminate": {
    "slug": "standard-laminate",
    "name": "Standard Laminate",
    "category": "EduPoint",
    "price": 20,
    "pricePaise": 2000,
    "officialFee": 0,
    "serviceCharge": 20,
    "displayPrice": "₹20",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "msme-update": {
    "slug": "msme-update",
    "name": "MSME Update",
    "category": "ProServe",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "passport-renewal": {
    "slug": "passport-renewal",
    "name": "Passport Renewal",
    "category": "E-Services",
    "price": 249,
    "pricePaise": 24900,
    "officialFee": 0,
    "serviceCharge": 249,
    "displayPrice": "₹249",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "tatkal-passport": {
    "slug": "tatkal-passport",
    "name": "Tatkal Passport",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "bw-photocopy": {
    "slug": "bw-photocopy",
    "name": "BW Photocopy",
    "category": "EduPoint",
    "price": 1,
    "pricePaise": 100,
    "officialFee": 0,
    "serviceCharge": 1,
    "displayPrice": "₹1",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "color-printing": {
    "slug": "color-printing",
    "name": "Color Printing",
    "category": "EduPoint",
    "price": 5,
    "pricePaise": 500,
    "officialFee": 0,
    "serviceCharge": 5,
    "displayPrice": "₹5",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "police-renewal": {
    "slug": "police-renewal",
    "name": "Police Renewal",
    "category": "E-Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "shop-license-new": {
    "slug": "shop-license-new",
    "name": "Shop License New",
    "category": "ProServe",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "shop-license-renewal": {
    "slug": "shop-license-renewal",
    "name": "Shop License Renewal",
    "category": "ProServe",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "beach-package": {
    "slug": "beach-package",
    "name": "Beach Package",
    "category": "Travel Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "hill-station-package": {
    "slug": "hill-station-package",
    "name": "Hill Station Package",
    "category": "Travel Services",
    "price": 399,
    "pricePaise": 39900,
    "officialFee": 0,
    "serviceCharge": 399,
    "displayPrice": "₹399",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "pilgrimage-package": {
    "slug": "pilgrimage-package",
    "name": "Pilgrimage Package",
    "category": "Travel Services",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "trademark-filing": {
    "slug": "trademark-filing",
    "name": "Trademark Filing",
    "category": "ProServe",
    "price": 999,
    "pricePaise": 99900,
    "officialFee": 0,
    "serviceCharge": 999,
    "displayPrice": "₹999",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "trademark-renewal": {
    "slug": "trademark-renewal",
    "name": "Trademark Renewal",
    "category": "ProServe",
    "price": 599,
    "pricePaise": 59900,
    "officialFee": 0,
    "serviceCharge": 599,
    "displayPrice": "₹599",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "trademark-reply": {
    "slug": "trademark-reply",
    "name": "Trademark Reply",
    "category": "ProServe",
    "price": 799,
    "pricePaise": 79900,
    "officialFee": 0,
    "serviceCharge": 799,
    "displayPrice": "₹799",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "train-general-ticket": {
    "slug": "train-general-ticket",
    "name": "Train General Ticket",
    "category": "Travel Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "train-premium-tatkal": {
    "slug": "train-premium-tatkal",
    "name": "Train Premium Tatkal",
    "category": "Travel Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "train-tatkal-ticket": {
    "slug": "train-tatkal-ticket",
    "name": "Train Tatkal Ticket",
    "category": "Travel Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "e-epic-download": {
    "slug": "e-epic-download",
    "name": "e-EPIC Download",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "voter-id-address": {
    "slug": "voter-id-address",
    "name": "Voter ID Address",
    "category": "E-Services",
    "price": 79,
    "pricePaise": 7900,
    "officialFee": 0,
    "serviceCharge": 79,
    "displayPrice": "₹79",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "voter-id-correction": {
    "slug": "voter-id-correction",
    "name": "Voter ID Correction",
    "category": "E-Services",
    "price": 79,
    "pricePaise": 7900,
    "officialFee": 0,
    "serviceCharge": 79,
    "displayPrice": "₹79",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "voter-id-registration": {
    "slug": "voter-id-registration",
    "name": "Voter ID Registration",
    "category": "E-Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  "voter-id-new-enrollment": {
    "slug": "voter-id-new-enrollment",
    "name": "Voter ID New Enrollment Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "overseas-voter-registration": {
    "slug": "overseas-voter-registration",
    "name": "Overseas / NRI Voter Registration Assistance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "voter-id-transfer": {
    "slug": "voter-id-transfer",
    "name": "Voter ID Address / Constituency Transfer Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "replacement-voter-id": {
    "slug": "replacement-voter-id",
    "name": "Replacement Voter ID Application Support",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "voter-id-photo-update": {
    "slug": "voter-id-photo-update",
    "name": "Voter ID Photo Update Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "pwd-electoral-marking": {
    "slug": "pwd-electoral-marking",
    "name": "PwD Marking in Electoral Roll Assistance",
    "category": "E-Services",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "voter-name-deletion": {
    "slug": "voter-name-deletion",
    "name": "Name Deletion from Electoral Roll Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "voter-enrollment-objection": {
    "slug": "voter-enrollment-objection",
    "name": "Objection to Incorrect Voter Enrollment Assistance",
    "category": "E-Services",
    "price": 149,
    "pricePaise": 14900,
    "officialFee": 0,
    "serviceCharge": 149,
    "displayPrice": "₹149",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "e-epic-download-assistance": {
    "slug": "e-epic-download-assistance",
    "name": "e-EPIC Voter Card Download Assistance",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "voter-name-search": {
    "slug": "voter-name-search",
    "name": "Name Search in Electoral Roll",
    "category": "E-Services",
    "price": 0,
    "pricePaise": 0,
    "officialFee": 0,
    "serviceCharge": 0,
    "displayPrice": "₹0",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "electoral-roll-pdf": {
    "slug": "electoral-roll-pdf",
    "name": "Electoral Roll PDF Download Assistance",
    "category": "E-Services",
    "price": 29,
    "pricePaise": 2900,
    "officialFee": 0,
    "serviceCharge": 29,
    "displayPrice": "₹29",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "voter-status-tracking": {
    "slug": "voter-status-tracking",
    "name": "Voter Application Status Tracking Assistance",
    "category": "E-Services",
    "price": 0,
    "pricePaise": 0,
    "officialFee": 0,
    "serviceCharge": 0,
    "displayPrice": "₹0",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "voter-complaint-registration": {
    "slug": "voter-complaint-registration",
    "name": "Voter Complaint Registration Assistance",
    "category": "E-Services",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "fresh-passport-assistance": {
    "slug": "fresh-passport-assistance",
    "name": "Fresh Passport Application Assistance",
    "category": "E-Services",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "passport-renewal-reissue": {
    "slug": "passport-renewal-reissue",
    "name": "Passport Renewal & Re-Issue Support",
    "category": "E-Services",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "tatkaal-passport-help": {
    "slug": "tatkaal-passport-help",
    "name": "Tatkaal Passport Processing Help",
    "category": "E-Services",
    "price": 499,
    "pricePaise": 49900,
    "officialFee": 0,
    "serviceCharge": 499,
    "displayPrice": "₹499",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "minor-passport-support": {
    "slug": "minor-passport-support",
    "name": "Minor Passport Application Support",
    "category": "E-Services",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "pcc-guidance": {
    "slug": "pcc-guidance",
    "name": "Police Clearance Certificate (PCC) Guidance",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "pension-welfare-schemes": {
    "slug": "pension-welfare-schemes",
    "name": "Pension & Welfare Schemes",
    "category": "E-Services",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "photocopy-printing": {
    "slug": "photocopy-printing",
    "name": "Photocopy & Printing",
    "category": "EduPoint",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "lamination": {
    "slug": "lamination",
    "name": "Lamination",
    "category": "EduPoint",
    "price": 199,
    "pricePaise": 19900,
    "officialFee": 0,
    "serviceCharge": 199,
    "displayPrice": "₹199",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "itr-filing-consultancy": {
    "slug": "itr-filing-consultancy",
    "name": "Income Tax Return ( ITR ) Filing Consultancy",
    "category": "ProServe",
    "price": 299,
    "pricePaise": 29900,
    "officialFee": 0,
    "serviceCharge": 299,
    "displayPrice": "₹299",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "income-tax-portal-registration": {
    "slug": "income-tax-portal-registration",
    "name": "Income Tax Portal Registration Assistance",
    "category": "ProServe",
    "price": 99,
    "pricePaise": 9900,
    "officialFee": 0,
    "serviceCharge": 99,
    "displayPrice": "₹99",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "form-26as-download": {
    "slug": "form-26as-download",
    "name": "Form 26AS Download Assistance",
    "category": "ProServe",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "ais-tis-download": {
    "slug": "ais-tis-download",
    "name": "AIS / TIS Download Assistance",
    "category": "ProServe",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  "income-tax-refund-status": {
    "slug": "income-tax-refund-status",
    "name": "Income Tax Refund Status Check",
    "category": "ProServe",
    "price": 49,
    "pricePaise": 4900,
    "officialFee": 0,
    "serviceCharge": 49,
    "displayPrice": "₹49",
    "pricingModel": "all_inclusive",
    "priceNote": "Service charges and assistance included. No hidden fee.",
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  }
});

  root.OPDS_MASTER_PRICING = MASTER_PRICING;
  root.OPDS_STATIC_PRICING = MASTER_PRICING;
  if (typeof module === 'object' && module.exports) {
    module.exports = MASTER_PRICING;
  }
})(typeof window !== 'undefined' ? window : globalThis);
