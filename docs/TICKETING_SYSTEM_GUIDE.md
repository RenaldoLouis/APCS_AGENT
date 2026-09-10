# APCS Ticketing System Guide

Last checked against local code: **8 September 2026**.

For continuation priorities, confirmed decisions, and remaining work, see the [AI handover](TICKETING_HANDOVER_2026-09-07.md).

**Latest implementation re-review (8 September):** see [the current AI handover](TICKETING_IMPLEMENTATION_REVIEW_HANDOVER_2026-09-08.md). The baseline has 49 passing offline checks, but nine additional safety checks fail, including staff/public double allocation, duplicate cleanup refunds, winner entitlement validation, checkout retry, and invoice identity. The [approved launch plan](TICKETING_LAUNCH_READINESS_PLAN_2026-09-08.md) remains historical scope; it is not a readiness certificate.

> **Current readiness:** the audit found critical booking/inventory/payment defects. The setup order below explains the intended connections, but completing configuration does not make the current system safe for sales. See [the audit and verification record](TICKETING_AUDIT_2026-09-06.md) and [technical flow](SEAT_BOOKING_FLOW.md).

## Confirmed business rules — follow-up to the 6 September audit

These are owner-confirmed requirements. Implementation is partial; the current status and remaining defects are described below:

- When a buyer does not purchase the corresponding seat-selection add-on, an admin must be able to assign the seat from **Seat Occupancy**. The current page is read-only; the existing Public Customers paid-seat assignment is not the complete requested workflow.
- The winner's extra **one complimentary orchestra ticket** is available **once per winner per orchestra session**, across separate purchases. This clarification concerns the extra winner ticket; it does not remove the existing per-purchased-ticket benefit. An ensemble counts as one winning performance: it receives one extra winner ticket per orchestra session, not one per member. An unpaid booking that expires does not consume this extra ticket entitlement; the winning performance may claim it again when retrying. Restoring eligibility does not guarantee that session quota or reserved-row capacity remains available.
- Orchestra **reserved rows are for winners' complimentary tickets**. Ordinary paid-ticket buyers must not gain access merely by purchasing seat selection. All complimentary orchestra seats must stay within these reserved rows, including customer-selected seats and admin assignments from Seat Occupancy; they must not spill into ordinary paid rows.
- Admin assignment and inventory protection are separate: unassigned tickets still need capacity protection to prevent overselling. Admins may assign seats from Seat Occupancy only after payment is confirmed. Pending, expired, or failed bookings are not eligible for admin seat assignment.

## What each admin page does

| Page | Staff responsibility | Why it matters to customers |
| --- | --- | --- |
| System Settings | Select the active event | Determines which event configuration and inventory the backend uses. Switching during outstanding payments is currently unsafe. |
| Venue Settings | Define venue name/image and row/tier/seat-count layout | Supplies the physical seating blueprint. Editing it does not migrate existing seat inventory. |
| Performer Sessions | Add dates/time ranges for each venue; generate competition seats | Supplies competition schedules and the time-slot pool used by Orchestra/Masterclass Settings. |
| Ticket Settings | Set venue prices, ticket tiers, add-ons, and award/public sale dates | Backend sale/pricing checks exist; configuration protection and UI/cart consistency still need repair. |
| Orchestra Settings | Select venue/date/time; set complimentary quota and reserved rows | Supplies orchestra events and the free orchestra allowance for winner purchases. Creates seats for new entries. |
| Masterclass Settings | Define standalone masterclass sessions | Allows quantity-only masterclass purchases. Sessions have no attendee limit for now. |
| Masterclass Assignments | Fulfil paid add-on and complimentary Masterclass benefits | Lists eligible paid bookings and assigns their combined benefit passes to one session; assignment email remains pending. |
| Admin Page | Sync awards and assign performers to competition sessions; save assignments | Supplies the eligible winner list and the winner's already assigned competition session. |
| Seat Occupancy | Review generated inventory and seat layouts | Shows selected-seat states, not all sold/unassigned ticket demand. |

**Public Customers** is a separate main-menu page. It displays bookings, lets staff resend confirmations, assigns missing paid seats, and provides Mark Paid/Delete actions. It is part of ticket fulfillment even though it is outside the Ticketing System submenu.

## Configuration dependencies

