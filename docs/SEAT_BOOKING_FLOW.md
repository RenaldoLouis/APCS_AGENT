# Seat Booking and Ticketing Flow Architecture

Current local implementation: **23 September 2026**. This includes public performance selection and optional international PayNow/bank-transfer checkout. The free-seating rules below supersede earlier reserved-row and Masterclass checkout rules. Offline checks do not certify deployment, live payment/email, or browser behavior.

## Business rules

- A winner selects their winning performance. Competition venue/date/time comes from the internal team's existing assignment; checkout must validate it.
- Public competition buyers choose an assigned winning performance. Each paid competition ticket includes one complimentary orchestra place following that performance's eventual orchestra session; no performer places are added to a public purchase. Direct public orchestra buyers instead choose an orchestra session and receive only their purchased places.
- A performance group's attendance is **paid public competition ticket quantities + paid winner ticket quantities + its performer count once if a paid winner booking exists**. A solo winner contributes one performer; an ensemble contributes its registered members. Three performers with two and four winner tickets produce nine attendees; five public tickets alone produce five. If those public tickets and two winner tickets both exist, the group has ten attendees.
- Pending, failed and expired purchases do not contribute paid attendance. A paid callback replay does not count a booking again because the group is derived from persisted paid bookings, not incremented by callbacks.
- Staff assign the entire paid performance group to one orchestra session after payment. Orchestra attendance uses free seating; customers and admins do not select numbered orchestra seats.
- Direct public orchestra buyers select their session and Presto/Allegro quantities. They receive no winner-member allowance and no numbered seat-selection option.
- Masterclass sales, add-ons, and complimentary Presto benefits are outside this system for new purchases. Existing records retain their historical entitlements.
- Numbered competition tickets retain the existing optional performer seat-selection add-on and paid-only manual assignment.

## Ownership and configuration

| Component | Responsibility |
| --- | --- |
| System Settings | Active event and eligibility schedule |
| Venue Settings | Named venues, tier/row capacity blueprint and images |
| Performer Sessions | Competition schedules and numbered competition seat generation |
| Ticket Settings | Prices, active ticket tiers, remaining competition add-ons and sale dates; hides/rejects retired Masterclass/orchestra-seat products |
| Orchestra Settings | Venue/date/time and performance-linked headcount quota; shows direct public attendance, held public demand, assigned performance groups and legacy allocations; never generates seats |
| Orchestra Assignments | Paid public/winner performance groups, full attendee quantity, session assignment/reassignment and assignment-email retry |
| Seat Occupancy | Numbered competition inventory and historical orchestra seat records; provider-confirmed cancellation of linked locked bookings |
| Admin Page | Awards and saved competition performer assignments |
| Public Customers | Booking status, competition seat assignment, manual-payment Mark Paid/cancellation, payment-instruction resend, reconciliation and confirmation resend; free-seating orchestra bookings cannot receive numbered seats |

Masterclass Settings/Assignments have been removed from the active Ticketing System menu. Their legacy source files and data remain available for historical maintenance.

## Identifiers and records

- Active event: `systemSettings/global.currentEventId`.
- Competition assignment key: `{venueId}_{date}_{timeRange}` in `sessionAssignments/{eventId}.assignments`.
- Physical seats: `seats{eventId}`, scoped by venue and `sessionId = {date}_{timeRange}`. Canonical physical identity is `(event, venue, session, row, number)` across legacy seat-document aliases.
- New booking: `publicBookings/{id}` with `ticketingVersion: 2`, `bookingType` (`winner`, `public_competition`, `public_orchestra`, or legacy competition), `paymentMode` (`paper_id` or `manual`), `venueName`, `performerCount`, `orchestraAttendanceTickets`, and `seatingMode` (`numbered` or `free`). The selected `registrantId` is the performance group key, not proof of buyer identity. `bookingType` controls entitlement. The backend derives winner performer count from `Registrants2025.performers` (solo fallback one); public purchases store zero.
- Performance group: `(eventId, registrantId)`. Paid public and winner ticket totals come from persisted paid version-2 bookings. The maximum performer count from paid winner bookings is added once; a public-only group adds zero performers. Staff reconcile intentional roster corrections separately.
- Saved orchestra assignment: `orchestraAssignments/{encodeURIComponent(eventId + '|' + registrantId)}`. It stores session/venue/date/time, paid and performer counts, total quantity, booking IDs, revision, admin identity/timestamp, delivered booking IDs and a short notification lease.
- `events/{eventId}.orchestraSessions[].freeSeatingAssigned` stores assigned version-2 performance-linked headcount. The existing `complimentaryQuota` field now covers public competition, winner ticket, and eligible performer places; `complimentaryClaimed` remains the separate legacy counter.
- `winnerOrchestraClaims` is retained for legacy cancellation/fulfillment. New purchases do not create personal claims or decrement session orchestra quota at checkout.

