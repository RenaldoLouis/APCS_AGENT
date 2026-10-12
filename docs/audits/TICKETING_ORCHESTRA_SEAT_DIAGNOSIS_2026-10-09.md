# Orchestra failure and numbered-seat locking — 9 October 2026

**Current status: the direct orchestra checkout validation bug is repaired in source and passes offline and isolated Firestore tests.** The running owner API still needs a restart. Numbered competition seat locking passes the scoped transaction tests; peak-load reliability and genuine post-fix staging/browser acceptance remain unproven. The original diagnosis below records the pre-repair behavior.

## Authorized repair and regression results

The owner authorized the minimal checkout repair. Both guards in `PublicTicketRepository.createPublicTicketBooking` now classify the session before applying timetable validation: an exact orchestra venue/date/time match comes from `events.orchestraSessions`, while competition times remain in `events.venues[].sessions`. Both require a real configured venue. The checkout transaction reclassifies the current event and rejects a changed session identity/type or removed venue. No schema migration or copying orchestra times into competition timetables is required.

All **176 offline audit checks pass**. Six added regressions cover both independent orchestra times, missing competition timetable/draft competition readiness, invalid orchestra scopes, an orchestra slot removed between validation and transaction, a removed venue, and a competition slot withdrawn before commit. The existing numbered-seat/add-on rejection test now uses an orchestra time absent from the competition timetable.

Three focused actual-Firestore checks pass in a separate disposable emulator:

| Check | Result |
| --- | --- |
| Orchestra 15:30–17:30 and 19:30–21:30 | Both purchases persist as free seating with authoritative prices; the public callback controller records PAID, processed receipts and `emailSent: true`, with one substituted confirmation each and no numbered-chair ownership |
| Orchestra admission policy | Orchestra demand can exceed the competition layout, retains staff-managed counters, and competition purchases still respect the 10-place fixture tier limit |
| Titan/Behring competition regression | All 12 copied competition sessions × two tiers pass: 24 accepted buyers, 24 duplicate-seat rejections, 24 correct owned locks confirmed booked, and wrong-venue selection rejected |

[Repair results JSON](ticketing-web-2026-10-09/orchestra-session-fix-results.json) records these checks. Actual invoice creation, provider callbacks and email delivery were substituted; `emailSent: true` here verifies the application records successful service completion, not inbox delivery. The owner database/customer data and running port-8080 API were not mutated or restarted. Restart that API through the owner's normal workflow before retesting localhost. No frontend change, commit, push, dependency installation, start/build command or production change was made.

This repair does not resolve the earlier callback-authenticity, lost-callback, ngrok-polling or 48-request burst-timeout findings. A separate existing Orchestra Settings `saveSession` guard still requires a venue timetable entry; this change repairs purchasing existing configured sessions, not editing that settings flow. The policy test retains its original settings fixture, while the new checkout test explicitly separates the timetables.

Self-review passed: both guards use defined authoritative classifications, no declaration was removed or duplicated, callback error handling remains intact, competition/masterclass branches retain their prior checks, and repository/test syntax checks pass. Updated both ticketing guides, architecture and progress. The temporary port-8082 emulator was stopped after verification; the owner's port-8080 process was left running.

## Direct current-local reproduction

The owner permitted current local Firestore use, requiring only the authorized test email/phone for any checkout. Verified the owner's running API is in emulator mode. Read its active event APCS2026 and matched orchestra configuration to the existing port-8081 local database.

POSTs directly to `http://localhost:8080/api/v1/apcs/public-ticket/booking`, without ngrok, reproduced both failures:

| Venue/date | Orchestra session | Competition sessions on that date | Response |
| --- | --- | --- | --- |
| Titan / 2026-11-15 | 15:30–17:30 | 08:00–09:00 | HTTP 500, Selected venue session is unavailable |
| Titan / 2026-11-15 | 19:30–21:30 | 08:00–09:00 | HTTP 500, Selected venue session is unavailable |

