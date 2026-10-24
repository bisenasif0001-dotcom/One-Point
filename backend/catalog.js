"use strict";

const products = [
  {
    "type": "product",
    "slug": "visiting-cards",
    "name": "Visiting Cards",
    "category": "Business Branding",
    "price": 299,
    "pricePaise": 29900,
    "displayPrice": "₹299",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "cushion-printing",
    "name": "Cushion Printing",
    "category": "Personalized Gifts",
    "price": 399,
    "pricePaise": 39900,
    "displayPrice": "₹399",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "custom-mugs",
    "name": "Custom Mugs",
    "category": "Personalized Gifts",
    "price": 199,
    "pricePaise": 19900,
    "displayPrice": "₹199",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "keychains",
    "name": "Keychains",
    "category": "Personalized Gifts",
    "price": 99,
    "pricePaise": 9900,
    "displayPrice": "₹99",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "led-frames",
    "name": "LED Frames",
    "category": "Personalized Gifts",
    "price": 799,
    "pricePaise": 79900,
    "displayPrice": "₹799",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "magic-mugs",
    "name": "Magic Mugs",
    "category": "Personalized Gifts",
    "price": 249,
    "pricePaise": 24900,
    "displayPrice": "₹249",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "mobile-covers",
    "name": "Mobile Covers",
    "category": "Personalized Gifts",
    "price": 299,
    "pricePaise": 29900,
    "displayPrice": "₹299",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "photo-frames",
    "name": "Photo Frames",
    "category": "Personalized Gifts",
    "price": 349,
    "pricePaise": 34900,
    "displayPrice": "₹349",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "spotify-plaques",
    "name": "Spotify Plaques",
    "category": "Personalized Gifts",
    "price": 449,
    "pricePaise": 44900,
    "displayPrice": "₹449",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "holographic-stickers",
    "name": "Holographic Stickers",
    "category": "Sticker Printing",
    "price": 199,
    "pricePaise": 19900,
    "displayPrice": "₹199",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "laptop-stickers",
    "name": "Laptop Stickers",
    "category": "Sticker Printing",
    "price": 129,
    "pricePaise": 12900,
    "displayPrice": "₹129",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "logo-stickers",
    "name": "Logo Stickers",
    "category": "Sticker Printing",
    "price": 99,
    "pricePaise": 9900,
    "displayPrice": "₹99",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "packaging-stickers",
    "name": "Packaging Labels",
    "category": "Sticker Printing",
    "price": 179,
    "pricePaise": 17900,
    "displayPrice": "₹179",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "product-labels",
    "name": "Product Labels",
    "category": "Sticker Printing",
    "price": 179,
    "pricePaise": 17900,
    "displayPrice": "₹179",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "qr-code-stickers",
    "name": "QR Code Stickers",
    "category": "Sticker Printing",
    "price": 99,
    "pricePaise": 9900,
    "displayPrice": "₹99",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "vinyl-stickers",
    "name": "Vinyl Stickers",
    "category": "Sticker Printing",
    "price": 149,
    "pricePaise": 14900,
    "displayPrice": "₹149",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "waterproof-stickers",
    "name": "Waterproof Stickers",
    "category": "Sticker Printing",
    "price": 149,
    "pricePaise": 14900,
    "displayPrice": "₹149",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "couple-t-shirts",
    "name": "Couple T-Shirts",
    "category": "T-Shirt Printing",
    "price": 699,
    "pricePaise": 69900,
    "displayPrice": "₹699",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "custom-t-shirts",
    "name": "Custom T-Shirts",
    "category": "T-Shirt Printing",
    "price": 399,
    "pricePaise": 39900,
    "displayPrice": "₹399",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "dtf-transfers",
    "name": "DTF Transfers",
    "category": "T-Shirt Printing",
    "price": 149,
    "pricePaise": 14900,
    "displayPrice": "₹149",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "hoodies",
    "name": "Hoodies",
    "category": "T-Shirt Printing",
    "price": 899,
    "pricePaise": 89900,
    "displayPrice": "₹899",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "polo-t-shirts",
    "name": "Polo T-Shirts",
    "category": "T-Shirt Printing",
    "price": 499,
    "pricePaise": 49900,
    "displayPrice": "₹499",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "anime-stickers",
    "name": "Anime Stickers",
    "category": "Trending Products",
    "price": 149,
    "pricePaise": 14900,
    "displayPrice": "₹149",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "acrylic-name-plates",
    "name": "Acrylic Name Plates",
    "category": "UV DTF Printing",
    "price": 599,
    "pricePaise": 59900,
    "displayPrice": "₹599",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "bottle-branding",
    "name": "Bottle Branding",
    "category": "UV DTF Printing",
    "price": 249,
    "pricePaise": 24900,
    "displayPrice": "₹249",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "business-logo-transfers",
    "name": "Business Logo Transfers",
    "category": "UV DTF Printing",
    "price": 249,
    "pricePaise": 24900,
    "displayPrice": "₹249",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "cup-branding",
    "name": "Cup Branding",
    "category": "UV DTF Printing",
    "price": 199,
    "pricePaise": 19900,
    "displayPrice": "₹199",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "glass-stickers",
    "name": "Glass Stickers",
    "category": "UV DTF Printing",
    "price": 149,
    "pricePaise": 14900,
    "displayPrice": "₹149",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82"
  },
  {
    "type": "product",
    "slug": "product-branding",
    "name": "Product Branding",
    "category": "UV DTF Printing",
    "price": 299,
    "pricePaise": 29900,
    "displayPrice": "₹299",
    "taxRate": 18,
    "image": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82"
  }
];

