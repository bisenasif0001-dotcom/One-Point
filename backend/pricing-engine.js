"use strict";

const PRICING_MODELS = Object.freeze({
  ALL_INCLUSIVE: "all_inclusive",
  SERVICE_PLUS_ACTUAL: "service_charge_plus_actual",
  STARTING_FROM: "starting_from"
});

const MODEL_LABELS = Object.freeze({
  [PRICING_MODELS.ALL_INCLUSIVE]: "All Inclusive Pricing",
  [PRICING_MODELS.SERVICE_PLUS_ACTUAL]: "Service Charge + Actual Amount",
  [PRICING_MODELS.STARTING_FROM]: "Starting From Pricing"
});

const LAST_UPDATED = "2026-06-29";

const SLUG_ALIASES = Object.freeze({
  "fssai-license": "fssai",
  "trademark-registration": "trademark",
  "flight-ticket": "flight-booking",
  "flight-booking": "flight-booking",
  "train-ticket-booking": "train-ticket",
  "tour-package-assistance": "tour-package",
  "photocopy-print": "photocopy-printing",
  "photocopy-and-print": "photocopy-printing",
  "scanning": "document-scanning",
  "pension-assistance": "pension",
  "fastag-recharge": "fastag",
  "recharge-and-bills": "electricity-bill",
  "social-media-creative": "social-media-post",
  "travel-booking": "bus-ticket",
  "general-support": "jan-seva"
});

const DEFAULT_DOCS = Object.freeze(["Identity proof", "Mobile number"]);

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function canonicalSlug(value) {
  const slug = slugify(value);
  return SLUG_ALIASES[slug] || slug;
}

function toPaise(value) {
  if (value === null || value === undefined || value === "") return 0;
  return Math.max(0, Math.round(Number(value || 0) * 100));
}

function fromPaise(value) {
  return Number(value || 0) / 100;
}

function boolToInt(value) {
  return value ? 1 : 0;
}

function normalizeModel(value) {
  const model = String(value || "").trim();
  if (Object.values(PRICING_MODELS).includes(model)) return model;
  return PRICING_MODELS.ALL_INCLUSIVE;
}

function moneyTextFromPaise(value) {
  const rupees = fromPaise(value);
  const hasFraction = Math.abs(rupees % 1) > 0.001;
  return `Rs. ${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0
  })}`;
}

function serviceDnaPricingConfig(input = {}) {
  const direct = input.serviceDnaPricing || input.service_dna_pricing;
  if (direct && typeof direct === "object") return direct;
  const dna = input.serviceDna || input.service_dna;
  return dna?.layers?.pricing?.config || null;
}

function withServiceDnaPricingInput(input = {}) {
  const pricing = serviceDnaPricingConfig(input);
  if (!pricing) return input;
  return {
    ...input,
    pricingModel: pricing.pricingModel ?? input.pricingModel,
    pricing_model: pricing.pricingModel ?? input.pricing_model,
    governmentFeePaise: pricing.governmentFeePaise ?? input.governmentFeePaise,
    government_fee_paise: pricing.governmentFeePaise ?? input.government_fee_paise,
    operatorFeePaise: pricing.operatorFeePaise ?? input.operatorFeePaise,
    operator_fee_paise: pricing.operatorFeePaise ?? input.operator_fee_paise,
    convenienceFeePaise: pricing.convenienceFeePaise ?? input.convenienceFeePaise,
    convenience_fee_paise: pricing.convenienceFeePaise ?? input.convenience_fee_paise,
    gstRate: pricing.gstRate ?? input.gstRate,
    gst_rate: pricing.gstRate ?? input.gst_rate,
    offerPricePaise: pricing.offerPricePaise ?? input.offerPricePaise,
    offer_price_paise: pricing.offerPricePaise ?? input.offer_price_paise,
    pricePaise: pricing.pricePaise ?? input.pricePaise,
    price_paise: pricing.pricePaise ?? input.price_paise,
    displayPrice: pricing.displayPrice ?? input.displayPrice,
    display_price: pricing.displayPrice ?? input.display_price,
    customerPriceNote: pricing.customerPriceNote ?? input.customerPriceNote,
    customer_price_note: pricing.customerPriceNote ?? input.customer_price_note
  };
}

