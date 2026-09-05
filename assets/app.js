// Global fetch interceptor to strip AI agent thoughts/traces and paths from API responses
(function() {
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  function sanitizeData(val) {
    if (val === null || val === undefined) {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeData);
    }
    if (typeof val === "object") {
      const cleaned = {};
      for (const [key, value] of Object.entries(val)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === "thought" ||
          lowerKey === "reasoning" ||
          lowerKey === "plan" ||
          lowerKey === "tool_call" ||
          lowerKey === "debug" ||
          lowerKey === "trace"
        ) {
          continue;
        }
        if (lowerKey === "action") {
          if (typeof value === "string") {
            if (/^[a-zA-Z0-9_\-]+$/.test(value)) {
              cleaned[key] = value;
            }
            continue;
          }
          continue;
        }
        cleaned[key] = sanitizeData(value);
      }
      return cleaned;
    }
    if (typeof val === "string") {
      let s = val;
      s = s.replace(/d:[\\/]csc banner_folder[\\/]130626/gi, "[PROJECT_ROOT]");
      s = s.replace(/c:[\\/]users[\\/]advar/gi, "[USER_HOME]");
      s = s.replace(/let's\s+(do|call|run|check)/gi, "[REDACTED]");
      s = s.replace(/view_file/gi, "[REDACTED]");
      s = s.replace(/inspect\s+code/gi, "[REDACTED]");
      s = s.replace(/targetfile/gi, "[REDACTED]");
      return s;
    }
    return val;
  }

  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const cloned = response.clone();
        try {
          const json = await cloned.json();
          const sanitized = sanitizeData(json);
          const blob = new Blob([JSON.stringify(sanitized)], { type: "application/json" });
          return new Response(blob, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch {
          return response;
        }
      }
      return response;
    } catch (err) {
      if (err && err.message) {
        err.message = sanitizeData(err.message);
      }
      throw err;
    }
  };
})();

// Public-facing pages share the homepage visual architecture. Operational,
// authentication and payment screens keep their purpose-built layouts.
(function markPublicSitePage() {
  const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const excludedPages = /^(?:index|admin|admin-change-password|ai-command-center|checkout|dashboard|forgot-password|login|otp-login|payment-failed|payment-pending|payment-success|signup)\.html$/;

  if (!excludedPages.test(page) && document.querySelector("[data-site-nav]")) {
    document.body.classList.add("public-site-page");
  }
})();

(function removeLegacyTrustStrips() {
  document.querySelectorAll(".trust-strip-outer").forEach((strip) => strip.remove());
})();

function renderPublicHeroDashboard(hero) {
  const consolePanel = hero?.querySelector(".page-hero-console");
  if (!consolePanel || consolePanel.dataset.homeDashboard === "true") return;

  // Generic hub pages (services index, about, 404) have a marketing headline as
  // their <h1>, not a service name — using it produces broken ticket text like
  // "Find every service without confusion. verification pipeline execution".
  // Fall back to a representative default there so the console stays uniform.
  const rawTitle = hero.querySelector(".page-hero-title, h1")?.textContent?.replace(/\s+/g, " ").trim() || "";
  const isGenericHub = hero.matches(".services-hero, .about-hero, .not-found-hero") || rawTitle.split(" ").length > 4;
  const serviceName = defaultApplyServiceForPage()
    || (isGenericHub ? "NSDL Identity" : rawTitle)
    || "NSDL Identity";
  const profile = serviceHeroProfile(serviceName);
  const progress = profile.progress || "68%";

  consolePanel.dataset.homeDashboard = "true";
  consolePanel.classList.add("public-home-dashboard", "hero-os-console", "hos-stats");
  consolePanel.setAttribute("aria-label", "One Point Service OS live operations preview");
  consolePanel.innerHTML = `
    <div class="hero-os-window">
      <div class="hero-os-topbar">
        <span class="hero-os-brand"><i data-lucide="terminal"></i> One Point OS Live Dashboard</span>
        <span class="hero-os-state"><span aria-hidden="true"></span> SYSTEM SECURE &middot; SLA 99.99%</span>
      </div>

      <div class="hero-os-grid">
        <section class="hero-os-workbench" aria-label="Application workflow status">
          <div class="hero-os-ticket">
            <span class="hero-os-eyebrow">ACTIVE WORKFLOW &middot; ID: OPDS-417409-${profile.code}</span>
            <strong>${profile.service} verification pipeline execution</strong>
            <div class="hero-os-progress" aria-hidden="true"><span style="width:${progress}"></span></div>
            <div class="hero-os-ticket-meta">
              <span>Step 3 of 4: Operator Audit</span>
              <span>Confidence Score: 98.6%</span>
            </div>
          </div>

          <div class="hero-os-analytics live-performance-card" data-live-performance>
            <div class="hero-os-analytics-head">
              <span class="hero-os-analytics-title"><i aria-hidden="true"></i> Live Performance Analytics</span>
              <span class="hero-os-trend" aria-label="Throughput up 18.4 percent"><strong data-live-trend>+18.4%</strong></span>
            </div>
            <div class="hero-os-chart-frame">
              <canvas class="os-stripe-burst-canvas" style="display: block; width: 100%; height: 100%;"></canvas>
              <div class="os-stripe-horizon-glow" aria-hidden="true"></div>
              <div class="os-chart-tooltip" data-chart-tooltip aria-hidden="true">
                <span class="tooltip-time">12:33 PM</span>
                <span class="tooltip-sep">&bull;</span>
                <strong class="tooltip-rate">26 req/min</strong>
                <span class="tooltip-status">Optimal</span>
              </div>
              <span class="os-chart-hover-dot" data-chart-hover-dot aria-hidden="true"></span>
            </div>
            <div class="hero-os-analytics-meta">
              <span class="meta-rate-group">
                <span class="apple-live-beacon" aria-hidden="true"></span>
                <span><b data-live-rate>26</b> req/min</span>
              </span>
              <span class="meta-badge-glass">Peak Throughput</span>
              <strong class="meta-live-pill"><i aria-hidden="true"></i> Live</strong>
            </div>
          </div>
        </section>

        <aside class="hero-os-telemetry" aria-label="Platform telemetry">
          <div class="hero-os-metric-stack">
            <div class="hero-os-metric">
              <span>ACTIVE QUEUE</span>
              <strong class="metric-number">${profile.queueCount || "24"}</strong>
              <small class="metric-positive">${profile.queueSub || "12 files awaiting audit"}</small>
            </div>
            <div class="hero-os-metric">
              <span>SYSTEM LATENCY</span>
              <strong class="metric-number">18ms</strong>
              <small>Avg API response</small>
            </div>
          </div>
          <div class="hero-os-mini-metrics">
            <div><span>CPU Load</span><strong>4.2%</strong></div>
            <div><span>Memory</span><strong>1.8 GB</strong></div>
          </div>
        </aside>
      </div>
    </div>
  `;

  initializeLivePerformanceAnalytics(consolePanel);
}

function initializeLivePerformanceAnalytics(root = document) {
  root.querySelectorAll("[data-live-performance]").forEach((panel) => {
    if (panel.dataset.livePerformanceReady === "true") return;
    panel.dataset.livePerformanceReady = "true";

    const rate = panel.querySelector("[data-live-rate]");
    const trend = panel.querySelector("[data-live-trend]");
    const chartFrame = panel.querySelector(".hero-os-chart-frame");
    const tooltip = panel.querySelector("[data-chart-tooltip]");
    const crosshair = panel.querySelector("[data-chart-crosshair]");
    const tickerText = panel.querySelector("[data-ticker-text]");

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!rate || !trend) return;

    let rateValue = Number.parseInt(rate.textContent, 10) || 24;
    let trendValue = Number.parseFloat(trend.textContent) || 18.4;

    const hoverDot = panel.querySelector("[data-chart-hover-dot]");
    const canvas = panel.querySelector(".os-stripe-burst-canvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    let canvasWidth = 0;
    let canvasHeight = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const liveEvents = [
      "Just now: PAN Card Application verified (Balaghat Center)",
      "2s ago: PM-JAY Ayushman Card Approved (SLA 99.99%)",
      "Just now: Domicile Certificate Audit Step 3 Passed",
      "3s ago: GST MSME Registration Filed (Express Queue)",
      "1s ago: Instant AEPS Cash Withdrawal Complete",
      "Just now: Passport Application Appointment Confirmed"
    ];
    let eventIdx = 0;

    // Smooth count-up/down morph for telemetry numbers
    function morphNumber(el, from, to, duration, formatFn) {
      if (!el) return;
      const start = (typeof performance !== "undefined" ? performance.now() : Date.now());
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = formatFn(from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const updateTelemetry = () => {
      const prevRate = rateValue;
      const prevTrend = trendValue;
      rateValue = Math.max(19, Math.min(32, rateValue + Math.floor(Math.random() * 5) - 2));
      trendValue = Math.max(12.4, Math.min(24.8, trendValue + (Math.random() - .5) * 1.8));

      morphNumber(rate, prevRate, rateValue, 450, (v) => String(Math.round(v)).padStart(2, '\u00A0'));
      morphNumber(trend, prevTrend, trendValue, 450, (v) => `+${v.toFixed(1)}%`);

      panel.setAttribute("aria-label", `Live performance: ${rateValue} requests per minute, throughput up ${trendValue.toFixed(1)} percent`);
    };

    const updateTicker = () => {
      if (!tickerText) return;
      eventIdx = (eventIdx + 1) % liveEvents.length;
      tickerText.style.opacity = "0";
      tickerText.style.transform = "translateY(3px)";
      setTimeout(() => {
        tickerText.textContent = liveEvents[eventIdx];
        tickerText.style.opacity = "1";
        tickerText.style.transform = "translateY(0)";
      }, 200);
    };

    if (!reducedMotion) {
      window.setInterval(updateTelemetry, 2400);
      window.setInterval(updateTicker, 4200);
    }

    // Authentic Stripe Dataviz Dome Engine (Exact Match to Screenshot-2)
    if (canvas && ctx && chartFrame) {
      const mouse = {
        x: -9999,
        y: -9999,
        active: false,
        targetTiltX: 0,
        targetTiltY: 0,
        tiltX: 0,
        tiltY: 0
      };

      chartFrame.addEventListener("mousemove", (e) => {
        const rect = chartFrame.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;

        // 3D dome parallax tilt (-1 to +1)
        mouse.targetTiltX = ((mouse.x / rect.width) - 0.5) * 2;
        mouse.targetTiltY = ((mouse.y / rect.height) - 0.5) * 2;

        if (tooltip) {
          const clampedX = Math.max(45, Math.min(rect.width - 45, mouse.x));
          tooltip.style.left = `${clampedX}px`;
          const tooltipTime = tooltip.querySelector(".tooltip-time");
          const tooltipRate = tooltip.querySelector(".tooltip-rate");
          const tooltipStatus = tooltip.querySelector(".tooltip-status");

          const now = new Date();
          if (tooltipTime) {
            tooltipTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          }
          if (tooltipRate) {
            const dynamicRate = Math.round(24 + Math.sin(mouse.x * 0.05) * 5);
            tooltipRate.textContent = `${dynamicRate} req/min`;
          }
          if (tooltipStatus) {
            tooltipStatus.textContent = "Optimal";
          }
        }
      });

      chartFrame.addEventListener("mouseleave", () => {
        mouse.active = false;
        mouse.targetTiltX = 0;
        mouse.targetTiltY = 0;
      });

      function resizeCanvas() {
        const rect = chartFrame.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        canvas.width = Math.round(canvasWidth * dpr);
        canvas.height = Math.round(canvasHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Exact Architecture of Screenshot-2 (Tuned for Compact Card Space):
      // 210 hairline rays (reduced 25% for clean breathing room)
      // Concentric 3D dome silhouette with layered shell radii
      const RAY_COUNT = 210;
      const rays = [];
      const packets = [];

      function initRays() {
        rays.length = 0;
        const maxAngle = (86 * Math.PI) / 180; // +/- 86 deg wide fan (almost flat at edges)

        for (let i = 0; i < RAY_COUNT; i++) {
          const t = i / (RAY_COUNT - 1);
          const normAngle = (t - 0.5) * 2; // -1 to 1
          const baseAngle = normAngle * maxAngle;

          // Parabolic dome envelope matching Screenshot-2
          const centerDist = Math.abs(normAngle);
          const domeFactor = 1 - Math.pow(centerDist, 2.4) * 0.40;

          // Multi-tier depth distribution as in Screenshot-2
          const layerRand = Math.random();
          let lengthRatio;
          if (layerRand < 0.28) {
            lengthRatio = 0.38 + Math.random() * 0.20; // Inner cluster
          } else if (layerRand < 0.68) {
            lengthRatio = 0.58 + Math.random() * 0.22; // Mid depth
          } else {
            lengthRatio = 0.80 + Math.random() * 0.18; // Outer perimeter
          }

          // Sporadic outlier needles that shoot slightly beyond dome
          if (Math.random() < 0.06) {
            lengthRatio = 0.98 + Math.random() * 0.08;
          }

          const baseLength = canvasHeight * 0.92 * domeFactor * lengthRatio;
          const depthZ = 0.3 + Math.random() * 0.7; // 3D depth for tilt

          // Brand Logo Color Harmony: One Point Blue (#125696) & One Point Gold (#d2a12a)
          const colorRand = Math.random();
          let strokeColor;
          let dotColor;
          let packetColor;
          let packetDot;
          let hoverColor;
          const isGold = colorRand < 0.44; // ~44% gold strands, ~56% blue strands

          if (isGold) {
            // BRAND GOLD SPECTRUM
            if (colorRand < 0.16) {
              // Radiant Luminous Gold
              strokeColor = "rgba(245, 200, 85, 0.88)";
              dotColor = "#f5c855";
              packetColor = "rgba(245, 200, 85, 0.95)";
              packetDot = "#ffe28a";
              hoverColor = "#ffe072";
            } else if (colorRand < 0.32) {
              // Official Brand Logo Gold (#d2a12a)
              strokeColor = "rgba(210, 161, 42, 0.88)";
              dotColor = "#d2a12a";
              packetColor = "rgba(210, 161, 42, 0.95)";
              packetDot = "#f5c855";
              hoverColor = "#ffd255";
            } else {
              // Warm Deep Amber Gold (#c58a10)
              strokeColor = "rgba(197, 138, 16, 0.82)";
              dotColor = "#c58a10";
              packetColor = "rgba(225, 170, 40, 0.90)";
              packetDot = "#f8cf67";
              hoverColor = "#f5c855";
            }
          } else {
            // BRAND BLUE SPECTRUM
            if (colorRand < 0.70) {
              // Vibrant Royal Tech Blue
              strokeColor = "rgba(24, 102, 219, 0.85)";
              dotColor = "#1866db";
              packetColor = "rgba(59, 143, 217, 0.95)";
              packetDot = "#60a5fa";
              hoverColor = "#3b82f6";
            } else if (colorRand < 0.88) {
              // Official Brand Logo Blue (#125696)
              strokeColor = "rgba(18, 86, 150, 0.82)";
              dotColor = "#125696";
              packetColor = "rgba(37, 99, 235, 0.90)";
              packetDot = "#93c5fd";
              hoverColor = "#1d4ed8";
            } else {
              // Deep Midnight Navy Blue (#0d3d78)
              strokeColor = "rgba(13, 61, 120, 0.75)";
              dotColor = "#0d3d78";
              packetColor = "rgba(18, 86, 150, 0.85)";
              packetDot = "#60a5fa";
              hoverColor = "#1e40af";
            }
          }

          const ray = {
            baseAngle,
            currentAngle: baseAngle,
            length: baseLength,
            currentLength: baseLength,
            depthZ,
            swaySpeed: 0.35 + Math.random() * 0.45,
            swayPhase: Math.random() * Math.PI * 2,
            swayAmp: 0.005 + Math.random() * 0.008, // Subtle, refined sway
            strokeColor,
            dotColor,
            packetColor,
            packetDot,
            hoverColor,
            tipRadius: 1.1 + Math.random() * 0.8, // Tiny pinpoint bead (1.1px to 1.9px)
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.8 + Math.random() * 1.2,
            beads: [],
            tipX: 0,
            tipY: 0
          };

          // Distribute 1 to 2 tiny intermediate beads along the strand (cleaner spacing for small card)
          if (Math.random() < 0.30 && baseLength > 35) {
            // 20% chance of complementary accent jewel bead
            const beadColor = Math.random() < 0.20 ? (isGold ? "#125696" : "#d2a12a") : dotColor;
            ray.beads.push({
              ratio: 0.35 + Math.random() * 0.28,
              radius: 0.9 + Math.random() * 0.4,
              color: beadColor
            });
            if (Math.random() < 0.25) {
              ray.beads.push({
                ratio: 0.68 + Math.random() * 0.20,
                radius: 0.85 + Math.random() * 0.35,
                color: beadColor
              });
            }
          }

          rays.push(ray);
        }
      }

      function spawnPacket() {
        if (rays.length === 0) return;
        const rayIdx = Math.floor(Math.random() * rays.length);
        packets.push({
          rayIdx,
          progress: 0,
          // Upward speed reduced by 50% for smooth, elegant flow
          speed: 0.005 + Math.random() * 0.007,
          trail: 0.06 + Math.random() * 0.04
        });
      }

      resizeCanvas();
      initRays();

      if (typeof ResizeObserver === "function") {
        new ResizeObserver(() => {
          resizeCanvas();
          initRays();
        }).observe(chartFrame);
      } else {
        window.addEventListener("resize", () => {
          resizeCanvas();
          initRays();
        });
      }

      let packetTimer = 0;
      const startTime = performance.now();

      function renderStarburst(now) {
        if (!reducedMotion) {
          requestAnimationFrame(renderStarburst);
        }

        const elapsed = (now - startTime) / 1000;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Ground origin slightly submerged at bottom center
        const originX = canvasWidth / 2;
        const originY = canvasHeight + 12;

        // Smooth 3D tilt interpolation (Stripe holographic parallax)
        mouse.tiltX += (mouse.targetTiltX - mouse.tiltX) * 0.05;
        mouse.tiltY += (mouse.targetTiltY - mouse.tiltY) * 0.05;

        // Periodically emit micro data packets (paced smoothly)
        packetTimer++;
        if (packetTimer % 5 === 0 && packets.length < 22) {
          spawnPacket();
        }

        // 1. Draw Hairline Strands & Beads (Exact match to Screenshot-2)
        for (let i = 0; i < rays.length; i++) {
          const ray = rays[i];

          // Gentle organic sinusoidal micro-sway
          const sway = Math.sin(elapsed * ray.swaySpeed + ray.swayPhase) * ray.swayAmp;

          // 3D Parallax tilt
          const tiltOffset = mouse.tiltX * 0.07 * ray.depthZ;
          let angle = ray.baseAngle + sway + tiltOffset;

          // Vertical tilt compression/extension
          const lengthMult = 1 - mouse.tiltY * 0.08 * (1 - ray.depthZ);
          const currentLength = ray.length * lengthMult;

          const baseTipX = originX + Math.sin(angle) * currentLength;
          const baseTipY = originY - Math.cos(angle) * currentLength;

          // Magnetic attraction to cursor
          let tipX = baseTipX;
          let tipY = baseTipY;
          let hoverDist = 9999;

          if (mouse.active) {
            const dx = mouse.x - baseTipX;
            const dy = mouse.y - baseTipY;
            hoverDist = Math.sqrt(dx * dx + dy * dy);
            if (hoverDist < 120) {
              const force = (1 - hoverDist / 120);
              const pullFactor = force * force * 0.045;
              const mouseAngle = Math.atan2(mouse.x - originX, originY - mouse.y);
              angle += (mouseAngle - angle) * pullFactor;
              tipX = originX + Math.sin(angle) * currentLength;
              tipY = originY - Math.cos(angle) * currentLength;
            }
          }

          ray.currentAngle = angle;
          ray.currentLength = currentLength;
          ray.tipX = tipX;
          ray.tipY = tipY;

          // Draw razor-sharp hairline ray (NO SHADOW BLUR!)
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(tipX, tipY);
          ctx.strokeStyle = hoverDist < 120 ? ray.hoverColor : ray.strokeColor;
          ctx.lineWidth = hoverDist < 120 ? 0.95 : 0.65; // Hairline stroke
          ctx.stroke();

          // Draw intermediate pinpoint beads along ray (Blue & Gold harmony)
          for (let b = 0; b < ray.beads.length; b++) {
            const bead = ray.beads[b];
            const bx = originX + Math.sin(angle) * (currentLength * bead.ratio);
            const by = originY - Math.cos(angle) * (currentLength * bead.ratio);

            ctx.beginPath();
            ctx.arc(bx, by, bead.radius, 0, Math.PI * 2);
            ctx.fillStyle = bead.color || ray.dotColor;
            ctx.fill();
          }

          // Draw crisp pinpoint tip bead (NO GIANT BLUR!)
          const pulse = 0.88 + Math.sin(elapsed * ray.pulseSpeed + ray.pulsePhase) * 0.12;
          const r = (hoverDist < 120 ? ray.tipRadius + 0.5 : ray.tipRadius) * pulse;

          ctx.beginPath();
          ctx.arc(tipX, tipY, r, 0, Math.PI * 2);
          ctx.fillStyle = hoverDist < 120 ? ray.hoverColor : ray.dotColor;
          ctx.fill();
        }

        // 2. Draw Traveling Micro-Packets in Brand Blue & Gold
        for (let p = packets.length - 1; p >= 0; p--) {
          const pkt = packets[p];
          pkt.progress += pkt.speed;

          if (pkt.progress >= 1) {
            packets.splice(p, 1);
            continue;
          }

          const ray = rays[pkt.rayIdx];
          if (!ray) continue;

          const pDist = ray.currentLength * pkt.progress;
          const px = originX + Math.sin(ray.currentAngle) * pDist;
          const py = originY - Math.cos(ray.currentAngle) * pDist;

          const trailDist = Math.max(0, pDist - ray.currentLength * pkt.trail);
          const tx = originX + Math.sin(ray.currentAngle) * trailDist;
          const ty = originY - Math.cos(ray.currentAngle) * trailDist;

          // Tiny stream line matching strand color (Blue or Gold)
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(px, py);
          ctx.strokeStyle = ray.packetColor || "rgba(210, 161, 42, 0.85)";
          ctx.lineWidth = 1.1;
          ctx.stroke();

          // Tiny packet dot (crisp 1.2px)
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = ray.packetDot || "#f5c855";
          ctx.fill();
        }

        // 3. Subtle Horizon Origin Core (Brand Blue & Gold blend)
        const coreGrad = ctx.createRadialGradient(originX, originY, 0, originX, originY, 50);
        coreGrad.addColorStop(0, "rgba(210, 161, 42, 0.50)");   // Warm brand gold center
        coreGrad.addColorStop(0.28, "rgba(245, 200, 85, 0.28)"); // Radiant amber halo
        coreGrad.addColorStop(0.65, "rgba(18, 86, 150, 0.22)");  // Brand royal blue
        coreGrad.addColorStop(1, "rgba(18, 86, 150, 0)");

        ctx.beginPath();
        ctx.arc(originX, originY, 50, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();
      }

      requestAnimationFrame(renderStarburst);
    }
  });
}

initializeLivePerformanceAnalytics(document);

/* ============================================================================
   ONE POINT DIGITAL SERVICES - HERO SECTION: STRIPE-GRADE AMBIENT NETWORK
   Feature: Single Badge Chain Journey Across 5 User-Specified Blank Areas
   1. Thin, light motion line emerges and travels from Spot A to Spot B
   2. Where the line ends (Spot B), the service badge appears
   3. Exactly ONE badge visible at any time (zero screen clutter)
   4. From that exact spot (Spot B), the next motion line launches to Spot C
   5. Then at Spot C, the next service badge appears
   6. Travels strictly between the 5 blank areas specified in user screenshots:
      - Spot 1: Above Top-Left badge (Screenshot 4)
      - Spot 2: Upper-Center gap between badge and console (Screenshot 2)
      - Spot 3: Above Top-Right console card (Screenshot 5)
      - Spot 4: Mid-Center vertical corridor (Screenshot 3)
      - Spot 5: Bottom open horizon strip (Screenshot 1)
   7. 18 diverse OPDS services with Fisher-Yates shuffle (never repeats frequently)
   ============================================================================ */

function initializeHeroIndiaNetworkMap() {
  const host = document.querySelector("[data-hero-india-map]");
  const canvas = document.getElementById("hero-india-map-canvas");
  const badgesLayer = document.getElementById("hero-india-badges-layer");
  const heroSection = document.querySelector(".hero.hero-v3");
  if (!host || !canvas || !badgesLayer || !heroSection) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const heroCopy = heroSection.querySelector(".hero-v3-copy");
  const heroConsole = heroSection.querySelector(".hero-os-console");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let canvasWidth = 0;
  let canvasHeight = 0;

  // 1. Calculate the Exact 5 Blank Spots from User Screenshots
  function getBlankSpots() {
    const heroRect = heroSection.getBoundingClientRect();
    const copyRect = heroCopy ? heroCopy.getBoundingClientRect() : null;
    const consoleRect = heroConsole ? heroConsole.getBoundingClientRect() : null;

    const W = heroRect.width || canvasWidth;
    const H = heroRect.height || canvasHeight;

    // Spot 1: Above Top-Left badge (User Screenshot 4)
    const s1_x = copyRect ? Math.round(copyRect.left - heroRect.left + 160) : Math.round(W * 0.22);
    const s1_y = copyRect ? Math.max(32, Math.round(copyRect.top - heroRect.top - 40)) : Math.round(H * 0.07);

    // Spot 2: Upper-Center gap between badge & console (User Screenshot 2)
    const s2_x = (copyRect && consoleRect)
      ? Math.round((copyRect.right - heroRect.left + consoleRect.left - heroRect.left) / 2)
      : Math.round(W * 0.49);
    const s2_y = copyRect
      ? Math.max(48, Math.round(copyRect.top - heroRect.top + 18))
      : Math.round(H * 0.12);

    // Spot 3: Above Top-Right console card (User Screenshot 5)
    const s3_x = consoleRect
      ? Math.round(consoleRect.left - heroRect.left + consoleRect.width * 0.45)
      : Math.round(W * 0.72);
    const s3_y = consoleRect
      ? Math.max(32, Math.round(consoleRect.top - heroRect.top - 40))
      : Math.round(H * 0.07);

    // Spot 4: Mid-Center corridor between copy & console (User Screenshot 3)
    const s4_x = (copyRect && consoleRect)
      ? Math.round((copyRect.right - heroRect.left + consoleRect.left - heroRect.left) / 2)
      : Math.round(W * 0.49);
    const s4_y = (copyRect && consoleRect)
      ? Math.round((copyRect.top + copyRect.bottom) / 2 - heroRect.top)
      : Math.round(H * 0.50);

    // Spot 5: Bottom open horizon strip (User Screenshot 1)
    const s5_x = Math.round(W * 0.50);
    const s5_y = (copyRect && consoleRect)
      ? Math.min(H - 32, Math.round(Math.max(copyRect.bottom, consoleRect.bottom) - heroRect.top + 38))
      : Math.round(H * 0.91);

    const rawSpots = [
      { id: "spot_top_left",     name: "Top-Left (Above Badge)",   x: s1_x, y: s1_y },
      { id: "spot_upper_center", name: "Upper-Center Gap",         x: s2_x, y: s2_y },
      { id: "spot_top_right",    name: "Top-Right (Above Console)",x: s3_x, y: s3_y },
      { id: "spot_mid_corridor", name: "Mid-Center Corridor",      x: s4_x, y: s4_y },
      { id: "spot_bottom_strip", name: "Bottom Open Strip",        x: s5_x, y: s5_y }
    ];

    // Clamp inside canvas bounds with 110px safe horizontal & 28px vertical margin
    return rawSpots.map((s) => ({
      ...s,
      x: Math.max(115, Math.min(W - 115, s.x)),
      y: Math.max(28, Math.min(H - 28, s.y)),
      impact: 0
    }));
  }

  let blankSpots = [];

  function updateSpots() {
    blankSpots = getBlankSpots();
  }

  // 2. Full-Width Ambient Constellation Background Dots
  let particles = [];

  function generateParticles() {
    particles = [];
    const count = canvasWidth < 768 ? 240 : canvasWidth < 1200 ? 480 : 700;
    const heroRect = heroSection.getBoundingClientRect();
    const copyRect = heroCopy ? heroCopy.getBoundingClientRect() : null;
    const quietBox = copyRect ? {
      left: copyRect.left - heroRect.left - 10,
      right: copyRect.right - heroRect.left + 10,
      top: copyRect.top - heroRect.top - 10,
      bottom: copyRect.bottom - heroRect.top + 10
    } : null;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * canvasHeight;

      const isQuiet = quietBox && (
        x >= quietBox.left &&
        x <= quietBox.right &&
        y >= quietBox.top &&
        y <= quietBox.bottom
      );

      // In quiet zone behind text, suppress 85% of dots for pristine readability
      if (isQuiet && Math.random() > 0.15) {
        continue;
      }

      const depthRand = Math.random();
      const depth = depthRand < 0.40 ? 0.35 : depthRand < 0.80 ? 0.65 : 1.0;

      const tier = Math.random();
      let radius;
      let baseAlpha;
      let isBeacon = false;

      if (isQuiet) {
        radius = 0.65 + Math.random() * 0.15;
        baseAlpha = 0.06 + Math.random() * 0.05;
      } else if (tier < 0.70) {
        radius = 0.75 + Math.random() * 0.25;
        baseAlpha = 0.45 + Math.random() * 0.35;
      } else if (tier < 0.92) {
        radius = 1.05 + Math.random() * 0.30;
        baseAlpha = 0.65 + Math.random() * 0.30;
      } else {
        radius = 1.45 + Math.random() * 0.35;
        baseAlpha = 0.85 + Math.random() * 0.15;
        isBeacon = true;
      }

      const isGold = Math.random() < 0.35;
      const color = isGold
        ? (Math.random() < 0.5 ? "rgba(210, 161, 42, " : "rgba(245, 200, 85, ")
        : (Math.random() < 0.6 ? "rgba(18, 86, 150, " : "rgba(24, 102, 219, ");

      particles.push({
        baseX: x,
        baseY: y,
        depth,
        radius,
        baseAlpha,
        color,
        isGold,
        isBeacon,
        isQuiet: !!isQuiet,
        wavePhase: Math.random() * Math.PI * 2,
        waveSpeed: 0.6 + Math.random() * 0.8,
        waveAmp: 0.8 + Math.random() * 1.8,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.8 + Math.random() * 1.5
      });
    }
  }

  // 3. Comprehensive 18 Authentic OPDS Services Catalog
  const SERVICES_CATALOG = [
    {
      id: "pan",
      title: "PAN Card Application",
      meta: "Status: <strong>Verified & Issued ✓</strong>",
      iconClass: "badge-icon-pan",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
      colorA: "#7c3aed",
      colorB: "#d2a12a"
    },
    {
      id: "aeps",
      title: "Instant AEPS Cash Transfer",
      meta: "Amount: <strong>₹2,500 Dispatched ✓</strong>",
      iconClass: "badge-icon-aeps",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      colorA: "#0284c7",
      colorB: "#38bdf8"
    },
    {
      id: "gst",
      title: "GST / MSME Filing",
      meta: "SLA: <strong>Audit Stage 3 Passed ✓</strong>",
      iconClass: "badge-icon-gst",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/></svg>',
      colorA: "#d97706",
      colorB: "#f59e0b"
    },
    {
      id: "ayush",
      title: "Ayushman Bharat",
      meta: "Benefit: <strong>Golden Card Issued ✓</strong>",
      iconClass: "badge-icon-ayush",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
      colorA: "#16a34a",
      colorB: "#4ade80"
    },
    {
      id: "pass",
      title: "Fresh Passport Seva",
      meta: "Status: <strong>Verification Cleared ✓</strong>",
      iconClass: "badge-icon-pass",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      colorA: "#2563eb",
      colorB: "#60a5fa"
    },
    {
      id: "fastag",
      title: "Fastag Instant Recharge",
      meta: "Wallet: <strong>₹1,000 Credited ✓</strong>",
      iconClass: "badge-icon-fastag",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
      colorA: "#0d9488",
      colorB: "#2dd4bf"
    },
    {
      id: "bill",
      title: "Electricity Bill Payment",
      meta: "Receipt: <strong>Payment Confirmed ✓</strong>",
      iconClass: "badge-icon-bill",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      colorA: "#d2a12a",
      colorB: "#f5c855"
    },
    {
      id: "aadhaar",
      title: "Aadhaar e-KYC Update",
      meta: "Status: <strong>Updated Successfully ✓</strong>",
      iconClass: "badge-icon-aadhaar",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/></svg>',
      colorA: "#4f46e5",
      colorB: "#818cf8"
    },
    {
      id: "voter",
      title: "Voter ID (EPIC) Card",
      meta: "Status: <strong>EPIC Generated ✓</strong>",
      iconClass: "badge-icon-voter",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
      colorA: "#0284c7",
      colorB: "#06b6d4"
    },
    {
      id: "dl",
      title: "Driving License Renewal",
      meta: "Status: <strong>Application Approved ✓</strong>",
      iconClass: "badge-icon-dl",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
      colorA: "#059669",
      colorB: "#10b981"
    },
    {
      id: "itr",
      title: "ITR Tax Return Filing",
      meta: "Status: <strong>ITR-V Acknowledged ✓</strong>",
      iconClass: "badge-icon-itr",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
      colorA: "#7c3aed",
      colorB: "#a855f7"
    },
    {
      id: "birth",
      title: "Birth Certificate Service",
      meta: "Status: <strong>Digital Copy Ready ✓</strong>",
      iconClass: "badge-icon-birth",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="18" y2="12"/><line x1="9" x2="15" y1="15" y2="15"/></svg>',
      colorA: "#e11d48",
      colorB: "#f43f5e"
    },
    {
      id: "epfo",
      title: "EPFO / PF Claim Support",
      meta: "Status: <strong>Claim Settled ✓</strong>",
      iconClass: "badge-icon-epfo",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
      colorA: "#ea580c",
      colorB: "#f97316"
    },
    {
      id: "eshram",
      title: "E-Shram Card Registration",
      meta: "UAN: <strong>Card Generated ✓</strong>",
      iconClass: "badge-icon-eshram",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      colorA: "#15803d",
      colorB: "#22c55e"
    },
    {
      id: "ration",
      title: "Ration Card Addition",
      meta: "Status: <strong>Member Added ✓</strong>",
      iconClass: "badge-icon-ration",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
      colorA: "#1e40af",
      colorB: "#3b82f6"
    },
    {
      id: "trade",
      title: "Trade License Registration",
      meta: "Status: <strong>License Issued ✓</strong>",
      iconClass: "badge-icon-trade",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>',
      colorA: "#b45309",
      colorB: "#d2a12a"
    },
    {
      id: "pcc",
      title: "Police Verification (PCC)",
      meta: "Status: <strong>Clearance Issued ✓</strong>",
      iconClass: "badge-icon-pcc",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
      colorA: "#3730a3",
      colorB: "#6366f1"
    },
    {
      id: "pmkisan",
      title: "PM Kisan Samman Nidhi",
      meta: "Status: <strong>e-KYC Completed ✓</strong>",
      iconClass: "badge-icon-pmkisan",
      svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3c-1.5 3-4 5-8 5 0 7 5 12 8 13 3-1 8-6 8-13-4 0-6.5-2-8-5z"/></svg>',
      colorA: "#047857",
      colorB: "#34d399"
    }
  ];

  // 4. Fisher-Yates Shuffle Bag (Guarantees zero repetitive loops!)
  let serviceDeck = [];
  let lastServedId = -1;

  function getNextUniqueService() {
    if (serviceDeck.length === 0) {
      serviceDeck = [...Array(SERVICES_CATALOG.length).keys()];
      for (let i = serviceDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [serviceDeck[i], serviceDeck[j]] = [serviceDeck[j], serviceDeck[i]];
      }
      if (serviceDeck[serviceDeck.length - 1] === lastServedId) {
        const top = serviceDeck.pop();
        serviceDeck.unshift(top);
      }
    }
    const nextIdx = serviceDeck.pop();
    lastServedId = nextIdx;
    return SERVICES_CATALOG[nextIdx];
  }

  // 5. Exactly ONE Badge Element in the Entire DOM
  badgesLayer.innerHTML = `
    <div class="hero-india-badge" id="hero-tx-badge" style="opacity: 0; pointer-events: none;">
      <div class="badge-icon-box" data-badge-icon></div>
      <div class="badge-content">
        <span class="badge-title" data-badge-title></span>
        <span class="badge-meta" data-badge-meta></span>
      </div>
    </div>
  `;

  const singleBadgeDom = {
    el: document.getElementById("hero-tx-badge"),
    iconEl: document.querySelector("#hero-tx-badge [data-badge-icon]"),
    titleEl: document.querySelector("#hero-tx-badge [data-badge-title]"),
    metaEl: document.querySelector("#hero-tx-badge [data-badge-meta]")
  };

  // 6. Radar Pulse Rings
  const pulseRings = [];

  function triggerPulseRing(x, y, color) {
    pulseRings.push({
      x,
      y,
      color,
      radius: 3,
      maxRadius: 28,
      alpha: 0.85
    });
  }

  // 7. Pick Next Blank Spot from the 5 Spots
  function pickNextSpotIndex(currentIdx) {
    // Dynamic candidates avoiding same spot
    const choices = [0, 1, 2, 3, 4].filter((i) => i !== currentIdx);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // 8. Continuous Chain Controller:
  // - State 0: Transit (thin light line departs from currentSpot to nextSpot)
  // - State 1: Arrived & Impact (packet hits nextSpot, line dissolves)
  // - State 2: Badge Visible (only 1 badge visible at nextSpot for ~2.8s)
  // - State 3: Badge Dissolve (badge fades out)
  // - Loop: currentSpot = nextSpot -> pick nextSpot -> next line launches from currentSpot!
  class SingleBadgeChainController {
    constructor() {
      this.currentSpotIdx = 0; // Starts at Spot 1 (Top-Left)
      this.nextSpotIdx = 1;    // First destination: Spot 2 (Upper-Center)
      this.currentService = getNextUniqueService();

      this.state = "transit"; // "transit", "badge_active", "badge_fading"
      this.phaseTimer = 0;
      this.progress = 0;

      this.lineAlpha = 0;
      this.badgeAlpha = 0;
      this.lift = -35;
      this.destImpact = 0;
    }

    startNewLeg() {
      this.currentSpotIdx = this.nextSpotIdx;
      this.nextSpotIdx = pickNextSpotIndex(this.currentSpotIdx);
      this.currentService = getNextUniqueService();

      this.state = "transit";
      this.phaseTimer = 0;
      this.progress = 0;
      this.lineAlpha = 0;
      this.badgeAlpha = 0;
      this.destImpact = 0;

      // Parabolic curve lift
      const pA = blankSpots[this.currentSpotIdx];
      const pB = blankSpots[this.nextSpotIdx];
      if (pA && pB) {
        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.lift = (Math.random() < 0.5 ? -1 : 1) * Math.min(48, Math.max(24, dist * 0.16));
      }
    }

    updateBadgeDOM() {
      if (!singleBadgeDom.el) return;
      const svc = this.currentService;
      singleBadgeDom.iconEl.className = `badge-icon-box ${svc.iconClass}`;
      singleBadgeDom.iconEl.innerHTML = svc.svg;
      singleBadgeDom.titleEl.textContent = svc.title;
      singleBadgeDom.metaEl.innerHTML = svc.meta;
    }

    update(dt, elapsed, mouseX, mouseY) {
      this.phaseTimer += dt;

      const pA = blankSpots[this.currentSpotIdx];
      const pB = blankSpots[this.nextSpotIdx];
      if (!pA || !pB) return;

      if (this.state === "transit") {
        // Line travels for 2.0s
        const transitDuration = 2.0;
        this.progress = Math.min(1.0, this.phaseTimer / transitDuration);

        // Thin line alpha: gently fades in (0 -> 0.25) and gently dissolves upon arrival (0.75 -> 1.0)
        if (this.progress < 0.25) {
          this.lineAlpha = this.progress / 0.25;
        } else if (this.progress > 0.75) {
          this.lineAlpha = Math.max(0, (1.0 - this.progress) / 0.25);
        } else {
          this.lineAlpha = 1.0;
        }

        this.badgeAlpha = 0;

        // When packet lands at destination:
        if (this.progress >= 1.0) {
          this.state = "badge_active";
          this.phaseTimer = 0;
          this.lineAlpha = 0;
          this.destImpact = 1.0;
          triggerPulseRing(pB.x, pB.y, this.currentService.colorB);
          this.updateBadgeDOM();
        }
      } else if (this.state === "badge_active") {
        // Line is completely dissolved
        this.lineAlpha = 0;

        // Badge smoothly appears & stays active for ~2.8s
        const displayDuration = 2.8;
        if (this.phaseTimer < 0.35) {
          this.badgeAlpha = this.phaseTimer / 0.35; // smooth fade in
        } else {
          this.badgeAlpha = 1.0;
        }

        if (this.phaseTimer >= displayDuration) {
          this.state = "badge_fading";
          this.phaseTimer = 0;
        }
      } else if (this.state === "badge_fading") {
        this.lineAlpha = 0;
        // Badge smoothly dissolves over 0.45s
        const fadeDuration = 0.45;
        this.badgeAlpha = Math.max(0, 1.0 - this.phaseTimer / fadeDuration);

        if (this.phaseTimer >= fadeDuration) {
          // Immediately launch next thin motion line from this exact spot!
          this.startNewLeg();
        }
      }

      // Decay dest impact flare
      if (this.destImpact > 0) {
        this.destImpact = Math.max(0, this.destImpact - dt * 2.8);
      }

      // Position the ONE single badge directly at Destination Spot (pB) with subtle floating oscillation
      if (singleBadgeDom.el) {
        if (canvasWidth >= 680 && this.badgeAlpha > 0.02) {
          const floatY = Math.sin(elapsed * 2.0) * 2.5;
          const bx = Math.round(pB.x + mouseX * 0.9);
          const by = Math.round(pB.y + mouseY * 0.9 + floatY);

          singleBadgeDom.el.style.transform = `translate3d(${bx}px, ${by}px, 0) translate(-50%, -50%)`;
          singleBadgeDom.el.style.opacity = this.badgeAlpha.toFixed(2);
        } else {
          singleBadgeDom.el.style.opacity = "0";
        }
      }
    }
  }

  const chain = new SingleBadgeChainController();

  // 9. Resize Handling
  function resize() {
    const rect = heroSection.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    canvasWidth = rect.width;
    canvasHeight = rect.height;
    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    updateSpots();
    generateParticles();
  }

  resize();

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => {
      resize();
    }).observe(heroSection);
  } else {
    window.addEventListener("resize", resize);
  }

  // 10. Interactive Parallax & Cursor Magnetism State
  const mouse = {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    cursorX: -9999,
    cursorY: -9999
  };

  heroSection.addEventListener("mousemove", (e) => {
    const rect = heroSection.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) - 0.5;
    const ny = ((e.clientY - rect.top) / rect.height) - 0.5;
    mouse.targetX = nx * 24;
    mouse.targetY = ny * 18;
    mouse.cursorX = e.clientX - rect.left;
    mouse.cursorY = e.clientY - rect.top;
  });

  heroSection.addEventListener("mouseleave", () => {
    mouse.targetX = 0;
    mouse.targetY = 0;
    mouse.cursorX = -9999;
    mouse.cursorY = -9999;
  });

  // 11. Animation & Render Loop with Delta Timing
  let animId = null;
  let isVisible = true;
  let lastTimestamp = performance.now();
  const startTime = performance.now();

  function render(now) {
    if (!isVisible) return;
    if (!reducedMotion) {
      animId = requestAnimationFrame(render);
    }

    const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
    lastTimestamp = now;
    const elapsed = (now - startTime) / 1000;

    // Smooth lerp mouse parallax
    mouse.x += (mouse.targetX - mouse.x) * 0.06;
    mouse.y += (mouse.targetY - mouse.y) * 0.06;

    // Update single-badge continuous chain
    chain.update(dt, elapsed, mouse.x, mouse.y);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // A. Draw Full-Width Constellation Dots
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      const waveOffset = Math.sin(elapsed * p.waveSpeed + p.wavePhase) * p.waveAmp;
      const curX = p.baseX + mouse.x * p.depth;
      const curY = p.baseY + waveOffset + mouse.y * p.depth;

      const twinkle = Math.sin(elapsed * p.twinkleSpeed + p.twinklePhase) * 0.14;
      let currentAlpha = Math.max(0.04, Math.min(1, p.baseAlpha + twinkle));

      // Cursor magnetic aura within 85px
      if (!p.isQuiet && mouse.cursorX > 0) {
        const mdx = mouse.cursorX - curX;
        const mdy = mouse.cursorY - curY;
        const mdistSq = mdx * mdx + mdy * mdy;
        if (mdistSq < 7225) {
          const aura = (1 - Math.sqrt(mdistSq) / 85) * 0.35;
          currentAlpha = Math.min(1.0, currentAlpha + aura);
        }
      }

      // Beacon nodes halo
      if (p.isBeacon && !p.isQuiet) {
        ctx.beginPath();
        ctx.arc(curX, curY, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (currentAlpha * 0.22).toFixed(2) + ")";
        ctx.fill();
      }

      // Main stipple dot
      ctx.beginPath();
      ctx.arc(curX, curY, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + currentAlpha.toFixed(2) + ")";
      ctx.fill();

      // Pinpoint white core
      if (p.isBeacon && !p.isQuiet) {
        ctx.beginPath();
        ctx.arc(curX, curY, Math.max(0.65, p.radius * 0.45), 0, Math.PI * 2);
        ctx.fillStyle = p.isGold ? "#ffffff" : "#f0f9ff";
        ctx.fill();
      }
    }

    // B. Draw Patli Halki Motion Line (Thin Light Arc)
    if (chain.lineAlpha > 0.02) {
      const pA = blankSpots[chain.currentSpotIdx];
      const pB = blankSpots[chain.nextSpotIdx];

      if (pA && pB) {
        const ax = pA.x + mouse.x * 0.9;
        const ay = pA.y + mouse.y * 0.9;
        const bx = pB.x + mouse.x * 0.9;
        const by = pB.y + mouse.y * 0.9;

        const midX = (ax + bx) / 2;
        const midY = (ay + by) / 2 + chain.lift;

        // Sinusoidal easing
        const easedT = 0.5 - 0.5 * Math.cos(chain.progress * Math.PI);

        // Thin Light Motion Line (patli halki line: lineWidth 1.15, soft alpha)
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(midX, midY, bx, by);

        const arcGrad = ctx.createLinearGradient(ax, ay, bx, by);
        arcGrad.addColorStop(0, chain.currentService.colorA + Math.round(0x55 * chain.lineAlpha).toString(16).padStart(2, "0"));
        arcGrad.addColorStop(0.5, chain.currentService.colorB + Math.round(0xaa * chain.lineAlpha).toString(16).padStart(2, "0"));
        arcGrad.addColorStop(1, chain.currentService.colorB + Math.round(0x55 * chain.lineAlpha).toString(16).padStart(2, "0"));

        ctx.strokeStyle = arcGrad;
        ctx.lineWidth = 1.15; // Thin and delicate
        ctx.stroke();

        // Compute Bezier point at eased progress
        const t1 = 1 - easedT;
        const pktX = t1 * t1 * ax + 2 * t1 * easedT * midX + easedT * easedT * bx;
        const pktY = t1 * t1 * ay + 2 * t1 * easedT * midY + easedT * easedT * by;

        // Delicate Tapered Comet Tail
        const tTail = Math.max(0, easedT - 0.12);
        const tt1 = 1 - tTail;
        const tailX = tt1 * tt1 * ax + 2 * tt1 * tTail * midX + tTail * tTail * bx;
        const tailY = tt1 * tt1 * ay + 2 * tt1 * tTail * midY + tTail * tTail * by;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(pktX, pktY);
        ctx.strokeStyle = chain.currentService.colorB;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Glowing Packet Head
        ctx.beginPath();
        ctx.arc(pktX, pktY, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Soft Radiant Halo
        ctx.beginPath();
        ctx.arc(pktX, pktY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = chain.currentService.colorB + "44";
        ctx.fill();
      }
    }

    // C. Draw Subtle Waypoint Dots at the 5 Blank Spots
    blankSpots.forEach((spot, idx) => {
      const sx = spot.x + mouse.x * 0.9;
      const sy = spot.y + mouse.y * 0.9;

      // Active destination impact flare
      if (idx === chain.nextSpotIdx && chain.destImpact > 0) {
        ctx.beginPath();
        ctx.arc(sx, sy, 5 + chain.destImpact * 14, 0, Math.PI * 2);
        ctx.fillStyle = chain.currentService.colorB + Math.round(chain.destImpact * 0.35 * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // Origin beacon pulse while line is launching
      if (idx === chain.currentSpotIdx && chain.state === "transit" && chain.progress < 0.35) {
        const pulse = Math.sin(elapsed * 4.0) * 2.0;
        ctx.beginPath();
        ctx.arc(sx, sy, 6.5 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = chain.currentService.colorA + "28";
        ctx.fill();
      }

      // Subtle waypoint dot
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = (idx === chain.currentSpotIdx || idx === chain.nextSpotIdx)
        ? chain.currentService.colorA
        : "rgba(18, 86, 150, 0.45)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, 1.0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });

    // D. Draw Expanding Radar Ripple Rings
    for (let r = pulseRings.length - 1; r >= 0; r--) {
      const ring = pulseRings[r];
      const rx = ring.x + mouse.x * 0.9;
      const ry = ring.y + mouse.y * 0.9;

      ring.radius += 0.55;
      ring.alpha -= 0.018;

      if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
        pulseRings.splice(r, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(rx, ry, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = Math.max(0, ring.alpha);
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }

  // Viewport Intersection Observer for 60fps battery efficiency
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animId) {
          lastTimestamp = performance.now();
          animId = requestAnimationFrame(render);
        }
      });
    }, { threshold: 0.05 });
    observer.observe(heroSection);
  }

  animId = requestAnimationFrame(render);
}

// Initialize Hero India Network Map on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeHeroIndiaNetworkMap);
  document.addEventListener("DOMContentLoaded", initializeStudentStripeCurves);
  document.addEventListener("DOMContentLoaded", initializeBentoComparisonPulseHighway);
} else {
  initializeHeroIndiaNetworkMap();
  initializeStudentStripeCurves();
  initializeBentoComparisonPulseHighway();
}

/* ============================================================================
   STUDENT CORNER - STRIPE ANIMATED CURVED STREAMLINES BACKGROUND
   - Replaces straight diagonal hatching with organic Bezier wave contour streams
   - Bottom-Left Corner: Rich Brand Gold (#d2a12a, #f5c855) flowing wave stream
   - Top-Right Corner: Vibrant Brand Blue (#125696, #1866db, #38bdf8) flowing stream
   - S-curve bowing + harmonic traveling sine undulation (undulating ribbons)
   - Interactive subtle mouse magnetic deflection on hover
   - Traveling light sparks along selected stream lines
   - Battery efficient: IntersectionObserver pauses rendering when off-screen
   ============================================================================ */
function initializeStudentStripeCurves() {
  const section = document.getElementById("student-corner-section");
  const canvas = document.getElementById("student-stripe-curves-canvas");
  if (!section || !canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let width = 0;
  let height = 0;
  let animId = null;
  let isVisible = false;

  // Cached layout rect to avoid getBoundingClientRect layout thrashing on mousemove
  let sectionRect = null;
  let mouseX = -1000, mouseY = -1000;
  let targetMouseX = -1000, targetMouseY = -1000;

  function updateRect() {
    sectionRect = section.getBoundingClientRect();
  }

  section.addEventListener("mousemove", (e) => {
    if (!sectionRect) updateRect();
    targetMouseX = e.clientX - sectionRect.left;
    targetMouseY = e.clientY - sectionRect.top;
  }, { passive: true });

  section.addEventListener("mouseleave", () => {
    targetMouseX = -1000;
    targetMouseY = -1000;
  }, { passive: true });

  window.addEventListener("scroll", updateRect, { passive: true });

  // Streamlines & Pre-Cached Gradients
  let linesCount = 48;
  let spacing = 11;
  const STEPS = 22;
  let goldGradients = [];
  let blueGradients = [];

  function resize() {
    updateRect();
    width = sectionRect.width;
    height = sectionRect.height;
    if (width <= 0 || height <= 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    linesCount = width < 768 ? 24 : 38;
    spacing = width < 768 ? 6.5 : 8.5;
    const centerOffset = (linesCount - 1) * 0.5;

    // Pre-cache all static gradients once on resize (eliminates dynamic allocations per frame)
    goldGradients = new Array(linesCount);
    blueGradients = new Array(linesCount);

    const nx = 0.70710678;
    const ny = 0.70710678;
    const dx = 390;
    const dy = -390;

    for (let i = 0; i < linesCount; i++) {
      const offset = (i - centerOffset) * spacing;
      const norm = Math.abs(i - centerOffset) / centerOffset;

      // Gold line gradient (Bottom-Left aligned strictly to corner [0, height])
      const p0x = 0 + nx * offset;
      const p0y = height + ny * offset;
      const p1x = p0x + dx;
      const p1y = p0y + dy;
      const gradG = ctx.createLinearGradient(p0x, p0y, p1x, p1y);
      const baseAlphaG = Math.max(0.14, (1 - norm * 0.40) * 0.90);
      gradG.addColorStop(0, `rgba(210, 161, 42, ${baseAlphaG * 0.2})`);
      gradG.addColorStop(0.18, `rgba(210, 161, 42, ${baseAlphaG})`);
      gradG.addColorStop(0.50, `rgba(245, 200, 85, ${baseAlphaG * 0.85})`);
      gradG.addColorStop(0.78, `rgba(254, 215, 120, ${baseAlphaG * 0.18})`);
      gradG.addColorStop(1, "rgba(254, 243, 199, 0)");
      goldGradients[i] = gradG;

      // Blue line gradient (Top-Right aligned strictly to corner [width, 0])
      const bp0x = width + nx * offset;
      const bp0y = 0 + ny * offset;
      const bp1x = bp0x - dx;
      const bp1y = bp0y - dy;
      const gradB = ctx.createLinearGradient(bp0x, bp0y, bp1x, bp1y);
      const baseAlphaB = Math.max(0.14, (1 - norm * 0.40) * 0.90);
      gradB.addColorStop(0, `rgba(18, 86, 150, ${baseAlphaB * 0.2})`);
      gradB.addColorStop(0.18, `rgba(18, 86, 150, ${baseAlphaB})`);
      gradB.addColorStop(0.50, `rgba(24, 102, 219, ${baseAlphaB * 0.85})`);
      gradB.addColorStop(0.78, `rgba(56, 189, 248, ${baseAlphaB * 0.18})`);
      gradB.addColorStop(1, "rgba(224, 242, 254, 0)");
      blueGradients[i] = gradB;
    }

    if (reducedMotion) {
      render(0);
    }
  }

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(section);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }
  resize();

  function render(timestamp) {
    if (!isVisible && !reducedMotion) {
      animId = null;
      return;
    }

    if (width <= 0 || height <= 0) {
      if (!reducedMotion) animId = requestAnimationFrame(render);
      return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Smooth mouse interpolation
    if (targetMouseX > -500) {
      if (mouseX < -500) { mouseX = targetMouseX; mouseY = targetMouseY; }
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;
    } else {
      mouseX = -1000;
      mouseY = -1000;
    }

    const t = timestamp * 0.001; // seconds

    // Spatial bounding checks: reject distance calculations when mouse is outside corner zones
    const hasMouseBL = mouseX > -100 && mouseX < 450 && mouseY > height - 450;
    const hasMouseTR = mouseX > width - 450 && mouseY < 450;

    const nx = 0.70710678;
    const ny = 0.70710678;
    const dx = 390;
    const dy = -390;
    const centerOffset = (linesCount - 1) * 0.5;

    ctx.lineWidth = width < 768 ? 0.85 : 1.0;

    // 1. BOTTOM-LEFT CURVED LINES (Brand Gold Harmonic Waves - corner area only)
    for (let i = 0; i < linesCount; i++) {
      const offset = (i - centerOffset) * spacing;
      const p0x = 0 + nx * offset;
      const p0y = height + ny * offset;

      ctx.beginPath();
      for (let s = 0; s <= STEPS; s++) {
        const u = s / STEPS;
        const bx = p0x + u * dx;
        const by = p0y + u * dy;

        const bow = Math.sin(u * Math.PI) * 44 + Math.sin(u * 2 * Math.PI) * 12;
        const wave = reducedMotion ? 0 :
          Math.sin(u * 4.5 - t * 0.55 + i * 0.16) * 8 +
          Math.cos(u * 2.8 + t * 0.38 - i * 0.11) * 5;

        let mouseDisp = 0;
        if (hasMouseBL) {
          const mdx = mouseX - bx;
          const mdy = mouseY - by;
          const distSq = mdx * mdx + mdy * mdy;
          if (distSq < 32400) { // 180px squared
            mouseDisp = (1 - Math.sqrt(distSq) / 180) * 12;
          }
        }

        const totalDisp = bow + wave + mouseDisp;
        const px = bx + nx * totalDisp;
        const py = by + ny * totalDisp;

        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.strokeStyle = goldGradients[i] || "rgba(210, 161, 42, 0.4)";
      ctx.stroke();

      // Traveling pulse along selected lines (gentle, calm, slow speed)
      if (!reducedMotion && i % 5 === 0) {
        const pulseU = (t * 0.09 + i * 0.08) % 1;
        const bx = p0x + pulseU * dx;
        const by = p0y + pulseU * dy;
        const bow = Math.sin(pulseU * Math.PI) * 44 + Math.sin(pulseU * 2 * Math.PI) * 12;
        const wave = Math.sin(pulseU * 4.5 - t * 0.55 + i * 0.16) * 8 +
                     Math.cos(pulseU * 2.8 + t * 0.38 - i * 0.11) * 5;
        const px = bx + nx * (bow + wave);
        const py = by + ny * (bow + wave);
        const pulseAlpha = Math.sin(pulseU * Math.PI) * 0.90;

        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 200, 85, ${pulseAlpha})`;
        ctx.fill();
      }
    }

    // 2. TOP-RIGHT CURVED LINES (Brand Blue Harmonic Waves - corner area only)
    for (let i = 0; i < linesCount; i++) {
      const offset = (i - centerOffset) * spacing;
      const bp0x = width + nx * offset;
      const bp0y = 0 + ny * offset;

      ctx.beginPath();
      for (let s = 0; s <= STEPS; s++) {
        const u = s / STEPS;
        const bx = bp0x - u * dx;
        const by = bp0y - u * dy;

        const bow = Math.sin(u * Math.PI) * 44 + Math.sin(u * 2 * Math.PI) * 12;
        const wave = reducedMotion ? 0 :
          Math.sin(u * 4.5 - t * 0.50 + i * 0.16 + 1.2) * 8 +
          Math.cos(u * 2.8 + t * 0.35 - i * 0.11 + 2.0) * 5;

        let mouseDisp = 0;
        if (hasMouseTR) {
          const mdx = mouseX - bx;
          const mdy = mouseY - by;
          const distSq = mdx * mdx + mdy * mdy;
          if (distSq < 32400) { // 180px squared
            mouseDisp = (1 - Math.sqrt(distSq) / 180) * 12;
          }
        }

        const totalDisp = -bow + wave + mouseDisp;
        const px = bx + nx * totalDisp;
        const py = by + ny * totalDisp;

        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.strokeStyle = blueGradients[i] || "rgba(18, 86, 150, 0.4)";
      ctx.stroke();

      if (!reducedMotion && i % 5 === 0) {
        const pulseU = (t * 0.08 + i * 0.08 + 0.5) % 1;
        const bx = bp0x - pulseU * dx;
        const by = bp0y - pulseU * dy;
        const bow = Math.sin(pulseU * Math.PI) * 44 + Math.sin(pulseU * 2 * Math.PI) * 12;
        const wave = Math.sin(pulseU * 4.5 - t * 0.50 + i * 0.16 + 1.2) * 8 +
                     Math.cos(pulseU * 2.8 + t * 0.35 - i * 0.11 + 2.0) * 5;
        const px = bx + nx * (-bow + wave);
        const py = by + ny * (-bow + wave);
        const pulseAlpha = Math.sin(pulseU * Math.PI) * 0.90;

        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${pulseAlpha})`;
        ctx.fill();
      }
    }

    ctx.restore();
    if (!reducedMotion && isVisible) {
      animId = requestAnimationFrame(render);
    }
  }

  // Viewport IntersectionObserver: 0% CPU when not in view
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animId && !reducedMotion) {
          animId = requestAnimationFrame(render);
        }
      });
    }, { threshold: 0.02, rootMargin: "80px 0px" });
    observer.observe(section);
  } else {
    isVisible = true;
    if (!reducedMotion) animId = requestAnimationFrame(render);
    else render(0);
  }
}

/* ============================================================================
   BENTO COMPARISON: THE ONE POINT EXPERIENCE (DISCONNECTED VS CONNECTED HIGHWAY)
   - Left Side: Faint scattered, wandering disconnected nodes & broken red/amber dashed links
   - Middle Bridge: Sleek vertical transformation conduit line with traveling particles
   - Right Side: 6 streamlined cyber-highway tracks in Brand Blue (#125696) & Gold (#d2a12a)
     with glowing traveling energy comets gliding smoothly into the One Point Platform cards
   - Tab-reactive: Highlights the highway lane corresponding to current active tab
   - IntersectionObserver: Automatically stops 60fps rendering when off-screen (0% CPU)
   - ResizeObserver + high DPI support
   ============================================================================ */
function initializeBentoComparisonPulseHighway() {
  const canvas = document.getElementById("bento-comparison-canvas");
  if (!canvas) return;

  const bentoCard = canvas.closest(".bento-card");
  if (!bentoCard) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let animId = null;
  let isVisible = true;

  function resize() {
    const rect = bentoCard.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (width <= 0 || height <= 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (reducedMotion) render(0);
  }

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(bentoCard);
  } else {
    window.addEventListener("resize", resize);
  }
  resize();

  // 1. Left side: Disconnected legacy nodes
  const NUM_DISCONNECTED = 24;
  const discNodes = [];
  for (let i = 0; i < NUM_DISCONNECTED; i++) {
    discNodes.push({
      x: 0.04 + Math.random() * 0.40,
      y: 0.08 + Math.random() * 0.84,
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
      r: 1.6 + Math.random() * 1.6,
      alpha: 0.18 + Math.random() * 0.28,
      flickerSpeed: 1.2 + Math.random() * 2.2
    });
  }

  // 2. Right side: Connected highway tracks (6 lanes)
  const HIGHWAY_LANES = 6;

  function render(timestamp) {
    if (!isVisible && !reducedMotion) {
      animId = null;
      return;
    }

    if (width <= 0 || height <= 0) {
      if (!reducedMotion) animId = requestAnimationFrame(render);
      return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const t = timestamp * 0.001; // seconds

    // A. Silky Ambient Washes & Seamless Horizon Blend (Zero hard clipping edges)
    // 1. Unified horizontal gradient spanning the entire card width
    const horizonBlend = ctx.createLinearGradient(0, 0, width, 0);
    horizonBlend.addColorStop(0, "rgba(255, 248, 238, 0.50)");     // Light warm left edge
    horizonBlend.addColorStop(0.30, "rgba(255, 251, 245, 0.25)");  // Soft gradual warm transition
    horizonBlend.addColorStop(0.48, "rgba(255, 255, 255, 0.05)");  // Completely neutral seamless middle
    horizonBlend.addColorStop(0.55, "rgba(242, 248, 255, 0.25)");  // Light blue starts emerging
    horizonBlend.addColorStop(0.80, "rgba(224, 241, 255, 0.50)");  // Luminous sky blue
    horizonBlend.addColorStop(1.0, "rgba(214, 235, 254, 0.40)");   // Radiant light blue right edge
    ctx.fillStyle = horizonBlend;
    ctx.fillRect(0, 0, width, height);

    // 2. Left warm radiant aura (full canvas fill, zero hard boundaries)
    const leftWash = ctx.createRadialGradient(width * 0.18, height * 0.48, 10, width * 0.18, height * 0.48, width * 0.45);
    leftWash.addColorStop(0, "rgba(254, 235, 210, 0.30)");
    leftWash.addColorStop(0.55, "rgba(254, 243, 199, 0.10)");
    leftWash.addColorStop(1, "rgba(254, 243, 199, 0)");
    ctx.fillStyle = leftWash;
    ctx.fillRect(0, 0, width, height);

    // 3. Right blue luminous aura (full canvas fill, zero hard boundaries)
    const rightBlueWash = ctx.createRadialGradient(width * 0.82, height * 0.42, 10, width * 0.82, height * 0.42, width * 0.50);
    rightBlueWash.addColorStop(0, "rgba(18, 86, 150, 0.16)");
    rightBlueWash.addColorStop(0.45, "rgba(24, 102, 219, 0.08)");
    rightBlueWash.addColorStop(0.75, "rgba(56, 189, 248, 0.03)");
    rightBlueWash.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = rightBlueWash;
    ctx.fillRect(0, 0, width, height);

    // B. Left Side: Disconnected Legacy Nodes & Broken Links
    ctx.save();
    for (let i = 0; i < discNodes.length; i++) {
      const node = discNodes[i];
      if (!reducedMotion) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0.02 || node.x > 0.46) node.vx *= -1;
        if (node.y < 0.04 || node.y > 0.96) node.vy *= -1;
      }

      const px = node.x * width;
      const py = node.y * height;
      const flicker = reducedMotion ? 1 : Math.sin(t * node.flickerSpeed + i) * 0.5 + 0.5;
      const currentAlpha = node.alpha * (0.4 + flicker * 0.6);

      // Node point with soft warning glow
      ctx.beginPath();
      ctx.arc(px, py, node.r + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 38, 38, ${currentAlpha * 0.85})`;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Broken links between neighboring nodes
      for (let j = i + 1; j < discNodes.length; j++) {
        const other = discNodes[j];
        const dist = Math.hypot((node.x - other.x) * width, (node.y - other.y) * height);
        if (dist < 110) {
          ctx.beginPath();
          ctx.setLineDash([4, 7]);
          ctx.moveTo(px, py);
          ctx.lineTo(other.x * width, other.y * height);
          const lineAlpha = (1 - dist / 110) * 0.32 * flicker;
          ctx.strokeStyle = `rgba(239, 68, 68, ${lineAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    ctx.restore();

    // C. Overhead Cyber Streamlines (sweeping smoothly across top/right without any vertical line)
    const LANES_TOTAL = 3;

    for (let lane = 0; lane < LANES_TOTAL; lane++) {
      const startX = width * (0.10 + lane * 0.14);
      const startY = -25;
      const endX = width * (0.82 + lane * 0.08);
      const endY = height * (0.24 + lane * 0.10);

      const dx = endX - startX;
      const dy = endY - startY;
      const cp1x = startX + dx * 0.40;
      const cp1y = startY + dy * 0.08;
      const cp2x = startX + dx * 0.72;
      const cp2y = endY - dy * 0.08;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

      const isGoldLane = (lane % 2 === 1);
      const alpha = 0.28;
      ctx.strokeStyle = isGoldLane ? `rgba(210, 161, 42, ${alpha})` : `rgba(18, 86, 150, ${alpha})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      if (!reducedMotion) {
        const speed = 0.20 + lane * 0.035;
        const pulseProgress = (t * speed + lane * 0.20) % 1;
        const u = pulseProgress;

        const px = Math.pow(1-u, 3)*startX + 3*Math.pow(1-u, 2)*u*cp1x + 3*(1-u)*u*u*cp2x + Math.pow(u, 3)*endX;
        const py = Math.pow(1-u, 3)*startY + 3*Math.pow(1-u, 2)*u*cp1y + 3*(1-u)*u*u*cp2y + Math.pow(u, 3)*endY;

        const pulseAlpha = Math.sin(pulseProgress * Math.PI) * 0.85;

        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = isGoldLane ? `rgba(245, 200, 85, ${pulseAlpha})` : `rgba(56, 189, 248, ${pulseAlpha})`;
        ctx.shadowColor = isGoldLane ? "#d2a12a" : "#1866db";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
    if (!reducedMotion) {
      animId = requestAnimationFrame(render);
    }
  }

  // IntersectionObserver to only render when bentoCard is in view
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animId && !reducedMotion) {
          animId = requestAnimationFrame(render);
        }
      });
    }, { threshold: 0.05 });
    observer.observe(bentoCard);
  }

  if (!reducedMotion) {
    animId = requestAnimationFrame(render);
  } else {
    render(0);
  }
}






function setPublicHeroTitleLines(title, firstLine, secondLine) {
  if (!title || !firstLine) return;

  title.textContent = "";
  const first = document.createElement("span");
  first.className = "public-hero-title-line";
  first.textContent = firstLine.trim();
  title.append(first);

  if (secondLine?.trim()) {
    const second = document.createElement("span");
    second.className = "public-hero-title-line public-hero-title-line-accent";
    second.textContent = secondLine.trim();
    title.append(second);
  }

  const longestLine = Math.max(firstLine.trim().length, secondLine?.trim().length || 0);
  title.classList.toggle("public-hero-title-compact", longestLine > 25);
  title.dataset.twoLineTitle = "true";
}

function enforcePublicHeroTitleLines(hero) {
  const title = hero?.querySelector(".page-hero-title, .pd-title, h1");
  if (!title || title.dataset.twoLineTitle === "true" || title.querySelector(".public-hero-title-line")) return;

  const words = title.textContent.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length < 2 || (words.length < 4 && title.textContent.trim().length <= 24)) {
    title.dataset.twoLineTitle = "true";
    return;
  }

  let bestIndex = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const firstLength = words.slice(0, index).join(" ").length;
    const secondLength = words.slice(index).join(" ").length;
    const difference = Math.abs(firstLength - secondLength);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestIndex = index;
    }
  }

  setPublicHeroTitleLines(
    title,
    words.slice(0, bestIndex).join(" "),
    words.slice(bestIndex).join(" ")
  );
}

(function alignPublicPageHeroes() {
  if (!document.body.classList.contains("public-site-page")) return;

  const heroSelector = ".page-hero-service, .compact-hero, .not-found-hero, .pd-hero";

  function enhanceHero(hero) {
    if (!(hero instanceof Element)) return;

    const copy = hero.querySelector(".page-hero-copy, .site-container, .pd-panel-inner, .pd-info")
      || hero.firstElementChild;
    if (!copy) return;

    if (!hero.matches(".not-found-hero")) {
      copy.querySelectorAll(":scope > .eyebrow").forEach((eyebrow) => eyebrow.remove());
    }
    [...copy.children].forEach((child) => {
      if (child.matches("div") && /Updated:\s*July\s*2026|Seva Partner/i.test(child.textContent || "")) {
        child.remove();
      }
    });

    hero.classList.add("public-hero-home-system");
    renderPublicHeroDashboard(hero);
    enforcePublicHeroTitleLines(hero);

    if (!copy.querySelector(":scope > .public-hero-os-badge")) {
      const badge = document.createElement("p");
      badge.className = "public-hero-os-badge";
      badge.innerHTML = '<span aria-hidden="true"></span><strong>One Point Service OS</strong><b aria-hidden="true">&middot;</b> Live Operations';

      const anchor = copy.querySelector(":scope > .eyebrow, :scope > h1");
      copy.insertBefore(badge, anchor || copy.firstElementChild);
    }

    const actions = copy.querySelector(":scope > .hero-actions");
    const signals = copy.querySelector(":scope > .edh-signal-row");
    if (actions && signals && signals.previousElementSibling !== actions) {
      actions.insertAdjacentElement("afterend", signals);
    }
  }

  function scan(root) {
    if (root instanceof Element) {
      if (root.matches(heroSelector)) enhanceHero(root);
      else enhanceHero(root.closest(heroSelector));
    }
    root.querySelectorAll?.(heroSelector).forEach(enhanceHero);
  }

  scan(document);

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) scan(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();

// Dynamic bootstrap loader for the Enterprise Design System Utilities
(function() {
  if (!window.EDS) {
    const script = document.createElement('script');
    script.src = 'assets/enterprise-design-system.js';
    script.defer = true;
    script.onload = () => {
      if (window.EDS && window.EDS.theme) {
        window.EDS.theme.init();
      }
    };
    document.head.appendChild(script);
  }
})();

const navItems = [
  { label: "Home", href: "index.html" },
  {
    label: "EduPoint",
    href: "edupoint.html",
    children: [
      "Exam Form Filling",
      "Admit Card Download",
      "Result Download",
      "Scholarship Form",
      "CCC / O Level",
      "University Services",
      "Photocopy & Printing",
      "Lamination",
      "Online Test",
      "Resume Builder"
    ]
  },
  {
    label: "E-Services",
    href: "online-services.html",
    children: [
      "PAN Card",
      "Citizen Security Assistance",
      "Voter ID",
      "Passport Assistance",
      "Aadhaar Services Assistance",
      "Income Certificate",
      "Domicile",
      "Caste Certificate",
      "Pension & Welfare Schemes"
    ]
  },
  {
    label: "ProServe",
    href: "business-solutions.html",
    children: [
      "GST Registration",
      "MSME Registration",
      "Digital Signature",
      "FSSAI",
      "Shop License",
      "IEC Code",
      "Trademark",
      "Company Registration"
    ]
  },
  {
    label: "OneMart",
    href: "products.html",
    children: [
      "Photo Frames",
      "LED Frames",
      "Magic Mugs",
      "Custom Mugs",
      "Mobile Covers",
      "Spotify Plaques",
      "Logo Stickers",
      "Waterproof Stickers",
      "Holographic Stickers",
      "Custom T-Shirts",
      "Visiting Cards",
      "Acrylic Name Plates",
      "Packaging Stickers",
      "Anime Stickers"
    ]
  }
];

const megaGroups = [
  {
    title: "Business Online Setup",
    icon: "globe",
    href: "business-online-setup-services.html",
    description: "Google profiles, WhatsApp setup, vCards, QR codes & automation.",
    items: [
      ["Google Profile", "business-online-setup-services.html"],
      ["Google Reviews", "business-online-setup-services.html"],
      ["WhatsApp Business", "business-online-setup-services.html"],
      ["WhatsApp Auto Reply", "business-online-setup-services.html"],
      ["Business QR Code", "business-online-setup-services.html"],
      ["Digital Visiting Card", "business-online-setup-services.html"]
    ]
  },
  {
    title: "Documentation",
    icon: "files",
    href: "print-scan.html",
    description: "Typing, printing, scanning and document preparation.",
    items: [
      ["Typing", "print-scan.html"],
      ["Scan", "service-document-scanning.html"],
      ["Print", "service-photocopy-printing.html"],
      ["Lamination", "service-lamination.html"],
      ["Affidavit", "service-legal-drafting-court-services.html"],
      ["Certificates", "service-state-certificates-civil-registration.html"]
    ]
  },
  {
    title: "Bill & Recharge",
    icon: "smartphone-charging",
    href: "online-services.html",
    description: "Utility bill, mobile, DTH and FASTag support.",
    items: [
      ["Mobile Recharge", "online-services.html"],
      ["Electricity Bill", "online-services.html"],
      ["FASTag", "online-services.html"],
      ["DTH Recharge", "online-services.html"],
      ["Water Bill", "online-services.html"]
    ]
  },
  {
    title: "Design Services",
    icon: "paintbrush",
    href: "design-services.html",
    description: "Local business creatives and print-ready design help.",
    items: [
      ["Logo Design", "design-services.html#logo-design"],
      ["Flex Design", "design-services.html#flex-design"],
      ["Visiting Card", "design-services.html#visiting-card"],
      ["Banner Design", "design-services.html#banner-design"],
      ["Social Media Post", "design-services.html#social-media-post"]
    ]
  },
  {
    title: "Travel Services",
    icon: "plane",
    href: "travel-services.html",
    description: "Booking assistance with clear confirmation support.",
    highlight: true,
    items: [
      ["Bus Ticket", "travel-services.html#bus-ticket"],
      ["Train Ticket", "travel-services.html#train-ticket"],
      ["Flight Ticket", "travel-services.html#flight-ticket"],
      ["Hotel Booking", "travel-services.html#hotel-booking"],
      ["Tour Package", "travel-services.html#tour-package"],
      ["Passport Assistance", "travel-services.html#passport-assistance"]
    ]
  }
];

const oneMartGroups = [
  {
    title: "Sticker Printing",
    icon: "tag",
    href: "products.html#sticker-printing",
    anchor: "sticker-printing",
    badge: "Trending",
    items: ["Logo Stickers", "Waterproof Stickers", "Vinyl Stickers", "Transparent Stickers", "Holographic Stickers", "Die Cut Stickers", "QR Code Stickers", "Packaging Stickers"]
  },
  {
    title: "Photo & Fine Art Printing",
    icon: "camera",
    href: "products.html#photo-fine-art",
    anchor: "photo-fine-art",
    badge: "Premium",
    items: ["A4 Photo Print", "A3 Photo Print", "Fine Art Print", "Canvas Look Print", "Digital Artwork Print", "Wall Art Print", "Painting Print", "Portrait Print", "Landscape Print", "Premium Matte Print", "Premium Glossy Print"]
  },
  {
    title: "Photo Frames",
    icon: "image",
    href: "products.html#photo-frames",
    anchor: "photo-frames",
    badge: "Best Seller",
    items: ["A4 Frame", "A3 Frame", "Black Frame", "White Frame", "Wooden Frame", "Premium Frame", "Custom Size Frame"]
  },
  {
    title: "Personalized Gifts",
    icon: "gift",
    href: "products.html#personalized-gifts",
    anchor: "personalized-gifts",
    badge: "Gift Ready",
    items: ["Photo Mug", "Magic Mug", "Keychain", "Mobile Cover", "Photo Frame Gift"]
  },
  {
    title: "T-Shirt Printing",
    icon: "shirt",
    href: "products.html#t-shirt-printing",
    anchor: "t-shirt-printing",
    badge: "Best Seller",
    items: ["Custom T-Shirt", "Polo T-Shirt", "DTF T-Shirt", "Couple T-Shirt"]
  },
  {
    title: "Business Branding",
    icon: "briefcase",
    href: "products.html#business-branding",
    anchor: "business-branding",
    badge: "High Demand",
    items: ["Visiting Cards", "PVC Cards", "Flyers", "Brochure", "Menu Cards", "Thank You Cards", "QR Standee", "Product Labels"]
  },
  {
    title: "Office & Document Printing",
    icon: "printer",
    href: "products.html#office-printing",
    anchor: "office-printing",
    badge: "Daily Need",
    items: ["Color Print", "Black & White Print", "A4 Print", "A3 Print", "Lamination", "Spiral Binding", "ID Card", "Certificate Printing"]
  },
  {
    title: "Islamic Wall Art",
    icon: "moon",
    href: "products.html#islamic-wall-art",
    anchor: "islamic-wall-art",
    badge: "Curated",
    items: ["Ayatul Kursi Frame", "Surah Rahman Frame", "Kalima Frame", "Allah Name Frame", "Muhammad Name Frame", "Custom Islamic Frame"]
  },
  {
    title: "Artists Corner",
    icon: "palette",
    href: "products.html#artists-corner",
    anchor: "artists-corner",
    badge: "Unique",
    items: ["Customer Artwork Printing", "Digital Painting Print", "Sketch Printing", "Canvas Style Print", "Exhibition Print", "Portfolio Print", "Photography Print"]
  }
];

const productImagePools = {
  "Sticker Printing": [
    "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&w=900&q=82"
  ],
  "Photo & Fine Art Printing": [
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=82"
  ],
  "Photo Frames": [
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1516455207990-7a41ce80f7ee?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82"
  ],
  "Personalized Gifts": [
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=82"
  ],
  "T-Shirt Printing": [
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=82"
  ],
  "Business Branding": [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=900&q=82"
  ],
  "Office & Document Printing": [
    "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=82"
  ],
  "Islamic Wall Art": [
    "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1590076215667-875d4ef2d7ee?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1574634534894-89d7576c8259?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=82"
  ],
  "Artists Corner": [
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=900&q=82"
  ]
};

const productOverrides = {
    // Sticker Printing
  "Logo Stickers": {
    price: 49,
    rating: "4.9",
    badge: "Best Seller",
    images: ["https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=800&q=82"],
    description: "Custom-cut brand logo decals with razor-sharp contours and vibrant colors."
  },
  "Waterproof Stickers": {
    price: 59,
    rating: "4.9",
    badge: "Outdoor Safe",
    images: ["https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=800&q=82"],
    description: "Dishwasher-safe, weatherproof vinyl built for insulated bottles and gear."
  },
  "Vinyl Stickers": {
    price: 69,
    rating: "4.8",
    badge: "Durable",
    images: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=82"],
    description: "Heavy-duty scratch-resistant vinyl decals for laptops, cars and products."
  },
  "Transparent Stickers": {
    price: 79,
    rating: "4.8",
    badge: "Premium Look",
    images: ["https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=82"],
    description: "See-through clear film decals with white ink underprint for glass and jars."
  },
  "Holographic Stickers": {
    price: 99,
    rating: "4.9",
    badge: "Trending",
    images: ["https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&w=800&q=82"],
    description: "Iridescent rainbow metallic reflection that shifts colors dynamically."
  },
  "Die Cut Stickers": {
    price: 99,
    rating: "4.8",
    reviewsCount: 126,
    badge: "Custom Shape",
    images: [
      "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=85"
    ],
    description: "Custom-shaped vinyl stickers with sharp die-cut edges, vibrant UV-resistant colour output and print-ready WhatsApp proofing — ideal for logos, packaging, laptops, bottles and promotional merchandise."
  },
  "QR Code Stickers": {
    price: 49,
    rating: "4.7",
    badge: "Business",
    images: ["https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=82"],
    description: "Scannable UPI, Menu & Review QR decals for store counters and tables."
  },
  "Packaging Stickers": {
    price: 39,
    rating: "4.9",
    badge: "Packaging",
    images: ["https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=800&q=82"],
    description: "Thank-you seals and box branding labels for e-commerce orders."
  },
  // Photo & Fine Art Printing
  "A4 Photo Print":       { price: 25,  rating: "4.8", badge: "Quick Print",  variations: ["Glossy", "Matte", "Satin", "Lustre"] },
  "A3 Photo Print":       { price: 59,  rating: "4.8", badge: "Large Format", variations: ["Glossy", "Matte", "Satin", "Poster"] },
  "Fine Art Print":       { price: 149, rating: "4.9", badge: "Premium",      variations: ["A4", "A3", "Canvas", "Archival"] },
  "Canvas Look Print":    { price: 199, rating: "4.9", badge: "Wall Ready",   variations: ["A4", "A3", "12x18", "18x24"] },
  "Digital Artwork Print":{ price: 129, rating: "4.8", badge: "Creator Pick", variations: ["A4 Matte", "A3 Matte", "Poster", "Glossy"] },
  "Wall Art Print":       { price: 249, rating: "4.9", badge: "Decor Ready",  variations: ["18x24", "24x36", "Matte", "Glossy"] },
  "Painting Print":       { price: 299, rating: "4.9", badge: "Fine Art",     variations: ["A3", "12x18", "18x24", "Canvas"] },
  "Portrait Print":       { price: 199, rating: "4.9", badge: "Best Seller",  variations: ["A4", "A3", "Glossy", "Matte"] },
  "Landscape Print":      { price: 199, rating: "4.8", badge: "Gallery Look", variations: ["A3", "12x18", "18x24", "Panoramic"] },
  "Premium Matte Print":  { price: 79,  rating: "4.8", badge: "Premium",      variations: ["A4", "A3", "Poster", "Bulk"] },
  "Premium Glossy Print": { price: 79,  rating: "4.8", badge: "Vibrant",      variations: ["A4", "A3", "Poster", "Bulk"] },
  // Photo Frames
  "A4 Frame":             { price: 149, rating: "4.8", badge: "Popular",      variations: ["Black", "White", "Brown", "Silver"] },
  "A3 Frame":             { price: 249, rating: "4.8", badge: "Large",        variations: ["Black", "White", "Wood", "Metal"] },
  "Black Frame":          { price: 199, rating: "4.9", badge: "Classic",      variations: ["A4", "A3", "5x7", "8x10"] },
  "White Frame":          { price: 199, rating: "4.8", badge: "Minimal",      variations: ["A4", "A3", "5x7", "Custom"] },
  "Wooden Frame":         { price: 299, rating: "4.9", badge: "Premium",      variations: ["Natural", "Dark", "A4", "A3"] },
  "Premium Frame":        { price: 399, rating: "4.9", badge: "Gift Ready",   variations: ["Gold Edge", "Black", "A4", "A3"] },
  "Custom Size Frame":    { price: 499, rating: "4.8", badge: "Custom",       variations: ["Any Size", "Wood", "Metal", "PVC"] },
  // Personalized Gifts
  "Photo Mug":            { price: 299, rating: "4.9", badge: "Best Seller",  variations: ["White", "Black", "11oz", "15oz"] },
  "Magic Mug":            { price: 399, rating: "4.9", badge: "Gift Hit",     variations: ["Black", "Red", "Heart Handle", "Gift Box"] },
  "Keychain":             { price: 99,  rating: "4.7", badge: "Quick Gift",   variations: ["Acrylic", "Metal", "Round", "Rectangle"] },
  "Mobile Cover":         { price: 249, rating: "4.8", badge: "Trending",     variations: ["Soft", "Hard", "Glossy", "Matte"] },
  "Photo Frame Gift":     { price: 349, rating: "4.9", badge: "Gift Ready",   variations: ["Wooden", "Black", "Premium", "Custom"] },
  // T-Shirt Printing
  "Custom T-Shirt":       { price: 299, rating: "4.9", badge: "Best Seller",  variations: ["S", "M", "L", "XL"] },
  "Polo T-Shirt":         { price: 449, rating: "4.7", badge: "Team Wear",    variations: ["S", "M", "L", "XL"] },
  "DTF T-Shirt":          { price: 349, rating: "4.8", badge: "Vivid Print",  variations: ["S", "M", "L", "XL"] },
  "Couple T-Shirt":       { price: 549, rating: "4.9", badge: "Gift Ready",   variations: ["Pair", "Black", "White", "Custom"] },
  // Business Branding
  "Visiting Cards":       { price: 199, rating: "4.9", badge: "Best Seller",  variations: ["100 pcs", "250 pcs", "Matte", "Glossy"] },
  "PVC Cards":            { price: 499, rating: "4.8", badge: "Professional", variations: ["ID Card", "Membership", "Staff", "Custom"] },
  "Flyers":               { price: 99,  rating: "4.7", badge: "Marketing",    variations: ["A5 50pcs", "A4 50pcs", "Both Side", "Bulk"] },
  "Brochure":             { price: 149, rating: "4.8", badge: "Brand Tool",   variations: ["Bi-fold", "Tri-fold", "A4", "A5"] },
  "Menu Cards":           { price: 299, rating: "4.8", badge: "Restaurant",   variations: ["Laminated", "Fold", "A4", "A3"] },
  "Thank You Cards":      { price: 149, rating: "4.8", badge: "Packaging",    variations: ["50 pcs", "100 pcs", "Matte", "Glossy"] },
  "QR Standee":           { price: 599, rating: "4.9", badge: "High Impact",  variations: ["Acrylic", "Flex", "Small", "Large"] },
  "Product Labels":       { price: 99,  rating: "4.8", badge: "Packaging",    variations: ["Jar", "Box", "Bottle", "Custom"] },
  // Office & Document Printing
  "Color Print":          { price: 10,  rating: "4.8", badge: "Per Page",     variations: ["A4", "A3", "Single Side", "Both Side"] },
  "Black & White Print":  { price: 2,   rating: "4.8", badge: "Per Page",     variations: ["A4", "A3", "Bulk", "Single Side"] },
  "A4 Print":             { price: 5,   rating: "4.8", badge: "Daily Need",   variations: ["Color", "B&W", "Single Side", "Both Side"] },
  "A3 Print":             { price: 15,  rating: "4.7", badge: "Large Format", variations: ["Color", "B&W", "Poster", "Blueprint"] },
  "Lamination":           { price: 15,  rating: "4.8", badge: "Per Sheet",    variations: ["A4", "A3", "Glossy", "Matte"] },
  "Spiral Binding":       { price: 49,  rating: "4.8", badge: "Popular",      variations: ["A4", "A5", "Black", "Color"] },
  "ID Card":              { price: 49,  rating: "4.9", badge: "Fast Print",   variations: ["PVC", "Paper", "Laminated", "With Holder"] },
  "Certificate Printing": { price: 29,  rating: "4.8", badge: "Event Ready",  variations: ["A4", "A3", "Glossy", "Matte"] },
  // Islamic Wall Art
  "Ayatul Kursi Frame":   { price: 499, rating: "4.9", badge: "Best Seller",  variations: ["A4", "A3", "Black", "Golden"] },
  "Surah Rahman Frame":   { price: 549, rating: "4.9", badge: "Premium",      variations: ["A4", "A3", "Black", "Wooden"] },
  "Kalima Frame":         { price: 449, rating: "4.9", badge: "Blessed",      variations: ["A4", "A3", "Black", "White"] },
  "Allah Name Frame":     { price: 399, rating: "4.9", badge: "Sacred Art",   variations: ["A4", "A3", "Golden", "Black"] },
  "Muhammad Name Frame":  { price: 399, rating: "4.9", badge: "Sacred Art",   variations: ["A4", "A3", "Golden", "Black"] },
  "Custom Islamic Frame": { price: 599, rating: "4.8", badge: "Custom",       variations: ["Any Surah", "A4", "A3", "Premium"] },
  // Artists Corner
  "Customer Artwork Printing": { price: 199, rating: "4.8", badge: "Your Design",  variations: ["A4", "A3", "Matte", "Glossy"] },
  "Digital Painting Print":    { price: 249, rating: "4.9", badge: "Fine Art",     variations: ["A4", "A3", "Canvas", "Matte"] },
  "Sketch Printing":           { price: 149, rating: "4.8", badge: "Artist Pick",  variations: ["A4", "A3", "Matte", "Archival"] },
  "Canvas Style Print":        { price: 349, rating: "4.9", badge: "Gallery Look", variations: ["12x18", "18x24", "A3", "Custom"] },
  "Exhibition Print":          { price: 499, rating: "4.9", badge: "Pro Quality",  variations: ["A3", "18x24", "24x36", "Archival"] },
  "Portfolio Print":           { price: 299, rating: "4.8", badge: "Artist Set",   variations: ["A4 Set", "A3 Set", "Matte", "Mixed"] },
  "Photography Print":         { price: 199, rating: "4.9", badge: "True Color",   variations: ["A4", "A3", "Lustre", "Matte"] }
};

const categoryDescriptions = {
  "Sticker Printing": "Custom-cut stickers for logos, QR codes, packaging and creator branding — glossy, matte, holographic and die-cut.",
  "Photo & Fine Art Printing": "Professional photo prints on premium paper — A4 snapshots to large-format wall art and gallery-quality fine art.",
  "Photo Frames": "Ready-to-hang frames in all sizes — wood, black, white and premium finishes for every wall and occasion.",
  "Personalized Gifts": "Photo mugs, magic mugs, keychains, mobile covers and framed gifts with name and photo customization.",
  "T-Shirt Printing": "Custom apparel — T-shirts, polo, DTF and couple prints for personal, team and business use.",
  "Business Branding": "Visiting cards, flyers, brochures, menu cards and QR standees to build your brand presence locally.",
  "Office & Document Printing": "Color and B&W printing, A4/A3, lamination, binding and ID cards — fast turnaround for CSC customers.",
  "Islamic Wall Art": "Beautifully framed Islamic calligraphy — Ayatul Kursi, Surah Rahman, Kalima and custom verses.",
  "Artists Corner": "Premium printing for artists — digital paintings, sketches, canvas-style prints and exhibition-quality output."
};

const oneMartProducts = oneMartGroups.flatMap((group, groupIndex) => {
  const pool = productImagePools[group.title] || productImagePools["Trending Products"];
  return group.items.map((name, index) => {
    const override = productOverrides[name] || {};
    const offset = index % pool.length;
    const images = (override.images && override.images.length) ? override.images : [...pool.slice(offset), ...pool.slice(0, offset)];
    const slug = slugify(name);
    return {
      slug,
      name,
      category: group.title,
      categorySlug: group.anchor || slugify(group.title),
      icon: group.icon,
      href: `product-detail.html?product=${slug}`,
      price: override.price || 199,
      rating: override.rating || "4.8",
      badge: override.badge || group.badge || "Popular",
      variations: override.variations || ["Standard", "Premium", "Custom", "Bulk"],
      images,
      description: override.description || `${name} with clean print finishing, order-ready proofing and local OneMart support.`,
      short: override.short || categoryDescriptions[group.title],
      groupIndex,
      index
    };
  });
});

const siteConfig = {
  phone: window.OPDS_LOCALIZATION?.PHONE || "+91 9473946181",
  phoneHref: "tel:" + (window.OPDS_LOCALIZATION?.PHONE || "+919473946181").replace(/\s+/g, ""),
  whatsapp: window.OPDS_LOCALIZATION?.WHATSAPP || "https://wa.me/919473946181",
  email: "support@bisenonepoint.com",
  hours: window.OPDS_LOCALIZATION?.SUPPORT_HOURS || "9:00 AM - 8:00 PM",
  logoHeader: "assets/logo-bisen-one-point.svg",
  logoFooter: "assets/logo-bisen-one-point-footer.svg",
  address: window.OPDS_LOCALIZATION?.ADDRESS || "One Point Suvidha Kendra, LDA Colony, Lucknow",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=One%20Point%20Suvidha%20Kendra%2C%2026.9136668%2C80.960677",
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3557.6794410432926!2d80.96067699999999!3d26.9136668!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399957b67a13d94f%3A0xd16b0b38c7f7f320!2sOne%20Point%20Suvidha%20Kendra!5e0!3m2!1sen!2sin!4v1778773792841!5m2!1sen!2sin"
};

/* ─────────────────────────────────────────────────────────────────────────
   LAUNCH MODE — pre-launch WhatsApp routing
   -------------------------------------------------------------------------
   Jab dashboard/backend develop ho raha ho, tab site ko WhatsApp-first
   mode me launch karne ke liye. mode = "whatsapp" karne par har service
   "Apply" button seedhe WhatsApp pe pre-filled message ke saath khulta hai.
   Full backend flow wapas chahiye to mode = "full" (ya "") kar do — ek line.

   Override options (code touch kiye bina):
     • window.OPDS_LAUNCH_MODE = "full"   // page se override
     • URL me ?launch=full ya ?launch=whatsapp  // testing ke liye
   ───────────────────────────────────────────────────────────────────────── */
const launchConfig = {
  mode: "full",                 // "full"/"" = normal backend flow | "whatsapp" = pre-launch mode (retired)
  whatsappNumber: "919473946181",
  // Razorpay Payment Page/Link URL (owner paste kare). Ek standing link jismein customer
  // amount daal ke pay kar sake — operator review ke baad WhatsApp par yahi bhejta hai.
  // Blank = footer par "Pay Online" pill hidden rahega. See docs/LAUNCH_MODE.md
  razorpayPaymentLink: "https://rzp.io/rzp/vStYIve"
};

function launchModeOverride() {
  try {
    const q = new URLSearchParams(window.location.search).get("launch");
    if (q === "full" || q === "whatsapp" || q === "off") return q === "off" ? "full" : q;
  } catch (e) { /* ignore */ }
  if (typeof window !== "undefined" && typeof window.OPDS_LAUNCH_MODE === "string") {
    return window.OPDS_LAUNCH_MODE;
  }
  return null;
}

function isWhatsAppLaunchMode() {
  const override = launchModeOverride();
  return (override !== null ? override : launchConfig.mode) === "whatsapp";
}

// Best-effort price for the WhatsApp message (catalog se, agar load hua ho)
function launchServicePriceLabel(serviceName) {
  try {
    const pricing = typeof servicePricingFor === "function" ? servicePricingFor(serviceName) : null;
    const dp = pricing && pricing.displayPrice;
    if (dp && dp !== "Price loading" && dp !== MASTER_PRICE_PLACEHOLDER) return dp;
  } catch (e) { /* ignore */ }
  return "";
}

function buildServiceWhatsAppUrl(service, category = "general") {
  const name = (service || "General Support").toString().trim();
  const priceLabel = launchServicePriceLabel(name);
  const lines = [
    "Hello One Point 👋",
    `Mujhe *${name}* service chahiye.`
  ];
  if (priceLabel) lines.push(`Price (approx): ${priceLabel}`);
  lines.push("Please process aur zaroori documents batayein.");
  const msg = lines.join("\n");
  return `https://wa.me/${launchConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

// Rich WhatsApp message from a filled apply form / checkout (M2)
function buildApplyWhatsAppUrl(details = {}) {
  const { service, name, mobile, email, address, notes, driveLink, amount } = details;
  const priceLabel = amount || launchServicePriceLabel(service || "");
  const lines = ["Hello One Point 👋", "Mujhe ye service apply karni hai:"];
  if (service)   lines.push(`• Service: *${service}*`);
  if (priceLabel) lines.push(`• Price: ${priceLabel}`);
  if (name)      lines.push(`• Naam: ${name}`);
  if (mobile)    lines.push(`• Mobile: ${mobile}`);
  if (email)     lines.push(`• Email: ${email}`);
  if (address)   lines.push(`• Address: ${address}`);
  if (driveLink) lines.push(`• Documents: ${driveLink}`);
  if (notes)     lines.push(`• Notes: ${notes}`);
  lines.push("Please aage ka process aur payment link bhej dijiye.");
  return `https://wa.me/${launchConfig.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

// Exposed for checkout.js (loads after app.js on checkout.html)
if (typeof window !== "undefined") {
  window.OPDSLaunch = {
    isWhatsAppMode: isWhatsAppLaunchMode,
    buildServiceWhatsAppUrl,
    buildApplyWhatsAppUrl,
    whatsappNumber: launchConfig.whatsappNumber,
    razorpayPaymentLink: launchConfig.razorpayPaymentLink
  };
}

const serviceRoutes = {
  "Exam Form Filling": "edupoint.html#exam-form-filling",
  "Admit Card Download": "edupoint.html#admit-card-download",
  "Result Download": "edupoint.html#result-download",
  "Scholarship Form": "edupoint.html#scholarship-form",
  "CCC / O Level": "edupoint.html#ccc-o-level",
  "University Services": "edupoint.html#university-services",
  "Photocopy & Printing": "service-photocopy-printing.html",
  "Print & Scan": "print-scan.html",
  "Photocopy & Print": "service-photocopy-printing.html",
  "Color Printing": "service-color-printing.html",
  "Document Scanning": "service-document-scanning.html",
  "Scanning": "service-document-scanning.html",
  "Lamination": "service-lamination.html",
  "Lamination Support": "service-lamination.html",
  "Online Test": "edupoint.html#online-test",
  "Resume Builder": "edupoint.html#resume",
  "PAN Card": "service-pan-card.html",
  "PAN Card Assistance": "service-pan-card.html",
  "Citizen Security Assistance": "service-citizen-security-cybercrime-police-help.html",
  "Ayushman Card": "service-citizen-security-cybercrime-police-help.html",
  "Citizen Security, Cybercrime & Police Help": "service-citizen-security-cybercrime-police-help.html",
  "Voter ID": "service-voter-id.html",
  "Voter ID Card": "service-voter-id.html",
  "Passport Assistance": "service-passport-assistance.html",
  "Aadhaar Services Assistance": "service-aadhaar-services-assistance.html",
  "State Certificates & Civil Registration": "service-state-certificates-civil-registration.html",
  "Income Certificate": "service-state-certificates-civil-registration.html",
  "Transport & RTO Facilitation": "service-transport-rto-facilitation.html",
  "Transport & RTO": "service-transport-rto-facilitation.html",
  "Ration Card Application Assistance": "service-ration-card-assistance.html",
  "Ration Card": "service-ration-card-assistance.html",
  "Pension & Welfare Schemes": "service-pension-welfare-schemes-assistance.html",
  "Admission Assistance": "edupoint-admission-assistance.html",
  "Competitive Exams": "edupoint-competitive-exams.html",
  "University Services": "edupoint-university-services.html",
  "Scholarship Assistance": "edupoint-scholarship-assistance.html",
  "Student Digital Services": "edupoint-student-digital-services.html",
  "Admit Card & Results": "edupoint-admit-card-results.html",
  "Online Payments": "edupoint-online-payments.html",
  "Study & Academic Support": "edupoint-study-academic-support.html",
  "Printing & Documentation": "edupoint-printing-documentation.html",
  "Career Services": "edupoint-career-services.html",
  "GST Registration": "service-gst-registration.html",
  "Income Tax Assistance": "service-income-tax-assistance.html",
  "Business Registration & Corporate Setup": "service-business-registration-corporate-setup.html",
  "MSME Registration": "service-business-registration-corporate-setup.html",
  "Legal Drafting & Court Services Assistance": "service-legal-drafting-court-services.html",
  "FSSAI": "service-business-registration-corporate-setup.html",
  "FSSAI License": "service-business-registration-corporate-setup.html",
  "Shop License": "service-business-registration-corporate-setup.html",
  "IEC Code": "service-business-registration-corporate-setup.html",
  "Trademark": "service-business-registration-corporate-setup.html",
  "Trademark Registration": "service-business-registration-corporate-setup.html",
  "Company Registration": "service-business-registration-corporate-setup.html",
  "Sticker Printing": "products.html#sticker-printing",
  "UV DTF Printing": "products.html#uv-dtf-printing",
  "T-Shirt Printing": "products.html#t-shirt-printing",
  "Personalized Gifts": "products.html#personalized-gifts",
  "Business Branding": "products.html#business-branding",
  "Wedding & Events": "products.html#wedding-events",
  "Home Decor": "products.html#home-decor",
  "Trending Products": "products.html#trending-products",
  "Photo Frames": "products.html#photo-frames",
  "LED Frames": "products.html#led-frames",
  "Magic Mugs": "products.html#magic-mugs",
  "Custom Mugs": "products.html#custom-mugs",
  "Mobile Covers": "products.html#mobile-covers",
  "Spotify Plaques": "products.html#spotify-plaques",
  "Keychains": "products.html#keychains",
  "Cushion Printing": "products.html#cushion-printing",
  "Logo Stickers": "products.html#logo-stickers",
  "Waterproof Stickers": "products.html#waterproof-stickers",
  "Vinyl Stickers": "products.html#vinyl-stickers",
  "Holographic Stickers": "products.html#holographic-stickers",
  "Laptop Stickers": "products.html#laptop-stickers",
  "QR Code Stickers": "products.html#qr-code-stickers",
  "Product Labels": "products.html#product-labels",
  "Packaging Stickers": "products.html#packaging-stickers",
  "Cup Branding": "products.html#cup-branding",
  "Bottle Branding": "products.html#bottle-branding",
  "Glass Stickers": "products.html#glass-stickers",
  "Acrylic Name Plates": "products.html#acrylic-name-plates",
  "Business Logo Transfers": "products.html#business-logo-transfers",
  "Product Branding": "products.html#product-branding",
  "Custom T-Shirts": "products.html#custom-t-shirts",
  "Couple T-Shirts": "products.html#couple-t-shirts",
  "Polo T-Shirts": "products.html#polo-t-shirts",
  "Hoodies": "products.html#hoodies",
  "DTF Transfers": "products.html#dtf-transfers",
  "Visiting Cards": "products.html#visiting-cards",
  "PVC Cards": "products.html#pvc-cards",
  "Flyers": "products.html#flyers",
  "Menu Cards": "products.html#menu-cards",
  "Barcode Labels": "products.html#barcode-labels",
  "Thank You Cards": "products.html#thank-you-cards",
  "Wedding Cards": "products.html#wedding-cards",
  "Welcome Boards": "products.html#welcome-boards",
  "Return Gift Tags": "products.html#return-gift-tags",
  "Photo Booth Props": "products.html#photo-booth-props",
  "Wall Posters": "products.html#wall-posters",
  "Canvas Prints": "products.html#canvas-prints",
  "Photo Tiles": "products.html#photo-tiles",
  "Refrigerator Magnets": "products.html#refrigerator-magnets",
  "Anime Stickers": "products.html#anime-stickers",
  "Aesthetic Stickers": "products.html#aesthetic-stickers",
  "Creator Merchandise": "products.html#creator-merchandise",
  "Mini Photo Prints": "products.html#mini-photo-prints",
  "Instagram Branding Kits": "products.html#instagram-branding-kits",
  "Small Business Packaging Kits": "products.html#small-business-packaging-kits",
  "Google Business Profile Optimization": "business-online-setup-services.html",
  "Google Review Management Setup": "business-online-setup-services.html",
  "WhatsApp Business Profile Setup": "business-online-setup-services.html",
  "WhatsApp Auto Reply Setup": "business-online-setup-services.html",
  "Business QR Code Creation": "business-online-setup-services.html",
  "Digital Visiting Card Creation": "business-online-setup-services.html",
  "Online Catalogue Creation": "business-online-setup-services.html",
  "Business Email Signature Design": "business-online-setup-services.html",
  "Email Template Creation": "business-online-setup-services.html",
  "Business Automation Setup": "business-online-setup-services.html",
  "PM Kisan": "service-pension-welfare-schemes-assistance.html",
  "Pension": "service-pension-welfare-schemes-assistance.html",
  "Insurance": "online-services.html",
  "Banking": "online-services.html",
  "Ayushman": "online-services.html",
  "Jan Seva": "online-services.html",
  "Typing": "print-scan.html",
  "Scan": "service-document-scanning.html",
  "Print": "service-photocopy-printing.html",
  "Affidavit": "service-legal-drafting-court-services.html",
  "Certificates": "service-state-certificates-civil-registration.html",
  "Mobile Recharge": "online-services.html",
  "Electricity Bill": "online-services.html",
  "FASTag": "online-services.html",
  "DTH Recharge": "online-services.html",
  "Water Bill": "online-services.html",
  "Logo Design": "design-services.html#logo-design",
  "Flex Design": "design-services.html#flex-design",
  "Visiting Card": "design-services.html#visiting-card",
  "Banner Design": "design-services.html#banner-design",
  "Social Media Post": "design-services.html#social-media-post",
  "Design Services": "design-services.html",
  "Bus Ticket": "travel-services.html#bus-ticket",
  "Train Ticket": "travel-services.html#train-ticket",
  "Flight Ticket": "travel-services.html#flight-ticket",
  "Hotel Booking": "travel-services.html#hotel-booking",
  "Tour Package": "travel-services.html#tour-package"
};

const mobileServiceGroups = [
  {
    title: "Services",
    icon: "grid-3x3",
    href: "services.html",
    items: [
      ["PAN Card", "service-pan-card.html"],
      ["Citizen Security Assistance", "service-citizen-security-cybercrime-police-help.html"],
      ["Voter ID", "service-voter-id.html"],
      ["GST Registration", "service-gst-registration.html"],
      ["Business Registration & Corporate Setup", "service-business-registration-corporate-setup.html"],
      ["Student Services", "edupoint.html"],
      ["Design Services", "design-services.html"],
      ["Business Online Setup", "business-online-setup-services.html"]
    ]
  },
  {
    title: "Travel",
    icon: "plane",
    href: "travel-services.html",
    items: [
      ["Bus Ticket", "travel-services.html#bus-ticket"],
      ["Train Ticket", "travel-services.html#train-ticket"],
      ["Flight Ticket", "travel-services.html#flight-ticket"],
      ["Hotel Booking", "travel-services.html#hotel-booking"],
      ["Tour Package", "travel-services.html#tour-package"],
      ["Passport Assistance", "travel-services.html#passport-assistance"]
    ]
  },
  {
    title: "Store",
    icon: "shopping-bag",
    href: "products.html",
    items: [
      ["Sticker Printing", "products.html#sticker-printing"],
      ["UV DTF Printing", "products.html#uv-dtf-printing"],
      ["T-Shirt Printing", "products.html#t-shirt-printing"],
      ["Personalized Gifts", "products.html#personalized-gifts"],
      ["Business Branding", "products.html#business-branding"]
    ]
  }
];

const searchIndex = [
  { term: "pan banana hai pan card apply", title: "PAN Card Apply", href: "service-pan-card.html" },
  { term: "admit card download hall ticket", title: "Admit Card Download", href: "edupoint.html#admit-card-download" },
  { term: "gst registration gst number goods services tax", title: "GST Registration", href: "service-gst-registration.html" },
  { term: "resume builder cv job application internship", title: "Resume Builder", href: "edupoint.html#resume" },
  { term: "onemart printing stickers mugs tshirt gifts branding", title: "OneMart Printing Store", href: "products.html#onemart-catalog" },
  { term: "ayushman card health card pmjay citizen security cybercrime police help", title: "Citizen Security, Cybercrime & Police Help", href: "service-citizen-security-cybercrime-police-help.html" },
  { term: "bus ticket train ticket flight ticket hotel booking tour", title: "Travel Services", href: "travel-services.html" },
  { term: "voter id election card voter registration", title: "Voter ID", href: "service-voter-id.html" },
  { term: "passport passport form passport appointment", title: "Passport Assistance", href: "service-passport-assistance.html" },
  { term: "aadhaar aadhar enrolment update pvc card", title: "Aadhaar Services Assistance", href: "service-aadhaar-services-assistance.html" },
  { term: "state certificates civil registration income domicile caste birth death marriage character legal heir", title: "State Certificates & Civil Registration", href: "service-state-certificates-civil-registration.html" },
  { term: "transport rto facilitation driving licence rc hsrp challan tax", title: "Transport & RTO Facilitation", href: "service-transport-rto-facilitation.html" },
  { term: "ration card NFSA ration kotedar member addition deletion correction APL BPL", title: "Ration Card Application Assistance", href: "service-ration-card-assistance.html" },
  { term: "pension welfare family id e-shram jeevan pramaan atal pension", title: "Pension & Welfare Schemes", href: "service-pension-welfare-schemes-assistance.html" },
  { term: "msme udyam registration small business", title: "MSME Registration", href: "service-business-registration-corporate-setup.html" },
  { term: "legal drafting court services affidavit agreement gazette notary rent agreement sale deed partnership deed nda", title: "Legal Drafting & Court Services Assistance", href: "service-legal-drafting-court-services.html" },
  { term: "fssai food license food business", title: "FSSAI Registration", href: "service-fssai-license.html" },
  { term: "shop license dukaan license trade license", title: "Shop License", href: "service-shop-license.html" },
  { term: "trademark brand registration tm", title: "Trademark", href: "service-trademark-registration.html" },
  { term: "company registration pvt ltd startup private limited", title: "Company Registration", href: "service-company-registration.html" },
  { term: "logo design logo banana brand logo", title: "Logo Design", href: "design-services.html#logo-design" },
  { term: "flex design banner design print", title: "Flex / Banner Design", href: "design-services.html#flex-design" },
  { term: "visiting card business card", title: "Visiting Card", href: "design-services.html#visiting-card" },
  { term: "social media post facebook instagram", title: "Social Media Post", href: "design-services.html#social-media-post" },
  { term: "scholarship form chatravritti up scholarship", title: "Scholarship Form", href: "edupoint.html#scholarship-form" },
  { term: "exam form ssc railway upsc up police", title: "Exam Form Filling", href: "edupoint.html#exam-form-filling" },
  { term: "result download mark sheet result check", title: "Result Download", href: "edupoint.html#result-download" },
  { term: "ccc o level computer course tally", title: "CCC / O Level", href: "edupoint.html#ccc-o-level" },
  { term: "google business profile maps ranking local seo", title: "Google Business Profile", href: "business-online-setup-services.html" },
  { term: "whatsapp business auto reply bot catalogue vcard qr code", title: "Business Online Setup", href: "business-online-setup-services.html" },
  { term: "mobile recharge jio airtel bsnl vi", title: "Mobile Recharge", href: "online-services.html" },
  { term: "electricity bill bijli bill uppcl", title: "Electricity Bill", href: "online-services.html" },
  { term: "fastag recharge toll highway", title: "FASTag Recharge", href: "online-services.html" },
  { term: "dth recharge tata sky dish tv airtel", title: "DTH Recharge", href: "online-services.html" },
  { term: "pm kisan kisan samman nidhi farmer", title: "PM Kisan", href: "service-pension-welfare-schemes-assistance.html" },
  { term: "pension old age widow atal pension", title: "Pension", href: "service-pension-welfare-schemes-assistance.html" },
  { term: "insurance pmsby pmjjby jeevan jyoti", title: "Insurance", href: "online-services.html" },
  { term: "photocopy print lamination scan xerox", title: "Print & Scan", href: "print-scan.html" },
  { term: "tour package yatra travel package", title: "Tour Package", href: "travel-services.html#tour-package" },
  { term: "iec code import export trading", title: "IEC Code", href: "service-iec-code.html" },
  { term: "logo sticker waterproof sticker vinyl holographic label packaging print", title: "Sticker Printing", href: "products.html#sticker-printing" },
  { term: "uv dtf cup bottle glass acrylic name plate logo transfer branding", title: "UV DTF Printing", href: "products.html#uv-dtf-printing" },
  { term: "custom tshirt t shirt hoodie polo couple dtf transfer", title: "T-Shirt Printing", href: "products.html#t-shirt-printing" },
  { term: "photo frame led frame magic mug mobile cover spotify plaque gift", title: "Personalized Gifts", href: "products.html#personalized-gifts" },
  { term: "visiting card pvc flyer menu card barcode thank you card business branding", title: "Business Branding", href: "products.html#business-branding" },
  { term: "about us company info one point", title: "About Us", href: "about.html" },
  { term: "contact whatsapp helpline support", title: "Contact Support", href: "contact.html" },
  { term: "track application status check", title: "Track Application", href: "track-application.html" },
  { term: "google business profile optimization maps ranking local seo", title: "Google Business Profile Optimization", href: "business-online-setup-services.html" },
  { term: "google review management setup feedback automated qr", title: "Google Review Management Setup", href: "business-online-setup-services.html" },
  { term: "whatsapp business profile setup catalog location hours", title: "WhatsApp Business Profile Setup", href: "business-online-setup-services.html" },
  { term: "whatsapp auto reply setup bot automated response", title: "WhatsApp Auto Reply Setup", href: "business-online-setup-services.html" },
  { term: "business qr code creation payment google review vcard", title: "Business QR Code Creation", href: "business-online-setup-services.html" },
  { term: "digital visiting card creation vcard interactive click to call", title: "Digital Visiting Card Creation", href: "business-online-setup-services.html" },
  { term: "online catalogue creation product showcase PDF catalog", title: "Online Catalogue Creation", href: "business-online-setup-services.html" },
  { term: "business email signature design professional email header footer", title: "Business Email Signature Design", href: "business-online-setup-services.html" },
  { term: "email template creation HTML newsletter promo template", title: "Email Template Creation", href: "business-online-setup-services.html" },
  { term: "business automation setup workflow CRM leads auto message", title: "Business Automation Setup", href: "business-online-setup-services.html" },
  { term: "admission assistance school college iti nios bed nursing university", title: "Admission Assistance", href: "edupoint-admission-assistance.html" },
  { term: "competitive exams upsc ssc rrb ibps police neet jee psc", title: "Competitive Exams", href: "edupoint-competitive-exams.html" },
  { term: "university services degree certificate marksheet migration scrutiny", title: "University Services", href: "edupoint-university-services.html" },
  { term: "scholarship assistance nsp up state obc sc st merit post matric", title: "Scholarship Assistance", href: "edupoint-scholarship-assistance.html" },
  { term: "student digital services digilocker abc id apaar id otr", title: "Student Digital Services", href: "edupoint-student-digital-services.html" },
  { term: "admit card and results scorecard result check choice filling", title: "Admit Card & Results", href: "edupoint-admit-card-results.html" },
  { term: "online fee payments college university exam hostel fee", title: "Online Fee Payments", href: "edupoint-online-payments.html" },
  { term: "study academic support assignment project thesis dissertation", title: "Study & Academic Support", href: "edupoint-study-academic-support.html" },
  { term: "printing documentation color print xerox scan pdf photo lamination", title: "Printing & Documentation", href: "edupoint-printing-documentation.html" },
  { term: "career services resume writing cv cover letter sop lor portfolio", title: "Career Services", href: "edupoint-career-services.html" }
];

function getCurrentPage() {
  const path = window.location.pathname.split("/").pop();
  return path || "index.html";
}

function icon(name, size = 18) {
  return `<i data-lucide="${name}" aria-hidden="true" style="width:${size}px;height:${size}px"></i>`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const panServiceTypes = new Set(["New PAN", "PAN Correction", "E-PAN Download", "Card Reprint"]);
const panDisplayServiceAliases = new Map([
  ["PAN Card Application Assistance", { key: "New PAN", slug: "new-pan" }],
  ["PAN Card Correction & Update Support", { key: "PAN Correction", slug: "pan-correction" }],
  ["PAN Card Reprint Assistance", { key: "Card Reprint", slug: "card-reprint" }],
  ["Instant e-PAN Download Guidance", { key: "E-PAN Download", slug: "e-pan-download" }]
]);

function panServiceAlias(label = "") {
  return panDisplayServiceAliases.get(String(label || "").trim()) || null;
}
const servicePageByCategory = {
  "e-services": "online-services.html",
  "csc-services": "business-online-setup-services.html",
  "business-online-setup": "business-online-setup-services.html",
  proserve: "business-solutions.html",
  business: "business-solutions.html",
  student: "edupoint.html",
  edupoint: "edupoint.html",
  "print-scan": "print-scan.html",
  documentation: "print-scan.html",
  travel: "travel-services.html",
  "travel-services": "travel-services.html",
  design: "design-services.html",
  "design-services": "design-services.html",
  onemart: "products.html",
  products: "products.html",
  support: "support.html"
};

function serviceApplyHref(service, category = "general") {
  if (isWhatsAppLaunchMode()) return buildServiceWhatsAppUrl(service, category);
  const serviceName = (service || "General Support").trim();
  const panAlias = panServiceAlias(serviceName);
  const params = new URLSearchParams();
  params.set("service", panAlias?.slug || slugify(serviceName) || "general-support");
  params.set("service_name", serviceName);
  if (category && category !== "general") params.set("category", category);
  return `checkout.html?${params.toString()}`;
}

function isPanServiceLabel(label = "") {
  const value = label.toLowerCase();
  return /(^|\s|-)pan(\s|-|$)|e-pan|card reprint/.test(value) && !value.includes("ayushman");
}

function redirectLegacyServiceContact() {
  if (getCurrentPage() !== "contact.html") return;
  const params = new URLSearchParams(window.location.search);
  const service = params.get("service");
  if (!service) return;
  window.location.replace(serviceApplyHref(service, params.get("category") || "general"));
}

function productBySlug(slug) {
  return oneMartProducts.find((product) => product.slug === slug);
}

function productByName(name) {
  return oneMartProducts.find((product) => product.name === name);
}

function routeForService(label, fallback = "contact.html") {
  const product = productByName(label);
  if (product) return product.href;
  if (isWhatsAppLaunchMode()) return buildServiceWhatsAppUrl(label);
  return serviceRoutes[label] || fallback;
}

function contactHref(service, category = "general") {
  return serviceApplyHref(service, category);
}

const serviceIcons = {
  "Exam Form Filling": "file-text",
  "Admit Card Download": "download",
  "Result Download": "award",
  "Scholarship Form": "book-open",
  "CCC / O Level": "monitor",
  "University Services": "graduation-cap",
  "Photocopy & Printing": "printer",
  "Lamination": "layers",
  "Online Test": "check-circle",
  "Resume Builder": "file-user",
  "PAN Card": "credit-card",
  "Ayushman Card": "heart-pulse",
  "Voter ID": "vote",
  "Passport Assistance": "plane",
  "Aadhaar Services Assistance": "fingerprint",
  "Income Certificate": "indian-rupee",
  "Domicile": "home",
  "Domicile Certificate": "home",
  "Caste Certificate": "users",
  "Pension & Welfare Schemes": "landmark",
  "GST Registration": "calculator",
  "MSME Registration": "factory",
  "Digital Signature": "key",
  "FSSAI": "utensils",
  "Shop License": "store",
  "IEC Code": "globe",
  "Trademark": "stamp",
  "Company Registration": "building"
};

const overviewIcons = {
  "EduPoint": "graduation-cap",
  "E-Services": "globe-2",
  "ProServe": "briefcase"
};

const servicesMegaGroups = [
  {
    title: "E-Services",
    icon: "globe",
    desc: "PAN, Citizen Security, voter ID, passport and certificates.",
    href: "online-services.html",
    items: [
      ["PAN Card Assistance", "service-pan-card.html", "Apply for new PAN card or request corrections.", "credit-card"],
      ["Citizen Security Assistance", "service-citizen-security-cybercrime-police-help.html", "Police verification, Cybercrime, LDR & Citizen Safety support.", "shield-alert"],
      ["Voter ID Card", "service-voter-id.html", "Apply for new Voter ID card or update details.", "user-check"],
      ["Passport Assistance", "service-passport-assistance.html", "File fresh passport applications or renewals.", "file-text"],
      ["Aadhaar Services Assistance", "service-aadhaar-services-assistance.html", "Aadhaar enrolment, detail update and PVC card support.", "fingerprint"],
      ["State Certificates & Civil Registration", "service-state-certificates-civil-registration.html", "Income, domicile, caste, birth, death, marriage & civil certificate support.", "file-check-2"],
      ["Transport & RTO Facilitation", "service-transport-rto-facilitation.html", "Learner's & Driving Licence, RC transfers, HSRP & tax support.", "car"],
      ["Ration Card Application Assistance", "service-ration-card-assistance.html", "New ration card, member addition/deletion & correction support.", "credit-card"],
      ["Pension & Welfare Schemes", "service-pension-welfare-schemes-assistance.html", "Pension, Family ID, Jeevan Pramaan and e-Shram support.", "landmark"]
    ]
  },
  {
    title: "EduPoint",
    icon: "graduation-cap",
    desc: "Exam forms, admissions, university services, scholarships, admit cards, printing and career support.",
    href: "edupoint.html",
    items: [
      ["Admission Assistance", "edupoint-admission-assistance.html", "School, College, ITI, B.Ed, Nursing, NIOS & University admissions.", "school"],
      ["Competitive Exams", "edupoint-competitive-exams.html", "UPSC, SSC, RRB, IBPS, Police, NEET, JEE & State PSC applications.", "award"],
      ["University Services", "edupoint-university-services.html", "Exam forms, Degree certificates, Marksheets, Migration & Scrutiny.", "building-2"],
      ["Scholarship Assistance", "edupoint-scholarship-assistance.html", "NSP, UP State, OBC, SC/ST, Merit & Post-Matric scholarship forms.", "badge-indian-rupee"],
      ["Student Digital Services", "edupoint-student-digital-services.html", "DigiLocker, ABC ID, APAAR ID, OTR & University portal registrations.", "layout-grid"],
      ["Admit Card & Results", "edupoint-admit-card-results.html", "Admit card download, Result check, Scorecard, Choice filling.", "ticket-check"],
      ["Online Payments", "edupoint-online-payments.html", "College, University, Exam & Hostel fee online payments.", "credit-card"],
      ["Study & Academic Support", "edupoint-study-academic-support.html", "Assignment, Project, Thesis, Dissertation printing & citations.", "book-open"],
      ["Printing & Documentation", "edupoint-printing-documentation.html", "Color print, Xerox, Scanning, PDF merge/split, Photos & Lamination.", "printer"],
      ["Career Services", "edupoint-career-services.html", "Resume writing, CV preparation, Cover Letter, SOP, LOR & Portfolios.", "briefcase"]
    ]
  },
  {
    title: "ProServe",
    icon: "briefcase",
    desc: "Income tax, GST, business registration & legal drafting assistance.",
    href: "business-solutions.html",
    items: [
      ["Income Tax Assistance", "service-income-tax-assistance.html", "ITR filing consultancy, portal registration, Form 26AS, AIS/TIS & refund check.", "receipt"],
      ["GST Registration", "service-gst-registration.html", "GST registration, profile review and return guidance.", "coins"],
      ["Business Registration & Corporate Setup", "service-business-registration-corporate-setup.html", "Register your business for Udyam/MSME benefits.", "building-2"],
      ["Legal Drafting & Court Services Assistance", "service-legal-drafting-court-services.html", "Affidavit, rent agreement, gazette name change, notary & legal drafting assistance.", "scale"]
    ]
  },
  {
    title: "OneMart",
    icon: "shopping-bag",
    desc: "Custom sticker printing, t-shirts, personalized gifts and business branding products.",
    href: "products.html",
    items: [
      ["Sticker Printing", "products.html#sticker-printing", "Logo, waterproof, vinyl and holographic sticker printing.", "tag"],
      ["T-Shirt Printing", "products.html#t-shirt-printing", "Custom DTF, couple t-shirts and polo shirt printing.", "shirt"],
      ["Personalized Gifts", "products.html#personalized-gifts", "Photo frames, LED frames, magic mugs and mobile covers.", "gift"],
      ["Business Branding", "products.html#business-branding", "Visiting cards, PVC cards, flyers, menu cards and banners.", "briefcase"]
    ]
  },
  {
    title: "Travel Services",
    icon: "plane",
    desc: "Bus, train, flight, hotel, tour and passport travel support.",
    href: "travel-services.html",
    items: [
      ["Bus Ticket", "travel-services.html#bus-ticket", "Book sleeper and AC bus tickets across major routes.", "bus"],
      ["Train Ticket", "travel-services.html#train-ticket", "IRCTC authorized railway ticket booking assistance.", "train"],
      ["Flight Ticket", "travel-services.html#flight-ticket", "Domestic and international flight ticket bookings.", "plane"],
      ["Hotel Booking", "travel-services.html#hotel-booking", "Budget-friendly hotel room reservations.", "hotel"]
    ]
  },
  {
    title: "Business Online Setup Services",
    icon: "globe",
    desc: "Google profile optimization, WhatsApp setup, vCards, QR codes & automation.",
    href: "business-online-setup-services.html",
    items: [
      ["Google Business Profile", "business-online-setup-services.html", "Optimize Google Maps profile and local SEO rank.", "map-pin"],
      ["Google Review Setup", "business-online-setup-services.html", "Automated Google review collection link & QR code.", "star"],
      ["WhatsApp Business Setup", "business-online-setup-services.html", "Setup product catalog, auto-reply, location and hours.", "message-square"],
      ["Digital Visiting Card", "business-online-setup-services.html", "Interactive vCard with click-to-call & social links.", "contact-2"]
    ]
  },
  {
    title: "Print & Scan",
    icon: "printer",
    desc: "Photocopy, color print, scanning, lamination and ID card printing.",
    href: "print-scan.html",
    items: [
      ["Photocopy & Print", "service-photocopy-printing.html", "B&W and color page printing from mobile/email.", "copy"],
      ["Color Printing", "service-color-printing.html", "Premium photo printing and document copies.", "image"],
      ["Document Scanning", "service-document-scanning.html", "Scan certificates and forms to PDF or JPEG formats.", "scan"],
      ["Lamination Support", "service-lamination.html", "Protect cards and certificates with plastic seal.", "layers"]
    ]
  },
  {
    title: "Design Services",
    icon: "palette",
    desc: "Visiting card, banner, flex, logo and small business brand support.",
    href: "design-services.html",
    items: [
      ["Visiting Card", "design-services.html#visiting-card", "Custom business card designs with premium finish.", "contact"],
      ["Banner Design", "design-services.html#banner-design", "Promotional banners for shops, events, and festivals.", "layout"],
      ["Flex & Banner", "design-services.html#flex-design", "High-resolution flex banner layout and printing.", "maximize"],
      ["Logo Design", "design-services.html#logo-design", "Unique brand logo creations for small businesses.", "palette"]
    ]
  },
  {
    title: "Recharge & Bills",
    icon: "smartphone",
    desc: "Mobile recharge, electricity bill, DTH recharge and utility support.",
    href: "online-services.html",
    items: [
      ["Mobile Recharge", "online-services.html", "Prepaid and postpaid recharges for Jio, Airtel, VI.", "smartphone"],
      ["Electricity Bill", "online-services.html", "Pay electricity bills online without extra charges.", "zap"],
      ["DTH Recharge", "online-services.html", "Recharge Tata Play, Dish TV, Airtel DTH, Videocon.", "tv"],
      ["FASTag Recharge", "online-services.html", "Instant highway toll card recharge assistance.", "tag"]
    ]
  }
];

function renderNav() {
  const navRoot = document.querySelector("[data-site-nav]");
  if (!navRoot) return;

  const current = getCurrentPage();

  const megaHtml = `
    <div class="mega-split-container">
      <div class="mega-sidebar">
        ${servicesMegaGroups.map((group, idx) => `
          <a class="mega-sidebar-item${idx === 0 ? ' active' : ''}" data-sidebar-idx="${idx}" href="${group.href}">
            <span class="sidebar-item-title">${icon(group.icon, 16)} <span>${group.title}</span></span>
            ${icon("chevron-right", 14)}
          </a>
        `).join("")}
      </div>
      <div class="mega-content-panel" style="opacity: 1; transition: opacity 0.15s ease;">
        <div class="mega-content-header">
          <h3 class="mega-content-title">${servicesMegaGroups[0].title}</h3>
          <p class="mega-content-desc">${servicesMegaGroups[0].desc}</p>
          <a class="mega-browse-link" href="${servicesMegaGroups[0].href}">Browse all ${servicesMegaGroups[0].title} ${icon("arrow-right", 13)}</a>
        </div>
        <div class="mega-items-grid">
          ${servicesMegaGroups[0].items.map(([label, href, desc, iconName]) => `
            <a class="mega-grid-item" href="${href}">
              <div class="mega-grid-item-icon">
                ${icon(iconName || 'file-text', 18)}
              </div>
              <div class="mega-grid-item-content">
                <h4 class="mega-grid-item-title">${label}</h4>
                <p class="mega-grid-item-desc">${desc || 'Access online application and support services.'}</p>
              </div>
            </a>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  const newNavItems = [
    { label: "Home", href: "index.html" },
    { label: "Services", href: "services.html", isMega: true },
    { label: "OneMart", href: "products.html" },
    { label: "Track Status", href: "track-application.html" },
    { label: "Portals", isPortals: true }
  ];

  const desktopNavHtml = newNavItems.map(item => {
    const active = current === item.href ? "active" : "";
    if (item.isMega) {
      return `
        <div class="nav-item nav-item-mega">
          <a class="nav-trigger ${active}" href="${item.href}" aria-haspopup="true" aria-expanded="false" data-dropdown-trigger>${item.label} ${icon("chevron-down", 15)}</a>
          <div class="mega-menu utilities-mega onemart-mega" aria-label="Services Categories">
            ${megaHtml}
          </div>
        </div>
      `;
    }
    if (item.isPortals) {
      return `
        <div class="nav-item nav-item-portals">
          <button class="nav-trigger" type="button" aria-haspopup="true" aria-expanded="false">
            ${icon("user", 16)} ${item.label} ${icon("chevron-down", 15)}
          </button>
          <div class="submenu portals-submenu" aria-label="Portals">
            <a href="customer-account-overview.html" class="portal-menu-link">
              ${icon("user-circle", 18)} Customer Account
            </a>
            <a href="admin.html" class="portal-menu-link">
              ${icon("shield-check", 18)} Admin Dashboard
            </a>
            <div class="portal-menu-divider"></div>
            <a href="login.html" class="portal-menu-link" data-customer-guest>
              ${icon("log-in", 18)} Secure Login
            </a>
            <a href="customer-account-overview.html" class="portal-menu-link" data-customer-auth hidden>
              ${icon("layout-dashboard", 18)} My Account
            </a>
          </div>
        </div>
      `;
    }
    return `<a class="nav-link ${active}" href="${item.href}">${item.label}</a>`;
  }).join("");

  const mobilePopularLinks = [
    ["PAN Card", "service-pan-card.html", "credit-card"],
    ["Aadhaar", "service-aadhaar-services-assistance.html", "fingerprint"],
    ["GST", "service-gst-registration.html", "coins"],
    ["Track", "track-application.html", "search-check"]
  ].map(([label, href, iconName]) => `
    <a class="mobile-quick-chip" href="${href}">
      ${icon(iconName, 15)}
      <span>${label}</span>
    </a>
  `).join("");

  const mobileAccordions = servicesMegaGroups.map((group, idx) => `
    <section class="mobile-accordion mobile-mega-card${idx === 0 ? ' open' : ''}" data-mobile-menu-text="${group.title} ${group.desc} ${group.items.map(([label]) => label).join(' ')}">
      <button class="nav-trigger mobile-mega-trigger" type="button" aria-expanded="${idx === 0 ? 'true' : 'false'}" data-mobile-accordion>
        <span class="mobile-mega-icon">${icon(group.icon, 18)}</span>
        <span class="mobile-mega-copy">
          <strong>${group.title}</strong>
          <small>${group.desc}</small>
        </span>
        <span class="mobile-mega-count">${group.items.length}</span>
        ${icon("chevron-down", 16)}
      </button>
      <div class="mobile-accordion-panel">
        <a class="mobile-overview-link" href="${group.href}">
          ${icon("arrow-up-right", 14)}
          <span>Browse all ${group.title}</span>
        </a>
        <div class="mobile-service-list">
          ${group.items.map(([label, href, desc, iconName]) => `
            <a class="mobile-service-link" href="${href}" data-mobile-menu-text="${label} ${desc || ''}">
              <span class="mobile-service-icon">${icon(iconName || "file-text", 16)}</span>
              <span class="mobile-service-copy">
                <strong>${label}</strong>
                <small>${desc || "Access online application and support services."}</small>
              </span>
            </a>
          `).join("")}
        </div>
      </div>
    </section>
  `).join("");

  navRoot.innerHTML = `
    <header class="site-header">
      <div class="top-contact-bar">
        <div class="top-contact-inner">
          <div class="top-contact-links">
            <a href="${siteConfig.phoneHref}" class="top-contact-link">${icon("phone", 14)} ${siteConfig.phone}</a>
            <a href="${siteConfig.whatsapp}" target="_blank" class="top-contact-link">${icon("message-circle", 14)} WhatsApp</a>
            <a href="mailto:${siteConfig.email}" class="top-contact-link hide-mobile-sm">${icon("mail", 14)} ${siteConfig.email}</a>
          </div>
          <div class="top-contact-links hide-mobile-sm top-hours">
            <span>${icon("clock", 14)} ${siteConfig.hours}</span>
          </div>
        </div>
      </div>
      <nav class="nav-bar" aria-label="Primary">
        <a class="brand" href="index.html" aria-label="One Point Digital Services home">
          <img class="brand-logo brand-logo-header" src="${siteConfig.logoHeader}" alt="Bisen One Point Suvidha Kendra">
        </a>
        <div class="nav-menu" id="nav-menu">
          <div class="desktop-nav-menu">
            ${desktopNavHtml}
          </div>
          <div class="mobile-nav-menu">
            <div class="mobile-nav-head">
              <span>
                <span class="mobile-nav-title">Services Menu</span>
                <small class="mobile-nav-subtitle">Search, choose category, then apply.</small>
              </span>
              <button class="mobile-nav-close" type="button" aria-label="Close menu" data-mobile-close>${icon("x", 22)}</button>
            </div>
            <div class="mobile-menu-search">
              ${icon("search", 17)}
              <input type="search" data-mobile-menu-search placeholder="Search PAN, GST, admit card...">
            </div>
            <div class="mobile-quick-grid">
              ${mobilePopularLinks}
            </div>
            <a class="nav-link mobile-home-link ${current === "index.html" ? "active" : ""}" href="index.html">${icon("home", 17)} Home</a>
            ${mobileAccordions}
            <div class="mobile-accordion">
              <button class="nav-trigger" type="button" aria-expanded="false" data-mobile-accordion>
                <span>${icon("user", 17)} Portals & Login</span>
                ${icon("chevron-down", 15)}
              </button>
              <div class="mobile-accordion-panel">
                <a href="customer-account-overview.html">${icon("user-circle", 14)} Customer Account</a>
                <a href="admin.html">${icon("shield-check", 14)} Admin Dashboard</a>
                <a href="login.html" data-customer-guest>${icon("log-in", 14)} Secure Login</a>
                <a href="customer-account-overview.html" data-customer-auth hidden>${icon("layout-dashboard", 14)} My Account</a>
                <a href="customer-profile.html" data-customer-auth hidden>${icon("user-round", 14)} My Profile</a>
                <button type="button" class="mobile-account-logout" data-customer-logout data-customer-auth hidden>${icon("log-out", 14)} Logout</button>
              </div>
            </div>
            <a class="nav-link ${current === "track-application.html" ? "active" : ""}" href="track-application.html">${icon("search", 17)} Track Status</a>
            <a class="nav-link ${current === "contact.html" ? "active" : ""}" href="contact.html">${icon("message-circle", 17)} Contact Support</a>
          </div>
        </div>
        <div class="nav-actions">
          <button class="icon-button cart-nav-button nav-action-glass" type="button" aria-label="Open OneMart cart" title="Cart" data-cart-button>${icon("shopping-cart", 19)}<span data-cart-count>0</span></button>
          <div class="customer-nav-account" data-customer-nav-account>
            <a class="icon-button nav-action-glass customer-guest-login" href="login.html" aria-label="Customer login" title="Customer login" data-customer-guest>${icon("log-in", 19)}</a>
            <button class="customer-account-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Open customer account menu" title="Customer account — signed in" data-customer-account-trigger data-customer-auth hidden>
              <span class="customer-account-avatar" data-customer-initials>C</span>
              <span class="customer-online-indicator" aria-hidden="true"></span>
            </button>
            <div class="customer-account-menu" role="menu" data-customer-account-menu hidden>
              <div class="customer-account-menu-head">
                <span class="customer-account-avatar" data-customer-initials>C</span>
                <span><strong data-customer-name>Customer</strong><small>Signed in securely</small></span>
              </div>
              <a role="menuitem" href="customer-account-overview.html">${icon("layout-dashboard", 16)} Account Overview</a>
              <a role="menuitem" href="customer-account-orders.html">${icon("package", 16)} My Orders</a>
              <a role="menuitem" href="customer-account-payments.html">${icon("credit-card", 16)} Payments</a>
              <a role="menuitem" href="customer-profile.html">${icon("user-round", 16)} My Profile</a>
              <button type="button" role="menuitem" data-customer-logout>${icon("log-out", 16)} Logout</button>
            </div>
          </div>
          <a class="btn btn-gold" href="services.html">${icon("sparkles", 18)} Get Started</a>
          <button class="icon-button mobile-toggle nav-action-glass" aria-label="Open menu" aria-expanded="false" data-mobile-toggle>${icon("menu", 21)}</button>
        </div>
      </nav>
      <div class="nav-backdrop" data-nav-backdrop></div>
    </header>
  `;
}

const OPDSCustomerSession = (() => {
  const TOKEN_KEY = "opds_customer_session";
  const PROFILE_KEY = "opds_customer_profile";
  const ACTIVITY_KEY = "opds_customer_last_activity";
  const EVENT_KEY = "opds_customer_session_event";
  const IDLE_LIMIT_MS = 30 * 60 * 1000;
  const HEARTBEAT_MS = 5 * 60 * 1000;
  const ACTIVITY_WRITE_THROTTLE_MS = 30 * 1000;
  let currentUser = null;
  let lastActivityWrite = 0;
  let lastValidation = 0;
  let validationPromise = null;
  let heartbeatTimer = null;
  let idleTimer = null;
  let menuBound = false;
  let expiring = false;

  function storageGet(key) {
    try { return window.localStorage.getItem(key) || ""; } catch { return ""; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  }

  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ }
  }

  function sessionToken() { return storageGet(TOKEN_KEY); }

  function cachedProfile() {
    try { return JSON.parse(storageGet(PROFILE_KEY) || "null"); } catch { return null; }
  }

  function customerInitials(name) {
    const parts = String(name || "Customer").trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C");
  }

  function isProtectedAccountPage() {
    return Boolean(document.body?.dataset?.accountPage || document.body?.hasAttribute("data-cpf-shell"));
  }

  function loginUrl() {
    const target = `${window.location.pathname}${window.location.search}`;
    return `login.html?returnUrl=${encodeURIComponent(target)}`;
  }

  function setAccountMenu(open) {
    const trigger = document.querySelector("[data-customer-account-trigger]");
    const menu = document.querySelector("[data-customer-account-menu]");
    if (!trigger || !menu) return;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    menu.hidden = !open;
  }

  function renderHeader(user) {
    currentUser = user || null;
    const signedIn = Boolean(currentUser && sessionToken());
    document.documentElement.classList.toggle("customer-session-active", signedIn);
    document.querySelectorAll("[data-customer-guest]").forEach((element) => {
      element.hidden = signedIn;
      if (!signedIn && element.tagName === "A" && element.getAttribute("href")?.startsWith("login.html")) {
        element.setAttribute("href", loginUrl());
      }
    });
    document.querySelectorAll("[data-customer-auth]").forEach((element) => { element.hidden = !signedIn; });
    if (!signedIn) {
      setAccountMenu(false);
      return;
    }
    const name = String(currentUser.name || currentUser.displayName || "Customer").trim() || "Customer";
    const initials = customerInitials(name);
    document.querySelectorAll("[data-customer-name]").forEach((element) => { element.textContent = name; });
    document.querySelectorAll("[data-customer-initials]").forEach((element) => { element.textContent = initials; });
  }

  function broadcast(type) {
    storageSet(EVENT_KEY, JSON.stringify({ type, at: Date.now() }));
  }

  function clearLocalSession({ notify = true } = {}) {
    storageRemove(TOKEN_KEY);
    storageRemove(PROFILE_KEY);
    storageRemove("opds_customer_phone");
    storageRemove("opds_customer_email");
    storageRemove("opds_testing_user");
    storageRemove(ACTIVITY_KEY);
    if (notify) broadcast("logout");
    renderHeader(null);
  }

  async function revokeToken(token) {
    if (!token) return;
    try {
      const csrfResponse = await fetch("/api/csrf", { credentials: "same-origin" });
      const csrfData = await csrfResponse.json().catch(() => ({}));
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-Session-Token": token,
          ...(csrfData.csrfToken ? { "X-CSRF-Token": csrfData.csrfToken } : {})
        }
      });
    } catch { /* logout remains successful locally */ }
  }

  function redirectExpired(reason) {
    if (!isProtectedAccountPage()) return;
    const suffix = reason === "idle" ? "&reason=inactive" : "";
    window.location.href = `${loginUrl()}${suffix}`;
  }

  async function logout(options = {}) {
    const token = sessionToken();
    clearLocalSession({ notify: true });
    await revokeToken(token);
    if (options.redirect !== false) {
      window.location.href = options.destination || "login.html?reason=logout";
    }
  }

  function activityTime() {
    const value = Number(storageGet(ACTIVITY_KEY) || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function recordActivity(force = false) {
    if (!sessionToken()) return;
    const now = Date.now();
    const previous = activityTime();
    if (previous && now - previous >= IDLE_LIMIT_MS) {
      expireForInactivity();
      return;
    }
    if (!force && now - lastActivityWrite < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastActivityWrite = now;
    storageSet(ACTIVITY_KEY, String(now));
  }

  function isIdle() {
    const last = activityTime();
    return Boolean(sessionToken() && last && Date.now() - last >= IDLE_LIMIT_MS);
  }

  async function expireForInactivity() {
    if (expiring || !sessionToken()) return;
    expiring = true;
    const token = sessionToken();
    clearLocalSession({ notify: true });
    try {
      await revokeToken(token);
      redirectExpired("idle");
    } finally {
      expiring = false;
    }
  }

  async function validate({ force = false } = {}) {
    const token = sessionToken();
    if (!token) { renderHeader(null); return null; }
    if (!activityTime()) recordActivity(true);
    if (isIdle()) { await expireForInactivity(); return null; }
    if (!force && currentUser && Date.now() - lastValidation < 60 * 1000) return currentUser;
    if (validationPromise) return validationPromise;
    validationPromise = (async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "same-origin",
          headers: { "X-Session-Token": token, "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Session expired");
        const data = await response.json();
        lastValidation = Date.now();
        currentUser = data.user || cachedProfile() || { name: "Customer" };
        storageSet(PROFILE_KEY, JSON.stringify(currentUser));
        renderHeader(currentUser);
        return currentUser;
      } catch {
        clearLocalSession({ notify: true });
        redirectExpired("invalid");
        return null;
      } finally {
        validationPromise = null;
      }
    })();
    return validationPromise;
  }

  async function heartbeat() {
    if (!sessionToken()) return;
    if (isIdle()) { await expireForInactivity(); return; }
    const last = activityTime();
    if (Date.now() - last < IDLE_LIMIT_MS) await validate({ force: true });
  }

  function bindAccountMenu() {
    if (menuBound) return;
    menuBound = true;
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-customer-account-trigger]");
      if (trigger) {
        const open = trigger.getAttribute("aria-expanded") !== "true";
        setAccountMenu(open);
        return;
      }
      if (!event.target.closest("[data-customer-account-menu]")) setAccountMenu(false);
      const logoutButton = event.target.closest("[data-customer-logout]");
      if (logoutButton) {
        event.preventDefault();
        logoutButton.disabled = true;
        logout();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const trigger = document.querySelector("[data-customer-account-trigger]");
        const wasOpen = trigger?.getAttribute("aria-expanded") === "true";
        setAccountMenu(false);
        if (wasOpen) trigger?.focus();
      }
    });
  }

  function bindActivityTracking() {
    ["pointerdown", "keydown", "touchstart", "scroll"].forEach((eventName) => {
      window.addEventListener(eventName, () => recordActivity(false), { passive: true, capture: true });
    });
    window.addEventListener("focus", () => { if (isIdle()) expireForInactivity(); else validate(); });
    window.addEventListener("pageshow", () => { if (isIdle()) expireForInactivity(); else validate(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (isIdle()) expireForInactivity();
      else validate({ force: Date.now() - lastValidation >= HEARTBEAT_MS });
    });
    window.addEventListener("storage", (event) => {
      if (event.key === EVENT_KEY && event.newValue) {
        let message = null;
        try { message = JSON.parse(event.newValue); } catch { /* ignore */ }
        if (message?.type === "logout") {
          clearLocalSession({ notify: false });
          redirectExpired("invalid");
        } else if (message?.type === "login") {
          validate({ force: true });
        }
      }
    });
  }

  function accept(user, session = {}) {
    if (session.token) storageSet(TOKEN_KEY, session.token);
    if (user) storageSet(PROFILE_KEY, JSON.stringify(user));
    recordActivity(true);
    broadcast("login");
    renderHeader(user || cachedProfile());
    validate({ force: true });
  }

  function init() {
    bindAccountMenu();
    bindActivityTracking();
    const token = sessionToken();
    if (token) {
      const cached = cachedProfile();
      if (cached) renderHeader(cached);
      if (!activityTime()) recordActivity(true);
      validate({ force: true });
    } else {
      renderHeader(null);
    }
    heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS);
    idleTimer = window.setInterval(() => { if (isIdle()) expireForInactivity(); }, 30 * 1000);
  }

  return { init, accept, validate, logout, recordActivity, get user() { return currentUser; } };
})();

window.OPDSCustomerSession = OPDSCustomerSession;

function renderFooter() {
  const footerRoot = document.querySelector("[data-site-footer]");
  if (!footerRoot) return;

  footerRoot.innerHTML = `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand-block">
            <a class="brand footer-brand" href="index.html">
              <img class="brand-logo brand-logo-footer" src="${siteConfig.logoFooter}" alt="Bisen One Point Suvidha Kendra">
            </a>
            <p>Digital, government, student, business and store services with local guidance, UPI receipt support and application tracking.</p>
            <div class="footer-contact-row">
              <span>${icon("map-pin", 16)} ${siteConfig.address}</span>
              <span>${icon("clock", 16)} ${siteConfig.hours}</span>
            </div>
            <div class="footer-actions">
              <a class="btn footer-pill" href="${siteConfig.whatsapp}" target="_blank">${icon("message-circle", 18)} Chat on WhatsApp</a>
              <a class="btn footer-pill" href="${siteConfig.mapUrl}" target="_blank">${icon("map", 18)} View Location on Google Maps</a>
              ${launchConfig.razorpayPaymentLink ? `<a class="btn footer-pill" href="${launchConfig.razorpayPaymentLink}" target="_blank" rel="noopener">${icon("shield-check", 18)} Pay Online Securely</a>` : ""}
            </div>
          </div>
          <div class="footer-map-card">
            <iframe title="One Point Digital Services location map" src="${siteConfig.mapEmbedUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            <div>
              <strong>${siteConfig.address}</strong>
              <span>Exact visit details can be confirmed on WhatsApp before arrival.</span>
            </div>
          </div>
        </div>
        <div class="footer-middle">
          <div>
            <h4>Services</h4>
            <div class="footer-links">
              <a href="service-pan-card.html">PAN Card</a>
              <a href="service-ayushman-card.html">Ayushman Card</a>
              <a href="service-gst-registration.html">GST Registration</a>
            </div>
          </div>
          <div>
            <h4>Students</h4>
            <div class="footer-links">
              <a href="edupoint.html#exam-form-filling">Exam Forms</a>
              <a href="edupoint.html#admit-card-download">Admit Card</a>
              <a href="edupoint.html#resume">Resume Builder</a>
              <a href="edupoint.html#ccc-o-level">CCC / O Level</a>
            </div>
          </div>
          <div>
            <h4>Store</h4>
            <div class="footer-links">
              <a href="products.html#sticker-printing">Sticker Printing</a>
              <a href="products.html#uv-dtf-printing">UV DTF</a>
              <a href="products.html#t-shirt-printing">T-Shirts</a>
              <a href="products.html#personalized-gifts">Personalized Gifts</a>
            </div>
          </div>
          <div>
            <h4>Support</h4>
            <div class="footer-links">
              <a href="track-application.html">Track Application</a>
              <a href="support.html">Support Center</a>
              <a href="about.html">About One Point</a>
              <a href="faq.html">FAQ</a>
              <a href="contact.html">Contact Us</a>
              <a href="${siteConfig.whatsapp}" target="_blank">WhatsApp Help</a>
            </div>
          </div>
          <div>
            <h4>Legal</h4>
            <div class="footer-links">
              <a href="privacy.html">Privacy Policy</a>
              <a href="terms.html">Terms</a>
              <a href="refund-policy.html">Refund Policy</a>
              <a href="disclaimer.html">Disclaimer</a>
            </div>
          </div>
        </div>
        <div class="footer-trust-badges">
          <div class="trust-badge-item">
            ${icon("credit-card", 15)}
            <span>Secure Payments</span>
          </div>
          <div class="trust-badge-item">
            ${icon("shield-check", 15)}
            <span>SSL Protected</span>
          </div>
          <div class="trust-badge-item">
            ${icon("lock", 15)}
            <span>Data Privacy</span>
          </div>
          <div class="trust-badge-item">
            ${icon("map-pin", 15)}
            <span>Local Support</span>
          </div>
          <div class="trust-badge-item">
            ${icon("file-check-2", 15)}
            <span>Govt Assistance</span>
          </div>
        </div>
        <div class="footer-bottom">
          <span>2026 One Point Digital Services. All rights reserved.</span>
          <span class="footer-bottom-links">
            <a href="${siteConfig.phoneHref}">${siteConfig.phone}</a>
            <a href="mailto:${siteConfig.email}">${siteConfig.email}</a>
            <a href="privacy.html">Privacy</a>
            <a href="terms.html">Terms</a>
          </span>
        </div>
      </div>
    </footer>
    <nav class="mobile-bottom-nav" aria-label="Mobile quick navigation">
      <a href="index.html">${icon("home", 19)}<span>Home</span></a>
      <a href="services.html">${icon("grid-3x3", 19)}<span>Services</span></a>
      <a href="products.html">${icon("shopping-bag", 19)}<span>Store</span></a>
      <a href="track-application.html">${icon("search", 19)}<span>Track</span></a>
      <a href="contact.html">${icon("message-circle", 19)}<span>Contact</span></a>
    </nav>
  `;
}

function setupMobileNav() {
  const toggle = document.querySelector("[data-mobile-toggle]");
  const menu = document.querySelector("#nav-menu");
  if (!toggle || !menu) return;

  const backdrop = document.querySelector("[data-nav-backdrop]");
  const closeBtn = menu.querySelector("[data-mobile-close]");

  const setOpen = (open) => {
    menu.classList.toggle("open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(!menu.classList.contains("open")));
  backdrop?.addEventListener("click", () => setOpen(false));
  closeBtn?.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  menu.querySelectorAll("[data-mobile-accordion]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".mobile-accordion");
      const isOpen = item?.classList.toggle("open") || false;
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });

  const mobileSearch = menu.querySelector("[data-mobile-menu-search]");
  mobileSearch?.addEventListener("input", () => {
    const query = mobileSearch.value.trim().toLowerCase();
    menu.querySelectorAll(".mobile-mega-card").forEach((card) => {
      const groupText = (card.querySelector(".mobile-mega-copy strong")?.textContent || "").toLowerCase();
      const links = [...card.querySelectorAll(".mobile-service-link")];
      const matchingLinks = links.filter((link) =>
        (link.getAttribute("data-mobile-menu-text") || link.textContent || "").toLowerCase().includes(query)
      );
      const groupMatches = !query || groupText.includes(query);
      links.forEach((link) => {
        const text = (link.getAttribute("data-mobile-menu-text") || link.textContent || "").toLowerCase();
        link.hidden = Boolean(query) && !groupMatches && !text.includes(query);
      });
      card.hidden = Boolean(query) && !groupMatches && matchingLinks.length === 0;
      if (query && (groupMatches || matchingLinks.length)) {
        card.classList.add("open");
        card.querySelector("[data-mobile-accordion]")?.setAttribute("aria-expanded", "true");
      }
    });
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

function setupDropdowns() {
  const items = [...document.querySelectorAll(".nav-item")];
  if (!items.length) return;

  const desktopQuery = window.matchMedia("(min-width: 1081px)");
  const closeTimers = new WeakMap();
  const closeDelay = 400;

  const clearCloseTimer = (item) => {
    const timer = closeTimers.get(item);
    if (timer) {
      clearTimeout(timer);
      closeTimers.delete(item);
    }
  };

  const setExpanded = (item, expanded) => {
    item.querySelector("[data-dropdown-trigger]")?.setAttribute("aria-expanded", String(expanded));
  };

  const closeItem = (item, delay = 0) => {
    clearCloseTimer(item);

    const finishClose = () => {
      item.classList.remove("open", "dropdown-open");
      setExpanded(item, false);
      closeTimers.delete(item);
    };

    if (delay > 0) {
      closeTimers.set(item, setTimeout(finishClose, delay));
      return;
    }

    finishClose();
  };

  const closeSiblings = (activeItem) => {
    items.forEach((item) => {
      if (item !== activeItem) closeItem(item);
    });
  };

  items.forEach((item) => {
    const trigger = item.querySelector("[data-dropdown-trigger]");

    const open = () => {
      clearCloseTimer(item);
      closeSiblings(item);
      item.classList.add("dropdown-open");
      trigger?.setAttribute("aria-expanded", "true");
    };

    // Desktop: open on hover, close automatically on pointerleave with smooth 200ms grace period
    item.addEventListener("pointerenter", () => {
      if (desktopQuery.matches) open();
    });

    item.addEventListener("pointerleave", () => {
      if (desktopQuery.matches) {
        closeItem(item, 200);
      }
    });

    // focusin for keyboard nav
    item.addEventListener("focusin", open);

    // Mobile: toggle on trigger click / Touch navigation support
    trigger?.addEventListener("click", (event) => {
      const isMobile = window.matchMedia("(max-width: 1080px)").matches;
      const isTouchLike = window.matchMedia("(hover: none)").matches;
      if (!isMobile && !isTouchLike) return;

      const isOpen = item.classList.contains("dropdown-open") || item.classList.contains("open");
      if (!isOpen) {
        // If closed, prevent navigation and open it
        event.preventDefault();
        open();
        item.classList.add("open");
      } else {
        // If already open, let the click navigate naturally.
        // Also close the dropdown so it's not open if navigating to a hash link on the same page.
        setTimeout(() => closeItem(item), 150);
      }
    });

    // Close dropdown on clicking links inside it (e.g. for same-page hash scrolls or standard links)
    const dropdownContent = item.querySelector(".mega-menu, .submenu");
    if (dropdownContent) {
      dropdownContent.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (link) {
          // Mega sidebar links are handled by setupMegaMenuTabs so hover preview
          // and click navigation do not fight this generic dropdown closer.
          if (link.classList.contains("mega-sidebar-item")) {
            return;
          }

          try {
            // Check if it's a same-page hash link
            const currentUrl = new URL(window.location.href);
            const targetUrl = new URL(link.href, window.location.href);
            const isSamePageHash = currentUrl.origin === targetUrl.origin &&
                                   currentUrl.pathname === targetUrl.pathname &&
                                   targetUrl.hash !== "";

            if (isSamePageHash) {
              // Close after a short delay to allow the browser to register hash changes and scroll
              setTimeout(() => closeItem(item), 150);
            } else {
              // For different-page links, force navigation via window.location.href to prevent click cancellation
              event.preventDefault();
              if (link.getAttribute("target") === "_blank") {
                window.open(link.href, "_blank");
              } else {
                window.location.href = link.href;
              }
            }
          } catch (e) {
            // Fallback: force navigation to avoid failures
            event.preventDefault();
            const href = link.getAttribute("href") || link.href;
            if (link.getAttribute("target") === "_blank") {
              window.open(href, "_blank");
            } else {
              window.location.href = href;
            }
          }
        }
      });
    }
  });

  // Close ALL dropdowns when clicking ANYWHERE outside the nav
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-bar")) {
      items.forEach((item) => closeItem(item));
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    items.forEach((item) => {
      closeItem(item);
    });
  });
}

function setupHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const update = () => header.classList.toggle("scrolled", window.scrollY > 8);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function setupHeroWords() {
  const wordElements = document.querySelectorAll("[data-animated-word]");
  if (!wordElements.length) return;

  const defaultWords = [
    "Essential govt. & digital<br>services",
    "Student forms & college<br>applications",
    "Business setup & GST reg.<br>filings",
    "Utility payments & travel<br>bookings",
    "Custom prints & stickers<br>on demand",
    "Expert support & WhatsApp<br>tracking"
  ];

  wordElements.forEach((word) => {
    const customWords = (word.dataset.words || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    const rawWords = customWords.length ? customWords : defaultWords;
    const words = rawWords.map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : "");
    // Use textContent for index matching (strip any existing HTML)
    let index = Math.max(0, words.findIndex(w => w.replace(/<br>/gi, ' ').trim().toLowerCase() === word.textContent.replace(/<br>/gi, ' ').trim().toLowerCase()));
    if (index === -1) index = 0;

    const swapWord = () => {
      index = (index + 1) % words.length;
      word.classList.remove("is-animating");
      void word.offsetWidth;
      word.innerHTML = words[index];  // Use innerHTML to support <br> tags
      word.classList.add("is-animating");
    };

    word.setAttribute("aria-live", "polite");
    word.innerHTML = words[index];  // Set initial word with HTML support
    word.classList.add("is-animating");
    if (words.length > 1) setInterval(swapWord, 1800);
  });
}

function serviceHeroProfile(serviceName = "") {
  const normalized = serviceName.toLowerCase();
  const profiles = [
    {
      test: /\bpan\b/,
      service: "PAN Card",
      shortName: "PAN",
      code: "PAN",
      icon: "id-card",
      progress: "69%",
      words: ["new PAN applications.", "PAN corrections.", "E-PAN downloads."]
    },
    {
      test: /admission assistance|admission-assistance/i,
      service: "Admission Assistance",
      shortName: "Admissions",
      heroFirstLine: "Admission",
      heroSecondLine: "Assistance.",
      code: "ADM",
      icon: "school",
      progress: "85%",
      queueCount: "15",
      queueSub: "12 applications awaiting audit",
      words: ["school & college admissions.", "ITI & B.Ed form support.", "NIOS & open university."]
    },
    {
      test: /competitive exam|competitive-exams/i,
      service: "Competitive Exam Application Assistance",
      shortName: "Competitive Exams",
      heroFirstLine: "Competitive Exam",
      heroSecondLine: "Assistance.",
      code: "CMP",
      icon: "award",
      progress: "88%",
      queueCount: "24",
      queueSub: "18 candidate forms in review",
      words: ["UPSC & SSC form filing.", "NEET & JEE application support.", "Police & Railway jobs."]
    },
    {
      test: /university & academic|university-services/i,
      service: "University & Academic Services",
      shortName: "University Services",
      heroFirstLine: "University & Academic",
      heroSecondLine: "Services.",
      code: "UNI",
      icon: "building-2",
      progress: "80%",
      queueCount: "14",
      queueSub: "8 degree & migration requests",
      words: ["semester exam forms.", "degree & marksheet requests.", "migration & scrutiny."]
    },
    {
      test: /scholarship assistance|scholarship-assistance/i,
      service: "Scholarship Assistance",
      shortName: "Scholarships",
      heroFirstLine: "Scholarship",
      heroSecondLine: "Assistance.",
      code: "SCH",
      icon: "badge-indian-rupee",
      progress: "86%",
      queueCount: "20",
      queueSub: "15 NSP & UP state applications",
      words: ["NSP portal filing.", "UP state scholarship support.", "PFMS tracking."]
    },
    {
      test: /student digital|student-digital-services/i,
      service: "Student Digital Services",
      shortName: "Digital Services",
      heroFirstLine: "Student Digital",
      heroSecondLine: "Services.",
      code: "SDS",
      icon: "layout-grid",
      progress: "90%",
      queueCount: "11",
      queueSub: "6 DigiLocker & ABC ID setups",
      words: ["DigiLocker document pull.", "ABC ID & APAAR ID setup.", "OTR portal registration."]
    },
    {
      test: /admit card & result|admit-card-results/i,
      service: "Admit Card & Result Assistance",
      shortName: "Admit Card & Results",
      heroFirstLine: "Admit Card &",
      heroSecondLine: "Result Assistance.",
      code: "ACR",
      icon: "ticket-check",
      progress: "92%",
      queueCount: "16",
      queueSub: "10 downloads & choice fillings",
      words: ["admit card downloads.", "exam result checks.", "counselling choice filling."]
    },
    {
      test: /online payment assistance|online-payments/i,
      service: "Online Payment Assistance",
      shortName: "Online Payments",
      heroFirstLine: "Online Payment",
      heroSecondLine: "Assistance.",
      code: "OPA",
      icon: "credit-card",
      progress: "95%",
      queueCount: "9",
      queueSub: "5 fee payments in desk review",
      words: ["college tuition fee payment.", "exam & hostel fee submission.", "receipt download."]
    },
    {
      test: /study & academic|study-academic-support/i,
      service: "Study & Academic Support",
      shortName: "Academic Support",
      heroFirstLine: "Study & Academic",
      heroSecondLine: "Support.",
      code: "SAS",
      icon: "book-open",
      progress: "84%",
      queueCount: "12",
      queueSub: "7 thesis & project print orders",
      words: ["assignment formatting.", "thesis & dissertation binding.", "plagiarism check."]
    },
    {
      test: /printing & documentation|printing-documentation/i,
      service: "Printing & Documentation Services",
      shortName: "Printing & Docs",
      heroFirstLine: "Printing &",
      heroSecondLine: "Documentation.",
      code: "PDS",
      icon: "printer",
      progress: "89%",
      queueCount: "22",
      queueSub: "16 print & binding orders",
      words: ["high-speed color printing.", "PDF merge, split & compress.", "spiral & hardcover binding."]
    },
    {
      test: /career services|career-services/i,
      service: "Career Services",
      shortName: "Career Services",
      heroFirstLine: "Career",
      heroSecondLine: "Services.",
      code: "CRS",
      icon: "briefcase",
      progress: "87%",
      queueCount: "10",
      queueSub: "6 resume & CV reviews",
      words: ["ATS resume design.", "SOP & LOR formatting.", "LinkedIn optimization."]
    },
    {
      test: /student|edupoint|exam|admit|result|scholarship|university|resume|ccc|o level|photocopy|printing/i,
      service: "EduPoint",
      shortName: "Student",
      code: "EDU",
      icon: "graduation-cap",
      progress: "68%",
      words: ["exam form support.", "admit card downloads.", "result and resume help."]
    },
    {
      test: /gst/,
      service: "GST Registration",
      shortName: "GST",
      code: "GST",
      icon: "receipt-text",
      progress: "72%",
      words: ["GST registration.", "business KYC review.", "filing status support."]
    },
    {
      test: /business-registration-corporate-setup|msme|udyam|corporate setup/i,
      service: "Business Registration & Corporate Setup",
      shortName: "Business Registration",
      heroFirstLine: "Business Registration &",
      heroSecondLine: "Corporate Setup.",
      code: "BCS",
      icon: "building-2",
      progress: "82%",
      queueCount: "20",
      queueSub: "14 company & MSME filings awaiting audit",
      words: ["MSME & Udyam registration.", "Company & LLP incorporation.", "Trademark, GST & FSSAI filing."]
    },
    {
      test: /digital signature|dsc/,
      service: "Digital Signature",
      shortName: "DSC",
      code: "DSC",
      icon: "key-round",
      progress: "70%",
      words: ["digital signatures.", "Class 3 DSC support.", "KYC verification."]
    },
    {
      test: /fssai|food/,
      service: "FSSAI License",
      shortName: "FSSAI",
      code: "FSS",
      icon: "utensils",
      progress: "67%",
      words: ["FSSAI registration.", "food license filing.", "FoSCoS guidance."]
    },
    {
      test: /shop license|trade license|gumasta/,
      service: "Shop License",
      shortName: "Shop License",
      code: "SHP",
      icon: "store",
      progress: "66%",
      words: ["shop license support.", "trade registrations.", "local business proof."]
    },
    {
      test: /iec|import|export/,
      service: "IEC Code",
      shortName: "IEC",
      code: "IEC",
      icon: "ship",
      progress: "69%",
      words: ["IEC code applications.", "DGFT filing support.", "import export setup."]
    },
    {
      test: /trademark|brand|tm/,
      service: "Trademark Registration",
      shortName: "Trademark",
      code: "TM",
      icon: "stamp",
      progress: "64%",
      words: ["trademark filings.", "brand name search.", "class selection support."]
    },
    {
      test: /company|llp|opc|pvt/,
      service: "Company Registration",
      shortName: "Company",
      code: "COM",
      icon: "building-2",
      progress: "62%",
      words: ["company registration.", "LLP and OPC guidance.", "business setup planning."]
    },
    {
      test: /ayushman|pmjay/,
      service: "Ayushman Card",
      shortName: "Ayushman",
      code: "AYU",
      icon: "heart-pulse",
      progress: "68%",
      words: ["PMJAY eligibility checks.", "Ayushman e-card downloads.", "family record support."]
    },
    {
      test: /voter|epic/,
      service: "Voter ID",
      shortName: "Voter ID",
      code: "VOT",
      icon: "vote",
      progress: "68%",
      words: ["new voter registration.", "Voter ID corrections.", "e-EPIC downloads."]
    },
    {
      test: /passport/,
      service: "Passport Assistance",
      shortName: "Passport",
      code: "PAS",
      icon: "plane",
      progress: "64%",
      words: ["passport applications.", "renewal guidance.", "appointment support."]
    },
    {
      test: /aadhaar|aadhar/i,
      service: "Aadhaar Services Assistance",
      shortName: "Aadhaar Services",
      heroFirstLine: "Aadhaar Services",
      heroSecondLine: "Assistance.",
      code: "AAD",
      icon: "fingerprint",
      progress: "68%",
      words: ["Aadhaar enrolment.", "details updates.", "PVC card assistance."]
    },
    {
      test: /income tax|itr|taxation|tax-assistance|tax assistance/i,
      service: "Income Tax Assistance",
      shortName: "Income Tax",
      heroFirstLine: "Income Tax",
      heroSecondLine: "Assistance.",
      code: "ITA",
      icon: "receipt",
      progress: "82%",
      queueCount: "18",
      queueSub: "12 filings awaiting audit",
      words: ["ITR filing consultancy.", "Form 26AS & AIS/TIS download.", "Tax refund status check."]
    },
    {
      test: /state-certificates|certificates-civil-registration|income certificate|aay praman/i,
      service: "State Certificates & Civil Registration",
      shortName: "State Certificates",
      heroFirstLine: "State Certificates &",
      heroSecondLine: "Civil Registration.",
      code: "SCC",
      icon: "file-check-2",
      progress: "68%",
      words: ["income certificates.", "domicile & caste.", "civil registration support."]
    },
    {
      test: /domicile|residence/,
      service: "Domicile Certificate",
      shortName: "Domicile",
      code: "DOM",
      icon: "home",
      progress: "68%",
      words: ["domicile certificates.", "residence proof.", "state quota documents."]
    },
    {
      test: /caste|jati/,
      service: "Caste Certificate",
      shortName: "Caste Certificate",
      code: "CAS",
      icon: "file-text",
      progress: "68%",
      words: ["caste certificates.", "category proof.", "revenue portal support."]
    },
    {
      test: /police|pension|welfare|family-id|e-shram|jeevan-pramaan/,
      service: "Pension & Welfare Schemes",
      shortName: "Pension & Welfare",
      code: "PEN",
      icon: "landmark",
      progress: "64%",
      words: ["pension applications.", "welfare scheme support.", "e-Shram services."]
    }
  ];

  const matched = profiles.find((profile) => profile.test.test(normalized));
  const result = matched
    ? { ...matched, words: [...matched.words] }
    : {
        service: serviceName || "E-Service",
        shortName: serviceName || "E-Service",
        code: slugify(serviceName || "service").slice(0, 3).toUpperCase() || "SRV",
        icon: "file-check-2",
        progress: "68%",
        words: [`${serviceName || "E-service"} requests.`, "document review.", "tracking support."]
      };
  result.words = result.words.map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : "");
  return result;
}

function setupServiceHeroDynamics() {
  const hero = document.querySelector(".premium-service-hero");
  const consolePanel = hero?.querySelector(".page-hero-console");
  if (!hero || !consolePanel) return;
  if (hero.classList.contains("services-hero") || hero.classList.contains("about-hero")) return;

  const serviceName = defaultApplyServiceForPage()
    || document.querySelector(".page-hero-title")?.textContent?.replace(/\s+/g, " ").trim()
    || "E-Service";
  const profile = serviceHeroProfile(serviceName);

  const title = hero.querySelector(".page-hero-title");
  if (title && title.dataset.twoLineTitle !== "true" && !title.querySelector(".public-hero-title-line")) {
    const firstLine = profile.heroFirstLine || "One trusted place for";
    const secondLine = profile.heroSecondLine || `${profile.shortName || profile.service}.`;
    setPublicHeroTitleLines(title, firstLine, secondLine);
    title.classList.add("service-two-line-title");
  }

  const topbarTitle = consolePanel.querySelector(".command-topbar strong");
  if (topbarTitle) topbarTitle.textContent = "One Point OS Live Dashboard";

  const trackerTag = consolePanel.querySelector(".command-main .tag");
  if (trackerTag) trackerTag.textContent = "Live tracker";

  const trackerId = consolePanel.querySelector(".command-main h3");
  if (trackerId) trackerId.textContent = `OPDS2026-${profile.code}`;

  const trackerText = consolePanel.querySelector(".command-main p");
  if (trackerText) {
    trackerText.textContent = `${profile.service} request is ready for operator review.`;
  }

  const progress = consolePanel.querySelector(".command-progress span");
  if (progress) progress.style.setProperty("--progress", profile.progress);

  const tiles = consolePanel.querySelectorAll(".command-tile");
  if (tiles[0]) {
    tiles[0].innerHTML = `${icon(profile.icon, 22)}<strong>Service</strong><small>Selected</small>`;
  }
  if (tiles[1]) {
    tiles[1].innerHTML = `${icon("lock-keyhole", 22)}<strong>Checkout</strong><small>Secured</small>`;
  }

  const list = consolePanel.querySelector(".command-list");
  if (list) {
    list.innerHTML = `
      <div><span>${icon("file-check-2", 20)}</span><strong>Document Checklist</strong><small class="status-complete">Ready</small></div>
      <div><span>${icon("credit-card", 20)}</span><strong>Payment Review</strong><small class="status-pending">After review</small></div>
      <div><span>${icon("search-check", 20)}</span><strong>Tracking Support</strong><small class="status-complete">Active</small></div>
    `;
  }

  const secureCard = consolePanel.querySelector(".hero-mini-card-one");
  const secureLabel = secureCard?.querySelector(".secure-flow-kicker");
  const secureText = secureCard?.querySelector("strong");
  if (secureLabel) secureLabel.textContent = "Secure Flow";
  if (secureText) secureText.textContent = "Consent + receipt + tracking";

  const supportCard = consolePanel.querySelector(".hero-mini-card-two");
  const supportLabel = supportCard?.querySelector(".helpdesk-kicker");
  const supportText = supportCard?.querySelector("strong");
  if (supportLabel) supportLabel.textContent = "Local Support";
  if (supportText) supportText.textContent = `${profile.shortName} helpdesk active`;
}

function setupTracker() {
  const form = document.querySelector("[data-tracker-form]");
  if (!form) return;

  const output = document.querySelector("[data-tracker-output]");
  const input = form.querySelector('[name="applicationId"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const submitHtml = submitButton?.innerHTML || "Track";
  const searchHeader = document.getElementById("tracker-search-header");
  const dashboardGrid = document.getElementById("tracker-dashboard-grid");
  const idlePreview = document.getElementById("tracker-idle-preview");
  const recentContainer = document.getElementById("recent-track-container");

  let inputTimer = null;
  let activeController = null;
  let currentOrderData = null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatMoney = (value, currency = "INR") => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0
      }).format(Number(value || 0));
    } catch {
      return `Rs. ${Number(value || 0).toFixed(0)}`;
    }
  };

  const renderMessage = (html, tone = "info") => {
    if (!output) return;
    const wrapper = document.getElementById("tracker-output-wrapper") || output.closest(".track-status-message") || output.closest(".tracker-output-wrapper");
    if (wrapper) {
      wrapper.className = `track-status-message ${tone}`;
      wrapper.style.display = "flex";
    }
    output.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  };

  const setLoading = (trackingNumber) => {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<i data-lucide="loader-2" class="spin" style="width: 14px; height: 14px;"></i> Checking…';
    }
    renderMessage(`<strong>Checking ${escapeHtml(trackingNumber)}...</strong> Fetching verified milestones and documents.`, "info");
    if (window.lucide) window.lucide.createIcons();
  };

  const clearLoading = () => {
    if (!submitButton) return;
    submitButton.disabled = false;
    submitButton.innerHTML = submitHtml;
    if (window.lucide) window.lucide.createIcons();
  };

  const resetTracker = () => {
    if (dashboardGrid) dashboardGrid.style.display = "none";
    if (idlePreview) idlePreview.style.display = "block";
    if (searchHeader) searchHeader.classList.remove("compact");
    const wrapper = document.getElementById("tracker-output-wrapper");
    if (wrapper) wrapper.style.display = "none";
  };

  const apiBaseCandidates = (() => {
    if (window.location.protocol !== "file:") return [""];
    return [
      "http://localhost:4273",
      "http://127.0.0.1:4273",
      "http://localhost:4173",
      "http://127.0.0.1:4173"
    ];
  })();

  const fetchTrackerJson = async (path, options = {}) => {
    let lastNetworkError = null;
    for (const baseUrl of apiBaseCandidates) {
      try {
        const response = await fetch(`${baseUrl}${path}`, options);
        const data = await response.json().catch(() => ({}));
        return { response, data };
      } catch (error) {
        lastNetworkError = error;
      }
    }
    throw lastNetworkError || new Error("Live tracking server is not reachable.");
  };

  const getCsrfToken = async () => {
    try {
      const res = await fetch("/api/csrf");
      const data = await res.json();
      return data.csrfToken || "";
    } catch {
      return "";
    }
  };

  const renderRecentTrackingList = () => {
    if (!recentContainer) return;
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem("opds_recent_tracking") || "[]");
    } catch { recent = []; }

    if (!recent.length) {
      recentContainer.innerHTML = "";
      recentContainer.style.display = "none";
      return;
    }

    recentContainer.style.display = "flex";
    recentContainer.innerHTML = `
      <span class="track-recents-label">Recent:</span>
      ${recent.map(id => `
        <button type="button" class="track-chip" data-id="${escapeHtml(id)}">
          <i data-lucide="history" style="width: 11px; height: 11px;"></i>
          ${escapeHtml(id)}
        </button>
      `).join("")}
    `;

    recentContainer.querySelectorAll(".track-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const id = chip.getAttribute("data-id");
        if (input) {
          input.value = id;
          trackApplication(id);
        }
      });
    });
    if (window.lucide) window.lucide.createIcons();
  };

  const renderTimelineSteps = (timeline = []) => {
    const container = document.getElementById("vertical-timeline-container");
    if (!container) return;

    if (!timeline.length) {
      container.innerHTML = '<p style="font-size:0.84rem;color:#64748b;">No timeline steps available.</p>';
      return;
    }

    container.innerHTML = timeline.map((step, idx) => {
      const stateClass = step.state || "pending";
      const badgeClass = stateClass === "done" ? "badge-step-done" : (stateClass === "active" ? "badge-step-current" : "badge-step-upcoming");
      const iconHtml = stateClass === "done"
        ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>'
        : (stateClass === "active"
          ? '<i data-lucide="circle-dot" style="width: 14px; height: 14px;"></i>'
          : `<span>${idx + 1}</span>`);
      const timeStr = step.time ? formatDate(step.time) : (stateClass === "done" ? "Completed" : (stateClass === "active" ? "Current Stage" : "Pending"));

      return `
        <div class="timeline-node ${stateClass}">
          <div class="timeline-connector"></div>
          <div class="timeline-dot">
            ${iconHtml}
          </div>
          <div class="timeline-body">
            <div class="timeline-heading-row">
              <span class="timeline-step-title">${escapeHtml(step.label)}</span>
              <span class="timeline-step-badge ${badgeClass}">${escapeHtml(step.badge || (stateClass === "done" ? "Completed" : (stateClass === "active" ? "Current" : "Upcoming")))}</span>
            </div>
            <p class="timeline-step-desc">${escapeHtml(step.description)}</p>
            <span class="timeline-step-time">${escapeHtml(timeStr)}</span>
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  };

  const renderDocumentChecklist = (docs = []) => {
    const grid = document.getElementById("doc-upload-grid");
    const statsPill = document.getElementById("doc-stats-pill");
    const selectBox = document.getElementById("dropzone-doc-type");
    if (!grid) return;

    if (selectBox && docs.length) {
      selectBox.innerHTML = docs.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.label)}</option>`).join("");
    }

    const verifiedCount = docs.filter(d => d.status === "verified").length;
    if (statsPill) {
      statsPill.textContent = `${verifiedCount} of ${docs.length} Verified`;
      statsPill.className = `doc-pill ${verifiedCount === docs.length ? "verified" : "review"}`;
    }

    grid.innerHTML = docs.map(doc => {
      let badgeClass = "optional";
      if (doc.status === "verified") badgeClass = "verified";
      else if (doc.status === "under_review") badgeClass = "review";
      else if (doc.status === "needs_correction") badgeClass = "correction";
      else if (doc.status === "required" || doc.required) badgeClass = "required";

      const isDone = doc.status === "verified" || doc.status === "under_review";
      const correctionHtml = doc.correctionReason ? `<div style="font-size:0.72rem;color:#991b1b;margin-top:3px;">⚠️ ${escapeHtml(doc.correctionReason)}</div>` : "";
      const metaHtml = doc.fileName ? `<div style="font-size:0.72rem;color:#15803d;margin-top:2px;">✓ ${escapeHtml(doc.fileName)} ${doc.uploadedAt ? `· ${formatDate(doc.uploadedAt)}` : ""}</div>` : "";

      return `
        <div class="doc-row-clean" id="doc-card-${escapeHtml(doc.id)}">
          <div class="doc-left">
            <i data-lucide="${isDone ? "file-check" : "file"}" class="doc-icon-subtle"></i>
            <div>
              <div class="doc-name">${escapeHtml(doc.label)}</div>
              <div class="doc-hint">${escapeHtml(doc.hint || doc.allowedFormats)}</div>
              ${metaHtml}
              ${correctionHtml}
            </div>
          </div>
          <div class="doc-right">
            <span class="doc-pill ${badgeClass}">${escapeHtml(doc.statusLabel)}</span>
            <button type="button" class="btn-doc-action" onclick="window._triggerDocUpload('${escapeHtml(doc.id)}')">
              <i data-lucide="${isDone ? "refresh-cw" : "upload"}" style="width: 11px; height: 11px;"></i>
              <span>${isDone ? "Replace" : "Upload"}</span>
            </button>
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  };

  const renderDeliverables = (deliverables = []) => {
    const container = document.getElementById("deliverables-list");
    if (!container) return;

    if (!deliverables.length) {
      container.innerHTML = '<p style="font-size:0.8rem;color:#64748b;">No deliverables currently registered.</p>';
      return;
    }

    container.innerHTML = deliverables.map(deliv => {
      let icon = "file-text";
      if (deliv.type === "pdf" || deliv.id === "invoice") icon = "receipt";
      if (deliv.type === "certificate") icon = "award";

      const btnHtml = deliv.available && deliv.downloadUrl
        ? `<a href="${escapeHtml(deliv.downloadUrl)}" target="_blank" class="deliverable-btn-sm active"><i data-lucide="download" style="width:11px;height:11px;"></i> Download</a>`
        : (deliv.action === "print_slip"
          ? `<button type="button" onclick="window.print()" class="deliverable-btn-sm active"><i data-lucide="printer" style="width:11px;height:11px;"></i> Print</button>`
          : `<span class="deliverable-btn-sm locked"><i data-lucide="lock" style="width:10px;height:10px;"></i> Locked</span>`);

      return `
        <div class="deliverable-clean-item">
          <div style="display:flex;align-items:center;gap:8px;">
            <i data-lucide="${icon}" style="width:15px;height:15px;color:#0a5eb0;flex-shrink:0;"></i>
            <div>
              <div style="font-weight:600;color:#0f172a;font-size:0.82rem;">${escapeHtml(deliv.title)}</div>
              <div style="font-size:0.7rem;color:#64748b;">${escapeHtml(deliv.badge || deliv.status)}</div>
            </div>
          </div>
          <div>${btnHtml}</div>
        </div>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  };

  const renderActivityFeed = (events = []) => {
    const container = document.getElementById("activity-feed-list");
    if (!container) return;

    if (!events.length) {
      container.innerHTML = '<p style="font-size:0.8rem;color:#64748b;">No recent activity logged.</p>';
      return;
    }

    container.innerHTML = events.slice(0, 4).map(ev => {
      let avatarIcon = "info";
      if (ev.actorRole === "finance") avatarIcon = "credit-card";
      if (ev.actorRole === "operator") avatarIcon = "user-check";
      if (ev.actorRole === "customer") avatarIcon = "file-up";
      if (ev.actorRole === "system") avatarIcon = "cpu";

      return `
        <div class="activity-clean-item">
          <div class="activity-icon-wrap">
            <i data-lucide="${avatarIcon}" style="width: 12px; height: 12px;"></i>
          </div>
          <div class="activity-content-wrap">
            <div style="display:flex;justify-content:space-between;gap:6px;">
              <span class="activity-headline">${escapeHtml(ev.title)}</span>
              <span class="activity-date">${escapeHtml(formatDate(ev.timestamp))}</span>
            </div>
            <div class="activity-sub">${escapeHtml(ev.description)}</div>
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  };

  const renderTrackingResult = (data) => {
    currentOrderData = data;
    const order = data.order || {};
    const application = data.application || {};
    const payment = data.payment || {};
    const primaryItem = (data.items || [])[0] || {};
    const serviceName = primaryItem.name || (order.orderType === "product" ? "Store Product Order" : "Digital Service");
    const category = order.category || "Government";
    const total = order.total ? formatMoney(order.total, order.currency || "INR") : "₹0";

    // If on home/service page without full dashboard container, show summary and CTA link to track-application.html
    if (!dashboardGrid) {
      renderMessage(`
        <strong>${escapeHtml(order.orderId || data.trackingNumber)} — ${escapeHtml(application.displayStatus || order.statusLabel || "Active")}</strong>
        <br><small>${escapeHtml(serviceName)} · ${escapeHtml(application.summary || "Live status loaded.")}</small>
        <div style="margin-top: 8px;">
          <a class="btn btn-primary" style="font-size: 0.8rem; padding: 5px 14px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;" href="track-application.html?id=${encodeURIComponent(order.orderId || data.trackingNumber)}">
            <i data-lucide="layout-dashboard" style="width: 13px; height: 13px;"></i>
            <span>Open Live Request Dashboard</span>
          </a>
        </div>
      `, application.isIssue ? "error" : "success");
      return;
    }

    // 1. Switch to Dashboard Mode
    if (idlePreview) idlePreview.style.display = "none";
    if (dashboardGrid) dashboardGrid.style.display = "grid";
    if (searchHeader) searchHeader.classList.add("compact");

    // 2. Populate Request Header Card
    const snapIdText = document.getElementById("snap-id-text");
    const snapBadge = document.getElementById("snap-status-badge");
    const snapServiceName = document.getElementById("snap-service-name");
    const snapServiceCat = document.getElementById("snap-service-cat");
    const snapCreatedAt = document.getElementById("snap-created-at");
    const snapPaymentStatus = document.getElementById("snap-payment-status");
    const snapAssignedTo = document.getElementById("snap-assigned-to");
    const snapSlaTime = document.getElementById("snap-sla-time");
    const snapStageText = document.getElementById("snap-stage-text");
    const snapOrderIdBtn = document.getElementById("snap-order-id");

    if (snapIdText) snapIdText.textContent = order.orderId || data.trackingNumber;
    if (snapOrderIdBtn) {
      snapOrderIdBtn.onclick = () => {
        navigator.clipboard.writeText(order.orderId || data.trackingNumber);
        if (snapIdText) {
          const orig = snapIdText.textContent;
          snapIdText.textContent = "Copied ✓";
          setTimeout(() => { snapIdText.textContent = orig; }, 1500);
        }
      };
    }

    if (snapBadge) {
      snapBadge.textContent = application.displayStatus || order.statusLabel || "Processing";
      snapBadge.className = `track-main-badge ${application.isIssue ? "badge-attention" : (application.stageIndex >= 3 ? "badge-completed" : "badge-in-progress")}`;
    }
    if (snapServiceName) snapServiceName.textContent = serviceName;
    if (snapServiceCat) snapServiceCat.textContent = `${category} Services`;
    if (snapCreatedAt) snapCreatedAt.textContent = `Submitted ${formatDate(order.createdAt) || "Recent"}`;
    if (snapPaymentStatus) snapPaymentStatus.textContent = `${total} (${payment.statusLabel || "Paid"})`;
    if (snapAssignedTo) snapAssignedTo.textContent = data.assignment?.staffName ? `${data.assignment.staffName} (Operator)` : "Operations Desk";
    if (snapStageText) snapStageText.textContent = application.displayStatus || "Intake Review";
    if (snapSlaTime) snapSlaTime.textContent = "24–48 Business Hours";

    // 3. Populate Dynamic What Happens Next Card
    const nextBox = document.getElementById("tracker-next-step-box");
    const nextTitle = document.getElementById("next-step-title");
    const nextMsg = document.getElementById("next-step-msg");
    const nextBtn = document.getElementById("next-step-btn");
    const nextData = data.whatHappensNext || {};

    if (nextBox) {
      nextBox.className = `track-next-box tone-${nextData.tone || "info"}`;
    }
    if (nextTitle) nextTitle.textContent = nextData.title || "What happens next:";
    if (nextMsg) nextMsg.textContent = nextData.message || application.summary || "Operator compliance review is underway.";
    if (nextBtn) {
      nextBtn.href = nextData.actionLink || "#doc-upload-section";
      const btnSpan = nextBtn.querySelector("span");
      if (btnSpan) btnSpan.textContent = nextData.actionLabel || "View Action";
    }

    // 4. Render Connected Timeline, Deliverables, Checklist & Activity Log
    renderTimelineSteps(data.timeline || []);
    renderDeliverables(data.deliverables || []);
    renderDocumentChecklist(data.documentChecklist || []);
    renderActivityFeed(data.activityFeed || []);

    // 5. Connect Contextual WhatsApp Button
    const waBtn = document.getElementById("btn-support-whatsapp");
    if (waBtn && data.supportContext?.whatsappUrl) {
      waBtn.href = data.supportContext.whatsappUrl;
    }

    // 6. Store in recent tracking
    if (order.orderId) {
      let recent = [];
      try {
        recent = JSON.parse(localStorage.getItem("opds_recent_tracking") || "[]");
      } catch { recent = []; }
      recent = recent.filter(id => id !== order.orderId);
      recent.unshift(order.orderId);
      recent = recent.slice(0, 4);
      localStorage.setItem("opds_recent_tracking", JSON.stringify(recent));
      renderRecentTrackingList();
    }

    if (window.lucide) window.lucide.createIcons();
  };

  const trackApplication = async (trackingNumber, options = {}) => {
    const clean = String(trackingNumber || "").trim();
    if (!clean) {
      resetTracker();
      return;
    }

    if (window.trackAnalyticsEvent) {
      window.trackAnalyticsEvent("tracking_search", {
        trackingNumber: clean,
        silent: !!options.silent
      });
    }

    if (activeController) activeController.abort();
    activeController = new AbortController();
    if (!options.silent) setLoading(clean);

    try {
      const { response, data } = await fetchTrackerJson(`/api/applications/track/${encodeURIComponent(clean)}`, {
        signal: activeController.signal
      });
      if (!response.ok) throw new Error(data.message || "Tracking number not found.");
      renderTrackingResult(data);
    } catch (error) {
      if (error.name === "AbortError") return;
      resetTracker();
      const isNetworkError = /failed to fetch|network|not reachable/i.test(error.message || "");
      const title = isNetworkError ? "Server not reachable" : "Application Not Found";
      const detail = isNetworkError && window.location.protocol === "file:"
        ? "Please start the local server or open via http://localhost:4173/track-application.html."
        : (error.message || "Please check your Tracking ID (e.g. OPDS-20260722-000001) and try again.");
      renderMessage(`<strong>${escapeHtml(title)}:</strong> ${escapeHtml(detail)}`, "error");
    } finally {
      clearLoading();
    }
  };

  // ── Drag and Drop & File Upload Handler ──
  const dropzone = document.getElementById("doc-dropzone");
  const fileInput = document.getElementById("dropzone-file-input");
  const browseBtn = document.getElementById("dropzone-browse-btn");
  const docTypeSelect = document.getElementById("dropzone-doc-type");
  const progressWrapper = document.getElementById("upload-progress-wrapper");
  const progressFill = document.getElementById("upload-progress-fill");
  const progressText = document.getElementById("upload-progress-text");

  window._triggerDocUpload = (docType) => {
    if (docTypeSelect) docTypeSelect.value = docType;
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
      dropzone.classList.add("drag-over");
      setTimeout(() => dropzone.classList.remove("drag-over"), 800);
    }
    if (fileInput) fileInput.click();
  };

  const uploadSelectedFile = async (file, docType) => {
    if (!file) return;
    const orderId = currentOrderData?.order?.orderId || (new URLSearchParams(window.location.search).get("id") || new URLSearchParams(window.location.search).get("order") || "");
    if (!orderId) {
      alert("Please track an application first before uploading documents.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    if (progressWrapper) progressWrapper.style.display = "block";
    if (progressFill) progressFill.style.width = "40%";
    if (progressText) progressText.textContent = `Uploading ${file.name}…`;

    try {
      const csrf = await getCsrfToken();
      if (progressFill) progressFill.style.width = "75%";

      const res = await fetch("/api/orders/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf
        },
        body: JSON.stringify({
          orderId,
          docType: docType || docTypeSelect?.value || "supporting_doc",
          fileName: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type || "application/octet-stream"
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");

      if (progressFill) progressFill.style.width = "100%";
      if (progressText) progressText.textContent = `✓ '${file.name}' uploaded successfully! Auto-verification running…`;

      setTimeout(() => {
        if (progressWrapper) progressWrapper.style.display = "none";
        if (progressFill) progressFill.style.width = "0%";
        trackApplication(orderId, { silent: true });
      }, 1500);
    } catch (err) {
      if (progressFill) {
        progressFill.style.width = "100%";
        progressFill.style.background = "#ef4444";
      }
      if (progressText) progressText.textContent = `Upload failed: ${err.message}`;
      setTimeout(() => {
        if (progressWrapper) progressWrapper.style.display = "none";
        if (progressFill) {
          progressFill.style.width = "0%";
          progressFill.style.background = "#16a34a";
        }
      }, 3000);
    }
  };

  if (browseBtn && fileInput) {
    browseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        uploadSelectedFile(file, docTypeSelect?.value);
      }
    });
  }

  if (dropzone) {
    dropzone.addEventListener("click", () => {
      if (fileInput) fileInput.click();
    });

    ["dragenter", "dragover"].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("drag-over");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const file = dt?.files && dt.files[0];
      if (file) {
        uploadSelectedFile(file, docTypeSelect?.value);
      }
    });
  }

  // ── Form Submit & Auto-Search Listeners ──
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    window.clearTimeout(inputTimer);
    trackApplication(new FormData(form).get("applicationId"));
  });

  input?.addEventListener("input", () => {
    window.clearTimeout(inputTimer);
    const value = input.value.trim();
    if (!value) {
      resetTracker();
      return;
    }
    if (value.length < 5) return;
    inputTimer = window.setTimeout(() => trackApplication(value, { silent: true }), 500);
  });

  renderRecentTrackingList();

  const params = new URLSearchParams(window.location.search);
  const initialTrackingNumber = params.get("id") || params.get("order") || params.get("tracking") || params.get("order_id") || "";
  if (initialTrackingNumber && input) {
    input.value = initialTrackingNumber;
    trackApplication(initialTrackingNumber, { silent: false });
  } else {
    resetTracker();
  }
}

function setupCfaq() {
  document.querySelectorAll('.cfaq-wrap').forEach(wrap => {
    wrap.classList.toggle('cfaq-no-sidebar', !wrap.querySelector('.cfaq-sidebar'));
  });

  document.querySelectorAll('.cfaq-sidebar').forEach(sidebar => {
    const wrap = sidebar.closest('.cfaq-wrap');
    if (!wrap) return;
    sidebar.querySelectorAll('.cfaq-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        sidebar.querySelectorAll('.cfaq-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        wrap.querySelectorAll('.cfaq-panel').forEach(p => p.classList.remove('active'));
        const panel = wrap.querySelector(`.cfaq-panel[data-panel="${target}"]`);
        if (panel) {
          panel.classList.add('active');
          /* reset all items in panel, open first */
          const items = panel.querySelectorAll('.faq-item');
          items.forEach((it, i) => it.classList.toggle('open', i === 0));
          if (window.lucide) window.lucide.createIcons();
        }
      });
    });
  });
}

function setupFaqs() {
  const faqContainers = document.querySelectorAll(".faq");
  faqContainers.forEach(container => {
    if (container.dataset.faqsBound) return;
    container.dataset.faqsBound = "true";
    container.addEventListener("click", (e) => {
      const button = e.target.closest("[data-faq-question]");
      if (!button) return;
      const item = button.closest(".faq-item");
      if (item) {
        item.classList.toggle("open");
      }
    });
  });

  // Fallback for elements outside a .faq container
  document.querySelectorAll("[data-faq-question]").forEach((button) => {
    const item = button.closest(".faq-item");
    if (item && !item.parentElement.classList.contains("faq")) {
      button.addEventListener("click", () => {
        item.classList.toggle("open");
      });
    }
  });

  document.querySelectorAll(".faq-accordion").forEach((accordion) => {
    const items = [...accordion.querySelectorAll(":scope > .faq-item")];
    if (items.length && !items.some((item) => item.classList.contains("open"))) {
      items[0].classList.add("open");
    }

    items.forEach((item) => {
      const button = item.querySelector(".faq-trigger");
      const content = item.querySelector(".faq-content");
      if (!button || !content || button.dataset.faqsBound === "true") return;

      button.dataset.faqsBound = "true";
      const syncState = () => {
        const isOpen = item.classList.contains("open");
        button.setAttribute("aria-expanded", String(isOpen));
        content.setAttribute("aria-hidden", String(!isOpen));
      };

      syncState();
      button.addEventListener("click", () => {
        item.classList.toggle("open");
        syncState();
      });
    });
  });
}

function setupSearch() {
  const input = document.querySelector("[data-ai-search]");
  const suggestions = document.querySelector("[data-ai-suggestions]");
  if (!input || !suggestions) return;

  let activeIndex = -1;

  // Popular defaults shown when input is empty / focused blank
  const popularSuggestions = [
    "PAN Card Apply",
    "GST Registration",
    "Aadhaar Services Assistance",
    "Legal Drafting & Court Services Assistance",
    "Voter ID",
    "Admit Card Download"
  ];

  // Derive a short category label from href
  function getCategoryLabel(href) {
    const h = href.toLowerCase();
    if (/pan|voter|passport|aadhaar/.test(h)) return "Govt ID";
    if (/gst|business-reg|msme|company|trademark|fssai|shop|iec/.test(h)) return "Business";
    if (/legal|court|drafting/.test(h)) return "Legal";
    if (/certificate|civil|domicile|income|caste|birth|death|marriage/.test(h)) return "Certificate";
    if (/pension|welfare|kisan|widow/.test(h)) return "Welfare";
    if (/edupoint|scholar|admit|exam|result|ccc|university/.test(h)) return "Education";
    if (/transport|rto|driving|rc|hsrp/.test(h)) return "Transport";
    if (/ration/.test(h)) return "Ration";
    if (/design/.test(h)) return "Design";
    if (/print|scan/.test(h)) return "Print";
    if (/travel/.test(h)) return "Travel";
    if (/online|recharge|electricity|fastag|dth/.test(h)) return "Online";
    if (/product|sticker|tshirt|gift|branding/.test(h)) return "Products";
    if (/business-online|google-business|whatsapp/.test(h)) return "Digital";
    return "Service";
  }

  // Rich subtitles for results
  function suggestionSubtitle(item) {
    const t = item.title;
    if (/pan/i.test(t)) return "Apply, correction, e-PAN and reprint support";
    if (/aadhaar|aadhar/i.test(t)) return "Enrolment, update, PVC card and corrections";
    if (/voter/i.test(t)) return "Voter ID registration and correction support";
    if (/passport/i.test(t)) return "Fresh, renewal and Tatkal passport assistance";
    if (/ration/i.test(t)) return "New card, correction and member management";
    if (/gst/i.test(t)) return "Business registration and GST application help";
    if (/certificate|domicile|income|caste|civil/i.test(t)) return "Document checklist and assisted submission";
    if (/transport|rto/i.test(t)) return "Driving licence, RC, HSRP and challan services";
    if (/pension|welfare/i.test(t)) return "PM Kisan, Atal Pension, widow and old-age schemes";
    if (/legal|court|drafting/i.test(t)) return "Affidavit, agreement, notary and deed drafting";
    if (/msme|business registr/i.test(t)) return "Udyam, GST, Pvt Ltd and startup registration";
    if (/google business|business online|digital/i.test(t)) return "Local SEO, maps ranking and profile optimization";
    if (/travel|tour/i.test(t)) return "Bus, train, flight and hotel booking";
    if (/scholar/i.test(t)) return "UP scholarship and student form support";
    if (/exam/i.test(t)) return "SSC, Railway, UPSC, UP Police form filling";
    if (/admit/i.test(t)) return "Download, save and print exam documents";
    if (/print|scan/i.test(t)) return "Photocopy, lamination, color print and scanning";
    if (/sticker/i.test(t)) return "Waterproof, vinyl, holographic and label printing";
    if (/tshirt|t-shirt/i.test(t)) return "Custom DTF, hoodie and polo shirt printing";
    if (/gift/i.test(t)) return "Photo frames, LED, magic mugs and mobile covers";
    if (/branding/i.test(t)) return "Visiting cards, flyers, menu cards and barcode";
    if (/logo/i.test(t)) return "Professional logo creation and brand identity";
    if (/social media/i.test(t)) return "Facebook, Instagram posts and story design";
    if (/contact/i.test(t)) return "WhatsApp, call or email our support team";
    if (/track/i.test(t)) return "Check your application or order status";
    if (/about/i.test(t)) return "Learn about One Point Digital Services";
    if (/online|recharge|electricity|fastag/i.test(t)) return "Quick digital payments and recharges";
    if (/company/i.test(t)) return "Pvt Ltd, LLP, OPC and partnership setup";
    if (/trademark/i.test(t)) return "Brand name, logo and class selection support";
    if (/fssai/i.test(t)) return "Food registration and licensing for restaurants/shops";
    if (/shop license/i.test(t)) return "Trade and local authority shop registration";
    if (/iec/i.test(t)) return "Import-Export Code guidance for DGFT filing";
    return item.term.split(" ").slice(0, 6).join(", ");
  }

  // Relevance scoring: higher = better match
  function scoreMatch(item, query) {
    const title = item.title.toLowerCase();
    const term = item.term.toLowerCase();
    let score = 0;
    if (title === query) score += 200;
    else if (title.startsWith(query)) score += 100;
    else if (title.includes(query)) score += 60;
    if (term.includes(query)) score += 20;
    query.split(/\s+/).filter(w => w.length > 1).forEach(word => {
      if (title.startsWith(word)) score += 40;
      else if (title.includes(word)) score += 25;
      if (term.includes(word)) score += 10;
    });
    return score;
  }

  // Highlight matching text with <mark>
  function highlight(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark class='srch-hl'>$1</mark>");
  }

  function defaultMatches() {
    return popularSuggestions
      .map(title => searchIndex.find(item => item.title === title))
      .filter(Boolean);
  }

  // Ranked search: filter + score + sort + slice
  function getMatches(query, limit = 8) {
    const q = query.trim().toLowerCase();
    if (!q) return { items: defaultMatches(), total: defaultMatches().length, isDefault: true };
    const scored = searchIndex
      .map(item => ({ item, score: scoreMatch(item, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    return { items: scored.slice(0, limit).map(s => s.item), total: scored.length, isDefault: false };
  }

  function renderSuggestions(items, query = "", total = 0, isDefault = false) {
    activeIndex = -1;

    if (items.length === 0) {
      suggestions.innerHTML = `
        <div class="srch-section-label">No results for &ldquo;${query}&rdquo;</div>
        <a href="services.html" data-suggestion-idx="0">
          <span>
            <strong>Browse all services</strong>
            <small>Explore our complete catalogue of 50+ services</small>
          </span>
        </a>
        <a href="contact.html${query ? "?query=" + encodeURIComponent(query) : ""}" data-suggestion-idx="1">
          <span>
            <strong>Talk to support</strong>
            <small>We&rsquo;ll help you find what you need</small>
          </span>
        </a>
      `;
    } else {
      const headerLabel = isDefault
        ? `<div class="srch-section-label"><i data-lucide="trending-up" style="width:12px;height:12px;margin-right:4px"></i>Popular services</div>`
        : "";
      suggestions.innerHTML = headerLabel + items.map((item, idx) => {
        const badge = getCategoryLabel(item.href);
        const titleDisplay = query ? highlight(item.title, query) : item.title;
        return `
          <a href="${item.href}" data-suggestion-idx="${idx}">
            <span>
              <strong>${titleDisplay} <em class="srch-cat">${badge}</em></strong>
              <small>${suggestionSubtitle(item)}</small>
            </span>
          </a>
        `;
      }).join("");

      // Append "View all" if more results exist
      if (!isDefault && total > items.length) {
        suggestions.innerHTML += `
          <a href="services.html" class="srch-view-all" data-suggestion-idx="${items.length}">
            <span>
              <strong>View all ${total} results</strong>
              <small>See every matching service across our platform</small>
            </span>
          </a>
        `;
      }
    }

    suggestions.classList.add("show");
    if (window.lucide) window.lucide.createIcons();
  }

  // Input handler
  input.addEventListener("input", () => {
    const { items, total, isDefault } = getMatches(input.value);
    renderSuggestions(items, input.value.trim(), total, isDefault);
  });

  // Focus handler — show popular or current results
  input.addEventListener("focus", () => {
    const { items, total, isDefault } = getMatches(input.value);
    renderSuggestions(items, input.value.trim(), total, isDefault);
  });

  // Keyboard navigation
  input.addEventListener("keydown", (e) => {
    const links = [...suggestions.querySelectorAll("a[data-suggestion-idx]")];
    if (!suggestions.classList.contains("show")) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, links.length - 1);
      updateActive(links);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      updateActive(links);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? links[activeIndex] : links[0];
      if (target) target.click();
    } else if (e.key === "Escape") {
      suggestions.classList.remove("show");
      input.blur();
    }
  });

  function updateActive(links) {
    links.forEach((link, idx) => {
      link.classList.toggle("active", idx === activeIndex);
      if (idx === activeIndex) link.scrollIntoView({ block: "nearest" });
    });
  }

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!input.closest(".hos-search").contains(e.target)) {
      suggestions.classList.remove("show");
    }
  });

  // Ctrl+K / Cmd+K global shortcut — focus search bar
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      input.focus();
      input.select();
      const { items, total, isDefault } = getMatches(input.value);
      renderSuggestions(items, input.value.trim(), total, isDefault);
    }
  });

  // Click on Ctrl+K badge or search icon to focus
  const kbd = document.querySelector(".hos-search-kbd");
  if (kbd) {
    kbd.style.cursor = "pointer";
    kbd.title = "Click or press Ctrl+K to search";
    kbd.addEventListener("click", () => {
      input.focus();
      const { items, total, isDefault } = getMatches(input.value);
      renderSuggestions(items, input.value.trim(), total, isDefault);
    });
  }

  const searchIcon = document.querySelector(".hos-search-icon");
  if (searchIcon) {
    searchIcon.style.cursor = "pointer";
    searchIcon.addEventListener("click", () => {
      input.focus();
      const { items, total, isDefault } = getMatches(input.value);
      renderSuggestions(items, input.value.trim(), total, isDefault);
    });
  }

  // Voice Search integration using Web Speech API + getUserMedia permission prompt
  const voiceBtn = document.querySelector(".hos-search-voice");
  if (voiceBtn) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let activeRecognition = null;
    let isListening = false;

    function stopListening() {
      isListening = false;
      voiceBtn.classList.remove("listening");
      input.placeholder = "Search services or applications";
      if (activeRecognition) {
        try { activeRecognition.stop(); } catch (e) {}
        activeRecognition = null;
      }
    }

    voiceBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isListening) {
        stopListening();
        return;
      }

      if (!SpeechRecognition) {
        alert("Voice search aapke browser me supported nahi hai. Kripya Google Chrome ya Microsoft Edge browser ka upayog karein.");
        return;
      }

      // Step 1: Explicitly trigger browser microphone permission dialog via getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        voiceBtn.classList.add("listening");
        input.placeholder = "Microphone allow kijiye...";
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop stream tracks so SpeechRecognition can take over the microphone
          stream.getTracks().forEach((track) => track.stop());
        } catch (permErr) {
          console.warn("Microphone permission denied or blocked:", permErr);
          voiceBtn.classList.remove("listening");
          input.placeholder = "Search services or applications";
          alert("Microphone permission allow nahi hui! Browser ke URL bar me lock/settings icon par click karke Microphone ko 'Allow' kijiye.");
          return;
        }
      }

      // Step 2: Initialize a clean SpeechRecognition instance
      try {
        const recognition = new SpeechRecognition();
        activeRecognition = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isListening = true;
          voiceBtn.classList.add("listening");
          input.placeholder = "Listening... Bolen...";
          input.focus();
        };

        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript || "";
          if (transcript) {
            input.value = transcript;
            input.focus();
            const { items, total, isDefault } = getMatches(transcript);
            renderSuggestions(items, transcript.trim(), total, isDefault);
          }
          stopListening();
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          stopListening();
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            alert("Microphone access block hai. Kripya browser URL bar me lock icon par click karke Mic permission allow karein.");
          } else if (event.error === "network") {
            alert("Voice recognition ke liye internet connection zaroori hai.");
          }
        };

        recognition.onend = () => {
          stopListening();
        };

        recognition.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
        stopListening();
        alert("Voice recognition shuru nahi ho saka: " + (err.message || err));
      }
    });
  }
}

function setupServiceCtas() {
  document.querySelectorAll('a[href^="contact.html?service="]').forEach((link) => {
    const href = link.getAttribute("href") || "";
    const target = new URL(href, window.location.href);
    const service = target.searchParams.get("service");
    if (!service) return;
    link.href = serviceApplyHref(service, target.searchParams.get("category") || "general");
  });

  document.querySelectorAll('a[href="contact.html"]').forEach((link) => {
    const card = link.closest(".service-card, .mini-card, .panel, .product-card");
    const title = card?.querySelector("h1, h2, h3")?.textContent?.trim();
    if (title) {
      const category = getCurrentPage().replace(".html", "").replace(/-/g, " ");
      link.href = contactHref(title, category);
    } else {
      const current = getCurrentPage();
      if (current && current !== "contact.html") {
        link.href = `contact.html?from=${current}`;
      }
    }
  });

  const serviceFromApplyTarget = (target) => {
    const direct = target?.closest?.("[data-service]")?.getAttribute("data-service");
    if (direct) return direct.trim();

    const linked = target?.closest?.("a[href]");
    if (linked) {
      try {
        const url = new URL(linked.getAttribute("href") || "", window.location.href);
        const fromUrl = url.searchParams.get("service_name") || url.searchParams.get("service");
        if (fromUrl) return fromUrl.trim();
      } catch (error) {}
    }

    const card = target?.closest?.(".service-option-card, .service-card, .premium-showcase-card, .mini-card, .panel");
    return serviceNameFromCard(card) || defaultApplyServiceForPage() || "General Support";
  };

  // Convert every legacy Apply Now hash into a real checkout URL. This also
  // covers category-card URLs such as `page.html?service=...#apply-now`.
  document.querySelectorAll('a[href*="#apply-now"]').forEach((link) => {
    const service = serviceFromApplyTarget(link);
    let category = inferApplyCategory("", service);
    try {
      const oldUrl = new URL(link.getAttribute("href") || "", window.location.href);
      category = oldUrl.searchParams.get("category") || category;
    } catch (error) {}
    link.href = serviceApplyHref(service, category);
  });

  // Some service cards use a button instead of an anchor. Route those through
  // the same checkout builder so the chosen variant is preserved.
  document.querySelectorAll("button.btn-service-select[data-service]").forEach((button) => {
    button.type = "button";
    button.dataset.checkoutHref = serviceApplyHref(
      button.getAttribute("data-service"),
      inferApplyCategory("", button.getAttribute("data-service"))
    );
  });

  // Old showcase cards contain inline scroll handlers. Capture them before the
  // inline handler runs and send the click to checkout instead.
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(
      'button.btn-service-select[data-service], [onclick*="apply-now"], [onclick*="data-unified-apply-slot"], [onclick*="scrollToForm"]'
    );
    if (!trigger) return;
    const service = serviceFromApplyTarget(event.target);
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(trigger.dataset.checkoutHref || serviceApplyHref(service, inferApplyCategory("", service)));
  }, true);

  // Embedded application forms have been retired in favour of one checkout.
  // Remove the hardcoded PAN form and any old injection slots from the live DOM.
  document.querySelectorAll("#apply-now, [data-unified-apply-slot]").forEach((section) => section.remove());
}

function setupProductCarousel() {
  document.querySelectorAll("[data-product-carousel]").forEach((wrap) => {
    const track = wrap.querySelector(".product-carousel");
    const prev = wrap.querySelector(".carousel-prev");
    const next = wrap.querySelector(".carousel-next");
    if (!track) return;

    const cardWidth = () => track.querySelector(".product-card")?.getBoundingClientRect().width || 280;
    const scrollAmount = () => cardWidth() + 18;
    const scrollNext = () => {
      const nearEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 12;
      track.scrollTo({ left: nearEnd ? 0 : track.scrollLeft + scrollAmount(), behavior: "smooth" });
    };
    const scrollPrev = () => {
      const nearStart = track.scrollLeft <= 12;
      track.scrollTo({ left: nearStart ? track.scrollWidth : track.scrollLeft - scrollAmount(), behavior: "smooth" });
    };

    next?.addEventListener("click", scrollNext);
    prev?.addEventListener("click", scrollPrev);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let paused = false;
    wrap.addEventListener("pointerenter", () => { paused = true; });
    wrap.addEventListener("pointerleave", () => { paused = false; });
    wrap.addEventListener("focusin", () => { paused = true; });
    wrap.addEventListener("focusout", () => { paused = false; });

    setInterval(() => {
      if (!paused && document.visibilityState === "visible") scrollNext();
    }, 3400);
  });
}

function scrollToPageTarget(target, behavior = "smooth") {
  if (!target) return;
  const header = document.querySelector(".site-header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior
  });
}

function setupDeferredHashTargeting() {
  const scrollToCurrentHash = (behavior = "auto") => {
    const hash = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    scrollToPageTarget(target, behavior);
  };

  [80, 420, 1000].forEach((delay, index) => {
    window.setTimeout(() => scrollToCurrentHash(index === 0 ? "auto" : "smooth"), delay);
  });

  window.addEventListener("hashchange", () => {
    window.setTimeout(() => scrollToCurrentHash("smooth"), 50);
  });
}

function setupEduPointServiceCarousel() {
  const root = document.querySelector("[data-edupoint-service-carousel]");
  if (!root) return;
  const isHomepage = document.body.id === "homepage-body";

  const track = root.querySelector("[data-edupoint-service-track]");
  const cards = [...root.querySelectorAll("[data-edupoint-service-card]")];
  const prev = root.querySelector("[data-edupoint-carousel-prev]");
  const next = root.querySelector("[data-edupoint-carousel-next]");
  const activeLabel = root.querySelector("[data-edupoint-active-service]");
  const filterButtons = [...root.querySelectorAll("[data-edupoint-filter]")];
  const viewAllButton = root.querySelector("[data-edupoint-view-all]");
  if (!track || cards.length < 2) return;

  const params = new URLSearchParams(window.location.search);
  const requestedService = (params.get("service_name") || params.get("service") || "").trim();
  const requestedHash = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
  const normalizeService = (value = "") => value.trim().toLowerCase().replace(/\s+/g, " ");
  const serviceNamesForCard = (card) => {
    const names = [
      card.dataset.service,
      card.querySelector(".btn-service-select")?.dataset.service,
      card.querySelector("h3")?.textContent
    ];
    const href = card.getAttribute("href") || card.querySelector("a[href]")?.getAttribute("href") || "";
    if (href) {
      try {
        const url = new URL(href, window.location.href);
        names.push(url.searchParams.get("service"), url.searchParams.get("service_name"));
      } catch (error) {
        // Ignore malformed local hrefs; visible card text still provides the service name.
      }
    }
    return names.map((name) => normalizeService(name || "")).filter(Boolean);
  };
  const requestedServiceIndex = requestedService
    ? cards.findIndex((card) => serviceNamesForCard(card).includes(normalizeService(requestedService)))
    : -1;
  const requestedHashIndex = requestedHash
    ? cards.findIndex((card) => card.id === requestedHash)
    : -1;
  let activeIndex = requestedServiceIndex >= 0
    ? requestedServiceIndex
    : (requestedHashIndex >= 0 ? requestedHashIndex : 0);
  let paused = requestedServiceIndex >= 0 || requestedHashIndex >= 0;
  let timer = null;
  let currentFilter = "all";
  let expanded = false;

  const cardServiceName = (card) => card.querySelector(".btn-service-select")?.dataset.service || card.querySelector("h3")?.textContent?.trim() || "EduPoint service";
  const cardCategories = (card) => (card.dataset.edupointCategories || "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const cardMatchesFilter = (card) => currentFilter === "all" || cardCategories(card).includes(currentFilter);
  const filteredCards = () => cards.filter(cardMatchesFilter);
  const visibleCount = () => {
    if (window.matchMedia("(max-width: 560px)").matches) return 1;
    if (window.matchMedia("(max-width: 820px)").matches) return 2;
    return isHomepage ? 4 : 3;
  };

  const visibleStartForIndex = (index, count) => index;
  const updateFilterButtons = () => {
    filterButtons.forEach((button) => {
      const active = (button.dataset.edupointFilter || "all") === currentFilter;
      button.classList.toggle("active", active);
      button.classList.toggle("btn-soft", active);
      button.classList.toggle("btn-ghost", !active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };
  const updateViewAllButton = () => {
    if (!viewAllButton) return;
    viewAllButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    const label = viewAllButton.querySelector("span");
    if (label) label.textContent = expanded ? (isHomepage ? "Carousel" : "Show Less") : "View All";
  };

  const activate = (index) => {
    const matches = filteredCards();
    if (!matches.length) return;
    let activeCard = cards[(index + cards.length) % cards.length];
    if (!activeCard || !cardMatchesFilter(activeCard)) activeCard = matches[0];
    activeIndex = cards.indexOf(activeCard);
    const activeFilteredIndex = Math.max(0, matches.indexOf(activeCard));
    const count = visibleCount();
    const visibleStart = expanded ? 0 : visibleStartForIndex(activeFilteredIndex, count);
    const visibleLimit = Math.min(count, matches.length);
    root.classList.toggle("is-expanded", expanded);
    cards.forEach((card, cardIndex) => {
      const filteredIndex = matches.indexOf(card);
      const inFilter = filteredIndex >= 0;
      const carouselOffset = inFilter ? (filteredIndex - visibleStart + matches.length) % matches.length : -1;
      const visible = expanded
        ? inFilter
        : (inFilter && carouselOffset >= 0 && carouselOffset < visibleLimit);
      card.classList.toggle("is-visible", visible);
      card.classList.toggle("is-active", cardIndex === activeIndex);
      card.classList.toggle("is-filtered-out", !inFilter);
      card.setAttribute("aria-current", cardIndex === activeIndex ? "true" : "false");
      card.style.order = visible ? String(expanded ? filteredIndex : carouselOffset) : "";
    });
    if (activeLabel) activeLabel.textContent = cardServiceName(cards[activeIndex]);
    updateFilterButtons();
    updateViewAllButton();
  };

  const step = (direction = 1) => {
    const matches = filteredCards();
    if (!matches.length) return;
    const currentCard = cards[activeIndex];
    const currentPosition = Math.max(0, matches.indexOf(currentCard));
    const nextPosition = (currentPosition + direction + matches.length) % matches.length;
    activate(cards.indexOf(matches[nextPosition]));
  };
  const restart = () => {
    if (timer) window.clearInterval(timer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = window.setInterval(() => {
      if (!paused && !expanded && root.dataset.enterpriseFilterActive !== "true" && document.visibilityState === "visible") step(1);
    }, 2600);
  };
  const collapseToCarousel = () => {
    if (!expanded) return;
    expanded = false;
    paused = false;
    activate(activeIndex);
    restart();
  };

  // Mobile: viewport natively swipe-scrolls (overflow-x:auto) — arrows must scroll
  // the viewport, not the desktop order/transform mechanism (which is neutralized).
  const viewport = root.querySelector(".edupoint-carousel-viewport, .services-carousel-viewport");
  const scrollViewportByCard = (direction = 1) => {
    if (!viewport) return false;
    const ox = getComputedStyle(viewport).overflowX;
    if ((ox !== "auto" && ox !== "scroll") || viewport.scrollWidth <= viewport.clientWidth + 4) return false;
    const sampleCard = cards.find((card) => getComputedStyle(card).display !== "none") || cards[0];
    const cardW = sampleCard ? sampleCard.getBoundingClientRect().width : viewport.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "14") || 14;
    // NOTE: viewport has scroll-snap-type: x mandatory, which blocks `behavior: "smooth"`
    // programmatic scrolls (they snap back to 0). Instant scroll respects the snap points.
    viewport.scrollBy({ left: direction * (cardW + gap), behavior: "auto" });
    return true;
  };

  prev?.addEventListener("click", () => {
    if (scrollViewportByCard(-1)) return;
    expanded = false;
    paused = false;
    step(-1);
    restart();
  });
  next?.addEventListener("click", () => {
    if (scrollViewportByCard(1)) return;
    expanded = false;
    paused = false;
    step(1);
    restart();
  });
  root.addEventListener("pointerenter", () => { paused = true; });
  root.addEventListener("pointerleave", () => { if (!expanded) paused = false; });
  root.addEventListener("focusin", () => { paused = true; });
  root.addEventListener("focusout", () => { if (!expanded) paused = false; });
  root.addEventListener("click", (event) => {
    const card = event.target.closest("[data-edupoint-service-card]");
    if (!card) return;
    const index = cards.indexOf(card);
    if (index >= 0) {
      paused = false;
      activate(index);
      restart();
    }
  });
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.edupointFilter || "all";
      expanded = false;
      paused = false;
      const firstMatch = filteredCards()[0] || cards[0];
      activate(cards.indexOf(firstMatch));
      restart();
    });
  });
  viewAllButton?.addEventListener("click", () => {
    expanded = !expanded;
    currentFilter = "all";
    paused = expanded;
    activate(activeIndex);
    if (expanded) {
      window.setTimeout(() => scrollToPageTarget(root, "smooth"), 80);
    } else {
      restart();
    }
  });
  window.addEventListener("resize", () => activate(activeIndex), { passive: true });
  if ("IntersectionObserver" in window) {
    const collapseObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) collapseToCarousel();
      });
    }, { threshold: 0.04 });
    collapseObserver.observe(root);
  }

  activate(activeIndex);
  if (requestedHashIndex >= 0) {
    [120, 700, 1400].forEach((delay, index) => {
      window.setTimeout(() => {
        scrollToPageTarget(document.getElementById("service-options"), index === 0 ? "auto" : "smooth");
      }, delay);
    });
  }
  restart();
}

function productPriceLabel(product) {
  return `Rs. ${product.price}`;
}

function productWhatsAppHref(product) {
  const message = `Hi One Point, I want to order ${product.name} from OneMart.`;
  return `${siteConfig.whatsapp}?text=${encodeURIComponent(message)}`;
}

function productCard(product) {
  return `
    <article class="store-product-card" data-product-card="${product.slug}">
      <a class="store-product-link" href="${product.href}" aria-label="Open ${product.name} product page">
        <div class="store-product-media">
          <img data-rotating-product="${product.slug}" src="${product.images[0]}" alt="${product.name}" loading="lazy" decoding="async">
          <span class="store-product-badge">${product.badge}</span>
          <span class="store-product-rating">${icon("star", 13)} ${product.rating}</span>
        </div>
        <div class="store-product-body">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
        </div>
      </a>
      <div class="store-product-actions">
        <div class="store-product-price">
          <span>Starting at</span>
          <strong>${productPriceLabel(product)}</strong>
        </div>
        <div class="store-product-action-btns">
          <button class="btn btn-soft" type="button" data-add-to-cart="${product.slug}">${icon("shopping-cart", 16)} Add to Cart</button>
          <a class="btn btn-primary" href="${product.href}">${icon("credit-card", 16)} Buy Now</a>
        </div>
      </div>
    </article>
  `;
}

function renderOneMartCatalog() {
  const root = document.querySelector("[data-onemart-catalog]");
  if (!root) return;

  const catIds = oneMartGroups.map((g) => g.anchor || slugify(g.title));

  root.innerHTML = `
    <div class="section-head">
      <div>
        <p class="section-kicker">Full OneMart Catalog</p>
        <h2>All products, cleanly grouped <span class="h2-gold">by category.</span></h2>
      </div>
      <button class="btn btn-soft" type="button" data-cart-button>${icon("shopping-cart", 18)} Cart <span data-cart-count>0</span></button>
    </div>
    <nav class="onemart-sticky-nav" id="onemart-quick-nav" aria-label="Jump to category">
      <div class="onemart-sticky-nav-inner" id="onemart-quick-nav-inner">
        ${oneMartGroups.map((g) => {
          const id = g.anchor || slugify(g.title);
          return `<a class="onemart-nav-pill" href="#${id}">${icon(g.icon, 13)} ${g.title}</a>`;
        }).join("")}
      </div>
    </nav>
    <div class="store-category-stack">
      ${oneMartGroups.map((group) => {
        const id = group.anchor || slugify(group.title);
        const products = oneMartProducts.filter((product) => product.category === group.title);
        return `
          <section class="store-category-section" id="${id}" style="scroll-margin-top:120px">
            <div class="store-category-head">
              <span class="store-cat-icon">${icon(group.icon, 22)}</span>
              <div class="store-cat-meta">
                <h2>${group.title}</h2>
                <p>${categoryDescriptions[group.title]}</p>
              </div>
              <div class="store-cat-controls">
                <span class="store-cat-badge">${group.badge || "OneMart"}</span>
                <button class="btn store-viewall-btn" type="button" data-viewall="${id}">${icon("layout-grid", 14)} View All</button>
                <div class="store-carousel-controls">
                  <button class="icon-button" type="button" aria-label="Previous" data-carousel-prev="${id}">${icon("chevron-left", 18)}</button>
                  <button class="icon-button" type="button" aria-label="Next" data-carousel-next="${id}">${icon("chevron-right", 18)}</button>
                </div>
              </div>
            </div>
            <div class="store-product-rail" data-store-rail="${id}">
              <div class="store-product-track">
                ${products.map(productCard).join("")}
              </div>
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;

  // ── Carousel + View All ───────────────────────────────────────────────────
  root.querySelectorAll("[data-store-rail]").forEach((rail) => {
    const id = rail.dataset.storeRail;
    const track = rail.querySelector(".store-product-track");
    const prev = root.querySelector(`[data-carousel-prev="${id}"]`);
    const next = root.querySelector(`[data-carousel-next="${id}"]`);
    const viewAllBtn = root.querySelector(`[data-viewall="${id}"]`);
    if (!track) return;

    const cards = Array.from(track.querySelectorAll(".store-product-card"));
    const VISIBLE = 4;
    let offset = 0;
    let expanded = false;

    const setCarouselMode = () => {
      const railW = rail.offsetWidth;
      const cardW = Math.floor((railW - (VISIBLE - 1) * 18) / VISIBLE);
      cards.forEach((c) => { c.style.flex = `0 0 ${cardW}px`; });
      track.style.transform = `translateX(-${offset * (cardW + 18)}px)`;
      if (prev) prev.disabled = offset <= 0;
      if (next) next.disabled = offset >= cards.length - VISIBLE;
    };

    const enterCarousel = () => {
      expanded = false;
      rail.classList.remove("is-expanded");
      track.style.flexWrap = "";
      track.style.transform = "";
      cards.forEach((c) => { c.style.flex = ""; });
      offset = 0;
      setCarouselMode();
      if (viewAllBtn) { viewAllBtn.innerHTML = `${icon("layout-grid", 14)} View All`; if (window.lucide) window.lucide.createIcons({ el: viewAllBtn }); }
      if (prev) prev.hidden = false;
      if (next) next.hidden = false;
    };

    const enterExpanded = () => {
      expanded = true;
      rail.classList.add("is-expanded");
      track.style.flexWrap = "wrap";
      track.style.transform = "translateX(0)";
      cards.forEach((c) => { c.style.flex = ""; });
      if (viewAllBtn) { viewAllBtn.innerHTML = `${icon("chevron-up", 14)} Show Less`; if (window.lucide) window.lucide.createIcons({ el: viewAllBtn }); }
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
    };

    prev?.addEventListener("click", () => { offset = Math.max(0, offset - 1); setCarouselMode(); });
    next?.addEventListener("click", () => { offset = Math.min(cards.length - VISIBLE, offset + 1); setCarouselMode(); });
    viewAllBtn?.addEventListener("click", () => { expanded ? enterCarousel() : enterExpanded(); });

    enterCarousel();
    window.addEventListener("resize", () => { if (!expanded) setCarouselMode(); }, { passive: true });
  });

  // ── Sticky nav active on scroll ───────────────────────────────────────────
  const pills = root.querySelectorAll(".onemart-nav-pill");
  const sections = catIds.map((id) => document.getElementById(id)).filter(Boolean);
  if (sections.length && pills.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          pills.forEach((p) => p.classList.toggle("is-active", p.getAttribute("href") === "#" + id));
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach((s) => obs.observe(s));
  }

  if (window.lucide) window.lucide.createIcons();
}




function renderProductDetail() {
  const root = document.querySelector("[data-product-detail]");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("product") || root.dataset.productSlug || oneMartProducts[0]?.slug;
  const product = productBySlug(slug);
  if (!product) {
    root.innerHTML = '<section class="section" style="text-align:center;padding:64px 24px;"><p class="section-kicker">OneMart</p><h1>Product not found.</h1><p style="color:#64748b;">This product may have been removed or the link is invalid.</p><a class="btn btn-primary" href="products.html">Browse All Products</a></section>';
    return;
  }

  document.title = product.name + " | OneMart Print Studio";

  const related = oneMartProducts
    .filter(item => item.category === product.category && item.slug !== product.slug)
    .slice(0, 4);

  const starsFn = (r) => {
    const full = Math.floor(r); const half = r % 1 >= 0.5 ? 1 : 0; const empty = 5 - full - half;
    return "\u2605".repeat(full) + (half ? "\u2BEA" : "") + "\u2606".repeat(empty);
  };

  const imgs = (product.images && product.images.length >= 4) ? product.images : [
    "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1589384267710-7a25bf6443c2?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=85"
  ];

  const qtyTiers = [
    { qty: 25, price: 99, perUnit: "3.96" },
    { qty: 50, price: 170, perUnit: "3.40" },
    { qty: 100, price: 299, perUnit: "2.99", tag: "Popular ★" },
    { qty: 250, price: 599, perUnit: "2.40", tag: "Save 40%" },
    { qty: 500, price: 899, perUnit: "1.80", tag: "Save 55%" },
    { qty: 1000, price: 1349, perUnit: "1.35", tag: "Save 65%" }
  ];

  root.innerHTML = `
    <!-- Breadcrumb -->
    <div class="pd-breadcrumb-wrap">
      <div class="pd-breadcrumb">
        <a href="index.html">Home</a>
        <i data-lucide="chevron-right" style="width:13px;height:13px"></i>
        <a href="products.html">OneMart Store</a>
        <i data-lucide="chevron-right" style="width:13px;height:13px"></i>
        <a href="products.html#${product.categorySlug}">${product.category}</a>
        <i data-lucide="chevron-right" style="width:13px;height:13px"></i>
        <span>${product.name}</span>
      </div>
    </div>

    <!-- Main Hero: 2-Column Balanced Master Grid -->
    <section class="pd-hero-section">
      <div class="pd-hero-grid">

        <!-- LEFT COLUMN: Gallery + Spec Callout Cards (Perfect 1:1 Height Balance) -->
        <div class="pd-left-col">
          
          <!-- 1. Image Gallery Box -->
          <div class="pd-gallery-card">
            <div class="pd-main-img-box" id="pd-main-box" title="Click to view full size">
              <span class="pd-badge-gold">${product.badge || "CUSTOM SHAPE"}</span>
              <img class="pd-main-img" id="pd-main-img" src="${imgs[0]}" alt="${product.name}" decoding="async">
              <div class="pd-zoom-btn">
                <i data-lucide="maximize-2" style="width:13px;height:13px"></i> Click to Zoom
              </div>
            </div>
            
            <div class="pd-thumb-grid">
              ${imgs.slice(0,5).map((img, i) => `
                <button class="pd-thumb-btn${i === 0 ? ' is-active' : ''}" type="button" data-thumb="${img}" aria-label="Thumbnail ${i+1}">
                  <img src="${img}" alt="${product.name} preview ${i+1}" loading="lazy" decoding="async">
                </button>
              `).join("")}
            </div>
          </div>

          <!-- 2. Quality Standards & Materials Card -->
          <div class="pd-specs-highlight-card">
            <div class="pd-spec-header">
              <i data-lucide="shield-check" style="width:16px;height:16px;color:#075092;"></i>
              <span>OneMart Print &amp; Material Quality</span>
            </div>
            <div class="pd-specs-2x2">
              <div class="pd-spec-mini-box">
                <strong><i data-lucide="scissors" style="width:13px;height:13px;color:#075092;"></i> Laser Optical Cut</strong>
                <span>0.1mm sub-millimeter contour precision</span>
              </div>
              <div class="pd-spec-mini-box">
                <strong><i data-lucide="droplet" style="width:13px;height:13px;color:#0284c7;"></i> 100% Waterproof</strong>
                <span>Dishwasher &amp; outdoor weatherproof vinyl</span>
              </div>
              <div class="pd-spec-mini-box">
                <strong><i data-lucide="sparkles" style="width:13px;height:13px;color:#d97706;"></i> 1440 DPI Ultra-HD</strong>
                <span>UV-resistant rich archival color output</span>
              </div>
              <div class="pd-spec-mini-box">
                <strong><i data-lucide="layers" style="width:13px;height:13px;color:#059669;"></i> Residue-Free</strong>
                <span>Peels clean without damaging surfaces</span>
              </div>
            </div>
          </div>

          <!-- 3. Real Customer Review & Social Proof Card (Fills Balance Void) -->
          <div class="pd-review-proof-card">
            <div class="pd-review-header">
              <div class="pd-review-stars">★★★★★</div>
              <span class="pd-review-score">4.8 / 5 Rating (126+ Prints)</span>
            </div>
            <p class="pd-review-quote">
              &ldquo;The cut accuracy around our logo is unbelievable. Water, sun exposure, car wash—zero peeling or color fading!&rdquo;
            </p>
            <div class="pd-review-author-row">
              <strong>Anurag S., Tech Studio Lucknow</strong>
              <span class="pd-verified-badge"><i data-lucide="check" style="width:11px;height:11px;"></i> Verified Order</span>
            </div>
          </div>

          <!-- 4. 3-Point Guarantee & Proofing Reassurance Box -->
          <div class="pd-guarantee-box">
            <div class="pd-guarantee-row">
              <div class="pd-guarantee-item">
                <i data-lucide="message-square" style="width:15px;height:15px;color:#075092;"></i>
                <div>
                  <strong>WhatsApp Proof Approval</strong>
                  <span>We never print without your digital cut-line sign-off.</span>
                </div>
              </div>
              <div class="pd-guarantee-item">
                <i data-lucide="package-check" style="width:15px;height:15px;color:#059669;"></i>
                <div>
                  <strong>Rigid Safe Packaging</strong>
                  <span>Reinforced flat mailer packaging so stickers never bend.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. Local Lucknow Fulfillment & Sample Pack Link -->
          <div class="pd-local-fulfillment-bar">
            <div class="pd-local-info">
              <i data-lucide="map-pin" style="width:16px;height:16px;"></i>
              <div>
                <div>One Point Kendra, LDA Colony, Lucknow</div>
                <div class="pd-local-sub">Free direct store pickup or fast courier dispatch</div>
              </div>
            </div>
            <a href="https://wa.me/919473946181?text=Hi%20One%20Point%2C%20I%20want%20to%20request%20a%20printed%20sample%20pack." target="_blank" rel="noopener" class="pd-sample-pack-link">
              Sample Pack &rarr;
            </a>
          </div>

        </div> <!-- /pd-left-col -->

        <!-- RIGHT COLUMN: Product Info & Modular Configurator Engine -->
        <div class="pd-right-col">
          
          <div class="pd-category-tag">
            <i data-lucide="${product.icon || 'tag'}" style="width:13px;height:13px"></i>
            ${product.category}
          </div>

          <h1 class="pd-product-title">${product.name}</h1>

          <div class="pd-meta-bar">
            <span class="pd-stars">${starsFn(parseFloat(product.rating || "4.8"))}</span>
            <span class="pd-rating-bold">${product.rating || "4.8"} ★</span>
            <span style="color:#64748b;">(126 Verified Reviews)</span>
            <span style="color:#cbd5e1">·</span>
            <span class="pd-stock-pill"><i data-lucide="check-circle" style="width:12px;height:12px"></i> In Stock</span>
            <span style="color:#cbd5e1">·</span>
            <span class="pd-dispatch-pill"><i data-lucide="zap" style="width:12px;height:12px"></i> Fast 24–48h Dispatch</span>
          </div>

          <p class="pd-lead-desc">${product.description}</p>

          <div class="pd-micro-tags-row">
            <span class="pd-micro-tag"><i data-lucide="droplet" style="width:13px;height:13px"></i> 100% Water-Resistant</span>
            <span class="pd-micro-tag"><i data-lucide="scissors" style="width:13px;height:13px"></i> Precision Die-Cut</span>
            <span class="pd-micro-tag"><i data-lucide="sparkles" style="width:13px;height:13px"></i> 300+ DPI Archival Ink</span>
          </div>

          <!-- Modular Configurator Desk -->
          <div class="pd-config-desk">

            <!-- 2-Column: Shape & Size -->
            <div class="pd-2col-options">
              
              <!-- 1. Shape -->
              <div class="pd-option-block">
                <div class="pd-block-header">
                  <div><span class="pd-step-badge">1</span><strong>Shape</strong></div>
                  <span class="pd-active-choice-label" id="pd-lbl-shape">Custom Cut</span>
                </div>
                <div class="pd-btn-grid" data-group="shape" style="grid-template-columns: 1fr 1fr;">
                  <button class="pd-choice-btn is-selected" type="button" data-val="Custom Contour">
                    <i data-lucide="scissors" style="width:14px;height:14px;"></i> Custom Shape
                  </button>
                  <button class="pd-choice-btn" type="button" data-val="Circle">
                    <i data-lucide="circle" style="width:14px;height:14px;"></i> Circle
                  </button>
                  <button class="pd-choice-btn" type="button" data-val="Square">
                    <i data-lucide="square" style="width:14px;height:14px;"></i> Square
                  </button>
                  <button class="pd-choice-btn" type="button" data-val="Rectangle">
                    <i data-lucide="rectangle-horizontal" style="width:14px;height:14px;"></i> Rectangle
                  </button>
                </div>
              </div>

              <!-- 2. Size -->
              <div class="pd-option-block">
                <div class="pd-block-header">
                  <div><span class="pd-step-badge">2</span><strong>Size</strong></div>
                  <span class="pd-active-choice-label" id="pd-lbl-size">3&quot; × 3&quot;</span>
                </div>
                <div class="pd-btn-grid" data-group="size" style="grid-template-columns: 1fr 1fr;">
                  <button class="pd-choice-btn" type="button" data-val='2" × 2"' data-mult="0.85">2" × 2"</button>
                  <button class="pd-choice-btn is-selected" type="button" data-val='3" × 3"' data-mult="1.0">3" × 3"</button>
                  <button class="pd-choice-btn" type="button" data-val='4" × 4"' data-mult="1.35">4" × 4"</button>
                  <button class="pd-choice-btn" type="button" data-val='5" × 5"' data-mult="1.75">5" × 5"</button>
                </div>
              </div>

            </div> <!-- /pd-2col-options -->

            <!-- 2-Column: Material & Finish -->
            <div class="pd-2col-options" style="border-top:1px solid #e2e8f0; padding-top:16px;">
              
              <!-- 3. Material -->
              <div class="pd-option-block">
                <div class="pd-block-header">
                  <div><span class="pd-step-badge">3</span><strong>Material</strong></div>
                  <span class="pd-active-choice-label" id="pd-lbl-material">Premium Vinyl</span>
                </div>
                <div class="pd-btn-grid" data-group="material" style="grid-template-columns: 1fr;">
                  <button class="pd-choice-btn is-selected" type="button" data-val="Premium Vinyl">Premium Vinyl (White)</button>
                  <button class="pd-choice-btn" type="button" data-val="Waterproof Matte">Waterproof Matte</button>
                  <button class="pd-choice-btn" type="button" data-val="Clear Transparent">Clear Transparent</button>
                  <button class="pd-choice-btn" type="button" data-val="Holographic">Holographic (+₹50)</button>
                </div>
              </div>

              <!-- 4. Finish -->
              <div class="pd-option-block">
                <div class="pd-block-header">
                  <div><span class="pd-step-badge">4</span><strong>Finish</strong></div>
                  <span class="pd-active-choice-label" id="pd-lbl-finish">Gloss</span>
                </div>
                <div class="pd-btn-grid" data-group="finish" style="grid-template-columns: 1fr;">
                  <button class="pd-choice-btn is-selected" type="button" data-val="Gloss">Gloss Laminate</button>
                  <button class="pd-choice-btn" type="button" data-val="Matte">Matte Velvet</button>
                  <button class="pd-choice-btn" type="button" data-val="Uncoated">Uncoated Raw</button>
                </div>
              </div>

            </div> <!-- /pd-2col-options -->

            <!-- 5. Quantity Tiers Matrix -->
            <div class="pd-option-block" style="border-top:1px solid #e2e8f0; padding-top:16px;">
              <div class="pd-block-header">
                <div><span class="pd-step-badge">5</span><strong>Quantity &amp; Volume Pricing</strong></div>
                <span style="color:#059669; font-weight:800; font-size:12.5px;">Save up to 65% on bulk!</span>
              </div>
              <div class="pd-quantity-matrix">
                ${qtyTiers.map(t => `
                  <div class="pd-qty-tile${t.qty === 100 ? ' is-selected' : ''}" data-qty="${t.qty}" data-base-price="${t.price}" data-rate="${t.perUnit}">
                    <div class="pd-qty-pcs">${t.qty} pcs</div>
                    <div class="pd-qty-price">&#8377;${t.price} total</div>
                    <div class="pd-qty-unit">&#8377;${t.perUnit} / pc</div>
                    ${t.tag ? `<span class="pd-qty-tag">${t.tag}</span>` : ''}
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- 6. Upload Artwork -->
            <div class="pd-option-block" style="border-top:1px solid #e2e8f0; padding-top:16px;">
              <div class="pd-block-header">
                <div><span class="pd-step-badge">6</span><strong>Upload Your Artwork / Logo</strong></div>
                <span style="font-size:12px; color:#64748b;">(Or send via WhatsApp)</span>
              </div>
              
              <div class="pd-artwork-dropzone" id="pd-dropzone">
                <input type="file" class="pd-file-native-input" id="pd-file-input" accept=".png,.jpg,.jpeg,.pdf,.ai,.svg,.psd">
                <div class="pd-dropzone-icon"><i data-lucide="upload-cloud" style="width:20px;height:20px;"></i></div>
                <div class="pd-dropzone-text">
                  <strong id="pd-dropzone-heading">Click or drag your design file here</strong>
                  <span>PNG, JPG, PDF, AI, SVG or PSD (Up to 50MB)</span>
                </div>
              </div>

              <div class="pd-uploaded-status-bar" id="pd-upload-status">
                <i data-lucide="check-circle-2" style="width:14px;height:14px;"></i>
                <span id="pd-file-name-label">File uploaded</span>
              </div>

              <div class="pd-file-actions-row" id="pd-upload-actions">
                <button type="button" id="pd-btn-replace">Replace</button>
                <button type="button" class="pd-btn-remove" id="pd-btn-remove">Remove</button>
              </div>

              <div class="pd-design-desk-cta-row">
                <span>No ready file? Our designer can help you free:</span>
                <a href="https://wa.me/919473946181?text=Hi%20One%20Point%2C%20I%20need%20free%20design%20help%20for%20${encodeURIComponent(product.name)}." target="_blank" rel="noopener">
                  <i data-lucide="pen-tool" style="width:13px;height:13px;"></i> Request Design Help
                </a>
              </div>
            </div>

          </div> <!-- /pd-config-desk -->

          <!-- Invoice-Style Order Summary Strip -->
          <div class="pd-summary-invoice-strip">
            <div>
              <div class="pd-sum-main-price" id="pd-sum-price">&#8377;299</div>
              <div class="pd-sum-config-text" id="pd-sum-config">100 stickers · 3" × 3" · Premium Vinyl · Gloss</div>
              <div class="pd-sum-unit-rate" id="pd-sum-unit">&#8377;2.99 / piece</div>
            </div>
            <div class="pd-sum-right-meta">
              <div class="pd-sum-save-badge" id="pd-sum-save">You Save ₹97 on Bulk</div>
              <div class="pd-sum-timeline"><i data-lucide="truck" style="width:14px;height:14px;"></i> Ready in 1–2 Days</div>
              <div class="pd-sum-pickup-note">Free Lucknow Store Pickup</div>
            </div>
          </div>

          <!-- Primary Actions Stack (Refined & Balanced) -->
          <div class="pd-cta-stack">
            <a class="pd-btn-checkout-primary" id="pd-btn-buy" href="checkout.html?product=${product.slug}&qty=100">
              <i data-lucide="zap" style="width:17px;height:17px;"></i>
              <span>Customize &amp; Order Now</span>
              <i data-lucide="arrow-right" style="width:17px;height:17px;margin-left:auto;"></i>
            </a>
            
            <div class="pd-secondary-actions-row">
              <button class="pd-btn-cart-secondary" type="button" id="pd-btn-cart">
                <i data-lucide="shopping-bag" style="width:15px;height:15px;"></i>
                <span>Add to Cart</span>
              </button>
              <a class="pd-btn-whatsapp-action" id="pd-btn-wa" href="#" target="_blank" rel="noopener">
                <i data-lucide="message-circle" style="width:15px;height:15px;"></i>
                <span>Order via WhatsApp</span>
              </a>
            </div>
          </div>

          <!-- Structured Trust Reassurance Box -->
          <div class="pd-trust-box-card">
            <div class="pd-trust-micro-grid">
              <div class="pd-trust-point">
                <span class="pd-trust-chk-icon"><i data-lucide="check" style="width:12px;height:12px;"></i></span>
                <span><strong>WhatsApp Proof</strong> before print</span>
              </div>
              <div class="pd-trust-point">
                <span class="pd-trust-chk-icon"><i data-lucide="check" style="width:12px;height:12px;"></i></span>
                <span><strong>300+ DPI</strong> Precision Cut</span>
              </div>
              <div class="pd-trust-point">
                <span class="pd-trust-chk-icon"><i data-lucide="check" style="width:12px;height:12px;"></i></span>
                <span><strong>Free Pickup</strong> in Lucknow</span>
              </div>
              <div class="pd-trust-point">
                <span class="pd-trust-chk-icon"><i data-lucide="check" style="width:12px;height:12px;"></i></span>
                <span><strong>100% Quality</strong> Reprint Guarantee</span>
              </div>
            </div>
          </div>

          <a class="pd-back-link" href="products.html#${product.categorySlug}">
            <i data-lucide="arrow-left" style="width:13px;height:13px;"></i>
            <span>Back to ${product.category}</span>
          </a>

        </div> <!-- /pd-right-col -->

      </div>
    </section>

    <!-- 3 Editorial Benefit Cards -->
    <section class="pd-editorial-benefits-section">
      <div class="pd-benefits-inner">
        <div class="pd-editorial-card">
          <span class="pd-editorial-icon-box"><i data-lucide="scan-line" style="width:20px;height:20px;"></i></span>
          <div>
            <h3>Print-Ready Proofing</h3>
            <p>Artwork, resolution, bleed margins and cut-lines inspected. Digital proof approval on WhatsApp before production starts.</p>
          </div>
        </div>
        <div class="pd-editorial-card">
          <span class="pd-editorial-icon-box"><i data-lucide="truck" style="width:20px;height:20px;"></i></span>
          <div>
            <h3>Pickup or Fast Delivery</h3>
            <p>Free store pickup at One Point Suvidha Kendra, LDA Colony, Lucknow or fast tracked doorstep courier dispatch across India.</p>
          </div>
        </div>
        <div class="pd-editorial-card">
          <span class="pd-editorial-icon-box"><i data-lucide="layers" style="width:20px;height:20px;"></i></span>
          <div>
            <h3>Bulk Pricing &amp; Reorders</h3>
            <p>Significant unit discounts for volume batches and 1-click easy repeat prints on WhatsApp with zero setup fees.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4-Tab Detailed Information Desk -->
    <section class="pd-tabs-section">
      <div class="pd-tabs-navbar">
        <button class="pd-tab-nav-btn is-active" type="button" data-tab="desc">Description &amp; Uses</button>
        <button class="pd-tab-nav-btn" type="button" data-tab="specs">Specifications</button>
        <button class="pd-tab-nav-btn" type="button" data-tab="guide">Artwork &amp; File Guide</button>
        <button class="pd-tab-nav-btn" type="button" data-tab="shipping">Delivery &amp; Returns</button>
      </div>

      <!-- Tab 1: Description -->
      <div class="pd-tab-content-panel is-active" id="tab-desc">
        <h3 style="font-size:20px; font-weight:850; color:#081f3a; margin:0 0 12px;">Premium Custom Die-Cut Vinyl Stickers</h3>
        <p style="font-size:14.5px; color:#475569; line-height:1.65; margin-bottom:20px;">
          Our custom die-cut stickers are individually cut to the exact contour perimeter of your logo, character, or graphic artwork. Printed on heavy-duty outdoor vinyl with UV-resistant inks, they provide outstanding color fidelity and durability against water, scratches, and harsh sunlight exposure.
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px;">
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
            <strong style="color:#075092; font-size:15px; display:flex; align-items:center; gap:6px; margin-bottom:6px;"><i data-lucide="laptop" style="width:15px;height:15px;"></i> Laptops &amp; Gadgets</strong>
            <span style="font-size:13.5px; color:#64748b;">Waterproof adhesive ensures zero peeling on water bottles, laptops, tablets and skateboards.</span>
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
            <strong style="color:#075092; font-size:15px; display:flex; align-items:center; gap:6px; margin-bottom:6px;"><i data-lucide="package" style="width:15px;height:15px;"></i> Brand Packaging &amp; Merch</strong>
            <span style="font-size:13.5px; color:#64748b;">Seal thank-you bags, shipping boxes, jars, cups and premium merchandise with your logo.</span>
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
            <strong style="color:#075092; font-size:15px; display:flex; align-items:center; gap:6px; margin-bottom:6px;"><i data-lucide="car" style="width:15px;height:15px;"></i> Automobiles &amp; Windows</strong>
            <span style="font-size:13.5px; color:#64748b;">Weatherproof laminate withstands outdoor rain, car washes, and harsh sun rays for years.</span>
          </div>
        </div>
      </div>

      <!-- Tab 2: Specifications -->
      <div class="pd-tab-content-panel" id="tab-specs">
        <table class="pd-spec-grid-table">
          <tbody>
            <tr><td class="pd-spec-name">Material</td><td class="pd-spec-detail">120 GSM High-Grade Monomeric Vinyl with Polymeric Protective Coating</td></tr>
            <tr><td class="pd-spec-name">Printing Method</td><td class="pd-spec-detail">Ultra-HD Eco-Solvent / UV Flatbed Digital Print (1440 DPI)</td></tr>
            <tr><td class="pd-spec-name">Finish Options</td><td class="pd-spec-detail">High-Gloss Protective Laminate / Velvet Soft Matte / Uncoated Raw</td></tr>
            <tr><td class="pd-spec-name">Adhesive</td><td class="pd-spec-detail">Permanent Acrylic Pressure-Sensitive Adhesive (Residue-Free Clean Removal)</td></tr>
            <tr><td class="pd-spec-name">Water &amp; Weatherproof</td><td class="pd-spec-detail">100% Water-Resistant, Dishwasher Safe &amp; UV Protected</td></tr>
            <tr><td class="pd-spec-name">Cut Type</td><td class="pd-spec-detail">Computerized Optical Laser Die-Cut to Exact Artwork Contour</td></tr>
            <tr><td class="pd-spec-name">Minimum Order Quantity</td><td class="pd-spec-detail">25 Pieces (Custom Batches up to 10,000+ available)</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Tab 3: Artwork Guide -->
      <div class="pd-tab-content-panel" id="tab-guide">
        <h3 style="font-size:20px; font-weight:850; color:#081f3a; margin:0 0 12px;">Artwork Preparation &amp; Upload Specifications</h3>
        <ul style="font-size:14.5px; color:#475569; line-height:1.7; padding-left:20px; margin-bottom:16px;">
          <li><strong>Resolution:</strong> 300 DPI or higher at 100% print scale for razor-sharp results.</li>
          <li><strong>Color Mode:</strong> CMYK color space recommended (RGB files will be converted automatically).</li>
          <li><strong>Bleed &amp; Safety:</strong> Maintain a 2mm safety zone inside your cut line for text and logos.</li>
          <li><strong>Supported File Formats:</strong> PDF, PNG with transparent background, AI, SVG, PSD, TIFF, or high-res JPG.</li>
          <li><strong>Cut-Line Generation:</strong> We automatically create precise kiss-cut / die-cut outlines for you free of charge!</li>
        </ul>
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:14px 18px; font-size:13.5px; color:#075092;">
          <strong style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="help-circle" style="width:14px;height:14px;"></i> Need formatting assistance?</strong> Don't worry if your file isn't print-ready. Our pre-press operator will inspect and optimize your artwork on WhatsApp before we print!
        </div>
      </div>

      <!-- Tab 4: Delivery & Returns -->
      <div class="pd-tab-content-panel" id="tab-shipping">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
          <div>
            <h4 style="font-size:16px; font-weight:800; color:#081f3a; margin:0 0 8px;">Production &amp; Dispatch Timeline</h4>
            <p style="font-size:14px; color:#475569; line-height:1.55;">
              • <strong>Standard Orders:</strong> Dispatched in 1–2 business days.<br>
              • <strong>Same-Day Urgent Orders:</strong> Available on request for local Lucknow pickup.<br>
              • <strong>Store Pickup:</strong> Free pickup from One Point Suvidha Kendra, LDA Colony, Lucknow.
            </p>
          </div>
          <div>
            <h4 style="font-size:16px; font-weight:800; color:#081f3a; margin:0 0 8px;">100% Quality &amp; Reprint Guarantee</h4>
            <p style="font-size:14px; color:#475569; line-height:1.55;">
              If your stickers have any printing defects, incorrect cuts, or transit damage, we offer an immediate free reprint or replacement upon sharing a photo proof on WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4-Step How Your Order Works Timeline -->
    <section class="pd-process-flow-section">
      <div class="pd-process-inner">
        <div class="pd-section-header-center">
          <p class="pd-section-kicker">Simple &amp; Transparent</p>
          <h2 class="pd-section-title">How Your Custom Print Order Works</h2>
        </div>
        <div class="pd-timeline-grid">
          <div class="pd-timeline-card">
            <div class="pd-step-circle">1</div>
            <strong>1. Choose Options</strong>
            <span>Select shape, size, material, finish and batch quantity.</span>
          </div>
          <div class="pd-timeline-card">
            <div class="pd-step-circle">2</div>
            <strong>2. Upload Artwork</strong>
            <span>Attach your logo or file directly, or request free design desk help.</span>
          </div>
          <div class="pd-timeline-card">
            <div class="pd-step-circle">3</div>
            <strong>3. WhatsApp Proof</strong>
            <span>Receive digital cut-line preview on WhatsApp for approval.</span>
          </div>
          <div class="pd-timeline-card">
            <div class="pd-step-circle">4</div>
            <strong>4. Print &amp; Deliver</strong>
            <span>Precision printing, laser cut, and fast delivery or store pickup.</span>
          </div>
        </div>
      </div>
    </section>

        <!-- Related Products ("From Sticker Printing") -->
    ${related.length ? `
      <section class="pd-related-section">
        <div class="pd-related-header-row">
          <div>
            <p class="pd-section-kicker">More Like This</p>
            <h2>From <span class="h2-gold">${product.category}</span></h2>
          </div>
          <a href="products.html#${product.categorySlug}" class="pd-view-all-cat-btn">
            View All ${product.category} &rarr;
          </a>
        </div>
        <div class="pd-related-grid">
          ${related.map((rel) => `
            <article class="pd-rel-product-card">
              <a href="${rel.href}">
                <div class="pd-rel-image-wrap">
                  <img src="${rel.images[0]}" alt="${rel.name}" loading="lazy" decoding="async">
                  <span class="pd-rel-badge-top">${rel.badge || "Popular"}</span>
                  <span class="pd-rel-rating-badge">★ ${rel.rating || "4.8"}</span>
                </div>
                <div class="pd-rel-card-body">
                  <h3>${rel.name}</h3>
                  <p>${rel.description}</p>
                </div>
              </a>
              <div class="pd-rel-card-footer">
                <div class="pd-rel-price-tag">
                  <span>Starting at</span>
                  <strong>&#8377;${rel.price}</strong>
                </div>
                <a class="pd-rel-cta-btn" href="${rel.href}">Customize &rarr;</a>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}

    <!-- Frequently Asked Questions -->
    <section class="pd-faq-container">
      <div class="pd-section-header-center" style="margin-bottom:24px;">
        <p class="pd-section-kicker">Got Questions?</p>
        <h2 class="pd-section-title">Frequently Asked Questions</h2>
      </div>

      <div class="pd-faq-row-item is-open">
        <div class="pd-faq-question-btn">
          <span>Can you create a custom cut line for my design or logo?</span>
          <i data-lucide="chevron-down" class="pd-faq-icon-arrow" style="width:16px;height:16px;"></i>
        </div>
        <div class="pd-faq-answer-body">
          Yes, absolutely! Simply upload your artwork, logo, or image. Our pre-press design software automatically generates a smooth laser contour cut line with a balanced white or transparent border, and we send you a digital proof on WhatsApp for confirmation before printing.
        </div>
      </div>

      <div class="pd-faq-row-item">
        <div class="pd-faq-question-btn">
          <span>Will I receive a digital proof before printing starts?</span>
          <i data-lucide="chevron-down" class="pd-faq-icon-arrow" style="width:16px;height:16px;"></i>
        </div>
        <div class="pd-faq-answer-body">
          Yes. Every custom print order is checked by our team and a high-resolution WhatsApp proof showing the exact cut-lines, dimensions, and color layout is sent for your 100% approval before we put the job into production.
        </div>
      </div>

      <div class="pd-faq-row-item">
        <div class="pd-faq-question-btn">
          <span>Are these die-cut stickers 100% waterproof and outdoor safe?</span>
          <i data-lucide="chevron-down" class="pd-faq-icon-arrow" style="width:16px;height:16px;"></i>
        </div>
        <div class="pd-faq-answer-body">
          Yes! Our die-cut stickers are crafted using premium outdoor-grade vinyl with protective UV-resistant lamination. They are resistant to rain, sunshine, scratches, oil, and are even safe on insulated water bottles and automobiles.
        </div>
      </div>

      <div class="pd-faq-row-item">
        <div class="pd-faq-question-btn">
          <span>Which file formats are best to upload?</span>
          <i data-lucide="chevron-down" class="pd-faq-icon-arrow" style="width:16px;height:16px;"></i>
        </div>
        <div class="pd-faq-answer-body">
          We accept all common formats: PNG (with transparent background), PDF, AI, SVG, PSD, EPS, or high-resolution JPG (300 DPI). If you don't have high-res artwork, our designers can vectorize or sharpen your logo for free.
        </div>
      </div>

      <div class="pd-faq-row-item">
        <div class="pd-faq-question-btn">
          <span>Can I order custom sizes or split my order across multiple designs?</span>
          <i data-lucide="chevron-down" class="pd-faq-icon-arrow" style="width:16px;height:16px;"></i>
        </div>
        <div class="pd-faq-answer-body">
          Yes, you can configure any custom width and height. For multi-design batch orders, you can choose a bulk tier and share all your design files with us on WhatsApp (+91 9473946181).
        </div>
      </div>

      <div class="pd-faq-row-item">
        <div class="pd-faq-question-btn">
          <span>What is the difference between Gloss and Matte finish?</span>
          <i data-lucide="chevron-down" class="pd-faq-icon-arrow" style="width:16px;height:16px;"></i>
        </div>
        <div class="pd-faq-answer-body">
          Gloss laminate provides a shiny, vibrant, glass-like reflection that makes bright colors pop. Matte finish offers a smooth, glare-free, satin velvet feel that looks modern and luxurious.
        </div>
      </div>
    </section>

    <!-- Floating Sticky Bottom Bar for Scroll -->
    <div class="pd-floating-order-bar" id="pd-floating-bar">
      <div class="pd-floating-inner">
        <div class="pd-floating-info">
          <strong>${product.name}</strong>
          <span id="pd-floating-summary">100 pcs · &#8377;299</span>
        </div>
        <a class="pd-floating-btn" id="pd-floating-buy" href="checkout.html?product=${product.slug}&qty=100">
          Customize &amp; Order
        </a>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // State Management for Dynamic Pricing & Selections
  let selectedShape = "Custom Contour";
  let selectedSize = '3" × 3"';
  let sizeMultiplier = 1.0;
  let selectedMaterial = "Premium Vinyl";
  let selectedFinish = "Gloss";
  let selectedQty = 100;
  let basePrice = 299;
  let uploadedFileName = "";

  const mainImg = root.querySelector("#pd-main-img");
  const mainBox = root.querySelector("#pd-main-box");

  // 1. Gallery Thumbnail Switcher
  root.querySelectorAll(".pd-thumb-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".pd-thumb-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      if (mainImg) { mainImg.src = btn.dataset.thumb; }
    });
  });

  // 2. Click to zoom modal / lightbox
  if (mainBox) {
    mainBox.addEventListener("click", () => {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed; inset:0; background:rgba(8,31,58,0.92); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out; padding:24px;";
      overlay.innerHTML = `
        <img src="${mainImg ? mainImg.src : imgs[0]}" alt="Full Zoom Preview" style="max-width:92vw; max-height:90vh; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.5); object-fit:contain;">
        <button style="position:absolute; top:24px; right:24px; background:#ffffff; border:none; border-radius:50%; width:44px; height:44px; font-size:24px; cursor:pointer; font-weight:bold; color:#081f3a; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.2);">&times;</button>
      `;
      overlay.addEventListener("click", () => document.body.removeChild(overlay));
      document.body.appendChild(overlay);
    });
  }

  // 3. Calculation and UI Sync Function
  function syncPricingEngine() {
    let materialExtra = (selectedMaterial === "Holographic") ? (selectedQty * 0.5) : 0;
    let calculatedTotal = Math.round((basePrice * sizeMultiplier) + materialExtra);
    let perItem = (calculatedTotal / selectedQty).toFixed(2);
    let baseRateForComparison = 3.96;
    let saved = Math.round((baseRateForComparison * selectedQty) - calculatedTotal);

    const priceEl = root.querySelector("#pd-sum-price");
    const configEl = root.querySelector("#pd-sum-config");
    const unitEl = root.querySelector("#pd-sum-unit");
    const saveEl = root.querySelector("#pd-sum-save");
    const buyBtn = root.querySelector("#pd-btn-buy");
    const waBtn = root.querySelector("#pd-btn-wa");
    const floatingSummary = root.querySelector("#pd-floating-summary");
    const floatingBuy = root.querySelector("#pd-floating-buy");

    if (priceEl) priceEl.innerHTML = `&#8377;${calculatedTotal}`;
    if (configEl) configEl.textContent = `${selectedQty} stickers · ${selectedSize} · ${selectedMaterial} · ${selectedFinish}`;
    if (unitEl) unitEl.innerHTML = `&#8377;${perItem} / piece`;
    if (saveEl) {
      if (saved > 15) {
        saveEl.textContent = `You Save ₹${saved} on Bulk`;
        saveEl.style.display = "inline-block";
      } else {
        saveEl.style.display = "none";
      }
    }
    if (floatingSummary) floatingSummary.textContent = `${selectedQty} pcs (${selectedSize}) · ₹${calculatedTotal}`;

    const checkoutUrl = `checkout.html?product=${product.slug}&shape=${encodeURIComponent(selectedShape)}&size=${encodeURIComponent(selectedSize)}&material=${encodeURIComponent(selectedMaterial)}&finish=${encodeURIComponent(selectedFinish)}&qty=${selectedQty}&total=${calculatedTotal}`;
    if (buyBtn) buyBtn.href = checkoutUrl;
    if (floatingBuy) floatingBuy.href = checkoutUrl;

    const waMsg = `Hi One Point, I want to order ${selectedQty} pcs ${product.name}.\n• Shape: ${selectedShape}\n• Size: ${selectedSize}\n• Material: ${selectedMaterial}\n• Finish: ${selectedFinish}\n• Total: Rs.${calculatedTotal}${uploadedFileName ? "\n• File: " + uploadedFileName : ""}`;
    if (waBtn) waBtn.href = `https://wa.me/919473946181?text=${encodeURIComponent(waMsg)}`;
  }

  // 4. Option Selectors (Shape, Size, Material, Finish)
  root.querySelectorAll(".pd-btn-grid").forEach((grid) => {
    const group = grid.dataset.group;
    grid.querySelectorAll(".pd-choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        grid.querySelectorAll(".pd-choice-btn").forEach(b => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        const val = btn.dataset.val;

        if (group === "shape") {
          selectedShape = val;
          const lbl = root.querySelector("#pd-lbl-shape");
          if (lbl) lbl.textContent = val;
        } else if (group === "size") {
          selectedSize = val;
          sizeMultiplier = parseFloat(btn.dataset.mult || "1.0");
          const lbl = root.querySelector("#pd-lbl-size");
          if (lbl) lbl.textContent = val;
        } else if (group === "material") {
          selectedMaterial = val;
          const lbl = root.querySelector("#pd-lbl-material");
          if (lbl) lbl.textContent = val;
        } else if (group === "finish") {
          selectedFinish = val;
          const lbl = root.querySelector("#pd-lbl-finish");
          if (lbl) lbl.textContent = val;
        }
        syncPricingEngine();
      });
    });
  });

  // 5. Quantity Tiers Matrix Click
  root.querySelectorAll(".pd-qty-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      root.querySelectorAll(".pd-qty-tile").forEach(t => t.classList.remove("is-selected"));
      tile.classList.add("is-selected");
      selectedQty = parseInt(tile.dataset.qty || "100");
      basePrice = parseFloat(tile.dataset.basePrice || "299");
      syncPricingEngine();
    });
  });

  // 6. Artwork File Upload Handling
  const fileInput = root.querySelector("#pd-file-input");
  const uploadStatus = root.querySelector("#pd-upload-status");
  const uploadActions = root.querySelector("#pd-upload-actions");
  const dropzone = root.querySelector("#pd-dropzone");
  const dropzoneHeading = root.querySelector("#pd-dropzone-heading");
  const fileNameLabel = root.querySelector("#pd-file-name-label");
  const btnReplace = root.querySelector("#pd-btn-replace");
  const btnRemove = root.querySelector("#pd-btn-remove");

  function setFileUploadedState(name) {
    uploadedFileName = name;
    if (fileNameLabel) fileNameLabel.textContent = name + " · ✓ Ready for Proof";
    if (uploadStatus) uploadStatus.style.display = "inline-flex";
    if (uploadActions) uploadActions.style.display = "flex";
    if (dropzoneHeading) dropzoneHeading.textContent = "✓ " + name;
    if (dropzone) {
      dropzone.style.borderColor = "#059669";
      dropzone.style.background = "#f0fdf4";
    }
    syncPricingEngine();
  }

  function resetFileUploadedState() {
    uploadedFileName = "";
    if (fileInput) fileInput.value = "";
    if (fileNameLabel) fileNameLabel.textContent = "File uploaded";
    if (uploadStatus) uploadStatus.style.display = "none";
    if (uploadActions) uploadActions.style.display = "none";
    if (dropzoneHeading) dropzoneHeading.textContent = "Click or drag your design file here";
    if (dropzone) {
      dropzone.style.borderColor = "";
      dropzone.style.background = "";
    }
    syncPricingEngine();
  }

  if (fileInput) {
    fileInput.addEventListener("change", function() {
      if (this.files && this.files[0]) {
        setFileUploadedState(this.files[0].name);
      }
    });
  }

  if (btnReplace) {
    btnReplace.addEventListener("click", (e) => {
      e.stopPropagation();
      if (fileInput) fileInput.click();
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      resetFileUploadedState();
    });
  }

  // 7. Add to Cart Handling
  const cartBtn = root.querySelector("#pd-btn-cart");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      addProductToCart(product.slug, selectedQty);
    });
  }

  // 8. Tabs Switching
  root.querySelectorAll(".pd-tab-nav-btn").forEach((tBtn) => {
    tBtn.addEventListener("click", () => {
      const tabId = "tab-" + tBtn.dataset.tab;
      root.querySelectorAll(".pd-tab-nav-btn").forEach(b => b.classList.remove("is-active"));
      root.querySelectorAll(".pd-tab-content-panel").forEach(p => p.classList.remove("is-active"));
      tBtn.classList.add("is-active");
      const targetPanel = root.querySelector("#" + tabId);
      if (targetPanel) targetPanel.classList.add("is-active");
    });
  });

  // 9. FAQ Accordion Toggle
  root.querySelectorAll(".pd-faq-question-btn").forEach((faqQ) => {
    faqQ.addEventListener("click", () => {
      const item = faqQ.closest(".pd-faq-row-item");
      if (item) item.classList.toggle("is-open");
    });
  });

  // 10. Sticky Bottom Bar Scroll Observer
  const floatingBar = root.querySelector("#pd-floating-bar");
  window.addEventListener("scroll", () => {
    if (!floatingBar) return;
    if (window.scrollY > 600) {
      floatingBar.classList.add("is-visible");
    } else {
      floatingBar.classList.remove("is-visible");
    }
  }, { passive: true });

  // Initial pricing calculation
  syncPricingEngine();
}






function getCart() {
  try {
    return JSON.parse(localStorage.getItem("oneMartCart") || "[]");
  } catch {
    return [];
  }
}

function setCart(cart) {
  localStorage.setItem("oneMartCart", JSON.stringify(cart));
  updateCartCount();
}

function addProductToCart(slug, quantity = 1) {
  const product = productBySlug(slug);
  if (!product) return;
  const cart = getCart();
  const existing = cart.find((item) => item.slug === slug);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ slug, quantity });
  }
  setCart(cart);
  showCartToast(`${product.name} added to cart`);
}

function updateCartCount() {
  const count = getCart().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = String(count);
    node.style.display = count ? "inline-flex" : "none";
  });
}

function renderCartDrawer() {
  if (document.querySelector("[data-cart-drawer]")) return;
  const drawer = document.createElement("div");
  drawer.className = "cart-drawer-shell";
  drawer.setAttribute("data-cart-drawer", "");
  drawer.innerHTML = `
    <div class="cart-backdrop" data-cart-close></div>
    <aside class="cart-drawer" aria-label="OneMart cart">
      <div class="cart-drawer-head">
        <div>
          <p class="section-kicker">OneMart</p>
          <h2>Your Cart</h2>
        </div>
        <button class="icon-button" type="button" data-cart-close aria-label="Close cart">${icon("x", 18)}</button>
      </div>
      <div class="cart-items" data-cart-items></div>
      <div class="cart-total">
        <span>Estimated total</span>
        <strong data-cart-total>Rs. 0</strong>
      </div>
      <a class="btn btn-primary" href="checkout.html" data-cart-checkout>${icon("credit-card", 18)} Checkout</a>
    </aside>
  `;
  document.body.appendChild(drawer);
}

function refreshCartDrawer() {
  renderCartDrawer();
  const cart = getCart();
  const itemsRoot = document.querySelector("[data-cart-items]");
  const totalRoot = document.querySelector("[data-cart-total]");
  const checkout = document.querySelector("[data-cart-checkout]");
  if (!itemsRoot || !totalRoot || !checkout) return;

  const enriched = cart
    .map((item) => ({ ...item, product: productBySlug(item.slug) }))
    .filter((item) => item.product);
  const total = enriched.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  itemsRoot.innerHTML = enriched.length
    ? enriched.map((item) => `
      <div class="cart-item">
        <img src="${item.product.images[0]}" alt="${item.product.name}" loading="lazy" decoding="async">
        <div>
          <strong>${item.product.name}</strong>
          <span>${productPriceLabel(item.product)} x ${item.quantity}</span>
        </div>
        <button type="button" data-remove-cart="${item.product.slug}" aria-label="Remove ${item.product.name}">${icon("trash-2", 16)}</button>
      </div>
    `).join("")
    : `<p class="cart-empty">Cart is empty. Add products from OneMart.</p>`;

  totalRoot.textContent = `Rs. ${total}`;
  checkout.href = "checkout.html";
  if (window.lucide) window.lucide.createIcons();
}

function showCartDrawer() {
  refreshCartDrawer();
  document.querySelector("[data-cart-drawer]")?.classList.add("open");
}

function hideCartDrawer() {
  document.querySelector("[data-cart-drawer]")?.classList.remove("open");
}

function showCartToast(message) {
  let toast = document.querySelector("[data-cart-toast]");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "cart-toast";
    toast.setAttribute("data-cart-toast", "");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showCartToast.timer);
  showCartToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function setupOneMartInteractions() {
  renderCartDrawer();
  updateCartCount();

  const rotators = [...document.querySelectorAll("[data-rotating-product]")].map((img) => {
    const product = productBySlug(img.dataset.rotatingProduct);
    return product ? { img, product, index: 0 } : null;
  }).filter(Boolean);

  if (rotators.length && !setupOneMartInteractions.rotatorStarted) {
    setupOneMartInteractions.rotatorStarted = true;
    setInterval(() => {
      document.querySelectorAll("[data-rotating-product]").forEach((img) => {
        const product = productBySlug(img.dataset.rotatingProduct);
        if (!product) return;
        const next = (Number(img.dataset.imageIndex || "0") + 1) % product.images.length;
        img.dataset.imageIndex = String(next);
        img.src = product.images[next];
      });
    }, 3200);
  }

  // store-rail carousel is now handled inside renderOneMartCatalog() via translateX

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-to-cart]");
    if (add) {
      event.preventDefault();
      const quantity = Number(document.querySelector("[data-product-qty]")?.value || "1") || 1;
      addProductToCart(add.dataset.addToCart, quantity);
      return;
    }

    if (event.target.closest("[data-cart-button]")) {
      event.preventDefault();
      showCartDrawer();
      return;
    }

    if (event.target.closest("[data-cart-close]")) {
      event.preventDefault();
      hideCartDrawer();
      return;
    }

    const remove = event.target.closest("[data-remove-cart]");
    if (remove) {
      event.preventDefault();
      setCart(getCart().filter((item) => item.slug !== remove.dataset.removeCart));
      refreshCartDrawer();
    }
  });

  document.querySelectorAll("[data-product-thumb]").forEach((button) => {
    button.addEventListener("click", () => {
      const img = document.querySelector("[data-product-main-image]");
      if (img) img.src = button.dataset.productThumb;
      document.querySelectorAll("[data-product-thumb]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelector("[data-qty-minus]")?.addEventListener("click", () => {
    const input = document.querySelector("[data-product-qty]");
    if (!input) return;
    input.value = String(Math.max(1, Number(input.value || "1") - 1));
  });

  document.querySelector("[data-qty-plus]")?.addEventListener("click", () => {
    const input = document.querySelector("[data-product-qty]");
    if (!input) return;
    input.value = String(Math.min(99, Number(input.value || "1") + 1));
  });
}

function setupImageLoading() {
  document.querySelectorAll("img").forEach((img, index) => {
    if (!img.hasAttribute("loading") && index > 1) img.loading = "lazy";
    if (!img.hasAttribute("decoding")) img.decoding = "async";
  });
}

function setupGallery() {
  const main = document.querySelector("[data-gallery-main]");
  if (!main) return;

  document.querySelectorAll("[data-thumb]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-thumb]").forEach((thumb) => thumb.classList.remove("active"));
      button.classList.add("active");
      main.src = button.dataset.thumb;
    });
  });
}

function setupTabs() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab-target]");
    if (!button) return;

    document.querySelectorAll("[data-tab-target]").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(button.dataset.tabTarget)?.classList.add("active");
  });
}

function setupRequiredDocumentsTabs() {
  document.querySelectorAll("[data-pan-doc-tabs]").forEach((root) => {
    const tabs = [...root.querySelectorAll("[data-pan-doc-tab]")];
    const panels = [...root.querySelectorAll("[data-pan-doc-panel]")];
    const image = root.querySelector("[data-pan-doc-image]");
    const imageTitle = root.querySelector("[data-pan-doc-image-title]");
    const imageLabel = root.querySelector("[data-pan-doc-image-label]");

    if (!tabs.length || !panels.length) return;

    const activateTab = (activeTab) => {
      const target = activeTab.dataset.panDocTab;

      tabs.forEach((tab) => {
        const isActive = tab === activeTab;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panDocPanel === target);
      });

      if (image && activeTab.dataset.image) {
        image.src = activeTab.dataset.image;
        image.alt = `${activeTab.dataset.imageTitle || activeTab.textContent.trim()} document preview`;
      }

      if (imageTitle) {
        imageTitle.textContent = activeTab.dataset.imageTitle || activeTab.textContent.trim();
      }

      if (imageLabel) {
        imageLabel.textContent = activeTab.dataset.imageLabel || "Document checklist";
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateTab(tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;

        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;

        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex]);
      });
    });

    activateTab(tabs.find((tab) => tab.classList.contains("active")) || tabs[0]);
  });
}

function setupReveal() {
  const items = [...document.querySelectorAll(".reveal")];
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  items.forEach((item) => observer.observe(item));
}

function setupActiveMobileNav() {
  const current = getCurrentPage();
  document.querySelectorAll(".mobile-bottom-nav a").forEach((link) => {
    if (link.getAttribute("href") === current) {
      link.classList.add("active");
    }
  });
}

function setupContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const select = form.querySelector("[data-service-select]");
  const formGrid = form.querySelector("[data-form-grid]");
  const formSuccess = form.querySelector("[data-form-success]");
  const formResetBtn = form.querySelector("[data-form-reset]");
  const otherServiceWrapper = form.querySelector("[data-other-service-wrapper]");
  const formTitle = document.querySelector("[data-contact-title]");
  const formSummary = document.querySelector("[data-contact-summary]");
  const successMessage = form.querySelector("[data-contact-success-message]");
  const serviceGuidance = form.querySelector("[data-service-guidance]");
  const attachmentTitle = form.querySelector("[data-attachment-title]");
  const attachmentSummary = form.querySelector("[data-attachment-summary]");
  const paymentNote = form.querySelector("[data-payment-note]");
  const safeNote = form.querySelector("[data-safe-note]");
  const requestTime = form.querySelector("[data-request-time]");
  const requestMode = form.querySelector("[data-request-mode]");
  const notesField = form.querySelector("#contact-documents");
  const trustTitle = form.querySelector("[data-trust-title]");
  const trustDesc = form.querySelector("[data-trust-desc]");
  const trustBullets = form.querySelector("[data-trust-bullets]");
  const trustIconBox = form.querySelector("[data-trust-icon-container]");
  if (!select || !otherServiceWrapper) return;
  const otherServiceInput = otherServiceWrapper.querySelector("input");

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedService = urlParams.get("service");
  const category = urlParams.get("category");

  const serviceMap = {
    'edupoint': navItems.find(i => i.label === 'EduPoint')?.children || [],
    'student': navItems.find(i => i.label === 'EduPoint')?.children || [],
    'e-services': navItems.find(i => i.label === 'E-Services')?.children || [],
    'proserve': navItems.find(i => i.label === 'ProServe')?.children || [],
    'onemart': [...new Set(oneMartGroups.flatMap(group => [group.title, ...group.items]))],
    'travel-services': megaGroups.find(g => g.title === 'Travel Services')?.items.map(i => i[0]) || [],
    'travel': megaGroups.find(g => g.title === 'Travel Services')?.items.map(i => i[0]) || [],
    'csc-services': megaGroups.find(g => g.title === 'CSC Services')?.items.map(i => i[0]) || [],
    'documentation': megaGroups.find(g => g.title === 'Documentation')?.items.map(i => i[0]) || [],
    'print-scan': ["Print & Scan", "Photocopy & Printing", "Photocopy & Print", "Color Printing", "Document Scanning", "Scanning", "Lamination", "Lamination Support"],
    'bill-recharge': megaGroups.find(g => g.title === 'Bill & Recharge')?.items.map(i => i[0]) || [],
    'design-services': megaGroups.find(g => g.title === 'Design Services')?.items.map(i => i[0]) || [],
    'design': megaGroups.find(g => g.title === 'Design Services')?.items.map(i => i[0]) || [],
  };

  let servicesToShow = [];
  if (category && serviceMap[category]) {
    servicesToShow = serviceMap[category];
  } else {
    servicesToShow = [ "PAN Card", "Ayushman Card", "Exam Form Filling", "Admit Card Download", "GST Registration", "Bus Ticket", "Train Ticket" ];
  }

  select.innerHTML = '<option value="" disabled>Select a service...</option>';
  servicesToShow.forEach(service => {
    const option = document.createElement("option");
    option.value = service;
    option.textContent = service;
    select.appendChild(option);
  });

  select.innerHTML += `<option value="General Support">General Support</option><option value="other">Other service...</option>`;

  const decodedService = preselectedService ? decodeURIComponent(preselectedService) : null;
  const selectedServiceLabel = () => select.value === "other"
    ? otherServiceInput?.value?.trim()
    : select.value;
  const serviceProfiles = [
    {
      test: /pan|aadhaar|ayushman|voter|passport|birth|income|domicile|caste|police/i,
      icon: "shield-check",
      title: "Government Desk",
      detail: "Prepare official proofs to ensure 100% successful verification and processing.",
      attachTitle: "Attach official documents",
      attachSummary: "Upload only required proofs or share a verified Drive / OneDrive link.",
      placeholder: "Example: Aadhaar available, correction needed, DOB/address proof ready",
      payment: "Receipt can be added after exact service fee is confirmed.",
      safe: "Share Aadhaar front/back only after operator confirmation on verified WhatsApp.",
      time: "Same day",
      mode: "CSC/portal",
      docs: ["Aadhaar Card", "DOB & Address Proof", "Applicant Photo", "Active Mobile Number"]
    },
    {
      test: /gst|msme|signature|fssai|shop|iec|trademark|company/i,
      icon: "briefcase",
      title: "Business Desk",
      detail: "Share registration and KYC details to start quick filing and licensing.",
      attachTitle: "Attach business proofs",
      attachSummary: "Upload owner KYC, address proof, firm details or share a business folder link.",
      placeholder: "Example: Proprietor PAN ready, shop address proof ready, GST/MSME needed",
      payment: "Add transaction ID after business filing fee confirmation.",
      safe: "Keep bank and KYC files view-only in cloud links.",
      time: "1-3 days",
      mode: "filing desk",
      docs: ["Proprietor PAN & Aadhaar", "Business Address Proof", "GST/MSME Details (if any)", "Bank Account Details"]
    },
    {
      test: /photocopy|printing|print|scan|scanning|lamination|copy|pdf|jpeg/i,
      icon: "printer",
      title: "Print Desk",
      detail: "Share page count, file type and finish requirements before final quote.",
      attachTitle: "Attach print or scan files",
      attachSummary: "Upload PDFs/images, photos, certificates or paste a shared Drive link.",
      placeholder: "Example: 10 A4 B&W pages, 2 color copies, scan to PDF, laminate one certificate",
      payment: "Payment proof can be added after page count and quote confirmation.",
      safe: "Use clear files and avoid sharing passwords for cloud links.",
      time: "30 min",
      mode: "print desk",
      docs: ["Print File or Original Document", "Page Size & Quantity", "Color/B&W Preference", "Delivery or Collection Details"]
    },
    {
      test: /exam|admit|result|scholarship|resume|university|ccc|o level/i,
      icon: "graduation-cap",
      title: "Student Desk",
      detail: "Keep academic IDs and detail cards handy for error-free form submissions.",
      attachTitle: "Attach student documents",
      attachSummary: "Upload marksheet/admit card or paste student portal document links.",
      placeholder: "Example: Roll number, registration ID, course name, exam/session details",
      payment: "Receipt is optional. Exam fee proof can be added after payment.",
      safe: "Do not share student portal password in this form.",
      time: "30 min",
      mode: "student desk",
      docs: ["Marksheet or Admit Card", "Registration ID & Roll Number", "Candidate Passport Photo", "Course/Exam Details"]
    },
    {
      test: /ticket|flight|train|bus|hotel|tour/i,
      icon: "plane",
      title: "Travel Booking",
      detail: "Verify passenger details before completing standard portal ticket generation.",
      attachTitle: "Attach travel IDs",
      attachSummary: "Upload passenger ID or paste a shared file link for group bookings.",
      placeholder: "Example: Passenger names, age, route, date, berth/seat preference",
      payment: "Add receipt after fare and seat availability are confirmed.",
      safe: "Ticket fares change quickly. Final booking happens only after confirmation.",
      time: "Live",
      mode: "booking desk",
      docs: ["Passenger Photo ID Proof", "Travel Route & Dates", "Berth or Seat Preferences", "Passenger Mobile Number"]
    },
    {
      test: /sticker|mug|frame|cover|plaque|t-shirt|shirt|branding|card|flyer|poster|label|dtf|wedding|canvas|magnet|packaging|anime/i,
      icon: "sparkles",
      title: "Print Desk",
      detail: "Upload design/artwork assets to get precise quotes and quick prints.",
      attachTitle: "Attach artwork files",
      attachSummary: "Upload print files, logos, reference images or share Drive / OneDrive folders.",
      placeholder: "Example: Size, quantity, finish, color, design file link and delivery preference",
      payment: "Payment proof can be added after artwork and final quote approval.",
      safe: "Use high-resolution artwork for better print quality.",
      time: "2-4 hrs",
      mode: "print desk",
      docs: ["High-Res Artwork/Design", "Reference Image/Layout", "Size & Quantity Specs", "Delivery Address Details"]
    }
  ];

  const profileFor = (label = "") => serviceProfiles.find((profile) => profile.test.test(label)) || {
    icon: "list-checks",
    title: "General Desk",
    detail: "Submit your requirement details and our executive will contact you to proceed.",
    attachTitle: "Attach documents your way",
    attachSummary: "Upload from device or paste a shared Google Drive / OneDrive link.",
    placeholder: "Example: Service details, document names, preferred timeline or special instructions",
    payment: "Optional now. Add receipt only if payment is already done.",
    safe: "Share sensitive IDs only after operator confirmation on verified WhatsApp.",
    time: "30 min",
    mode: "WhatsApp",
    docs: ["Basic ID Proof (Aadhaar)", "Requirement Description", "Reference Document (if any)", "Contact Details"]
  };

  const updateContactHeading = () => {
    const label = selectedServiceLabel();
    const serviceName = label ? label : (category ? category : "Service");
    const profile = profileFor(label || category || "");
    if (formTitle) {
      formTitle.innerHTML = label
        ? `Start ${serviceName} <span class="h2-gold">Request</span>`
        : 'Start Service <span class="h2-gold">Request</span>';
    }
    if (formSummary) {
      formSummary.textContent = "Share details for operator review. Submitting will seamlessly transition you to our unified secure checkout portal.";
    }
    if (trustTitle) {
      trustTitle.textContent = profile.title || "Quick Operator Review";
    }
    if (trustDesc) {
      trustDesc.textContent = profile.detail || "Our dedicated desk reviews your submitted application details and files within 2 hours.";
    }
    if (trustIconBox) {
      trustIconBox.innerHTML = icon(profile.icon || "sparkles", 38);
    }
    if (trustBullets && profile.docs) {
      trustBullets.innerHTML = `
        <div class="text-xs font-bold uppercase tracking-wide" style="color: #C9921A; margin-bottom: 8px;">Required Documents:</div>
        ${profile.docs.map(doc => `
          <div class="form-trust-bullet-item">
            ${icon("file-check", 16)}
            <span>${doc}</span>
          </div>
        `).join('')}
      `;
    }
    if (serviceGuidance) {
      serviceGuidance.innerHTML = `
        <span class="service-guidance-icon">${icon(profile.icon || "shield-check", 22)}</span>
        <div>
          <strong>${serviceName} Checklist & Fee</strong>
          <p>Keep required documents ready. The current payable amount is loaded from Master Pricing before checkout.</p>
        </div>
      `;
    }
    if (window.lucide) window.lucide.createIcons();
    const consentSpan = document.querySelector('.request-consent span');
    if (consentSpan) {
      consentSpan.textContent = `I agree to share required documents for ${serviceName} service processing and understand that final approval depends on the official department.`;
    }
    if (notesField) notesField.placeholder = profile.placeholder || "Example: Document details, correction needed, or special instructions";
  };

  if (decodedService) {
    if (servicesToShow.includes(decodedService)) {
      select.value = decodedService;
    } else {
      select.value = 'other';
      otherServiceWrapper.style.display = 'block';
      otherServiceInput.value = decodedService;
      otherServiceInput.required = true;
    }
  } else {
    select.value = "";
  }
  updateContactHeading();

  select.addEventListener("change", () => {
    if (select.value === "other") {
      otherServiceWrapper.style.display = "block";
      otherServiceInput.required = true;
      otherServiceInput.focus();
    } else {
      otherServiceWrapper.style.display = "none";
      otherServiceInput.required = false;
      otherServiceInput.value = "";
    }
    updateContactHeading();
  });

  otherServiceInput?.addEventListener("input", updateContactHeading);

  form.addEventListener("submit", (e) => {
    e.preventDefault(); // Prevent standard submission for now
    const mobile = form.querySelector('input[name="mobile"]');
    const digits = mobile?.value.replace(/\D/g, "") || "";

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (digits.length !== 10) {
      mobile?.setCustomValidity("Please enter a valid 10-digit mobile number.");
      mobile?.reportValidity();
      mobile?.setCustomValidity("");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Submitting Review...';
    submitBtn.disabled = true;
    if (window.lucide) window.lucide.createIcons();

    // Simulate network request processing
    setTimeout(() => {
      if (formGrid && formSuccess) {
        formGrid.style.display = "none";
        formSuccess.style.display = "block";
        if (successMessage) {
          successMessage.textContent = `Your ${selectedServiceLabel() || "service"} request is received. We will contact you on your mobile number with document and payment verification steps.`;
        }
        if (window.lucide) window.lucide.createIcons();
      }
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      form.reset();
      select.dispatchEvent(new Event('change')); // Hide "other" input
    }, 800);
  });

  if (formResetBtn) {
    formResetBtn.addEventListener("click", () => {
      formSuccess.style.display = "none";
      formGrid.style.display = "grid";
      updateContactHeading();
    });
  }
}

let opdsCsrfToken = "";

async function getPaymentCsrfToken() {
  if (opdsCsrfToken) return opdsCsrfToken;
  const response = await fetch("/api/csrf");
  const data = await response.json();
  opdsCsrfToken = data.csrfToken || "";
  return opdsCsrfToken;
}

async function paymentApi(path, options = {}) {
  const csrf = await getPaymentCsrfToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Payment request failed.");
  return data;
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((script) => script.src === src)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Payment script could not load."));
    document.head.appendChild(script);
  });
}

async function openGatewaySession(orderResponse) {
  const payment = orderResponse.payment;
  if (!payment) throw new Error("Payment session missing.");

  const paymentSuccessUrl = () => {
    const params = new URLSearchParams({
      redirect: "dashboard"
    });
    if (payment.orderId) params.set("order_id", payment.orderId);
    const phone = localStorage.getItem("opds_testing_user") || "";
    if (phone) params.set("phone", phone);
    return `payment-success.html?${params.toString()}`;
  };

  if (payment.sessionType === "redirect") {
    window.location.href = payment.session.redirectUrl;
    return;
  }

  if (payment.sessionType === "razorpay_checkout") {
    await loadExternalScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!window.Razorpay) throw new Error("Razorpay checkout unavailable.");
    const options = {
      ...payment.session,
      handler: async (response) => {
        await paymentApi("/api/payments/verify", {
          method: "POST",
          body: JSON.stringify({ gateway: "razorpay", ...response })
        });
        window.location.href = paymentSuccessUrl();
      },
      modal: {
        ondismiss: () => {
          window.location.href = `payment-pending.html?order_id=${encodeURIComponent(payment.orderId)}&payment_id=${encodeURIComponent(payment.paymentId)}`;
        }
      }
    };
    new window.Razorpay(options).open();
    return;
  }

  window.location.href = `payment-pending.html?order_id=${encodeURIComponent(payment.orderId)}`;
}

function inferServiceSlug(form) {
  if (form.dataset.serviceSlug) return form.dataset.serviceSlug;
  const hidden = form.querySelector('input[name="service_slug"]')?.value;
  if (hidden) return hidden;
  const page = getCurrentPage();
  const map = {
    "service-pan-card.html": "pan-card",
    "service-gst-registration.html": "gst-registration",
    "service-business-registration-corporate-setup.html": "msme-registration",
    "service-legal-drafting-court-services.html": "legal-drafting-court-services",
    "service-fssai-license.html": "fssai-license",
    "service-shop-license.html": "shop-license",
    "service-iec-code.html": "iec-code",
    "service-trademark-registration.html": "trademark-registration",
    "service-company-registration.html": "company-registration",
    "print-scan.html": "print-scan",
    "service-photocopy-printing.html": "photocopy-printing",
    "service-color-printing.html": "color-printing",
    "service-document-scanning.html": "document-scanning",
    "service-lamination.html": "lamination",
    "edupoint.html": "exam-form-filling",
    "business-solutions.html": "gst-registration",
    "online-services.html": "pan-card"
  };
  return map[page] || "pan-card";
}

function getServiceBookingKey(form) {
  if (form.dataset.idempotencyKey) return form.dataset.idempotencyKey;
  const service = inferServiceSlug(form);
  form.dataset.idempotencyKey = `svc_${service}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return form.dataset.idempotencyKey;
}

function unifiedApplyProfile(label = "", category = "") {
  const value = `${label} ${category}`.toLowerCase();
  const profiles = [
    {
      test: /pan|aadhaar|ayushman|voter|passport|birth|income|domicile|caste|police|kisan|pension|jan seva/i,
      icon: "shield-check",
      detail: "Provide your basic details and keep official documents ready for operator review.",
      upload: "Attach Aadhaar, address proof, DOB proof, photos or paste a shared Google Drive link.",
      docs: "Aadhaar, address proof, DOB proof, photo/signature scans",
      placeholder: "Example: Aadhaar available, correction needed, DOB/address proof ready"
    },
    {
      test: /gst|msme|signature|fssai|shop|iec|trademark|company|business/i,
      icon: "briefcase",
      detail: "Provide business details and keep KYC documents ready for operator review.",
      upload: "Attach owner KYC, address proof, firm documents or paste a shared business folder link.",
      docs: "Owner KYC, business address proof, firm details, bank details",
      placeholder: "Example: Proprietor PAN ready, shop address proof ready, GST/MSME needed"
    },
    {
      test: /photocopy|printing|print|scan|scanning|lamination|copy|pdf|jpeg/i,
      icon: "printer",
      detail: "Provide print, scan or lamination details so the operator can confirm page count and quote.",
      upload: "Attach print files, photos, certificates or paste a shared Drive link for quick review.",
      docs: "Print file, page size, quantity, color mode, scan format or lamination size",
      placeholder: "Example: 10 A4 B&W pages, 2 color copies, scan to PDF, laminate one certificate"
    },
    {
      test: /exam|admit|result|scholarship|resume|university|ccc|o level/i,
      icon: "graduation-cap",
      detail: "Provide student or document details for quick form and print support.",
      upload: "Attach marksheet, admit card, student ID, photo or paste the related portal document link.",
      docs: "Marksheet/admit card, registration ID, photo, course or exam details",
      placeholder: "Example: Roll number, registration ID, course name, exam/session details"
    },
    {
      test: /ticket|flight|train|bus|hotel|tour|travel/i,
      icon: "plane",
      detail: "Provide passenger and route details before ticket or booking confirmation.",
      upload: "Attach passenger ID proof or paste a shared file link for group booking details.",
      docs: "Passenger ID proof, route/date details, seat preference, mobile number",
      placeholder: "Example: Passenger names, age, route, date, berth/seat preference"
    },
    {
      test: /design|logo|flex|banner|card|post|print|sticker|mug|frame|shirt|plaque|label|order/i,
      icon: "sparkles",
      detail: "Provide design, artwork or print requirements so the operator can confirm the quote.",
      upload: "Attach artwork, logo, reference images or paste a shared Google Drive folder.",
      docs: "Artwork/design files, reference image, size, quantity and delivery details",
      placeholder: "Example: Size, quantity, finish, color, design file link and delivery preference"
    }
  ];

  return profiles.find((profile) => profile.test.test(value)) || {
    icon: "list-checks",
    detail: "Provide service details and our operator will review the request before checkout.",
    upload: "Attach required files or paste a shared Google Drive link.",
    docs: "Basic ID proof, requirement details, reference document, contact details",
    placeholder: "Example: Service details, document names, preferred timeline or special instructions"
  };
}

function ensureHiddenInput(form, name) {
  let input = form.querySelector(`input[name="${name}"]`);
  if (input) return input;
  input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  form.prepend(input);
  return input;
}

function getAllServiceOptions() {
  const values = [
    "PAN Card",
    "New PAN",
    "PAN Correction",
    "E-PAN Download",
    "Card Reprint",
    ...navItems.flatMap((item) => item.children || []),
    ...megaGroups.flatMap((group) => group.items.map((item) => item[0])),
    ...servicesMegaGroups.flatMap((group) => group.items.map((item) => item[0])),
    ...Object.keys(serviceRoutes)
  ];
  return [...new Set(values)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function uniqueServiceOptions(values = []) {
  return [...new Set(values.map((value) => (value || "").trim()).filter(Boolean))];
}

function getApplyCategoryOptions(category = "general") {
  const key = (category || "general").toLowerCase();
  const map = {
    edupoint: navItems.find((item) => item.label === "EduPoint")?.children || [],
    student: navItems.find((item) => item.label === "EduPoint")?.children || [],
    "e-services": [
      "PAN Card",
      "New PAN",
      "PAN Correction",
      "E-PAN Download",
      "Card Reprint",
      "Ayushman Card",
      "Voter ID",
      "Passport Assistance",
      "Aadhaar Services Assistance",
      "Income Certificate",
      "Domicile Certificate",
      "Caste Certificate",
      "Pension & Welfare Schemes"
    ],
    proserve: [
      "GST Registration",
      "MSME Registration",
      "Digital Signature",
      "Digital Signature (DSC)",
      "FSSAI",
      "FSSAI License",
      "Shop License",
      "IEC Code",
      "Trademark",
      "Trademark Registration",
      "Company Registration"
    ],
    business: [
      "GST Registration",
      "MSME Registration",
      "Digital Signature",
      "Digital Signature (DSC)",
      "FSSAI",
      "FSSAI License",
      "Shop License",
      "IEC Code",
      "Trademark",
      "Trademark Registration",
      "Company Registration"
    ],
    onemart: ["Custom Print Order", "OneMart Bulk Order", ...oneMartGroups.flatMap((group) => [group.title, ...group.items])],
    products: ["Custom Print Order", "OneMart Bulk Order", ...oneMartGroups.flatMap((group) => [group.title, ...group.items])],
    "travel-services": megaGroups.find((group) => group.title === "Travel Services")?.items.map((item) => item[0]) || [],
    travel: megaGroups.find((group) => group.title === "Travel Services")?.items.map((item) => item[0]) || [],
    "print-scan": ["Print & Scan", "Photocopy & Printing", "Photocopy & Print", "Color Printing", "Document Scanning", "Scanning", "Lamination", "Lamination Support"],
    documentation: ["Print & Scan", "Photocopy & Printing", "Photocopy & Print", "Color Printing", "Document Scanning", "Scanning", "Lamination", "Lamination Support"],
    "design-services": ["Design Services", ...(megaGroups.find((group) => group.title === "Design Services")?.items.map((item) => item[0]) || [])],
    design: ["Design Services", ...(megaGroups.find((group) => group.title === "Design Services")?.items.map((item) => item[0]) || [])],
    "csc-services": [
      ...(megaGroups.find((group) => group.title === "CSC Services")?.items.map((item) => item[0]) || []),
      ...(megaGroups.find((group) => group.title === "Documentation")?.items.map((item) => item[0]) || []),
      ...(megaGroups.find((group) => group.title === "Bill & Recharge")?.items.map((item) => item[0]) || [])
    ],
    csc: [
      ...(megaGroups.find((group) => group.title === "CSC Services")?.items.map((item) => item[0]) || []),
      ...(megaGroups.find((group) => group.title === "Documentation")?.items.map((item) => item[0]) || []),
      ...(megaGroups.find((group) => group.title === "Bill & Recharge")?.items.map((item) => item[0]) || [])
    ],
    support: ["WhatsApp Support", "Call Support", "General Support"]
  };

  return uniqueServiceOptions(map[key] || []);
}

let websiteCatalogCache = null;

function escapeOption(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchWebsiteCatalog() {
  if (websiteCatalogCache) return websiteCatalogCache;
  // Launch (static hosting) → static snapshot pehle; live backend → API pehle.
  // Dono me doosra fallback hai, taaki backend ke bina bhi prices load hon.
  const sources = isWhatsAppLaunchMode()
    ? ["assets/catalog.json", "/api/products"]
    : ["/api/products", "assets/catalog.json"];
  let data = null;
  for (const url of sources) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const parsed = await response.json();
      if (parsed && (Array.isArray(parsed.services) || Array.isArray(parsed.products))) {
        data = parsed;
        break;
      }
    } catch (e) { /* next source */ }
  }
  if (!data) throw new Error("Catalog unavailable");
  websiteCatalogCache = {
    services: Array.isArray(data.services) ? data.services.filter((item) => item.active !== false) : [],
    serviceVariants: Array.isArray(data.serviceVariants) ? data.serviceVariants.filter((item) => item.active !== false) : [],
    products: Array.isArray(data.products) ? data.products.filter((item) => item.active !== false) : []
  };
  hydrateCatalogPriceLabels(websiteCatalogCache);
  window._applySelectedService?.();
  window.dispatchEvent(new CustomEvent("opds:catalog-ready", { detail: websiteCatalogCache }));
  return websiteCatalogCache;
}

function catalogCategoryAliases(category = "general") {
  const key = (category || "general").toLowerCase();
  const aliases = {
    edupoint: ["EduPoint"],
    student: ["EduPoint"],
    "e-services": ["E-Services", "Govt / E-Services"],
    proserve: ["ProServe", "Business"],
    business: ["ProServe", "Business"],
    onemart: ["Personalized Gifts", "Sticker Printing", "T-Shirt Printing", "UV DTF Printing", "Business Branding", "Trending Products"],
    products: ["Personalized Gifts", "Sticker Printing", "T-Shirt Printing", "UV DTF Printing", "Business Branding", "Trending Products"],
    "travel-services": ["Travel Services", "Travel Booking", "Travel"],
    travel: ["Travel Services", "Travel Booking", "Travel"],
    "design-services": ["Design Services"],
    design: ["Design Services"],
    "csc-services": ["CSC Services", "Documentation", "Bill & Recharge"],
    csc: ["CSC Services", "Documentation", "Bill & Recharge"]
  };
  return aliases[key] || [];
}

function getDynamicCatalogOptions(catalog, category = "general", requestedService = "") {
  const current = getCurrentPage();
  if (current === "contact.html" && category === "general") {
    const serviceOptions = (catalog.services || []).map((item) => item.name);
    const productOptions = (catalog.products || []).map((item) => item.name);
    const options = uniqueServiceOptions(["Select a Service", ...serviceOptions, ...productOptions]);
    return options;
  }

  const aliases = catalogCategoryAliases(category);
  if (!aliases.length) return [];

  const serviceOptions = (catalog.services || [])
    .filter((item) => aliases.includes(item.category))
    .map((item) => item.name);
  const productOptions = (catalog.products || [])
    .filter((item) => aliases.includes(item.category))
    .map((item) => item.name);
  const options = uniqueServiceOptions([...serviceOptions, ...productOptions]);

  if (requestedService && requestedService !== "Service Request" && !options.includes(requestedService)) {
    options.unshift(requestedService);
  }
  return options;
}

function normalizePricingLookup(value = "") {
  return slugify(String(value || "")
    .replace(/&amp;/gi, "and")
    .replace(/\+/g, " ")
    .trim());
}

function catalogServiceItems(catalog = websiteCatalogCache) {
  if (!catalog) return [];
  const services = Array.isArray(catalog.services) ? catalog.services : [];
  const variants = Array.isArray(catalog.serviceVariants) ? catalog.serviceVariants : [];
  const nestedVariants = services.flatMap((service) => Array.isArray(service.variants) ? service.variants : []);
  return [...variants, ...nestedVariants, ...services];
}

function catalogKeysForItem(item = {}) {
  const raw = [item.slug, item.name, item.serviceName, item.parentSlug, item.category].filter(Boolean);
  return Array.from(new Set(raw.flatMap((k) => {
    const s = normalizePricingLookup(k);
    return [s, s.replace(/-and-/g, "-"), s.replace(/-and-/g, ""), s.replace(/-/g, "")].filter(Boolean);
  })));
}

const MASTER_PRICE_PLACEHOLDER = "Price loading";
const RUPEE_SYMBOL = "\u20B9";

function amountFromDisplayPrice(value = "") {
  const text = String(value || "");
  const match = text.match(/(?:Rs\.?|Rupees?|INR|\u20B9|â‚¹)\s*([0-9][0-9,]*(?:\.\d+)?)/i);
  return match ? match[1].replace(/\.00$/, "") : "";
}

function actualAmountLabelForPricing(nameOrSlug = "", item = {}) {
  const text = `${nameOrSlug} ${item.name || ""} ${item.serviceName || ""} ${item.slug || ""} ${item.category || ""}`.toLowerCase();
  if (/(passport|trademark|portal|government|govt)/.test(text)) return "Govt Fee";
  if (/(bill|recharge|fastag|dth|water|electricity|mobile)/.test(text)) return "Bill Amount";
  if (/(insurance|premium)/.test(text)) return "Premium Amount";
  if (/(ticket|flight|train|bus|hotel|tour|travel|booking)/.test(text)) return "Fare Amount";
  return "Actual Amount";
}

function formatCatalogDisplayPrice(displayPrice = "", item = {}, requestedName = "") {
  const pricing = item.pricing || {};
  const model = item.pricingModel || pricing.model || "";
  const raw = String(displayPrice || item.displayPrice || pricing.displayPrice || "").trim();
  const amount = amountFromDisplayPrice(raw) || amountFromDisplayPrice(pricing.payableAmount || item.price || "");
  if (model === "service_charge_plus_actual" && amount) {
    return `${RUPEE_SYMBOL}${amount} + ${actualAmountLabelForPricing(requestedName, item)}`;
  }
  if (model === "starting_from" && amount) {
    return `Starting ${RUPEE_SYMBOL}${amount}`;
  }
  const normalized = raw
    .replace(/Starting from\s+Rs\.?\s*/i, `Starting ${RUPEE_SYMBOL}`)
    .replace(/Starting\s+Rs\.?\s*/i, `Starting ${RUPEE_SYMBOL}`)
    .replace(/Rs\.?\s*/gi, RUPEE_SYMBOL)
    .replace(/Rupees?\s*/gi, RUPEE_SYMBOL)
    .replace(/INR\s*/gi, RUPEE_SYMBOL)
    .replace(/â‚¹/g, RUPEE_SYMBOL)
    .replace(/\s*\+\s*actual amount/i, ` + ${actualAmountLabelForPricing(requestedName, item)}`)
    .trim();
  return normalized || MASTER_PRICE_PLACEHOLDER;
}

function normalizeCatalogPricing(item = {}, requestedName = "", explicitSlug = "") {
  const pricing = item.pricing || {};
  return {
    price: Number(pricing.payableAmount ?? item.price ?? 0),
    serviceCharge: item.serviceCharge !== undefined ? item.serviceCharge : (pricing.serviceCharge !== undefined ? pricing.serviceCharge : Number(pricing.payableAmount ?? item.price ?? 0)),
    officialFee: item.officialFee !== undefined ? item.officialFee : (pricing.officialFee !== undefined ? pricing.officialFee : 0),
    hasOfficialFee: item.hasOfficialFee !== undefined ? item.hasOfficialFee : Boolean(item.officialFee > 0 || pricing.officialFee > 0),
    officialFeeNote: item.officialFeeNote || pricing.officialFeeNote || "",
    serviceChargeNote: item.serviceChargeNote || pricing.serviceChargeNote || "",
    displayPrice: formatCatalogDisplayPrice(item.displayPrice || pricing.displayPrice, item, requestedName || explicitSlug),
    customerPriceNote: pricing.customerPriceNote || item.priceNote || "",
    pricingModel: item.pricingModel || pricing.model || "",
    taxRate: Number(item.taxRate ?? pricing.taxRate ?? 0),
    includesGovernmentFee: Boolean(pricing.includesGovernmentFee),
    calculationMode: pricing.calculationMode || "",
    duration: item.duration || item.timeline || "",
    slug: item.slug || explicitSlug || normalizePricingLookup(requestedName),
    name: item.name || item.serviceName || requestedName
  };
}

function findCatalogPricing(nameOrSlug = "", explicitSlug = "") {
  const alias = panServiceAlias(nameOrSlug);
  const rawKeys = [explicitSlug, nameOrSlug, alias?.key, alias?.slug, normalizePricingLookup(nameOrSlug)].filter(Boolean);
  const lookupKeys = Array.from(new Set(rawKeys.flatMap((k) => {
    const s = normalizePricingLookup(k);
    return [s, s.replace(/-and-/g, "-"), s.replace(/-and-/g, ""), s.replace(/-/g, "")].filter(Boolean);
  })));
  if (!lookupKeys.length) return null;
  const item = catalogServiceItems().find((candidate) => {
    const keys = catalogKeysForItem(candidate);
    return lookupKeys.some((key) => keys.includes(key));
  });
  if (item) return normalizeCatalogPricing(item, nameOrSlug, explicitSlug);
  if (typeof window !== "undefined" && window.OPDS_STATIC_PRICING) {
    for (const key of lookupKeys) {
      const staticEntry = window.OPDS_STATIC_PRICING[key];
      if (staticEntry) return staticEntry;
    }
  }
  return null;
}

// Real required-document list from the catalog (falls back to null, never fabricated).
function serviceDocsFor(nameOrSlug = "", explicitSlug = "") {
  const alias = panServiceAlias(nameOrSlug);
  const rawKeys = [explicitSlug, nameOrSlug, alias?.key, alias?.slug, normalizePricingLookup(nameOrSlug)].filter(Boolean);
  const lookupKeys = Array.from(new Set(rawKeys.flatMap((k) => {
    const s = normalizePricingLookup(k);
    return [s, s.replace(/-and-/g, "-"), s.replace(/-and-/g, ""), s.replace(/-/g, "")].filter(Boolean);
  })));
  if (!lookupKeys.length) return null;
  const item = catalogServiceItems().find((candidate) => {
    const keys = catalogKeysForItem(candidate);
    return lookupKeys.some((key) => keys.includes(key));
  });
  const docs = item && Array.isArray(item.requiredDocs) ? item.requiredDocs.filter(Boolean) : null;
  return docs && docs.length ? docs : null;
}

// Deterministic cosmetic rating (4.6-5.0) so cards don't all show an identical static number.
function serviceRatingFor(nameOrSlug = "") {
  const str = String(nameOrSlug || "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return (4.6 + (hash % 5) / 10).toFixed(1);
}

function servicePricingFor(nameOrSlug = "", explicitSlug = "") {
  const found = findCatalogPricing(nameOrSlug, explicitSlug);
  if (found) return found;
  const prof = typeof serviceProfiles !== "undefined" ? (serviceProfiles[nameOrSlug] || serviceProfiles[explicitSlug]) : null;
  if (prof?.price && prof.price !== MASTER_PRICE_PLACEHOLDER) {
    return {
      price: Number(amountFromDisplayPrice(prof.price) || 0),
      displayPrice: formatCatalogDisplayPrice(prof.price, {}, nameOrSlug),
      customerPriceNote: "Assistance fee with operator review included.",
      pricingModel: "all_inclusive",
      slug: explicitSlug || normalizePricingLookup(nameOrSlug),
      name: nameOrSlug || explicitSlug
    };
  }
  const fallbackPrices = {
    "Admission Assistance": "From ₹149",
    "Scholarship Assistance": "From ₹99",
    "Career Services": "From ₹149",
    "Competitive Exams": "From ₹99",
    "Admit Card & Results": "From ₹49",
    "Hotel Booking": "Assistance Included",
    "Flight Ticket": "Assistance Included",
    "Bus Ticket": "Assistance Included",
    "Train Ticket": "Assistance Included"
  };
  const smartFallback = fallbackPrices[nameOrSlug] || fallbackPrices[explicitSlug] || "From ₹99";

  return {
    price: 99,
    displayPrice: smartFallback,
    customerPriceNote: "Assistance fee with operator review included.",
    pricingModel: "catalog_pending",
    slug: explicitSlug || normalizePricingLookup(nameOrSlug),
    name: nameOrSlug || explicitSlug
  };
}

function serviceNameFromCard(card) {
  const button = card.querySelector(".btn-service-select[data-service]");
  if (button?.dataset.service) return button.dataset.service;
  const heading = card.querySelector("h3");
  if (heading?.textContent) return heading.textContent.trim();
  const href = card.getAttribute("href") || card.querySelector("a[href]")?.getAttribute("href") || "";
  if (href) {
    try {
      const url = new URL(href, window.location.href);
      return url.searchParams.get("service") || url.searchParams.get("service_name") || "";
    } catch (error) {}
  }
  return "";
}

function currentPageServiceForPricing() {
  const params = new URLSearchParams(window.location.search);
  return params.get("service_name")
    || params.get("service")
    || document.querySelector("[data-default-service]")?.getAttribute("data-default-service")
    || defaultApplyServiceForPage()
    || "";
}

function serviceNameForPricingElement(el) {
  return el?.dataset?.service
    || el?.dataset?.pricingService
    || serviceNameFromCard(el?.closest?.(".service-option-card"))
    || el?.closest?.("[data-service]")?.dataset?.service
    || currentPageServiceForPricing();
}

function setPricingElementText(el, pricing) {
  if (!el || !pricing?.displayPrice || pricing.displayPrice === MASTER_PRICE_PLACEHOLDER) return;
  if (el.classList.contains("sticky-cta-price")) {
    el.innerHTML = `${escapeOption(pricing.displayPrice)} <small>Display Price</small>`;
  } else {
    el.textContent = pricing.displayPrice;
  }
}

function hydrateJsonLdServicePricing() {
  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const data = JSON.parse(script.textContent || "{}");
      const serviceName = data.name || currentPageServiceForPricing();
      const pricing = servicePricingFor(serviceName);
      if (pricing?.displayPrice && pricing.displayPrice !== MASTER_PRICE_PLACEHOLDER) {
        if (data["@type"] === "Service") data.priceRange = pricing.displayPrice;
        if (data.provider && typeof data.provider === "object") data.provider.priceRange = pricing.displayPrice;
        script.textContent = JSON.stringify(data);
      }
    } catch (error) {}
  });
}

function findMainServicePricing(nameOrSlug = "") {
  // Search main services array first (skip variants) for top-level service cards
  const catalog = websiteCatalogCache;
  if (!catalog) return null;
  const key = normalizePricingLookup(nameOrSlug);
  if (!key) return null;
  const services = Array.isArray(catalog.services) ? catalog.services : [];
  const item = services.find(s => normalizePricingLookup(s.slug) === key || normalizePricingLookup(s.name) === key);
  if (item) return normalizeCatalogPricing(item, nameOrSlug);
  // Fallback to full lookup (includes variants) for specific sub-services
  return findCatalogPricing(nameOrSlug);
}

function hydrateCatalogPriceLabels(catalog = websiteCatalogCache) {
  if (!catalog) return;
  document.querySelectorAll(".service-option-card").forEach((card) => {
    let priceTag = card.querySelector(".price-tag");
    // Auto-inject price badge if card has a data-service button but no price tag
    if (!priceTag) {
      const btn = card.querySelector(".btn-service-select[data-service]");
      if (btn) {
        const serviceIcon = card.querySelector(".service-icon");
        if (serviceIcon) {
          const row = document.createElement("div");
          row.className = "service-card-top-row";
          serviceIcon.parentNode.insertBefore(row, serviceIcon.nextSibling);
          row.appendChild(serviceIcon);
          priceTag = document.createElement("span");
          priceTag.className = "tag price-tag";
          row.appendChild(priceTag);
        }
      }
    }
    if (!priceTag) return;
    const serviceName = serviceNameFromCard(card);
    // Use main-service lookup for top-level cards so variants don't shadow parent prices
    const pricing = findMainServicePricing(serviceName) || servicePricingFor(serviceName);
    setPricingElementText(priceTag, pricing);
  });
  document.querySelectorAll("[data-pricing-slot], .sticky-cta-price, .dsp-price").forEach((el) => {
    const pricing = servicePricingFor(serviceNameForPricingElement(el));
    setPricingElementText(el, pricing);
  });
  if (Array.isArray(window.currentQuickServices)) {
    window.currentQuickServices = window.currentQuickServices.map((service) => {
      const pricing = servicePricingFor(service.title);
      return pricing?.displayPrice ? { ...service, price: pricing.displayPrice } : service;
    });
  }
  hydrateJsonLdServicePricing();
}

window.OPDSPricing = {
  find: servicePricingFor,
  findMain: findMainServicePricing,
  hydrate: hydrateCatalogPriceLabels
};

function inferApplyCategory(explicitCategory = "", requestedService = "") {
  const current = getCurrentPage();
  const pageMap = {
    "online-services.html": "e-services",
    "service-pan-card.html": "e-services",
    "service-citizen-security-cybercrime-police-help.html": "e-services",
    "service-ayushman-card.html": "e-services",
    "service-voter-id.html": "e-services",
    "service-passport-assistance.html": "e-services",
    "service-aadhaar-services-assistance.html": "e-services",
    "service-state-certificates-civil-registration.html": "e-services",
    "service-income-certificate.html": "e-services",
    "service-transport-rto-facilitation.html": "e-services",
    "service-ration-card-assistance.html": "e-services",
    "service-pension-welfare-schemes-assistance.html": "e-services",
    "service-police-verification.html": "e-services",
    "business-solutions.html": "proserve",
    "service-income-tax-assistance.html": "proserve",
    "service-gst-registration.html": "proserve",
    "service-business-registration-corporate-setup.html": "proserve",
    "service-legal-drafting-court-services.html": "proserve",
    "service-fssai-license.html": "proserve",
    "service-shop-license.html": "proserve",
    "service-iec-code.html": "proserve",
    "service-trademark-registration.html": "proserve",
    "service-company-registration.html": "proserve",
    "print-scan.html": "print-scan",
    "service-photocopy-printing.html": "print-scan",
    "service-color-printing.html": "print-scan",
    "service-document-scanning.html": "print-scan",
    "service-lamination.html": "print-scan",
    "edupoint.html": "edupoint",
    "travel-services.html": "travel-services",
    "design-services.html": "design-services",
    "business-online-setup-services.html": "business-online-setup",
    "products.html": "onemart",
    "product-detail.html": "onemart",
    "support.html": "support"
  };

  if (current === "contact.html") {
    const params = new URLSearchParams(window.location.search);
    const fromPage = params.get("from");
    if (fromPage && pageMap[fromPage]) {
      return pageMap[fromPage];
    }

    let referrerPage = "";
    try {
      if (document.referrer) {
        const url = new URL(document.referrer);
        referrerPage = url.pathname.substring(url.pathname.lastIndexOf("/") + 1);
      }
    } catch (e) {}
    if (referrerPage && pageMap[referrerPage]) {
      return pageMap[referrerPage];
    }
  }

  if (pageMap[current]) return pageMap[current];
  if (explicitCategory && getApplyCategoryOptions(explicitCategory).length) return explicitCategory;

  const normalizedService = (requestedService || "").toLowerCase();
  const match = ["e-services", "proserve", "edupoint", "print-scan", "travel-services", "design-services", "csc-services", "onemart", "support"]
    .find((key) => getApplyCategoryOptions(key).some((service) => service.toLowerCase() === normalizedService));
  return match || "general";
}

function getScopedServiceOptions(category = "general", requestedService = "") {
  const current = getCurrentPage();
  if (current === "contact.html" && category === "general") {
    const allServices = [
      "Select a Service",
      // E-services
      "PAN Card", "New PAN", "PAN Correction", "E-PAN Download", "Card Reprint",
      "Ayushman Card", "Voter ID", "Passport Assistance", "Aadhaar Services Assistance",
      "Income Certificate", "Domicile Certificate", "Caste Certificate", "Pension & Welfare Schemes",
      // Business
      "GST Registration", "MSME Registration", "Digital Signature", "FSSAI License",
      "Shop License", "IEC Code", "Trademark Registration", "Company Registration",
      // Student
      "Exam Form Filling", "Scholarship Form", "College Admission Form", "University Registration",
      // Travel
      "Bus Ticket", "Flight Ticket", "Train Ticket Booking", "Hotel Booking", "Tour Package Assistance",
      // Print/Scan
      "Print & Scan", "Photocopy & Printing", "Color Printing", "Document Scanning", "Lamination",
      // Design
      "Logo Design", "Flex Design", "Visiting Card", "Banner Design", "Social Media Creative",
      // CSC
      "PM Kisan", "Pension Assistance", "Electricity Bill", "FASTag Recharge", "DTH Recharge"
    ];
    return uniqueServiceOptions(allServices);
  }

  const options = getApplyCategoryOptions(category);
  if (options.length) return options;
  if (requestedService && requestedService !== "Service Request") return [requestedService];
  return ["PAN Card", "Ayushman Card", "GST Registration", "Exam Form Filling", "Bus Ticket", "Logo Design"];
}

function defaultApplyServiceForPage() {
  const pageService = document.querySelector("[data-default-service]")?.getAttribute("data-default-service");
  if (pageService) return pageService;

  const current = getCurrentPage();
  const map = {
    "service-income-tax-assistance.html": "Income Tax Assistance",
    "service-pan-card.html": "PAN Card Application Assistance",
    "service-citizen-security-cybercrime-police-help.html": "Citizen Security, Cybercrime & Police Help",
    "service-ayushman-card.html": "Ayushman Card",
    "service-voter-id.html": "Voter ID",
    "service-passport-assistance.html": "Passport Assistance",
    "service-aadhaar-services-assistance.html": "Aadhaar Services Assistance",
    "service-state-certificates-civil-registration.html": "State Certificates & Civil Registration",
    "service-income-certificate.html": "State Certificates & Civil Registration",
    "service-domicile-certificate.html": "Learner’s Licence Online Application Support",
    "service-caste-certificate.html": "Caste Certificate",
    "service-pension-welfare-schemes-assistance.html": "Pension & Welfare Schemes",
    "service-police-verification.html": "Pension & Welfare Schemes",
    "online-services.html": "Ayushman Card",
    "business-solutions.html": "GST Registration",
    "service-gst-registration.html": "GST New Registration Support",
    "service-business-registration-corporate-setup.html": "MSME Registration",
    "service-legal-drafting-court-services.html": "Legal Drafting & Court Services Assistance",
    "service-fssai-license.html": "FSSAI License",
    "service-shop-license.html": "Shop License",
    "service-iec-code.html": "IEC Code",
    "service-trademark-registration.html": "Trademark Registration",
    "service-company-registration.html": "Company Registration",
    "print-scan.html": "Print & Scan",
    "service-photocopy-printing.html": "Photocopy & Printing",
    "service-color-printing.html": "Color Printing",
    "service-document-scanning.html": "Document Scanning",
    "service-lamination.html": "Lamination",
    "edupoint-admission-assistance.html": "Admission Assistance",
    "edupoint-competitive-exams.html": "Competitive Exam Application Assistance",
    "edupoint-university-services.html": "University & Academic Services",
    "edupoint-scholarship-assistance.html": "Scholarship Assistance",
    "edupoint-student-digital-services.html": "Student Digital Services",
    "edupoint-admit-card-results.html": "Admit Card & Result Assistance",
    "edupoint-online-payments.html": "Online Payment Assistance",
    "edupoint-study-academic-support.html": "Study & Academic Support",
    "edupoint-printing-documentation.html": "Printing & Documentation Services",
    "edupoint-career-services.html": "Career Services",
    "edupoint.html": "Exam Form Filling",
    "service-exam-form-filling.html": "Exam Form Filling",
    "travel-services.html": "Bus Ticket",
    "design-services.html": "Logo Design",
    "business-online-setup-services.html": "Business Online Setup Services",
    "products.html": "Custom Print Order",
    "support.html": "WhatsApp Support"
  };
  return map[current] || "";
}

function shouldInjectUnifiedApplyForm() {
  return false;
}

/* ─────────────────────────────────────────────────────
   FIREBASE CONFIG — apna Firebase project config yahan paste karo
   ───────────────────────────────────────────────────── */
const OPDS_FIREBASE_CONFIG = {
  apiKey:            "",
  authDomain:        "",
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             ""
};

function generateOrderId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `OP-${yy}${mm}${dd}-${rand}`;
}

function _getDB() {
  if (typeof firebase === "undefined" || !OPDS_FIREBASE_CONFIG.apiKey) return null;
  if (!firebase.apps.length) firebase.initializeApp(OPDS_FIREBASE_CONFIG);
  return firebase.firestore();
}

function saveOrder(data) {
  const db = _getDB();
  if (!db) return;
  const { orderId, isNewRecord, ...rest } = data;
  const ts = firebase.firestore.FieldValue.serverTimestamp();
  const payload = { ...rest, updatedAt: ts };
  if (isNewRecord) payload.createdAt = ts;
  db.collection("orders").doc(orderId).set(payload, { merge: true }).catch(() => {});
}

function isDrawerPage() {
  return new Set([
    "online-services.html", "business-solutions.html", "edupoint.html",
    "travel-services.html", "design-services.html", "business-online-setup-services.html",
    "products.html", "support.html", "contact.html"
  ]).has(getCurrentPage());
}

window.openApplyDrawer = function(serviceName) {
  const drawer = document.querySelector(".unified-apply-section.as-drawer");
  const backdrop = document.querySelector(".apply-drawer-backdrop");
  if (!drawer) return;
  if (serviceName) {
    const sel = drawer.querySelector("#pan-service-type");
    if (sel && sel.value !== serviceName) {
      sel.value = serviceName;
      window._applySelectedService?.();
    }
  }
  drawer.classList.add("drawer-is-open");
  backdrop?.classList.add("is-open");
  document.body.style.overflow = "hidden";
  setTimeout(() => drawer.querySelector("input:not([type=hidden])")?.focus(), 360);
};

window.closeApplyDrawer = function() {
  const drawer = document.querySelector(".unified-apply-section.as-drawer");
  const backdrop = document.querySelector(".apply-drawer-backdrop");
  drawer?.classList.remove("drawer-is-open");
  backdrop?.classList.remove("is-open");
  document.body.style.overflow = "";
};

const STYPE_CARDS_MAP = {
  "Bus Ticket": [
    { value: "Bus Ticket One Way",   icon: "bus",        label: "One Way"  },
    { value: "Bus Ticket Round",     icon: "repeat",     label: "Round Trip"  }
  ],
  "Train Ticket": [
    { value: "Train General Ticket", icon: "train",      label: "General"  },
    { value: "Train Tatkal Ticket",  icon: "zap",        label: "Tatkal" },
    { value: "Train Premium Tatkal", icon: "gauge",      label: "Premium" }
  ],
  "Flight Ticket": [
    { value: "Domestic Flight",      icon: "plane",      label: "Domestic" },
    { value: "International Flight",  icon: "globe",      label: "International" }
  ],
  "Hotel Booking": [
    { value: "Hotel Budget Stay",    icon: "bed",        label: "Budget"  },
    { value: "Hotel Premium Stay",   icon: "hotel",      label: "Premium" }
  ],
  "Tour Package": [
    { value: "Pilgrimage Package",   icon: "landmark",   label: "Pilgrimage" },
    { value: "Hill Station Package", icon: "mountain",   label: "Hills" },
    { value: "Beach Package",        icon: "palmtree",   label: "Beach" }
  ],
  "Ayushman Card": [
    { value: "Ayushman Card Check", icon: "heart-pulse",     label: "Check & Apply"  },
    { value: "Ayushman Reprint",    icon: "printer",         label: "Card Reprint"  }
  ],
  "Voter ID": [
    { value: "Voter ID Registration", icon: "user-plus",      label: "New Register"  },
    { value: "Voter ID Correction",   icon: "edit-3",         label: "Correction"  },
    { value: "e-EPIC Download",       icon: "download-cloud", label: "e-EPIC"  },
    { value: "Voter ID Address",      icon: "map-pin",        label: "Address Change"  }
  ],
  "Passport Assistance": [
    { value: "Fresh Passport",   icon: "book-open",  label: "Fresh Passport" },
    { value: "Passport Renewal", icon: "refresh-cw", label: "Renewal" },
    { value: "Tatkal Passport",  icon: "zap",        label: "Tatkal" }
  ],
  "Aadhaar Services Assistance": [
    { value: "Aadhaar New Enrolment appointment Booking", icon: "fingerprint", label: "New Enrolment" },
    { value: "Aadhaar Card Download Assistance", icon: "download", label: "Card Download" },
    { value: "Aadhaar PVC Card Ordering Support", icon: "credit-card", label: "PVC Card" },
    { value: "Aadhaar Address Update & Appointment Guidance", icon: "home", label: "Address Update" },
    { value: "Aadhaar Mobile Number Linking Appointment Assistance", icon: "smartphone", label: "Mobile Linking" },
    { value: "Aadhaar Name Mismatch Resolution Guidance", icon: "user-check", label: "Name Resolution" },
    { value: "Aadhaar Demographic Details Update Assistance", icon: "edit-3", label: "Demographic Update" }
  ],
  "State Certificates & Civil Registration": [
    { value: "Income Certificate Application Assistance", icon: "indian-rupee", label: "Income Cert." },
    { value: "Domicile / Residence Certificate Assistance", icon: "home", label: "Domicile Cert." },
    { value: "Caste Certificate Application Assistance", icon: "users", label: "Caste Cert." },
    { value: "NCL Certificate Assistance", icon: "file-check-2", label: "NCL Cert." },
    { value: "EWS Certificate Application Guidance", icon: "award", label: "EWS Cert." },
    { value: "Birth Certificate Registration Support", icon: "baby", label: "Birth Reg." },
    { value: "Delayed Birth Registration Assistance", icon: "clock", label: "Delayed Birth" },
    { value: "Birth Certificate Correction Assistance", icon: "edit-3", label: "Birth Correction" },
    { value: "Death Certificate Registration Support", icon: "file-text", label: "Death Reg." },
    { value: "Delayed Death Registration Assistance", icon: "alert-circle", label: "Delayed Death" },
    { value: "Death Certificate Correction Assistance", icon: "file-edit", label: "Death Correction" },
    { value: "Marriage Registration Certificate Assistance", icon: "heart", label: "Marriage Reg." },
    { value: "Character Certificate Application Assistance", icon: "shield-check", label: "Character Cert." },
    { value: "Unemployment Certificate Assistance", icon: "user-x", label: "Unemployment" },
    { value: "UDID Disability Card Application Support", icon: "accessibility", label: "UDID Disability" },
    { value: "Surviving Member Certificate Assistance", icon: "users-round", label: "Surviving Member" },
    { value: "Legal Heir Certificate Application Support", icon: "scale", label: "Legal Heir" },
    { value: "Certificate Correction & Resubmission Assistance", icon: "rotate-ccw", label: "Resubmission" }
  ],
  "Income Certificate": [
    { value: "Income Certificate Application Assistance", icon: "indian-rupee", label: "Income Cert." },
    { value: "Domicile / Residence Certificate Assistance", icon: "home", label: "Domicile Cert." },
    { value: "Caste Certificate Application Assistance", icon: "users", label: "Caste Cert." },
    { value: "NCL Certificate Assistance", icon: "file-check-2", label: "NCL Cert." },
    { value: "EWS Certificate Application Guidance", icon: "award", label: "EWS Cert." },
    { value: "Birth Certificate Registration Support", icon: "baby", label: "Birth Reg." },
    { value: "Delayed Birth Registration Assistance", icon: "clock", label: "Delayed Birth" },
    { value: "Birth Certificate Correction Assistance", icon: "edit-3", label: "Birth Correction" },
    { value: "Death Certificate Registration Support", icon: "file-text", label: "Death Reg." },
    { value: "Delayed Death Registration Assistance", icon: "alert-circle", label: "Delayed Death" },
    { value: "Death Certificate Correction Assistance", icon: "file-edit", label: "Death Correction" },
    { value: "Marriage Registration Certificate Assistance", icon: "heart", label: "Marriage Reg." },
    { value: "Character Certificate Application Assistance", icon: "shield-check", label: "Character Cert." },
    { value: "Unemployment Certificate Assistance", icon: "user-x", label: "Unemployment" },
    { value: "UDID Disability Card Application Support", icon: "accessibility", label: "UDID Disability" },
    { value: "Surviving Member Certificate Assistance", icon: "users-round", label: "Surviving Member" },
    { value: "Legal Heir Certificate Application Support", icon: "scale", label: "Legal Heir" },
    { value: "Certificate Correction & Resubmission Assistance", icon: "rotate-ccw", label: "Resubmission" }
  ],
  "Domicile Certificate": [
    { value: "Domicile Certificate", icon: "home",       label: "New Certificate" },
    { value: "Domicile Renewal",     icon: "refresh-cw", label: "Renewal" }
  ],
  "Caste Certificate": [
    { value: "Caste Certificate", icon: "badge-check", label: "New Certificate" },
    { value: "Caste Renewal",     icon: "refresh-cw",  label: "Renewal" }
  ],
  "Citizen Security, Cybercrime & Police Help": [
    { value: "Tenant Police Verification Assistance", icon: "home", label: "Tenant Verification" },
    { value: "Domestic Staff Police Verification Support", icon: "user-check", label: "Domestic Staff Verification" },
    { value: "Cyber Fraud Complaint Filing Assistance", icon: "shield-alert", label: "Cyber Fraud Complaint" },
    { value: "Lost Document Report / LDR Filing Support", icon: "file-warning", label: "Lost Document Report (LDR)" },
    { value: "Online FIR / Police Complaint Filing Assistance", icon: "file-badge-2", label: "Online FIR / Complaint" },
    { value: "RTI Online Filing Assistance", icon: "help-circle", label: "RTI Online Filing" },
    { value: "Government Grievance / CPGRAMS Filing Support", icon: "message-square", label: "CPGRAMS Grievance" }
  ],
  "Pension & Welfare Schemes": [
    { value: "Family ID Registration & Update Assistance", icon: "users-round", label: "Family ID" },
    { value: "Old Age Pension Application Assistance", icon: "landmark", label: "Old Age Pension" },
    { value: "Widow Pension Application Support", icon: "heart-handshake", label: "Widow Pension" },
    { value: "Disability Pension Application Assistance", icon: "accessibility", label: "Disability Pension" },
    { value: "Atal Pension Yojana Enrollment Support", icon: "piggy-bank", label: "Atal Pension" },
    { value: "Digital Life Certificate—Jeevan Pramaan Assistance", icon: "scan-face", label: "Jeevan Pramaan" },
    { value: "e-Shram Card Registration Assistance", icon: "briefcase-business", label: "e-Shram Registration" },
    { value: "e-Shram Card Update & Download Support", icon: "download-cloud", label: "e-Shram Update" }
  ],
  "GST Registration": [
    { value: "GST New Registration Support", icon: "file-plus", label: "New Registration" },
    { value: "GST Amendment Assistance", icon: "edit-3", label: "GST Amendment" },
    { value: "GST Certificate Download Support", icon: "download-cloud", label: "Certificate Download" },
    { value: "GST Return Filing Support", icon: "file-text", label: "Return Filing Support" },
    { value: "GSTR-1 Filing Assistance", icon: "receipt-text", label: "GSTR-1 Filing" },
    { value: "GSTR-3B Filing Assistance", icon: "calculator", label: "GSTR-3B Filing" },
    { value: "Nil GST Return Filing Support", icon: "check-circle-2", label: "Nil Return Filing" },
    { value: "QRMP Return Filing Support", icon: "calendar-check", label: "QRMP Return" },
    { value: "GST Profile Update Assistance", icon: "user-cog", label: "Profile Update" },
    { value: "GST Mobile/Email Update Support", icon: "smartphone", label: "Mobile/Email Update" },
    { value: "GST Bank Account Update Assistance", icon: "landmark", label: "Bank Account Update" },
    { value: "GST Authorized Signatory Update", icon: "user-check", label: "Authorized Signatory" },
    { value: "GST Surrender Assistance", icon: "file-minus", label: "GST Surrender" },
    { value: "GST Revocation Support", icon: "refresh-cw", label: "GST Revocation" },
    { value: "GST Refund Status Check", icon: "wallet", label: "Refund Status Check" },
    { value: "GST Notice Response Guidance", icon: "alert-circle", label: "Notice Response" },
    { value: "GST Challan Payment Support", icon: "credit-card", label: "Challan Payment" }
  ],
  "Income Tax Assistance": [
    { value: "Income Tax Return ( ITR ) Filing Consultancy", icon: "file-text", label: "ITR Filing Consultancy" },
    { value: "Income Tax Portal Registration Assistance", icon: "user-plus", label: "Portal Registration" },
    { value: "Form 26AS Download Assistance", icon: "download-cloud", label: "Form 26AS Download" },
    { value: "AIS / TIS Download Assistance", icon: "file-spreadsheet", label: "AIS / TIS Download" },
    { value: "Income Tax Refund Status Check", icon: "wallet", label: "IT Refund Status" }
  ],
  "MSME Registration": [
    { value: "MSME Registration", icon: "factory", label: "New Udyam" },
    { value: "MSME Update",       icon: "edit-3",  label: "Update" }
  ],
  "Digital Signature": [
    { value: "DSC Class 2", icon: "pen-tool",     label: "Class 2 DSC"  },
    { value: "DSC Class 3", icon: "shield-check", label: "Class 3 DSC" },
    { value: "DSC Renewal", icon: "refresh-cw",   label: "Renewal"  }
  ],
  "FSSAI License": [
    { value: "FSSAI Basic",   icon: "utensils", label: "Basic License"  },
    { value: "FSSAI State",   icon: "building", label: "State License"  },
    { value: "FSSAI Central", icon: "landmark", label: "Central License" }
  ],
  "Shop License": [
    { value: "Shop License New",     icon: "store",      label: "New License" },
    { value: "Shop License Renewal", icon: "refresh-cw", label: "Renewal" }
  ],
  "IEC Code": [
    { value: "IEC Registration", icon: "package", label: "New IEC" },
    { value: "IEC Modification", icon: "edit-3",  label: "Modification" }
  ],
  "Trademark Registration": [
    { value: "Trademark Filing",  icon: "bookmark",       label: "New Filing" },
    { value: "Trademark Renewal", icon: "refresh-cw",     label: "Renewal" },
    { value: "Trademark Reply",   icon: "message-square", label: "TM Reply" }
  ],
  "Company Registration": [
    { value: "Private Limited",  icon: "building-2", label: "Pvt. Limited" },
    { value: "LLP Registration", icon: "users",      label: "LLP" },
    { value: "OPC Registration", icon: "user",       label: "OPC" }
  ],
  "Photocopy & Printing": [
    { value: "BW Photocopy",   icon: "copy",    label: "B&W Copies" },
    { value: "Color Printing", icon: "printer", label: "Color Print" }
  ],
  "Color Printing": [
    { value: "Color Copies", icon: "printer", label: "Color Copies" },
    { value: "Photo Print",  icon: "image",   label: "Photo Print"   }
  ],
  "Document Scanning": [
    { value: "Document Scan", icon: "scan-line", label: "Scan to PDF" },
    { value: "Photo Scan",    icon: "image",     label: "Photo Scan"    }
  ],
  "Lamination": [
    { value: "Standard Laminate", icon: "layers", label: "Standard" },
    { value: "Photo Laminate",    icon: "image",  label: "Photo" }
  ]
};

function injectUnifiedApplyForm() {
  if (!shouldInjectUnifiedApplyForm()) return;
  const main = document.querySelector("main");
  if (!main) return;
  const formSlot = main.querySelector("[data-unified-apply-slot]");
  const useDrawer = isDrawerPage();
  const drawerHeader = useDrawer ? `
    <div class="apply-drawer-header">
      <div class="apply-drawer-header-meta">
        <span>E-Service Application</span>
        <strong id="drawer-header-label">Start Request</strong>
      </div>
      <button type="button" class="apply-drawer-close" onclick="window.closeApplyDrawer()" aria-label="Close">
        <i data-lucide="x"></i>
      </button>
    </div>` : '';
  const drawerClass = useDrawer ? ' as-drawer' : '';
  const formHtml = `
    <section class="section reveal visible unified-apply-section${drawerClass}" id="apply-now">
    ${drawerHeader}
      <div class="site-container">
        <div class="request-form-header">
          <p class="section-kicker">Apply Now</p>
          <h2>Start Service <span class="h2-gold">Request</span></h2>
          <p>Share details for operator review. Submitting will take you to the unified secure checkout portal.</p>
        </div>
                <div class="apply-cockpit">
          <aside class="apply-rail">
            <span class="apply-rail-eyebrow">E-Service Application</span>
            <div class="apply-rail-chip">
              <span class="apply-rail-chip-label">Applying for</span>
              <strong class="apply-rail-service" id="rail-service-name">Service Request</strong>
              <div class="apply-rail-price-row">
                <span class="apply-rail-price" id="rail-service-price" data-pricing-slot>Price loading</span>
                <span class="apply-rail-price-note">operator fee</span>
              </div>
            </div>
            <div class="checkout-progress-bar wizard-progress" id="wizard-progress-bar">
              <div class="progress-step active" data-wizard-step="1">
                <span class="step-num">1</span>
                <span class="step-text">Details</span>
                <span class="step-sub">Personal &amp; service info</span>
              </div>
              <div class="progress-line" data-wizard-line="1"><span class="fill"></span></div>
              <div class="progress-step" data-wizard-step="2">
                <span class="step-num">2</span>
                <span class="step-text">Uploads</span>
                <span class="step-sub">Document vault</span>
              </div>
              <div class="progress-line" data-wizard-line="2"><span class="fill"></span></div>
              <div class="progress-step" data-wizard-step="3">
                <span class="step-num">3</span>
                <span class="step-text">Payment</span>
                <span class="step-sub">Review &amp; submit</span>
              </div>
            </div>
            <div class="apply-rail-trust">
              <div class="apply-rail-trust-item">${icon("lock", 15)} 100% encrypted checkout</div>
              <div class="apply-rail-trust-item">${icon("shield-check", 15)} Operator-verified process</div>
              <div class="apply-rail-trust-item">${icon("clock", 15)} Pay only after review</div>
            </div>
          </aside>
          <div class="apply-workarea">
      <form class="panel service-request-panel service-request-panel-modern pan-request-card glass-panel" data-apply-form data-service-slug="service-request" id="pan-apply-form">
        <input type="hidden" name="service_slug" value="service-request">
        <input type="hidden" name="service_name" value="Service Request">

        <div class="wizard-step-panel" id="wizard-step-1">
          <div class="service-guidance premium-guidance-box">
            <span class="service-guidance-icon">${icon("user", 22)}</span>
            <div>
              <span class="wizard-step-badge">${icon("list-ordered", 12)} Step 1 of 3 &nbsp;·&nbsp; ~2 min</span>
              <strong>Personal & Service Details</strong>
              <p>Provide your basic details and keep official documents ready for operator review.</p>
            </div>
          </div>
          <div class="form-grid compact-request-grid premium-form-grid" style="margin-bottom: 0 !important;">
            <div class="form-field">
              <label for="pan-name">Full Name <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("user", 18)}
                <input class="input" id="pan-name" name="name" autocomplete="name" placeholder="As per document" required>
              </div>
            </div>
            <div class="form-field">
              <label for="pan-mobile">Mobile Number <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("phone", 18)}
                <input class="input" id="pan-mobile" name="mobile" type="tel" inputmode="numeric" autocomplete="tel" pattern="[0-9]{10}" maxlength="10" placeholder="10-digit mobile number" required>
              </div>
            </div>
            <div class="form-field">
              <label for="pan-email">Email Address</label>
              <div class="input-with-icon">
                ${icon("mail", 18)}
                <input class="input" id="pan-email" name="email" type="email" autocomplete="email" placeholder="Optional email">
              </div>
            </div>
            <div class="form-field full" id="field-service-type">
              <label>Service Type <span aria-hidden="true">*</span></label>
              <div class="stype-cards" id="stype-cards-inject"></div>
              <select id="pan-service-type" name="service_type" style="display:none" required></select>
            </div>
            <div class="form-group-label">Address Details</div>
            <div class="form-field full" id="field-address">
              <label for="pan-address">Address <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("map-pin", 18)}
                <input class="input" id="pan-address" name="address" autocomplete="street-address" placeholder="House No., Street, Locality / Village" required>
              </div>
            </div>
            <div class="form-field" id="field-pincode">
              <label for="pan-pincode">PIN Code <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("hash", 18)}
                <input class="input" id="pan-pincode" name="pincode" type="text" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{6}" maxlength="6" placeholder="6-digit PIN code" required>
              </div>
            </div>
            <div class="form-field" id="field-district">
              <label for="pan-district">District <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("building-2", 18)}
                <input class="input" id="pan-district" name="district" autocomplete="address-level2" placeholder="District name" required>
              </div>
            </div>
            <div class="form-field" id="field-state">
              <label for="pan-state">State <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("map", 18)}
                <select class="select" id="pan-state" name="state" autocomplete="address-level1" required>
                  <option value="">Select State</option>
                  <option>Andhra Pradesh</option><option>Arunachal Pradesh</option><option>Assam</option>
                  <option>Bihar</option><option>Chhattisgarh</option><option>Goa</option>
                  <option>Gujarat</option><option>Haryana</option><option>Himachal Pradesh</option>
                  <option>Jharkhand</option><option>Karnataka</option><option>Kerala</option>
                  <option>Madhya Pradesh</option><option>Maharashtra</option><option>Manipur</option>
                  <option>Meghalaya</option><option>Mizoram</option><option>Nagaland</option>
                  <option>Odisha</option><option>Punjab</option><option>Rajasthan</option>
                  <option>Sikkim</option><option>Tamil Nadu</option><option>Telangana</option>
                  <option>Tripura</option><option>Uttar Pradesh</option><option>Uttarakhand</option>
                  <option>West Bengal</option>
                  <option>Andaman &amp; Nicobar Islands</option><option>Chandigarh</option>
                  <option>Dadra &amp; Nagar Haveli and Daman &amp; Diu</option>
                  <option>Delhi</option><option>Jammu &amp; Kashmir</option><option>Ladakh</option>
                  <option>Lakshadweep</option><option>Puducherry</option>
                </select>
              </div>
            </div>
            <div class="form-field conditional-field" id="field-pan-number">
              <label for="existing-pan-number">Existing PAN Number <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("credit-card", 18)}
                <input class="input" id="existing-pan-number" name="existing_pan_number" placeholder="10-digit PAN (e.g. ABCDE1234F)" pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}" maxlength="10">
              </div>
            </div>
            <div class="form-field conditional-field" id="field-correction-type">
              <label for="correction-type-select">Correction Type <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("edit", 18)}
                <select class="select" id="correction-type-select" name="correction_type">
                  <option value="">Select Correction Type</option>
                  <option value="name">Name Correction</option>
                  <option value="dob">Date of Birth Correction</option>
                  <option value="photo_signature">Photo & Signature Change</option>
                  <option value="father_name">Father's Name Correction</option>
                  <option value="multiple">Multiple Corrections</option>
                </select>
              </div>
            </div>
          </div>
          <div class="wizard-actions">
            <button type="button" class="btn btn-primary font-bold" onclick="goToStep(2)">
              Next: Upload Documents ${icon("arrow-right", 16)}
            </button>
          </div>
        </div>

        <div class="wizard-step-panel" id="wizard-step-2" style="display: none;">
          <div class="service-guidance premium-guidance-box">
            <span class="service-guidance-icon">${icon("folder-up", 22)}</span>
            <div>
              <span class="wizard-step-badge">${icon("list-ordered", 12)} Step 2 of 3 &nbsp;·&nbsp; ~1 min</span>
              <strong>Document Attachment Vault</strong>
              <p>Attach required documents or paste Google Drive link.</p>
            </div>
          </div>
          <div class="upload-hub payment-upload-hub premium-upload-hub" aria-label="Service document attachment options">
            <div class="upload-row-layout">
              <div class="upload-action-card square-action-card drop-zone" id="drop-zone" onclick="document.getElementById('pan-documents').click()" title="Choose or drag files here">
                <input id="pan-documents" name="pan_documents" type="file" multiple accept="image/*,.pdf,.doc,.docx" onchange="window.handleDeviceUpload(this)" style="display: none;">
                <div class="action-card-icon">${icon("upload-cloud", 24)}</div>
                <span>Click to Upload or Drop Files Here</span>
                <span class="dz-hint">JPG · PNG · PDF &nbsp;·&nbsp; Max 1MB each</span>
              </div>
              <div class="upload-action-card square-action-card" onclick="window.syncGoogleDrive()" title="Attach Google Drive Link">
                <div class="action-card-icon">${icon("link-2", 18)}</div>
                <span>Attach Google Drive Link</span>
              </div>
              <div class="upload-action-card square-action-card" onclick="window.openCompressorApp()" title="Open File Compressor & Converter App">
                <div class="action-card-icon">${icon("minimize-2", 18)}</div>
                <span>Compress Large File</span>
              </div>
              <div class="upload-drive-card">
                <div class="drive-card-header">
                  ${icon("cloud", 16)}
                  <strong>Google Drive Link</strong>
                </div>
                <div class="cloud-link-input-group">
                  <input class="input" id="pan-google-drive" name="pan_google_drive_link" type="url" placeholder="Paste shared Drive link">
                  <button type="button" class="btn btn-primary btn-save-cloud" onclick="saveCloudLink(this)">Save</button>
                </div>
                <span class="field-help">Use view access for the shared file or folder.</span>
              </div>
            </div>
            <div class="upload-status-footer">
              <span class="field-help">Accepted: Aadhaar, address proof, DOB proof, photo/signature scans (Max 1MB/file, up to 10 files).</span>
              <div id="attachment-file-list" class="attachment-file-list"></div>
            </div>
          </div>
          <div class="form-field full">
            <label for="pan-notes">Notes or Special Instructions (Optional)</label>
            <textarea class="textarea" id="pan-notes" name="notes" placeholder="Example: Document details, correction needed, or special instructions"></textarea>
          </div>
          <div class="wizard-actions">
            <button type="button" class="btn btn-soft font-bold" onclick="goToStep(1)">
              ${icon("arrow-left", 16)} Back
            </button>
            <button type="button" class="btn btn-primary font-bold" onclick="goToStep(3)">
              Next: Review & Payment ${icon("arrow-right", 16)}
            </button>
          </div>
        </div>

        <div class="wizard-step-panel" id="wizard-step-3" style="display: none;">
          <div class="service-guidance premium-guidance-box">
            <span class="service-guidance-icon">${icon("credit-card", 22)}</span>
            <div>
              <span class="wizard-step-badge">${icon("list-ordered", 12)} Step 3 of 3 &nbsp;·&nbsp; Almost done!</span>
              <strong>Review &amp; Payment</strong>
              <p>Choose how you want to pay and confirm your request.</p>
            </div>
          </div>

          <div class="fee-breakup-box" style="margin-bottom:16px;">
            <div class="fee-breakup-title">${icon("receipt", 16)}<span>Fee Breakdown</span></div>
            <div class="fee-breakup-grid">
              <div class="fee-item">
                <span class="fee-label">Service Charge</span>
                <span class="fee-value highlight" data-pricing-slot>Price loading</span>
              </div>
              <div class="fee-item">
                <span class="fee-label">Official Govt Fee</span>
                <span class="fee-value">Included / ₹0</span>
              </div>
            </div>
            <p class="fee-breakup-note">Govt or portal fee (if any) is separate and confirmed before official submission.</p>
          </div>

          <p style="font-size:.8rem;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;">Choose Payment Option</p>
          <input type="hidden" name="payment_mode" id="payment-mode-input" value="pay_now">
          <div class="pmode-cards" id="pmode-cards">
            <label class="pmode-card pmode-selected" data-mode="pay_now">
              <input type="radio" name="pmode_visual" value="pay_now" checked style="display:none">
              <div class="pmode-card-icon">${icon("zap", 22)}</div>
              <div class="pmode-card-body">
                <strong>Pay Now</strong>
                <span>Instant checkout via UPI / Card / Net Banking. Request processed faster.</span>
              </div>
              <div class="pmode-check">${icon("check-circle-2", 18)}</div>
            </label>
            <label class="pmode-card" data-mode="pay_after_review">
              <input type="radio" name="pmode_visual" value="pay_after_review" style="display:none">
              <div class="pmode-card-icon">${icon("clock", 22)}</div>
              <div class="pmode-card-body">
                <strong>Pay After Review</strong>
                <span>Submit now, pay only after operator confirms. Track your payment request in the Customer Portal.</span>
              </div>
              <div class="pmode-check">${icon("check-circle-2", 18)}</div>
            </label>
          </div>

          <div class="checkout-info-badge-box" style="margin:16px 0;">
            <div class="checkout-security-badge secure-success">
              ${icon("lock", 20)}<div class="badge-text"><strong>100% Encrypted</strong><span>Razorpay &amp; PhonePe</span></div>
            </div>
            <div class="checkout-security-badge secure-warning">
              ${icon("shield-check", 20)}<div class="badge-text"><strong>Operator Assisted</strong><span>Verified by One Point</span></div>
            </div>
          </div>

          <label class="checkbox-field full premium-checkbox" style="margin-bottom: 20px;">
            <input type="checkbox" name="consent" required>
            <span class="consent-text">I agree to share required documents for service processing. Final approval depends on the official department and operator review.</span>
          </label>
          <div class="wizard-actions">
            <button type="button" class="btn btn-soft font-bold" onclick="goToStep(2)">
              ${icon("arrow-left", 16)} Back
            </button>
            <button class="btn btn-primary premium-submit-btn font-bold" type="submit">
              Pay Now ${icon("zap", 16)}
            </button>
          </div>
          <p class="submit-helper-text" id="pmode-helper-text">You will be taken to the secure payment gateway.</p>
        </div>
      </form>
      <div id="review-confirm-screen" style="display:none; flex-direction:column; align-items:center; justify-content:center; padding: 48px 24px; text-align:center; gap:20px;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;">
          ${icon("check-circle-2", 32)}
        </div>
        <div>
          <h3 style="font-size:1.35rem;font-weight:700;color:var(--navy);margin:0 0 8px;">Request Submitted!</h3>
          <p style="color:var(--muted-2);font-size:.92rem;margin:0 0 6px;">Our operator will review your details and reach out within <strong>2–4 hours</strong>.</p>
          <p style="color:var(--muted-3);font-size:.82rem;margin:0;" id="confirm-order-id"></p>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:360px;">
          <a href="https://wa.me/919473946181" target="_blank" rel="noopener" class="btn btn-whatsapp" style="justify-content:center;">
            ${icon("message-circle", 16)} Chat on WhatsApp
          </a>
          <button type="button" class="btn btn-soft" onclick="location.reload()">
            ${icon("rotate-ccw", 15)} Start a New Request
          </button>
        </div>
      </div>
          </div>
        </div>
      </div>
    </section>
  `;
  if (formSlot) {
    formSlot.insertAdjacentHTML("beforebegin", formHtml);
    formSlot.remove();
  } else {
    main.insertAdjacentHTML("beforeend", formHtml);
  }
  if (useDrawer) {
    document.body.insertAdjacentHTML("beforeend", '<div class="apply-drawer-backdrop" onclick="window.closeApplyDrawer()"></div>');
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.closeApplyDrawer?.(); });
    if (window.lucide) window.lucide.createIcons();
  }
}

function setupWizardNavigation() {
  window.goToStep = function(stepNum) {
    const activeStep = document.querySelector('.wizard-step-panel:not([style*="display: none"]):not([style*="display:none"])');
    if (activeStep) {
      const currentNum = parseInt(activeStep.id.replace("wizard-step-", ""), 10);
      if (stepNum > currentNum) {
        const inputs = activeStep.querySelectorAll("input, select, textarea");
        for (const input of inputs) {
          const condField = input.closest(".conditional-field");
          if (condField && !condField.classList.contains("show")) {
            continue;
          }
          if (!input.checkValidity()) {
            input.reportValidity();
            return;
          }
        }
      }
    }

    document.querySelectorAll(".wizard-step-panel").forEach((panel) => {
      panel.style.display = "none";
    });
    const nextPanel = document.getElementById(`wizard-step-${stepNum}`);
    if (nextPanel) nextPanel.style.display = "block";

    document.querySelectorAll(".checkout-progress-bar [data-wizard-step]").forEach((stepEl) => {
      const stepElNum = parseInt(stepEl.getAttribute("data-wizard-step"), 10);
      stepEl.classList.remove("active", "completed");
      const numEl = stepEl.querySelector(".step-num");
      if (stepElNum < stepNum) {
        stepEl.classList.add("completed");
        if (numEl) numEl.innerHTML = window.lucide ? icon("check", 14) : "✓";
      } else if (stepElNum === stepNum) {
        stepEl.classList.add("active");
        if (numEl) numEl.innerText = stepElNum;
      } else if (numEl) {
        numEl.innerText = stepElNum;
      }
    });

    document.querySelectorAll(".checkout-progress-bar [data-wizard-line]").forEach((lineEl) => {
      const lineElNum = parseInt(lineEl.getAttribute("data-wizard-line"), 10);
      lineEl.classList.toggle("active", lineElNum < stepNum);
    });

    if (window.lucide) window.lucide.createIcons();
    if (!isDrawerPage()) document.getElementById("apply-now")?.scrollIntoView({ behavior: "smooth" });
  };

  // Bind click event listeners to progress steps
  const progressSteps = document.querySelectorAll(".checkout-progress-bar [data-wizard-step]");
  progressSteps.forEach((stepEl) => {
    stepEl.style.cursor = "pointer";
    stepEl.addEventListener("click", () => {
      const stepNum = parseInt(stepEl.getAttribute("data-wizard-step"), 10);
      window.goToStep(stepNum);
    });
  });
}

function setupUnifiedApplyPage() {
  injectUnifiedApplyForm();
  setupWizardNavigation();

  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const requestedService = (params.get("service_name") || params.get("service") || defaultApplyServiceForPage() || "Service Request").trim();

  const category = inferApplyCategory(params.get("category") || "", requestedService);
  const serviceSelect = form.querySelector("#pan-service-type");
  if (serviceSelect) {
    const options = getScopedServiceOptions(category, requestedService);
    serviceSelect.innerHTML = options.map((service) => {
      if (service === "Select a Service") {
        return `<option value="">Select a Service</option>`;
      }
      return `<option value="${escapeOption(service)}">${escapeOption(service)}</option>`;
    }).join("");
    const defaultValue = options.includes(requestedService)
      ? requestedService
      : (options[0] === "Select a Service" ? "" : (options[0] || requestedService));
    serviceSelect.value = defaultValue;
  }

  // Build visual stype-cards for pages with defined card options
  const stypeCardsEl = form.querySelector("#stype-cards-inject");
  if (stypeCardsEl) {
    const cards = STYPE_CARDS_MAP[requestedService] || [];
    if (cards.length) {
      stypeCardsEl.innerHTML = cards.map((c, i) =>
        {
          const cardPricing = servicePricingFor(c.value);
          const priceLabel = cardPricing?.displayPrice || MASTER_PRICE_PLACEHOLDER;
          return (
        `<label class="stype-card${i === 0 ? " stype-selected" : ""}">` +
        `<input type="radio" name="stype_visual" value="${c.value.replace(/"/g, "&quot;")}"${i === 0 ? " checked" : ""}>` +
        `<span class="stype-icon"><i data-lucide="${c.icon}"></i></span>` +
        `<span class="stype-name">${c.label}</span>` +
        `<span class="stype-price">${priceLabel}</span>` +
        `</label>`
          );
        }
      ).join("");
      if (serviceSelect) {
        serviceSelect.innerHTML = cards.map(c =>
          `<option value="${c.value.replace(/"/g, "&quot;")}">${c.value}</option>`
        ).join("");
        serviceSelect.value = cards[0].value;
      }
      stypeCardsEl.addEventListener("change", (e) => {
        if (e.target.type !== "radio") return;
        stypeCardsEl.querySelectorAll(".stype-card").forEach(card =>
          card.classList.remove("stype-selected")
        );
        e.target.closest(".stype-card")?.classList.add("stype-selected");
        if (serviceSelect) serviceSelect.value = e.target.value;
        applySelectedService();
      });
      if (window.lucide) window.lucide.createIcons();
    }
  }

  const applySelectedService = () => {
    const serviceName = serviceSelect?.value || requestedService;
    // Keep visual stype-cards in sync with hidden select (programmatic changes via drawer/restore/etc.)
    const _stypeEl = form.querySelector("#stype-cards-inject");
    if (_stypeEl && _stypeEl.children.length) {
      _stypeEl.querySelectorAll(".stype-card").forEach(card => {
        const radio = card.querySelector("input[type='radio']");
        const match = radio?.value === serviceName;
        card.classList.toggle("stype-selected", match);
        if (radio) radio.checked = match;
        const priceEl = card.querySelector(".stype-price");
        if (priceEl && radio?.value) {
          const cardPricing = servicePricingFor(radio.value);
          if (cardPricing?.displayPrice) priceEl.textContent = cardPricing.displayPrice;
        }
      });
    }
    const displayName = (!serviceName || serviceName === "Select a Service" || serviceName === "Service Request") ? "Service Request" : serviceName;
    const serviceSlug = isPanServiceLabel(serviceName) ? "pan-card" : slugify(serviceName);
    const servicePricing = servicePricingFor(serviceName, serviceSlug);
    const profile = unifiedApplyProfile(serviceName, category);
    const needsPanDetails = serviceName === "PAN Correction" || serviceName === "Card Reprint";

    form.dataset.serviceSlug = serviceSlug;
    form.dataset.serviceName = serviceName;
    ensureHiddenInput(form, "service_slug").value = serviceSlug;
    ensureHiddenInput(form, "service_name").value = serviceName;

    const panNumberField = form.querySelector("#field-pan-number");
    const correctionField = form.querySelector("#field-correction-type");
    const existingPanInput = form.querySelector("#existing-pan-number");
    const correctionSelect = form.querySelector("#correction-type-select");
    panNumberField?.classList.toggle("show", needsPanDetails);
    existingPanInput?.toggleAttribute("required", needsPanDetails);
    correctionField?.classList.toggle("show", serviceName === "PAN Correction");
    correctionSelect?.toggleAttribute("required", serviceName === "PAN Correction");
    if (!needsPanDetails && existingPanInput) existingPanInput.value = "";
    if (serviceName !== "PAN Correction" && correctionSelect) correctionSelect.value = "";

    // Conditional Address Hiding for Digital Services
    const digitalServices = ["E-PAN Download", "Admit Card Download", "Result Download", "Resume Builder", "Online Test", "WhatsApp Support", "Call Support", "General Support"];
    const isDigital = digitalServices.includes(serviceName);
    const locationFieldIds = ["field-address", "field-pincode", "field-district", "field-state"];
    locationFieldIds.forEach((id) => {
      const fieldEl = form.querySelector(`#${id}`);
      if (fieldEl) {
        fieldEl.style.display = isDigital ? "none" : "";
        fieldEl.querySelectorAll("input, select").forEach((inp) => inp.toggleAttribute("required", !isDigital));
      }
    });
    const addressInput = form.querySelector("#pan-address");
    if (isDigital && addressInput) addressInput.value = "Digital Delivery";
    else if (!isDigital && addressInput?.value === "Digital Delivery") addressInput.value = "";

    const formHeaderTitle = document.querySelector("#apply-now .request-form-header h2");
    const formHeaderText = document.querySelector("#apply-now .request-form-header p:last-of-type");
    if (formHeaderTitle) {
      formHeaderTitle.innerHTML = displayName === "Service Request"
        ? 'Start Service <span class="h2-gold">Request</span>'
        : `Start ${displayName} <span class="h2-gold">Request</span>`;
    }
    if (formHeaderText) {
      formHeaderText.textContent = "Share details for operator review. Submitting will take you to the unified secure checkout portal.";
    }

    const firstGuidance = form.querySelector("#wizard-step-1 .service-guidance");
    if (firstGuidance) {
      firstGuidance.innerHTML = `
        <span class="service-guidance-icon">${icon("shield-check", 22)}</span>
        <div>
          <span class="wizard-step-badge">${icon("list-ordered", 12)} Step 1 of 3 &nbsp;·&nbsp; ~2 min</span>
          <strong>Personal & Service Details</strong>
          <p>Provide your basic details and keep official documents ready for operator review.</p>
        </div>
      `;
    }

    const uploadGuidance = form.querySelector("#wizard-step-2 .service-guidance div");
    uploadGuidance?.querySelector("strong")?.replaceChildren(displayName === "Service Request" ? "Document Vault" : `${displayName} Document Vault`);
    uploadGuidance?.querySelector("p")?.replaceChildren(profile.upload);

    const uploadHelp = form.querySelector(".upload-status-footer .field-help");
    if (uploadHelp) uploadHelp.textContent = `Accepted: ${profile.docs} (Max 1MB/file, up to 10 files).`;

    const notes = form.querySelector("#pan-notes");
    if (notes) notes.placeholder = profile.placeholder;

    const consent = form.querySelector(".premium-checkbox span");
    if (consent) {
      consent.textContent = `I agree to share required documents for ${displayName === "Service Request" ? "service" : displayName} processing and understand that final approval depends on the official department.`;
    }

    const stickyTitle = document.querySelector(".sticky-cta-title");
    if (stickyTitle) {
      stickyTitle.textContent = displayName === "Service Request" ? "Apply Now" : `Apply ${displayName}`;
    }

    const feeNote = form.querySelector(".fee-breakup-box p");
    if (feeNote) {
      feeNote.textContent = servicePricing.customerPriceNote || (isPanServiceLabel(serviceName)
        ? "Government and operator charges are included in the final payable price."
        : "Government or portal fee, if any, is confirmed before official submission.");
    }

    // Update Dynamic Pricing Elements from Unified Master Pricing Catalog
    const staticMaster = window.OPDS_MASTER_PRICING || window.OPDS_STATIC_PRICING || {};
    const masterInfo = staticMaster[canonicalSlug] || staticMaster[resolvedSlug] || {};
    const finalPrice = masterInfo.price || servicePricing.price || 0;
    const finalServiceCharge = masterInfo.serviceCharge !== undefined ? masterInfo.serviceCharge : (servicePricing.serviceCharge || finalPrice);
    const finalOfficialFee = masterInfo.officialFee !== undefined ? masterInfo.officialFee : (servicePricing.officialFee || 0);
    const priceSummaryLabel = masterInfo.displayPrice || servicePricing.displayPrice || `₹${finalPrice}`;

    const feeLabelEl = form.querySelector(".fee-breakup-grid .fee-item:first-child .fee-label");
    if (feeLabelEl) {
      feeLabelEl.textContent = "Service Charge";
    }
    const feeValueEl = form.querySelector(".fee-breakup-grid .fee-item:first-child .fee-value");
    if (feeValueEl) {
      feeValueEl.textContent = `₹${finalServiceCharge}`;
    }
    const govtLabelEl = form.querySelector(".fee-breakup-grid .fee-item:nth-child(2) .fee-label");
    if (govtLabelEl) {
      govtLabelEl.textContent = "Official Govt Fee";
    }
    const govtValueEl = form.querySelector(".fee-breakup-grid .fee-item:nth-child(2) .fee-value");
    if (govtValueEl) {
      govtValueEl.textContent = finalOfficialFee > 0 ? `₹${finalOfficialFee}` : "Included / ₹0";
    }

    if (feeNote) {
      feeNote.textContent = masterInfo.priceNote || servicePricing.customerPriceNote || `Service Charge: ₹${finalServiceCharge} | Official Govt Fee: ${finalOfficialFee > 0 ? '₹' + finalOfficialFee : '₹0'} | Total: ₹${finalPrice}`;
    }

    const submitBtn = form.querySelector(".premium-submit-btn");
    if (submitBtn) {
      submitBtn.innerHTML = `Confirm &amp; Pay ₹${finalPrice} ${icon("arrow-right", 16)}`;
    }

    const railNameEl = document.getElementById("rail-service-name");
    if (railNameEl) railNameEl.textContent = displayName;
    const railPriceEl = document.getElementById("rail-service-price");
    if (railPriceEl) railPriceEl.textContent = `₹${finalPrice}`;
    const railPriceNoteEl = document.querySelector(".apply-rail-price-note");
    if (railPriceNoteEl) {
      railPriceNoteEl.textContent = finalOfficialFee > 0 ? `Govt ₹${finalOfficialFee} + Service ₹${finalServiceCharge}` : "Total inclusive price";
    }
    const drawerLabel = document.getElementById("drawer-header-label");
    if (drawerLabel) drawerLabel.textContent = displayName === "Service Request" ? "Start Request" : `${displayName} Request`;

    if (window.lucide) window.lucide.createIcons();
  };

  window._applySelectedService = applySelectedService;

  // ── Pincode → District + State auto-fetch ───────────────────────────────────
  (function setupPincodeLookup() {
    const pincodeInput = form.querySelector("#pan-pincode");
    const districtInput = form.querySelector("#pan-district");
    const stateSelect  = form.querySelector("#pan-state");
    if (!pincodeInput || !districtInput || !stateSelect) return;

    let _debounce;
    pincodeInput.addEventListener("input", function () {
      const pin = this.value.trim();
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
      clearTimeout(_debounce);
      _debounce = setTimeout(async () => {
        districtInput.placeholder = "Fetching…";
        try {
          const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          const data = await res.json();
          if (data[0].Status === "Success" && data[0].PostOffice?.length) {
            const po = data[0].PostOffice[0];
            districtInput.value = po.District || "";
            // match state in <select>
            const stateVal = po.State || "";
            const opt = [...stateSelect.options].find(o =>
              o.value.toLowerCase() === stateVal.toLowerCase() ||
              o.text.toLowerCase()  === stateVal.toLowerCase()
            );
            if (opt) stateSelect.value = opt.value;
            districtInput.classList.add("input-success");
            stateSelect.classList.add("input-success");
            setTimeout(() => {
              districtInput.classList.remove("input-success");
              stateSelect.classList.remove("input-success");
            }, 2000);
          }
        } catch (_) { /* silent fail — user can fill manually */ }
        districtInput.placeholder = "District name";
      }, 400);
    });
  })();

  window._showReviewConfirm = function(orderId) {
    const el = document.getElementById("confirm-order-id");
    if (el && orderId) el.textContent = `Order ID: ${orderId}`;
    if (window.lucide) window.lucide.createIcons();
  };

  // ── OTP Verification Modal ──────────────────────────────────────────────────
  function ensureOtpModalExists() {
    if (document.getElementById("opds-otp-modal")) return;
    const modal = document.createElement("div");
    modal.id = "opds-otp-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "opds-otp-modal-title");
    modal.innerHTML = `
      <div class="otp-modal-backdrop" id="opds-otp-backdrop"></div>
      <div class="otp-modal-sheet">
        <div class="otp-modal-header">
          <div class="otp-modal-icon">${icon("shield-check", 28)}</div>
          <div>
            <h3 class="otp-modal-title" id="opds-otp-modal-title">Verify Mobile Number</h3>
            <p class="otp-modal-subtitle">एक OTP आपके रजिस्टर्ड नंबर पर भेजा जाएगा</p>
          </div>
        </div>
        <div class="otp-modal-body">
          <div class="otp-phone-display" id="otp-phone-display">
            <span class="otp-phone-flag">🇮🇳 +91</span>
            <span class="otp-phone-num" id="otp-phone-num">—</span>
          </div>
          <div class="otp-status" id="otp-modal-status" style="display:none"></div>
          <div class="otp-code-group" id="otp-code-group" style="display:none">
            <input type="tel" id="otp-code-input" class="otp-code-input" maxlength="6" placeholder="Enter 6-digit OTP" autocomplete="one-time-code" inputmode="numeric">
            <button type="button" class="otp-resend-link" id="otp-resend-btn">Resend OTP</button>
          </div>
        </div>
        <div class="otp-modal-footer">
          <button type="button" class="btn btn-primary otp-send-btn" id="otp-send-btn">
            ${icon("send", 16)} Send OTP
          </button>
          <button type="button" class="btn btn-primary otp-verify-btn" id="otp-verify-btn" style="display:none">
            ${icon("check-circle-2", 16)} Verify &amp; Continue
          </button>
          <button type="button" class="otp-skip-link" id="otp-skip-btn">Skip for now</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
  }

  async function _otpApiPost(path, payload) {
    let csrfToken = window._opds_csrf || "";
    if (!csrfToken) {
      try {
        const r = await fetch("/api/csrf");
        const d = await r.json();
        csrfToken = d.csrfToken || "";
        window._opds_csrf = csrfToken;
      } catch (_) {}
    }
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  }

  function showOtpModal(phoneNumber, { onSuccess, onSkip } = {}) {
    ensureOtpModalExists();
    const modal = document.getElementById("opds-otp-modal");
    const phoneNumEl = document.getElementById("otp-phone-num");
    const statusEl = document.getElementById("otp-modal-status");
    const codeGroup = document.getElementById("otp-code-group");
    const codeInput = document.getElementById("otp-code-input");
    const sendBtn = document.getElementById("otp-send-btn");
    const verifyBtn = document.getElementById("otp-verify-btn");
    const skipBtn = document.getElementById("otp-skip-btn");
    const backdrop = document.getElementById("opds-otp-backdrop");
    const resendBtn = document.getElementById("otp-resend-btn");

    // Reset state
    codeGroup.style.display = "none";
    verifyBtn.style.display = "none";
    sendBtn.style.display = "";
    codeInput.value = "";
    statusEl.style.display = "none";
    statusEl.textContent = "";

    phoneNumEl.textContent = phoneNumber || "—";
    modal.classList.add("otp-modal-open");
    document.body.style.overflow = "hidden";

    function setStatus(msg, type) {
      if (!msg) { statusEl.style.display = "none"; return; }
      statusEl.textContent = msg;
      statusEl.className = `otp-status otp-status-${type || "info"}`;
      statusEl.style.display = "";
    }

    let _resendTimer = null;
    function startOtpResendTimer(secs) {
      clearInterval(_resendTimer);
      const btn = document.getElementById("otp-resend-btn");
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = `Resend in ${secs}s`;
      let t = secs;
      _resendTimer = setInterval(() => {
        t--;
        if (t <= 0) {
          clearInterval(_resendTimer);
          btn.disabled = false;
          btn.textContent = "Resend OTP";
        } else {
          btn.textContent = `Resend in ${t}s`;
        }
      }, 1000);
    }

    async function sendOtp() {
      // Always query fresh — rebind() replaces DOM elements so closure refs go stale
      const _sendBtn   = document.getElementById("otp-send-btn");
      const _verifyBtn = document.getElementById("otp-verify-btn");
      const _codeGroup = document.getElementById("otp-code-group");
      const _codeInput = document.getElementById("otp-code-input");
      if (_sendBtn) { _sendBtn.disabled = true; _sendBtn.innerHTML = `${icon("loader-2", 16)} Sending…`; }
      if (window.lucide) window.lucide.createIcons();
      setStatus("", "");
      try {
        const data = await _otpApiPost("/api/auth/otp/request", { phone: phoneNumber, purpose: "login" });
        if (_codeGroup) _codeGroup.style.display = "";
        if (_verifyBtn) _verifyBtn.style.display = "";
        if (_sendBtn)   _sendBtn.style.display = "none";
        if (_codeInput) _codeInput.focus();
        const hint = data.devOtp ? ` (Dev OTP: ${data.devOtp})` : "";
        setStatus(`OTP भेज दिया गया — ${data.phone}${hint}`, "success");
        startOtpResendTimer(30);
      } catch (err) {
        setStatus(err.message || "OTP send karne mein error aayi.", "error");
        if (_sendBtn) { _sendBtn.disabled = false; _sendBtn.innerHTML = `${icon("send", 16)} Send OTP`; }
        if (window.lucide) window.lucide.createIcons();
      }
    }

    async function verifyOtp() {
      const _verifyBtn = document.getElementById("otp-verify-btn");
      const _codeInput = document.getElementById("otp-code-input");
      const code = _codeInput ? _codeInput.value.trim() : "";
      if (!code || code.length < 4) { setStatus("Please enter the OTP.", "error"); return; }
      if (_verifyBtn) { _verifyBtn.disabled = true; _verifyBtn.innerHTML = `${icon("loader-2", 16)} Verifying…`; }
      if (window.lucide) window.lucide.createIcons();
      setStatus("", "");
      try {
        const data = await _otpApiPost("/api/auth/otp/verify", { phone: phoneNumber, otp: code });
        const session = data.session || {};
        const user = data.user || {};
        if (session.token) localStorage.setItem("opds_customer_session", session.token);
        localStorage.setItem("opds_customer_last_activity", String(Date.now()));
        localStorage.setItem("opds_customer_session_event", JSON.stringify({ type: "login", at: Date.now() }));
        if (user.phone) { localStorage.setItem("opds_customer_phone", user.phone); localStorage.setItem("opds_testing_user", user.phone); }
        if (user.email) localStorage.setItem("opds_customer_email", user.email);
        localStorage.setItem("opds_customer_profile", JSON.stringify(user));
        setStatus("Mobile verified! Redirecting…", "success");
        clearInterval(_resendTimer);
        closeOtpModal();
        if (typeof onSuccess === "function") onSuccess(data);
      } catch (err) {
        setStatus(err.message || "OTP galat hai ya expire ho gaya.", "error");
        if (_verifyBtn) { _verifyBtn.disabled = false; _verifyBtn.innerHTML = `${icon("check-circle-2", 16)} Verify & Continue`; }
        if (window.lucide) window.lucide.createIcons();
      }
    }

    function closeOtpModal() {
      modal.classList.remove("otp-modal-open");
      document.body.style.overflow = "";
    }

    // Bind handlers (remove old ones by cloning)
    function rebind(el, handler) {
      const fresh = el.cloneNode(true);
      el.replaceWith(fresh);
      fresh.addEventListener("click", handler);
      return fresh;
    }
    rebind(document.getElementById("otp-send-btn"), sendOtp);
    rebind(document.getElementById("otp-verify-btn"), verifyOtp);
    rebind(document.getElementById("otp-resend-btn"), sendOtp);
    rebind(document.getElementById("otp-skip-btn"), () => { closeOtpModal(); if (typeof onSkip === "function") onSkip(); });
    rebind(document.getElementById("opds-otp-backdrop"), () => { closeOtpModal(); if (typeof onSkip === "function") onSkip(); });

    // Enter key support
    codeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); verifyOtp(); } });

    if (window.lucide) window.lucide.createIcons();
  }

  window._showOtpModal = showOtpModal;

  // ── Lead capture: Step 1 → Step 2 pe sheet mein row create karo
  const _origGoToStep = window.goToStep;
  window.goToStep = function(stepNum) {
    if (stepNum === 2 && !sessionStorage.getItem("opds_order_id")) {
      const nameVal  = form.querySelector("#pan-name")?.value?.trim()   || "";
      const mobileVal = form.querySelector("#pan-mobile")?.value?.trim() || "";
      const emailVal = form.querySelector("#pan-email")?.value?.trim()   || "";
      const svcVal   = serviceSelect?.value || "";
      if (nameVal && mobileVal.length === 10) {
        const oid = generateOrderId();
        sessionStorage.setItem("opds_order_id", oid);
        saveOrder({
          orderId: oid, isNewRecord: true,
          step: "lead", status: "New Lead",
          name: nameVal, mobile: mobileVal, email: emailVal, service: svcVal
        });
      }
    }
    _origGoToStep(stepNum);
  };

  // Payment mode card selector (step 3)
  const pmodeCards = form.querySelector("#pmode-cards");
  const pmodeInput = form.querySelector("#payment-mode-input");
  const pmodeHelperText = form.querySelector("#pmode-helper-text");
  const submitBtn2 = form.querySelector(".premium-submit-btn");

  function updatePmodeUI(mode) {
    form.querySelectorAll(".pmode-card").forEach(c => {
      const isThis = c.dataset.mode === mode;
      c.classList.toggle("pmode-selected", isThis);
      const radio = c.querySelector("input[type=radio]");
      if (radio) radio.checked = isThis;
    });
    if (pmodeInput) pmodeInput.value = mode;
    if (mode === "pay_now") {
      if (submitBtn2) submitBtn2.innerHTML = `Pay Now ${icon("zap", 16)}`;
      if (pmodeHelperText) pmodeHelperText.textContent = "You will be taken to the secure payment gateway.";
    } else {
      if (submitBtn2) submitBtn2.innerHTML = `Submit for Review ${icon("arrow-right", 16)}`;
      if (pmodeHelperText) pmodeHelperText.textContent = "Payment is collected only after operator confirms your request.";
    }
    if (window.lucide) window.lucide.createIcons();
  }

  if (pmodeCards) {
    pmodeCards.addEventListener("click", (e) => {
      const card = e.target.closest(".pmode-card[data-mode]");
      if (!card) return;
      updatePmodeUI(card.dataset.mode);
    });
    // Sync helper text/icon to the default-selected mode (Pay Now) on load
    updatePmodeUI(pmodeInput?.value || "pay_now");
  }

  serviceSelect?.addEventListener("change", applySelectedService);
  if (serviceSelect) {
    fetchWebsiteCatalog()
      .then((catalog) => {
        const dynamicOptions = getDynamicCatalogOptions(catalog, category, requestedService);
        if (!dynamicOptions.length) return;
        // Skip if stype-cards are managing service type selection for this page
        if (form.querySelector("#stype-cards-inject")?.children.length) return;
        const currentValue = serviceSelect.value || requestedService;
        serviceSelect.innerHTML = dynamicOptions.map((service) => {
          if (service === "Select a Service") {
            return `<option value="">Select a Service</option>`;
          }
          return `<option value="${escapeOption(service)}">${escapeOption(service)}</option>`;
        }).join("");
        const nextValue = dynamicOptions.includes(currentValue)
          ? currentValue
          : (dynamicOptions[0] === "Select a Service" ? "" : (dynamicOptions[0] || requestedService));
        serviceSelect.value = nextValue;
        applySelectedService();
      })
      .catch(() => {});
  }
  document.querySelectorAll(".btn-service-select[data-service]").forEach((button) => {
    button.addEventListener("click", (e) => {
      const svc = button.getAttribute("data-service") || "";
      if (isWhatsAppLaunchMode()) {
        e.preventDefault();
        e.stopPropagation();
        window.open(buildServiceWhatsAppUrl(svc), "_blank", "noopener");
        return;
      }
      if (isDrawerPage()) {
        e.stopPropagation();
        if (serviceSelect && svc) serviceSelect.value = svc;
        applySelectedService();
        window.openApplyDrawer(svc);
      } else {
        window.setTimeout(() => {
          if (serviceSelect) serviceSelect.value = svc || serviceSelect.value;
          applySelectedService();
        }, 0);
      }
    });
  });
  applySelectedService();

  if (isDrawerPage()) {
    document.querySelectorAll('[href="#apply-now"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.openApplyDrawer();
      });
    });
    if (window.location.hash === "#apply-now") {
      setTimeout(() => window.openApplyDrawer(), 400);
    }
  } else if (window.location.hash === "#apply-now") {
    [120, 600, 1200].forEach((delay, index) => {
      window.setTimeout(() => {
        scrollToPageTarget(document.getElementById("apply-now"), index === 0 ? "auto" : "smooth");
      }, delay);
    });
  }
}

function setupApplyForms() {
  document.querySelectorAll("[data-apply-form]").forEach((form) => {
    form.setAttribute("novalidate", "true");

    // ── LAUNCH MODE: Step-3 payment-mode selector hide karo + submit button honest
    if (isWhatsAppLaunchMode()) {
      const pmodeCards = form.querySelector("#pmode-cards");
      if (pmodeCards) pmodeCards.style.display = "none";
      const pmodeInput = form.querySelector("#payment-mode-input");
      if (pmodeInput) pmodeInput.value = "pay_after_review";
      const pmodeHelper = form.querySelector("#pmode-helper-text");
      if (pmodeHelper) pmodeHelper.textContent = "Details WhatsApp par bhejein — operator process aur payment link confirm karega.";
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.innerHTML = `<i data-lucide="message-circle"></i> Send on WhatsApp`;
      if (window.lucide) window.lucide.createIcons();
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      localStorage.removeItem('opds_abandoned_form_state');
      const mobile = form.querySelector('input[name="mobile"]');
      const digits = mobile?.value?.replace(/\D/g, "") || "";

      if (!form.checkValidity()) {
        const invalidInput = form.querySelector(":invalid");
        if (invalidInput) {
          const stepPanel = invalidInput.closest(".wizard-step-panel");
          if (stepPanel) {
            const stepNum = parseInt(stepPanel.id.replace("wizard-step-", ""), 10);
            if (typeof window.goToStep === "function") {
              window.goToStep(stepNum);
            }
            setTimeout(() => {
              invalidInput.reportValidity();
              invalidInput.focus();
            }, 100);
            return;
          }
        }
        form.reportValidity();
        return;
      }

      if (mobile && digits.length !== 10) {
        mobile.setCustomValidity("Please enter a valid 10-digit mobile number.");
        const stepPanel = mobile.closest(".wizard-step-panel");
        if (stepPanel) {
          const stepNum = parseInt(stepPanel.id.replace("wizard-step-", ""), 10);
          if (typeof window.goToStep === "function") {
            window.goToStep(stepNum);
          }
        }
        setTimeout(() => {
          mobile.reportValidity();
          mobile.focus();
          mobile.setCustomValidity("");
        }, 100);
        return;
      }

      // ── LAUNCH MODE: form data ke saath seedhe WhatsApp, koi backend/checkout nahi
      if (isWhatsAppLaunchMode()) {
        const fd = new FormData(form);
        const rawAddr = fd.get("address") || "";
        const fullAddr = [rawAddr, fd.get("district"), fd.get("state"), fd.get("pincode")].filter(Boolean).join(", ");
        const waUrl = buildApplyWhatsAppUrl({
          service: fd.get("service_name") || fd.get("service_type") || form.dataset.serviceName || inferServiceSlug(form),
          name: fd.get("name") || "",
          mobile: fd.get("mobile") || "",
          email: fd.get("email") || "",
          address: fullAddr,
          notes: fd.get("notes") || fd.get("message") || "",
          driveLink: fd.get("pan_google_drive_link") || ""
        });
        try { localStorage.removeItem("opds_cart"); } catch (e) { /* ignore */ }
        window.open(waUrl, "_blank", "noopener");
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      const originalText = submit?.innerHTML || "Submit Request";
      const pmodeVal = (new FormData(form)).get("payment_mode") || "pay_after_review";
      const loadingLabel = pmodeVal === "pay_now" ? "Redirecting to Checkout…" : "Submitting Request…";
      if (submit) {
        submit.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ${loadingLabel}`;
        submit.disabled = true;
        submit.style.opacity = ".8";
        if (window.lucide) window.lucide.createIcons();
      }

      form.querySelector("[data-service-payment-notice]")?.remove();
      const notice = document.createElement("div");
      notice.className = "auth-notice full auth-notice-testing";
      notice.setAttribute("role", "status");
      notice.setAttribute("data-service-payment-notice", "");
      notice.innerHTML = `<div class="testing-notice-head"><i data-lucide="check-circle-2" class="testing-icon"></i><div><strong>Request Verified</strong><span>Redirecting to unified secure checkout portal...</span></div></div>`;
      
      const targetContainer = form.querySelector(".wizard-step-panel:not([style*='display: none']):not([style*='display:none'])") || form.querySelector(".form-grid") || form;
      targetContainer.appendChild(notice);
      if (window.lucide) window.lucide.createIcons();

      const formData = new FormData(form);
      const serviceSlug = inferServiceSlug(form);
      const serviceName = encodeURIComponent(formData.get("service_name") || formData.get("service_type") || form.dataset.serviceName || serviceSlug);
      const name = encodeURIComponent(formData.get("name") || "");
      const phone = encodeURIComponent(formData.get("mobile") || "");
      const email = encodeURIComponent(formData.get("email") || "");
      const pincode = encodeURIComponent(formData.get("pincode") || "");
      const district = encodeURIComponent(formData.get("district") || "");
      const state = encodeURIComponent(formData.get("state") || "");
      const rawAddress = formData.get("address") || "";
      const fullAddress = [rawAddress, formData.get("district"), formData.get("state"), formData.get("pincode")].filter(Boolean).join(", ");
      const address = encodeURIComponent(fullAddress);
      const notes = encodeURIComponent(formData.get("notes") || formData.get("message") || formData.get("service_type") || "");

      // ── Firestore update: full data on final submit
      const orderId = sessionStorage.getItem("opds_order_id") || generateOrderId();
      sessionStorage.setItem("opds_order_id", orderId);
      const paymentMode = formData.get("payment_mode") || "pay_after_review";
      saveOrder({
        orderId,
        step: "submitted",
        status: paymentMode === "pay_now" ? "Form Submitted — Pay Now" : "Form Submitted — Pay After Review",
        name:     decodeURIComponent(formData.get("name")    || ""),
        mobile:   decodeURIComponent(formData.get("mobile")  || ""),
        email:    decodeURIComponent(formData.get("email")   || ""),
        service:  decodeURIComponent(formData.get("service_type") || formData.get("service_name") || ""),
        address:  rawAddress,
        pincode:  formData.get("pincode")  || "",
        district: formData.get("district") || "",
        state:    formData.get("state")    || "",
        notes:    decodeURIComponent(formData.get("notes") || ""),
        driveLink: formData.get("pan_google_drive_link") || "",
        paymentMode
      });
      const attachedFiles = (window.attachedFiles || []).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || "file"
      }));
      const attachments = encodeURIComponent(JSON.stringify({
        driveLink: formData.get("pan_google_drive_link") || "",
        files: attachedFiles
      }));

      if (window.trackAnalyticsEvent) {
        window.trackAnalyticsEvent('apply_completed', {
          serviceSlug,
          serviceName: decodeURIComponent(serviceName),
          name: decodeURIComponent(name),
          phone: decodeURIComponent(phone),
          filesCount: attachedFiles.length
        });
      }

      const rawPhone = formData.get("mobile") || "";

      function doPayNowRedirect() {
        window.location.href = `checkout.html?service=${serviceSlug}&service_name=${serviceName}&name=${name}&phone=${phone}&email=${email}&address=${address}&notes=${notes}&attachments=${attachments}`;
      }

      function doReviewConfirm() {
        const applyForm = document.getElementById("pan-apply-form");
        const confirmScreen = document.getElementById("review-confirm-screen");
        if (applyForm) applyForm.style.display = "none";
        if (confirmScreen) {
          confirmScreen.style.display = "flex";
          if (window._showReviewConfirm) window._showReviewConfirm(orderId);
          if (window.lucide) window.lucide.createIcons();
        }
        const applySection = document.getElementById("apply-now");
        if (applySection) applySection.scrollIntoView({ behavior: "smooth" });
      }

      // Show OTP modal — verify mobile before proceeding
      setTimeout(() => {
        if (rawPhone.length >= 10 && typeof window._showOtpModal === "function") {
          window._showOtpModal(rawPhone, {
            onSuccess: () => {
              if (paymentMode === "pay_now") doPayNowRedirect();
              else doReviewConfirm();
            },
            onSkip: () => {
              // User skipped OTP — proceed anyway (unverified session)
              if (paymentMode === "pay_now") doPayNowRedirect();
              else doReviewConfirm();
            }
          });
        } else {
          // No phone or modal unavailable — proceed directly
          if (paymentMode === "pay_now") doPayNowRedirect();
          else doReviewConfirm();
        }
      }, 400);
    });
  });
}

function setupPaymentFlow() {
  const paymentCards = document.querySelectorAll("[data-payment-flow]");
  if (!paymentCards.length) return;

  paymentCards.forEach(card => {
    const btnRazorpay = card.querySelector("[data-pay-btn='razorpay']");
    const btnUpi = card.querySelector("[data-pay-btn='upi']");
    const checkoutSteps = card.querySelector("[data-checkout-steps]");
    const steps = card.querySelectorAll(".checkout-step");
    const successArea = card.querySelector("[data-payment-success]");
    const upiQr = card.querySelector("[data-upi-qr]");
    const successMessage = card.querySelector("[data-success-message]");

    if (btnRazorpay && btnUpi) {
      btnUpi.addEventListener("click", () => {
        btnUpi.style.borderColor = "var(--accent)";
        btnUpi.style.color = "var(--accent)";
        btnRazorpay.style.borderColor = "";
        btnRazorpay.style.color = "";
        
        if(checkoutSteps) checkoutSteps.style.display = "none";
        if(successArea) successArea.style.display = "flex";
        
        if(upiQr) {
            upiQr.style.display = "block";
            upiQr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=support@bisenonepoint&pn=OnePointDigital&am=199&cu=INR" alt="UPI QR code for One Point Digital Services payment" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
        if(successMessage) successMessage.style.display = "block";
      });

      btnRazorpay.addEventListener("click", () => {
        btnRazorpay.style.borderColor = "var(--accent)";
        btnRazorpay.style.color = "var(--accent)";
        btnUpi.style.borderColor = "";
        btnUpi.style.color = "";
        
        if(upiQr) upiQr.style.display = "none";
        if(successMessage) successMessage.style.display = "none";
        if(successArea) successArea.style.display = "none";
        if(checkoutSteps) checkoutSteps.style.display = "grid";
        
        let currentStep = 0;
        steps.forEach(s => {
            s.style.opacity = "0.4";
            const icon = s.querySelector('span');
            if(icon) {
                icon.style.background = "rgba(255, 255, 255, 0.15)";
                icon.innerHTML = s.getAttribute("data-step");
            }
        });
        
        const processNextStep = () => {
          if (currentStep < steps.length) {
            steps[currentStep].style.opacity = "1";
            const icon = steps[currentStep].querySelector('span');
            if (icon) {
                icon.style.background = "var(--success)";
                icon.innerHTML = window.lucide ? `<i data-lucide="check" style="width: 18px; height: 18px; color: #fff;"></i>` : "✓";
                if(window.lucide) window.lucide.createIcons();
            }
            currentStep++;
            setTimeout(processNextStep, 1000);
          } else {
            setTimeout(() => {
                if(successArea) successArea.style.display = "flex";
                if(successMessage) successMessage.style.display = "block";
            }, 500);
          }
        };
        
        processNextStep();
      });
    }
  });
}

function setupLucide() {
  if (window.lucide) {
    document.querySelectorAll("[data-lucide]").forEach((item) => item.setAttribute("aria-hidden", "true"));
    window.lucide.createIcons();
  }
}

function setupInternalComponentVisualContracts() {
  if (document.body?.id === "homepage-body") return;

  const clearInlineProps = (selector, props) => {
    document.querySelectorAll(selector).forEach((element) => {
      props.forEach((prop) => element.style.removeProperty(prop));
    });
  };

  clearInlineProps(".premium-service-hero .hero-video-overlay", [
    "background",
    "backdrop-filter",
    "-webkit-backdrop-filter"
  ]);

  clearInlineProps(".premium-service-hero .hero-video-bg", [
    "filter",
    "opacity"
  ]);

  clearInlineProps(".premium-service-hero .page-hero-title, section.premium-story-showcase .premium-headline", [
    "color",
    "background",
    "-webkit-text-fill-color",
    "white-space",
    "transition"
  ]);

  clearInlineProps(".premium-service-hero .page-hero-copy > p:not(.eyebrow):not(.section-kicker):not(.tag), section.premium-story-showcase .premium-subhead-new, section.premium-story-showcase .small-feature-desc, section.premium-story-showcase .large-card-desc", [
    "color",
    "opacity",
    "font-size",
    "font-weight",
    "font-family",
    "line-height",
    "margin",
    "margin-top",
    "margin-bottom",
    "max-width"
  ]);

  clearInlineProps(".section-kicker, .eyebrow, .premium-badge-pill, .tag, .price-tag, .hero-trust-badge, .status-live-badge, .cta-small-tag", [
    "color",
    "border",
    "border-color",
    "background",
    "padding",
    "margin",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "border-radius",
    "height",
    "min-height",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-transform",
    "box-shadow"
  ]);

  clearInlineProps("section.premium-story-showcase", [
    "background",
    "border-top"
  ]);

  clearInlineProps("section.premium-story-showcase .premium-header", [
    "align-items",
    "margin-bottom"
  ]);

  clearInlineProps("section.premium-story-showcase .premium-small-features-list, #related-services .services-carousel-track, #related-services .related-source-card-grid", [
    "display",
    "grid-template-columns",
    "gap",
    "align-items"
  ]);

  clearInlineProps("section.premium-story-showcase .small-feature-item, section.premium-story-showcase .edupoint-checklist-item", [
    "padding",
    "display",
    "align-content",
    "min-height",
    "gap",
    "border",
    "border-color",
    "background",
    "box-shadow",
    "border-radius"
  ]);

  clearInlineProps(".service-icon, .feature-icon, .small-feature-icon, .large-card-icon, .faq-support-icon, .step-icon, .process-step-icon, .ci-card-icon, .doc-icon, .trust-icon, .review-icon, .store-product-icon", [
    "width",
    "height",
    "display",
    "align-items",
    "justify-content",
    "place-items",
    "color",
    "background",
    "border",
    "border-color",
    "border-radius",
    "box-shadow"
  ]);

  clearInlineProps("section.premium-story-showcase .metric-val-glass, section.premium-story-showcase .metric-label-glass, section.premium-story-showcase .cta-link-secondary, section.premium-story-showcase .btn-premium-gold", [
    "color",
    "white-space",
    "background",
    "border-color"
  ]);

  document.querySelectorAll("section.premium-story-showcase .premium-headline").forEach((element) => {
    element.removeAttribute("onmouseover");
    element.removeAttribute("onmouseout");
  });
}

window.saveCloudLink = function(btn) {
  const input = btn.previousElementSibling;
  if (!input || !input.value.trim()) {
    if (input) {
      input.focus();
      input.reportValidity();
    }
    return;
  }
  btn.classList.add("saved");
  btn.innerHTML = window.lucide ? `<i data-lucide="check" style="width: 16px; height: 16px;"></i> Saved` : "✓ Saved";
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => {
    btn.classList.remove("saved");
    btn.innerHTML = "Save";
  }, 3500);
};

window.syncGoogleDrive = function() {
  alert("🔗 Redirecting to your Google Drive...\nPlease copy the shared link of your document and paste it in the Google Drive box below.");
  window.open("https://drive.google.com", "_blank");
};

window.compressImage = function(file, maxSizeBytes, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      const maxDim = 1600;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.75;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      
      function dataURLtoFile(dataurl, filename) {
        const arr = dataurl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      }
      
      let compressedFile = dataURLtoFile(dataUrl, file.name);
      
      if (compressedFile.size > maxSizeBytes) {
        quality = 0.5;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        compressedFile = dataURLtoFile(dataUrl, file.name);
      }
      
      callback(compressedFile);
    };
    img.onerror = function() {
      callback(null);
    };
    img.src = e.target.result;
  };
  reader.onerror = function() {
    callback(null);
  };
  reader.readAsDataURL(file);
};

window.handleDeviceUpload = async function(input) {
  if (!input.files || !input.files.length) return;
  
  window.attachedFiles = window.attachedFiles || [];
  const maxFiles = 10;
  const maxSizeBytes = 1024 * 1024; // 1 MB
  
  let oversizedFiles = [];
  const fileArray = Array.from(input.files);
  input.value = "";
  
  for (const file of fileArray) {
    if (window.attachedFiles.length >= maxFiles) {
      alert("Maximum limit of 10 files reached.");
      break;
    }
    
    if (file.size <= maxSizeBytes) {
      if (!window.attachedFiles.some(f => f.name === file.name)) {
        window.attachedFiles.push(file);
      }
    } else if (file.type && file.type.startsWith("image/")) {
      const container = document.getElementById("attachment-file-list");
      if (container) {
        container.style.display = "flex";
        let statusEl = document.getElementById("upload-compress-spinner");
        if (!statusEl) {
          statusEl = document.createElement("div");
          statusEl.id = "upload-compress-spinner";
          statusEl.className = "attached-file-item glass-panel";
          statusEl.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,0.9); border: 1px solid rgba(18,86,150,0.15); color: var(--primary);";
          statusEl.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 18px; height: 18px;"></i> <span class="text-sm">Compressing large photo: ${file.name}...</span>`;
          container.appendChild(statusEl);
          if (window.lucide) window.lucide.createIcons();
        }
      }
      
      const compressed = await new Promise(resolve => {
        window.compressImage(file, maxSizeBytes, resolve);
      });
      
      document.getElementById("upload-compress-spinner")?.remove();
      
      if (compressed && compressed.size <= maxSizeBytes) {
        if (!window.attachedFiles.some(f => f.name === compressed.name)) {
          window.attachedFiles.push(compressed);
        }
      } else {
        oversizedFiles.push(file);
      }
    } else {
      oversizedFiles.push(file);
    }
    window.renderAttachmentList();
  }
  
  if (oversizedFiles.length > 0) {
    window.showCompressorAlert(oversizedFiles);
  }
};

window.renderAttachmentList = function() {
  const container = document.getElementById("attachment-file-list");
  if (!container) return;
  
  window.attachedFiles = window.attachedFiles || [];
  
  if (window.attachedFiles.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }
  
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "8px";
  container.style.marginTop = "12px";
  
  let html = `<div class="attachment-list-title" class="text-sm font-bold" style="color: var(--ink); display: flex; justify-content: space-between; align-items: center;">
    <span>Attached Files (${window.attachedFiles.length}/10)</span>
    <span class="text-xs" style="color: var(--primary);">Max 1MB/file</span>
  </div>`;
  
  window.attachedFiles.forEach((file, index) => {
    const sizeKb = (file.size / 1024).toFixed(1);
    html += `
      <div class="attached-file-item glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,0.9); border: 1px solid rgba(18,86,150,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <i data-lucide="file-check" style="color: var(--success); width: 18px; height: 18px; flex-shrink: 0;"></i>
          <span class="text-sm font-semibold" style="color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</span>
          <span class="text-xs" style="color: var(--muted); flex-shrink: 0;">(${sizeKb} KB)</span>
        </div>
        <button type="button" class="btn-remove-file" onclick="window.removeAttachedFile(${index})" style="background: none; border: none; color: var(--error); cursor: pointer; padding: 4px; display: grid; place-items: center; border-radius: 6px;" title="Remove file">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>
    `;
  });
  
  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
};

window.removeAttachedFile = function(index) {
  if (window.attachedFiles && window.attachedFiles[index]) {
    window.attachedFiles.splice(index, 1);
    window.renderAttachmentList();
  }
};

window.showCompressorAlert = function(files) {
  let fileNames = files.map(f => `${f.name} (${(f.size/(1024*1024)).toFixed(2)} MB)`).join(", ");
  
  let modal = document.getElementById("compressor-alert-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "compressor-alert-modal";
    modal.className = "custom-modal-overlay";
    modal.innerHTML = `
      <div class="custom-modal-box glass-panel premium-modal-box">
        <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 14px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: #fee2e2; color: #dc2626; display: grid; place-items: center;">
              <i data-lucide="alert-triangle"></i>
            </div>
            <h3 class="text-lg font-extrabold" style="margin: 0; color: var(--ink);">File Size Exceeded (Max 1 MB)</h3>
          </div>
          <button type="button" onclick="window.closeCompressorAlert()" style="background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px;">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="modal-body text-sm leading-normal" style="color: var(--muted); margin-bottom: 24px;">
          <p style="margin-top: 0;">The following files exceed the maximum allowed size of 1 MB:</p>
          <div id="oversized-files-list" class="font-semibold" style="padding: 10px 14px; background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 12px; color: #b91c1c; margin: 12px 0; word-break: break-all;"></div>
          <p style="margin-bottom: 0;">Please compress your files using our dedicated File Compressor & Converter Web App before uploading.</p>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary full" onclick="window.openCompressorApp()">
            <i data-lucide="external-link"></i> Open File Compressor & Converter App
          </button>
          <button type="button" class="btn btn-soft full" onclick="window.closeCompressorAlert()">
            Close Alert
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById("oversized-files-list").innerText = fileNames;
  modal.style.display = "flex";
  if (window.lucide) window.lucide.createIcons();
};

window.closeCompressorAlert = function() {
  const modal = document.getElementById("compressor-alert-modal");
  if (modal) modal.style.display = "none";
};

window.openCompressorApp = function() {
  alert("🚀 Redirecting to One Point File Compressor & Converter Web App...\n(Link will be configured by operator)");
  window.open("https://compressor.bisenonepoint.com", "_blank");
};

function setupDynamicQuickServices() {
  const grid = document.querySelector("[data-quick-services-grid]");
  if (!grid) return;

  const fixedServices = [
    {
      title: "PAN Card Assistance",
      tag: "2-3 days",
      category: "government",
      popular: true,
      accent: "#d2a12a",
      icon: "credit-card",
      desc: "Apply for new PAN card or request corrections with secure document upload.",
      actions: [
        { label: "Quick Apply", href: "service-pan-card.html", primary: true },
        { label: "Track", href: "track-application.html", ghost: true }
      ]
    },
    {
      title: "Citizen Security Assistance",
      tag: "Same day",
      category: "government",
      popular: true,
      accent: "#125696",
      icon: "shield-alert",
      desc: "Police verification, Cybercrime reporting, LDR & Citizen Safety support.",
      actions: [
        { label: "Quick Apply", href: "service-citizen-security-cybercrime-police-help.html", primary: true }
      ]
    },
    {
      title: "GST Registration",
      tag: "1-2 days",
      category: "business",
      popular: true,
      accent: "#d2a12a",
      icon: "coins",
      desc: "GST registration, profile review, filing assistance and consultant guidance.",
      actions: [
        { label: "Quick Apply", href: "service-gst-registration.html", primary: true }
      ]
    }
  ];

  const rotatingPool = [
    {
      title: "Admit Card & Results",
      tag: "Instant",
      category: "student",
      popular: true,
      accent: "#125696",
      icon: "ticket-check",
      desc: "Admit card download, result check, scorecard print & choice filling assistance.",
      actions: [
        { label: "Open Service", href: "edupoint-admit-card-results.html", primary: true }
      ]
    },
    {
      title: "Competitive Exams",
      tag: "Instant",
      category: "student",
      popular: true,
      accent: "#125696",
      icon: "award",
      desc: "UPSC, SSC, RRB, IBPS, Police, NEET, JEE & State PSC online exam form filling.",
      actions: [
        { label: "Apply Now", href: "edupoint-competitive-exams.html", primary: true }
      ]
    },
    {
      title: "State Certificates & Civil Registration",
      tag: "1-3 days",
      category: "government",
      popular: true,
      accent: "#125696",
      icon: "file-check-2",
      desc: "Income, domicile, caste, birth, death, marriage & civil certificate application support.",
      actions: [
        { label: "Quick Apply", href: "service-state-certificates-civil-registration.html", primary: true }
      ]
    },
    {
      title: "Voter ID Card",
      tag: "15-30 days",
      category: "government",
      popular: true,
      accent: "#125696",
      icon: "user-check",
      desc: "Apply for new Voter ID card, address change, detail updates & e-EPIC download.",
      actions: [
        { label: "Quick Apply", href: "service-voter-id.html", primary: true }
      ]
    },
    {
      title: "Passport Assistance",
      tag: "2-4 weeks",
      category: "government",
      popular: true,
      accent: "#125696",
      icon: "file-text",
      desc: "Fresh passport application, renewal, appointment booking & document checklist.",
      actions: [
        { label: "Start", href: "service-passport-assistance.html", primary: true }
      ]
    },
    {
      title: "Aadhaar Services Assistance",
      tag: "Same day",
      category: "government",
      popular: true,
      accent: "#125696",
      icon: "fingerprint",
      desc: "Aadhaar enrolment, demographic detail update, photo update & PVC card support.",
      actions: [
        { label: "Quick Apply", href: "service-aadhaar-services-assistance.html", primary: true }
      ]
    },
    {
      title: "Transport & RTO Facilitation",
      tag: "1-3 days",
      category: "government",
      popular: false,
      accent: "#125696",
      icon: "car",
      desc: "Learner's & Driving Licence, RC transfers, duplicate RC, HSRP & tax support.",
      actions: [
        { label: "Quick Apply", href: "service-transport-rto-facilitation.html", primary: true }
      ]
    },
    {
      title: "Ration Card Application Assistance",
      tag: "7-15 days",
      category: "government",
      popular: false,
      accent: "#125696",
      icon: "credit-card",
      desc: "New ration card application, member addition/deletion, correction & shop transfer.",
      actions: [
        { label: "Quick Apply", href: "service-ration-card-assistance.html", primary: true }
      ]
    },
    {
      title: "Pension & Welfare Schemes",
      tag: "Scheme-wise",
      category: "government",
      popular: false,
      accent: "#125696",
      icon: "landmark",
      desc: "Pension, Family ID, Jeevan Pramaan life certificate and e-Shram card support.",
      actions: [
        { label: "Quick Apply", href: "service-pension-welfare-schemes-assistance.html", primary: true }
      ]
    },
    {
      title: "Admission Assistance",
      tag: "Guided",
      category: "student",
      popular: true,
      accent: "#125696",
      icon: "school",
      desc: "School, College, ITI, B.Ed, Nursing, NIOS & University admissions support.",
      actions: [
        { label: "Apply Now", href: "edupoint-admission-assistance.html", primary: true }
      ]
    },
    {
      title: "Scholarship Assistance",
      tag: "Seasonal",
      category: "student",
      popular: true,
      accent: "#125696",
      icon: "badge-indian-rupee",
      desc: "NSP, UP State, OBC, SC/ST, Merit & Post-Matric scholarship online applications.",
      actions: [
        { label: "Apply Now", href: "edupoint-scholarship-assistance.html", primary: true }
      ]
    },
    {
      title: "Career Services",
      tag: "Same day",
      category: "student",
      popular: true,
      accent: "#125696",
      icon: "briefcase",
      desc: "Professional resume writing, CV design, cover letters, SOP & portfolio creation.",
      actions: [
        { label: "Build Resume", href: "edupoint-career-services.html", primary: true }
      ]
    },
    {
      title: "Business Registration & Corporate Setup",
      tag: "1-3 days",
      category: "business",
      popular: true,
      accent: "#d2a12a",
      icon: "building-2",
      desc: "Udyam MSME registration, Private Ltd, OPC, LLP setup, FSSAI & shop licensing.",
      actions: [
        { label: "Quick Apply", href: "service-business-registration-corporate-setup.html", primary: true }
      ]
    },
    {
      title: "Income Tax Assistance",
      tag: "1-2 days",
      category: "business",
      popular: true,
      accent: "#d2a12a",
      icon: "receipt",
      desc: "ITR filing consultancy, portal registration, Form 26AS, AIS/TIS review & refund check.",
      actions: [
        { label: "Quick Apply", href: "service-income-tax-assistance.html", primary: true }
      ]
    },
    {
      title: "Legal Drafting & Court Services Assistance",
      tag: "1-2 days",
      category: "business",
      popular: false,
      accent: "#125696",
      icon: "scale",
      desc: "Affidavits, rent agreements, gazette name change, notary & legal document drafting.",
      actions: [
        { label: "Quick Apply", href: "service-legal-drafting-court-services.html", primary: true }
      ]
    },
    {
      title: "Bus Ticket",
      tag: "Travel",
      category: "travel",
      popular: true,
      accent: "#d2a12a",
      icon: "bus",
      desc: "Book sleeper, luxury and AC bus tickets across all major routes.",
      actions: [
        { label: "Book Now", href: "travel-services.html#bus-ticket", primary: true }
      ]
    },
    {
      title: "Train Ticket",
      tag: "Travel",
      category: "travel",
      popular: true,
      accent: "#125696",
      icon: "train",
      desc: "IRCTC authorized railway ticket booking, Tatkal assistance & PNR status check.",
      actions: [
        { label: "Book Now", href: "travel-services.html#train-ticket", primary: true }
      ]
    },
    {
      title: "Flight Ticket",
      tag: "Travel",
      category: "travel",
      popular: false,
      accent: "#d2a12a",
      icon: "plane",
      desc: "Domestic and international flight ticket bookings at competitive rates.",
      actions: [
        { label: "Book Now", href: "travel-services.html#flight-ticket", primary: true }
      ]
    },
    {
      title: "Hotel Booking",
      tag: "Travel",
      category: "travel",
      popular: false,
      accent: "#125696",
      icon: "hotel",
      desc: "Budget-friendly hotel room reservations and tour packages.",
      actions: [
        { label: "Book Now", href: "travel-services.html#hotel-booking", primary: true }
      ]
    }
  ];

  // Combine fixed and rotating services into one pool so we have all of them to scroll/rotate through
  window.currentQuickServices = [...fixedServices, ...rotatingPool];

  let currentIndex = 0;
  let autoRotateInterval = null;
  let currentFilteredList = [];

  function getVisibleCards() {
    if (window.innerWidth <= 720) return 1;
    if (window.innerWidth <= 1040) return 2;
    return 3;
  }

  function updateCarousel() {
    const visible = getVisibleCards();
    const maxIndex = Math.max(0, currentFilteredList.length - visible);
    
    // Ensure boundary check
    if (currentIndex > maxIndex) {
      currentIndex = maxIndex;
    }
    if (currentIndex < 0) {
      currentIndex = 0;
    }

    const cards = [...grid.children];
    const gap = 20;
    const basis = visible === 1 ? "100%" : visible === 2 ? `calc((100% - ${gap}px) / 2)` : `calc((100% - ${2 * gap}px) / 3)`;

    grid.style.setProperty("--carousel-card-size", basis);
    grid.style.transform = "none";
    grid.style.width = "100%";

    cards.forEach((card, index) => {
      const isVisible = (index >= currentIndex && index < currentIndex + visible);
      card.hidden = !isVisible;
      if (!isVisible) {
        card.style.setProperty("display", "none", "important");
      } else {
        card.style.setProperty("display", "flex", "important");
      }
    });

    const btnPrev = document.querySelector("[data-carousel-prev]");
    const btnNext = document.querySelector("[data-carousel-next]");
    
    if (btnPrev) {
      btnPrev.style.opacity = currentIndex === 0 ? "0.3" : "1";
      btnPrev.style.pointerEvents = currentIndex === 0 ? "none" : "auto";
    }
    if (btnNext) {
      btnNext.style.opacity = currentIndex >= maxIndex ? "0.3" : "1";
      btnNext.style.pointerEvents = currentIndex >= maxIndex ? "none" : "auto";
    }
  }

  function startAutoRotate() {
    stopAutoRotate();
    autoRotateInterval = setInterval(() => {
      const visible = getVisibleCards();
      const maxIndex = Math.max(0, currentFilteredList.length - visible);
      if (maxIndex <= 0) return;

      if (currentIndex >= maxIndex) {
        currentIndex = 0; // Wrap around to start
      } else {
        currentIndex++;
      }
      updateCarousel();
    }, 4500);
  }

  // Mobile swipe gestures
  let touchStartX = 0;
  let touchEndX = 0;

  grid.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  grid.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50; // minimum swipe distance in px
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) < swipeThreshold) return;
    
    stopAutoRotate();
    const visible = getVisibleCards();
    const maxIndex = Math.max(0, currentFilteredList.length - visible);
    
    if (diff > 0) {
      // Swiped left, go next
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      }
    } else {
      // Swiped right, go prev
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    }
    startAutoRotate();
  }

  function stopAutoRotate() {
    if (autoRotateInterval) {
      clearInterval(autoRotateInterval);
      autoRotateInterval = null;
    }
  }

  function renderGrid(filter = "all") {
    currentFilteredList = window.currentQuickServices.filter(service => {
      if (filter === "all") return true;
      if (filter === "popular") return service.popular;
      return service.category === filter;
    });

    if (currentFilteredList.length === 0) {
      grid.innerHTML = `<p class="text-center text-lg" style="grid-column: 1/-1; padding: 48px; color: var(--muted);">No services found in this category.</p>`;
      return;
    }

    const kickerMap = {
      "PAN Card Assistance": "Fresh Allotment",
      "Citizen Security Assistance": "Safety & Verification",
      "GST Registration": "Tax & Business Setup",
      "Admit Card & Results": "Student Assistance",
      "Competitive Exams": "Exam Form Filling",
      "State Certificates & Civil Registration": "Govt Certificates",
      "Voter ID Card": "Electoral Services",
      "Passport Assistance": "Passport Application",
      "Aadhaar Services Assistance": "Aadhaar Updation",
      "Transport & RTO Facilitation": "RTO & Driving License",
      "Ration Card Application Assistance": "Civil Supplies",
      "Pension & Welfare Schemes": "Welfare Schemes",
      "Admission Assistance": "College & University",
      "Scholarship Assistance": "State & National",
      "Career Services": "Resume & Career",
      "Business Registration & Corporate Setup": "Corporate Setup",
      "Income Tax Assistance": "ITR & Taxation",
      "Legal Drafting & Court Services Assistance": "Legal & Notary",
      "Bus Ticket": "Travel Booking",
      "Train Ticket": "IRCTC Rail Desk",
      "Flight Ticket": "Air Travel Booking",
      "Hotel Booking": "Hotel Reservations"
    };

    grid.innerHTML = currentFilteredList.map(service => {
      const pricing = servicePricingFor(service.title);
      const displayPrice = pricing?.displayPrice || "From ₹99";
      const kicker = kickerMap[service.title] || (service.category === "government" ? "Govt Verified" : service.category === "student" ? "Student Desk" : service.category === "business" ? "Business Filing" : "Travel Desk");
      const officialFeeLabel = service.category === "government"
        ? "As per portal"
        : service.category === "travel"
          ? "Fare at actuals"
          : pricing?.pricingModel === "service_charge_plus_actual"
            ? "Actuals billed"
            : "If applicable";
      const primaryAct = service.actions && service.actions[0] ? service.actions[0] : { label: "Apply for Assistance", href: "services.html" };

      return `
      <article class="service-card voter-service-card selected-card" data-enterprise-service-card data-service="${escapeOption(service.title)}">
        <div class="voter-card-top-row">
          <div class="voter-card-icon-kicker">
            <div class="voter-service-icon"><i data-lucide="${service.icon}"></i></div>
            <span class="voter-category-kicker">${kicker}</span>
          </div>
          <span class="voter-card-check" title="Verified Service"><i data-lucide="check"></i></span>
        </div>
        <h3>${service.title}</h3>
        <p class="voter-card-desc">${service.desc}</p>
        <div class="voter-card-meta-block">
          <div class="voter-meta-row">
            <span class="voter-meta-label">Estimated:</span>
            <strong>${service.tag}</strong>
            <span class="voter-meta-sep">&bull;</span>
            <span class="voter-meta-label">Assistance:</span>
            <strong class="voter-meta-fee" data-pricing-slot data-service="${escapeOption(service.title)}">${displayPrice}</strong>
          </div>
          <div class="voter-meta-sub">Government portal fee: ${officialFeeLabel}</div>
        </div>
        <div class="voter-action-stack">
          <a class="btn btn-primary font-bold btn-service-select" href="${primaryAct.href}"${String(primaryAct.href).includes("wa.me") ? ' target="_blank" rel="noopener"' : ""}>
            Apply for Assistance <i data-lucide="arrow-right"></i>
          </a>
          <a class="voter-view-req" href="${primaryAct.href}">View requirements</a>
        </div>
      </article>
    `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
    setupServiceCtas();
    
    // Reset carousel index and trigger animations/offsets
    currentIndex = 0;
    grid.style.transform = "translateX(0px)";
    
    setTimeout(() => {
      updateCarousel();
      startAutoRotate();
    }, 100);
  }

  // Setup navigation click events
  const btnPrev = document.querySelector("[data-carousel-prev]");
  const btnNext = document.querySelector("[data-carousel-next]");

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      stopAutoRotate();
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
      startAutoRotate();
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      stopAutoRotate();
      const visible = getVisibleCards();
      const maxIndex = Math.max(0, currentFilteredList.length - visible);
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      }
      startAutoRotate();
    });
  }

  // Handle Resize and Orientation changes
  window.addEventListener("resize", () => {
    updateCarousel();
  });

  renderGrid("all");
  window.addEventListener("opds:catalog-ready", () => {
    const activeFilter = document.querySelector("[data-service-filters] .active")?.getAttribute("data-filter") || "all";
    renderGrid(activeFilter);
  });

  const filterButtons = document.querySelectorAll("[data-service-filters] button");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.className = "btn btn-ghost");
      btn.className = "btn btn-soft active";
      renderGrid(btn.getAttribute("data-filter"));
    });
  });
}

const enterpriseServicePages = new Set([
  "services.html",
  "online-services.html",
  "design-services.html",
  "edupoint.html",
  "business-solutions.html",
  "travel-services.html"
]);

const enterpriseServiceFallbacks = {
  "PAN Card": { time: "2-3 days", price: "Rs. 199", category: "government", icon: "id-card", docs: ["Aadhaar Card", "DOB Proof", "Passport Photo", "Signature"], popular: true },
  "PAN Card Application Assistance": { time: "2-3 days", price: "Rs. 199", category: "government", icon: "id-card", docs: ["Aadhaar Card", "DOB Proof (Birth Cert / 10th Marksheet)", "Passport Size Photo", "Signature"], popular: true },
  "PAN Card Correction & Update Support": { time: "2-3 days", price: "Rs. 199", category: "government", icon: "edit-3", docs: ["Existing PAN Card Copy", "Aadhaar Card", "Correction Proof (Gazette/Marriage Cert/Marksheet)", "Updated Photo & Signature"], popular: true },
  "PAN Card Reprint Assistance": { time: "5-7 days", price: "Rs. 149", category: "government", icon: "credit-card", docs: ["Existing PAN Number / Copy", "Aadhaar Card", "Aadhaar-linked Mobile Number"] },
  "Instant e-PAN Download Guidance": { time: "Same day", price: "Rs. 99", category: "government", icon: "download-cloud", docs: ["PAN Number / Ack Receipt", "Aadhaar Card Number", "Aadhaar-linked Mobile Number (OTP)"], popular: true },
  "PAN Application Status Check": { time: "Instant", price: "Free Support", category: "government", icon: "search-check", docs: ["15-Digit Acknowledgment Number / Coupon ID", "Date of Birth", "Mobile Number"] },
  "PAN–Aadhaar Linking & Status Support": { time: "1-2 days", price: "Rs. 99", category: "government", icon: "link-2", docs: ["PAN Card Number", "Aadhaar Card Number", "Aadhaar-linked Mobile Number (OTP)", "Challan Receipt (if applicable)"] },
  "Duplicate PAN Surrender Guidance": { time: "3-5 days", price: "Rs. 199", category: "government", icon: "alert-triangle", docs: ["Retained PAN Details", "Duplicate PAN Number(s)", "Aadhaar Card", "Surrender Affidavit / Declaration"] },
  "Ayushman Card": { time: "Same day", price: "Rs. 99", category: "government", icon: "heart-pulse", docs: ["Aadhaar card", "Ration card or family ID"], popular: true },
  "Voter ID": { time: "15-30 days", price: "Rs. 149", category: "government", icon: "vote", docs: ["Aadhaar Card (Identity & Age proof)", "Address Proof", "Passport Size Photo"], popular: true },
  "Voter ID New Enrollment Assistance": { time: "15-30 days", price: "Rs. 149", category: "government", icon: "user-plus", docs: ["Aadhaar Card (Identity & Age proof)", "DOB Proof (Birth Cert / 10th Marksheet / Passport)", "Address Proof (Aadhaar / Utility Bill / Bank Passbook)", "Passport Size Photo"], popular: true },
  "Overseas / NRI Voter Registration Assistance": { time: "15-30 days", price: "Rs. 199", category: "government", icon: "globe-2", docs: ["Valid Indian Passport Copy (with Visa & Address page)", "Proof of Overseas Residence (Work Permit / Visa)", "Passport Size Photo (White background)", "Self-attested Declaration"] },
  "Voter ID Correction & Update Support": { time: "15-30 days", price: "Rs. 149", category: "government", icon: "square-pen", docs: ["Existing Voter ID (EPIC Card Copy)", "Aadhaar Card", "Proof of Correction (10th Marksheet / Marriage Cert / Gazette)", "Recent Passport Photo"], popular: true },
  "Voter ID Address / Constituency Transfer Assistance": { time: "15-30 days", price: "Rs. 149", category: "government", icon: "map-pinned", docs: ["Existing Voter ID (EPIC Card Copy)", "Aadhaar Card", "New Address Proof (Aadhaar / Utility Bill / Bank Passbook)", "Recent Passport Photo"] },
  "Replacement Voter ID Application Support": { time: "10-20 days", price: "Rs. 149", category: "government", icon: "copy-plus", docs: ["Existing Voter ID Number (EPIC No.)", "Aadhaar Card", "FIR / Lost Complaint Copy (or Damaged Card Copy)", "Recent Passport Photo"] },
  "Voter ID Photo Update Assistance": { time: "15-30 days", price: "Rs. 149", category: "government", icon: "image-up", docs: ["Existing Voter ID (EPIC Card Copy)", "Aadhaar Card", "Recent Passport Size Photograph (White background)"] },
  "PwD Marking in Electoral Roll Assistance": { time: "7-15 days", price: "Rs. 99", category: "government", icon: "accessibility", docs: ["Existing Voter ID (EPIC Card Copy)", "Aadhaar Card", "Disability Certificate / UDID Card Copy"] },
  "Name Deletion from Electoral Roll Assistance": { time: "15-30 days", price: "Rs. 149", category: "government", icon: "user-minus", docs: ["Applicant / Notifier Aadhaar Card", "Target Person's Voter ID (EPIC Number)", "Death Certificate (In case of deceased) or Relocation Proof"] },
  "Objection to Incorrect Voter Enrollment Assistance": { time: "15-30 days", price: "Rs. 149", category: "government", icon: "shield-alert", docs: ["Objector's Voter ID & Aadhaar Card", "Details / EPIC Number of Incorrectly Enrolled Voter", "Supporting Evidence / Non-residence Proof"] },
  "e-EPIC Voter Card Download Assistance": { time: "Same day", price: "Rs. 49", category: "government", icon: "download-cloud", docs: ["Voter ID Number (EPIC Number) / Ref Number", "Aadhaar Card Number", "Aadhaar-linked Active Mobile Number (for OTP)"], popular: true },
  "Name Search in Electoral Roll": { time: "Instant", price: "Free Support", category: "government", icon: "search", docs: ["Applicant Full Name & Father/Husband Name", "Date of Birth / Age", "District & Assembly Constituency Name"] },
  "Electoral Roll PDF Download Assistance": { time: "Instant", price: "Rs. 29", category: "government", icon: "file-down", docs: ["District & Assembly Constituency Name", "Polling Station / Part Number"] },
  "Voter Application Status Tracking Assistance": { time: "Instant", price: "Free Support", category: "government", icon: "list-checks", docs: ["Form Reference Number (11-13 Digit Ref ID)", "State & Assembly Constituency Name"] },
  "Voter Complaint Registration Assistance": { time: "1-2 days", price: "Rs. 49", category: "government", icon: "message-square-warning", docs: ["Voter ID Number (if available)", "Aadhaar Card / Identity Proof", "Complaint Details & Supporting Screenshot"] },
  "Voter Complaint Status Tracking Assistance": { time: "Instant", price: "Free Support", category: "government", icon: "messages-square", docs: ["Grievance / Complaint Reference ID", "Applicant Mobile Number"] },
  "Passport Assistance": { time: "2-4 weeks", price: "Rs. 299 + Govt Fee", category: "government", icon: "plane", docs: ["Aadhaar Card (Address Proof)", "DOB Proof (Birth Cert / 10th Marksheet)", "Non-ECR Proof (Class 10th Certificate)", "Identity Proof (Aadhaar / PAN / Voter ID)"], popular: true },
  "Fresh Passport Application Assistance": { time: "2-4 weeks", price: "Rs. 299 + Govt Fee", category: "government", icon: "file-plus-2", docs: ["Proof of Present Address (Aadhaar / Utility Bill / Bank Passbook)", "Proof of Date of Birth (Birth Cert / 10th Marksheet / PAN Card)", "Non-ECR Proof (Class 10th or Higher Educational Certificate)", "Identity Proof (Aadhaar / Voter ID / Driving License)"], popular: true },
  "Passport Renewal & Re-Issue Support": { time: "2-3 weeks", price: "Rs. 299 + Govt Fee", category: "government", icon: "refresh-cw", docs: ["Original Old Passport (First 2 & last 2 pages copy)", "Proof of Present Address (Aadhaar Card / Utility Bill)", "Self-attested Copy of Old Passport", "Supporting Proof of Change (Marriage Cert / Gazette / Marksheet)"], popular: true },
  "Tatkaal Passport Processing Help": { time: "3-7 days", price: "Rs. 499 + Govt Fee", category: "government", icon: "zap", docs: ["Proof of Present Address (Aadhaar / Bank Passbook / Utility Bill)", "Proof of Date of Birth (Aadhaar / Birth Cert / 10th Marksheet)", "Any 3 Annexure-F Verification IDs (Aadhaar, Voter ID, PAN, DL, Bank Passbook)", "Annexure E Standard Declaration Form"], popular: true },
  "Minor Passport Application Support": { time: "2-3 weeks", price: "Rs. 299 + Govt Fee", category: "government", icon: "baby", docs: ["Proof of Present Address of Parents (Aadhaar / Parent Passport)", "Child's Birth Certificate (Issued by Municipal Corp / Registrar)", "Parents' Valid Passports Copy (First & last page)", "Annexure D / Annexure C Consent Form (Signed by Parents)"] },
  "Police Clearance Certificate (PCC) Guidance": { time: "7-14 days", price: "Rs. 199 + Govt Fee", category: "government", icon: "shield-check", docs: ["Original Active Passport (Self-attested copy of first & last page)", "Proof of Present Address (if address changed from Passport)", "Employment / Visa Offer Letter (if required for destination country)"] },
  "Passport Details Correction & Updates": { time: "15-30 days", price: "Rs. 299 + Govt Fee", category: "government", icon: "edit-3", docs: ["Original Passport (Self-attested copy of first & last page)", "Proof of Correction (Marriage Cert / Gazette / 10th Marksheet)", "Proof of Present Address", "Identity Proof (Aadhaar / Voter ID)"], popular: true },
  "Citizen Security, Cybercrime & Police Help": { time: "Same day", price: "Rs. 150", category: "government", icon: "shield-alert", docs: ["Aadhaar Card / Voter ID of Applicant", "Passport Size Photograph", "Relevant Case / Tenant / Worker Details", "Active Mobile Number for OTP Verification"], popular: true },
  "Tenant Police Verification Assistance": { time: "Same day", price: "Rs. 150", category: "government", icon: "home", docs: ["Tenant Aadhaar Card / Voter ID", "Tenant Passport Photograph", "Landlord Property Address Details", "Active Mobile Number for OTP"], popular: true },
  "Domestic Staff Police Verification Support": { time: "Same day", price: "Rs. 150", category: "government", icon: "user-check", docs: ["Worker Aadhaar Card / ID Proof", "Worker Passport Photo", "Permanent & Local Address Details", "Employer Contact Details"] },
  "Cyber Fraud Complaint Filing Assistance": { time: "Instant", price: "Rs. 150", category: "government", icon: "shield-alert", docs: ["Victim Identity Proof (Aadhaar / PAN)", "Bank Statement / UPI Transaction Proof", "Screenshots of Scam Messages / Calls", "Incident Narrative & Fraud Timeline"], popular: true },
  "Lost Document Report / LDR Filing Support": { time: "Instant", price: "Rs. 100", category: "government", icon: "file-warning", docs: ["Owner Aadhaar Card / ID Proof", "Lost Item / Document Serial / IMEI Number", "Place & Date of Loss Details", "Active Mobile Number for SMS Link"] },
  "Aadhaar Services Assistance": { time: "Same day", price: "Rs. 149", category: "government", icon: "fingerprint", docs: ["Existing Aadhaar card / EID slip", "Mobile number for OTP", "Identity or address proof for the requested update"], recent: true },
  "State Certificates & Civil Registration": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "file-check-2", docs: ["Aadhaar card", "DOB Proof", "Passport Size Photo", "Signature"], popular: true },
  "Income Certificate Application Assistance": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "indian-rupee", docs: ["Aadhaar card", "Income proof", "Photo"], popular: true },
  "Domicile / Residence Certificate Assistance": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "home", docs: ["Aadhaar card", "Residence proof", "Photo"] },
  "Caste Certificate Application Assistance": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "users", docs: ["Aadhaar card", "Caste proof", "Photo"] },
  "NCL Certificate Assistance": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "file-check-2", docs: ["Aadhaar card", "Income proof", "Photo"] },
  "EWS Certificate Application Guidance": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "award", docs: ["Aadhaar card", "Income & Asset proof", "Photo"] },
  "Birth Certificate Registration Support": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "baby", docs: ["Hospital record", "Parents Aadhaar", "Photo"] },
  "Delayed Birth Registration Assistance": { time: "3-7 days", price: "Rs. 199", category: "government", icon: "clock", docs: ["Affidavit", "Magistrate order", "Parents Aadhaar"] },
  "Birth Certificate Correction Assistance": { time: "3-7 days", price: "Rs. 199", category: "government", icon: "edit-3", docs: ["Original birth certificate", "Aadhaar proof", "Correction proof"] },
  "Death Certificate Registration Support": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "file-text", docs: ["Hospital summary", "Deceased Aadhaar", "Applicant ID"] },
  "Delayed Death Registration Assistance": { time: "3-7 days", price: "Rs. 199", category: "government", icon: "alert-circle", docs: ["Affidavit", "Magistrate permission", "Applicant Aadhaar"] },
  "Death Certificate Correction Assistance": { time: "3-7 days", price: "Rs. 199", category: "government", icon: "file-edit", docs: ["Original death certificate", "Correction proof", "Applicant ID"] },
  "Marriage Registration Certificate Assistance": { time: "3-7 days", price: "Rs. 299", category: "government", icon: "heart", docs: ["Bride & Groom Aadhaar", "Marriage card / photos", "Witness IDs"] },
  "Character Certificate Application Assistance": { time: "7-14 days", price: "Rs. 199", category: "government", icon: "shield-check", docs: ["Aadhaar card", "Address proof", "Photo"] },
  "Unemployment Certificate Assistance": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "user-x", docs: ["Qualification marksheets", "Aadhaar card", "Photo"] },
  "UDID Disability Card Application Support": { time: "3-7 days", price: "Rs. 149", category: "government", icon: "accessibility", docs: ["Medical disability certificate", "Aadhaar card", "Photo"] },
  "Surviving Member Certificate Assistance": { time: "3-7 days", price: "Rs. 199", category: "government", icon: "users-round", docs: ["Death certificate", "Family member IDs", "Revenue report"] },
  "Legal Heir Certificate Application Support": { time: "7-14 days", price: "Rs. 299", category: "government", icon: "scale", docs: ["Death certificate", "Family tree affidavit", "Legal heir IDs"] },
  "Certificate Correction & Resubmission Assistance": { time: "1-3 days", price: "Rs. 149", category: "government", icon: "rotate-ccw", docs: ["Rejected application slip", "Corrected documents", "Aadhaar card"] },
  "Income Certificate": { time: "7-10 days", price: "Rs. 199", category: "government", icon: "indian-rupee", docs: ["Aadhaar card", "Income proof", "Photo"], popular: true },
  "Domicile Certificate": { time: "7-10 days", price: "Rs. 199", category: "government", icon: "home", docs: ["Aadhaar card", "Residence proof", "Photo"] },
  "Caste Certificate": { time: "7-15 days", price: "Rs. 199", category: "government", icon: "users", docs: ["Aadhaar card", "Caste proof", "Photo"] },
  "Pension & Welfare Schemes": { time: "Varies by scheme", price: "Rs. 249", category: "government", icon: "landmark", docs: ["Aadhaar card", "Mobile number for OTP", "Bank passbook and relevant scheme documents"] },
  "GST Registration": { time: "3-7 days", price: "Rs. 499 + Govt Fee", category: "business", icon: "calculator", docs: ["PAN", "Aadhaar", "Business proof"], popular: true },
  "MSME Registration": { time: "1-2 days", price: "Rs. 249", category: "business", icon: "factory", docs: ["Aadhaar", "PAN", "Business details"] },
  "Digital Signature": { time: "1-3 days", price: "Rs. 999", category: "business", icon: "key-round", docs: ["PAN", "Aadhaar", "Photo"] },
  "FSSAI License": { time: "3-7 days", price: "Rs. 799 + Govt Fee", category: "business", icon: "utensils", docs: ["Aadhaar", "Business address", "Food category"] },
  "Shop License": { time: "3-7 days", price: "Rs. 699 + Govt Fee", category: "business", icon: "store", docs: ["Aadhaar", "Shop address", "Photo"] },
  "IEC Code": { time: "3-5 days", price: "Rs. 1499 + Govt Fee", category: "business", icon: "ship", docs: ["PAN", "Bank proof", "Business proof"] },
  "Trademark": { time: "2-4 weeks", price: "Rs. 2499 + Govt Fee", category: "business", icon: "badge-check", docs: ["Logo/name", "Applicant proof", "Business proof"] },
  "Company Registration": { time: "7-15 days", price: "Rs. 4999 + Govt Fee", category: "business", icon: "building-2", docs: ["PAN", "Aadhaar", "Address proof"] },
  "Exam Form Filling": { time: "Same day", price: "Rs. 99", category: "student", icon: "file-pen-line", docs: ["Aadhaar", "Photo", "Education details"], popular: true },
  "Admit Card Download": { time: "Instant", price: "Rs. 30", category: "student", icon: "download-cloud", docs: ["Registration number", "DOB"], popular: true },
  "Result Download": { time: "Instant", price: "Rs. 30", category: "student", icon: "award", docs: ["Roll number", "DOB"] },
  "Scholarship Form": { time: "1-2 days", price: "Rs. 149", category: "student", icon: "graduation-cap", docs: ["Aadhaar", "Bank passbook", "Income proof"], popular: true },
  "Resume Builder": { time: "30 min", price: "Rs. 99", category: "student", icon: "file-user", docs: ["Education details", "Photo", "Experience"] },
  "Photocopy & Printing": { time: "Instant", price: "Rs. 2/page", category: "printing", icon: "printer", docs: ["Original document"], popular: true },
  "Color Printing": { time: "Instant", price: "Rs. 10/page", category: "printing", icon: "image", docs: ["Digital file"] },
  "Document Scanning": { time: "Instant", price: "Rs. 10/page", category: "printing", icon: "scan-line", docs: ["Original document"] },
  "Lamination": { time: "10 min", price: "Rs. 30", category: "printing", icon: "layers", docs: ["Document/card"] },
  "Logo Design": { time: "1-2 days", price: "Rs. 499", category: "design", icon: "pen-tool", docs: ["Brand name", "Style reference"], popular: true },
  "Flex Design": { time: "1-2 days", price: "Rs. 299", category: "design", icon: "image", docs: ["Text", "Size", "Logo/photo"] },
  "Visiting Card": { time: "1-2 days", price: "Rs. 199", category: "design", icon: "contact", docs: ["Name", "Phone", "Logo"], popular: true },
  "Banner Design": { time: "1-2 days", price: "Rs. 299", category: "design", icon: "panel-top", docs: ["Offer text", "Size", "Photos"] },
  "Social Media Post": { time: "Same day", price: "Rs. 149", category: "design", icon: "share-2", docs: ["Offer text", "Logo", "Photo"] },
  "PM Kisan": { time: "Same day", price: "Rs. 99", category: "government", icon: "sprout", docs: ["Aadhaar", "Land details", "Bank details"], popular: true },
  "Pension": { time: "7-15 days", price: "Rs. 149", category: "government", icon: "hand-coins", docs: ["Aadhaar", "Bank passbook", "Photo"] },
  "Insurance": { time: "1-3 days", price: "Rs. 99 + Premium", category: "government", icon: "shield", docs: ["Aadhaar", "Nominee details"], recent: true },
  "Banking": { time: "Same day", price: "Rs. 20", category: "csc", icon: "landmark", docs: ["Aadhaar", "Mobile number"], popular: true },
  "Recharge & Bills": { time: "Instant", price: "Rs. 10 + Bill", category: "csc", icon: "smartphone-charging", docs: ["Consumer/account number"], popular: true }
};

function setupEnterpriseServiceExperience() {
  const page = getCurrentPage();
  const isDetailPage = page.startsWith("service-");
  const isServiceExperiencePage = isDetailPage || enterpriseServicePages.has(page);
  const sections = [...document.querySelectorAll("[data-edupoint-service-carousel], .services-catalog-section, #service-options, .related-services-section")];
  const cards = enterpriseServiceCards();

  if (!isServiceExperiencePage && !cards.length) return;

  document.body.classList.add("enterprise-service-experience");
  if (isDetailPage) document.body.classList.add("enterprise-service-detail-page");

  cards.forEach(upgradeEnterpriseServiceCard);
  sections.forEach(enhanceEnterpriseServiceSection);

  if (isServiceExperiencePage) {
    injectEnterpriseTrustBand(isDetailPage);
    injectEnterpriseComparisonTable(isDetailPage);
    injectEnterpriseStickyActions(isDetailPage);
  }
  if (isDetailPage) {
    injectEnterpriseDetailCommand();
    setupEnterpriseServiceDetailExperience();
  }

  setupServiceCtas();
  hydrateCatalogPriceLabels(window.websiteCatalogCache);
  setupLucide();
}

function enterpriseServiceCards() {
  return [
    ...document.querySelectorAll("[data-edupoint-service-card], .services-carousel-track .service-option-card, .service-options-grid .service-option-card, .related-services-grid .service-option-card, .related-services-section .service-option-card, .rs-track .service-option-card")
  ].filter((card, index, list) => list.indexOf(card) === index);
}

function enterpriseCardTitle(card) {
  const heading = card.querySelector("h3")?.textContent?.trim() || "";
  const explicit = card.querySelector(".btn-service-select[data-service]")?.dataset.service || card.dataset.service || "";
  return heading || explicit || "One Point Service";
}

function enterpriseCardServiceKey(card) {
  return card.querySelector(".btn-service-select[data-service]")?.dataset.service
    || card.dataset.service
    || enterpriseCardTitle(card);
}

function enterpriseCardDescription(card, title) {
  const text = card.querySelector("p")?.textContent?.trim();
  if (text) return text;
  const profile = enterpriseServiceProfile(title, card);
  return profile.category === "government"
    ? "Operator-assisted application, document verification, payment guidance and live tracking support."
    : "Premium local service support with WhatsApp updates, clear pricing and guided delivery.";
}

function enterpriseServiceProfile(title, card) {
  const cleanTitle = String(title || "").trim();
  const fallback = enterpriseServiceFallbacks[cleanTitle] || {};
  const categories = `${card?.dataset?.edupointCategories || ""} ${fallback.category || ""}`.toLowerCase();
  const href = card?.getAttribute?.("href") || card?.querySelector?.("a[href]")?.getAttribute("href") || "";
  const text = `${cleanTitle} ${categories} ${href}`.toLowerCase();
  const category = fallback.category
    || (/(gst|msme|signature|fssai|shop|iec|trademark|company|business|proserve)/.test(text) ? "business" : "")
    || (/(exam|admit|result|scholarship|resume|student|edu)/.test(text) ? "student" : "")
    || (/(print|scan|lamination|photocopy|color)/.test(text) ? "printing" : "")
    || (/(design|logo|banner|visiting|social|flex)/.test(text) ? "design" : "")
    || (/(travel|ticket|hotel|tour)/.test(text) ? "travel" : "")
    || (/(csc|banking|recharge|bill|pension|insurance|kisan)/.test(text) ? "csc" : "")
    || (/(pan|ayushman|voter|passport|certificate|police|government|govt)/.test(text) ? "government" : "digital");
  const government = category === "government" || category === "csc" || /(govt|government|certificate|pan|ayushman|voter|passport|police|kisan|pension)/.test(text);
  const price = servicePricingFor(cleanTitle);
  const priceLabel = (price?.displayPrice && price.displayPrice !== MASTER_PRICE_PLACEHOLDER)
    ? price.displayPrice
    : (fallback.price || "Starts after review");
  const rawTime = card?.querySelector?.(".service-card-badges .tag:not(.price-tag), .tag:not(.price-tag)")?.textContent?.trim();
  const time = fallback.time || rawTime || (/instant|download|print|scan|recharge/.test(text) ? "Instant" : "1-3 days");
  return {
    title: cleanTitle,
    category,
    categoryLabel: enterpriseCategoryLabel(category),
    government,
    popular: fallback.popular || categories.includes("popular") || /(popular|pan|ayushman|gst|admit|logo|banking|recharge)/.test(text),
    recent: fallback.recent || categories.includes("recent") || /(new|recent|insurance|birth)/.test(text),
    icon: fallback.icon || serviceIcons[cleanTitle] || (government ? "shield-check" : "sparkles"),
    time,
    priceLabel,
    govFeeLabel: government ? "As per official portal" : (/travel|ticket|booking|bill|recharge/.test(text) ? "Actual amount" : "If applicable"),
    serviceChargeLabel: priceLabel,
    mode: /(print|scan|lamination|photocopy|banking|csc|typing|affidavit)/.test(text) ? "Offline assisted" : "Online + desk",
    eligibility: government
      ? "Applicant details must match ID and supporting documents."
      : category === "business"
        ? "Business owner or authorised representative details required."
        : category === "student"
          ? "Student registration, roll number or education details may be required."
          : "Basic customer details and service-specific inputs required.",
    timeline: time,
    docs: fallback.docs || ["Aadhaar Card", "DOB Proof", "Passport Size Photo", "Signature"],
    rating: government ? "4.9" : "4.8",
    popularity: fallback.popular || categories.includes("popular") ? "High demand" : "Steady demand"
  };
}

function enterpriseCategoryLabel(category) {
  const labels = {
    government: "Government",
    csc: "CSC Verified",
    business: "Business",
    student: "Student",
    printing: "Printing",
    design: "Design",
    travel: "Travel",
    digital: "Digital"
  };
  return labels[category] || "Verified";
}

function enterprisePriceNumber(label = "") {
  const value = amountFromDisplayPrice(label);
  return Number(String(value || "").replace(/,/g, "")) || 0;
}

function enterprisePrimaryHref(card, title, profile) {
  const href = card.getAttribute("href") || card.querySelector("a[href]")?.getAttribute("href") || "";
  if (href && href !== "#") return href;
  return serviceApplyHref(title, profile.category);
}

function enterpriseActionMarkup(tagName, href, className, label, iconName, extraAttrs = "") {
  if (tagName === "span") {
    return `<span class="${className}" role="button" tabindex="-1" ${extraAttrs}>${icon(iconName, 14)} ${label}</span>`;
  }
  return `<a class="${className}" href="${href}" ${extraAttrs}>${icon(iconName, 14)} ${label}</a>`;
}

function upgradeEnterpriseServiceCard(card) {
  if (!card || card.dataset.enterpriseUpgraded === "true") return;
  const title = enterpriseCardTitle(card);
  const serviceKey = enterpriseCardServiceKey(card);
  const description = enterpriseCardDescription(card, title);
  const profile = enterpriseServiceProfile(serviceKey, card);
  const href = enterprisePrimaryHref(card, title, profile);
  const isLinkCard = card.tagName.toLowerCase() === "a";
  const actionTag = isLinkCard ? "span" : "a";

  card.dataset.enterpriseUpgraded = "true";
  card.dataset.enterpriseServiceCard = "true";
  card.dataset.enterpriseName = title;
  card.dataset.enterpriseCategory = profile.category;
  card.dataset.enterprisePopular = profile.popular ? "true" : "false";
  card.dataset.enterpriseGovernment = profile.government ? "true" : "false";
  card.dataset.enterpriseRecent = profile.recent ? "true" : "false";
  card.dataset.enterprisePrice = String(enterprisePriceNumber(profile.priceLabel));
  card.dataset.enterpriseTime = profile.time;
  card.dataset.enterpriseMode = profile.mode.toLowerCase().includes("offline") ? "offline" : "online";
  card.dataset.enterpriseDocs = String(profile.docs.length);
  card.dataset.enterpriseDescription = description;
  card.dataset.enterpriseEligibility = profile.eligibility;
  card.dataset.enterpriseGovFee = profile.govFeeLabel;
  card.dataset.enterpriseServiceCharge = profile.serviceChargeLabel;
  card.dataset.enterpriseRating = profile.rating;
  card.dataset.enterpriseHref = href;
  card.classList.add("enterprise-service-card");
  card.setAttribute("aria-label", `${title} service. ${profile.time}. ${profile.priceLabel}.`);
  if (isLinkCard && href) card.setAttribute("href", href);

  card.innerHTML = `
    <div class="esc-card-glow" aria-hidden="true"></div>
    <div class="esc-topline">
      <span class="service-icon esc-icon">${icon(profile.icon, 22)}</span>
      <span class="esc-rating">${icon("star", 13)} ${profile.rating}</span>
    </div>
    <div class="esc-badge-row">
      <span class="esc-badge esc-badge-verified">${icon(profile.government ? "landmark" : "badge-check", 13)} Verified</span>
      ${profile.popular ? `<span class="esc-badge esc-badge-popular">${icon("flame", 13)} Popular</span>` : ""}
      <span class="esc-badge esc-badge-mode">${icon(profile.mode.includes("Offline") ? "store" : "wifi", 13)} ${escapeOption(profile.mode)}</span>
    </div>
    <h3>${escapeOption(title)}</h3>
    <p>${escapeOption(description)}</p>
    <div class="esc-meta-grid">
      <span>${icon("clock-3", 14)} <strong>${escapeOption(profile.time)}</strong><small>Processing time</small></span>
      <span>${icon("wallet-cards", 14)} <strong class="price-tag" data-pricing-slot data-service="${escapeOption(serviceKey)}">${escapeOption(profile.priceLabel)}</strong><small>Starting price</small></span>
    </div>
    <div class="esc-fee-grid">
      <span>${icon("landmark", 14)} <strong>${escapeOption(profile.govFeeLabel)}</strong><small>Government fee</small></span>
      <span>${icon("receipt", 14)} <strong>${escapeOption(profile.serviceChargeLabel)}</strong><small>Service charge</small></span>
    </div>
    <div class="esc-requirements">
      <div class="esc-requirements-summary">
        ${icon("user-check", 14)}
        <span><small>Requirements</small>${escapeOption(profile.eligibility)}</span>
      </div>
      <details class="esc-doc-details">
        <summary>${icon("files", 13)} <span>${profile.docs.length} documents</span><span class="esc-doc-toggle">View</span></summary>
        <ul class="esc-doc-mini" aria-label="Required document highlights">
          ${profile.docs.slice(0, 3).map((item) => `<li>${icon("check", 12)} ${escapeOption(item)}</li>`).join("")}
        </ul>
      </details>
    </div>
    <div class="card-actions esc-actions">
      ${enterpriseActionMarkup(actionTag, href, "btn btn-primary btn-service-select", "Apply", "arrow-right", `data-service="${escapeOption(serviceKey)}"`)}
      ${enterpriseActionMarkup(actionTag, "track-application.html", "btn btn-soft", "Track", "search-check", `data-enterprise-action-href="track-application.html"`)}
      <span class="esc-tool" role="button" tabindex="0" data-enterprise-preview>${icon("eye", 14)} Preview</span>
      <span class="esc-tool" role="button" tabindex="0" data-enterprise-compare>${icon("git-compare", 14)} Compare</span>
      <span class="esc-tool esc-tool-icon" role="button" tabindex="0" aria-label="Save ${escapeOption(title)} to wishlist" data-enterprise-wishlist>${icon("heart", 14)}</span>
    </div>
  `;
}

function enhanceEnterpriseServiceSection(section) {
  if (!section || section.dataset.enterpriseSection === "true") return;
  const cards = [...section.querySelectorAll("[data-enterprise-service-card]")];
  if (!cards.length) return;
  const isHomepage = document.body.id === "homepage-body";
  const showAllServices = section.dataset.enterpriseShowAll === "true";
  const autoRotateCards = section.dataset.autoRotateCards === "true";

  section.dataset.enterpriseSection = "true";
  section.classList.add("enterprise-services-section");
  const sectionHead = section.querySelector(".section-head, .edupoint-trending-head") || section.firstElementChild;
  const originalFilters = section.querySelector("[data-edupoint-service-filters], .category-filters");
  const carouselContainer = section.querySelector(".services-carousel-container, .service-options-grid, .related-source-card-grid, .rs-wrap");
  let viewAllButton = section.querySelector("[data-edupoint-view-all]");
  const usesNativeCarouselToggle = Boolean(viewAllButton);
  if (originalFilters) originalFilters.classList.add("enterprise-legacy-filters");
  if (carouselContainer) carouselContainer.classList.add("enterprise-catalog-results");

  if (!isHomepage && !viewAllButton && cards.length > 3 && !showAllServices) {
    viewAllButton = document.createElement("button");
    viewAllButton.className = "btn btn-soft edupoint-view-all-btn";
    viewAllButton.type = "button";
    viewAllButton.setAttribute("aria-expanded", "false");
    viewAllButton.innerHTML = `<span>View All</span> ${icon("arrow-right", 16)}`;
  }

  const shell = document.createElement("div");
  shell.className = "enterprise-catalog-shell";
  const sidebar = document.createElement("aside");
  sidebar.className = "enterprise-filter-sidebar";
  sidebar.id = `enterprise-filter-panel-${document.querySelectorAll(".enterprise-filter-sidebar").length + 1}`;
  sidebar.setAttribute("aria-label", "Service catalog filters");
  const content = document.createElement("div");
  content.className = "enterprise-catalog-content";
  const preview = document.createElement("aside");
  preview.className = "enterprise-preview-panel";
  preview.setAttribute("aria-live", "polite");
  preview.hidden = true;

  const dock = document.createElement("div");
  dock.className = "enterprise-filter-dock";
  dock.innerHTML = `
    <div class="efd-head">
      <span>${icon("sliders-horizontal", 17)} Filters</span>
      <button type="button" data-enterprise-close-filters aria-label="Close filters">${icon("x", 16)}</button>
    </div>
    <div class="efd-search">
      ${icon("search", 17)}
      <input type="search" placeholder="Search services" aria-label="Search services, documents and categories" data-enterprise-search>
    </div>
    <label class="efd-field"><span>Category</span>
    <select aria-label="Filter by category" data-enterprise-category>
      <option value="all">All categories</option>
      <option value="government">Government / CSC</option>
      <option value="business">Business</option>
      <option value="student">Student</option>
      <option value="printing">Printing</option>
      <option value="design">Design</option>
      <option value="travel">Travel</option>
      <option value="digital">Digital</option>
    </select>
    </label>
    <label class="efd-field"><span>Price</span>
    <select aria-label="Filter by price" data-enterprise-price>
      <option value="all">All prices</option>
      <option value="under-100">Under Rs. 100</option>
      <option value="under-500">Under Rs. 500</option>
      <option value="above-500">Above Rs. 500</option>
    </select>
    </label>
    <label class="efd-field"><span>Processing Time</span>
    <select aria-label="Filter by processing time" data-enterprise-time>
      <option value="all">Any timeline</option>
      <option value="instant">Instant / same day</option>
      <option value="week">Within 7 days</option>
      <option value="long">Longer process</option>
    </select>
    </label>
    <label class="efd-field"><span>Required Documents</span>
    <select aria-label="Filter by document requirement" data-enterprise-docs>
      <option value="all">Any checklist</option>
      <option value="light">1-2 documents</option>
      <option value="standard">3 documents</option>
      <option value="detailed">4+ documents</option>
    </select>
    </label>
    <label class="efd-field"><span>Online / Offline</span>
    <select aria-label="Filter by delivery mode" data-enterprise-mode>
      <option value="all">Any mode</option>
      <option value="online">Online + desk</option>
      <option value="offline">Offline assisted</option>
    </select>
    </label>
    <label class="efd-field"><span>Sort</span>
    <select aria-label="Sort services" data-enterprise-sort>
      <option value="popular">Sort: Popular first</option>
      <option value="price-low">Price: Low to high</option>
      <option value="time-fast">Fastest turnaround</option>
      <option value="rating">Rating</option>
    </select>
    </label>
    <div class="efd-switches">
      <label><input type="checkbox" data-enterprise-gov> Government Services</label>
      <label><input type="checkbox" data-enterprise-popular> Popular</label>
      <label><input type="checkbox" data-enterprise-recent> New</label>
    </div>
  `;
  if (!isHomepage) {
    dock.querySelectorAll("[data-enterprise-price], [data-enterprise-time], [data-enterprise-docs], [data-enterprise-sort]").forEach((control) => {
      control.closest(".efd-field")?.remove();
    });
    cards.forEach((card) => card.querySelector("[data-enterprise-compare]")?.remove());
  }
  sidebar.appendChild(dock);

  const mobileToggle = document.createElement("button");
  mobileToggle.className = "enterprise-mobile-filter-toggle";
  mobileToggle.type = "button";
  mobileToggle.setAttribute("aria-expanded", "false");
  mobileToggle.setAttribute("aria-controls", sidebar.id);
  mobileToggle.innerHTML = `${icon("sliders-horizontal", 16)} ${isHomepage ? "Filters & Sort" : "Filters"}`;

  const resultsStatus = document.createElement("span");
  resultsStatus.className = "sr-only";
  resultsStatus.setAttribute("role", "status");
  resultsStatus.setAttribute("aria-live", "polite");

  const empty = document.createElement("div");
  empty.className = "enterprise-empty-state";
  empty.setAttribute("role", "status");
  empty.innerHTML = `${icon("search-x", 24)} <strong>No matching service found</strong><span>Try removing a filter or searching a shorter term.</span>`;
  empty.hidden = true;

  if (carouselContainer) {
    carouselContainer.insertAdjacentElement("beforebegin", shell);
    shell.appendChild(mobileToggle);
    shell.appendChild(resultsStatus);
    shell.appendChild(sidebar);
    shell.appendChild(content);
    shell.appendChild(preview);
    content.appendChild(carouselContainer);
  } else if (sectionHead && sectionHead.parentNode === section) {
    sectionHead.insertAdjacentElement("afterend", shell);
    shell.appendChild(mobileToggle);
    shell.appendChild(resultsStatus);
    shell.appendChild(sidebar);
    shell.appendChild(content);
    shell.appendChild(preview);
  } else {
    section.prepend(shell);
    shell.appendChild(mobileToggle);
    shell.appendChild(resultsStatus);
    shell.appendChild(sidebar);
    shell.appendChild(content);
    shell.appendChild(preview);
  }
  content.appendChild(empty);

  if (!isHomepage && viewAllButton) {
    viewAllButton.classList.add("enterprise-catalog-view-all");
    content.insertAdjacentElement("beforebegin", viewAllButton);
  }

  const compare = isHomepage ? document.createElement("div") : null;
  if (compare) {
    compare.className = "enterprise-compare-panel";
    compare.setAttribute("aria-live", "polite");
    content.appendChild(compare);
  }

  const controls = {
    search: dock.querySelector("[data-enterprise-search]"),
    category: dock.querySelector("[data-enterprise-category]"),
    price: dock.querySelector("[data-enterprise-price]"),
    time: dock.querySelector("[data-enterprise-time]"),
    docs: dock.querySelector("[data-enterprise-docs]"),
    mode: dock.querySelector("[data-enterprise-mode]"),
    sort: dock.querySelector("[data-enterprise-sort]"),
    gov: dock.querySelector("[data-enterprise-gov]"),
    popular: dock.querySelector("[data-enterprise-popular]"),
    recent: dock.querySelector("[data-enterprise-recent]")
  };
  const state = { compareCards: [], previewCard: null };
  let carouselOffset = 0;
  let carouselPaused = false;
  let carouselVisibleCards = [];
  let carouselFilterActive = false;
  const carouselCardLimit = () => window.matchMedia("(min-width: 1200px)").matches
    ? 3
    : (window.matchMedia("(min-width: 720px)").matches ? 2 : 1);
  const syncCardStates = (visibleCards) => {
    state.compareCards = state.compareCards.filter((card) => visibleCards.includes(card));
    renderEnterpriseCompare(compare, state.compareCards);

    if (state.previewCard && visibleCards.includes(state.previewCard)) {
      renderEnterprisePreview(state.previewCard, preview);
      preview.hidden = false;
    } else {
      state.previewCard = null;
      preview.hidden = true;
      cards.forEach((card) => card.classList.remove("enterprise-preview-active"));
    }

    cards.forEach((card) => {
      const previewControl = card.querySelector("[data-enterprise-preview]");
      const compareControl = card.querySelector("[data-enterprise-compare]");
      previewControl?.setAttribute("aria-pressed", state.previewCard === card ? "true" : "false");
      compareControl?.classList.toggle("is-selected", state.compareCards.includes(card));
      compareControl?.setAttribute("aria-pressed", state.compareCards.includes(card) ? "true" : "false");
    });

    const countLabel = `${visibleCards.length} service${visibleCards.length === 1 ? "" : "s"} available`;
    resultsStatus.textContent = countLabel;
    mobileToggle.setAttribute("aria-label", `${isHomepage ? "Filters and sort" : "Filters"}. ${countLabel}`);
  };
  const apply = () => {
    const visibleCards = applyEnterpriseFilters(section, cards, controls, empty);
    if (!isHomepage) {
      const expanded = showAllServices || section.classList.contains("is-expanded");
      const hasActiveFilter = Boolean(
        controls.search?.value.trim()
        || (controls.category?.value && controls.category.value !== "all")
        || (controls.mode?.value && controls.mode.value !== "all")
        || controls.gov?.checked
        || controls.popular?.checked
        || controls.recent?.checked
      );
      const cardLimit = carouselCardLimit();
      const carouselActive = autoRotateCards && !expanded && !hasActiveFilter && visibleCards.length > cardLimit;
      if (carouselActive) carouselOffset %= visibleCards.length;
      else carouselOffset = 0;
      const carouselWindow = carouselActive
        ? Array.from({ length: cardLimit }, (_, index) => visibleCards[(carouselOffset + index) % visibleCards.length])
        : [];
      cards.forEach((card) => {
        const visibleIndex = visibleCards.indexOf(card);
        const carouselIndex = carouselWindow.indexOf(card);
        const cardIsVisible = visibleIndex >= 0 && (expanded || (carouselActive ? carouselIndex >= 0 : visibleIndex < cardLimit));
        card.classList.toggle("is-visible", cardIsVisible);
        card.style.order = String(carouselActive && carouselIndex >= 0 ? carouselIndex : Math.max(0, visibleIndex));
      });
      carouselVisibleCards = visibleCards;
      carouselFilterActive = hasActiveFilter;
      section.dataset.enterpriseFilterActive = hasActiveFilter ? "true" : "false";
      section.dataset.enterpriseCarouselActive = carouselActive ? "true" : "false";
    }
    syncCardStates(visibleCards);
  };
  controls.search?.addEventListener("input", apply);
  Object.entries(controls).forEach(([name, control]) => {
    if (name !== "search") control?.addEventListener("change", apply);
  });

  if (!isHomepage && viewAllButton) {
    if (!usesNativeCarouselToggle) {
      viewAllButton.addEventListener("click", () => {
        const expanded = !section.classList.contains("is-expanded");
        section.classList.toggle("is-expanded", expanded);
        if (!expanded) carouselOffset = 0;
        viewAllButton.setAttribute("aria-expanded", expanded ? "true" : "false");
        const label = viewAllButton.querySelector("span");
        if (label) label.textContent = expanded ? "Show Less" : "View All";
        apply();
      });
      if ("IntersectionObserver" in window && section.dataset.persistViewToggle !== "true") {
        const collapseObserver = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => !entry.isIntersecting) || !section.classList.contains("is-expanded")) return;
          section.classList.remove("is-expanded");
          viewAllButton.setAttribute("aria-expanded", "false");
          const label = viewAllButton.querySelector("span");
          if (label) label.textContent = "View All";
          apply();
        }, { threshold: 0.04 });
        collapseObserver.observe(section);
      }
    } else {
      viewAllButton.addEventListener("click", () => requestAnimationFrame(apply));
    }
  }

  const compactFilters = window.matchMedia("(max-width: 900px)");
  const closeFilters = ({ restoreFocus = false } = {}) => {
    section.classList.remove("enterprise-filters-open");
    mobileToggle.setAttribute("aria-expanded", "false");
    if (!document.querySelector(".enterprise-services-section.enterprise-filters-open")) {
      document.body.classList.remove("enterprise-filter-drawer-open");
    }
    if (compactFilters.matches) {
      sidebar.setAttribute("aria-hidden", "true");
      sidebar.setAttribute("inert", "");
    }
    if (restoreFocus) mobileToggle.focus({ preventScroll: true });
  };
  const syncFilterMode = () => {
    if (!compactFilters.matches) {
      section.classList.remove("enterprise-filters-open");
      document.body.classList.remove("enterprise-filter-drawer-open");
      mobileToggle.setAttribute("aria-expanded", "false");
      sidebar.setAttribute("aria-hidden", "false");
      sidebar.removeAttribute("inert");
      return;
    }
    const open = section.classList.contains("enterprise-filters-open");
    sidebar.setAttribute("aria-hidden", open ? "false" : "true");
    sidebar.toggleAttribute("inert", !open);
  };
  mobileToggle.addEventListener("click", () => {
    const open = !section.classList.contains("enterprise-filters-open");
    section.classList.toggle("enterprise-filters-open", open);
    mobileToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("enterprise-filter-drawer-open", open);
    syncFilterMode();
    if (open) {
      requestAnimationFrame(() => dock.querySelector("[data-enterprise-close-filters]")?.focus({ preventScroll: true }));
    }
  });
  dock.querySelector("[data-enterprise-close-filters]")?.addEventListener("click", () => {
    closeFilters({ restoreFocus: true });
  });
  setupEnterpriseCardInteractions(section, cards, preview, compare, state);
  renderEnterpriseCompare(compare, state.compareCards);
  document.addEventListener("pointerdown", (event) => {
    if (!compactFilters.matches || !section.classList.contains("enterprise-filters-open")) return;
    if (sidebar.contains(event.target) || mobileToggle.contains(event.target)) return;
    closeFilters();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && section.classList.contains("enterprise-filters-open")) {
      closeFilters({ restoreFocus: true });
    }
  });
  if (compactFilters.addEventListener) compactFilters.addEventListener("change", syncFilterMode);
  else compactFilters.addListener(syncFilterMode);
  if (autoRotateCards) {
    const rotationInterval = Math.max(3000, Number(section.dataset.autoRotateInterval) || 4500);
    const rotationSurface = carouselContainer || content;
    rotationSurface?.addEventListener("mouseenter", () => { carouselPaused = true; });
    rotationSurface?.addEventListener("mouseleave", () => { carouselPaused = false; });
    rotationSurface?.addEventListener("focusin", () => { carouselPaused = true; });
    rotationSurface?.addEventListener("focusout", () => { carouselPaused = false; });
    window.addEventListener("resize", () => {
      carouselOffset = 0;
      apply();
    }, { passive: true });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.setInterval(() => {
        const cardLimit = carouselCardLimit();
        if (
          carouselPaused
          || document.hidden
          || section.classList.contains("is-expanded")
          || carouselFilterActive
          || carouselVisibleCards.length <= cardLimit
        ) return;
        carouselOffset = (carouselOffset + cardLimit) % carouselVisibleCards.length;
        apply();
      }, rotationInterval);
    }
  }
  syncFilterMode();
  apply();
}

function setupEnterpriseCardInteractions(section, cards, preview, compare, state) {
  cards.forEach((card) => {
    const showPreview = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const isActive = state.previewCard === card && !preview.hidden;
      state.previewCard = isActive ? null : card;
      cards.forEach((item) => item.classList.toggle("enterprise-preview-active", !isActive && item === card));
      cards.forEach((item) => item.querySelector("[data-enterprise-preview]")?.setAttribute("aria-pressed", state.previewCard === item ? "true" : "false"));
      if (isActive) {
        preview.hidden = true;
        return;
      }
      renderEnterprisePreview(card, preview);
      preview.hidden = false;
      if (window.matchMedia("(max-width: 1280px)").matches) {
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
        requestAnimationFrame(() => preview.scrollIntoView({ behavior, block: "nearest" }));
      }
    };
    card.querySelector("[data-enterprise-preview]")?.addEventListener("click", showPreview);
    card.querySelector("[data-enterprise-preview]")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") showPreview(event);
    });
    card.querySelector("[data-enterprise-compare]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleEnterpriseCompare(card, compare, state);
    });
    card.querySelector("[data-enterprise-compare]")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      toggleEnterpriseCompare(card, compare, state);
    });
    card.querySelector("[data-enterprise-wishlist]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      card.classList.toggle("enterprise-wishlisted");
      event.currentTarget.setAttribute("aria-pressed", card.classList.contains("enterprise-wishlisted") ? "true" : "false");
    });
    card.querySelector("[data-enterprise-wishlist]")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      card.classList.toggle("enterprise-wishlisted");
      event.currentTarget.setAttribute("aria-pressed", card.classList.contains("enterprise-wishlisted") ? "true" : "false");
    });
    card.querySelectorAll("[data-enterprise-action-href]").forEach((action) => {
      action.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = action.dataset.enterpriseActionHref;
      });
    });
  });
}

function toggleEnterpriseCompare(card, compare, state) {
  const exists = state.compareCards.includes(card);
  state.compareCards = exists
    ? state.compareCards.filter((item) => item !== card)
    : [...state.compareCards.filter((item) => item.isConnected), card].slice(-2);
  document.querySelectorAll("[data-enterprise-compare]").forEach((control) => {
    const owner = control.closest("[data-enterprise-service-card]");
    control.classList.toggle("is-selected", state.compareCards.includes(owner));
    control.setAttribute("aria-pressed", state.compareCards.includes(owner) ? "true" : "false");
  });
  renderEnterpriseCompare(compare, state.compareCards);
}

function renderEnterprisePreview(card, preview) {
  if (!preview || !card) return;
  const title = card.dataset.enterpriseName || enterpriseCardTitle(card);
  const docs = [...card.querySelectorAll(".esc-doc-mini li")].map((li) => li.textContent.trim()).slice(0, 4);
  preview.innerHTML = `
    <div class="epv-card">
      <span class="epv-kicker">${icon("eye", 15)} Quick Preview</span>
      <h3>${escapeOption(title)}</h3>
      <p>${escapeOption(card.dataset.enterpriseDescription || enterpriseCardDescription(card, title))}</p>
      <div class="epv-metrics">
        <span><small>Timeline</small><strong>${escapeOption(card.dataset.enterpriseTime || "1-3 days")}</strong></span>
        <span><small>Fees</small><strong>${escapeOption(card.dataset.enterpriseServiceCharge || "Confirmed before payment")}</strong></span>
      </div>
      <div class="epv-fees">
        <span>${icon("landmark", 14)} Govt fee: <strong>${escapeOption(card.dataset.enterpriseGovFee || "If applicable")}</strong></span>
        <span>${icon("receipt", 14)} Service charge: <strong>${escapeOption(card.dataset.enterpriseServiceCharge || "Catalog based")}</strong></span>
      </div>
      <div class="epv-docs">
        <strong>${icon("files", 15)} Required documents</strong>
        <ul>${docs.map((doc) => `<li>${escapeOption(doc)}</li>`).join("")}</ul>
      </div>
      <div class="epv-eligibility">
        <strong>${icon("user-check", 15)} Eligibility</strong>
        <p>${escapeOption(card.dataset.enterpriseEligibility || "Operator confirms details before submission.")}</p>
      </div>
      <div class="epv-actions">
        <a class="btn btn-primary" href="${card.dataset.enterpriseHref || card.getAttribute("href") || "#"}">${icon("arrow-right", 14)} Apply</a>
        <a class="btn btn-soft" href="track-application.html">${icon("search-check", 14)} Track</a>
      </div>
    </div>
  `;
  setupLucide();
}

function renderEnterpriseCompare(compare, cards = []) {
  if (!compare) return;
  const selected = cards.filter(Boolean).slice(0, 2);
  if (!selected.length) {
    compare.hidden = false;
    compare.innerHTML = `
      <div class="ecp-empty">
        ${icon("git-compare", 18)}
        <strong>Compare services visually</strong>
        <span>Select Compare on up to two cards to review fees, timeline, documents and eligibility side by side.</span>
      </div>
    `;
    setupLucide();
    return;
  }
  compare.hidden = false;
  compare.innerHTML = `
    <div class="ecp-head">
      <span>${icon("git-compare", 18)} Comparison</span>
      <small>${selected.length}/2 selected</small>
    </div>
    <div class="ecp-grid">
      ${selected.map((card) => `
        <article>
          <h4>${escapeOption(card.dataset.enterpriseName || "Service")}</h4>
          <dl>
            <div><dt>Price</dt><dd>${escapeOption(card.dataset.enterpriseServiceCharge || "Catalog based")}</dd></div>
            <div><dt>Govt fee</dt><dd>${escapeOption(card.dataset.enterpriseGovFee || "If applicable")}</dd></div>
            <div><dt>Timeline</dt><dd>${escapeOption(card.dataset.enterpriseTime || "1-3 days")}</dd></div>
            <div><dt>Documents</dt><dd>${escapeOption(card.dataset.enterpriseDocs || "3")} item checklist</dd></div>
            <div><dt>Eligibility</dt><dd>${escapeOption(card.dataset.enterpriseEligibility || "Operator confirmed")}</dd></div>
          </dl>
        </article>
      `).join("")}
    </div>
  `;
  setupLucide();
}

function applyEnterpriseFilters(section, cards, controls, empty) {
  const term = (controls.search?.value || "").trim().toLowerCase();
  const category = controls.category?.value || "all";
  const price = controls.price?.value || "all";
  const time = controls.time?.value || "all";
  const docs = controls.docs?.value || "all";
  const mode = controls.mode?.value || "all";
  const sort = controls.sort?.value || "popular";
  const governmentOnly = Boolean(controls.gov?.checked);
  const popularOnly = Boolean(controls.popular?.checked);
  const recentOnly = Boolean(controls.recent?.checked);

  const visibleCards = [];
  cards.forEach((card) => {
    const priceNumber = Number(card.dataset.enterprisePrice || 0);
    const cardCategory = card.dataset.enterpriseCategory || "digital";
    const isGovernment = card.dataset.enterpriseGovernment === "true";
    const isPopular = card.dataset.enterprisePopular === "true";
    const isRecent = card.dataset.enterpriseRecent === "true";
    const docCount = Number(card.dataset.enterpriseDocs || 0);
    const cardMode = card.dataset.enterpriseMode || "online";
    const timeRank = enterpriseTimeRank(card);
    const timeText = `${card.dataset.enterpriseTime || ""}`.toLowerCase();
    const searchText = `${card.dataset.enterpriseName || ""} ${card.textContent || ""}`.toLowerCase();
    const priceMatches = price === "all"
      || (price === "under-100" && priceNumber > 0 && priceNumber < 100)
      || (price === "under-500" && priceNumber > 0 && priceNumber < 500)
      || (price === "above-500" && priceNumber >= 500);
    const categoryMatches = category === "all"
      || cardCategory === category
      || (category === "government" && (isGovernment || cardCategory === "csc"));
    const timeMatches = time === "all"
      || (time === "instant" && (/instant|same|10 min|15 min|20 min|30 min/.test(timeText) || timeRank <= 1))
      || (time === "week" && timeRank <= 7)
      || (time === "long" && timeRank > 7);
    const docsMatches = docs === "all"
      || (docs === "light" && docCount <= 2)
      || (docs === "standard" && docCount === 3)
      || (docs === "detailed" && docCount >= 4);
    const modeMatches = mode === "all" || cardMode === mode;
    const matches = (!term || searchText.includes(term))
      && categoryMatches
      && priceMatches
      && timeMatches
      && docsMatches
      && modeMatches
      && (!governmentOnly || isGovernment || cardCategory === "csc")
      && (!popularOnly || isPopular)
      && (!recentOnly || isRecent);
    card.classList.toggle("enterprise-hidden", !matches);
    if (matches) visibleCards.push(card);
  });

  const sorted = [...visibleCards].sort((a, b) => {
    if (sort === "price-low") return Number(a.dataset.enterprisePrice || 999999) - Number(b.dataset.enterprisePrice || 999999);
    if (sort === "time-fast") return enterpriseTimeRank(a) - enterpriseTimeRank(b);
    if (sort === "rating") return Number(b.dataset.enterpriseRating || 0) - Number(a.dataset.enterpriseRating || 0);
    return Number(b.dataset.enterprisePopular === "true") - Number(a.dataset.enterprisePopular === "true");
  });
  sorted.forEach((card, index) => {
    card.style.order = String(index);
  });
  section.classList.toggle("enterprise-has-empty", visibleCards.length === 0);
  if (empty) empty.hidden = visibleCards.length !== 0;
  return sorted;
}

function enterpriseTimeRank(card) {
  const text = (card.querySelector(".esc-meta-grid strong")?.textContent || "").toLowerCase();
  if (/instant|same|10 min|30 min/.test(text)) return 1;
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 99;
}

function enterpriseCurrentServiceName() {
  return currentPageServiceForPricing()
    || document.querySelector(".page-hero-title")?.textContent?.replace(/\.$/, "").trim()
    || document.title.replace(/\|.*/, "").trim()
    || "One Point Service";
}

function injectEnterpriseTrustBand(isDetailPage) {
  if (isDetailPage) return;
  if (document.querySelector(".enterprise-trust-band") || document.querySelector(".bos-trust-strip-grid") || document.body.classList.contains("page-business-setup") || document.querySelector(".bos-container")) return;
  const target = document.querySelector(".page-hero, .hero") || document.querySelector("main > section");
  if (!target) return;
  const band = document.createElement("section");
  band.className = "enterprise-trust-band";
  band.setAttribute("aria-label", "Service trust indicators");
  band.innerHTML = `
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-emerald">${icon("badge-check", 20)}</div>
      <div class="etb-content">
        <strong>Verified Process</strong>
        <span>Operator reviewed before submission</span>
      </div>
    </div>
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-blue">${icon("lock-keyhole", 20)}</div>
      <div class="etb-content">
        <strong>Secure Payment</strong>
        <span>Receipt and review flow</span>
      </div>
    </div>
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-purple">${icon("headphones", 20)}</div>
      <div class="etb-content">
        <strong>Live Support</strong>
        <span>WhatsApp + call assistance</span>
      </div>
    </div>
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-amber">${icon("star", 20)}</div>
      <div class="etb-content">
        <strong>4.9 Rating</strong>
        <span>Customer-rated desk</span>
      </div>
    </div>
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-indigo">${icon("activity", 20)}</div>
      <div class="etb-content">
        <strong>${window.siteStats?.processed?.raw || "12,000+"}</strong>
        <span>Applications completed</span>
      </div>
    </div>
  `;
  target.insertAdjacentElement(isDetailPage ? "afterend" : "afterend", band);
}

function injectEnterpriseDetailCommand() {
  if (document.querySelector(".enterprise-detail-command")) return;
  const hero = document.querySelector(".page-hero, .premium-service-hero");
  if (!hero) return;
  const serviceName = enterpriseCurrentServiceName();
  const primaryServiceOption = document.querySelector("main[data-primary-service-option]")?.dataset.primaryServiceOption?.trim() || "";
  const summaryServiceName = primaryServiceOption || serviceName;
  const summaryDescription = document.querySelector("main[data-primary-service-description]")?.dataset.primaryServiceDescription?.trim()
    || "Professional operator-assisted workflow with document verification, transparent pricing, secure payment handoff and live One Point status tracking.";
  const summaryApplyHref = primaryServiceOption
    ? `checkout.html?service=${encodeURIComponent(slugify(serviceName) || "general-support")}&service_name=${encodeURIComponent(serviceName)}&service_option=${encodeURIComponent(primaryServiceOption)}`
    : serviceApplyHref(serviceName, inferApplyCategory("", serviceName));
  const profile = enterpriseServiceProfile(serviceName, document.body);
  const price = servicePricingFor(serviceName);
  const priceLabel = price?.displayPrice && price.displayPrice !== MASTER_PRICE_PLACEHOLDER ? price.displayPrice : profile.priceLabel;
  const docs = enterpriseDetailDocs(serviceName, profile);
  const related = enterpriseDetailRelatedServices(serviceName, profile);
  const detail = document.createElement("section");
  detail.className = "enterprise-detail-command";
  detail.setAttribute("aria-label", `${summaryServiceName} enterprise service overview`);
  detail.innerHTML = `
    <nav class="edc-breadcrumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a><span>/</span><a href="services.html">Services</a><span>/</span><strong>${escapeOption(serviceName)}</strong>
    </nav>
    <div class="edc-layout">
      <div class="edc-main-stack">
        
        <!-- 1. Service Hero & Overview Card -->
        <article class="edc-summary">
          <div class="edc-summary-glow" aria-hidden="true"></div>
          <div class="edc-kicker-row">
            <span class="edc-kicker">${icon("badge-check", 14)} Assisted Digital Service</span>
            <span class="edc-kicker edc-kicker-soft">${icon("shield-check", 14)} Operator Assisted</span>
            <span class="edc-kicker edc-kicker-emerald">${icon("sparkles", 14)} Document Review Included</span>
          </div>
          <h2>${escapeOption(summaryServiceName)}</h2>
          <p>${escapeOption(summaryDescription)}</p>
          <div class="edc-price-row">
            <span class="edc-price-box-highlight">
              <small>Assistance Fee</small>
              <strong data-pricing-slot data-service="${escapeOption(serviceName)}">${escapeOption(priceLabel)}</strong>
            </span>
            <span>
              <small>Estimated Time</small>
              <strong>${escapeOption(profile.time)}</strong>
            </span>
            <span>
              <small>Assistance Mode</small>
              <strong>Online + Center Desk</strong>
            </span>
            <span>
              <small>Customer Rating</small>
              <strong>4.8 / 5.0 &starf;</strong>
            </span>
          </div>
          <div class="edc-actions-wrap">
            <div class="edc-actions">
              <a class="btn btn-primary btn-service-select edc-primary-action" href="${summaryApplyHref}" data-service="${escapeOption(serviceName)}"${primaryServiceOption ? ` data-voter-consent-option="${escapeOption(primaryServiceOption)}"` : ""}>${icon("file-text", 16)} Start Application</a>
              <a class="btn btn-ghost edc-secondary-action" href="#service-options">${icon("layout-grid", 16)} Choose Service Need</a>
            </div>
            <span class="edc-action-micro-hint">${icon("clock", 13)} Takes less than 2 minutes to start</span>
          </div>
        </article>

        <!-- 2. Why Use One Point Assistance? Trust Pillars -->
        <div class="edc-trust-section">
          <div class="edc-trust-section-head">
            <h3>Why use One Point assistance?</h3>
          </div>
          <div class="edc-trust-layer" aria-label="Service trust pillars">
            <div class="edc-trust-card">
              <div class="edc-trust-icon-circle">${icon("shield-check", 20)}</div>
              <strong>Secure Documents</strong>
              <small>256-bit protected handling</small>
            </div>
            <div class="edc-trust-card">
              <div class="edc-trust-icon-circle">${icon("user-check", 20)}</div>
              <strong>Assisted Filing</strong>
              <small>Pre-check before submission</small>
            </div>
            <div class="edc-trust-card">
              <div class="edc-trust-icon-circle">${icon("badge-percent", 20)}</div>
              <strong>Transparent Fees</strong>
              <small>No hidden assistance charges</small>
            </div>
            <div class="edc-trust-card">
              <div class="edc-trust-icon-circle">${icon("bell-ring", 20)}</div>
              <strong>Live Tracking</strong>
              <small>WhatsApp &amp; SMS updates</small>
            </div>
          </div>
        </div>

        <!-- 3. Merged Eligibility & Required Documents Card -->
        <article class="edc-panel edc-eligibility-docs-card">
          <div class="edc-two-col-grid">
            <div class="edc-col-block">
              <h3>${icon("user-check", 18)} Eligibility Criteria</h3>
              <ul class="edc-clean-list">
                <li><span class="edc-check-icon">${icon("check", 13)}</span> <div>${escapeOption(profile.eligibility || "Applicant details must match supporting documents.")}</div></li>
                <li><span class="edc-check-icon">${icon("check", 13)}</span> <div>Active mobile number for OTP verification.</div></li>
                <li><span class="edc-check-icon">${icon("check", 13)}</span> <div>Eligible for individual adults, minors, and firms as applicable.</div></li>
                <li><span class="edc-check-icon">${icon("check", 13)}</span> <div>Pre-submission operator review included for all files.</div></li>
              </ul>
            </div>
            <div class="edc-col-block">
              <div class="edc-section-header-row">
                <h3>${icon("files", 18)} Required Documents</h3>
                <span class="edc-badge-pill">${docs.length} Items</span>
              </div>
              <p class="edc-sub-hint">Accepted: PDF, JPG, PNG &bull; Max 5 MB per file</p>
              <ul class="edc-doc-checklist-clean">
                ${docs.map((doc, index) => `
                  <li>
                    <span class="edc-doc-req-tag ${index < 3 ? "is-required" : "is-optional"}">${index < 3 ? "Required" : "Optional"}</span>
                    <strong>${escapeOption(doc)}</strong>
                  </li>
                `).join("")}
              </ul>
            </div>
          </div>
        </article>

        <!-- 4. Consolidated Fee & Pricing Transparency Card -->
        <article class="edc-panel edc-pricing-transparency-card">
          <div class="edc-section-head">
            <span>${icon("wallet-cards", 18)} Fee &amp; Pricing Transparency</span>
            <strong>All-Inclusive Breakdown</strong>
          </div>
          <div class="edc-transparent-pricing-grid">
            <div class="edc-pricing-item">
              <small>Government / Portal Fee</small>
              <strong>${escapeOption(profile.govFeeLabel || "As per official portal")}</strong>
              <span>Official charges are paid as applicable.</span>
            </div>
            <div class="edc-pricing-item edc-pricing-highlight">
              <small>Our Assistance Fee</small>
              <strong data-pricing-slot data-service="${escapeOption(serviceName)}">${escapeOption(priceLabel)}</strong>
              <span>Operator review, filing &amp; tracking support.</span>
            </div>
            <div class="edc-pricing-item">
              <small>Taxes &amp; GST</small>
              <strong>Included</strong>
              <span>Handled transparently at checkout.</span>
            </div>
            <div class="edc-pricing-item">
              <small>Pre-Check Guarantee</small>
              <strong>100% Refund</strong>
              <span>Full refund if ineligible during pre-check.*</span>
            </div>
          </div>
          <p class="edc-pricing-statutory-note">
            ${icon("info", 14)} Government/portal charges, where applicable, are separate from One Point's assistance fee unless specifically stated.
          </p>
        </article>

        <!-- 5. Human-Friendly Application Stepper -->
        <article class="edc-timeline-card">
          <div class="edc-section-head">
            <span>${icon("workflow", 18)} Application Process Timeline</span>
            <strong class="edc-active-step-tag">Active Step: 02 Verification Desk</strong>
          </div>
          <div class="edc-timeline-stepper" aria-label="Application processing timeline">
            <div class="edc-step-item is-complete">
              <div class="edc-step-badge">${icon("check", 14)}</div>
              <span class="edc-step-label">Application Details</span>
            </div>
            <div class="edc-step-divider is-complete"></div>
            <div class="edc-step-item is-current">
              <div class="edc-step-badge">02</div>
              <span class="edc-step-label">Verification Desk</span>
            </div>
            <div class="edc-step-divider"></div>
            <div class="edc-step-item">
              <div class="edc-step-badge">03</div>
              <span class="edc-step-label">Portal Filing</span>
            </div>
            <div class="edc-step-divider"></div>
            <div class="edc-step-item">
              <div class="edc-step-badge">04</div>
              <span class="edc-step-label">Department Approval</span>
            </div>
            <div class="edc-step-divider"></div>
            <div class="edc-step-item">
              <div class="edc-step-badge">05</div>
              <span class="edc-step-label">Issued / Delivered</span>
            </div>
          </div>
        </article>
      </div>

      <!-- Right Sticky Summary & Conversion Sidebar -->
      <aside class="edc-sticky-panel" aria-label="Service summary and actions">
        <div class="edc-sticky-top">
          <span class="edc-kicker">${icon("clipboard-list", 14)} Your Service Summary</span>
          <h3>${escapeOption(summaryServiceName)}</h3>
          <p>Operator-assisted digital service</p>
        </div>

        <div class="edc-sticky-summary-box">
          <div class="edc-ssb-row">
            <span>Selected Service</span>
            <strong>${escapeOption(primaryServiceOption || summaryServiceName)}</strong>
          </div>
          <div class="edc-ssb-row">
            <span>Assistance Fee</span>
            <strong class="gold-price-txt" data-pricing-slot data-service="${escapeOption(summaryServiceName)}">${escapeOption(priceLabel)}</strong>
          </div>
          <div class="edc-ssb-row">
            <span>Govt./Portal Fee</span>
            <strong>As applicable</strong>
          </div>
          <div class="edc-ssb-row">
            <span>Estimated Time</span>
            <strong>${escapeOption(profile.time)}</strong>
          </div>
          <div class="edc-ssb-row">
            <span>Required Documents</span>
            <strong>${docs.length} items</strong>
          </div>
        </div>

        <div class="edc-sticky-actions">
          <a class="btn btn-primary font-bold edc-sticky-apply" href="${summaryApplyHref}" data-service="${escapeOption(summaryServiceName)}"${primaryServiceOption ? ` data-voter-consent-option="${escapeOption(primaryServiceOption)}"` : ""}>Get Assistance &rarr;</a>
          
          <div class="edc-sticky-quick-actions">
            <a class="edc-quick-action-btn" href="track-application.html">
              ${icon("search-check", 14)} Track Request
            </a>
            <a class="edc-quick-action-btn edc-quick-wa" href="${buildServiceWhatsAppUrl(summaryServiceName)}" target="_blank" rel="noopener">
              ${icon("message-circle", 14)} WhatsApp
            </a>
            <a class="edc-quick-action-btn edc-quick-call" href="tel:+919473946181">
              ${icon("phone", 14)} Call
            </a>
          </div>
        </div>

        <div class="edc-merged-support-strip">
          <div class="edc-support-strip-left">
            <span class="edc-desk-status-icon">${icon("shield-check", 16)}</span>
            <div>
              <strong>Need help? One Point Assistance Desk</strong>
              <small>Assisted operator team &bull; Lucknow</small>
            </div>
          </div>
        </div>

        <div class="edc-trust-strip-merged">
          <span>${icon("lock", 13)} Secure Payment</span>
          <span>&bull;</span>
          <span>${icon("check", 13)} Official Receipt Provided</span>
        </div>
      </aside>
    </div>
  `;
  hero.insertAdjacentElement("afterend", detail);
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function enterpriseDetailDocs(serviceName, profile) {
  const docs = serviceDocsFor(serviceName) || profile.docs || [];
  const normalized = docs.map((doc) => String(doc || "").trim()).filter(Boolean);
  return normalized.length ? normalized : ["Aadhaar Card", "DOB Proof", "Passport Size Photo", "Signature"];
}

function enterpriseDetailCode(serviceName = "") {
  const slug = normalizePricingLookup(serviceName || "service");
  const code = slug.split("-").map((part) => part[0] || "").join("").slice(0, 4).toUpperCase() || "SRV";
  return `OPDS-${new Date().getFullYear()}-${code}`;
}

function enterpriseDetailHash(value = "") {
  return String(value || "").split("").reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function enterpriseDetailRelatedServices(serviceName, profile) {
  const groups = {
    government: ["Aadhaar Services Assistance", "Passport Assistance", "Voter ID", "Income Tax Assistance", "Income Certificate", "Domicile Certificate", "Pension & Welfare Schemes", "Ayushman Card"],
    csc: ["Ayushman Card", "PM Kisan", "Pension Assistance", "Aadhaar Services Assistance", "Recharge & Bills"],
    business: ["GST Registration", "MSME Registration", "Digital Signature", "FSSAI License", "Shop License", "IEC Code", "Trademark Registration", "Company Registration"],
    printing: ["Photocopy & Printing", "Color Printing", "Document Scanning", "Lamination"],
    design: ["Logo Design", "Visiting Card", "Banner Design", "Social Media Creative"],
    travel: ["Passport Assistance", "Bus Ticket", "Flight Ticket", "Train Ticket Booking"],
    digital: ["Digital Signature", "Document Scanning", "Photocopy & Printing", "Aadhaar Services Assistance"]
  };
  const candidates = groups[profile.category] || groups.digital;
  const currentSlug = normalizePricingLookup(serviceName || "");
  return candidates
    .filter((title) => {
      const candidateSlug = normalizePricingLookup(title || "");
      return candidateSlug !== currentSlug && !serviceName.toLowerCase().includes(title.toLowerCase()) && serviceRoutes[title];
    })
    .slice(0, 3)
    .map((title) => {
      const candidateProfile = enterpriseServiceProfile(title, document.body);
      let iconKey = candidateProfile.icon || serviceIcons[title] || "file-text";
      if (title.includes("Aadhaar")) iconKey = "fingerprint";
      else if (title.includes("Passport")) iconKey = "plane";
      else if (title.includes("Voter")) iconKey = "vote";
      else if (title.includes("PAN")) iconKey = "credit-card";
      else if (title.includes("Income")) iconKey = "file-text";
      else if (title.includes("Ayushman")) iconKey = "heart-pulse";
      else if (title.includes("GST")) iconKey = "building-2";
      
      const price = servicePricingFor(title);
      const priceLabel = price?.displayPrice && price.displayPrice !== MASTER_PRICE_PLACEHOLDER ? price.displayPrice : (candidateProfile.priceLabel || "₹149");

      return {
        title,
        href: routeForService(title, "services.html"),
        icon: iconKey,
        time: candidateProfile.time || "Same day",
        price: priceLabel,
        desc: `${candidateProfile.time || "Same day"} - ${priceLabel}`
      };
    });
}

function setupEnterpriseServiceDetailExperience() {
  if (!getCurrentPage().startsWith("service-")) return;
  const serviceName = enterpriseCurrentServiceName();
  const profile = enterpriseServiceProfile(serviceName, document.body);
  enhanceEnterpriseDetailHero(serviceName, profile);
  enhanceEnterpriseDetailFaqSearch();
  enhanceEnterpriseDetailRelatedSections();
  setupEnterpriseDetailCtas(serviceName);
  setupLucide();
}

function enhanceEnterpriseDetailHero(serviceName, profile) {
  const hero = document.querySelector(".premium-service-hero, .page-hero-service");
  if (!hero || hero.dataset.enterpriseDetailHero === "true") return;
  hero.dataset.enterpriseDetailHero = "true";
  hero.classList.add("enterprise-detail-hero");

  if (!hero.querySelector(".hero-v3-bg")) {
    hero.insertAdjacentHTML("afterbegin", `
      <div class="hero-v3-bg" aria-hidden="true">
        <span class="hero-v3-glow hero-v3-glow-a"></span>
        <span class="hero-v3-glow hero-v3-glow-b"></span>
        <span class="hero-v3-glow hero-v3-glow-c"></span>
        <span class="hero-v3-grid-layer"></span>
      </div>
    `);
  }

  const consolePanel = hero.querySelector(".page-hero-console");
  if (consolePanel && !consolePanel.classList.contains("public-home-dashboard") && !consolePanel.querySelector(".edh-console-intel")) {
    consolePanel.insertAdjacentHTML("beforeend", `
      <article class="edh-console-intel">
        <span>${icon("bot", 15)} AI recommendation</span>
        <strong>Review ${escapeOption((profile.docs || ["documents"]).slice(0, 2).join(" + "))} before payment.</strong>
        <small>Queue: normal - Operator: ${escapeOption(enterpriseDetailOperator(serviceName))}</small>
      </article>
    `);
  }
}

function enhanceEnterpriseDetailFaqSearch() {
  const wrap = document.querySelector(".cfaq-wrap");
  if (!wrap || wrap.dataset.enterpriseFaqSearch === "true") return;
  wrap.dataset.enterpriseFaqSearch = "true";
  const search = document.createElement("div");
  search.className = "enterprise-faq-search";
  search.innerHTML = `
    <label>
      ${icon("search", 16)}
      <input type="search" placeholder="Search FAQs, documents, payment or status..." aria-label="Search FAQs">
    </label>
    <span data-faq-search-count></span>
  `;
  wrap.insertAdjacentElement("beforebegin", search);
  const input = search.querySelector("input");
  const count = search.querySelector("[data-faq-search-count]");
  const items = [...wrap.querySelectorAll(".faq-item")];
  const update = () => {
    const term = (input.value || "").trim().toLowerCase();
    let visible = 0;
    items.forEach((item) => {
      const match = !term || item.textContent.toLowerCase().includes(term);
      item.classList.toggle("enterprise-faq-hidden", !match);
      item.hidden = !match;
      if (match) visible += 1;
    });
    count.textContent = term ? `${visible} result${visible === 1 ? "" : "s"}` : "";
  };
  input.addEventListener("input", update);
}

function enhanceEnterpriseDetailRelatedSections() {
  document.querySelectorAll(".related-services-section").forEach((section) => {
    section.classList.add("enterprise-detail-related");
  });
}

function injectEnterpriseTrustBand(isDetailPage) {
  if (isDetailPage) return;
  if (document.querySelector(".enterprise-trust-band") || document.querySelector(".bos-trust-strip-grid") || document.querySelector(".ps-trust-strip-grid") || document.querySelector(".shub-trust-grid") || document.querySelector(".shub-trust-section") || document.querySelector(".ghub-trust-grid") || document.querySelector(".ghub-trust-section") || document.body.classList.contains("page-business-setup") || document.body.classList.contains("print-scan-page") || document.body.classList.contains("services-page") || document.body.classList.contains("online-services-page") || document.querySelector(".bos-container") || document.querySelector(".ps-container")) return;
  const target = document.querySelector(".page-hero, .hero") || document.querySelector("main > section");
  if (!target) return;
  const band = document.createElement("section");
  band.className = "enterprise-trust-band";
  band.setAttribute("aria-label", "Service trust indicators");
  band.innerHTML = `
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-emerald">${icon("badge-check", 20)}</div>
      <div class="etb-content">
        <strong>Verified Process</strong>
        <span>Operator reviewed before submission</span>
      </div>
    </div>
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-blue">${icon("lock-keyhole", 20)}</div>
      <div class="etb-content">
        <strong>Secure Payment</strong>
        <span>Receipt and review flow</span>
      </div>
    </div>
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-purple">${icon("headphones", 20)}</div>
      <div class="etb-content">
        <strong>Live Support</strong>
        <span>WhatsApp and help desk</span>
      </div>
    </div>
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-amber">${icon("star", 20)}</div>
      <div class="etb-content">
        <strong>4.8 Rating</strong>
        <span>Citizen and student reviews</span>
      </div>
    </div>
    <div class="etb-item">
      <div class="etb-icon-chip etb-chip-indigo">${icon("users", 20)}</div>
      <div class="etb-content">
        <strong>12,000+ Applications</strong>
        <span>Processed through One Point desk</span>
      </div>
    </div>
  `;
  target.insertAdjacentElement("afterend", band);
}

function setupEnterpriseDetailCtas(serviceName) {
  document.querySelectorAll(".enterprise-detail-command .btn-service-select[data-service]").forEach((button) => {
    if (button.dataset.enterpriseDetailCtaBound === "true") return;
    button.dataset.enterpriseDetailCtaBound = "true";
    button.addEventListener("click", (event) => {
      const svc = button.getAttribute("data-service") || serviceName;
      if (isWhatsAppLaunchMode()) {
        event.preventDefault();
        window.open(buildServiceWhatsAppUrl(svc), "_blank", "noopener");
        return;
      }
      if (isDrawerPage()) {
        event.preventDefault();
        window.openApplyDrawer?.(svc);
        return;
      }
      const serviceSelect = document.querySelector("#pan-service-type");
      if (serviceSelect && svc) {
        serviceSelect.value = svc;
        window.applySelectedService?.();
      }
      const target = document.getElementById("apply-now") || document.querySelector("[data-unified-apply-slot]");
      if (target) {
        event.preventDefault();
        scrollToPageTarget(target, "smooth");
      }
    });
  });
}

function injectEnterpriseComparisonTable(isDetailPage) {
  if (
    document.querySelector(".enterprise-comparison-section") ||
    document.querySelector(".bos-estimate-wrapper") ||
    document.querySelector(".ps-estimate-wrapper") ||
    document.body.classList.contains("page-business-setup") ||
    document.body.classList.contains("print-scan-page") ||
    document.querySelector(".bos-container") ||
    document.querySelector(".ps-container") ||
    document.querySelector(".ghub-estimate-box") ||
    document.body.classList.contains("online-services-page")
  ) return;

  const anchor = document.querySelector(".enterprise-services-section") || document.querySelector("#service-options") || document.querySelector(".enterprise-detail-command");
  if (!anchor) return;
  const serviceName = enterpriseCurrentServiceName();
  const comparison = document.createElement("section");
  comparison.className = "section enterprise-comparison-section reveal";

  const comparisonCategories = [
    {
      id: "tab-fee",
      label: "Fees & Transparency",
      icon: "indian-rupee",
      count: "3 Standards",
      introTitle: "100% Upfront Pricing & Statutory Protection",
      introSub: "Zero hidden operator markups, official tax receipts handover, and pay only after draft verification.",
      rows: [
        {
          icon: "landmark",
          param: "Official Government Fee",
          subtext: "Statutory charges",
          unassisted: {
            icon: "alert-circle",
            status: "Unclear Markups &amp; Hidden Costs",
            text: "Vague estimates without itemized statutory breakup; risk of payment gateway loss."
          },
          onepoint: {
            icon: "receipt",
            status: "100% At Actuals (Official Receipts)",
            text: "Exact official portal fees gazetted by government + instant official tax invoice handover."
          }
        },
        {
          icon: "tag",
          param: "Assistance & Operator Fee",
          subtext: "Service charges",
          unassisted: {
            icon: "alert-circle",
            status: "Advance Demanded (Surprise Costs)",
            text: "Advance fee taken before review; unexpected extra charges demanded midway."
          },
          onepoint: {
            icon: "check-circle-2",
            status: "Fixed Catalog Price &bull; Pay After Review",
            text: "Pay only after you review and approve draft. Transparent catalog pricing with zero surprise charges."
          }
        },
        {
          icon: "shield-check",
          param: "Fee Protection Policy",
          subtext: "Citizen guarantee",
          unassisted: {
            icon: "slash",
            status: "No Refund Policy",
            text: "Zero refund if application fails or if service cannot be processed."
          },
          onepoint: {
            icon: "shield-check",
            status: "100% Assistance Refund Guarantee",
            text: "100% full assistance fee refund guarantee if request is not initiated on portal."
          }
        }
      ]
    },
    {
      id: "tab-quality",
      label: "Quality & Verification",
      icon: "shield-check",
      count: "3 Standards",
      introTitle: "Zero Rejection Pre-Audit Guard",
      introSub: "Comprehensive photo/signature DPI formatting, name-matching check, and trackable digital URN.",
      rows: [
        {
          icon: "layers",
          param: "Filing Mode & Accuracy",
          subtext: "Application precision",
          unassisted: {
            icon: "alert-triangle",
            status: "High Rejection Risk",
            text: "Manual self-entry, frequent photo/signature format errors &amp; portal timeout failures."
          },
          onepoint: {
            icon: "check-circle-2",
            status: "100% Assisted &amp; Operator Guided",
            text: "Operator-guided filing with photo/sign DPI compression &amp; pre-submission error scrubbing."
          }
        },
        {
          icon: "file-check-2",
          param: "Required Documents & Audit",
          subtext: "Paperwork verification",
          unassisted: {
            icon: "x-circle",
            status: "Defect Notice Risk",
            text: "No pre-audit; portal rejects application due to name, DOB, or address mismatch."
          },
          onepoint: {
            icon: "shield-check",
            status: "Zero Rejection Pre-Audit Guard",
            text: "Comprehensive pre-audit of Aadhaar vs certificate names to prevent rejection before filing."
          }
        },
        {
          icon: "receipt",
          param: "Status Tracking & Proof",
          subtext: "Acknowledgment slip",
          unassisted: {
            icon: "search",
            status: "Manual Portal Checks Required",
            text: "Must remember complex portal passwords and check status manually every week."
          },
          onepoint: {
            icon: "file-text",
            status: "Instant PDF Slip &amp; Digital URN",
            text: "Official computer-generated acknowledgment slip &amp; trackable URN sent directly to WhatsApp."
          }
        }
      ]
    },
    {
      id: "tab-speed",
      label: "Speed, SLA & Support",
      icon: "zap",
      count: "2 Standards",
      introTitle: "Priority Desk Queue & Dedicated Helpdesk",
      introSub: "Fastest official appointment slot locking and live human operator support on WhatsApp.",
      rows: [
        {
          icon: "clock",
          param: "Estimated Turnaround (SLA)",
          subtext: "Filing timeline",
          unassisted: {
            icon: "hourglass",
            status: "Unpredictable Delays",
            text: "Missed closing deadlines, slow manual queue handling, and delayed slot locking."
          },
          onepoint: {
            icon: "zap",
            status: "Priority Queue &amp; Fast Slot Booking",
            text: "Same-day priority queue handling, fastest official slot booking &amp; milestone follow-up."
          }
        },
        {
          icon: "headphones",
          param: "Dedicated Citizen Support",
          subtext: "Human helpdesk",
          unassisted: {
            icon: "user-x",
            status: "Bot / No Human Support",
            text: "Automated chatbot dead-ends; no live operator to assist if issue occurs."
          },
          onepoint: {
            icon: "message-circle",
            status: "Dedicated Live Human Support",
            text: "Live WhatsApp support + Lucknow center desk with real operator guidance."
          }
        }
      ]
    }
  ];

  comparison.innerHTML = `
    <div class="section-head text-center">
      <div>
        <p class="section-kicker"><i data-lucide="scale"></i> Value &amp; Transparency Matrix</p>
        <h2>Why Citizens Choose <span class="h2-gold">One Point Assisted Service</span></h2>
        <p class="section-subhead">Compare the difference: 100% verified pre-audits, transparent at-actuals fees, and statutory protection vs uncertain self-filing.</p>
      </div>
    </div>
    
    <div class="ect-metric-strip">
      <div class="ect-metric-card">
        <div class="ect-mc-icon"><i data-lucide="landmark"></i></div>
        <div class="ect-mc-body">
          <span class="ect-mc-label">Official Govt Fee</span>
          <strong class="ect-mc-val">At Actuals</strong>
          <span class="ect-mc-sub">100% Govt Receipts Handover</span>
        </div>
      </div>
      <div class="ect-metric-card">
        <div class="ect-mc-icon"><i data-lucide="tag"></i></div>
        <div class="ect-mc-body">
          <span class="ect-mc-label">Assistance Fee</span>
          <strong class="ect-mc-val">Fixed &amp; Clear</strong>
          <span class="ect-mc-sub">Pay Only After Doc Review</span>
        </div>
      </div>
      <div class="ect-metric-card">
        <div class="ect-mc-icon"><i data-lucide="shield-check"></i></div>
        <div class="ect-mc-body">
          <span class="ect-mc-label">Pre-Audit Guard</span>
          <strong class="ect-mc-val">Zero Error Target</strong>
          <span class="ect-mc-sub">Scrubbed Before Submission</span>
        </div>
      </div>
      <div class="ect-metric-card">
        <div class="ect-mc-icon"><i data-lucide="clock"></i></div>
        <div class="ect-mc-body">
          <span class="ect-mc-label">Milestone SLA</span>
          <strong class="ect-mc-val">Tracked Online</strong>
          <span class="ect-mc-sub">Direct URN &amp; Updates</span>
        </div>
      </div>
    </div>

    <div class="enterprise-comparison-table-wrap">
      <!-- Integrated Segmented Tabs Header -->
      <div class="ect-tab-header">
        <div class="ect-tab-nav" role="tablist" aria-label="Comparison Categories">
          ${comparisonCategories.map((cat, idx) => `
            <button class="ect-tab-btn ${idx === 0 ? "active" : ""}" data-ect-tab="${cat.id}" type="button" role="tab" aria-selected="${idx === 0 ? "true" : "false"}">
              <i data-lucide="${cat.icon}"></i>
              <span>${cat.label}</span>
              <span class="ect-tab-pill">${cat.count}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Tab Panels -->
      ${comparisonCategories.map((cat, idx) => `
        <div class="ect-tab-panel ${idx === 0 ? "active" : ""}" id="${cat.id}" role="tabpanel">
          <div class="enterprise-comparison-table" role="table" aria-label="${cat.label} Comparison">
            <div class="ect-head-row" role="row">
              <span role="columnheader" class="ect-th-param">Service Parameter</span>
              <span role="columnheader" class="ect-th-unassisted"><i data-lucide="alert-circle"></i> Unassisted / Local Shop</span>
              <span role="columnheader" class="ect-th-onepoint"><i data-lucide="shield-check"></i> One Point Assisted (Standard)</span>
            </div>
            ${cat.rows.map((row) => `
              <div class="ect-row" role="row">
                <div class="ect-param" role="cell">
                  <span class="ect-icon"><i data-lucide="${row.icon}"></i></span>
                  <div class="ect-param-text">
                    <strong>${row.param}</strong>
                    <span class="ect-param-sub">${row.subtext}</span>
                  </div>
                </div>
                <div class="ect-unassisted" role="cell">
                  <strong class="ect-unassisted-status"><i data-lucide="${row.unassisted.icon}"></i> ${row.unassisted.status}</strong>
                  <p class="ect-unassisted-text">${row.unassisted.text}</p>
                </div>
                <div class="ect-onepoint" role="cell">
                  <strong class="ect-onepoint-status"><i data-lucide="${row.onepoint.icon}"></i> ${row.onepoint.status}</strong>
                  <p class="ect-onepoint-text">${row.onepoint.text}</p>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}

      <div class="ect-footer-bar">
        <div class="ect-trust-pills">
          <span><i data-lucide="check-circle-2"></i> Pay After Review</span>
          <span><i data-lucide="receipt"></i> Official Receipts Handover</span>
          <span><i data-lucide="shield-check"></i> 100% Fee Protection</span>
          <span><i data-lucide="message-circle"></i> Live WhatsApp Support</span>
        </div>
        <div class="ect-footer-action">
          <a class="btn-ect-apply" href="${serviceApplyHref(serviceName, inferApplyCategory("", serviceName))}">
            <i data-lucide="arrow-right"></i> ${isDetailPage ? "Get Service Assistance" : "Start Service Request"}
          </a>
          <a class="btn-ect-whatsapp" href="${buildServiceWhatsAppUrl(serviceName)}" target="_blank" rel="noopener">
            <i data-lucide="message-circle"></i> Ask on WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;

  // Attach interactive tab click handler
  const tabBtns = comparison.querySelectorAll(".ect-tab-btn");
  const tabPanels = comparison.querySelectorAll(".ect-tab-panel");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-ect-tab");
      tabBtns.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      tabPanels.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const activePanel = comparison.querySelector(`#${target}`);
      if (activePanel) activePanel.classList.add("active");
      if (window.lucide) window.lucide.createIcons();
    });
  });

  anchor.insertAdjacentElement("afterend", comparison);
  if (window.lucide) window.lucide.createIcons();
}

function injectEnterpriseStickyActions(isDetailPage) {
  if (document.querySelector(".enterprise-sticky-actions") || document.querySelector(".bos-sticky-mobile-bar") || document.querySelector(".ps-sticky-mobile-bar") || document.body.classList.contains("page-business-setup") || document.body.classList.contains("print-scan-page") || document.querySelector(".bos-container") || document.querySelector(".ps-container")) return;
  const serviceName = enterpriseCurrentServiceName();
  const bar = document.createElement("div");
  bar.className = "enterprise-sticky-actions";
  bar.setAttribute("aria-label", "Quick service actions");
  bar.innerHTML = `
    <a class="esa-apply" href="${serviceApplyHref(serviceName, inferApplyCategory("", serviceName))}">${icon("arrow-right", 16)} ${isDetailPage ? "Apply Now" : "Apply"}</a>
    <a class="esa-whatsapp" href="${buildServiceWhatsAppUrl(serviceName)}" target="_blank" rel="noopener">${icon("message-circle", 16)} WhatsApp</a>
    <a class="esa-call" href="tel:+919473946181">${icon("phone", 16)} Call</a>
  `;
  document.body.appendChild(bar);
}

function setupMegaMenuTabs() {
  const containers = document.querySelectorAll(".onemart-mega");
  if (!containers.length) return;

  containers.forEach((container) => {
    const sidebarItems = container.querySelectorAll(".mega-sidebar-item");
    const contentPanel = container.querySelector(".mega-content-panel");
    if (!sidebarItems.length || !contentPanel) return;

    let hoverTimer = null;

    function closeParentMenu() {
      const parentItem = container.closest(".nav-item");
      if (!parentItem) return;
      parentItem.classList.remove("open", "dropdown-open");
      const trigger = parentItem.querySelector("[data-dropdown-trigger]");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }

    function navigateMenuLink(link, event) {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      event?.preventDefault();
      event?.stopPropagation();

      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.href);

        if (link.getAttribute("target") === "_blank") {
          window.open(targetUrl.toString(), "_blank");
          return;
        }

        const isSamePageHash = currentUrl.origin === targetUrl.origin &&
                               currentUrl.pathname === targetUrl.pathname &&
                               targetUrl.hash !== "";

        closeParentMenu();

        if (isSamePageHash) {
          if (window.location.hash !== targetUrl.hash) {
            window.location.hash = targetUrl.hash;
          }

          const target = document.getElementById(decodeURIComponent(targetUrl.hash.slice(1)));
          if (target) {
            window.setTimeout(() => scrollToPageTarget(target, "smooth"), 0);
          }
          return;
        }

        window.location.href = targetUrl.toString();
      } catch (e) {
        closeParentMenu();
        if (link.getAttribute("target") === "_blank") {
          window.open(href, "_blank");
        } else {
          window.location.href = href;
        }
      }
    }

    // Helper to bind right content panel links directly to prevent event conflicts
    function bindContentPanelLinks() {
      const links = contentPanel.querySelectorAll("a");
      links.forEach(link => {
        link.addEventListener("click", (event) => navigateMenuLink(link, event));
      });
    }

    // Helper to render right panel content
    function renderRightPanelContent(group) {
      const gridHtml = group.items.map(([label, href, desc, iconName]) => `
      <a class="mega-grid-item" href="${href}">
        <div class="mega-grid-item-icon">
          ${icon(iconName || 'file-text', 18)}
        </div>
        <div class="mega-grid-item-content">
          <h4 class="mega-grid-item-title">${label}</h4>
          <p class="mega-grid-item-desc">${desc || 'Access online application and support services.'}</p>
        </div>
      </a>
    `).join("");

      const arrowIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;

      return `
      <div class="mega-content-header">
        <h3 class="mega-content-title">${group.title}</h3>
        <p class="mega-content-desc">${group.desc}</p>
        <a class="mega-browse-link" href="${group.href}">Browse all ${group.title} ${arrowIcon}</a>
      </div>
      <div class="mega-items-grid">
        ${gridHtml}
      </div>
    `;
    }

    // Active switching function with debouncing and timer cleanup
    function setActiveCategory(index, immediate = false) {
      const targetIdx = parseInt(index);
      sidebarItems.forEach((item, idx) => {
        if (idx === targetIdx) {
          item.classList.add("active");
          item.setAttribute("aria-selected", "true");
        } else {
          item.classList.remove("active");
          item.setAttribute("aria-selected", "false");
        }
      });

      const group = servicesMegaGroups[targetIdx];
      if (!group) return;

      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }

      if (immediate) {
        contentPanel.style.opacity = "1";
        contentPanel.innerHTML = renderRightPanelContent(group);
        if (typeof lucide !== "undefined") lucide.createIcons();
        bindContentPanelLinks();
        return;
      }

      contentPanel.style.opacity = "0.45";
      hoverTimer = setTimeout(() => {
        contentPanel.innerHTML = renderRightPanelContent(group);
        contentPanel.style.opacity = "1";
        if (typeof lucide !== "undefined") lucide.createIcons();
        bindContentPanelLinks();
        hoverTimer = null;
      }, 50);
    }

    // Add event listeners for hover, focus, and click
    sidebarItems.forEach(item => {
      item.setAttribute("role", "tab");

      item.addEventListener("pointerenter", () => {
        const idx = item.getAttribute("data-sidebar-idx");
        setActiveCategory(idx);
      });

      item.addEventListener("focusin", () => {
        const idx = item.getAttribute("data-sidebar-idx");
        setActiveCategory(idx, true);
      });

      item.addEventListener("click", (event) => {
        const idx = item.getAttribute("data-sidebar-idx");
        setActiveCategory(idx, true);
        navigateMenuLink(item, event);
      });
    });

    // Reset to first category when dropdown opens
    const parentNavItem = container.closest(".nav-item");
    if (parentNavItem) {
      let wasOpen = parentNavItem.classList.contains("dropdown-open") || parentNavItem.classList.contains("open");
      const resetObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes" && mutation.attributeName === "class") {
            const isOpen = parentNavItem.classList.contains("dropdown-open") || parentNavItem.classList.contains("open");
            if (isOpen !== wasOpen) {
              wasOpen = isOpen;
              if (isOpen) {
                setActiveCategory(0, true);
              }
            }
          }
        });
      });
      resetObserver.observe(parentNavItem, { attributes: true });
    }

    // Bind initial links
    bindContentPanelLinks();
  });
}

redirectLegacyServiceContact();
renderNav();
renderFooter();
OPDSCustomerSession.init();
renderOneMartCatalog();
renderProductDetail();
setupMobileNav();
setupDropdowns();
setupMegaMenuTabs();
setupHeaderScroll();
setupServiceHeroDynamics();
setupHeroWords();
setupTracker();
setupFaqs();
setupCfaq();
setupSearch();
setupServiceCtas();
setupProductCarousel();
setupEduPointServiceCarousel();
setupImageLoading();
setupGallery();
setupTabs();
setupRequiredDocumentsTabs();
setupReveal();
setupActiveMobileNav();
setupContactForm();
setupUnifiedApplyPage();
setupMobileChromeState();
setupApplyForms();
setupPaymentFlow();
setupOneMartInteractions();
setupDeferredHashTargeting();
setupDynamicQuickServices();
setupEnterpriseServiceExperience();
setupBentoSwitcher();
setupProcessStepper();
setupTrustCounters();
setupLiveActivityFeed();
setupReviewAvatarSafeguards();
injectConversionFaqs();
setupWhatsAppPrefills();
setupFormAbandonmentRecovery();
setupInternalComponentVisualContracts();
setupLucide();

// Release the first paint only after the current shared layout and dynamic
// components have replaced their legacy HTML fallbacks.
if (typeof window.__OPDS_REVEAL_INITIAL_RENDER__ === "function") {
  const revealInitialRender = window.__OPDS_REVEAL_INITIAL_RENDER__;
  const revealAfterFonts = () => window.requestAnimationFrame(revealInitialRender);

  if (document.fonts?.status === "loading") {
    Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 400))
    ]).then(revealAfterFonts, revealAfterFonts);
  } else {
    revealAfterFonts();
  }
}

fetchWebsiteCatalog().then(hydrateCatalogPriceLabels).catch(() => {});


function setupBentoSwitcher() {
  const slides = document.querySelectorAll(".comparison-step-slide");
  const stepperBtns = document.querySelectorAll(".bento-stepper-btn");
  if (slides.length === 0) return;

  let slideIndex = 0;
  let rafId = null;
  let startTime = null;
  const slideDuration = 5000; // 5 seconds per slide
  let isPaused = false;

  function showSlide(index) {
    slideIndex = index;
    window.currentBentoSlideIndex = index;

    slides.forEach((slide, idx) => {
      if (idx === index) {
        slide.classList.add("active");
      } else {
        slide.classList.remove("active");
      }
    });

    stepperBtns.forEach((btn, idx) => {
      const fill = btn.querySelector(".stepper-tab-progress-fill");
      if (idx === index) {
        btn.classList.add("active");
        if (fill) fill.style.width = "0%";
      } else {
        btn.classList.remove("active");
        if (fill) fill.style.width = "0%";
      }
    });
  }

  function tick(timestamp) {
    if (isPaused) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progressPercent = Math.min((elapsed / slideDuration) * 100, 100);

    const activeBtn = stepperBtns[slideIndex];
    if (activeBtn) {
      const fill = activeBtn.querySelector(".stepper-tab-progress-fill");
      if (fill) fill.style.width = progressPercent.toFixed(2) + "%";
    }

    if (elapsed >= slideDuration) {
      startTime = timestamp;
      const nextIndex = (slideIndex + 1) % slides.length;
      showSlide(nextIndex);
    }

    rafId = requestAnimationFrame(tick);
  }

  function startAutoplay() {
    stopAutoplay();
    startTime = null;
    isPaused = false;
    rafId = requestAnimationFrame(tick);
  }

  function stopAutoplay() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Interactive Click Handlers for Stepper Tabs
  stepperBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      showSlide(idx);
      startAutoplay(); // Reset progress and start rotation from clicked slide
    });
  });

  // Gentle hover pause on Bento card to prevent surprise switches while reading
  const bentoCard = document.querySelector(".why-choose-clean-section .bento-card");
  if (bentoCard) {
    bentoCard.addEventListener("mouseenter", () => {
      isPaused = true;
    });
    bentoCard.addEventListener("mouseleave", () => {
      isPaused = false;
    });
  }

  // Initialize
  showSlide(0);
  startAutoplay();
}



// WhatsApp Float Button
(function renderWhatsAppButton() {
  const btn = document.createElement("a");
  btn.href = siteConfig.whatsapp;
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  btn.setAttribute("aria-label", "Chat on WhatsApp");
  btn.className = "whatsapp-float";
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg><span>WhatsApp</span>`;
  document.body.appendChild(btn);
})();

function setupMobileChromeState() {
  const mobileQuery = window.matchMedia("(max-width: 768px)");
  const syncGeneratedTouchTargets = (isMobile) => {
    document.querySelectorAll(".rs-dot").forEach((dot) => {
      if (isMobile) {
        dot.style.setProperty("width", "40px", "important");
        dot.style.setProperty("min-width", "40px", "important");
        dot.style.setProperty("flex-basis", "40px", "important");
        dot.style.setProperty("height", "40px", "important");
      } else {
        dot.style.removeProperty("width");
        dot.style.removeProperty("min-width");
        dot.style.removeProperty("flex-basis");
        dot.style.removeProperty("height");
      }
    });
  };
  const syncChromeState = () => {
    const isMobile = mobileQuery.matches;
    document.body.classList.toggle("is-mobile-site", isMobile);
    document.body.classList.toggle("is-desktop-site", !isMobile);
    document.body.classList.toggle("has-sticky-bottom-cta", Boolean(document.querySelector(".sticky-bottom-cta")));
    document.body.classList.toggle("has-apply-drawer", Boolean(document.querySelector(".unified-apply-section.as-drawer")));
    document.body.classList.toggle("has-tracker-hero", Boolean(document.querySelector(".tracker-hero")));
    syncGeneratedTouchTargets(isMobile);
  };

  syncChromeState();
  window.addEventListener("resize", syncChromeState, { passive: true });
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", syncChromeState);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(syncChromeState);
  }
  new MutationObserver(syncChromeState).observe(document.body, { childList: true, subtree: true });
}

function setupProcessStepper() {
  const navCards = document.querySelectorAll(".stepper-nav-card");
  const panes = document.querySelectorAll(".showcase-pane");
  if (navCards.length === 0 || panes.length === 0) return;

  let currentStep = 0;
  let autoplayInterval = null;
  let paneAnimIntervals = {};
  let textTypingTimeout = null;

  function clearAllAnimations() {
    if (textTypingTimeout) clearTimeout(textTypingTimeout);
    
    for (let key in paneAnimIntervals) {
      if (paneAnimIntervals[key]) {
        clearInterval(paneAnimIntervals[key]);
        clearTimeout(paneAnimIntervals[key]);
      }
    }
    paneAnimIntervals = {};

    const searchInput = document.querySelector(".typing-text-element");
    if (searchInput) searchInput.textContent = "";
    
    const resultCard = document.querySelector(".portal-result-card.pan-card-correction");
    if (resultCard) {
      resultCard.classList.remove("visible-card");
      resultCard.classList.remove("clicked");
    }
    
    const pointer = document.querySelector(".simulated-pointer");
    if (pointer) {
      pointer.style.transform = "translate(0, 0)";
      pointer.style.opacity = "0";
    }

    const rows = document.querySelectorAll(".uploaded-file-row");
    rows.forEach(row => {
      row.classList.remove("done");
      const bar = row.querySelector(".file-progress-bar");
      if (bar) bar.style.width = "0%";
      const pct = row.querySelector(".file-percentage");
      if (pct) pct.textContent = "0%";
    });

    const upiBody = document.querySelector(".upi-phone-body");
    if (upiBody) {
      upiBody.classList.remove("success");
    }

    const bubbles = document.querySelectorAll(".wa-bubble");
    bubbles.forEach(bubble => {
      bubble.classList.remove("show-msg");
    });
  }

  function triggerPaneAnimation(index) {
    clearAllAnimations();

    if (index === 0) {
      const text = "PAN Card correction";
      const targetEl = document.querySelector(".typing-text-element");
      const resultCard = document.querySelector(".portal-result-card.pan-card-correction");
      const pointer = document.querySelector(".simulated-pointer");
      
      let charIdx = 0;
      if (targetEl) {
        pointer.style.opacity = "1";
        
        function typeChar() {
          if (charIdx < text.length) {
            targetEl.textContent += text.charAt(charIdx);
            charIdx++;
            textTypingTimeout = setTimeout(typeChar, 80);
          } else {
            if (resultCard) {
              resultCard.classList.add("visible-card");
            }
            paneAnimIntervals["p0_pointer"] = setTimeout(() => {
              if (pointer) {
                pointer.style.transform = "translate(-180px, -110px)";
              }
              
              paneAnimIntervals["p0_click"] = setTimeout(() => {
                if (resultCard) {
                  resultCard.classList.add("clicked");
                }
                
                paneAnimIntervals["p0_hide"] = setTimeout(() => {
                  if (pointer) pointer.style.opacity = "0";
                }, 600);
              }, 1200);
            }, 600);
          }
        }
        
        paneAnimIntervals["p0_type"] = setTimeout(typeChar, 400);
      }
    } else if (index === 1) {
      const file1 = document.querySelector(".uploaded-file-row.file-1");
      const file2 = document.querySelector(".uploaded-file-row.file-2");
      
      function animateUpload(row, duration, delay, nextCallback) {
        paneAnimIntervals[row.classList[1] + "_anim"] = setTimeout(() => {
          const bar = row.querySelector(".file-progress-bar");
          const pct = row.querySelector(".file-percentage");
          let progress = 0;
          
          const stepTime = duration / 20;
          const interval = setInterval(() => {
            progress += 5;
            if (progress <= 100) {
              if (bar) bar.style.width = progress + "%";
              if (pct) pct.textContent = progress + "%";
            } else {
              clearInterval(interval);
              row.classList.add("done");
              if (nextCallback) nextCallback();
            }
          }, stepTime);
          
          paneAnimIntervals[row.classList[1] + "_int"] = interval;
        }, delay);
      }
      
      if (file1) animateUpload(file1, 1000, 200, () => {
        if (file2) animateUpload(file2, 1200, 200);
      });
    } else if (index === 2) {
      // Operator review pane animation
    } else if (index === 3) {
      // Track progress pane animation
    } else if (index === 4) {
      const bubbles = document.querySelectorAll(".wa-bubble");
      bubbles.forEach((bubble, idx) => {
        paneAnimIntervals["p4_msg_" + idx] = setTimeout(() => {
          bubble.classList.add("show-msg");
          const chatBody = document.querySelector(".wa-chat-body");
          if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
          }
        }, idx * 1200 + 400);
      });
    }
  }

  function activateStep(index) {
    navCards.forEach(card => card.classList.remove("active"));
    panes.forEach(pane => pane.classList.remove("active"));

    navCards[index].classList.add("active");
    panes[index].classList.add("active");

    currentStep = index;
    triggerPaneAnimation(index);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayInterval = setInterval(() => {
      let nextStep = (currentStep + 1) % navCards.length;
      activateStep(nextStep);
    }, 6000);
  }

  function stopAutoplay() {
    if (autoplayInterval) clearInterval(autoplayInterval);
  }

  navCards.forEach((card, idx) => {
    card.addEventListener("click", () => {
      stopAutoplay();
      activateStep(idx);
    });

    card.addEventListener("mouseenter", () => {
      stopAutoplay();
      activateStep(idx);
    });

    card.addEventListener("mouseleave", () => {
      startAutoplay();
    });
  });

  activateStep(0);
  startAutoplay();
}

// Centralized Site Stats Source
window.siteStats = {
  processed: { value: 12000, suffix: '+', raw: '12,000+' },
  success: { value: 99.2, suffix: '%', raw: '99.2%' },
  support: { value: '24/7', raw: '24/7' },
  satisfaction: { value: 4.9, suffix: '', raw: '4.9' }
};

function applyCentralizedStats() {
  const stats = window.siteStats;
  if (!stats) return;

  // 1. Update index.html counters
  const processedNum = document.querySelector('.tm-card:nth-child(1) .metric-number');
  if (processedNum) {
    processedNum.setAttribute('data-target', stats.processed.value);
    processedNum.setAttribute('data-suffix', stats.processed.suffix);
    processedNum.textContent = stats.processed.raw;
  }
  const successNum = document.querySelector('.tm-card:nth-child(2) .metric-number');
  if (successNum) {
    successNum.setAttribute('data-target', stats.success.value);
    successNum.setAttribute('data-suffix', stats.success.suffix);
    successNum.textContent = stats.success.raw;
  }
  const supportNum = document.querySelector('.tm-card:nth-child(3) .tm-static');
  if (supportNum) {
    supportNum.textContent = stats.support.raw;
  }
  const satisfactionNum = document.querySelector('.tm-card:nth-child(4) .metric-number');
  if (satisfactionNum) {
    satisfactionNum.setAttribute('data-target', stats.satisfaction.value);
    satisfactionNum.setAttribute('data-suffix', stats.satisfaction.suffix);
    satisfactionNum.textContent = stats.satisfaction.raw;
  }

  // 2. Update service-pan-card.html stats strip
  const stripItems = document.querySelectorAll('.premium-trust-strip-glass .trust-strip-item-glass');
  if (stripItems.length >= 4) {
    const label1 = stripItems[0].querySelector('.metric-label-glass')?.textContent?.toLowerCase();
    if (label1 && label1.includes('processed')) {
      const val1 = stripItems[0].querySelector('.metric-val-glass');
      if (val1) val1.textContent = stats.processed.raw;

      const val2 = stripItems[1].querySelector('.metric-val-glass');
      if (val2) val2.textContent = stats.success.raw;

      const val3 = stripItems[2].querySelector('.metric-val-glass');
      if (val3) val3.textContent = stats.support.raw;

      const val4 = stripItems[3].querySelector('.metric-val-glass');
      if (val4) val4.textContent = stats.satisfaction.raw;
    }
  }

  // 3. Update any elements with data-stat attributes
  document.querySelectorAll('[data-stat]').forEach(el => {
    const key = el.getAttribute('data-stat');
    if (stats[key]) {
      if (el.classList.contains('metric-number')) {
        el.setAttribute('data-target', stats[key].value);
        el.setAttribute('data-suffix', stats[key].suffix || '');
      }
      el.textContent = stats[key].raw;
    }
  });
}

function setupTrustCounters() {
  applyCentralizedStats();

  const metricBoxes = document.querySelectorAll(".metric-box, .tm-card");
  if (metricBoxes.length === 0) return;

  const observerOptions = {
    root: null,
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const box = entry.target;
        const numberEl = box.querySelector(".metric-number");
        if (numberEl && !box.classList.contains("animated")) {
          box.classList.add("animated");
          animateCounter(numberEl);
        }
      }
    });
  }, observerOptions);

  metricBoxes.forEach(box => {
    observer.observe(box);
  });

  function animateCounter(el) {
    const rawTarget = el.getAttribute("data-target");
    if (!rawTarget) return;

    const prefix = el.getAttribute("data-prefix") || "";
    const suffix = el.getAttribute("data-suffix") || "";
    const isFraction = rawTarget.includes("/");
    
    let duration = 1800; // 1.8 seconds for smooth animation
    let startTime = null;

    if (isFraction) {
      const parts = rawTarget.split("/");
      const val1 = parseInt(parts[0]) || 0;
      const val2 = parseInt(parts[1]) || 0;

      function stepFraction(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        const currentVal1 = Math.floor(easeProgress * val1);
        const currentVal2 = Math.floor(easeProgress * val2);
        el.textContent = `${prefix}${currentVal1}/${currentVal2}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(stepFraction);
        } else {
          el.textContent = `${prefix}${val1}/${val2}${suffix}`;
        }
      }
      requestAnimationFrame(stepFraction);
    } else {
      const isDecimal = rawTarget.includes(".");
      const targetVal = isDecimal ? parseFloat(rawTarget) : parseInt(rawTarget) || 0;

      function stepCount(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        const currentVal = easeProgress * targetVal;
        
        const formattedVal = isDecimal ? currentVal.toFixed(1) : Math.floor(currentVal);
        el.textContent = `${prefix}${formattedVal}${suffix}`;
        
        if (progress < 1) {
          requestAnimationFrame(stepCount);
        } else {
          el.textContent = `${prefix}${rawTarget}${suffix}`;
        }
      }
      requestAnimationFrame(stepCount);
    }
  }
}

function setupLiveActivityFeed() {
  if (sessionStorage.getItem('opds_hide_activity_feed') === 'true') return;
  if (window.location.pathname.includes('track-application.html') || document.querySelector('.tracker-hero') || document.querySelector('[data-tracker-form]')) return;

  const isStorePage = window.location.pathname.includes('product-detail.html') || 
                      window.location.pathname.includes('products.html') || 
                      window.location.pathname.includes('checkout.html') ||
                      document.querySelector('[data-product-detail]');

  const activities = isStorePage ? [
    { text: "100 Custom Vinyl Stickers ordered", time: "3 minutes ago" },
    { text: "Custom T-Shirt print dispatched", time: "7 minutes ago" },
    { text: "A3 Framed Photo Print ready for pickup", time: "11 minutes ago" },
    { text: "Waterproof Logo Decals ordered", time: "5 minutes ago" },
    { text: "500 Visiting Cards printing started", time: "9 minutes ago" }
  ] : [
    { text: "PAN Card correction submitted", time: "2 minutes ago" },
    { text: "GST Registration completed", time: "5 minutes ago" },
    { text: "Income Certificate approved", time: "8 minutes ago" },
    { text: "PF Withdrawal claim filed", time: "4 minutes ago" },
    { text: "Caste Certificate filed", time: "6 minutes ago" },
    { text: "Domicile Certificate approved", time: "10 minutes ago" },
    { text: "Passport Assistance request sent", time: "12 minutes ago" },
    { text: "Ayushman Card generated", time: "3 minutes ago" },
    { text: "Pension & Welfare Schemes request completed", time: "15 minutes ago" },
    { text: "MSME Registration completed", time: "7 minutes ago" }
  ];

  let currentIndex = Math.floor(Math.random() * activities.length);

  const bar = document.createElement("div");
  bar.id = "live-activity-bar";
  bar.className = "live-activity-bar";
  bar.innerHTML = `
    <div class="live-activity-pulse"></div>
    <div class="live-activity-content">
      <strong>Live:</strong> <span class="live-activity-text"></span>
    </div>
    <button class="live-activity-close" aria-label="Close activity feed">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  document.body.appendChild(bar);

  const textEl = bar.querySelector(".live-activity-text");
  const closeBtn = bar.querySelector(".live-activity-close");

  closeBtn.addEventListener("click", () => {
    bar.classList.remove("visible");
    sessionStorage.setItem('opds_hide_activity_feed', 'true');
    setTimeout(() => bar.remove(), 500);
  });

  function showNext() {
    if (sessionStorage.getItem('opds_hide_activity_feed') === 'true') return;
    
    bar.classList.remove("visible");

    setTimeout(() => {
      currentIndex = (currentIndex + 1) % activities.length;
      const act = activities[currentIndex];
      if (textEl) {
        textEl.innerHTML = `${act.text} <span style="opacity: 0.7; font-size: 0.78rem; font-style: italic;">(${act.time})</span>`;
      }
      bar.classList.add("visible");
    }, 500);
  }

  setTimeout(() => {
    const act = activities[currentIndex];
    if (textEl) {
      textEl.innerHTML = `${act.text} <span style="opacity: 0.7; font-size: 0.78rem; font-style: italic;">(${act.time})</span>`;
    }
    bar.classList.add("visible");
    
    setInterval(showNext, 8000);
  }, 3000);
}

function setupReviewAvatarSafeguards() {
  document.querySelectorAll(".review-avatar img").forEach((img) => {
    if (img.naturalWidth === 0) {
      handleBrokenImage(img);
    } else {
      img.addEventListener("error", () => {
        handleBrokenImage(img);
      });
    }
  });

  function handleBrokenImage(img) {
    const parent = img.parentElement;
    if (!parent) return;
    const card = img.closest(".review-card");
    const nameEl = card?.querySelector(".review-name");
    const name = nameEl ? nameEl.textContent : "Customer";
    const initials = name
      .split(" ")
      .map(part => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    parent.innerHTML = `<span class="review-initials-fallback">${initials}</span>`;
  }
}

function injectConversionFaqs() {
  if (document.querySelector('.cfaq-wrap') || document.querySelector('.ghub-cfaq-wrapper')) return;
  const faqContainer = document.querySelector('.faq.premium-faq') || document.querySelector('.faq');
  if (!faqContainer) return;

  let serviceName = "this service";
  const filename = window.location.pathname.split('/').pop();
  if (filename && filename.startsWith('service-')) {
    const rawName = filename.replace('service-', '').replace('.html', '').replace(/-/g, ' ');
    serviceName = rawName.replace(/\b\w/g, c => c.toUpperCase());
  } else if (filename === 'edupoint.html') {
    serviceName = "Student Portal Services";
  } else {
    const titleText = document.title || "";
    if (titleText.includes("|")) {
      serviceName = titleText.split("|")[0].trim();
    }
  }

  const conversionFaqs = [
    {
      q: `What is the refund policy if my application is not processed?`,
      a: `We provide a 100% refund if your application cannot be processed during our operator check phase. Please note that processing fees are non-refundable once the application has been officially submitted to the government portal.`
    },
    {
      q: `How will I receive the completed ${serviceName}?`,
      a: `The digital certificate or copy will be sent directly to your verified WhatsApp number and email. For physical cards or documents, they will be dispatched via speed post or made available for local pickup.`
    },
    {
      q: `What support availability is offered?`,
      a: `We provide 24×7 support for tracking and queries. You can chat with our team on WhatsApp or call our local support number for any assistance regarding document uploads or status.`
    }
  ];

  if (faqContainer.querySelector('[data-conversion-faq]')) return;

  const isPfaq = faqContainer.classList.contains('pfaq-grid');
  const chevronSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>`;

  conversionFaqs.forEach(faq => {
    const item = document.createElement('div');
    item.className = 'faq-item';
    item.setAttribute('data-conversion-faq', 'true');

    const button = document.createElement('button');
    button.className = 'faq-question';
    button.setAttribute('data-faq-question', '');

    if (isPfaq) {
      const num = String(faqContainer.querySelectorAll('.faq-item').length + 1).padStart(2, '0');
      button.innerHTML = `<span class="pfaq-num">${num}</span><span class="pfaq-q-text">${faq.q}</span>${chevronSvg}`;
    } else {
      button.innerHTML = `${faq.q}${chevronSvg}`;
    }

    const answerDiv = document.createElement('div');
    answerDiv.className = 'faq-answer';
    answerDiv.innerHTML = `<p>${faq.a}</p>`;

    item.appendChild(button);
    item.appendChild(answerDiv);
    faqContainer.appendChild(item);
  });

  setupFaqs();

  // JSON-LD schema generation
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  };

  const allFaqItems = faqContainer.querySelectorAll('.faq-item');
  allFaqItems.forEach(item => {
    const qEl = item.querySelector('.faq-question');
    const aEl = item.querySelector('.faq-answer p');
    if (qEl && aEl) {
      schema.mainEntity.push({
        "@type": "Question",
        "name": qEl.textContent.trim(),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": aEl.textContent.trim()
        }
      });
    }
  });

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}

function setupWhatsAppPrefills() {
  let serviceName = "One Point Services";
  const filename = window.location.pathname.split('/').pop();
  if (filename && filename.startsWith('service-')) {
    const rawName = filename.replace('service-', '').replace('.html', '').replace(/-/g, ' ');
    serviceName = rawName.replace(/\b\w/g, c => c.toUpperCase());
  } else if (filename === 'edupoint.html') {
    serviceName = "Student Portal Services";
  } else if (filename === 'products.html') {
    serviceName = "OneMart Store Products";
  } else if (filename === 'travel-services.html') {
    serviceName = "Travel Booking Services";
  } else {
    const titleText = document.title || "";
    if (titleText.includes("|")) {
      serviceName = titleText.split("|")[0].trim();
    }
  }

  const prefillText = `Hello,\nI need help regarding ${serviceName}.`;
  const encodedText = encodeURIComponent(prefillText);

  const waLinks = document.querySelectorAll('a[href*="wa.me"]');
  waLinks.forEach(link => {
    let href = link.getAttribute('href');
    if (!href) return;

    try {
      // Clean up potential invalid url strings before passing to URL constructor
      let cleanHref = href.trim();
      if (!cleanHref.startsWith('http://') && !cleanHref.startsWith('https://')) {
        cleanHref = 'https://' + cleanHref.replace(/^\/+/, '');
      }
      const urlObj = new URL(cleanHref);
      urlObj.searchParams.set('text', prefillText);
      link.setAttribute('href', urlObj.toString());
    } catch (e) {
      if (href.includes('?')) {
        href = href.replace(/([?&])text=[^&]*/g, '');
        href += `&text=${encodedText}`;
      } else {
        href += `?text=${encodedText}`;
      }
      href = href.replace(/\?&/, '?');
      link.setAttribute('href', href);
    }

    link.addEventListener('click', () => {
      if (window.trackAnalyticsEvent) {
        window.trackAnalyticsEvent('whatsapp_click', {
          service: serviceName,
          href: link.getAttribute('href'),
          location: window.location.pathname
        });
      }
    });
  });
}

function saveFormState() {
  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (!form) return;

  const state = {
    serviceType: form.querySelector("#pan-service-type")?.value || "",
    currentStep: window.currentWizardStep || 1,
    inputs: {},
    filesMetadata: (window.attachedFiles || []).map(f => ({ name: f.name, size: f.size, type: f.type }))
  };

  form.querySelectorAll("input:not([type='file']):not([type='submit']), select, textarea").forEach(input => {
    if (input.name) {
      if (input.type === 'checkbox' || input.type === 'radio') {
        state.inputs[input.name] = input.checked;
      } else {
        state.inputs[input.name] = input.value;
      }
    }
  });

  localStorage.setItem('opds_abandoned_form_state', JSON.stringify(state));
}

function restoreFormState() {
  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (!form) return;

  const rawState = localStorage.getItem('opds_abandoned_form_state');
  if (!rawState) return;

  try {
    const state = JSON.parse(rawState);
    if (!state) return;

    const serviceSelect = form.querySelector("#pan-service-type");
    if (serviceSelect && state.serviceType) {
      serviceSelect.value = state.serviceType;
      if (typeof window.applySelectedService === 'function') {
        window.applySelectedService();
      } else {
        serviceSelect.dispatchEvent(new Event('change'));
      }
    }

    Object.keys(state.inputs || {}).forEach(name => {
      // service_type is restored via the serviceSelect block above; skip here to avoid overwriting stype-cards default
      if (name === 'service_type') return;
      const input = form.querySelector(`[name="${name}"]`);
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = state.inputs[name];
        } else {
          input.value = state.inputs[name];
        }
        input.dispatchEvent(new Event('input'));
      }
    });

    if (state.filesMetadata && state.filesMetadata.length > 0) {
      window.attachedFiles = state.filesMetadata.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        isRestored: true
      }));
      window.renderAttachmentList();
    }

    if (state.currentStep && typeof window.goToStep === 'function') {
      setTimeout(() => {
        const originalScroll = window.scrollTo;
        const origScrollIntoView = Element.prototype.scrollIntoView;
        window.scrollTo = () => {};
        Element.prototype.scrollIntoView = () => {};
        
        window.goToStep(state.currentStep);
        
        window.scrollTo = originalScroll;
        Element.prototype.scrollIntoView = origScrollIntoView;

        showRecoveryToast();
      }, 350);
    }
  } catch (e) {
    console.error("Error restoring form state:", e);
  }
}

function showRecoveryToast() {
  const toast = document.createElement("div");
  toast.className = "recovery-toast";
  toast.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 1001; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); color: #fff; font-size: 0.82rem; transition: opacity 0.4s; opacity: 0; display: flex; align-items: center; gap: 8px;";
  toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> <span>Restored your unfinished application form.</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.style.opacity = "1", 100);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function setupFormAbandonmentRecovery() {
  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (!form) return;

  form.addEventListener('input', saveFormState);
  form.addEventListener('change', saveFormState);

  const originalGoToStep = window.goToStep;
  if (typeof originalGoToStep === 'function') {
    window.goToStep = function(stepNum) {
      window.currentWizardStep = stepNum;
      originalGoToStep(stepNum);
      saveFormState();
    };
  }

  const originalHandleDeviceUpload = window.handleDeviceUpload;
  window.handleDeviceUpload = async function(input) {
    if (originalHandleDeviceUpload) {
      await originalHandleDeviceUpload(input);
    }
    saveFormState();
  };

  const originalRemoveAttachedFile = window.removeAttachedFile;
  window.removeAttachedFile = function(index) {
    if (originalRemoveAttachedFile) {
      originalRemoveAttachedFile(index);
    }
    saveFormState();
  };

  restoreFormState();
}

window.trackAnalyticsEvent = function(eventName, eventParams = {}) {
  const payload = {
    event: eventName,
    params: {
      ...eventParams,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer
    }
  };

  console.log(`[Analytics] Event Logged: ${eventName}`, payload);

  let logs = [];
  try {
    logs = JSON.parse(localStorage.getItem('opds_analytics_logs') || '[]');
  } catch (e) {}
  logs.push(payload);
  if (logs.length > 100) logs.shift();
  localStorage.setItem('opds_analytics_logs', JSON.stringify(logs));
};

document.addEventListener("DOMContentLoaded", () => {
  const filename = window.location.pathname.split('/').pop() || 'index.html';
  const isServicePage = filename.startsWith('service-') || 
                        filename === 'edupoint.html' || 
                        filename === 'products.html' || 
                        filename === 'travel-services.html';
  
  if (isServicePage) {
    let serviceName = filename.replace('service-', '').replace('.html', '').replace(/-/g, ' ');
    serviceName = serviceName.replace(/\b\w/g, c => c.toUpperCase());
    if (filename === 'edupoint.html') serviceName = 'STUDENT CORNER';
    if (filename === 'products.html') serviceName = 'ONEMART STORE';
    if (filename === 'travel-services.html') serviceName = 'TRAVEL SERVICES';

    window.trackAnalyticsEvent('service_view', {
      service: serviceName,
      path: window.location.pathname
    });
  }

  if (filename === 'index.html' || filename === '') {
    document.querySelectorAll('.btn, .cta-link, .btn-premium-gold, .btn-premium-blue, [onclick*="scrollIntoView"]').forEach(cta => {
      cta.addEventListener('click', () => {
        window.trackAnalyticsEvent('homepage_cta_click', {
          text: cta.textContent.trim(),
          id: cta.id || '',
          className: cta.className || ''
        });
      });
    });
  }

  /* ── Hero dashboard live animation ─────────────────────────────────────── */
  (function initDashboard() {
    const mainCard = document.querySelector('.command-main');
    if (!mainCard) return;

    const orders = [
      { id: 'OPDS2026-PAN', status: 'Documents verified. Review in progress.', progress: 68, color: 'var(--accent-gold)' },
      { id: 'OPDS2026-VID', status: 'Application submitted. Processing started.', progress: 30, color: 'var(--primary-light)' },
      { id: 'OPDS2026-PSP', status: 'Verification complete. Dispatched.', progress: 90, color: '#34d399' },
      { id: 'OPDS2026-GST', status: 'Documents pending. Upload required.', progress: 15, color: 'var(--accent-gold)' },
    ];

    const services = [
      [
        { icon: 'id-card',           label: 'PAN Card Application', badge: '2-3 days',  color: 'var(--accent-gold)' },
        { icon: 'graduation-cap',    label: 'Student Helpdesk',      badge: 'Instant',   color: 'var(--primary-light)' },
        { icon: 'briefcase-business',label: 'GST/MSME Filing',       badge: 'Guided',    color: 'var(--accent-gold)' },
      ],
      [
        { icon: 'file-text',         label: 'Voter ID Update',       badge: '5-7 days',  color: 'var(--primary-light)' },
        { icon: 'home',              label: 'Ration Card',           badge: '7-10 days', color: 'var(--accent-gold)' },
        { icon: 'shield-check',      label: 'Ayushman Services',     badge: 'Instant',   color: '#34d399' },
      ],
    ];

    let orderIdx = 0;
    let serviceSetIdx = 0;
    const orderIdEl   = mainCard.querySelector('h3');
    const statusEl    = mainCard.querySelector('p');
    const progressBar = mainCard.querySelector('.command-progress span');
    const listEl      = document.querySelector('.command-list');

    /* animate progress bar on load */
    if (progressBar) {
      const target = progressBar.style.width;
      progressBar.style.width = '0%';
      progressBar.style.transition = 'width 1.2s cubic-bezier(.4,0,.2,1)';
      setTimeout(() => { progressBar.style.width = target; }, 400);
    }

    function fadeSwap(el, newText) {
      el.style.transition = 'opacity .35s';
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = newText;
        el.style.opacity = '1';
      }, 360);
    }

    function updateOrder() {
      orderIdx = (orderIdx + 1) % orders.length;
      const o = orders[orderIdx];
      fadeSwap(orderIdEl, o.id);
      fadeSwap(statusEl, o.status);
      if (progressBar) {
        progressBar.style.transition = 'width 1s cubic-bezier(.4,0,.2,1), background .4s';
        progressBar.style.width = o.progress + '%';
        progressBar.style.background = o.color;
      }
    }

    function updateServices() {
      if (!listEl) return;
      serviceSetIdx = (serviceSetIdx + 1) % services.length;
      const set = services[serviceSetIdx];
      listEl.style.transition = 'opacity .35s';
      listEl.style.opacity = '0';
      setTimeout(() => {
        const rows = listEl.querySelectorAll('div');
        set.forEach((svc, i) => {
          const row = rows[i];
          if (!row) return;
          const strong = row.querySelector('strong');
          const small  = row.querySelector('small');
          const icon   = row.querySelector('i[data-lucide]');
          if (strong) strong.textContent = svc.label;
          if (small)  { small.textContent = svc.badge; small.style.color = svc.color; }
          if (icon)   { icon.setAttribute('data-lucide', svc.icon); icon.style.color = svc.color; }
        });
        if (window.lucide) window.lucide.createIcons();
        listEl.style.opacity = '1';
      }, 360);
    }

    /* pulse active row in list */
    function pulseRow() {
      if (!listEl) return;
      const rows = Array.from(listEl.querySelectorAll('div'));
      const activeIdx = Math.floor(Math.random() * rows.length);
      rows.forEach((r, i) => {
        r.style.transition = 'background .4s';
        r.style.background = i === activeIdx
          ? 'rgba(18,86,150,0.10)'
          : 'rgba(255,255,255,0.04)';
      });
    }

    setInterval(updateOrder,   4000);
    setInterval(updateServices, 8000);
    setInterval(pulseRow,       2500);
    pulseRow();
  })();

  /* ── Hero bg: pure CSS blob orbs (no JS needed) ────────────────────────── */

  /* ── (canvas slot — unused) ─────────────────────────────────────────────── */
  (function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles, mouse = { x: -9999, y: -9999 };
    const COUNT = 72, CONNECT_DIST = 130, MOUSE_RADIUS = 160;
    const COLOR_DOT = 'rgba(18,86,150,';
    const COLOR_LINE = 'rgba(18,86,150,';

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = canvas.width  = rect.width;
      H = canvas.height = rect.height;
    }

    function mkParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.6 + Math.random() * 1.4
      };
    }

    function init() {
      resize();
      particles = Array.from({ length: COUNT }, mkParticle);
    }

    function dist(a, b) {
      const dx = a.x - b.x, dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        /* mouse repulsion */
        const md = dist(p, mouse);
        if (md < MOUSE_RADIUS) {
          const force = (MOUSE_RADIUS - md) / MOUSE_RADIUS;
          p.vx += (p.x - mouse.x) / md * force * 0.06;
          p.vy += (p.y - mouse.y) / md * force * 0.06;
        }

        /* speed clamp */
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > 1.2) { p.vx *= 0.96; p.vy *= 0.96; }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0)  { p.x = 0;  p.vx *= -1; }
        if (p.x > W)  { p.x = W;  p.vx *= -1; }
        if (p.y < 0)  { p.y = 0;  p.vy *= -1; }
        if (p.y > H)  { p.y = H;  p.vy *= -1; }

        /* dot */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_DOT + '0.35)';
        ctx.fill();

        /* lines to nearby particles */
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const d = dist(p, q);
          if (d < CONNECT_DIST) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = COLOR_LINE + (0.18 * (1 - d / CONNECT_DIST)).toFixed(3) + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }

    init();
    draw();

    window.addEventListener('resize', init);
    const hero = canvas.closest('.hero') || document.body;
    hero.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
  })();

  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (form) {
    let started = false;
    form.querySelectorAll("input, select, textarea").forEach(input => {
      input.addEventListener('focus', () => {
        if (!started) {
          started = true;
          window.trackAnalyticsEvent('apply_started', {
            service: form.dataset.serviceName || form.querySelector("#pan-service-type")?.value || 'Unknown'
          });
        }
      });
    });
  }

  // Localization dynamic substitution engine
  function runOPDSLocalization() {
    const vars = window.OPDS_LOCALIZATION || {
      CITY: "Lucknow",
      LOCALITY: "LDA Colony",
      CSC_ID: "417409",
      ADDRESS: "One Point Suvidha Kendra, LDA Colony, Lucknow",
      PHONE: "+91 9473946181",
      WHATSAPP: "https://wa.me/919473946181",
      PROCESSING_TIME: "3-5 Business Days",
      PRICE: "₹150",
      SUPPORT_HOURS: "9:00 AM - 8:00 PM"
    };

    const walkDOM = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.nodeValue;
        let replaced = false;
        for (const [key, val] of Object.entries(vars)) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          if (regex.test(text)) {
            text = text.replace(regex, val);
            replaced = true;
          }
        }
        if (replaced) {
          node.nodeValue = text;
        }
      } else {
        if (node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
          node.childNodes.forEach(walkDOM);
        }
      }
    };

    // Also replace in inputs / placeholders
    document.querySelectorAll('input, textarea').forEach(el => {
      let plh = el.placeholder || '';
      let replaced = false;
      for (const [key, val] of Object.entries(vars)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        if (regex.test(plh)) {
          plh = plh.replace(regex, val);
          replaced = true;
        }
      }
      if (replaced) {
        el.placeholder = plh;
      }
    });

    walkDOM(document.body);
  }

  // Execute localization replacement after dynamic blocks (nav/footer) are rendered
  setTimeout(runOPDSLocalization, 150);

  // ── Live Feed infinite-scroll clone (Audit Issue #1) ─────────────────
  // Instead of duplicating lfp-cards in HTML, clone them via JS.
  const _lfpTrack = document.querySelector('[data-activity-ticker]');
  if (_lfpTrack) {
    const _origCards = [..._lfpTrack.querySelectorAll('.lfp-card:not([aria-hidden])')];
    _origCards.forEach(function(card) {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      _lfpTrack.appendChild(clone);
    });
  }

  // ── Section heading line alignment (Audit Issue #6) ──────────────────
  // Moved from inline <script> in index.html.
  setTimeout(function() {
    document.querySelectorAll('.section-head h2').forEach(function(h2) {
      var align = window.getComputedStyle(h2).textAlign;
      var parent = h2.closest('.section-head');
      if (parent) {
        if (align === 'center') {
          parent.classList.add('center-line');
        } else {
          parent.classList.add('left-line');
        }
      }
    });
  }, 100);
});