1. Select an existing event in System Settings.
2. Configure venues and their physical rows/seat counts.
3. Add venue dates/time ranges in Performer Sessions.
4. Configure matching ticket tiers and per-venue prices in Ticket Settings. Venue Settings uses labels such as `Presto`; the public UI lowercases tier matching. Keep tier IDs consistent (`presto`, `allegro`, `lento`, `masterclass`) and avoid IDs differing only by case.
5. Define orchestra and masterclass sessions from those venue time slots. Orchestra quota is separate from physical seating capacity; checkout checks reserved-row capacity, but setup edits can still corrupt counters or conflict with existing allocations.
6. Sync/verify awards and assign performers using Admin Page. Save assignments explicitly.
7. Verify actual generated seats and the intended sale schedule. A generated flag alone is not proof of correct inventory.

**Generation caveat:** Performer Sessions and Orchestra Settings currently use different IDs for the same physical seat. Do not assume running both produces one consistent map. New-orchestra creation can overwrite seats already using its ID format, and regeneration is not atomic against sales. Existing records need review before a corrective migration; deleting/recreating inventory blindly can break paid bookings.

## Customer purchases

### Public buyer

The customer selects a competition, orchestra, or masterclass session, then ticket quantities. For competition/orchestra tickets, the optional `seat_selection_performer` add-on is charged once per manually chosen seat. Other tickets remain unassigned, but checkout protects configured tier capacity before payment. A public buyer selecting an Orchestra session purchases it as a normal paid session; no complimentary orchestra claim is sent. A standalone masterclass uses quantity selection without a map.

The customer enters contact details, reviews, and pays through Paper.id. The waiting page polls for confirmation. A successful invoice or payment status alone does not prove that every ticket has a usable seat.

### Registered winner

The customer selects their winner profile. Their competition venue/date/time is derived from the assignment staff already saved. They separately choose the orchestra session they want to attend.

The required allowance is **one per purchased ticket plus the personal winner ticket if not previously claimed, bounded by remaining quota and reserved-row capacity**. The backend now records the personal claim, but the UI still shows the older capped `P + 1` formula. Repeat selected-seat purchases encounter contradictory backend counts, and a quota-capped paid purchase is currently rejected; see the latest handover. The purchase UI requires at least one paid ticket before continuing, even though the displayed formula includes the winner's extra ticket.

The winner may pay the flat `seat_selection` add-on to choose all complimentary orchestra seats. Without it, the page says seats will be assigned on arrival. The backend stores the quota claim, but no complete complimentary on-arrival assignment process is implemented in Public Customers. The owner has specified admin assignment from Seat Occupancy for tickets without seat selection; that workflow remains to be implemented.

### Masterclass benefits

Presto purchases record free Masterclass counts. The `allegro_masterclass` add-on records paid benefits. Standalone paid Masterclass tickets remain attached to the session selected by the customer. After payment, an admin opens **Masterclass Assignments** and assigns all complimentary and paid add-on passes from one booking to the same specific Masterclass session; the customer does not select that free session during checkout. The page reads paid bookings in bounded pages and revalidates the booking's event, payment status, pass count, and current session configuration before writing. Masterclass sessions have no attendee limit for now. A booking's `masterclassAssignment` records the selected session and assigned quantity.

**Assignment implemented; email pending:** Masterclass Assignments now includes paid `allegro_masterclass` add-on passes, complimentary passes, and add-on-only bookings. Staff assign all benefit passes from one paid booking to one Masterclass session; the saved assignment includes paid/free component counts. Standalone Masterclass tickets retain the customer-selected session. Assignment-email dispatch is still missing.

## Eligibility and restricted rows

Ticket Settings stores date-based eligibility globally. Dates are evaluated in Asia/Jakarta. When enabled, a missing date means no tier is allowed; `Public` enables the public button. Checkout enforces the public sale date and validates the winner's event/award/assigned competition session. New checkouts persist personal winner claims, but repeat selected-seat purchases and legacy claim migration remain incomplete.

Reserved rows are configured in Orchestra Settings. Public buyers see them as unavailable on paid Orchestra maps, and checkout rejects a direct paid-seat request for one. The owner has confirmed that reserved rows are for winners’ complimentary tickets; paying for seat selection does not grant ordinary paid-ticket access.

## Payment and expiry

**Implemented lifecycle repair (7 September):** the timer and sweeper request Paper.id cancellation after the local deadline; only a truthy cancellation result releases booking-owned seats and refunds quota. Failed or unknown outcomes remain held for reconciliation, and checkout cannot take over a locally old lock. Fulfillment uses the booking's saved event and transactionally validates amount and current seat-lock ownership.

Application-level callback authenticity, a durable cancellation/recovery worker, and live Paper.id deployment semantics remain unverified. The gateway invoice due date may outlive the local hold deadline; that deadline is a cancellation request point, not proof that inventory is releasable.