function calculatePricingPaise(input = {}) {
  input = withServiceDnaPricingInput(input);
  const model = normalizeModel(input.pricingModel || input.pricing_model);
  const governmentFeePaise = Number(input.governmentFeePaise ?? input.government_fee_paise ?? toPaise(input.governmentFee));
  const operatorFeePaise = Number(input.operatorFeePaise ?? input.operator_fee_paise ?? toPaise(input.operatorFee));
  const convenienceFeePaise = Number(input.convenienceFeePaise ?? input.convenience_fee_paise ?? toPaise(input.convenienceFee));
  const gstRate = Math.max(0, Number(input.gstRate ?? input.gst_rate ?? 0));
  const offerRaw = input.offerPricePaise ?? input.offer_price_paise;
  const offerPricePaise = offerRaw === null || offerRaw === undefined || offerRaw === ""
    ? null
    : Number(offerRaw);
  const taxablePaise = operatorFeePaise + convenienceFeePaise;
  const gstPaise = Math.round((taxablePaise * gstRate) / 100);
  const allInclusivePaise = governmentFeePaise + taxablePaise + gstPaise;
  const serviceChargePaise = taxablePaise + gstPaise;
  const basePricePaise = model === PRICING_MODELS.SERVICE_PLUS_ACTUAL ? serviceChargePaise : allInclusivePaise;
  const payablePricePaise = offerPricePaise !== null && offerPricePaise >= 0 ? offerPricePaise : basePricePaise;

  return {
    model,
    governmentFeePaise,
    operatorFeePaise,
    convenienceFeePaise,
    gstRate,
    gstPaise,
    allInclusivePaise,
    serviceChargePaise,
    offerPricePaise,
    payablePricePaise
  };
}

function displayPriceFor(input = {}) {
  input = withServiceDnaPricingInput(input);
  if (input.displayPrice || input.display_price) return String(input.displayPrice || input.display_price);
  const pricing = calculatePricingPaise(input);
  if (pricing.model === PRICING_MODELS.SERVICE_PLUS_ACTUAL) {
    return `${moneyTextFromPaise(pricing.payablePricePaise)} + actual amount`;
  }
  if (pricing.model === PRICING_MODELS.STARTING_FROM) {
    return `Starting from ${moneyTextFromPaise(pricing.payablePricePaise)}`;
  }
  return moneyTextFromPaise(pricing.payablePricePaise);
}

function noteForModel(model, customNote = "") {
  if (customNote) return customNote;
  if (model === PRICING_MODELS.SERVICE_PLUS_ACTUAL) {
    return "Service charge shown separately; actual government, bill, premium, fare or portal amount is payable as per official portal.";
  }
  if (model === PRICING_MODELS.STARTING_FROM) {
    return "Final quote depends on package, quantity, design scope or selected variant.";
  }
  return "Government charges included. Service charges included. No hidden operator fee.";
}

function defaultPricingForService(service = {}) {
  const category = service.category || "";
  const base = {
    subCategory: category,
    variant: "Standard",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 0,
    operatorFee: 0,
    convenienceFee: 0,
    gstRate: 0,
    offerPrice: null,
    timeline: service.duration || "1-3 days",
    requiredDocs: service.requiredDocs || DEFAULT_DOCS,
    status: "active",
    popular: false,
    featured: false,
    homepageVisibility: false,
    description: `${service.name || "Service"} customer payable price.`,
    internalNotes: "Missing Master Pricing override; admin must enter government/operator split before publishing."
  };

  if (category === "Bill & Recharge" || category === "Travel Services" || service.slug === "insurance") {
    base.pricingModel = PRICING_MODELS.SERVICE_PLUS_ACTUAL;
  }
  if (category === "Design Services" || category === "Documentation") {
    base.pricingModel = PRICING_MODELS.STARTING_FROM;
  }
  return base;
}

