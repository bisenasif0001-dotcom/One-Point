"""
app.py - Main Flask Application Backend for PAN AI Agent
Features:
1. Multi-Document upload & Gemini Multimodal cross-reference OCR (/api/read-documents)
2. UI-based Gemini API Key Configuration (/api/save-key)
3. Autonomous Form 49A Auto-Fill execution (/api/fill-portal)
4. Live execution status stream (/api/status)
"""

import os
import sys
import time
import threading
import webbrowser
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, send_from_directory
from agent.doc_reader import DocumentReader
from agent.pan_filler import PANFormFiller

app = Flask(__name__, static_folder="static")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")

# Shared state
app_state = {
    "status": "IDLE",  # IDLE, FILLING, AWAITING_CAPTCHA, COMPLETED
    "logs": []
}
state_lock = threading.Lock()


def add_log(msg: str, level: str = "info"):
    with state_lock:
        app_state["logs"].append({
            "time": time.strftime("%H:%M:%S"),
            "level": level,
            "message": msg
        })
        if len(app_state["logs"]) > 60:
            app_state["logs"].pop(0)


reader = DocumentReader()


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


@app.route("/api/save-key", methods=["POST"])
def save_api_key():
    data = request.json or {}
    key = data.get("key", "").strip()
    if not key:
        return jsonify({"success": False, "error": "Empty API key provided"}), 400

    # Write to .env
    try:
        with open(ENV_PATH, "w", encoding="utf-8") as f:
            f.write(f"GEMINI_API_KEY={key}\nPORT=5000\n")
        reader.set_api_key(key)
        add_log("Gemini API Key successfully saved and activated!", "success")
        return jsonify({"success": True, "message": "API key saved and active"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/read-documents", methods=["POST"])
def read_documents():
    uploaded_files = request.files.getlist("documents")
    if not uploaded_files:
        # Check single file fallback
        if "document" in request.files:
            uploaded_files = [request.files["document"]]

    if not uploaded_files or uploaded_files[0].filename == "":
        return jsonify({"success": False, "error": "No document files uploaded"}), 400

    saved_paths = []
    file_names = []
    for f in uploaded_files:
        if f.filename:
            path = os.path.join(UPLOAD_DIR, f.filename)
            f.save(path)
            saved_paths.append(path)
            file_names.append(f.filename)

    add_log(f"Received {len(saved_paths)} document(s): {', '.join(file_names)}. Analyzing with Gemini Vision...", "action")

    # Call multi-document reader
    result = reader.extract_details_from_multiple_documents(saved_paths)

    if "error" in result:
        add_log(f"OCR Notice: {result['error']}", "warning")
        return jsonify({
            "success": False,
            "error": result["error"],
            "needs_key": result.get("needs_key", False)
        }), 400

    name_str = f"{result.get('first_name', '')} {result.get('last_name', '')}".strip()
    add_log(f"Successfully extracted details for: {name_str} (Father: {result.get('father_name', 'N/A')})", "success")
    return jsonify({"success": True, "details": result})


@app.route("/api/fill-portal", methods=["POST"])
def fill_portal():
    data = request.json or {}
    if not data:
        return jsonify({"success": False, "error": "No candidate details provided"}), 400

    with state_lock:
        if app_state["status"] == "FILLING":
            return jsonify({"success": False, "error": "Another filling task is already active"}), 409
        app_state["status"] = "FILLING"

    def run_filler():
        def status_cb(msg, lvl):
            add_log(msg, lvl)
            with state_lock:
                if "Awaiting Captcha" in msg:
                    app_state["status"] = "AWAITING_CAPTCHA"
                elif "completed" in msg.lower():
                    app_state["status"] = "COMPLETED"

        filler = PANFormFiller(status_callback=status_cb)
        try:
            filler.fill_form_49a(data)
        except Exception as e:
            add_log(f"Filler error: {e}", "warning")
        finally:
            with state_lock:
                app_state["status"] = "IDLE"

    threading.Thread(target=run_filler, daemon=True).start()
    return jsonify({"success": True, "message": "Autonomous filling started"})


@app.route("/api/status")
def get_status():
    with state_lock:
        return jsonify({
            "status": app_state["status"],
            "logs": app_state["logs"],
            "is_gemini_active": reader.is_active
        })


@app.route("/api/sample-candidate")
def get_sample_candidate():
    return jsonify({
        "title": "Shri",
        "first_name": "Mohd",
        "last_name": "Irshad",
        "father_name": "Abdul Salam",
        "dob": "10/05/1996",
        "gender": "Male",
        "mobile": "9876543210",
        "email": "irshad.digital@gmail.com"
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"[PAN AI Agent] Starting Web Interface on http://localhost:{port}")
    threading.Timer(1.2, lambda: webbrowser.open(f"http://localhost:{port}")).start()
    app.run(host="127.0.0.1", port=port, debug=False)
