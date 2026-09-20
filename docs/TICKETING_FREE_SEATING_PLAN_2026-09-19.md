# Ticketing business-process update — 19 September 2026

## Confirmed scope

- Work in the existing `ticketing_improvement` branches; preserve unrelated edits; do not commit or push.
- Winners keep their assigned competition venue/date/time and existing competition seat options.
- Remove customer orchestra-session selection, complimentary quota banner, and the orchestra-seat step.
- Orchestra attendance is all paid tickets for the same event/winning performance plus its registered performer count once. Four ensemble members and purchases of three and two tickets produce nine attendees.
- Public orchestra purchases use Presto/Allegro quantities and free seating, with no seat-selection add-on.
- Remove all new Masterclass ticket sales, add-ons, and Presto benefits from this ticketing system. Preserve historical records.
- Staff assign winners' orchestra sessions after payment. Payment confirmation includes the named competition venue and assignment-pending status; assignment notification includes the orchestra venue/date/time.

## Implementation

1. Version new bookings so historical payments and cancellation cleanup retain their original contracts. Stop new orchestra seat claims and Masterclass benefits at the API as well as the UI.
2. Derive winner attendance from paid bookings and the authoritative performer roster, grouped by event/registration. Never count failed or pending purchases. Persist assignment snapshots in `orchestraAssignments` and reserve session headcount atomically when staff assign/reassign.
3. Add an authenticated Orchestra Assignments admin page, paginated paid-booking discovery, session assignment, and notification delivery/retry. Later purchases appear as additional attendance awaiting assignment; existing confirmed attendance remains valid until staff update it.
4. Replace Orchestra Settings seat generation/reserved-row controls with free-seating headcount configuration. Keep public tier-capacity and overall venue/quota limits protected. Remove Masterclass menu/configuration options for new sales.
5. Resolve email venue labels from the booking's event, retaining a booking-time venue snapshot for new sales. Show free seating, explicit competition seats, and honest pending assignments.
6. Update the two ticketing guides, database architecture, progress log, and a manual UI walkthrough. Run offline regression tests, syntax/lint checks, and review all JSX branches and removed references. No browser, start, build, live payment, or email sending during verification.

## Historical data boundary

Existing bookings keep their seats, Masterclass benefits, and provider-confirmed payment/cancellation lifecycle. They are not silently converted to free seating. Legacy complimentary allocations must be reconciled before the same winner is assigned through the new workflow; new screens must make this boundary visible.


## Completion record — 20 September 2026

The six implementation steps are complete locally. Verification: 92 offline regression checks pass, backend syntax checks pass for nine modules, and targeted frontend lint has no errors (eight existing warnings). See [progress](progress.md) and [manual acceptance](TICKETING_FREE_SEATING_WALKTHROUGH_2026-09-19.md). Changes remain uncommitted on `ticketing_improvement`; no browser or live integration/deployment verification was performed.