const SERVICE_PRICING = Object.freeze({
  "pan-card": {
    subCategory: "Identity",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 107,
    operatorFee: 113,
    timeline: "2-3 days",
    requiredDocs: ["Aadhaar card", "Photo", "Signature", "Mobile number"],
    popular: true,
    featured: true,
    homepageVisibility: true,
    description: "PAN application assistance with government and operator charges included.",
    internalNotes: "Standardized from mixed PAN website/apply pricing to final payable Rs. 220."
  },
  "new-pan": {
    subCategory: "Identity",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 107,
    operatorFee: 113,
    timeline: "2-3 days",
    requiredDocs: ["Aadhaar card", "Photo", "Signature", "Mobile number"],
    popular: true,
    featured: true,
    homepageVisibility: true,
    description: "New PAN application with government and service charges included.",
    internalNotes: "Customer-facing example price locked at Rs. 220."
  },
  "pan-correction": {
    subCategory: "Identity",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 107,
    operatorFee: 143,
    timeline: "2-3 days",
    requiredDocs: ["Existing PAN", "Aadhaar card", "Correction proof"],
    description: "PAN correction assistance with final payable amount."
  },
  "e-pan-download": {
    subCategory: "Identity",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 99,
    timeline: "Same day",
    requiredDocs: ["PAN number", "Aadhaar linked mobile"],
    description: "E-PAN download support with operator charge included."
  },
  "card-reprint": {
    subCategory: "Identity",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 50,
    operatorFee: 99,
    timeline: "5-7 days",
    requiredDocs: ["Existing PAN", "Aadhaar card", "Mobile number"],
    description: "PAN card reprint assistance with final payable amount."
  },
  "ayushman-card": {
    subCategory: "Health",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 50,
    timeline: "Same day",
    requiredDocs: ["Aadhaar card", "Ration card or family ID", "Mobile number"],
    popular: true,
    homepageVisibility: true,
    description: "Ayushman eligibility check and card assistance."
  },
  "voter-id": {
    subCategory: "Identity",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 100,
    timeline: "15-30 days",
    requiredDocs: ["Aadhaar card", "Address proof", "Photo"],
    popular: true,
    homepageVisibility: true,
    description: "Voter ID application, correction and e-EPIC assistance."
  },
  "passport-assistance": {
    subCategory: "Travel Document",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 300,
    timeline: "2-4 weeks",
    requiredDocs: ["Aadhaar card", "Address proof", "DOB proof", "Photo"],
    description: "Passport form, appointment and document support.",
    customerPriceNote: "Passport portal fee is payable as per passport type and appointment category."
  },
  "aadhaar-services-assistance": {
    subCategory: "Identity Services",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 50,
    operatorFee: 100,
    timeline: "Same day",
    requiredDocs: ["Existing Aadhaar card / EID slip", "Mobile number for OTP", "Identity or address proof for the requested update"],
    description: "Aadhaar enrolment, demographic update and PVC card assistance."
  },
  "income-certificate": {
    subCategory: "Certificates",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 50,
    operatorFee: 100,
    timeline: "7-10 days",
    requiredDocs: ["Aadhaar card", "Income proof", "Address proof"],
    popular: true,
    homepageVisibility: true,
    description: "Income certificate application assistance."
  },
  "domicile-certificate": {
    subCategory: "Certificates",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 50,
    operatorFee: 100,
    timeline: "7-10 days",
    requiredDocs: ["Aadhaar card", "Address proof", "Photo"],
    description: "Domicile certificate application assistance."
  },
  "caste-certificate": {
    subCategory: "Certificates",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 50,
    operatorFee: 100,
    timeline: "7-15 days",
    requiredDocs: ["Aadhaar card", "Caste proof", "Address proof"],
    description: "Caste certificate application assistance."
  },
  "police-verification": {
    subCategory: "Welfare Services",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 100,
    operatorFee: 100,
    timeline: "Varies by scheme",
    requiredDocs: ["Aadhaar card", "Mobile number for OTP", "Bank passbook and relevant scheme documents"],
    description: "Pension, welfare scheme, Family ID, Jeevan Pramaan and e-Shram assistance."
  },
  "pension-welfare-schemes-assistance": {
    subCategory: "Welfare Services",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 100,
    operatorFee: 100,
    timeline: "Varies by scheme",
    requiredDocs: ["Aadhaar card", "Mobile number for OTP", "Bank passbook and relevant scheme documents"],
    description: "Pension and welfare scheme application assistance."
  },
  "pension-welfare-schemes": {
    subCategory: "Welfare Services",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    governmentFee: 100,
    operatorFee: 100,
    timeline: "Varies by scheme",
    requiredDocs: ["Aadhaar card", "Mobile number for OTP", "Bank passbook and relevant scheme documents"],
    description: "Pension and welfare scheme application assistance."
  },
  "exam-form-filling": {
    subCategory: "Exam Support",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 150,
    timeline: "20 min",
    requiredDocs: ["Student ID", "Photo", "Signature", "Exam details"],
    popular: true,
    homepageVisibility: true,
    description: "Assisted exam form filling with portal fee charged separately."
  },
  "admit-card-download": {
    subCategory: "Exam Support",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 80,
    timeline: "15 min",
    requiredDocs: ["Registration number", "DOB or password"],
    popular: true,
    description: "Admit card download and print support."
  },
  "result-download": {
    subCategory: "Exam Support",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 80,
    timeline: "15 min",
    requiredDocs: ["Roll number", "DOB or registration details"],
    description: "Result download and print support."
  },
  "scholarship-form": {
    subCategory: "Scholarship",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 150,
    timeline: "30 min",
    requiredDocs: ["Aadhaar card", "Marksheet", "Bank details", "Income certificate"],
    popular: true,
    description: "Scholarship form assistance; portal charges if any are separate."
  },
  "ccc-o-level": {
    subCategory: "Skill Course",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 150,
    timeline: "Support",
    requiredDocs: ["Photo", "Signature", "Education proof", "Mobile number"],
    description: "CCC/O Level form and portal assistance."
  },
  "university-services": {
    subCategory: "University",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 150,
    timeline: "Support",
    requiredDocs: ["Student ID", "Marksheet", "Course details"],
    description: "University form, result, correction and document assistance."
  },
  "photocopy-printing": {
    subCategory: "Printing",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 2,
    timeline: "Quick",
    requiredDocs: ["Print file or original document", "Quantity"],
    popular: true,
    description: "Photocopy and printing with quantity based pricing."
  },
  "lamination": {
    subCategory: "Printing",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 20,
    timeline: "Quick",
    requiredDocs: ["Document/photo", "Lamination size"],
    description: "Document and photo lamination by size."
  },
  "online-test": {
    subCategory: "Skill Course",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 80,
    timeline: "30 min",
    requiredDocs: ["Student details", "Test/course details"],
    description: "Online test setup and support."
  },
  "resume-builder": {
    subCategory: "Career",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 149,
    timeline: "30 min",
    requiredDocs: ["Education details", "Experience details", "Photo optional"],
    popular: true,
    description: "Resume building service with package based pricing."
  },
  "gst-registration": {
    subCategory: "Tax",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 499,
    timeline: "3-7 days",
    requiredDocs: ["PAN", "Aadhaar", "Business address proof", "Bank details"],
    popular: true,
    featured: true,
    homepageVisibility: true,
    description: "GST registration assistance with package based service charge."
  },
  "msme-registration": {
    subCategory: "Business Registration",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 299,
    timeline: "Same day",
    requiredDocs: ["Aadhaar", "PAN", "Business details", "Bank details"],
    popular: true,
    homepageVisibility: true,
    description: "MSME/Udyam registration assistance."
  },
  "digital-signature": {
    subCategory: "Digital Certificate",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 999,
    timeline: "2-3 days",
    requiredDocs: ["PAN", "Aadhaar", "Photo", "Email and mobile"],
    description: "Digital signature certificate package pricing."
  },
  fssai: {
    subCategory: "Food License",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 499,
    timeline: "7-15 days",
    requiredDocs: ["Owner KYC", "Business address", "Food business details"],
    description: "FSSAI license assistance by license type."
  },
  "shop-license": {
    subCategory: "Business License",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 499,
    timeline: "3-5 days",
    requiredDocs: ["Owner KYC", "Shop address proof", "Photo"],
    description: "Shop license registration and renewal assistance."
  },
  "iec-code": {
    subCategory: "Import Export",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 499,
    timeline: "5-7 days",
    requiredDocs: ["PAN", "Aadhaar", "Bank details", "Business proof"],
    description: "IEC code registration and modification assistance."
  },
  trademark: {
    subCategory: "Brand Protection",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 999,
    timeline: "30-90 days",
    requiredDocs: ["Logo/brand name", "Applicant KYC", "Business proof"],
    description: "Trademark filing assistance; government filing fee is separate."
  },
  "company-registration": {
    subCategory: "Company Setup",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 1999,
    timeline: "10-15 days",
    requiredDocs: ["Director KYC", "Address proof", "Business details"],
    description: "Company/LLP/OPC registration package pricing."
  },
  "pm-kisan": {
    subCategory: "Welfare",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 50,
    timeline: "Same day",
    requiredDocs: ["Aadhaar", "Land details", "Bank details"],
    description: "PM Kisan assistance with transparent service charge."
  },
  pension: {
    subCategory: "Welfare",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 100,
    timeline: "7-15 days",
    requiredDocs: ["Aadhaar", "Bank details", "Age/income proof"],
    description: "Pension application assistance."
  },
  insurance: {
    subCategory: "Insurance",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 50,
    timeline: "1-3 days",
    requiredDocs: ["Aadhaar", "Nominee details", "Mobile number"],
    description: "Insurance assistance; premium payable as per policy."
  },
  banking: {
    subCategory: "Banking",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 30,
    timeline: "Same day",
    requiredDocs: ["Aadhaar", "Bank details", "Mobile number"],
    description: "Banking assistance with actual bank charges if applicable."
  },
  ayushman: {
    subCategory: "Health",
    pricingModel: PRICING_MODELS.ALL_INCLUSIVE,
    operatorFee: 50,
    timeline: "Same day",
    requiredDocs: ["Aadhaar", "Family ID", "Mobile number"],
    description: "Ayushman CSC assistance."
  },
  "jan-seva": {
    subCategory: "Local Utility",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 30,
    timeline: "Same day",
    requiredDocs: ["Identity proof", "Service details"],
    description: "Jan Seva and utility assistance."
  },
  typing: {
    subCategory: "Documentation",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 30,
    timeline: "Instant",
    requiredDocs: ["Draft content", "Language preference"],
    description: "Typing service with page based pricing."
  },
  scan: {
    subCategory: "Documentation",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 10,
    timeline: "Instant",
    requiredDocs: ["Document to scan", "Output format"],
    description: "Scanning service with page based pricing."
  },
  print: {
    subCategory: "Documentation",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 3,
    timeline: "Instant",
    requiredDocs: ["Print file", "Quantity", "Print type"],
    description: "Print service with quantity based pricing."
  },
  "print-scan": {
    subCategory: "Documentation",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 10,
    timeline: "Instant",
    requiredDocs: ["Print/scan file", "Quantity", "Format"],
    description: "Combined print and scan service."
  },
  "color-printing": {
    subCategory: "Printing",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 5,
    timeline: "Quick",
    requiredDocs: ["Print file", "Paper size", "Quantity"],
    description: "Color printing with per page pricing."
  },
  "document-scanning": {
    subCategory: "Scanning",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 10,
    timeline: "Quick",
    requiredDocs: ["Document", "Output format"],
    description: "Document scanning and PDF conversion."
  },
  affidavit: {
    subCategory: "Documentation",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 100,
    timeline: "Same day",
    requiredDocs: ["Aadhaar", "Draft matter", "Stamp requirement"],
    description: "Affidavit drafting and print support."
  },
  certificates: {
    subCategory: "Documentation",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 100,
    timeline: "1-3 days",
    requiredDocs: ["Identity proof", "Certificate details"],
    description: "Certificate support with quote based pricing."
  },
  "mobile-recharge": {
    subCategory: "Recharge",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 10,
    timeline: "Instant",
    requiredDocs: ["Mobile number", "Operator/plan"],
    description: "Mobile recharge service charge plus actual recharge amount."
  },
  "electricity-bill": {
    subCategory: "Bill Payment",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 20,
    timeline: "Instant",
    requiredDocs: ["Consumer number", "Registered mobile"],
    description: "Electricity bill payment service charge plus actual bill amount."
  },
  fastag: {
    subCategory: "Recharge",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 30,
    timeline: "Same day",
    requiredDocs: ["Vehicle number", "FASTag details"],
    description: "FASTag recharge service charge plus actual recharge amount."
  },
  "dth-recharge": {
    subCategory: "Recharge",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 10,
    timeline: "Instant",
    requiredDocs: ["Subscriber ID", "Operator/plan"],
    description: "DTH recharge service charge plus actual recharge amount."
  },
  "water-bill": {
    subCategory: "Bill Payment",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 20,
    timeline: "Instant",
    requiredDocs: ["Consumer number", "Registered mobile"],
    description: "Water bill payment service charge plus actual bill amount."
  },
  "logo-design": {
    subCategory: "Branding",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 299,
    timeline: "1-2 days",
    requiredDocs: ["Brand name", "Reference style", "Color preference"],
    popular: true,
    description: "Logo design package pricing."
  },
  "flex-design": {
    subCategory: "Print Design",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 249,
    timeline: "1-2 days",
    requiredDocs: ["Size", "Matter", "Reference"],
    description: "Flex design package pricing."
  },
  "visiting-card-design": {
    subCategory: "Business Design",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 199,
    timeline: "1-2 days",
    requiredDocs: ["Name/business details", "Logo", "Design preference"],
    popular: true,
    description: "Visiting card design package pricing."
  },
  "banner-design": {
    subCategory: "Print Design",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 249,
    timeline: "1-2 days",
    requiredDocs: ["Banner size", "Matter", "Images/logo"],
    description: "Banner design package pricing."
  },
  "social-media-post": {
    subCategory: "Digital Design",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 149,
    timeline: "1-2 days",
    requiredDocs: ["Post matter", "Logo", "Reference"],
    popular: true,
    description: "Social media creative package pricing."
  },
  "bus-ticket": {
    subCategory: "Ticket Booking",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 49,
    timeline: "Same day",
    requiredDocs: ["Passenger details", "Route", "Travel date"],
    description: "Bus ticket booking service charge plus actual fare."
  },
  "train-ticket": {
    subCategory: "Ticket Booking",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 99,
    timeline: "Same day",
    requiredDocs: ["Passenger details", "Route", "Travel date", "ID proof"],
    description: "Train ticket booking service charge plus actual fare."
  },
  "flight-booking": {
    subCategory: "Ticket Booking",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 149,
    timeline: "Same day",
    requiredDocs: ["Passenger details", "Route", "Travel date", "ID proof"],
    description: "Flight booking service charge plus actual fare."
  },
  "hotel-booking": {
    subCategory: "Hotel Booking",
    pricingModel: PRICING_MODELS.SERVICE_PLUS_ACTUAL,
    operatorFee: 99,
    timeline: "Same day",
    requiredDocs: ["Guest details", "City", "Check-in/check-out dates"],
    description: "Hotel booking service charge plus actual stay amount."
  },
  "tour-package": {
    subCategory: "Tour Package",
    pricingModel: PRICING_MODELS.STARTING_FROM,
    operatorFee: 299,
    timeline: "1-3 days",
    requiredDocs: ["Destination", "Travel dates", "Passenger count"],
    description: "Tour package planning service with quote based pricing."
  }
});

