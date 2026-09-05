(function prepareInitialRender() {
  var root = document.documentElement;
  var released = false;

  function reveal() {
    if (released) return;
    released = true;
    root.classList.remove("opds-booting");
    root.classList.add("opds-ready");
    if (window.__OPDS_BOOT_FALLBACK__) {
      window.clearTimeout(window.__OPDS_BOOT_FALLBACK__);
    }
  }

  root.classList.add("opds-booting");
  window.__OPDS_REVEAL_INITIAL_RENDER__ = reveal;
  window.__OPDS_BOOT_FALLBACK__ = window.setTimeout(reveal, 8000);
  window.addEventListener("load", reveal, { once: true });
})();
