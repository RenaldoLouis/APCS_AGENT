# Event-day ticket redemption

Implemented 13 October 2026. Entry point: **Admin Dashboard → Ticketing System → Ticket Redemption**. This page records staff handing over tickets covered by an existing paid booking. It is separate from Public Customers, seat assignment, payment confirmation, RSVP attendance and individual hall-entry check-in.

## Allowances

| Booking / entitlement | Session | Redemption quantity |
| --- | --- | --- |
| Paid performance booking | Saved purchased performance venue/date/time | Paid Presto/Allegro/Lento ticket quantities, each category independently |
| Paid direct public orchestra booking | Saved purchased orchestra session | Purchased categories, free seating, no numbered seats |
| Paid version-2 performance booking's orchestra benefit | Saved orchestra assignment covering that booking and matching the current session | Its `orchestraAttendanceTickets`, labeled Orchestra tickets without inferring an orchestra tier from competition categories |
| Performers in a paid winner group | Same covered orchestra assignment | One shared performer allowance across the event/registration, based on its assignment snapshot and rechecked paid winner entitlement |
| Historical complimentary orchestra tickets | Booking's original saved orchestra session | Original `complimentaryTickets`; no new shared performer bonus |

Example: three performers, winner booking A with two paid tickets and booking B with four paid tickets. A can redeem two performance tickets and two assigned orchestra tickets. B can redeem four performance tickets and four assigned orchestra tickets. Either covered booking can access the shared three performer places; redeeming two there leaves one visible through both bookings. All ticket allowances support partial arrivals. A public-only performance group has no performer allowance.

No unpaid booking, assignment-board membership or `willAttend` flag establishes admission. Missing/changed/uncovered orchestra assignments block orchestra redemption. Archived test/wrong-event bookings cannot be opened. Unsupported or invalid historical ticket data is directed to review. Historical Masterclass passes remain outside this workflow.

## Staff walkthrough

1. Choose the event, find the exact Booking ID from the customer's email, or explicitly search/load the list. Searches use the saved buyer/performance/contact fields. Each server request returns up to 25 matches after examining up to 500 event records; continue with **Search / load more** if more remain. Clear the search text and search again for the full list. No booking collection is loaded automatically on mount.
2. Open redemption and confirm buyer/contact, paid status and the appropriate allowance's venue/date/time. The purchased performance session in the main list is distinct from the assigned orchestra session shown in the booking panel. Resolve missing numbered performance seating through Public Customers/Seat Occupancy; redemption does not allocate seats.
3. Enter the quantity for each applicable category, review the buyer/session/quantities, and record redemption. Issue tickets only after the saved claim is confirmed. Counts, remaining entitlement and latest 20 actions refresh.
4. Use the separate shared block for performers; never add them to each buyer's ticket count. Direct orchestra buyers have category-specific free-seating tickets without performer places.
5. If a claim response is uncertain, retry the saved request. It survives refreshing in the same browser tab and is scoped to the staff UID. Further claims are disabled until resolved. Transport errors, HTTP 408/5xx and incomplete acknowledgements retain the request; authentication or rate limiting also retain it so an earlier uncertain operation is not lost. Sign in again/wait as the error requires, then retry. Do not issue additional tickets during uncertainty. The original request ID, session, revision and quantities stay unchanged.
6. Correct a mistaken active claim with **Undo claim** and an explanatory reason. Original and correction remain recorded; repeated or concurrent undo cannot restore twice. A retry of the now-undone original claim rejects and cannot authorize handover. Undo all active orchestra and performer claims before changing an orchestra group's session. Updating the same session to cover a new purchase preserves existing redemption.

History records the original booking, quantity, session, staff UID/email and server timestamp. Display times use Asia/Jakarta. This is a handover record, not a person-by-person hall-entry scan. Staff verify the actual session; the feature has no automatic event-day date gate. Buying, seat ownership, physical capacity and assigned-group quantities are not changed by redemption.

## Release and owner acceptance

