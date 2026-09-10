# Seat Booking and Ticketing Flow Architecture

Last checked against local code: **8 September 2026**.

For continuation priorities, confirmed decisions, and remaining work, see the [AI handover](TICKETING_HANDOVER_2026-09-07.md).

**Latest implementation re-review (8 September):** see [the current AI handover](TICKETING_IMPLEMENTATION_REVIEW_HANDOVER_2026-09-08.md). The baseline has 49 passing offline checks, but nine additional safety checks fail, including staff/public double allocation, duplicate cleanup refunds, winner entitlement validation, checkout retry, and invoice identity. The [approved launch plan](TICKETING_LAUNCH_READINESS_PLAN_2026-09-08.md) remains historical scope; it is not a readiness certificate.

> The integration is incomplete. Read [the ticketing audit](TICKETING_AUDIT_2026-09-06.md) before changing or operating the flow. This document describes current behavior; it does not certify safe allocation, expiry, or payment handling.

## Confirmed business rules — follow-up to the 6 September audit

These are owner-confirmed requirements. Implementation is partial; the current status and remaining defects are described below:

- When a buyer does not purchase the corresponding seat-selection add-on, an admin must be able to assign the seat from **Seat Occupancy**. The current page is read-only; the existing Public Customers paid-seat assignment is not the complete requested workflow.
- The winner's extra **one complimentary orchestra ticket** is available **once per winner per orchestra session**, across separate purchases. This clarification concerns the extra winner ticket; it does not remove the existing per-purchased-ticket benefit. An ensemble counts as one winning performance: it receives one extra winner ticket per orchestra session, not one per member. An unpaid booking that expires does not consume this extra ticket entitlement; the winning performance may claim it again when retrying. Restoring eligibility does not guarantee that session quota or reserved-row capacity remains available.
- Orchestra **reserved rows are for winners' complimentary tickets**. Ordinary paid-ticket buyers must not gain access merely by purchasing seat selection. All complimentary orchestra seats must stay within these reserved rows, including customer-selected seats and admin assignments from Seat Occupancy; they must not spill into ordinary paid rows.
- Admin assignment and inventory protection are separate: unassigned tickets still need capacity protection to prevent overselling. Admins may assign seats from Seat Occupancy only after payment is confirmed. Pending, expired, or failed bookings are not eligible for admin seat assignment.

## Configuration and ownership

| Component | Writes | Consumers |
| --- | --- | --- |
| System Settings | `systemSettings/global.currentEventId` | Admin context and backend active-event lookup |
| Venue Settings | `events/{eventId}.venues` including row/tier/count `seatConfig` | Scheduling, generators, pricing, maps |
| Performer Sessions | `venues[].sessions` and generated seat documents | Assignment manager, public sessions, orchestra/masterclass time options |
| Ticket Settings | Event `ticketTiers`, venue prices, `addOns`; global `ticketEligibility` | Public UI and backend pricing/eligibility |
| Orchestra Settings | Event `orchestraSessions`, quota, reserved rows, generation flags and seats | Public orchestra sales and winner complimentary selection |
| Masterclass Settings | Event `masterclassSessions` | Standalone masterclass selection without physical seat picking |
| Masterclass Assignments | `publicBookings/{bookingId}.masterclassAssignment` | Paid-only staff assignment of combined paid add-on and complimentary passes from one booking to one Masterclass session; email pending |
| Admin Page / SessionAssignmentManager | `sessionAssignments/{eventId}.assignments` | Eligible-winner lookup and assigned competition venue/date/time |
| Seat Occupancy | Read-only seat queries | Inventory counts and layout inspection |
| Public Customers | Booking and seat updates | Manual paid-seat assignment, paid override, deletion, email resend |

`Admin Page` is menu key `2`, and handles awards/performer assignment. `Public Customers` is separate menu key `16`. The old `SeatEvent` booking screen has a hidden menu entry; its exported seat-generation function is still used by Performer Sessions.

## Identifiers and storage

