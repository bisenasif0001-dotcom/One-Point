# 💳 PAN Card AI Agent (Gemini Vision + Form 49A Filler)

Ek **Dedicated, Lightweight aur Intelligent Standalone Web Application** jo customer ke Aadhaar / ID card ko **Gemini Vision AI** se padhta hai aur **NSDL Portal par Form 49A** ko automatically fill karta hai.

---

## 🌟 Khas Khasiyatein:

1. **Gemini Multimodal OCR**:
   - Customer ka Aadhaar card ya koi bhi ID photo upload karein.
   - AI document ko "dekh" kar automatically Name, Father Name, DOB, Gender, Mobile extract kar lega.
2. **Interactive Data Verification**:
   - Extracted data screen par editable fields me dikhta hai taaki aap 2 second me check kar sakein.
3. **One-Click Autonomous Browser Form Filling**:
   - "Open NSDL Portal & Auto-Fill" button dabate hi real Chrome browser open hoga.
   - NSDL portal (`onlineservices.nsdl.com`) par jakar:
     - Form 49A select karega.
     - Category: Individual select karega.
     - Candidate ka Title, Name, DOB, Mobile, Email auto-type karega.
     - Consent checkbox tick karega.
4. **Captcha Handover (100% Safe)**:
   - Captcha code par aakar execution ruk jayegi taaki aap captcha type karke token number generate kar sakein.

---

## 🚀 Kaise Start Karein?

Sirf is file par double-click karein:
👉 **`Run-App.bat`**

Yeh automatically app start karke aapke browser me **`http://localhost:5000`** open kar dega!

---

## ⚙️ Gemini API Key Setup (Optional)
Agar aapko real document photo se live AI reading chahiye:
1. `.env.example` ko copy karke `.env` rename karein.
2. Apna Google Gemini API Key add karein:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
*(Note: Agar API key abhi nahi hai, tab bhi app "Load Sample Candidate" button se pura browser form filling live test karega!)*
