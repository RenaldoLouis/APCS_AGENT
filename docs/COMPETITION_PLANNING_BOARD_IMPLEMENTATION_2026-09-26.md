# Competition planning board implementation

## Decision

For planning events, the Admin Page assignment board is the staff grouping workspace. A provisional group has a stable ID, venue, date, ordered performers, and an optional link to a draft session. Staff drag, swap, search, compare video duration, and review groups in the existing board. They create and edit private draft session times in Performer Sessions, then link one session per group before publishing. The separate Competition Planning page is retired.

## Data and business flow

1. Load `competitionScheduleState` and draft groups for the selected event. Legacy events continue to use `events.venues.sessions` and the legacy assignment endpoint. An event with no configured competition sessions can use **Start planning**; the backend rejects activation if assignments or ticket activity exist.
2. In draft, create or edit groups and move performers on the board. Save the complete board atomically with its expected revision so moving one performer between groups cannot fail halfway or overwrite another admin's changes.
3. Create draft sessions in Performer Sessions using known venue/date, with time optional. Link each board group to one matching unused session. Edit times in Performer Sessions when finalized; a linked group's time follows the session without changing its performers.
4. Preview the saved draft and publish only when every group has one linked session with final venue/date/time, valid performers, no unused sessions and no conflicting times. Publication writes the existing event session and assignment projection together.
5. Generate numbered seats, verify readiness, and only then open competition discovery and checkout. Published and ready plans are read-only on the board. Retiming after ticket activity needs a separate reconciliation workflow.

## Checks

- Draft groups with no time still appear as drop zones with performer details, duration totals, search, swap, overview and export.
- A cross-group drag and reorder persist together; stale revisions reject without partial writes.
- Unsaved edits block preview, publish, event switching, and accidental loss.
- Published planning data is readable but cannot be changed through the board or legacy session editor.
- APCS2026 remains in draft with its archived test bookings excluded from active ticketing.