- Event: selected through `systemSettings/global.currentEventId`; public checkout now fails if the active event is missing or unreadable.
- Assignment key: `{venueId}_{date}_{timeRange}` in `sessionAssignments/{eventId}`. Values contain `registrantId`, display name/email, order, and category metadata.
- Seat query: collection `seats{eventId}`, filtered by `venueId` and `sessionId = {date}_{timeRange}`.
- Orchestra/masterclass session IDs: separate generated IDs in the event arrays; these are not the seat `sessionId` or assignment key.
- Generation flag: `sessionsSeatsGenerated[{venueId}_{date}_{timeRange}]`; some paths also read/write a legacy key without venue.
- Booking: auto-ID document in the unified `publicBookings` collection, with an `eventId` field.
- Registrant source: shared multi-year `Registrants2025`, with event filtering necessary.

### Existing seat ID incompatibility

The code currently contains two incompatible seat ID formats:

```text
SeatEvent / Performer Sessions: {venueId}-{areaType}-{row}{number}_{eventId}_{sessionId}
Orchestra Settings:            {venueId}-{areaType}-{row}-{number}_{eventId}_{sessionId}
```

The performer generator also recognizes a legacy ID without the venue prefix. It does not recognize the orchestra row-number format. Running both can duplicate a physical chair. Do not describe regeneration as universally safe: new-orchestra creation overwrites matching documents, while both regeneration implementations can race with purchases. A future format change requires inventory reconciliation and preserving booking references; merely changing the string is insufficient.

### Seat and booking statuses

Normal public fulfillment writes seats `available → locked → booked`. Legacy seats may use `reserved`; Seat Occupancy counts `booked` and `reserved`. A hold has `lockedAt` and `lockedByBookingId`; a finalized seat has `bookingId` and `assignedTo` with `userName`, `userEmail`, and `registrantName`.

Bookings use `pending`, `PAID`, `expired`, and terminal `failed` for checkout failure. Stored `createdAt` / `lockExpiresAt` are Firestore timestamps. The API serializes the expiry to ISO text. These states alone do not guarantee all purchased quantities have assigned seats.

## Public buyer flow

1. Load event configuration, eligible winners, and global eligibility through the backend.
2. Public Buyer visibility follows today's `Public` schedule entry in Asia/Jakarta when eligibility is enabled. Backend checkout now enforces the sale window and fails closed on settings read errors.
3. Select a competition, orchestra, or standalone masterclass session. Special-session base slots are now excluded from the ordinary competition list.
4. Choose ticket quantities. A masterclass session shows only the `masterclass` tier; other sessions show the non-masterclass tiers.
5. Optionally add `seat_selection_performer` once per manually chosen paid seat. It is represented by repeated IDs in `addOnIds`. The UI limits manual selections by ticket tier and add-on quantity.
6. Enter buyer name/email/phone; review and submit. The API recalculates total using event venue prices and add-on prices.
7. Open Paper.id and navigate to `/waiting-payment/{bookingId}` to poll payment state.

## Winner flow and existing assigned information

1. `getEligibleWinners` joins the active event's session assignments with registrants and their awards, applying the date schedule.
2. Selecting a winner supplies the **already assigned competition venue/date/time**. The user is not asked to choose that competition slot again.
3. The user chooses an **additional orchestra session** for complimentary tickets.
4. Purchased quantities refer to the assigned competition session. The UI still displays `min(purchased quantity + 1, remaining complimentary quota)`. The backend now considers prior personal claims but rejects insufficient quota instead of capping the benefit, and its two selected-seat validations disagree for repeat winners. These are open defects, not the intended business rule.
5. If the allowance is positive, show a separate orchestra step. The flat `seat_selection` add-on lets the buyer choose all complimentary orchestra seats manually.
6. Checkout includes the paid competition slot and, for winners only, the separate `orchestraSessionId` / `orchestraSelectedSeatIds`. A public buyer attending an Orchestra session uses its venue/date/time as the paid session but sends no complimentary orchestra-session claim.