const services = [
  {
    "slug": "new-pan",
    "name": "New PAN",
    "category": "E-Services",
    "price": 220,
    "taxRate": 0,
    "duration": "2-3 days",
    "requiredDocs": [
      "Aadhaar Card (Identity & Address proof)",
      "DOB Proof (Birth Cert / 10th Marksheet / Passport)",
      "Passport-size photo (2 copies)",
      "Signature / Thumb impression on white paper",
      "Aadhaar-linked Mobile number"
    ]
  },
  {
    "slug": "pan-card",
    "name": "PAN Card",
    "category": "E-Services",
    "price": 220,
    "taxRate": 0,
    "duration": "2-3 days",
    "requiredDocs": [
      "Aadhaar Card (Identity & Address proof)",
      "DOB Proof (Birth Cert / 10th Marksheet)",
      "Passport-size photo (2 copies)",
      "Signature / Thumb impression"
    ]
  },
  {
    "slug": "pan-correction",
    "name": "PAN Correction",
    "category": "E-Services",
    "price": 250,
    "taxRate": 0,
    "duration": "2-3 days",
    "requiredDocs": [
      "Existing PAN Card copy / Allotment letter",
      "Aadhaar Card (Identity & Address proof)",
      "Proof of Correction (Gazette / Marriage cert / DOB cert)",
      "Updated Passport-size photo",
      "Signature on white paper"
    ]
  },
  {
    "slug": "pan-aadhaar-link",
    "name": "PAN–Aadhaar Linking & Status Support",
    "category": "E-Services",
    "price": 100,
    "taxRate": 0,
    "duration": "1-2 days",
    "requiredDocs": [
      "PAN Card Number",
      "Aadhaar Card Number",
      "Aadhaar-linked Active Mobile Number (OTP)",
      "Penalty Fee Challan Receipt (if applicable)"
    ]
  },
  {
    "slug": "duplicate-pan-surrender",
    "name": "Duplicate PAN Surrender Guidance",
    "category": "E-Services",
    "price": 250,
    "taxRate": 0,
    "duration": "3-5 days",
    "requiredDocs": [
      "Active PAN details (to retain)",
      "Duplicate PAN number(s) (to surrender)",
      "Aadhaar Card (Identity proof)",
      "Surrender Reason & Declaration Affidavit"
    ]
  },
  {
    "slug": "e-pan-download",
    "name": "E-PAN Download",
    "category": "E-Services",
    "price": 150,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Existing PAN Number / Ack receipt",
      "Aadhaar Card number",
      "Aadhaar-linked mobile number (Active for OTP)"
    ]
  },
  {
    "slug": "card-reprint",
    "name": "Card Reprint",
    "category": "E-Services",
    "price": 100,
    "taxRate": 0,
    "duration": "5-7 days",
    "requiredDocs": [
      "Existing PAN Number / PAN Card copy",
      "Aadhaar Card",
      "Aadhaar-linked active mobile number",
      "Delivery address details"
    ]
  },
  {
    "slug": "pan-status-check",
    "name": "PAN Application Status Check",
    "category": "E-Services",
    "price": 0,
    "taxRate": 0,
    "duration": "Instant",
    "requiredDocs": [
      "15-Digit Acknowledgment Number / Coupon ID",
      "Applicant Date of Birth",
      "Applicant Full Name & Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-new-enrolment-appointment",
    "name": "New Aadhaar Enrolment Appointment",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-update-appointment",
    "name": "Aadhaar Update Appointment",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-child-baal-appointment",
    "name": "Child / Baal Aadhaar Appointment",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "tenant-police-verification",
    "name": "Tenant Police Verification Assistance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
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
  {
    "slug": "domestic-staff-police-verification",
    "name": "Domestic Staff Police Verification Support",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "Operator review required",
    "requiredDocs": [
      "Tenant / Worker Aadhaar Card",
      "Recent Passport Size Color Photo",
      "Native Permanent Address Proof",
      "Active Mobile Number for Verification",
      "Property address details"
    ]
  },
  {
    "slug": "cyber-fraud-complaint-filing",
    "name": "Cyber Fraud Complaint Filing Assistance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "Operator review required",
    "requiredDocs": [
      "Bank Statement / UPI Transaction Screenshot",
      "Scammer Mobile / WhatsApp Chat Screenshot",
      "Complainant Aadhaar Card / ID Proof"
    ]
  },
  {
    "slug": "lost-document-report-ldr",
    "name": "Lost Document Report Ldr",
    "category": "E-Services",
    "price": 100,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "online-fir-police-complaint",
    "name": "Online Fir Police Complaint",
    "category": "E-Services",
    "price": 150,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "government-grievance-cpgrams",
    "name": "Government Grievance Cpgrams",
    "category": "E-Services",
    "price": 150,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "fresh-passport-application-assistance",
    "name": "Fresh Passport Application Assistance",
    "category": "E-Services",
    "price": 350,
    "taxRate": 0,
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "passport-renewal-re-issue-support",
    "name": "Passport Renewal & Re-Issue Support",
    "category": "E-Services",
    "price": 350,
    "taxRate": 0,
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "tatkaal-passport-processing-help",
    "name": "Tatkaal Passport Processing Help",
    "category": "E-Services",
    "price": 500,
    "taxRate": 0,
    "duration": "3-7 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "minor-passport-application-support",
    "name": "Minor Passport Application Support",
    "category": "E-Services",
    "price": 350,
    "taxRate": 0,
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "police-clearance-certificate-pcc-guidance",
    "name": "Police Clearance Certificate (PCC) Guidance",
    "category": "E-Services",
    "price": 250,
    "taxRate": 0,
    "duration": "7-15 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "passport-details-correction-updates",
    "name": "Passport Details Correction & Updates",
    "category": "E-Services",
    "price": 350,
    "taxRate": 0,
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "old-age-pension-application-assistance",
    "name": "Old Age Pension Application Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "widow-pension-application-support",
    "name": "Widow Pension Application Support",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "disability-pension-application-assistance",
    "name": "Disability Pension Application Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "atal-pension-yojana-enrollment-support",
    "name": "Atal Pension Yojana Enrollment Support",
    "category": "E-Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "family-id-registration-update-assistance",
    "name": "Family Id Registration Update Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "digital-life-certificate-jeevan-pramaan-assistance",
    "name": "Digital Life Certificate Jeevan Pramaan Assistance",
    "category": "E-Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "e-shram-card-registration-assistance",
    "name": "E Shram Card Registration Assistance",
    "category": "E-Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "e-shram-card-update-download-support",
    "name": "E Shram Card Update Download Support",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "pension-status-dbt-aadhaar-seeding-check",
    "name": "Pension Status Dbt Aadhaar Seeding Check",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "new-ration-card-application-assistance",
    "name": "New Ration Card Application Assistance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ration-card-member-addition-support",
    "name": "Ration Card Member Addition Support",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ration-card-member-deletion-support",
    "name": "Ration Card Member Deletion Support",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ration-card-name-details-correction",
    "name": "Ration Card Name Details Correction",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ration-card-address-ration-shop-transfer-assistance",
    "name": "Ration Card Address Ration Shop Transfer Assistance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "duplicate-ration-card-download-assistance",
    "name": "Duplicate Ration Card Download Assistance",
    "category": "E-Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ration-card-application-status-check",
    "name": "Ration Card Application Status Check",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ration-card-eligibility-beneficiary-list-search",
    "name": "Ration Card Eligibility Beneficiary List Search",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-seeding-in-ration-card-assistance",
    "name": "Aadhaar Seeding In Ration Card Assistance",
    "category": "E-Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "income-certificate",
    "name": "Income Certificate",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "7-10 days",
    "requiredDocs": [
      "Aadhaar card",
      "Income proof",
      "Address proof"
    ]
  },
  {
    "slug": "domicile-certificate",
    "name": "Domicile Certificate",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "7-10 days",
    "requiredDocs": [
      "Aadhaar card",
      "Address proof",
      "Photo"
    ]
  },
  {
    "slug": "caste-certificate",
    "name": "Caste Certificate",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "7-15 days",
    "requiredDocs": [
      "Aadhaar card",
      "Caste proof",
      "Address proof"
    ]
  },
  {
    "slug": "ncl-certificate",
    "name": "Ncl Certificate",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ews-certificate",
    "name": "Ews Certificate",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "birth-certificate",
    "name": "Aadhaar Services Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "7-15 days",
    "requiredDocs": [
      "Hospital record",
      "Parent ID proof",
      "Address proof"
    ]
  },
  {
    "slug": "delayed-birth-certificate",
    "name": "Delayed Birth Certificate",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "birth-certificate-correction",
    "name": "Aadhaar Update Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "death-certificate",
    "name": "Death Certificate",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "delayed-death-certificate",
    "name": "Delayed Death Certificate",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "death-certificate-correction",
    "name": "Death Certificate Correction",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "marriage-registration",
    "name": "Marriage Registration",
    "category": "E-Services",
    "price": 249,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "character-certificate",
    "name": "Character Certificate",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "unemployment-certificate",
    "name": "Unemployment Certificate",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "udid-card",
    "name": "Udid Card",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "surviving-member-certificate",
    "name": "Surviving Member Certificate",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "legal-heir-certificate",
    "name": "Legal Heir Certificate",
    "category": "E-Services",
    "price": 249,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "certificate-correction-resubmission",
    "name": "Certificate Correction Resubmission",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "learners-licence-online-application-support",
    "name": "Learners Licence Online Application Support",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "driving-licence-application-slot-assistance",
    "name": "Driving Licence Application Slot Assistance",
    "category": "E-Services",
    "price": 549,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "driving-licence-renewal-support",
    "name": "Driving Licence Renewal Support",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "duplicate-driving-licence-application-assistance",
    "name": "Duplicate Driving Licence Application Assistance",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "driving-licence-address-update-facilitation",
    "name": "Driving Licence Address Update Facilitation",
    "category": "E-Services",
    "price": 449,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "driving-licence-name-dob-correction",
    "name": "Driving Licence Name Dob Correction",
    "category": "E-Services",
    "price": 449,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "addition-of-vehicle-class-in-driving-licence",
    "name": "Addition Of Vehicle Class In Driving Licence",
    "category": "E-Services",
    "price": 549,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "international-driving-permit-assistance",
    "name": "International Driving Permit Assistance",
    "category": "E-Services",
    "price": 1249,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "driving-licence-extract-assistance",
    "name": "Driving Licence Extract Assistance",
    "category": "E-Services",
    "price": 349,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "rc-download-vehicle-details-assistance",
    "name": "Rc Download Vehicle Details Assistance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "rc-transfer-assistance",
    "name": "Rc Transfer Assistance",
    "category": "E-Services",
    "price": 549,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "rc-address-update-facilitation",
    "name": "Rc Address Update Facilitation",
    "category": "E-Services",
    "price": 449,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "duplicate-rc-application-assistance",
    "name": "Duplicate Rc Application Assistance",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "vehicle-hypothecation-termination-support",
    "name": "Vehicle Hypothecation Termination Support",
    "category": "E-Services",
    "price": 449,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "inter-state-vehicle-noc-assistance",
    "name": "Inter State Vehicle Noc Assistance",
    "category": "E-Services",
    "price": 549,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "vehicle-fitness-certificate-permit-assistance",
    "name": "Vehicle Fitness Certificate Permit Assistance",
    "category": "E-Services",
    "price": 699,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "hsrp-number-plate-booking-assistance",
    "name": "Hsrp Number Plate Booking Assistance",
    "category": "E-Services",
    "price": 549,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "traffic-e-challan-payment-assistance",
    "name": "Traffic E Challan Payment Assistance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "new-voter-id-registration-form-6",
    "name": "New Voter Id Registration Form 6",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "voter-id-correction-and-update-form-8",
    "name": "Voter Id Correction And Update Form 8",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "e-epic-official-digital-download",
    "name": "E Epic Official Digital Download",
    "category": "E-Services",
    "price": 80,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "constituency-transfer-and-shift-form-8",
    "name": "Constituency Transfer And Shift Form 8",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "duplicate-voter-card-replacement-form-8",
    "name": "Duplicate Voter Card Replacement Form 8",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-voter-id-linking-form-6b",
    "name": "Aadhaar Voter Id Linking Form 6b",
    "category": "E-Services",
    "price": 80,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ayushman",
    "name": "Ayushman",
    "category": "CSC Services",
    "price": 50,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "Family ID",
      "Mobile number"
    ]
  },
  {
    "slug": "banking",
    "name": "Banking",
    "category": "CSC Services",
    "price": 30,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "Bank details",
      "Mobile number"
    ]
  },
  {
    "slug": "insurance",
    "name": "Insurance",
    "category": "CSC Services",
    "price": 50,
    "taxRate": 0,
    "duration": "1-3 days",
    "requiredDocs": [
      "Aadhaar",
      "Nominee details",
      "Mobile number"
    ]
  },
  {
    "slug": "jan-seva",
    "name": "Jan Seva",
    "category": "CSC Services",
    "price": 30,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Identity proof",
      "Service details"
    ]
  },
  {
    "slug": "pension",
    "name": "Pension",
    "category": "CSC Services",
    "price": 100,
    "taxRate": 0,
    "duration": "7-15 days",
    "requiredDocs": [
      "Aadhaar",
      "Bank details",
      "Age/income proof"
    ]
  },
  {
    "slug": "pm-kisan",
    "name": "PM Kisan",
    "category": "CSC Services",
    "price": 50,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "Land details",
      "Bank details"
    ]
  },
  {
    "slug": "affidavit",
    "name": "Affidavit",
    "category": "Documentation",
    "price": 100,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "Draft matter",
      "Stamp requirement"
    ]
  },
  {
    "slug": "certificates",
    "name": "Certificates",
    "category": "Documentation",
    "price": 200,
    "taxRate": 0,
    "duration": "1-3 days",
    "requiredDocs": [
      "Identity proof",
      "Certificate details"
    ]
  },
  {
    "slug": "typing",
    "name": "Typing",
    "category": "Documentation",
    "price": 30,
    "taxRate": 0,
    "duration": "Instant",
    "requiredDocs": [
      "Draft content",
      "Language preference"
    ]
  },
  {
    "slug": "ayushman-card",
    "name": "Ayushman Card",
    "category": "E-Services",
    "price": 50,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar card",
      "Ration card or family ID",
      "Mobile number"
    ]
  },
  {
    "slug": "passport-assistance",
    "name": "Passport Assistance",
    "category": "E-Services",
    "price": 350,
    "taxRate": 0,
    "duration": "2-4 weeks",
    "requiredDocs": [
      "Proof of Present Address (Aadhaar / Utility Bill / Bank Passbook)",
      "Proof of Date of Birth (Birth Cert / 10th Marksheet / PAN Card)",
      "Non-ECR Category Proof (Class 10th Certificate)",
      "Identity Proof (Aadhaar / Voter ID / Driving License)"
    ]
  },
  {
    "slug": "pension-welfare-schemes-assistance",
    "name": "Pension & Welfare Schemes",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "7-21 days",
    "requiredDocs": [
      "Aadhaar card",
      "Address proof",
      "Photo"
    ]
  },
  {
    "slug": "police-verification",
    "name": "Pension & Welfare Schemes",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "voter-id",
    "name": "Voter ID",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "15-30 days",
    "requiredDocs": [
      "Aadhaar Card (Identity & Age proof)",
      "DOB Proof (Birth Cert / 10th Marksheet)",
      "Address Proof (Aadhaar / Utility Bill)",
      "Passport Size Photo"
    ]
  },
  {
    "slug": "admit-card-download",
    "name": "Admit Card Download",
    "category": "EduPoint",
    "price": 80,
    "taxRate": 0,
    "duration": "15 min",
    "requiredDocs": [
      "Registration number",
      "DOB or password"
    ]
  },
  {
    "slug": "ccc-o-level",
    "name": "CCC / O Level",
    "category": "EduPoint",
    "price": 150,
    "taxRate": 0,
    "duration": "Support",
    "requiredDocs": [
      "Photo",
      "Signature",
      "Education proof",
      "Mobile number"
    ]
  },
  {
    "slug": "exam-form-filling",
    "name": "Exam Form Filling",
    "category": "EduPoint",
    "price": 150,
    "taxRate": 0,
    "duration": "20 min",
    "requiredDocs": [
      "Student ID",
      "Photo",
      "Signature",
      "Exam details"
    ]
  },
  {
    "slug": "online-test",
    "name": "Online Test",
    "category": "EduPoint",
    "price": 80,
    "taxRate": 0,
    "duration": "30 min",
    "requiredDocs": [
      "Student details",
      "Test/course details"
    ]
  },
  {
    "slug": "result-download",
    "name": "Result Download",
    "category": "EduPoint",
    "price": 80,
    "taxRate": 0,
    "duration": "15 min",
    "requiredDocs": [
      "Roll number",
      "DOB or registration details"
    ]
  },
  {
    "slug": "resume-builder",
    "name": "Resume Builder",
    "category": "EduPoint",
    "price": 149,
    "taxRate": 0,
    "duration": "30 min",
    "requiredDocs": [
      "Education details",
      "Experience details",
      "Photo optional"
    ]
  },
  {
    "slug": "scholarship-form",
    "name": "Scholarship Form",
    "category": "EduPoint",
    "price": 150,
    "taxRate": 0,
    "duration": "30 min",
    "requiredDocs": [
      "Aadhaar card",
      "Marksheet",
      "Bank details",
      "Income certificate"
    ]
  },
  {
    "slug": "university-services",
    "name": "University Services",
    "category": "EduPoint",
    "price": 150,
    "taxRate": 0,
    "duration": "Support",
    "requiredDocs": [
      "Student ID",
      "Marksheet",
      "Course details"
    ]
  },
  {
    "slug": "company-registration",
    "name": "Company Registration",
    "category": "ProServe",
    "price": 1999,
    "taxRate": 0,
    "duration": "10-15 days",
    "requiredDocs": [
      "Director KYC",
      "Address proof",
      "Business details"
    ]
  },
  {
    "slug": "digital-signature",
    "name": "Digital Signature",
    "category": "ProServe",
    "price": 999,
    "taxRate": 0,
    "duration": "2-3 days",
    "requiredDocs": [
      "PAN",
      "Aadhaar",
      "Photo",
      "Email and mobile"
    ]
  },
  {
    "slug": "fssai",
    "name": "FSSAI",
    "category": "ProServe",
    "price": 499,
    "taxRate": 0,
    "duration": "7-15 days",
    "requiredDocs": [
      "Owner KYC",
      "Business address",
      "Food business details"
    ]
  },
  {
    "slug": "gst-registration",
    "name": "GST Registration",
    "category": "ProServe",
    "price": 499,
    "taxRate": 0,
    "duration": "3-7 days",
    "requiredDocs": [
      "PAN",
      "Aadhaar",
      "Business address proof",
      "Bank details"
    ]
  },
  {
    "slug": "iec-code",
    "name": "IEC Code",
    "category": "ProServe",
    "price": 499,
    "taxRate": 0,
    "duration": "5-7 days",
    "requiredDocs": [
      "PAN",
      "Aadhaar",
      "Bank details",
      "Business proof"
    ]
  },
  {
    "slug": "msme-registration",
    "name": "MSME Registration",
    "category": "ProServe",
    "price": 299,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar",
      "PAN",
      "Business details",
      "Bank details"
    ]
  },
  {
    "slug": "shop-license",
    "name": "Shop License",
    "category": "ProServe",
    "price": 499,
    "taxRate": 0,
    "duration": "3-5 days",
    "requiredDocs": [
      "Owner KYC",
      "Shop address proof",
      "Photo"
    ]
  },
  {
    "slug": "trademark",
    "name": "Trademark",
    "category": "ProServe",
    "price": 999,
    "taxRate": 0,
    "duration": "30-90 days",
    "requiredDocs": [
      "Logo/brand name",
      "Applicant KYC",
      "Business proof"
    ]
  },
  {
    "slug": "fresh-passport",
    "name": "Fresh Passport",
    "category": "E-Services",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "voter-card",
    "name": "Voter Card",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ration-card-assistance",
    "name": "Ration Card Assistance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ration-card",
    "name": "Ration Card",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "transport-rto-facilitation",
    "name": "Transport Rto Facilitation",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "driving-license",
    "name": "Driving License",
    "category": "E-Services",
    "price": 1100,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "income-tax-assistance",
    "name": "Income Tax Assistance",
    "category": "E-Services",
    "price": 699,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "income-tax",
    "name": "Income Tax",
    "category": "E-Services",
    "price": 699,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "state-certificates-civil-registration",
    "name": "State Certificates Civil Registration",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "state-certificates",
    "name": "State Certificates",
    "category": "E-Services",
    "price": 200,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-appointment-assistance",
    "name": "Aadhaar Appointment Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-services-assistance",
    "name": "Aadhaar Appointment Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar",
    "name": "Aadhaar Appointment Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-new-enrolment-assistance",
    "name": "New Aadhaar Enrolment Appointment",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "aadhaar-update-correction-assistance",
    "name": "Aadhaar Update Appointment",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "Same day booking",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "citizen-security-cybercrime-police-help",
    "name": "Citizen Security, Cybercrime & Police Help",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar card",
      "Address proof",
      "Photo"
    ]
  },
  {
    "slug": "police-help",
    "name": "Citizen Security, Cybercrime & Police Help",
    "category": "E-Services",
    "price": 150,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "business-registration-corporate-setup",
    "name": "Business Registration Corporate Setup",
    "category": "E-Services",
    "price": 1400,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "business-registration",
    "name": "Business Registration",
    "category": "E-Services",
    "price": 1400,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "legal-drafting-court-services",
    "name": "Legal Drafting Court Services",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "legal-drafting",
    "name": "Legal Drafting",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "Same day",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ayushman-card-check",
    "name": "Ayushman Card Check",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "ayushman-reprint",
    "name": "Ayushman Reprint",
    "category": "E-Services",
    "price": 29,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "birth-certificate-duplicate",
    "name": "Aadhaar PVC Card Assistance",
    "category": "E-Services",
    "price": 79,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "bus-ticket-one-way",
    "name": "Bus Ticket One Way",
    "category": "Travel Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "bus-ticket-round",
    "name": "Bus Ticket Round",
    "category": "Travel Services",
    "price": 79,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "caste-renewal",
    "name": "Caste Renewal",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "color-copies",
    "name": "Color Copies",
    "category": "Documentation",
    "price": 5,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "photo-print",
    "name": "Photo Print",
    "category": "Documentation",
    "price": 20,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "llp-registration",
    "name": "LLP Registration",
    "category": "ProServe",
    "price": 1499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "opc-registration",
    "name": "OPC Registration",
    "category": "ProServe",
    "price": 1999,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "private-limited",
    "name": "Private Limited",
    "category": "ProServe",
    "price": 1999,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "dsc-class-2",
    "name": "DSC Class 2",
    "category": "ProServe",
    "price": 999,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "dsc-class-3",
    "name": "DSC Class 3",
    "category": "ProServe",
    "price": 1499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "dsc-renewal",
    "name": "DSC Renewal",
    "category": "ProServe",
    "price": 799,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "document-scan",
    "name": "Document Scan",
    "category": "Documentation",
    "price": 10,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "photo-scan",
    "name": "Photo Scan",
    "category": "Documentation",
    "price": 15,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "domicile-renewal",
    "name": "Domicile Renewal",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "domestic-flight",
    "name": "Domestic Flight",
    "category": "Travel Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "international-flight",
    "name": "International Flight",
    "category": "Travel Services",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "fssai-basic",
    "name": "FSSAI Basic",
    "category": "ProServe",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "fssai-central",
    "name": "FSSAI Central",
    "category": "ProServe",
    "price": 1499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "fssai-state",
    "name": "FSSAI State",
    "category": "ProServe",
    "price": 999,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "gst-amendment",
    "name": "GST Amendment",
    "category": "ProServe",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "gst-new-registration",
    "name": "GST New Registration",
    "category": "ProServe",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "gst-return-filing",
    "name": "GST Return Filing",
    "category": "ProServe",
    "price": 399,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "hotel-budget-stay",
    "name": "Hotel Budget Stay",
    "category": "Travel Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "hotel-premium-stay",
    "name": "Hotel Premium Stay",
    "category": "Travel Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "iec-modification",
    "name": "IEC Modification",
    "category": "ProServe",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "iec-registration",
    "name": "IEC Registration",
    "category": "ProServe",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "income-certificate-urgent",
    "name": "Income Certificate Urgent",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "photo-laminate",
    "name": "Photo Laminate",
    "category": "EduPoint",
    "price": 30,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "standard-laminate",
    "name": "Standard Laminate",
    "category": "EduPoint",
    "price": 20,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "msme-update",
    "name": "MSME Update",
    "category": "ProServe",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "passport-renewal",
    "name": "Passport Renewal",
    "category": "E-Services",
    "price": 249,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "tatkal-passport",
    "name": "Tatkal Passport",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "bw-photocopy",
    "name": "BW Photocopy",
    "category": "EduPoint",
    "price": 1,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "color-printing",
    "name": "Color Printing",
    "category": "EduPoint",
    "price": 5,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "police-renewal",
    "name": "Police Renewal",
    "category": "E-Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "shop-license-new",
    "name": "Shop License New",
    "category": "ProServe",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "shop-license-renewal",
    "name": "Shop License Renewal",
    "category": "ProServe",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "beach-package",
    "name": "Beach Package",
    "category": "Travel Services",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "hill-station-package",
    "name": "Hill Station Package",
    "category": "Travel Services",
    "price": 399,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "pilgrimage-package",
    "name": "Pilgrimage Package",
    "category": "Travel Services",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "trademark-filing",
    "name": "Trademark Filing",
    "category": "ProServe",
    "price": 999,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "trademark-renewal",
    "name": "Trademark Renewal",
    "category": "ProServe",
    "price": 599,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "trademark-reply",
    "name": "Trademark Reply",
    "category": "ProServe",
    "price": 799,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "train-general-ticket",
    "name": "Train General Ticket",
    "category": "Travel Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "train-premium-tatkal",
    "name": "Train Premium Tatkal",
    "category": "Travel Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "train-tatkal-ticket",
    "name": "Train Tatkal Ticket",
    "category": "Travel Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "e-epic-download",
    "name": "e-EPIC Download",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "voter-id-address",
    "name": "Voter ID Address",
    "category": "E-Services",
    "price": 79,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "voter-id-correction",
    "name": "Voter ID Correction",
    "category": "E-Services",
    "price": 79,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "voter-id-registration",
    "name": "Voter ID Registration",
    "category": "E-Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Identity proof",
      "Mobile number"
    ]
  },
  {
    "slug": "voter-id-new-enrollment",
    "name": "Voter ID New Enrollment Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "overseas-voter-registration",
    "name": "Overseas / NRI Voter Registration Assistance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "voter-id-transfer",
    "name": "Voter ID Address / Constituency Transfer Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "replacement-voter-id",
    "name": "Replacement Voter ID Application Support",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "voter-id-photo-update",
    "name": "Voter ID Photo Update Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "pwd-electoral-marking",
    "name": "PwD Marking in Electoral Roll Assistance",
    "category": "E-Services",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "voter-name-deletion",
    "name": "Name Deletion from Electoral Roll Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "voter-enrollment-objection",
    "name": "Objection to Incorrect Voter Enrollment Assistance",
    "category": "E-Services",
    "price": 149,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "e-epic-download-assistance",
    "name": "e-EPIC Voter Card Download Assistance",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "voter-name-search",
    "name": "Name Search in Electoral Roll",
    "category": "E-Services",
    "price": 0,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "electoral-roll-pdf",
    "name": "Electoral Roll PDF Download Assistance",
    "category": "E-Services",
    "price": 29,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "voter-status-tracking",
    "name": "Voter Application Status Tracking Assistance",
    "category": "E-Services",
    "price": 0,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "voter-complaint-registration",
    "name": "Voter Complaint Registration Assistance",
    "category": "E-Services",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "fresh-passport-assistance",
    "name": "Fresh Passport Application Assistance",
    "category": "E-Services",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "passport-renewal-reissue",
    "name": "Passport Renewal & Re-Issue Support",
    "category": "E-Services",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "tatkaal-passport-help",
    "name": "Tatkaal Passport Processing Help",
    "category": "E-Services",
    "price": 499,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "minor-passport-support",
    "name": "Minor Passport Application Support",
    "category": "E-Services",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "pcc-guidance",
    "name": "Police Clearance Certificate (PCC) Guidance",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "pension-welfare-schemes",
    "name": "Pension & Welfare Schemes",
    "category": "E-Services",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "photocopy-printing",
    "name": "Photocopy & Printing",
    "category": "EduPoint",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "lamination",
    "name": "Lamination",
    "category": "EduPoint",
    "price": 199,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "itr-filing-consultancy",
    "name": "Income Tax Return ( ITR ) Filing Consultancy",
    "category": "ProServe",
    "price": 299,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "income-tax-portal-registration",
    "name": "Income Tax Portal Registration Assistance",
    "category": "ProServe",
    "price": 99,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "form-26as-download",
    "name": "Form 26AS Download Assistance",
    "category": "ProServe",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "ais-tis-download",
    "name": "AIS / TIS Download Assistance",
    "category": "ProServe",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  },
  {
    "slug": "income-tax-refund-status",
    "name": "Income Tax Refund Status Check",
    "category": "ProServe",
    "price": 49,
    "taxRate": 0,
    "duration": "1-3 Days",
    "requiredDocs": [
      "Aadhaar Card",
      "Mobile Number"
    ]
  }
];

module.exports = { products, services };
