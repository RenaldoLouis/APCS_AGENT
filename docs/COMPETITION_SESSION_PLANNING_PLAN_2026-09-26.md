# Provisional Competition Groups and Schedule Publication

**Status:** Original proposal. The reviewed repair contract and current implementation are documented in [the implementation plan](COMPETITION_SESSION_PLANNING_IMPLEMENTATION_2026-09-26.md), [the unified board decision](COMPETITION_PLANNING_BOARD_IMPLEMENTATION_2026-09-26.md), [seat booking flow](SEAT_BOOKING_FLOW.md), and [progress log](progress.md). The separate planning page, ordinal-derived ID, group-owned time input, fresh-APCS2026 assumption, and direct post-publication editing guidance below are superseded.
**Confirmed business rules (26 September 2026):** Staff know the venue and date when grouping performers. Exact start and end times may be unknown. Every competition session time must be finalized and published before ticket sales start.

## Goal and boundary

Let staff create numbered competition groups for a known venue and date, place and reorder registrants, and later set or revise each group's time. Staff can add and remove groups. A planning group is internal until the whole competition timetable is published. Publishing turns the groups into the existing ticketable competition sessions. This feature does **not** authorize changing a time after ticketing activity starts; that requires a separate customer rescheduling and inventory migration workflow.

The Ticket Settings eligibility schedule controls **purchase dates and award tiers**, not performance times. A configured sale date must not make a provisional group purchasable.

## Why the current edit path is unsafe

- `PerformerSessionsSettings.js` stores `events/{eventId}.venues[].sessions[date]` as time-range strings. Its UI requires a range and changes one by removing the old string and adding a new string. It does not update assignments, seats, capacity, bookings or emails.
- `SessionAssignmentManager.js` keys groups as `{venueId}_{date}_{timeRange}` in `sessionAssignments/{eventId}.assignments`. Removing the old string hides its group from visible session cards, while its registrants still count as assigned.
- Generated competition seats use `sessionId = {date}_{timeRange}` and `sessionsSeatsGenerated` uses time-bearing keys. Re-adding the old string can reveal old seat documents; generating the new string creates separate inventory.
- Checkout derives winners' assigned venue/date/time from that composite assignment key, requires the time to exist in the venue catalogue, and writes `publicBookings.session`, `ticketCapacity` and seat ownership against that time. Paid and pending records are not migrated by editing the venue catalogue.
- The assignment write route currently replaces the document without the ticketing admin middleware or checks for active bookings. The new planning/publish endpoints must not reuse that unsafe write path.

See [seat booking flow](SEAT_BOOKING_FLOW.md), [staff guide](TICKETING_SYSTEM_GUIDE.md), and [architecture](architecture.md). The older numbered-orchestra and Masterclass examples in `architecture.md` are historical, not a model for this feature.

## Proposed business contract

1. Staff create **planning groups** (numbered `Group 1`, `Group 2`, …) for a venue and date. Staff can add and remove groups. Each group has a stable opaque ID independent of its time. Start and end may be empty while draft.
2. Staff assign, remove and reorder registrants within those groups. Keep the existing video-duration total and unknown-duration display. Only calculate an overrun against a valid time range; an overrun warns but does not block saving.
3. Staff enter or edit times while groups are draft. Validate `start < end`, no overlap in the same venue/date, no collision with configured orchestra or historical Masterclass slots, and no registrant assigned twice. Different venues may run simultaneously.
4. Staff review a **publish preview** listing every group, time, performers and known video total. Publish is all-or-nothing for the event's competition timetable: no partial publish while any intended group lacks a valid time.
5. Until publication, public winner/performance discovery and all ticket checkout paths must reject provisional competition schedules. The backend is authoritative even when the UI hides the purchase control. Staff then generate numbered seats for the published sessions as a separate manual step and complete a readiness check before opening ticket sales.
6. Publishing freezes time edits in this feature, including the interval before sales open. A correction after publication needs a separate guarded unpublish/correction design; once ticketing activity exists, it also needs buyer notification and booking/inventory migration. Do not implement either case by delete-and-add or by directly editing Firestore.
7. Draft grouping and publication do not create orchestra assignments. Orchestra Settings and post-payment Orchestra Assignments retain their current separate roles.

## Data and API approach

Recommended shape: `competitionSessionPlans/{eventId}/groups/{groupId}` has a stable opaque `groupId` in the format `plan_{eventId}_{ordinal}` (e.g., `plan_APCS2026_1`), venue ID, date, ordinal/display label, optional start/end and ordered registrant IDs. `events/{eventId}.competitionScheduleState` has `status: draft | published | ready`, a revision, and publication/readiness timestamps. `ready` means every published competition slot has verified numbered seat inventory, venue row/tier capacity, prices and appropriate sale eligibility before staff open sales. Keep the group ID internal; do not derive it from a time string. Before implementation, check actual group sizes against Firestore document and transaction limits. If an individual group can exceed a document, put ordered membership in bounded child records while preserving the same stable group ID and publish contract.

For compatibility, publication should atomically materialize the approved timetable into the existing `events/{eventId}.venues[].sessions` string list and `sessionAssignments/{eventId}.assignments` composite-key map that current checkout consumes. Preserve unrelated configured orchestra and historical Masterclass slots in the venue catalogue; do not replace the entire venue schedule with competition slots. The planning record remains an audit/read model for the published groups. Do not create seat documents in draft. The publish transaction must verify the expected planning revision, current event data, and absence of ticketing activity before changing either published projection. It must fail without a partial schedule if any check fails.