Requests used only `renaldolouis555@gmail.com` and `082385590505`. Neither created a booking. The failing validation precedes invoice creation and notification sending. The current-event selector and customer records were not modified.

The UI supplies orchestra options from `events.orchestraSessions`. `PublicTicketRepository.js:293` checks all purchases against `venues[].sessions` before classifying the session, and line 512 repeats the requirement inside the transaction. Consequently, legitimate orchestra times in their own timetable are rejected.

An isolated actual-repository test confirmed this cause: keeping the orchestra slot only in orchestraSessions produces the same error and zero invoice calls; adding the same slot to the competition timetable makes that request succeed with seatingMode free. That change was applied only to disposable isolated test data, not the owner's event. The correct repair is session-type-specific validation in both guards. No new collection or schema is required, and adding orchestra times to the competition timetable should not become the production workaround.

Ngrok's browser HTML-warning problem is a separate issue. It cannot explain this direct loopback JSON response.

## Numbered-seat checks

Read-only inventory inspection of the owner's current APCS2026 database found eight Behring competition sessions with 80 unique seats each and four Titan sessions with 187 unique seats each. All 1,388 seats in these configured scopes were available, with no duplicated physical chair in a scope. This verifies current generation/counts, not all possible schedule correctness; one stored Titan scope is dated 2026-09-14.

Copied the current venue/session/tier/price configuration into a separate loopback emulator at 8082, using synthetic registrant/booking/seat records. Actual repositories and Firestore transactions ran; provider, email, timers and background jobs were substituted. No customer records or live invoice/email were used in these tests.

The per-scope check passed all **12 competition sessions × two ticket tiers = 24 combinations**. Two simultaneous buyers attempted the same selected seat in each combination: exactly one succeeded, one was rejected, one invoice call occurred, and the correct booking owned the lock. All 24 accepted bookings subsequently transitioned their owned seats to booked through the payment repository with substituted provider payloads. Same chair coordinates in different venue/date/time scopes did not interfere. A forged seat from another venue was rejected without locking it.

Additional actual-Firestore controls passed: 20 buyers competing for one chair accept only one; duplicate document aliases for one physical chair cannot sell twice; concurrent unselected purchases cannot oversell the final place; seat generation preserves concurrent checkout locks; repeated generation cannot erase acquired locks; paid staff assignment is atomic under contention.

**Load limitation:** a separate 48-request all-scope burst failed 22 of 24 pairs with `10 ABORTED: Transaction lock timeout.` in the isolated emulator. These failures are retained in private logs and the summarized evidence. The per-scope two-buyer run passes; neither run certifies production throughput or that every buyer always succeeds under peak load. The initial broad run also exposed premature harness cleanup after a rejected Promise.all; the diagnostic harness was corrected to await all settled transactions before cleanup. No application change was made for that harness error.

The seat key includes event, venue, sessionId (date and time), row and number. Booking creation, physical ownership and capacity are transactional. Numbered-seat safety therefore applies to valid competition sessions at either venue. Buying without selected seats reserves tier capacity; a physical chair is allocated later by staff. Direct orchestra admission is free seating and intentionally does not lock individual numbered chairs.

## Evidence and limits

[Machine-readable results](ticketing-web-2026-10-09/orchestra-seat-diagnosis.json) retain the current-local failure, inventory counts, contention controls, successful per-scope matrix and burst timeout limitation. Prior genuine staging selected-seat payment and admin assignment evidence remains in [the staging report](TICKETING_WEB_STAGING_TEST_2026-10-09.md).

This diagnosis does not repair orchestra checkout, callback authenticity, lost-callback recovery or ngrok browser polling. Payment repository confirmation in the new matrix is substituted-provider evidence; prior genuine staging callbacks are a separate verification layer.

The temporary port-8082 emulator was stopped after testing. The owner's API on port 8080 and existing local database were left untouched. No application source, production setting, customer contact, frontend configuration, commit, push, start or build was changed. Self-review: loopback and fixture boundaries asserted, all transactions awaited before cleanup, original timetable preserved, output contacts synthetic/test-only, verification scopes and load failure retained.