Both the dedicated public webhook and the unified payment webhook can process public bookings. The unified one uses the invoice number to locate `publicBookings` before trying competition registrations. Gateway/deployment settings were not verified during this local audit.

## Staff monitoring and fulfillment

**Seat Occupancy:** refresh to view generated physical documents by venue/session. A low booked count does not imply equivalent unsold capacity when tickets are unassigned. Orchestra slots may appear twice under different labels. Pending buyer names are not fully wired into locked-seat tooltips.

**Public Customers:** inspect payment status, quantities, benefits and selected seats. Missing paid seats can be assigned manually only after payment; the transaction rechecks event, seat availability/ownership, session, tier, and remaining ticket quantity, and never treats an old local lock as available. Complimentary Masterclass passes are assigned from the separate **Masterclass Assignments** page. “Auto-Assigned” can merely mean labels are empty.

**Failed checkout:** a known or unknown provider outcome keeps owned inventory held while the booking is retained as `FAILED`. Only confirmed cancellation releases it; failed/unknown cancellation requires reconciliation. Failed bookings cannot be marked paid or fulfilled automatically. If database cleanup fails, staff must use the booking ID in server logs; automatic recovery is not provided.

**Mark Paid/Delete:** Mark Paid is shown only for `pending` bookings and transactionally requires every selected seat to still be locked by that booking before booking it. It remains a staff fallback after independently verifying payment; webhook authenticity is still a release blocker. Delete is shown only for terminal records whose confirmed cancellation cleanup already released inventory and complimentary quota. Pending/paid/awaiting-reconciliation orders must go through the cancellation/reconciliation process instead.

**Confirmation:** the current email includes a booking ID and selected seat labels with one main schedule. It does not include the separate orchestra schedule or all unassigned/masterclass/add-on entitlements. It tells the customer to present email/booking ID at the entrance; no public-booking QR verification is connected here. Legacy registrant check-in is a different flow.

## Before confirming readiness

Repair the current inventory, entitlement, invoice-verification and retry failures; complete the remaining confirmed admin seat-assignment and Masterclass assignment emails. Show the confirmed count of seats awaiting assignment and verify customer/admin flows against controlled test data. The [audit](TICKETING_AUDIT_2026-09-06.md) provides the offline diagnostic command and a manual browser checklist. Static lint/syntax success is not a ticketing acceptance test.

## Checkout failure verification (7 September 2026)

Use a controlled test event; do not test these failures against customer bookings. This checklist describes the current cancellation-first behavior.

1. Attempt a seat already held or booked by another booking. Confirm checkout rejects it and the original seat owner/status and quota remain unchanged.
2. Simulate invoice failure after allocation. Confirm the order is retained as `failed`; inventory stays held unless Paper.id cancellation succeeds, then only its own seats are released and committed quota is refunded once.
3. Open Public Customers and expand the failed order. Verify the red FAILED label, cancellation/reconciliation information, no Mark Paid action, and disabled Resend/seat-assignment actions.
4. In the public waiting-page flow, return `failed` from booking status. Verify polling stops, the payment button disappears, and the failure message makes no cancellation claim. Direct-URL public-booking lookup has been added; transient lookup errors still need better handling.
5. Confirm a normal paid booking still behaves as before. These browser checks are for the owner; automated checks use offline fixtures only.

Verify cancellation failure/unknown outcome keeps seats held beyond 30 minutes, confirmed payment retains inventory, and only confirmed unpaid cancellation releases inventory. Test timer, sweeper, rejected checkout takeover, and checkout failure. For Masterclass fulfillment, verify free-only, add-on-only, and combined passes are assigned together; assignment email still needs implementation. Standalone tickets retain their selected session.

## Owner answers after handover review

Confirmed: Seat Occupancy should show the number of seats still needing assignment; assignment remains paid-only. Booking-ID/manual entry verification is sufficient and public-ticket QR check-in is not required. Whitelist membership intentionally grants all ticketing-admin powers; backend authorization must enforce that membership. Later Masterclass assignment details should be sent by email; that communication integration is still pending.

Public buyers enter their email. Winner selection defaults the editable buyer email to the registrant’s stored email; confirmation uses the saved booking `userEmail`. Keep public winner name selection without email verification. Confirmation email is communication, not identity proof. Backend winner eligibility and personal-claim records now exist; repeat-purchase selection and quota-capped benefits still require repair.

**Implemented locally:** seats remain held until Paper.id confirms payment or successful cancellation, including beyond the local deadline. Confirmed payment finalizes the booking and retains inventory; successful cancellation permits unpaid inventory release. Failed cancellation or an unknown invoice outcome keeps inventory unavailable for reconciliation. Provider contract/deployment verification and automated recovery remain outstanding.