Checkout validates the winner's existence/event/assigned competition session. Switching buyer type, winner, or session clears ticket quantities, paid/free seat selections, and add-ons before a new purchase is configured. New bookings track the personal claim in `winnerOrchestraClaims`, with an ensemble counted as one winning performance. Repeat purchases with seat selection still fail conflicting validation, and legacy claims are not comprehensively migrated.

## Masterclass benefits

Presto purchases produce a stored `freeMasterclassCount`; duplicate tier entries still need normalization so this count agrees with total purchased quantity. The `allegro_masterclass` add-on records additional purchases. Standalone paid Masterclass tickets remain attached to the session selected by the customer. The Admin Dashboard's **Masterclass Assignments** section lists paid bookings with complimentary or paid add-on passes and assigns every benefit pass from one booking to the same specific Masterclass session; the customer does not choose that later benefit session during checkout. Masterclass sessions have no attendee limit for now. The assignment is stored on the booking as `masterclassAssignment`.

**Assignment implemented; email pending:** Masterclass Assignments now includes paid `allegro_masterclass` add-on passes, complimentary passes, and add-on-only bookings. Staff assign all benefit passes from one paid booking to one Masterclass session; the saved assignment includes paid/free component counts. Standalone Masterclass tickets retain the customer-selected session. Assignment-email dispatch is still missing.

## Checkout, payment, and expiration

### Checkout

`PublicTicketController → PublicTicketService → DatabaseUtil → PublicTicketRepository`:

1. Read active event and pricing; perform current eligibility checks.
2. Recalculate ticket/add-on totals.
3. Transaction reads the checkout key, paid capacity, explicit selected seats and physical ownership, and (for winners) personal claim and orchestra quota; updates reservations/ownership and creates `publicBookings/{id}`. These protections still have the cross-writer, entitlement, and retry defects recorded in the latest handover.
4. Create Paper.id invoice and save `invoiceId` and `paymentUrl`; return payment URL and expiry.
5. Controller awaits the holding email before responding, but treats email failure as non-fatal.

Only explicitly selected seats are physically locked. Every seated ticket quantity is also checked against configured tier capacity in the checkout transaction, so an unselected ticket reserves sellable capacity without receiving an automatic physical-seat assignment. Public Orchestra buyers cannot select configured winner-reserved rows in either the map or checkout transaction. Public Customers can manually assign missing paid seats only after payment; its transaction rechecks the booking event, paid state, existing ownership, selected seat availability, and venue/session/tier counts. It does not fulfil missing complimentary orchestra seats. The requested assignment interface is Seat Occupancy.

### Payment

Both the dedicated public webhook and unified `/payment/webhooks/paper-id` route can call public fulfillment. The unified handler checks whether the invoice number is a public booking ID before falling back to competition registration.

Fulfillment uses the booking's saved event in a Firestore transaction, validates the reported amount and current lock ownership, then writes selected paid/free seats as `booked` and marks the booking `PAID`. A local deadline does not reject a still-held pending callback. Callback authenticity and idempotent confirmation-email dispatch remain open.

### Expiry and rollback

**Implemented lifecycle repair (7 September):** a local deadline requests Paper.id cancellation but does not itself release or take over inventory. The timer, sweeper, checkout-failure cleanup, seat reads, and payment fulfillment retain inventory until confirmed payment or a truthy cancellation result. Failed or unknown cancellation outcomes remain held for reconciliation.

The per-booking timer, five-minute sweeper started by `index.js`, and checkout-failure path use the same cancellation-first rule. They read the booking's saved event, owned seat locks, and quota before transaction writes. A local timeout does not make a lock available; lazy checkout takeover and client-side availability conversion were removed. If Paper.id cancellation succeeds, the transaction releases only locks still owned by that booking and refunds complimentary quota once. Failed or unknown cancellation retains inventory and records reconciliation information. The invoice due date may be later than the local deadline, so a local deadline is not proof of external cancellation.

`PublicTicketFailureRepository.failPublicTicketBooking` applies the same rule to invoice/save errors. A nonexistent booking (including a rejected transaction) causes no mutation. A completed cleanup is not repeated, including when cancellation is retried. Missing seats do not block other owned-seat releases; missing or inconsistent quota configuration is flagged for reconciliation.

