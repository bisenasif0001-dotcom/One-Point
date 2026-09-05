"use strict";

const crypto = require("node:crypto");
const db = require("./db");

const DECLARATION_VERSION = "voter-id-consent-v1.0-2026-08-01";
const DECLARATION_TEXT = [
  "मैं पुष्टि करता/करती हूँ कि इस आवेदन के लिए मेरे द्वारा दी गई सभी जानकारी और दस्तावेज मेरी जानकारी के अनुसार सही, पूर्ण और वैध हैं।",
  "मैं इस स्वतंत्र निजी डिजिटल सहायता केंद्र को मेरे द्वारा चुनी गई सेवा के लिए आवेदन भरने, विवरण दर्ज करने, दस्तावेज स्कैन/अपलोड करने, आवेदन जमा करने तथा उसकी स्थिति देखने में सहायता प्रदान करने की अनुमति देता/देती हूँ।",
  "मैं समझता/समझती हूँ कि यह पोर्टल Election Commission of India या किसी सरकारी विभाग का अधिकृत कार्यालय या प्रतिनिधि नहीं है। यह केवल ऑनलाइन आवेदन एवं दस्तावेजी सहायता प्रदान करता है।",
  "आवेदन की जाँच, सत्यापन, स्वीकृति, अस्वीकृति, सुधार, Voter ID जारी करना अथवा मतदाता सूची में नाम जोड़ने या हटाने का अंतिम निर्णय संबंधित निर्वाचन अधिकारी या सक्षम सरकारी प्राधिकारी द्वारा लिया जाएगा। पोर्टल किसी आवेदन की स्वीकृति या निश्चित समय में सेवा पूरी होने की गारंटी नहीं देता।",
  "मैं सहमत हूँ कि मेरे द्वारा उपलब्ध कराई गई जानकारी और दस्तावेजों का उपयोग केवल मेरी चुनी हुई सेवा को पूरा करने, आवेदन की स्थिति बताने और आवश्यक सहायता प्रदान करने के लिए किया जा सकता है।",
  "नीचे दिए गए सहमति बॉक्स को चुनकर और “सहमत हूँ एवं आगे बढ़ें” बटन पर क्लिक करके मैं अपनी इलेक्ट्रॉनिक सहमति प्रदान करता/करती हूँ। मेरी सहमति का रिकॉर्ड सेवा का नाम, दिनांक, समय और संबंधित तकनीकी विवरण के साथ पोर्टल पर सुरक्षित रखा जा सकता है।",
  "I confirm that all information and documents provided by me for this application are true, complete and valid to the best of my knowledge.",
  "I authorise this independent private digital assistance centre to help me with the selected service, including filling out the application, entering details, scanning or uploading documents, submitting the application and checking its status.",
  "I understand that this portal is not an authorised office or representative of the Election Commission of India or any government department. It provides only online application and documentation assistance.",
  "The final decision regarding verification, approval, rejection, correction, issuance of a Voter ID, or inclusion or deletion of a name in the electoral roll will be taken by the concerned election officer or competent government authority. The portal does not guarantee approval of any application or completion within a specific period.",
  "I consent to the use of the information and documents provided by me only for completing the selected service, providing application-status updates and delivering necessary assistance.",
  "By selecting the consent checkbox and clicking “I Agree and Continue”, I provide my electronic consent. A record of my consent may be securely stored on the portal along with the service name, date, time and relevant technical details."
].join("\n");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function requestIp(req) {
  return cleanText(req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "", 100);
}

function recordVoterConsent(payload = {}, req) {
  const customerName = cleanText(payload.customerName, 120);
  const customerPhone = cleanText(payload.customerPhone, 20).replace(/[^0-9+]/g, "");
  const serviceOption = cleanText(payload.serviceOption, 100);
  const destinationUrl = cleanText(payload.destinationUrl, 500);
  const sourcePage = cleanText(payload.sourcePage, 250);

  if (customerName.length < 2) throw new Error("Customer name is required.");
  if (!/^(?:\+91)?[6-9]\d{9}$/.test(customerPhone)) throw new Error("Valid Indian mobile number is required.");
  if (!serviceOption) throw new Error("Selected Voter ID service is required.");
  if (payload.accepted !== true || payload.declarationVersion !== DECLARATION_VERSION) {
    throw new Error("Explicit consent to the current declaration is required.");
  }

  let parsedDestination;
  try {
    parsedDestination = new URL(destinationUrl, "http://localhost");
  } catch {
    throw new Error("Invalid service destination.");
  }
  if (parsedDestination.pathname.split("/").pop() !== "checkout.html" || parsedDestination.searchParams.get("service") !== "voter-id") {
    throw new Error("Invalid service destination.");
  }

  const consentId = `CNS-VOT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const acceptedAt = new Date().toISOString();
  const userAgent = cleanText(req.headers["user-agent"], 1000);
  const technicalDetails = {
    language: cleanText(payload.language, 40),
    timezone: cleanText(payload.timezone, 80),
    screen: cleanText(payload.screen, 40)
  };

  db.run(
    `INSERT INTO customer_service_consents (
      consent_id, service_slug, service_name, service_option, customer_name,
      customer_phone, declaration_version, declaration_sha256, accepted,
      accepted_at, destination_url, source_page, ip_hash, user_agent_hash,
      technical_details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    [
      consentId,
      "voter-id",
      "Voter ID",
      serviceOption,
      customerName,
      customerPhone,
      DECLARATION_VERSION,
      sha256(DECLARATION_TEXT),
      acceptedAt,
      destinationUrl,
      sourcePage,
      sha256(requestIp(req)),
      sha256(userAgent),
      JSON.stringify(technicalDetails)
    ]
  );

  return {
    consentId,
    serviceName: "Voter ID",
    serviceOption,
    declarationVersion: DECLARATION_VERSION,
    acceptedAt
  };
}

module.exports = {
  DECLARATION_VERSION,
  recordVoterConsent
};