function makeVariant(parentSlug, variantName, label, pricingModel, operatorFee, options = {}) {
  return {
    parentSlug,
    variantSlug: options.variantSlug || slugify(variantName),
    serviceName: options.serviceName || variantName,
    variantName,
    label,
    pricingModel,
    governmentFee: options.governmentFee || 0,
    operatorFee,
    convenienceFee: options.convenienceFee || 0,
    gstRate: options.gstRate || 0,
    offerPrice: options.offerPrice ?? null,
    displayPrice: options.displayPrice || "",
    customerPriceNote: options.customerPriceNote || "",
    timeline: options.timeline || "",
    requiredDocs: options.requiredDocs || [],
    description: options.description || "",
    internalNotes: options.internalNotes || "Variant preserved from website service cards.",
    popular: Boolean(options.popular),
    featured: Boolean(options.featured),
    homepageVisibility: Boolean(options.homepageVisibility)
  };
}

const SERVICE_VARIANTS = Object.freeze([
  makeVariant("pan-card", "New PAN", "New PAN", PRICING_MODELS.ALL_INCLUSIVE, 113, { governmentFee: 107, timeline: "2-3 days", popular: true, homepageVisibility: true }),
  makeVariant("pan-card", "PAN Correction", "Correction", PRICING_MODELS.ALL_INCLUSIVE, 143, { governmentFee: 107, timeline: "2-3 days" }),
  makeVariant("pan-card", "E-PAN Download", "E-PAN", PRICING_MODELS.ALL_INCLUSIVE, 99, { timeline: "Same day" }),
  makeVariant("pan-card", "Card Reprint", "Reprint", PRICING_MODELS.ALL_INCLUSIVE, 99, { governmentFee: 50, timeline: "5-7 days" }),

  makeVariant("bus-ticket", "Bus Ticket One Way", "One Way", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 49, { customerPriceNote: "Actual bus fare is payable as per selected route." }),
  makeVariant("bus-ticket", "Bus Ticket Round", "Round Trip", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 79, { customerPriceNote: "Actual bus fare is payable as per selected route." }),
  makeVariant("train-ticket", "Train General Ticket", "General", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 99, { customerPriceNote: "Actual railway fare is payable as per IRCTC/railway availability." }),
  makeVariant("train-ticket", "Train Tatkal Ticket", "Tatkal", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 149, { customerPriceNote: "Actual railway fare is payable as per IRCTC/railway availability." }),
  makeVariant("train-ticket", "Train Premium Tatkal", "Premium", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 199, { customerPriceNote: "Actual railway fare is payable as per IRCTC/railway availability." }),
  makeVariant("flight-booking", "Domestic Flight", "Domestic", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 149, { customerPriceNote: "Actual flight fare is payable as per airline quote." }),
  makeVariant("flight-booking", "International Flight", "International", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 299, { customerPriceNote: "Actual flight fare is payable as per airline quote." }),
  makeVariant("hotel-booking", "Hotel Budget Stay", "Budget", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 99, { customerPriceNote: "Actual hotel tariff is payable as per selected stay." }),
  makeVariant("hotel-booking", "Hotel Premium Stay", "Premium", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 149, { customerPriceNote: "Actual hotel tariff is payable as per selected stay." }),
  makeVariant("tour-package", "Pilgrimage Package", "Pilgrimage", PRICING_MODELS.STARTING_FROM, 299),
  makeVariant("tour-package", "Hill Station Package", "Hills", PRICING_MODELS.STARTING_FROM, 399),
  makeVariant("tour-package", "Beach Package", "Beach", PRICING_MODELS.STARTING_FROM, 499),

  makeVariant("ayushman-card", "Ayushman Card Check", "Check & Apply", PRICING_MODELS.ALL_INCLUSIVE, 49),
  makeVariant("ayushman-card", "Ayushman Reprint", "Card Reprint", PRICING_MODELS.ALL_INCLUSIVE, 29),
  makeVariant("voter-id", "Voter ID Registration", "New Register", PRICING_MODELS.ALL_INCLUSIVE, 99),
  makeVariant("voter-id", "Voter ID Correction", "Correction", PRICING_MODELS.ALL_INCLUSIVE, 79),
  makeVariant("voter-id", "e-EPIC Download", "e-EPIC", PRICING_MODELS.ALL_INCLUSIVE, 49),
  makeVariant("voter-id", "Voter ID Address", "Address Change", PRICING_MODELS.ALL_INCLUSIVE, 79),
  makeVariant("passport-assistance", "Fresh Passport", "Fresh Passport", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 299),
  makeVariant("passport-assistance", "Passport Renewal", "Renewal", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 249),
  makeVariant("passport-assistance", "Tatkal Passport", "Tatkal", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 499),
  makeVariant("aadhaar-services-assistance", "Aadhaar Enrolment Assistance", "New Enrolment", PRICING_MODELS.ALL_INCLUSIVE, 99, { governmentFee: 50 }),
  makeVariant("aadhaar-services-assistance", "Aadhaar Update Assistance", "Update Details", PRICING_MODELS.ALL_INCLUSIVE, 99),
  makeVariant("aadhaar-services-assistance", "Aadhaar PVC Card Assistance", "PVC Card", PRICING_MODELS.ALL_INCLUSIVE, 79),
  makeVariant("income-certificate", "Income Certificate", "New Certificate", PRICING_MODELS.ALL_INCLUSIVE, 99),
  makeVariant("income-certificate", "Income Certificate Urgent", "Urgent", PRICING_MODELS.ALL_INCLUSIVE, 149),
  makeVariant("domicile-certificate", "Domicile Certificate", "New Certificate", PRICING_MODELS.ALL_INCLUSIVE, 99),
  makeVariant("domicile-certificate", "Domicile Renewal", "Renewal", PRICING_MODELS.ALL_INCLUSIVE, 49),
  makeVariant("caste-certificate", "Caste Certificate", "New Certificate", PRICING_MODELS.ALL_INCLUSIVE, 99),
  makeVariant("caste-certificate", "Caste Renewal", "Renewal", PRICING_MODELS.ALL_INCLUSIVE, 49),
  makeVariant("police-verification", "Pension & Welfare Schemes", "Welfare Service", PRICING_MODELS.ALL_INCLUSIVE, 199),
  makeVariant("police-verification", "Pension & Welfare Scheme Update", "Update Support", PRICING_MODELS.ALL_INCLUSIVE, 99),
  makeVariant("pension-welfare-schemes-assistance", "Pension & Welfare Schemes", "Welfare Service", PRICING_MODELS.ALL_INCLUSIVE, 199),
  makeVariant("pension-welfare-schemes-assistance", "Pension & Welfare Scheme Update", "Update Support", PRICING_MODELS.ALL_INCLUSIVE, 99),
  makeVariant("pension-welfare-schemes", "Pension & Welfare Schemes", "Welfare Service", PRICING_MODELS.ALL_INCLUSIVE, 199),
  makeVariant("pension-welfare-schemes", "Pension & Welfare Scheme Update", "Update Support", PRICING_MODELS.ALL_INCLUSIVE, 99),

  makeVariant("gst-registration", "GST New Registration", "New Register", PRICING_MODELS.STARTING_FROM, 499),
  makeVariant("gst-registration", "GST Amendment", "Amendment", PRICING_MODELS.STARTING_FROM, 299),
  makeVariant("gst-registration", "GST Return Filing", "Return Filing", PRICING_MODELS.STARTING_FROM, 399),
  makeVariant("msme-registration", "MSME Registration", "New Udyam", PRICING_MODELS.ALL_INCLUSIVE, 299),
  makeVariant("msme-registration", "MSME Update", "Update", PRICING_MODELS.ALL_INCLUSIVE, 199),
  makeVariant("digital-signature", "DSC Class 2", "Class 2 DSC", PRICING_MODELS.STARTING_FROM, 999),
  makeVariant("digital-signature", "DSC Class 3", "Class 3 DSC", PRICING_MODELS.STARTING_FROM, 1499),
  makeVariant("digital-signature", "DSC Renewal", "Renewal", PRICING_MODELS.STARTING_FROM, 799),
  makeVariant("fssai", "FSSAI Basic", "Basic License", PRICING_MODELS.STARTING_FROM, 499),
  makeVariant("fssai", "FSSAI State", "State License", PRICING_MODELS.STARTING_FROM, 999),
  makeVariant("fssai", "FSSAI Central", "Central License", PRICING_MODELS.STARTING_FROM, 1499),
  makeVariant("shop-license", "Shop License New", "New License", PRICING_MODELS.STARTING_FROM, 499),
  makeVariant("shop-license", "Shop License Renewal", "Renewal", PRICING_MODELS.STARTING_FROM, 299),
  makeVariant("iec-code", "IEC Registration", "New IEC", PRICING_MODELS.STARTING_FROM, 499),
  makeVariant("iec-code", "IEC Modification", "Modification", PRICING_MODELS.STARTING_FROM, 299),
  makeVariant("trademark", "Trademark Filing", "New Filing", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 999),
  makeVariant("trademark", "Trademark Renewal", "Renewal", PRICING_MODELS.SERVICE_PLUS_ACTUAL, 599),
  makeVariant("trademark", "Trademark Reply", "TM Reply", PRICING_MODELS.STARTING_FROM, 799),
  makeVariant("company-registration", "Private Limited", "Pvt. Limited", PRICING_MODELS.STARTING_FROM, 1999),
  makeVariant("company-registration", "LLP Registration", "LLP", PRICING_MODELS.STARTING_FROM, 1499),
  makeVariant("company-registration", "OPC Registration", "OPC", PRICING_MODELS.STARTING_FROM, 1999),

  makeVariant("photocopy-printing", "BW Photocopy", "B&W Copies", PRICING_MODELS.STARTING_FROM, 1, { displayPrice: "Starting from Rs. 1/page" }),
  makeVariant("photocopy-printing", "Color Printing", "Color Print", PRICING_MODELS.STARTING_FROM, 5, { displayPrice: "Starting from Rs. 5/page" }),
  makeVariant("color-printing", "Color Copies", "Color Copies", PRICING_MODELS.STARTING_FROM, 5, { displayPrice: "Starting from Rs. 5/page" }),
  makeVariant("color-printing", "Photo Print", "Photo Print", PRICING_MODELS.STARTING_FROM, 20),
  makeVariant("document-scanning", "Document Scan", "Scan to PDF", PRICING_MODELS.STARTING_FROM, 10, { displayPrice: "Starting from Rs. 10/page" }),
  makeVariant("document-scanning", "Photo Scan", "Photo Scan", PRICING_MODELS.STARTING_FROM, 15),
  makeVariant("lamination", "Standard Laminate", "Standard", PRICING_MODELS.STARTING_FROM, 20),
  makeVariant("lamination", "Photo Laminate", "Photo", PRICING_MODELS.STARTING_FROM, 30)
]);