**Assignment implemented; email pending:** Masterclass Assignments now includes paid `allegro_masterclass` add-on passes, complimentary passes, and add-on-only bookings. Staff assign all benefit passes from one paid booking to one Masterclass session; the saved assignment includes paid/free component counts. Standalone Masterclass tickets retain the customer-selected session. Assignment-email dispatch is still missing.

These owner decisions are resolved. Provider contract verification, recovery automation, and the remaining fulfillment work remain engineering work; see the handover for the preserved original answers and repair priorities.

## Launch-hardening update — 8 September 2026

Checkout now creates a canonical physical-seat ownership record and a transactional paid-capacity reservation. Staff must treat these as the source of truth for a new public booking: legacy duplicate document IDs are not separate chairs, and a paid ticket awaiting manual assignment has already consumed its tier capacity. The intended cancellation rule is to release only that booking's reservation and claim. The current failure-cleanup path can subtract paid/complimentary counters twice under overlapping calls; do not treat it as exactly-once.

The system records one active winner personal-claim record for each event/winning-performance/Orchestra-session combination. The ordinary unselected repeat-purchase path retains per-ticket benefits without another personal bonus. Repeat purchases with seat selection and quota-capped purchases still fail current validation. This is visible in the booking's `personalWinnerBonus` and `winnerClaimId` fields for reconciliation.

The payment URL is persisted with the booking. Give customers the booking-status link (`/waiting-payment/<bookingId>`) if they lose the original tab; it can recover the invoice link. A zero local countdown is not cancellation confirmation, so staff should not promise that inventory has been released until the booking reaches a server-confirmed terminal state.

**Masterclass Assignments:** a paid booking with an `allegro_masterclass` add-on now appears even if it has no complimentary pass. Select one session to assign all of its paid add-on and complimentary passes together; the saved assignment displays both counts. Assignment-email dispatch remains a backend delivery/retry task.

## Current operating limits — 8 September 2026

**Not ready for unrestricted sales:** [the latest implementation review](TICKETING_IMPLEMENTATION_REVIEW_HANDOVER_2026-09-08.md) reproduces two paid owners of one chair across staff/public paths, duplicate inventory refunds, blocked valid winner purchases, excess complimentary selection, incorrect checkout replay, and acceptance of a mismatched provider invoice ID. The 49 passing baseline tests do not cover all of these; nine new checks fail. The fresh-event 500-buyer rehearsal, actual provider behavior, and owner-run UI acceptance remain outstanding.

Use **Invoice Paid** as the normal ticket-fulfillment trigger. Staff may investigate Payment In details in the Paper dashboard; APCS does not need a second payment-event dependency. Callback authentication, invoice matching, missed-notification recovery, and verified unpaid cancellation remain mandatory engineering work. Provider registration guidance is documented separately in the handover.

Combined paid/free Masterclass assignment is implemented; its email is not. Seat Occupancy remains read-only and does not show the complete paid/free quantity awaiting assignment. Existing Public Customers assignment must be repaired to share physical ownership protection before it can safely coexist with public sales.

## Follow-up repair — 8 September 2026

The previously listed nine checkout safety regressions are repaired in the offline suite (58 passing checks). Public Customers assignment and Mark Paid now create/recheck the same physical-seat ownership record used by checkout; the legacy token-seat reservation flow does too. If a legacy alias for the same row/number is booked, reserved, or locked, staff must choose another seat. Do not reduce `ticketCapacity` when assigning a paid booking that already reserved capacity at checkout.

For winners, the screen now previews the current capped Orchestra allowance using the winner's active personal claims, the session quota, and reserved-row capacity. This is informational only: checkout recalculates it in its Firestore transaction. If capacity changed while the buyer was reviewing, the buyer must review the returned allowance before attempting payment again. Complimentary seat selection is valid only with the `seat_selection` add-on and for exactly the granted quantity.

Do not reuse a checkout link after an expired or failed attempt. A matching retry restores the same pending attempt; a modified cart gets a new client attempt key and a server-side changed-cart conflict is rejected. Invoice Paid must carry the exact stored Paper invoice ID and the expected amount before fulfillment.

These repairs are not a launch certificate. Paper callback authentication and recovery, verified cancellation semantics, backend whitelist enforcement, assignment email, configuration/migration protection, Firestore emulator contention evidence, the fresh-event 500-buyer rehearsal, and owner-run UI/entry checks are still outstanding.
