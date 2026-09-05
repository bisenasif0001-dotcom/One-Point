/**
 * ENTERPRISE DESIGN SYSTEM REGISTRY & UTILITIES (enterprise-design-system.js)
 * One Point Service OS — Visual Constitution
 * 
 * Provides:
 * 1. Design Token Registry
 * 2. Theme Switching Registry
 * 3. Typography Verification
 * 4. Accessibility Helpers (Reduced motion & WCAG checking)
 * 5. Performance Diagnostics
 */

(function (window) {
  'use strict';

  const EDS = {
    version: '0.5.1',
    
    // 1. DESIGN TOKEN REGISTRY
    tokens: {
      colors: {
        brandPrimary: 'hsl(210, 79%, 33%)',
        brandAccent: 'hsl(43, 67%, 50%)',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#0284c7'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        xxl: '24px',
        giant: '32px'
      },
      radius: {
        none: '0px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        full: '9999px'
      },
      breakpoints: {
        mobile: '768px',
        tablet: '1024px',
        desktop: '1440px'
      },
      fonts: {
        header: 'Outfit',
        body: 'Inter'
      }
    },

    // 2. GLOBAL THEME SYSTEM
    theme: {
      current: 'light',

      init() {
        // Load initial theme from LocalStorage or system preference
        const savedTheme = localStorage.getItem('opds_theme') || localStorage.getItem('eds-theme');
        if (savedTheme) {
          this.set(savedTheme);
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          this.set(prefersDark ? 'dark' : 'light');
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          const activeTheme = localStorage.getItem('opds_theme') || localStorage.getItem('eds-theme');
          if (!activeTheme || activeTheme === 'auto') {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
          }
        });
      },

      set(themeName) {
        let resolvedTheme = themeName;
        if (themeName === 'auto') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          resolvedTheme = isDark ? 'dark' : 'light';
        }
        this.current = resolvedTheme;
        document.documentElement.setAttribute('data-theme', resolvedTheme);
        localStorage.setItem('opds_theme', themeName);
        localStorage.setItem('eds-theme', resolvedTheme);
        
        // Dispatch custom event for dynamic components (e.g. React state sync)
        if (typeof CustomEvent !== 'undefined') {
          const event = new CustomEvent('eds-theme-change', { detail: { theme: resolvedTheme } });
          window.dispatchEvent(event);
        }
      },

      toggle() {
        this.set(this.current === 'dark' ? 'light' : 'dark');
      }
    },

    // 3. ACCESSIBILITY COMPLIANCE CHECKS
    a11y: {
      checkContrast(foregroundHex, backgroundHex) {
        // Calculate contrast ratio between hex colors (WCAG 2.1 AA target: 4.5:1)
        const getRGB = (hex) => {
          const cleanHex = hex.replace('#', '');
          const r = parseInt(cleanHex.substring(0, 2), 16);
          const g = parseInt(cleanHex.substring(2, 4), 16);
          const b = parseInt(cleanHex.substring(4, 6), 16);
          return [r, g, b];
        };

        const getLuminance = (rgb) => {
          const a = rgb.map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
        };

        const l1 = getLuminance(getRGB(foregroundHex));
        const l2 = getLuminance(getRGB(backgroundHex));

        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        return {
          ratio: parseFloat(ratio.toFixed(2)),
          passed: ratio >= 4.5
        };
      },

      isReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    },

    // 4. PERFORMANCE DIAGNOSTICS & BUDGETS
    performance: {
      getLighthouseEstimate() {
        // Return standard performance parameters
        const timing = window.performance.timing;
        if (!timing) return null;
        
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domComplete - timing.domLoading;

        return {
          loadTimeMs: loadTime > 0 ? loadTime : 0,
          domReadyMs: domReady > 0 ? domReady : 0,
          passedBudget: loadTime < 1000
        };
      }
    }
  };

  // Auto-initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    EDS.theme.init();
  });

  window.EDS = EDS;

})(window);