function normalizeServicePricing(service = {}) {
  const canonical = canonicalSlug(service.slug || service.name);
  const merged = {
    ...defaultPricingForService(service),
    ...(SERVICE_PRICING[canonical] || {}),
    serviceId: canonical,
    serviceName: service.name || "",
    category: service.category || "",
    variant: "Standard"
  };
  return normalizePricingRecord(merged);
}

function normalizeVariantPricing(variant = {}) {
  const parentSlug = canonicalSlug(variant.parentSlug);
  const parentDefaults = SERVICE_PRICING[parentSlug] || {};
  return normalizePricingRecord({
    ...parentDefaults,
    ...variant,
    serviceId: variant.variantSlug,
    serviceName: variant.serviceName || variant.variantName,
    category: variant.category || "",
    subCategory: variant.subCategory || parentDefaults.subCategory || "",
    parentSlug,
    variant: variant.label || variant.variantName || "Variant"
  });
}

function normalizePricingRecord(input = {}) {
  const calculated = calculatePricingPaise(input);
  const displayPrice = displayPriceFor({ ...input, ...calculated });
  const customerPriceNote = noteForModel(calculated.model, input.customerPriceNote || input.customer_price_note || "");
  return {
    serviceId: input.serviceId || input.slug || "",
    parentSlug: input.parentSlug || "",
    variantSlug: input.variantSlug || input.serviceId || input.slug || "",
    serviceName: input.serviceName || input.name || input.variantName || "",
    variantName: input.variantName || input.serviceName || input.name || "",
    category: input.category || "",
    subCategory: input.subCategory || input.sub_category || "",
    variant: input.variant || "",
    pricingModel: calculated.model,
    pricingModelLabel: MODEL_LABELS[calculated.model],
    governmentFeePaise: calculated.governmentFeePaise,
    operatorFeePaise: calculated.operatorFeePaise,
    convenienceFeePaise: calculated.convenienceFeePaise,
    gstRate: calculated.gstRate,
    gstPaise: calculated.gstPaise,
    offerPricePaise: calculated.offerPricePaise,
    pricePaise: calculated.payablePricePaise,
    displayPrice,
    customerPriceNote,
    timeline: input.timeline || input.duration || "",
    requiredDocs: Array.isArray(input.requiredDocs) ? input.requiredDocs : DEFAULT_DOCS,
    status: input.status || "active",
    popular: Boolean(input.popular),
    featured: Boolean(input.featured),
    homepageVisibility: Boolean(input.homepageVisibility),
    description: input.description || "",
    internalNotes: input.internalNotes || input.internal_notes || "",
    lastUpdated: input.lastUpdated || input.last_updated || LAST_UPDATED
  };
}