See [architecture](architecture.md) for field/API details and [the agreed implementation plan](TICKETING_FREE_SEATING_PLAN_2026-09-19.md).

## Customer data path

1. Load event config, sale eligibility and assigned winning performances. Public performance discovery is independent of the winner purchase-day award filter; public sale eligibility still applies at checkout. Historical Masterclass slots are excluded.
2. Winner and public competition buyers select a performance, which supplies assigned competition venue/date/time. Direct public orchestra buyers use the orchestra-session dropdown. Public selection does not prefill the winner's personal contact details.
3. Choose quantities and, for competition winners, any remaining add-ons/numbered competition seats. The checkout has four steps: entry, tickets, details, review/payment. There is no winner orchestra dropdown, quota banner or free-orchestra-seat step.
4. Submit buyer details, explicit `bookingType`, performance ID where applicable, paid session, ticket quantities, selected competition seats, active winner add-ons and optional `manualPayment`. Checkout rejects public winner add-ons, supplied orchestra seats, retired products and Masterclass products.
5. Backend verifies event, winner eligibility/competition assignment, session type, server pricing, quantities, physical ownership and paid capacity. New orchestra products accept only Presto/Allegro and no numbered seats/add-ons.
6. The checkout transaction reads inventory and the idempotency record before writes. Selected competition seats lock physically; all purchased quantities reserve paid capacity even without a selected seat.
7. Paper.id mode creates/saves an invoice and URL, starts a 30-minute cancellation-request timer, and polls status. Manual mode creates no invoice or timer, emails PayNow/bank-transfer instructions with the server total and booking ID, and shows a booking acknowledgement. Its inventory stays held until protected staff payment confirmation or cancellation. Both modes include booking type and payment mode in the checkout idempotency fingerprint; a matching retry reuses its booking.
8. After verified payment, confirmation includes the named booked venue, date/time, ticket summary and any competition seat details. Performance-linked orchestra assignment is pending until staff save it. Direct public orchestra confirmations say free seating within the purchased category.

## Capacity and assignment transactions

Direct public orchestra tier limits use the venue's tier seat counts. Their overall limit is total venue capacity **minus the configured performance-linked quota**. Pending Paper.id and manual bookings retain their paid-session capacity; a local timeout is not a release.

Staff assignment derives the full paid performance group inside a transaction and reads the event, prior assignment and direct public orchestra paid-session capacity. Assignment rejects insufficient quota instead of truncating attendee entitlement. The transaction removes the group's previous assigned count and adds the new count exactly once. It preserves the legacy `complimentaryClaimed` counter and checks `assigned + legacy claims <= performance quota` and `performance quota + direct public paid reservations <= venue capacity`.

Later paid purchases increase group demand without silently changing the previously confirmed assignment. Example: four performers plus three paid tickets are assigned as seven; another two tickets make current demand nine, with seven still assigned and two awaiting a staff update. Saving again assigns all nine and notifies every covered booking buyer. The performer allowance remains shared once across the group.

Orchestra Settings saves through an authenticated backend transaction. It reads fresh session counters and paid reservations, rejects a quota below existing allocations or above available capacity, and prevents deleting/moving an active session or converting a competition slot with assigned performers/active bookings. New orchestra sessions create no physical seat documents.

## Assignment communication

All new orchestra-admin endpoints require a Firebase ID token and current whitelist membership. Group discovery scans paid bookings in pages of 25 and loads purchases only for each visible winning performance. Session overview queries are scoped to the event/venue/date/time. No full registrant collection scan was added.

