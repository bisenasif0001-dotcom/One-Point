# Step 11 — local mobile checkout and uploads

The existing applicant form remains single-column on phones, with mandatory email and optional address/invoice details. The fixed mobile action respects the bottom safe area and has a 44px minimum target. If an editing field and visual viewport shrink indicate a keyboard, the fixed action is hidden and inline Continue/Pay buttons become available. Detection ignores pinch zoom and recalculates after focus/orientation changes. Step headings receive focus and scroll margins account for the header. Mobile review details use compact label/value rows so reading applicant and document details takes less scrolling.

Price breakdown is a native modal dialog: Enter/Space opens it, Escape/Back/backdrop/close dismiss it, focus returns to the opener, and background content is handled by browser modal semantics. Short viewports can scroll the breakdown. Moving to desktop width closes an open phone modal. Prices and payment calculations are unchanged.

Selected images have local thumbnails. PDF and image previews open the selected file in the browser via a temporary object URL; browser PDF support may vary. These previews do not upload the file or persist its contents. URLs are revoked on removal/replacement/page exit.

Replace retains the old selection until a supported non-empty file up to 3 MB is accepted. Cancelling or choosing an unsupported replacement keeps the original. Browse clears camera capture and supports multiple files; Camera requests the rear camera with one JPEG/PNG selection, subject to device support. Duplicate files in a single selection are filtered. A valid new selection clears an earlier file rejection message.

The order-linked upload page also provides camera capture and local previews. It preserves failed selections for retry, clears previews on success, and distinguishes files checked, received and failed rather than counting failures as sent. Server authentication, CSRF, byte/signature validation, deduplication and operator review remain required.

Validation: browser geometry at 11 widths, native drawer Enter/Escape/Back/focus, file replacement cancel/error/success, decoded image preview, camera/browse rules, heading focus, simulated viewport keyboard, short landscape and desktop resize. Existing applicant recovery and isolated real-byte upload/interrupted retry/simulated payment tests pass. Only disposable local test orders/files are used.

Release limits: physical Android keyboard, iPhone Safari, actual camera picker and payment-app switching require real-device QA in Step 13. Real payments and production deployment were not performed. Refreshed pages require selecting files again; previously uploaded order files stay attached to that order, and removing a local selection does not delete an already-uploaded server document.
