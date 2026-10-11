# Physical-device release checks — not yet run

Record actual device, OS/browser version, URL/build, date and result for each row. Use local/LAN access for UI checks and an HTTPS provider sandbox for payment-app checks. A phone's `127.0.0.1` refers to that phone, so the computer's preview must be reached through an appropriate LAN address for local tests.

| Device/browser | Portrait + landscape | Large OS text / zoom | Keyboard + bottom action | Camera/gallery/PDF | UPI app return | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Android / Chrome | Not run | Not run | Not run | Not run | Not run | Pending |
| iPhone / Safari | Not run | Not run | Not run | Not run | Not run | Pending |
| Slower Android phone | Not run | Not run | Not run | Not run | Not run | Pending |

For each device:

1. Search for PAN, choose the exact task, go back and confirm the selection. Choose direct MSME and configured visiting cards. Confirm the selected service and server total agree.
2. Complete guest details with required email and blank address. Test returning customer and another applicant. Reload a partial draft, switch applicants, and clear saved details.
3. Open the keyboard in each required field. Scroll the final field into view, dismiss keyboard and check the main action, safe area and price drawer. Check native Back/Escape-equivalent dismissal and focus where the browser supports it.
4. Capture a photo, select an existing image/PDF, preview, cancel replacement, replace/remove it, reject an empty/oversized/unsupported file. Interrupt a transfer and retry. Check saved files on the existing order; receiving a document must not claim operator approval.
5. In a configured payment sandbox: cancel and resume, double tap, switch to UPI app and return, fail verification/network, and reload. Compare order/payment references; pending must not appear confirmed. Once paid, retry must be blocked.
6. Track the same order, send a later document, verify applicant privacy and account ownership. Check receipt/invoice access from the owning account.
7. Use 200% text/zoom, reduced motion and VoiceOver/TalkBack. Check full heading/action text, form labels, error announcement, dialog focus and usable tap targets.
8. Repeat one complete flow on slow/intermittent Wi-Fi/mobile data. Record screenshots and exact steps for failures; do not record applicant documents or sensitive details in public issue reports.

Release sign-off remains pending until actual results are entered and blocking failures are fixed. Gateway session expiry, bank reversals and refunds follow the configured provider's verified behaviour; do not infer them from the local simulator.