Create a separate **Competition Planning** page in the Admin Dashboard for all draft group management and publication workflow. This page replaces the existing Performer Sessions time-editing flow for competition groups. The existing Performer Sessions and Session Assignment pages remain for orchestra/staff assignments.

Create protected backend operations for draft save, preview and publish using verified Firebase identity and the ticketing admin whitelist. Do not expose arbitrary assignment-document writes through these new operations. Remove or protect the existing unrestricted `/saveSessionAssignments` route and move direct staff writes to `events.venues` and `sessionAssignments` behind the guarded operations. Review and tighten Firestore rules for these records: the current broad whitelist rule permits direct client writes, which would otherwise bypass the publish lock. Keep authorized read paths working. Make publish idempotent for an unchanged revision. Add an event-level schedule state or equivalent backend gate; legacy events lacking the new field require an explicit compatibility rule so existing paid bookings remain readable and are never silently converted to draft.

The readiness check should verify all published competition slots have generated seats, venue row/tier capacity, prices and appropriate sale eligibility before staff open sales. If generation fails partway, keep `status: published`, so checkout remains closed until the missing inventory is repaired and `ready` is recorded. The existing seat generator currently catches errors without rethrowing; correct that reporting as part of the publish/readiness work so the UI cannot claim success after a failed batch. This event is fresh (APCS2026) with no real bookings or seats — only dummy data — so no legacy migration is needed.

## Implementation sequence for the next agent

1. **Inventory and baseline:** Read the current versions of `PerformerSessionsSettings.js`, `SessionAssignmentManager.js`, `SeatEvent.js`, `PublicTicketRepository.js`, `FirebaseController.js`, `PaymentRoute.js`, `PublicCustomersList.js`, the three architecture/ticketing docs, and `CONTEXT.md`. Inspect the current event's session/assignment/booking shapes read-only. Preserve all pre-existing uncommitted work.
2. **Protected domain operations:** Introduce stable draft groups and server-side save/publish validation. Protect all writes that can change a published competition assignment or time, including direct Firestore and the older assignment route. Gate sale/listing at the backend when the schedule is draft or not seat-ready. Preserve callback-based repository error handling where `DatabaseUtil.executeDatabaseOperation()` is used. Check existing Firestore rules and update them to enforce the publish lock and prevent direct client writes to planning/published projections.
3. **Staff UI:** Build a separate Competition Planning page. Let staff create named provisional groups for a known venue/date with time optional. Let Admin Page assign/reorder registrants by stable group ID. Show draft/published status, missing-time errors, a publish preview, and a clear sales lock. Do not add a fake placeholder time.
4. **Publication and seat readiness:** Materialize the old ticketing projections atomically, generate numbered competition seats only for published times, verify generation success, and show readiness before sale eligibility is enabled. Disable direct delete/recreate of a published time through the older control. Seat generation is a separate manual step after publication.
5. **Legacy handling:** Not applicable for this event — APCS2026 is fresh with no real bookings. Preserve the legacy migration code path in the backend for future events that need it, but do not implement migration UI for this event.
6. **Documentation:** Update `docs/architecture.md` for the chosen Firestore shape and data flow; update both `docs/SEAT_BOOKING_FLOW.md` and `docs/TICKETING_SYSTEM_GUIDE.md` for staff order and publication rules; update `docs/business_perspective.md` and append the completed work to `docs/progress.md`. Keep all new UI and email copy English-only.

## Required scenarios and acceptance checks

- Groups can be created with venue/date but no time, then populated and reordered. Staff can add and remove groups. Draft groups are absent from buyer performance discovery and checkout.
- Change a draft time from `09:00-10:00` to `09:00-10:30`: group ID, registrants and order remain intact; no old assignment key, seat inventory or ticket capacity is created.
- Publication fails without changing either ticketing projection when a time is missing, ranges overlap, an orchestra/Masterclass slot conflicts, a registrant is duplicated, the revision is stale, or ticketing activity is detected.
- A successful publish produces exactly one legacy assignment key and session catalogue entry per group; retrying the same publish does not duplicate them.
- Buyer discovery and checkout use only the published time. Seat generation creates inventory for that time, and its failure cannot be reported as success. Checkout stays closed until readiness is satisfied.
- A published time cannot be edited through the planning feature, even before sales. After a pending Paper.id or manual booking, paid booking, selected/locked seat, staff-assigned seat, `ticketCapacity` reservation or ownership record exists, all older time-edit and assignment-write paths also reject changes. Payment fulfillment still resolves against the original booking, and no local timer releases inventory.
- A whitelisted browser client cannot bypass publication through a direct Firestore write, and an unauthenticated caller cannot replace `sessionAssignments` through the older HTTP route.
- Restoring an old time or rerunning generation cannot reveal or duplicate sellable chairs for a different group. Legacy historical bookings remain on their original schedule and require explicit reconciliation, never implicit migration.
- Orchestra free-seating quotas, direct public orchestra sales and post-payment group assignments keep their existing behavior; draft competition groups do not consume orchestra quota.

Use focused backend tests and the project ticketing audit suite from the monorepo root. Review new UI state and conditional branches in code; the project prohibits automated/local browser verification, so provide a staff walkthrough for the owner to perform manually. Do not run `npm run start` or `npm run build`, and do not commit or push.

## Explicitly outside this plan

Changing a published time after sales begin; moving pending invoices or paid bookings to a different time; rewriting seat IDs/ownership/capacity records; and sending customer schedule-change emails. Those are one coordinated rescheduling feature and need their own business decision and migration design.
