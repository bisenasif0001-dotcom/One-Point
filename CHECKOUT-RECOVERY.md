# Step 8 — local checkout recovery

Applicant fields save while typing, including incomplete inputs. Drafts expire after 24 hours; older undated drafts are discarded. Clear saved applicant details resets these fields. Saved drafts do not include document bytes, card details or authentication tokens. Browser storage contains applicant contact details; shared-device users can clear them.

A checkout intent retains a random request key for the same applicant, items, configuration, gateway and method for 24 hours. Cancellation leaves checkout open with a recovery message. Repeat submission reopens the existing order/payment session. Changed checkout details use a different intent; existing orders remain in the account. Successful verification clears the intent and draft. Captured payment replay opens status rather than the gateway.

The backend compares the stored request identity before replay, refuses changed applicant/items, and returns payment status. A matching guest retry can recover its guest session after a lost response. Active submission and an open gateway prevent overlapping Pay actions. Failed gateway script loads can be retried. Authorization tokens are renewed for quote/order/verification; no artificial payment deadline is introduced.

Success pages initially say Checking payment status. Missing order ID or unavailable status API cannot show Confirmed or trigger a success redirect. Only a verified captured/paid/success server status enables the redirect.

Validation: isolated booking and simulated Razorpay verification, cancelled payment reopening the same order, changed applicant rejection, applicant recovery/expiry/reset, unavailable verification status, and responsive applicant layout at 11 widths. No production orders, external messages or real charges are generated.

Limits: external gateway session expiry still depends on the gateway. If money was debited, check existing order status before another payment. File selections must be selected again after refresh; uploaded files remain attached to the existing order. Physical phones and real gateway cancellation are not yet verified.
