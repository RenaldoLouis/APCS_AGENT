# Public Customers — Pending Buyer Contact Corrections

Added 25 October 2026. Owner browser acceptance only; implementation verification used source review and offline substitutes. Use local/test bookings for any save/payment check.

## Staff workflow

1. Open **Public Customers**, choose the event, and find a Pending ticket booking. Choose **Edit Buyer Contact** and verify the displayed booking ID and prefilled buyer name, email and phone.
2. Correct the intended contact fields, then choose **Save Contact Details**. On success the dialog closes and the list refreshes. Search by the new contact if an old-contact search hides the corrected row.
3. Saving sends no email. Future APCS payment instructions/confirmation use the saved booking contact. Existing Paper.id invoice contacts, already sent emails and delivery-history flags remain unchanged. Use existing resend actions separately only when intended.
4. If save reports that payment/contact changed, close and Refresh, then review before reopening. For an uncertain/lost response, Refresh and check saved values before retrying. No automatic retry runs.

## Owner acceptance scenarios

- Pending manual and Paper.id bookings both show the action. Paid (`PAID`/`paid`), expired, failed and archived bookings do not. Documentation-only records retain their separate editor.
- Save valid buyer name/email/phone corrections. Refresh to confirm persistence and verify buyer name and contact search. Repeat on a legacy row with only the userName alias if available.
- Empty/oversized names, malformed or multiple email addresses, mail-header injection and invalid phone values reject with the draft retained. Phone is 6–20 digits, maximum 40 characters, allowing spaces, parentheses, hyphens and an optional leading +. Valid international formatting is preserved apart from surrounding whitespace.
- Cancel does not save. Switching events clears the draft. During save, modal dismissal, edits, repeated saves and event changes are blocked.
- Open a test pending booking in two staff sessions. Save different contact corrections in the first, then try the stale second editor: it must refuse to overwrite the first correction. Reopen after Refresh to make another intended edit.
- Open a pending test booking and complete its payment in the separate test payment flow before saving contact: contact save must refuse. Payment remains paid and seats remain booked. Real concurrent/provider behavior is still a live acceptance check; offline tests simulate transaction retries.
- Compare tickets, price, paid quantity, session, deadlines, selected seat IDs and payment URL before/after contact save. They must match. The issued Paper.id invoice retains its original contact, as requested.
- In an approved local/test checkout, correct a pending booking, then retry the original checkout details/key: it must reuse the original reservation/invoice and retain corrected contact details. Changing the cart/contact in the original checkout request is still a different-cart conflict under the existing retry rule.
- After payment of that test booking, verify confirmation uses the corrected buyer contact and the original selected seats become booked. For a booking with unselected numbered tickets, the existing **Assign Missing Seats** action still works only after payment. The missing-seat filter/count must continue using ticket quantity and assigned seat IDs.
- Verify existing Notes, payment recovery, manual instructions, paid confirmation Resend, one-time alternate email, seat assignment and documentation-customer actions keep their existing behavior. No registrant or group-announcement contact should be modified by this correction.

## Release and limits

Release the backend before or with the frontend and restart it normally. No rules, indexes, migration, new provider call or new email template is needed. Offline assertions do not prove deployed authentication/rules, real Firestore contention, Paper.id payment, browser layout or inbox delivery. No live database write, provider call, email, browser, deployment or restart was performed as part of implementation.

See [architecture](architecture.md), [ticketing flow](SEAT_BOOKING_FLOW.md), [staff guide](TICKETING_SYSTEM_GUIDE.md) and [progress](progress.md).