Known invoice IDs survive an invoice/save error. Cancellation runs after the local transaction and records `pending`, `canceled`, or `failed`; an invoice attempt with no returned ID records `unknown`, never a cancellation claim. Failed bookings cannot be fulfilled by the payment handler or manual Mark Paid. Manual Mark Paid accepts only a current `pending` booking and requires every explicitly selected seat to still be locked by that booking; it cannot overwrite another booking's locks. Deletion is restricted to already-reconciled terminal bookings, whose confirmed cleanup has already released seats and quota. The public waiting page stops polling on `failed` and directs customers with a payment to contact APCS; the admin order details show cancellation and quota reconciliation status. Existing whitelist/database permissions have not been hardened by this change.

If Firestore cleanup itself fails, the transaction leaves allocations intact and the original checkout error is returned through the callback. The booking ID and cleanup error are logged for recovery; automatic retry/reconciliation is not implemented. Existing payment/expiry races, historical bookings, and unknown remote invoice outcomes remain outside this repair. See audit findings A–G for historical evidence and current repair status.

## Monitoring, communication, and verification

Seat Occupancy aggregates generated physical documents but does not represent every capacity-reserved, unselected ticket as an assignment demand. It ignores unassigned sold quantities and cannot show a pending owner's details from the currently stored lock fields alone. Duplicate Orchestra base slots have been removed. It is not a realtime listener.

Confirmation emails contain a booking ID, the main venue/date/time, and selected seat labels. They do not currently include the separate orchestra schedule, unassigned complimentary quantity, full masterclass/add-on benefits, or a public-ticket QR. Legacy registrant-token check-in is separate.

For findings, offline test invocation, confirmed business decisions and remaining repairs, and a user-run browser checklist, see [the audit](TICKETING_AUDIT_2026-09-06.md). No live data or UI behavior was certified by the static checks.

## Owner answers after handover review

Confirmed: Seat Occupancy should show the number of seats still needing assignment; assignment remains paid-only. Booking-ID/manual entry verification is sufficient and public-ticket QR check-in is not required. Whitelist membership intentionally grants all ticketing-admin powers; backend authorization must enforce that membership. Later Masterclass assignment details should be sent by email; that communication integration is still pending.

Public buyers enter their email. Winner selection defaults the editable buyer email to the registrant’s stored email; confirmation uses the saved booking `userEmail`. Keep public winner name selection without email verification. Confirmation email is communication, not identity proof. Backend winner eligibility and personal-claim records now exist; repeat-purchase selection and quota-capped benefits still require repair.

**Implemented locally:** keep seats held until Paper.id confirms payment or successful cancellation, even beyond 30 minutes. Confirmed payment finalizes the booking and retains its inventory; successful cancellation permits unpaid inventory release. Failed cancellation or an unknown invoice outcome keeps inventory unavailable for reconciliation. Provider contract/deployment verification and recovery automation remain open.

**Assignment implemented; email pending:** Masterclass Assignments now includes paid `allegro_masterclass` add-on passes, complimentary passes, and add-on-only bookings. Staff assign all benefit passes from one paid booking to one Masterclass session; the saved assignment includes paid/free component counts. Standalone Masterclass tickets retain the customer-selected session. Assignment-email dispatch is still missing.

These owner decisions are resolved. Provider contract verification, recovery automation, and remaining fulfillment work remain engineering work; see the handover for the preserved original answers and repair priorities.

## Launch-hardening update — 8 September 2026

Public checkout now fails closed when the active-event or sale-eligibility settings cannot be read. The server derives the session type from the saved event catalogue; client product flags are checked against that type, and amount/add-on validation uses configured prices. Raw client ticket metadata and seat-label arrays are still persisted and need server normalization. A Masterclass product cannot be used to bypass seated capacity, and paid Orchestra capacity excludes winner-reserved rows.

