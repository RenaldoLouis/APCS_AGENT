# Independent orchestra sessions — 14 October 2026

## Agreed behavior and data path

The owner requested an independent orchestra timetable while preserving ticketing, assignment and redemption. The owner chose rejection of overlaps with both private timed competition drafts and published competition sessions. Orchestra sessions remain free-seating audience events with existing Venue Settings venues and their own same-day date/start/end. No extra competition session is required.

The path is **Orchestra Settings → authenticated orchestra session API → transaction on `events.orchestraSessions`**. Existing storage/API fields and stable IDs remain unchanged. Direct public checkout already reads this separate orchestra timetable; paid performance groups and planned defaults use the session ID; redemption checks the paid booking and current confirmed assignment/session. Creating a slot creates no payment, numbered seat, group assignment, email or admission grant. Normal pricing/sale eligibility still governs direct orchestra sales.

## Owner acceptance after frontend/backend release

1. Select APCS2026 and reload the planning pages. Production revisions are now 170 following the narrow cleanup; localhost is a separate pre-cleanup snapshot.
2. Open **Orchestra Settings → Add session**. Choose an existing venue and any actual orchestra date, then its start/end and informational quota. Verify no Performer Session is needed. Choose a time outside the saved timed competition drafts; back-to-back sessions are allowed.
3. Save and refresh. Confirm venue/date/time match the entered minute values. Edit the row and confirm date/time pickers load the existing values and retain the ID. New sessions have free seating and zero assigned/legacy counters. No row is added to Performer Sessions or numbered Seat Occupancy.
4. Try an invalid/equal/reversed/overnight time and same-venue/day overlap with a timed competition draft, published slot, orchestra or legacy Masterclass. Confirm save rejects without altering the other sessions. A different venue/date or adjacent interval should remain valid.
5. Check direct public orchestra discovery and, in the approved test environment/contact only, Presto/Allegro checkout/payment and category redemption for a newly created session. It must have no numbered-chair choice or performer allowance. Existing competition paid capacity and seat-selection behavior must remain intact.
6. For a paid winner/public competition group, select the new slot in Orchestra Assignments. Confirm total paid tickets plus the shared registered performer allowance, save with **Assign & email**, and check the saved ID/date/time, attendance counter and usual email retry behavior. An optional attendance-plan default must still require explicit assignment confirmation.
7. In Ticket Redemption, verify payment is required, an unconfirmed planned default cannot redeem orchestra places, and confirmed group tickets/shared performer places/performance tickets have separate allowances. Existing duplicate/over-redemption/reassignment protections remain.
8. Try moving/deleting a session with a paid/pending/unreconciled booking, paid assignment, assigned attendance or historical numbered inventory. Confirm rejection and unchanged data. Clear planned attendance links before deleting an unused session or changing its venue/date. Quota-only edits remain allowed without moving anyone.

The implementation was checked by source review, tests and compiler status; no browser was opened. These manual steps remain owner acceptance and do not authorize sending actual customer test notifications.

## Regression evidence

| Check | Outcome |
| --- | --- |
| Complete backend `audit/*.audit.cjs` suite | 254 passed, zero failed |
| Focused frontend session/assignment/redemption API, model and page tests | 34 passed across five suites |
| Hardcoded production-cleanup safeguards | Three passed |
| Changed frontend lint/backend syntax/whitespace | Passed |
| Existing frontend compiler status | `ok`, no compile errors |
| Live production cleanup and exact readback | Passed |

New backend scenarios exercise independent creation, strict calendar/time rejection, duplicate/partial overlap, draft/published/assignment conflicts, adjacency, different venues/days, direct checkout/paid transition/category redemption, winner planned default/explicit assignment/idempotency/group and shared-performer/performance redemption, quota edits and deletion/move guards. Tests use production repositories with substituted Firestore/provider/email dependencies. No live purchase, provider charge/cancellation or email was performed. Authentication remains on the existing routes; this feature does not change payment callback rules or certify global launch readiness.

## Exact authorized production cleanup

Removed only these `events/APCS2026.orchestraSessions` entries after confirming zero counters and no retained reference:

| Old ID | Venue/date | Time |
| --- | --- | --- |
| `0goivmll` | Titan Theatre, 2026-11-15 | 15:30–17:30 |
| `9tixhoss` | Titan Theatre, 2026-11-15 | 19:30–21:30 |

The guarded transaction changed only that array and synchronized event/plan revisions **169 → 170**. No Firestore document was deleted. Eight draft slots, eight complete groups and four archived booking tombstones were structurally unchanged; protected document update timestamps also matched. All other event fields—including venues, prices, layouts and gates—were preserved. Production now has no orchestra sessions, so staff must create the real definitions after release. The emulator was untouched and still has the earlier copied records.

One `archived_test` booking retains its historical `orchestraSessionId: 0goivmll`; it was deliberately preserved, not treated as active attendance. Existing archived-callback/redemption guards prevent that tombstone from reopening admission. Follow-up read-only production checks accepted every new equality-query pattern without an index error: zero saved assignments, numbered inventory or planned links for either target, and only that archived legacy booking reference.

The typed private backup is Git-ignored and mode `0600`:

`apcs_service/.local/backups/production-obsolete-orchestra-sessions-1791985915458.json.gz`

Created at **2026-10-14 13:51:55 UTC** (15:51:55 Europe/Berlin). SHA-256:

`a57af7ef7d7ff72a48c1e69f8f879e2d7c462660635e7cd7e81981ba637a5b19`

The gzip was parsed successfully. Maintenance source is `apcs_service/scripts/remove_obsolete_orchestra_sessions.js`, fixed to exactly these targets, read-only by default and requiring a matching dry-run snapshot fingerprint for apply. The transaction rechecks the backup snapshot before writes; successful readback checks the entire read document-path set and field/timestamp preservation. A completed apply must not be rerun or retargeted. Any restoration must guard a fresh snapshot and restore only the approved definitions, preserving subsequent edits.

## Release boundary

The production cleanup is already applied. The new scheduling UI/backend are **local, uncommitted source changes** and have not been deployed. Release them together through the normal process and restart the backend normally. Source tests and compiler checks cannot establish deployed UI, provider/inbox or production concurrency behavior. Standards/spec/hygiene review passed, and unrelated edits were preserved.
