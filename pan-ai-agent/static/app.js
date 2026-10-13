// app.js - Frontend Logic with Multi-Document Support & API Key Settings

let selectedFiles = [];
let logLength = 0;

// Setup Drag & Drop
const dropzone = document.getElementById("dropzone");

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "#06b6d4";
});

dropzone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "#2e3d5b";
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "#2e3d5b";
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFileSelect(e.dataTransfer.files);
  }
});

function handleFileSelect(files) {
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    selectedFiles.push(files[i]);
  }

  renderGallery();
}

function renderGallery() {
  const gallery = document.getElementById("docs-gallery");
  const counter = document.getElementById("doc-counter");
  const btnRead = document.getElementById("btn-read-ai");

  gallery.innerHTML = "";
  counter.innerText = `${selectedFiles.length} file(s) selected`;

  if (selectedFiles.length > 0) {
    gallery.classList.remove("hidden");
    btnRead.classList.remove("hidden");
  } else {
    gallery.classList.add("hidden");
    btnRead.classList.add("hidden");
    return;
  }

  selectedFiles.forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "doc-thumb-card";

    const img = document.createElement("img");
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.readAsDataURL(file);
    } else {
      img.src = "https://via.placeholder.com/100x70?text=PDF";
    }

    const name = document.createElement("div");
    name.className = "doc-name";
    name.innerText = file.name;

    card.appendChild(img);
    card.appendChild(name);
    gallery.appendChild(card);
  });

  addLog(`Added ${selectedFiles.length} document(s) to queue. Click 'Extract Details' to process with Gemini AI.`, "info");
}

async function saveApiKey() {
  const input = document.getElementById("api-key-input");
  const key = input.value.trim();
  if (!key) {
    alert("Please enter a valid Gemini API Key.");
    return;
  }

  try {
    const res = await fetch("/api/save-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    if (data.success) {
      alert("Gemini API Key successfully saved!");
      input.value = "";
      syncStatus();
    } else {
      alert("Error: " + data.error);
    }
  } catch (err) {
    alert("Network error: " + err);
  }
}

async function submitDocumentsForOCR() {
  if (selectedFiles.length === 0) {
    alert("Please upload at least one document first.");
    return;
  }

  const btn = document.getElementById("btn-read-ai");
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reading ${selectedFiles.length} Document(s) with Gemini Vision...`;

  const formData = new FormData();
  selectedFiles.forEach(file => {
    formData.append("documents", file);
  });

  addLog(`Sending ${selectedFiles.length} document(s) to Gemini Vision AI for cross-reference OCR...`, "action");

  try {
    const res = await fetch("/api/read-documents", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (data.success && data.details) {
      populateForm(data.details);
      addLog("Successfully extracted details from all documents!", "success");
    } else {
      if (data.needs_key) {
        alert("⚠️ Gemini API Key is required for live OCR!\nPlease enter your Gemini API Key in the top box and click 'Save Key'.");
        document.getElementById("api-key-input").focus();
      } else {
        alert("OCR Error: " + (data.error || "Could not read document."));
      }
      addLog("OCR Warning: " + (data.error || "Failed to parse document."), "warning");
    }
  } catch (err) {
    alert("Error uploading documents: " + err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-brain"></i> Extract Details from All Documents with Gemini Vision`;
  }
}

function populateForm(details) {
  if (details.title) document.getElementById("f-title").value = details.title;
  if (details.first_name) document.getElementById("f-first").value = details.first_name;
  if (details.last_name) document.getElementById("f-last").value = details.last_name;
  if (details.father_name) document.getElementById("f-father").value = details.father_name;
  if (details.dob) document.getElementById("f-dob").value = details.dob;
  if (details.gender) document.getElementById("f-gender").value = details.gender;
  if (details.mobile) document.getElementById("f-mobile").value = details.mobile;
  if (details.email) document.getElementById("f-email").value = details.email;
}

async function loadSampleData() {
  try {
    const res = await fetch("/api/sample-candidate");
    const data = await res.json();
    populateForm(data);
    addLog("Loaded Mohd Irshad candidate demo details for instant testing.", "info");
  } catch (err) {
    console.error(err);
  }
}

async function startFormFilling() {
  const payload = {
    title: document.getElementById("f-title").value,
    first_name: document.getElementById("f-first").value,
    last_name: document.getElementById("f-last").value,
    father_name: document.getElementById("f-father").value,
    dob: document.getElementById("f-dob").value,
    gender: document.getElementById("f-gender").value,
    mobile: document.getElementById("f-mobile").value,
    email: document.getElementById("f-email").value
  };

  const btn = document.getElementById("btn-submit");
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Launching Browser & Filling Form...`;

  try {
    const res = await fetch("/api/fill-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) {
      alert("Error: " + data.error);
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-play"></i> STEP 3: Open NSDL Portal & Auto-Fill Form 49A`;
    }
  } catch (err) {
    alert("Connection error: " + err);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-play"></i> STEP 3: Open NSDL Portal & Auto-Fill Form 49A`;
  }
}

function addLog(msg, level = "info") {
  const container = document.getElementById("terminal-logs");
  const div = document.createElement("div");
  div.className = `log-item ${level}`;
  const now = new Date().toTimeString().split(' ')[0];
  div.innerHTML = `<span class="time">[${now}]</span> ${escapeHtml(msg)}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function syncStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return;
    const data = await res.json();

    // Update Gemini status badge
    const gemDot = document.getElementById("gemini-dot");
    const gemText = document.getElementById("gemini-status-text");
    if (data.is_gemini_active) {
      gemDot.className = "dot green";
      gemText.innerText = "Gemini Vision: Active";
    } else {
      gemDot.className = "dot red";
      gemText.innerText = "Gemini: Key Needed";
    }

    // Update Agent status
    const agentDot = document.getElementById("agent-dot");
    const agentStatus = document.getElementById("agent-status");
    const stepBadge = document.getElementById("step-badge");

    if (data.status === "FILLING") {
      stepBadge.innerText = "Active";
    } else if (data.status === "AWAITING_CAPTCHA") {
      stepBadge.innerText = "Awaiting Captcha";
    } else {
      stepBadge.innerText = "Standby";
      const btn = document.getElementById("btn-submit");
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-play"></i> STEP 3: Open NSDL Portal & Auto-Fill Form 49A`;
    }

    // Update logs
    if (data.logs && data.logs.length !== logLength) {
      logLength = data.logs.length;
      const container = document.getElementById("terminal-logs");
      container.innerHTML = "";
      data.logs.forEach(l => {
        const div = document.createElement("div");
        div.className = `log-item ${l.level || 'info'}`;
        div.innerHTML = `<span class="time">[${l.time}]</span> ${escapeHtml(l.message)}`;
        container.appendChild(div);
      });
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.warn(err);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

setInterval(syncStatus, 1000);
window.onload = () => {
  syncStatus();
  loadSampleData();
};