Release the frontend and backend together, restart the backend through the normal workflow, and deploy `apcs_web/firestore.rules`. The new `ticketRedemptions` collection and all descendants allow whitelisted reads and backend-only writes; they are excluded from the broad fallback. Do not claim production rule enforcement before deployment. New collection documents are created only on redemption; no migration or booking backfill is required.

Manually verify these cases in the owner's browser; the agent did not launch/use a browser:

- The new sidebar page, event selection, exact lookup, search continuation and narrow-screen modal/table layout.
- Paid performance: claim part of each category; verify remaining quantities and independently unchanged orchestra/performer counts.
- Direct orchestra: bought category quantities, correct paid session, free seating and no numbered-seat controls.
- Performance-linked orchestra: pending assignment prevents handover; a saved covering assignment enables it. A new booking outside the saved snapshot remains blocked until the group is updated.
- Two buyers for one three-person ensemble: performer places are shared once; buyer tickets stay separate. A group with only public competition purchases has no performer places.
- Pending/failed/expired bookings are blocked; archived and wrong-event IDs are unavailable.
- Two staff screens opened before a claim: the second stale submission rejects and refreshes, rather than issuing extra tickets.
- Lost connection/server response: no success notice or new claim; saved retry uses the same ID. Refresh the same tab, retry and see one claim action.
- Undo with a reason: only that claim is restored, history retains both actions; a second undo is unavailable. Orchestra reassignment is blocked while active claims exist and succeeds after they are all corrected.
- Existing Public Customers, payment actions, seat assignment and confirmation emails retain their original behavior.

## Verification

**Isolation follow-up:** **234/234 backend audits, 311/311 frontend unit/logic tests, 3/3 actual HTTP checks and 4/4 source comparisons** passed. The broader frontend run uses explicit Node-only Firebase/file shims, without a browser. Busy redemption traffic originally shared the buyer/API rate-limit bucket; it now uses a separate protected 100-request/minute/IP bucket, leaving the existing buying/global budget intact. Normal backend restart is required to load the middleware repair. The deliberate assignment guard still applies only to issued orchestra/performer entitlements; purchase and same-session updates remain available. [Full review and repeatable evidence](audits/TICKET_REDEMPTION_ISOLATION_REVIEW_2026-10-13.md).

Offline audit command: `node --test --test-reporter=spec apcs_service/audit/*.audit.cjs`: **225/225 passed**. Focused Node-only frontend tests cover the actual API wrapper, actual handover handler and pending-request helpers: **26/26 passed**, with no DOM/browser. Changed-file ESLint has no errors and two existing shared-API warnings (unused `patchRequest`, duplicate legacy `payment` key). Backend syntax, whitespace and removed-reference checks passed. Standards/spec/hygiene review checked independent allowance branches, paid/assignment guards, shared counts, replay/correction paths and all newly introduced declarations.

An isolated real Firestore emulator on `127.0.0.1:8082`, project `demo-apcs-redemption-qa`, passed **7/7 checks** with synthetic data: concurrent staff claims, identical concurrent request replay, shared performer claims through different bookings, concurrent undo, rejection of replay after undo, redeemed-assignment move rejection, and actual rules denying whitelisted client writes to state/history/replay keys while permitting reads. The script explicitly refuses other emulator hosts or a nonempty QA project, never loads the application configuration/jobs/providers, deletes its synthetic records, and terminates its SDKs. The disposable emulator was stopped afterward. Its lock-contention warnings converged through SDK retries; all seven assertions passed. [Saved results](audits/evidence/2026-10-13-ticket-redemption/emulator-results.json), [executable check](../apcs_service/audit/ticket-redemption-emulator.integration.cjs).

The already running frontend compiler reported warnings, with no errors. Browser layout/usability, the released backend/API and deployed production rules remain separate owner/release acceptance. No customer database, live invoice/payment, email, export, production deployment, dependency install, commit or push was performed. Existing unrelated working-tree changes were preserved.
