// Global fetch interceptor to strip AI agent thoughts/traces and paths from API responses
(() => {
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  function sanitizeData(val: any): any {
    if (val === null || val === undefined) {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeData);
    }
    if (typeof val === "object") {
      const cleaned: any = {};
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

  window.fetch = async function(...args: any[]) {
    try {
      const response = await originalFetch.apply(this, args as any);
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
    } catch (err: any) {
      if (err && err.message) {
        err.message = sanitizeData(err.message);
      }
      throw err;
    }
  };
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './enterprise-design-system.css';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
