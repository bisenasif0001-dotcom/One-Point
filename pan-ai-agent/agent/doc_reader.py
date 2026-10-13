"""
doc_reader.py - Gemini Multimodal Vision Multi-Document Reader
Reads single or MULTIPLE customer documents (Passport, Aadhaar Front+Back, PAN, etc.)
and extracts combined, accurate applicant details for PAN Form 49A.
"""

import os
import json
import base64
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()


class DocumentReader:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
        self.client = None
        self.use_new_sdk = False
        self._init_gemini()

    def set_api_key(self, key: str):
        self.api_key = key.strip()
        self._init_gemini()

    def _init_gemini(self):
        if not self.api_key or self.api_key in ("your_gemini_api_key_here", "MY_GEMINI_API_KEY"):
            self.client = None
            return

        # Try modern google.genai SDK
        try:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
            self.use_new_sdk = True
            return
        except Exception:
            pass

        # Fallback to google.generativeai
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=self.api_key)
            self.legacy_model = legacy_genai.GenerativeModel("gemini-2.5-flash")
            self.use_new_sdk = False
            self.client = True
        except Exception:
            pass

    @property
    def is_active(self) -> bool:
        return bool(self.client and self.api_key and self.api_key != "your_gemini_api_key_here")

    def extract_details_from_multiple_documents(self, image_paths: List[str]) -> Dict[str, Any]:
        """
        Takes MULTIPLE document images (e.g. Passport front, Aadhaar back, PAN card)
        and passes them all to Gemini Multimodal Vision in a single unified prompt.
        """
        valid_paths = [p for p in image_paths if os.path.exists(p)]
        if not valid_paths:
            return {"error": "No valid document files found"}

        if not self.is_active:
            return {
                "error": "GEMINI_API_KEY is not configured. Please enter your API Key at the top of the dashboard to enable real OCR!",
                "needs_key": True
            }

        try:
            prompt = """
You are an expert OCR and Identity Verification AI specializing in Indian identity documents (Passport, Aadhaar Card, PAN Card, Driving License, Voter ID).
Carefully inspect ALL the provided document images together:
1. Cross-reference details across all documents (e.g. Passport front shows Given Name & Surname; Passport back or Aadhaar back shows Father's Name and Address).
2. Accurately extract the person's identity information.

Return STRICTLY a JSON object matching this schema:
{
    "title": "Shri" (for male) or "Smt" (for married female) or "Kumari" (for unmarried female),
    "first_name": "Given Name / First Name",
    "last_name": "Surname / Last Name",
    "father_name": "Father's Full Name (check passport or parent/spouse section)",
    "dob": "DD/MM/YYYY" (e.g. 15/08/1998),
    "gender": "Male" or "Female" or "Transgender",
    "mobile": "10-digit mobile number if found, otherwise empty",
    "email": "email if found, otherwise empty",
    "id_number": "Passport / PAN / Aadhaar number found",
    "address": "Complete residential address if found"
}

IMPORTANT:
- If Given Name has multiple words (e.g., 'MOHD IRSHAD'), make 'MOHD' as first_name and 'IRSHAD' as last_name, or assign properly based on Indian passport format.
- Respond ONLY in valid JSON. No markdown code blocks, no other text.
"""
            # Build multimodal contents list
            if self.use_new_sdk:
                from google.genai import types
                parts = [prompt]
                for path in valid_paths:
                    with open(path, "rb") as f:
                        data = f.read()
                    ext = os.path.splitext(path)[-1].lower()
                    mime = "image/png" if ext == ".png" else "image/jpeg"
                    parts.append(types.Part.from_bytes(data=data, mime_type=mime))

                # Try available modern models: gemini-3.6-flash, gemini-3.8-flash, gemini-flash-latest
                models_to_try = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-flash-latest"]
                last_err = None
                text = None
                for m in models_to_try:
                    try:
                        response = self.client.models.generate_content(
                            model=m,
                            contents=parts
                        )
                        text = response.text
                        break
                    except Exception as err:
                        last_err = err
                        continue
                if text is None:
                    raise last_err or Exception("All Gemini models failed")
            else:
                contents = [prompt]
                for path in valid_paths:
                    with open(path, "rb") as f:
                        data = f.read()
                    ext = os.path.splitext(path)[-1].lower()
                    mime = "image/png" if ext == ".png" else "image/jpeg"
                    contents.append({"mime_type": mime, "data": data})

                response = self.legacy_model.generate_content(contents)
                text = response.text

            text = text.strip()
            # Clean markdown codeblocks
            if "```json" in text:
                text = text.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in text:
                text = text.split("```", 1)[1].split("```", 1)[0].strip()

            import re
            json_match = re.search(r"\{[\s\S]*\}", text)
            if json_match:
                return json.loads(json_match.group(0))

            return json.loads(text)

        except Exception as e:
            print(f"⚠️ [Gemini Vision Error] {e}")
            return {"error": f"Gemini Vision Error: {str(e)}"}
