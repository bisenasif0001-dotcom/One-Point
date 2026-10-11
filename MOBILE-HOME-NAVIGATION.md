# Step 9 — mobile homepage and navigation

Phone layout (up to 720px) prioritizes the existing service search and two direct actions: PAN task selection and MSME registration checkout. Existing Explore Services and Track Application remain available. Desktop composition remains in its original stylesheet; new task links are hidden above the phone breakpoint.

Home categories are compact, horizontally scrollable buttons instead of tall cards. The service directory heading and View All share a compact row. Repeated hero trust labels are reduced to the privacy label on phones; the desktop labels remain. Keyboard shortcut hint is hidden on phones and suggestion results scroll within the viewport.

The bottom navigation accounts for the device safe area and retains at least 44px targets. The extra floating WhatsApp button is hidden on phones; WhatsApp remains in the header and Contact remains in bottom navigation. Menu scrolling contains overscroll. Mobile menu input/close controls have touch targets and input text avoids automatic zoom.

Mobile menu creates a history marker: Back closes it, Escape/close return focus to the menu button, and Tab stays within visible menu controls. Desktop mouse hover behavior remains available; touch does not open the menu through simulated hover.

Hidden hero telemetry and decorative canvas work are skipped when initially loaded on a phone. Reduced-motion canvas rendering is deferred until its data initializes, fixing a pre-existing initialization error. Reduced-motion styles suppress decorative transitions.

Validation: before/after screenshots at 320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280 and 1440px. Check search placement, direct PAN task selection, overflow, menu Back/Escape/focus, 600x360 landscape and reduced motion. Browser tests block external services and use local assets; screenshots may omit externally loaded icons. Desktop screenshots are reviewed for preserved layout. Physical device/Safari verification remains for final release QA.
