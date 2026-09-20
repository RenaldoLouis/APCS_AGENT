# Seat Booking and Ticketing Flow Architecture

Current local implementation: **19 September 2026**. The free-seating business rules below supersede the earlier orchestra reserved-row and Masterclass checkout rules. Historical audits remain linked for payment/inventory findings; this document does not certify deployment or live-provider behavior.

## Business rules

- A winner selects their winning performance. Competition venue/date/time comes from the internal team's existing assignment; checkout must validate it.
- A winning performance's orchestra attendance is **all its paid ticket quantities for the event plus its performer count once**. A solo winner contributes one performer; an ensemble contributes its registered members. Four ensemble members with purchases of three and two tickets produce nine attendees, even when different parents buy.
- Pending, failed and expired purchases do not contribute paid attendance. A paid callback replay does not count a booking again because the group is derived from persisted paid bookings, not incremented by callbacks.
- Staff assign the entire paid winner group to one orchestra session after payment. Orchestra attendance uses free seating; customers and admins do not select numbered orchestra seats.
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
| Orchestra Settings | Venue/date/time and winner headcount quota; shows paid public attendance, held public demand, assigned winners and separate legacy allocations; never generates seats |
| Orchestra Assignments | Paid winner groups, full attendee quantity, session assignment/reassignment and assignment-email retry |
| Seat Occupancy | Numbered competition inventory and historical orchestra seat records; provider-confirmed cancellation of linked locked bookings |
| Admin Page | Awards and saved competition performer assignments |
| Public Customers | Booking status, existing competition seat assignment, Mark Paid, reconciliation details and confirmation resend; new free-seating orchestra bookings cannot receive numbered seats |

Masterclass Settings/Assignments have been removed from the active Ticketing System menu. Their legacy source files and data remain available for historical maintenance.

## Identifiers and records

- Active event: `systemSettings/global.currentEventId`.
- Competition assignment key: `{venueId}_{date}_{timeRange}` in `sessionAssignments/{eventId}.assignments`.
- Physical seats: `seats{eventId}`, scoped by venue and `sessionId = {date}_{timeRange}`. Canonical physical identity is `(event, venue, session, row, number)` across legacy seat-document aliases.
- New booking: `publicBookings/{id}` with `ticketingVersion: 2`, `venueName`, `performerCount`, `orchestraAttendanceTickets`, and `seatingMode` (`numbered` or `free`). Performer count is a snapshot from `Registrants2025.performers`, with solo fallback one. Client counts are ignored.
- Winner group: `(eventId, registrantId)`. Paid ticket totals come from persisted paid version-2 bookings for that group. The maximum recorded performer count is added once; an administrator must reconcile intentional roster corrections separately.
- Saved orchestra assignment: `orchestraAssignments/{encodeURIComponent(eventId + '|' + registrantId)}`. It stores session/venue/date/time, paid and performer counts, total quantity, booking IDs, revision, admin identity/timestamp, delivered booking IDs and a short notification lease.
- `events/{eventId}.orchestraSessions[].freeSeatingAssigned` stores assigned version-2 winner headcount. `complimentaryClaimed` remains the separate legacy quota counter.
- `winnerOrchestraClaims` is retained for legacy cancellation/fulfillment. New purchases do not create personal claims or decrement session orchestra quota at checkout.

See [architecture](architecture.md) for field/API details and [the agreed implementation plan](TICKETING_FREE_SEATING_PLAN_2026-09-19.md).

## Customer data path

1. Load event config, sale eligibility and eligible assigned winners. Historical Masterclass slots are excluded from ordinary session sales as well as the explicit Masterclass list.
2. Winner selection supplies the already assigned competition venue/date/time and ensemble roster. Public buyers select a sale session.
3. Choose quantities and, for competition winners, any remaining add-ons/numbered competition seats. The checkout has four steps: entry, tickets, details, review/payment. There is no winner orchestra dropdown, quota banner or free-orchestra-seat step.
4. Submit buyer details, winning-performance ID where applicable, paid session, ticket quantities, selected competition seats and active add-ons. Checkout rejects supplied winner orchestra sessions, orchestra seat IDs, retired seat-selection add-ons and Masterclass products.
5. Backend verifies event, winner eligibility/competition assignment, session type, server pricing, quantities, physical ownership and paid capacity. New orchestra products accept only Presto/Allegro and no numbered seats/add-ons.
6. The checkout transaction reads inventory and the idempotency record before writes. Selected competition seats lock physically; all purchased quantities reserve paid capacity even without a selected seat.
7. Create/save Paper.id invoice and URL. The waiting page polls server payment status. A repeated matching pending checkout key reuses its booking; changed carts and terminal attempts do not silently reuse a payable invoice.
8. Payment confirmation includes the named booked venue, date/time, ticket summary, selected competition seats and unassigned competition quantities. Winner orchestra assignment is pending until staff save it. Public orchestra confirmations say free seating within the purchased category.

