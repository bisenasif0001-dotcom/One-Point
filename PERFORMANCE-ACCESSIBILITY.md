# Step 12 — local performance and accessibility

Implemented locally on the home, service directory and checkout pilot. Desktop branding/layout is retained. Live deployment and physical-device verification remain separate.

## Changes

- The below-fold home customer image now loads lazily and decodes asynchronously. Its existing absolutely positioned image/container geometry remains unchanged. The 722,197-byte PNG remains available when the customer scrolls to that section; this change defers transfer rather than compressing the original.
- The service directory declares its compact mobile layout in the initial HTML and builds filter/category disclosures before the shared app releases first paint. This removes the observed late desktop-to-mobile layout jump.
- Three pilot pages have a first keyboard stop, “Skip to main content” / “Skip to checkout form”, with a visible, high-contrast focus treatment. Enter focuses the main region.
- Mobile headings can wrap when text is enlarged. The checkout action bar allocates space to both price and action, wraps text, and reserves bottom space using its actual observed height.
- Global CSS honours reduced motion. The decorative dashboard timer is skipped on phones/reduced-motion preference; the unused legacy canvas initializer also checks reduced motion. This is not a claim that every older JavaScript animation has been audited.
- Asset versions were updated on the pilot pages so the new styles/scripts replace cached versions.

## Measurement method and evidence

`npm run test:performance` measures three uncached runs per page in headless desktop Chrome emulating 390×640, CPU slowed 4×, with three seconds of observation after load. It serves local files, excludes external fonts/icons/media and transactional APIs equally, and does not throttle network. The static preview has no production compression/CDN behaviour. Timing varies with the host load; compare medians, not individual samples.

Reports: [before](artifacts/performance-before.json) and [after](artifacts/performance-after.json). The final median table is generated in `artifacts/performance-summary.json`.

Final three-run medians (milliseconds for paint):

| Page | Before LCP | After LCP | Before observed shift | After observed shift |
| --- | ---: | ---: | ---: | ---: |
| Home | 3380 | 2812 | 0 | 0 |
| Directory | 1680 | 1700 | 0.658 | 0 |
| Checkout | 1136 | 1324 | 0 | 0 |

Home median paint improved about 17%; it still exceeds the 2.5-second target in this lab. Directory paint was essentially unchanged. Checkout timing was slower in these runs; no checkout speed improvement is claimed. Timing variance and small additive accessibility code require continued profiling rather than interpreting this as production user latency.

Confirmed transfer result: the initial home observation no longer requests `happy_indian_customer.png`, saving about 722 KB of local resource bodies (small script/style additions slightly offset this). The directory's observed layout-shift total fell to zero in the final three runs. Home paint timings improved in the pilot measurement, but not every page/timing improved and the full performance target is not declared achieved.

These are lab observations, **not production 75th-percentile LCP/INP/CLS**. The script's layout-shift number sums shifts without recent input during its short observation window; it is not the full CLS session-window algorithm. INP is not measured. There is no valid claim of meeting the plan's field targets without real traffic. Large shared CSS/JS bundles still exist; broad removal/splitting is deferred until dependency coverage across remaining pages is available. File size alone is not proof that all of it is a runtime bottleneck.

## Verification

- `npm run check`: JavaScript syntax.
- `npm run test:accessibility`: keyboard entry/focus destination, visible form labels, skip-link contrast ≥4.5:1, no horizontal page overflow at 320/360/375/390/414/430/600/768/1024/1280/1440px on all three pages. Simulated 200% text at 390px additionally checks heading clipping and page overflow; screenshots were inspected and the discovered clipping/action-bar crowding fixed.
- `npm run test:mobile-home`, `test:mobile-services`, `test:mobile-checkout`: existing navigation, search, filter, task selection, drawer focus/history, upload-preview and checkout checks at eleven widths.
- Preview `http://127.0.0.1:4180/index.html` returned HTTP 200.

See `artifacts/accessibility-test.json` and `artifacts/ux-pilot/text-200-*.png`. The text simulation changes computed text sizes in the main region; it does not substitute for Safari/Android OS font settings or browser zoom. This is a focused audit, not a complete WCAG certification. Screen-reader testing, all-text contrast across every service, actual keyboard/camera/payment-app behaviour and slow-network physical-device tests belong to Step 13. No real payment or live server change was made.
