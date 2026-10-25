# Production obsolete Behring session cleanup — 14 October 2026

## Authorized scope and result

The owner requested cleanup of only the old Seat Occupancy entry shown in the screenshot, preserving real Performer Sessions data and all other records. Live production reads confirmed the project is `apcs-profile`, the active event is `APCS2026`, and the old row is venue `Venue_lnssq2n1` (**Behring Theatre**), date `2026-11-14`, time `08:00-09:00`.

The operation completed successfully. Exactly one string was removed from `events/APCS2026.venues[].sessions['2026-11-14']` for that venue. The date key remains with an empty array. No Firestore document was deleted and no physical seat cleanup was needed: there were zero target seat documents, not merely a false generation flag.

| Record/field | Result |
| --- | --- |
| Target Behring timetable time | Removed exactly once |
| All other venue fields/layouts and times | Preserved |
| Eight private draft sessions | Preserved field-for-field |
| Eight planning group records and memberships | Preserved field-for-field, including update timestamps |
| Two Titan orchestra definitions | Preserved field-for-field |
| Four `publicBookings` archived-test tombstones | Preserved field-for-field, including update timestamps |
| `sessionAssignments/APCS2026` | Absent before and after |
| Target seat, capacity and physical ownership records | Absent; no delete operation |
| Event and plan revisions | Synchronized 168 → 169 for stale-editor protection |
| Planning status | Still draft |
| Prices, sale gates, registration/scoring data | No write operation |
| Local emulator | No read/write operation in this cleanup; retains the earlier snapshot |

## Dependency checks and write safeguards

The read-only preflight and transaction checked the event, plan, active-event settings, published assignment document, all event planning groups, the exact dated numbered-seat scope, and event-scoped booking/capacity/ownership/checkout/claim/orchestra-assignment/legacy-booking/legacy-seat/redemption/payment-receipt records. Additional exact-session queries covered legacy seats/bookings/seat-book collections without an `eventId`. Numbered seats from another venue are excluded only when their saved venue is explicit. Matching special sessions and true generation flags prevent execution. Archived-test tombstones are preserved and do not authorize removal of any inventory.

Production contained eight groups, eight draft slots and four archived booking tombstones; all queried ticket inventory/ownership/capacity/assignment collections were empty for the event. There was no retained target dependency. The script refuses a non-draft schedule, inconsistent revisions, an ambiguous/missing target, any target dependency or a changed dry-run snapshot. It is fixed to this project/event/venue/date/time, defaults to reads, and loads only the Admin SDK credential, without starting the application or payment/email background jobs.

The transaction changed exactly two documents:

1. `events/APCS2026`: target time removal within `venues`, plus `competitionScheduleState.revision`.
2. `competitionSessionPlans/APCS2026`: `revision` only.

After commit, the same inventory was reread. Structural comparisons confirmed the expected event and plan, the same document-path set, and unchanged contents/update timestamps for all other existing read records. The script has no document delete operation. No payment, invoice cancellation, notification, publication, generation or deployment action was taken.

## Backup and local source

The typed backup was written before the transaction at **2026-10-14 13:32:36 UTC** (15:32:36 Europe/Berlin), under the Git-ignored backend `.local/backups` directory:

`apcs_service/.local/backups/production-behring-obsolete-session-1791984756290.json.gz`

File mode is `0600`. The gzip was parsed successfully and contains the complete read snapshots, including the absent assignment marker. Timestamp seconds/nanoseconds and other Firestore value types are tagged for recovery. SHA-256:

`9b86d56e90b4fa52cee8b1e70b68d473b50b45de36811a4b3b96a40583521a8e`

Reviewable local source is `apcs_service/scripts/remove_obsolete_behring_session.js`; targeted safeguard tests are `apcs_service/scripts/remove_obsolete_behring_session.test.cjs`. All **5 tests passed**, covering precise immutable removal, empty-date retention, draft/revision/target validation, protected dependencies and nested/encoded reference matching. Backend script syntax passed. Do not rerun apply after successful cleanup: a missing target intentionally rejects instead of guessing another record. Any later restoration must use a fresh snapshot/revision guard and restore only the approved target time, preserving subsequent staff edits rather than overwriting the whole backup.

## Orchestra creation: dependency observed before the follow-up

`OrchestraSettings.js` reads the authenticated session overview, then derives **Date** options from the selected venue's `sessions` keys and **Time** options from that date's array. Submit sends a separate orchestra definition, but `OrchestraAssignmentRepository.saveSession` still requires its exact date/time already in the venue timetable and rejects a time with assigned competition performers or active bookings.

For planning events, `PerformerSessionsSettings.js` saves private `competitionSessionPlans.draftSlots`. Only publication projects these into `events.venues[].sessions`, and publication requires all draft slots linked to competition groups. Therefore adding a private performer draft is not sufficient to create an orchestra session. The free-seating orchestra schedule is stored separately in `events.orchestraSessions`; independent date/time inputs would require an aligned form/backend change, which was not requested or implemented in this cleanup.

Production's existing Titan orchestra definitions are **15 November 2026, 15:30–17:30** (`0goivmll`) and **19:30–21:30** (`9tixhoss`). Their date/time is absent from the current venue timetable. Both definitions and counters remain untouched; the current add/edit form cannot select these times without addressing the existing restriction.

The later owner-authorized follow-up implements independent orchestra time entry and separately removes the two verified-unused Titan definitions. See [the follow-up walkthrough and production cleanup record](../ORCHESTRA_INDEPENDENT_SCHEDULING_WALKTHROUGH.md). The preservation results above describe the earlier Behring cleanup.

## Owner walkthrough and verification limits

1. In production **Seat Occupancy**, click **Refresh Data**. The obsolete Behring 08:00–09:00 row should disappear. Real private draft sessions do not appear there until publication; publication/seat generation/readiness are separate staff actions.
2. Refresh **Performer Sessions** and verify all eight real draft sessions retain their saved times. Reload **Admin Page** before saving against revision 169; check all eight groups and their members.
3. Refresh **Orchestra Settings** and verify both Titan sessions retain their times, quotas and counters.
4. The local emulator is still the pre-cleanup snapshot, so viewing localhost does not demonstrate this production change.

Live Firestore readback confirms the data outcome. Standards/spec/hygiene self-review and targeted checks passed. UI confirmation remains with the owner; no browser was opened, and neither prohibited start/build commands nor commits/pushes were performed.