## Capacity and assignment transactions

Public orchestra tier limits use the venue's tier seat counts. The overall public limit is total venue capacity **minus the configured winner quota**, rather than a set of reserved rows. Pending public payments retain capacity; a local timeout is not a release.

Staff winner assignment derives the full paid group inside a transaction and reads the event, prior assignment and paid session capacity. Assignment rejects insufficient quota instead of truncating attendee entitlement. The transaction removes the group's previous assigned count and adds the new count exactly once. It preserves the legacy `complimentaryClaimed` counter and checks `assigned + legacy claims <= winner quota` and `winner quota + paid reservations <= venue capacity`.

Later paid purchases increase group demand without silently changing the previously confirmed assignment. Example: four performers plus three paid tickets are assigned as seven; another two tickets make current demand nine, with seven still assigned and two awaiting a staff update. Saving again assigns all nine and notifies every covered booking buyer. The performer allowance remains shared once across the group.

Orchestra Settings saves through an authenticated backend transaction. It reads fresh session counters and paid reservations, rejects a quota below existing allocations or above available capacity, and prevents deleting/moving an active session or converting a competition slot with assigned performers/active bookings. New orchestra sessions create no physical seat documents.

## Assignment communication

All new orchestra-admin endpoints require a Firebase ID token and current whitelist membership. Group discovery scans paid bookings in pages of 25 and loads purchases only for each visible winning performance. Session overview queries are scoped to the event/venue/date/time. No full registrant collection scan was added.

Saving an assignment sends a separate bilingual email to each covered booking's saved buyer email. It includes the orchestra venue/date/time, that booking's ticket quantity, the shared group headcount, and free-seating instructions. It replaces earlier orchestra assignment details. Payment-confirmation resends include an assignment only if that booking is covered by the saved assignment snapshot.

Successful deliveries are tracked by assignment revision and booking ID. Failed deliveries remain retryable from Orchestra Assignments. A two-minute lease prevents concurrent sends and reassignment while a send is active. An acknowledged delivery is not resent by Retry email. SMTP delivery and persistence cannot be atomic: a crash after send but before acknowledgement can still cause a duplicate on retry. There is no new background email worker.

Venue names for confirmations use the booking-time `venueName` snapshot, or its stored event for legacy bookings; neither callback route nor resend uses the current active event to name an old booking's venue.

## Payment, cancellation and historical records

Existing payment safety remains in force:

- Fulfillment checks stored invoice ID, amount/currency, booking state, event and selected-seat ownership before marking paid. Both public and unified webhook routes use this path.
- Paper.id cancellation must be confirmed before unpaid inventory release. Thirty minutes is a cancellation-request point, not permission to unlock.
- Timer, sweeper and failure cleanup release only the booking's owned capacity/seats and legacy winner claims/quota. Failed or unknown invoice outcomes stay held for reconciliation.
- Seat Occupancy's protected cancellation action validates the complete booking-owned inventory set. Missing/inconsistent ownership, capacity or legacy quota aborts the local release; a late invoice change prevents unsafe release.
- Manual Mark Paid remains paid-state/ownership checked. Because winner groups derive persisted paid records, manually marked version-2 purchases appear in assignment demand without a separate counter update.
- Deletion remains restricted to reconciled terminal bookings. Numbered competition seat assignment cannot alter a free-seating orchestra booking.

Version-1/unversioned bookings are not silently converted. They keep original seats, Masterclass benefits, invoices and legacy cancellation rules. A winner with an existing paid legacy complimentary orchestra allocation is flagged and cannot be assigned a new version-2 group until staff reconcile that historical allocation. No live migration/reset is performed by this change.

Legacy seat generators still have different document-ID formats; regeneration is not a migration. Do not regenerate historical orchestra seats to implement free seating. The new Orchestra Settings workflow has no generation action.

## Verification

Run `node --test --test-reporter=spec apcs_service/audit/*.audit.cjs` from the project root. The suite includes checkout/failure boundaries, historical quota release, staff ownership, new ensemble/repeat-purchase attendance, assignment/reassignment, quota, pagination, notifications and venue email regressions.

Local evidence is recorded in [progress](progress.md). Follow the [manual walkthrough](TICKETING_FREE_SEATING_WALKTHROUGH_2026-09-19.md) for owner UI acceptance. No browser, build/start command, live Firestore mutation, provider payment or real email is part of local verification. Firestore index deployment, contention, live provider behavior, callback authentication/recovery and browser acceptance remain deployment checks; prior audit findings are preserved in the [historical audit](TICKETING_AUDIT_2026-09-06.md).