Saving an assignment sends a separate English email to each covered booking's saved buyer email. It uses the standard APCS email layout, including the logo header and copyright footer. It includes the orchestra venue/date/time, that booking's ticket quantity, the shared group headcount, and free-seating instructions. It replaces earlier orchestra assignment details. Payment-confirmation resends include an assignment only if that booking is covered by the saved assignment snapshot. Ticketing UI and email copy remain English-only until a proper translation feature is implemented; inline English/Indonesian copy is not used.

Successful deliveries are tracked by assignment revision and booking ID. Failed deliveries remain retryable from Orchestra Assignments. A two-minute lease prevents concurrent sends and reassignment while a send is active. An acknowledged delivery is not resent by Retry email. SMTP delivery and persistence cannot be atomic: a crash after send but before acknowledgement can still cause a duplicate on retry. There is no new background email worker.

Venue names for confirmations use the booking-time `venueName` snapshot, or its stored event for legacy bookings; neither callback route nor resend uses the current active event to name an old booking's venue.

## Payment, cancellation and historical records

Payment and inventory safety:

- Fulfillment checks stored invoice ID, amount/currency, booking state, event and selected-seat ownership before marking paid. Both public and unified webhook routes use this path.
- Paper.id staging callbacks may nest `invoice` under `data` and report the total as `total_amount`; the supplied production form puts `invoice` at the top level and reports its total as `amount`. Both are accepted only when the stored invoice ID and server-calculated booking total match. If both amount fields are present, both must agree. `amount_due` is never used as the paid total.
- Paper.id cancellation must be confirmed before unpaid inventory release. Thirty minutes is a cancellation-request point, not permission to unlock.
- Timer, sweeper and failure cleanup release only the booking's owned capacity/seats and legacy winner claims/quota. Failed or unknown invoice outcomes stay held for reconciliation.
- Seat Occupancy's protected cancellation action validates the complete booking-owned inventory set. Missing/inconsistent ownership, capacity or legacy quota aborts the local release; a late invoice change prevents unsafe release.
- The protected manual-payment Mark Paid endpoint rechecks pending status, no invoice, capacity reservation and physical seat ownership in a transaction. It records the staff actor, books selected seats and attempts the normal confirmation email. A retry does not pay again; failed email delivery can be retried from Public Customers.
- The protected manual-payment cancellation action requires staff confirmation that payment was not received, validates no invoice/link and all owned inventory, then releases the whole booking and records an audit. Paper.id pending no-invoice records remain blocked because invoice creation may still be in flight.
- Deletion remains restricted to reconciled terminal bookings. Numbered competition seat assignment cannot alter a free-seating orchestra booking.

Version-1/unversioned bookings are not silently converted. They keep original seats, Masterclass benefits, invoices and legacy cancellation rules. A winner with an existing paid legacy complimentary orchestra allocation is flagged and cannot be assigned a new version-2 group until staff reconcile that historical allocation. No live migration/reset is performed by this change.

Legacy seat generators still have different document-ID formats; regeneration is not a migration. Do not regenerate historical orchestra seats to implement free seating. The new Orchestra Settings workflow has no generation action.

## Verification

Run `node --test --test-reporter=spec apcs_service/audit/*.audit.cjs` from the project root. The suite includes checkout/failure boundaries, public five-for-five, mixed public/winner ensemble attendance, manual no-invoice settlement/cancellation, assignment/reassignment, quota, pagination, notifications and email details.

Local evidence is recorded in [progress](progress.md). Follow the [manual walkthrough](TICKETING_FREE_SEATING_WALKTHROUGH_2026-09-19.md) for owner UI acceptance. The 19 September free-seating implementation was verified offline. On 23 September, the owner paid one public and one eligible-winner staging invoice through their browser; the existing local backend received genuine nested Invoice Paid callbacks and marked both test bookings paid with matching invoice IDs and totals. Both booking contacts were the owner's designated test email and phone. The new flat production `invoice.amount` branch passed only offline regression and requires the running backend to load the edited code. The successful email-send flags do not prove inbox delivery, and Paper.id's internal notification recipient was not independently verified. Firestore contention, callback authentication/recovery, production callback behavior and browser acceptance remain separate checks; prior audit findings are preserved in the [historical audit](TICKETING_AUDIT_2026-09-06.md).