For new checkouts, `ticketSeatOwnership` stores the canonical physical identity `(event, venue, session, row, number)`. This blocks competing new public checkouts that both use the ledger. Staff/legacy writers and preexisting occupied aliases can bypass it; a staff/public double-allocation check currently fails. `ticketCapacity` keeps transactional paid-pool reservations per session/tier; manual physical assignment must not decrement this reservation again. `winnerOrchestraClaims` keeps the one personal winner benefit per event, winning performance, and Orchestra session; confirmed unpaid cancellation releases only that booking's active claim.

The checkout client sends an idempotency key. A simple identical retry returns the original booking/invoice. The current implementation does not bind that key to the cart or reject canceled invoice replay; those follow-up checks fail. The booking persists its payment URL, and `/waiting-payment/:id` can discover public-booking status and the payment link without router state. A local deadline displays `00:00` but continues polling until the backend reports a confirmed paid, canceled, or failed state.

**Fulfillment follow-up:** Masterclass Assignments now includes both `freeMasterclassCount` and `allegro_masterclass` add-on passes in one paid-booking assignment. It records the complimentary and paid components alongside the total, always assigning them to the same selected Masterclass session. Seat Occupancy no longer treats locally old locks as available and avoids duplicating Orchestra slots as competition sessions.

## Implementation review limits — 8 September 2026

The current [handover and diagnostic tests](TICKETING_IMPLEMENTATION_REVIEW_HANDOVER_2026-09-08.md) supersede broad safety claims in historical updates. Canonical ownership is only effective where every writer participates. Public Customers assignment/Mark Paid and legacy inventory writes have not been integrated with that boundary; generators can still reset raw seat records. Capacity/complimentary refunds are not exactly-once under overlapping failed-booking cleanup.

Winner benefits need one authoritative, quota/capacity-capped calculation shared by checkout and the UI. Current pretransaction and transactional selected-seat counts disagree for repeat winners; without the add-on a forged request can supply excess complimentary seats. The paid/free assignment interface in Seat Occupancy and its unassigned demand counts remain missing.

**Payment scope:** Invoice Paid is the sole normal fulfillment signal. Payment In details may remain in Paper's dashboard; do not require both event types before fulfillment. Provider callback registration requirements are separate from processing. Authenticate and match the invoice, recover missed/failed callbacks and unknown outcomes, and verify cancellation semantics before releasing inventory. Both callback routes currently lack complete verification/reliable delivery recovery.

Verification: 49 existing checks pass; 9 new expected-safety checks fail. These are offline mocked-data checks, not Firestore contention, provider integration, browser, or 500-buyer acceptance evidence. No application repair was made during this re-review.

## Follow-up repair — 8 September 2026

The nine re-review regressions now pass in the offline fixture (**58 passed, 0 failed** across the three ticketing audit files). `ticketSeatOwnership` is now written and checked by public checkout, Public Customers paid-seat assignment/Mark Paid, and the legacy token-seat confirmation writer. Each checks existing physical aliases with the same event/venue/session/row/number before reserving a seat; a manual physical assignment does not alter `ticketCapacity`, because paid quantity was reserved at checkout.

Winner allowance is calculated transactionally as the available reserved-row/quota capacity, then per-purchased-ticket benefit, then the still-unclaimed personal benefit. The public winner response includes active claimed Orchestra sessions so the client can preview that calculation; checkout remains authoritative and can require the buyer to review a changed cart under concurrent demand. Complimentary seat IDs require the complimentary seat-selection add-on and must exactly equal the awarded allowance.

`ticketCheckoutKeys` now stores an event-scoped normalized request fingerprint. Replaying the same pending cart returns its existing attempt; a changed cart or expired/failed attempt is rejected rather than returning a stale invoice URL. The client preserves a matching attempt key in session storage across reloads and starts a new attempt when the cart changes.

Invoice Paid fulfillment now requires the provider `invoice.id` to equal the stored `invoiceId` as well as the expected amount. Callback authentication, currency evidence, durable callback/reconciliation recovery, configuration migration safeguards, backend ticketing-admin authorization, assignment-email delivery, emulator contention testing, Paper staging verification, and the 500-buyer rehearsal remain required before launch sign-off.