function publicPricingPayload(row = {}) {
  row = withServiceDnaPricingInput(row);
  const pricing = calculatePricingPaise(row);
  const displayPrice = displayPriceFor(row);
  return {
    model: pricing.model,
    modelLabel: MODEL_LABELS[pricing.model],
    displayPrice,
    payableAmount: fromPaise(row.price_paise ?? row.pricePaise ?? pricing.payablePricePaise),
    payableAmountPaise: Number(row.price_paise ?? row.pricePaise ?? pricing.payablePricePaise),
    customerPriceNote: row.customer_price_note || row.customerPriceNote || noteForModel(pricing.model),
    includesGovernmentFee: pricing.model === PRICING_MODELS.ALL_INCLUSIVE && pricing.governmentFeePaise > 0,
    calculationMode: pricing.model === PRICING_MODELS.ALL_INCLUSIVE ? "fixed_final_price" : pricing.model
  };
}

function internalPricingPayload(row = {}) {
  row = withServiceDnaPricingInput(row);
  const publicPayload = publicPricingPayload(row);
  return {
    ...publicPayload,
    governmentFee: fromPaise(row.government_fee_paise ?? row.governmentFeePaise),
    operatorFee: fromPaise(row.operator_fee_paise ?? row.operatorFeePaise),
    convenienceFee: fromPaise(row.convenience_fee_paise ?? row.convenienceFeePaise),
    gstRate: Number(row.gst_rate ?? row.gstRate ?? 0),
    offerPrice: row.offer_price_paise === null || row.offer_price_paise === undefined
      ? null
      : fromPaise(row.offer_price_paise),
    internalNotes: row.internal_notes || row.internalNotes || "",
    lastUpdated: row.last_updated || row.lastUpdated || ""
  };
}

function getServiceVariantSeeds() {
  return SERVICE_VARIANTS.map(normalizeVariantPricing);
}

function getServicePricingMaster(services = []) {
  return services.map(normalizeServicePricing);
}

module.exports = {
  PRICING_MODELS,
  MODEL_LABELS,
  LAST_UPDATED,
  SLUG_ALIASES,
  SERVICE_PRICING,
  SERVICE_VARIANTS,
  canonicalSlug,
  slugify,
  toPaise,
  fromPaise,
  moneyTextFromPaise,
  calculatePricingPaise,
  displayPriceFor,
  normalizePricingRecord,
  normalizeServicePricing,
  normalizeVariantPricing,
  publicPricingPayload,
  internalPricingPayload,
  getServiceVariantSeeds,
  getServicePricingMaster
};
