# Public performer selection and international manual payment plan

Status: owner-approved and implemented locally on 23 September 2026. This plan supplements the current version-2 flow in `SEAT_BOOKING_FLOW.md` and `TICKETING_SYSTEM_GUIDE.md`; it does not certify deployed behavior.

## Confirmed business rules

- A public competition buyer chooses an assigned winning performance, rather than choosing its competition session. The selected performance supplies the already assigned venue, date, and time. A direct public orchestra buyer continues to choose an orchestra session from the dropdown.
- Every paid public competition ticket includes one complimentary, free-seating orchestra place. Five paid tickets mean five orchestra places. No performer allowance is added to a public purchase.
- The public buyer's orchestra places follow the selected performance's orchestra session when staff assign it. Registered-winner purchases continue to contribute paid ticket quantity plus the registered performers once per winning performance and event. For a three-member ensemble, two winner tickets followed by four more give `2 + 4 + 3 = 9` group places.
- The optional international payment route sends the existing PayNow/bank-transfer instructions adapted to the ticket booking, not a Paper.id invoice. The checkout label must describe PayNow/bank transfer, not credit card. Manual-payment bookings retain inventory until staff confirms payment or explicitly cancels them.

## Implementation path

1. **Entry and buyer identity:** Keep distinct public competition, registered-winner, and direct public orchestra paths in the ticket page. Reuse the assigned-performance search UI for public competition buyers, but avoid pre-filling the winner's personal email or treating the public buyer as the registrant. Clear ticket choices when the buyer type, performance, or orchestra session changes. Include the flow type in the checkout idempotency fingerprint.
2. **Authoritative checkout:** Validate the selected performance and assigned competition session on the server. Store a selected-performance reference separately from winner-purchase entitlement, and derive performer count and ticket quantity from authoritative records. A public competition booking contributes only its paid ticket quantity to orchestra attendance; a winner booking contributes paid quantity and, across the group, the performer count once. Direct public orchestra tickets retain their selected session and do not create another complimentary place.
3. **Assignment and capacity:** Derive the selected performance's total demand from paid public competition and winner bookings, adding registered performers once only when a paid winner booking exists. Assign the whole performance group to one orchestra session, including later purchases, and notify each covered buyer. Recheck winner quota, public orchestra paid reservations, and physical venue capacity transactionally. Show public and winner counts separately in the admin assignment display. Pending manual payments reserve their competition capacity but do not count as confirmed orchestra attendance.
4. **Manual payment checkout:** Present an opt-in checkbox on the review step for both competition and direct orchestra checkouts. Recalculate and store the server price, payment mode, booking reference, and inventory reservation transactionally. Do not create a Paper.id invoice or run the 30-minute Paper.id expiry for that mode. Send a ticket-specific buyer email with the existing PayNow/bank details, amount, booking reference, and clear instructions to submit payment proof. Return a booking acknowledgement page rather than an invoice waiting page.
5. **Staff settlement and cancellation:** Add an authenticated, audited backend Mark Paid path for manual bookings. It must re-read status, inventory ownership, capacity reservation, payment mode, and booking identity before marking paid, then trigger the standard ticket confirmation email. Add an authenticated manual-booking cancellation path that checks no Paper.id invoice exists, releases all booking-owned inventory atomically, and records the staff action. Keep provider-invoice cancellation rules unchanged for Paper.id bookings.
6. **Communication and docs:** Update buyer review/holding/confirmation and orchestra-assignment emails so public complimentary quantities and the assigned session are accurate. Update the waiting/acknowledgement copy and admin labels. Revise `SEAT_BOOKING_FLOW.md`, `TICKETING_SYSTEM_GUIDE.md`, `architecture.md`, and `progress.md` after implementation.

## Verification before handoff

- Add focused backend regressions for public five-for-five entitlement, ensemble repeat purchases, mixed public/winner purchases for one performance, direct orchestra purchases, no-invoice manual booking, idempotent retry, admin Mark Paid, cancellation, and capacity conflicts.
- Review all changed JSX branches and references; inspect the existing Register Playwright scenarios only if `Register.js` changes. Run the repository's offline ticketing audits and syntax checks. UI rendering remains for the owner's manual browser walkthrough under the project restrictions.

## Existing behavior that must change

- A supplied `registrantId` currently means winner entitlement. Public performance selection therefore needs a separate server-validated field and flow type.
- The existing registration payment email describes registration, PayNow and bank transfer; it is not a ticket-specific email and does not offer credit card payment.
- The existing checkout always creates a Paper.id invoice and 30-minute hold; the existing sweeper treats pending expired bookings as provider invoices.
- Public Customers currently marks pending bookings paid through a client Firestore transaction and asks staff to resend confirmation separately. The protected server path is needed for the manual-payment workflow.
- The current protected release action rejects pending bookings with no invoice because it assumes invoice creation may still be in flight. An explicitly tagged manual booking needs its own safe release case.
