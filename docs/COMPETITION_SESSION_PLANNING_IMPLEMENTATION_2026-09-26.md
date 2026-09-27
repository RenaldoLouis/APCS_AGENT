# Competition session planning repair plan

**UI update:** The separate planning form described in step 1 was replaced by the Admin Page drag-and-drop board. Draft times now belong to private slots in Performer Sessions and groups link to those slots. See [the unified board implementation](COMPETITION_PLANNING_BOARD_IMPLEMENTATION_2026-09-26.md). The publication, seat readiness, and buyer-gate contract below remains in effect.

## Business contract

Staff know the venue and date before the competition time. A **planning group** is private and has an ordered performer list with an optional time. A **published competition session** is the venue/date/time and assignment projection used by existing ticket checkout. Every planning group needs a final time before publication. Numbered seat generation follows publication. Competition checkout opens only after seat readiness is confirmed. Existing events without planning state retain their legacy sales behavior. APCS2026's prior dummy ticketing state was reset on 26 September 2026; its four terminal staging bookings are preserved as `archived_test` tombstones so late callbacks cannot reopen old inventory.

## Implementation sequence

1. Repair the planning form, response handling, editing and ordering; save an event-scoped draft with a revision that changes on every draft mutation.
2. Validate the complete draft on both preview and publish: membership, time, venue/date, overlap, actual orchestra/Masterclass conflicts and existing activity. Publish the event schedule and assignment projection in one transaction with revision protection.
3. Repair seat generation feedback and verify the complete numbered seat layout and prices before setting the event state to ready.
4. Enforce draft/published sales closure in public discovery and checkout, including the booking transaction. Preserve legacy events without planning state.
5. Protect old assignment writes and direct event schedule writes for planning events; maintain existing read access. Add focused regression checks and update the ticketing guides and progress log.

## Acceptance checks

- Venue/date group saves without a time, can be edited to a different time, and retains its ID and performer order.
- Invalid or stale publication changes neither venue sessions nor assignments; publication preserves unrelated orchestra/Masterclass slots and refuses existing ticket activity.
- Draft and published planning events expose no competition purchase path; ready events use the published assignment and numbered seats. Legacy events keep their current path.
- Failed or partial seat generation cannot report success or mark the event ready.
- Existing paid test records are backed up and explicitly archived during the owner-authorized APCS2026 reset. The reset does not touch registrants or scoring.
