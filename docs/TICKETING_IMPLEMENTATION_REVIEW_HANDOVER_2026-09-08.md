# Ticketing implementation re-review and AI handover — 8 September 2026

**Verdict: improved, but not ready for D-day sign-off.** The existing offline suite passes all 49 tests. Nine additional expected-behavior checks fail, including a reproduction of two paid bookings receiving the same physical chair through staff assignment and public checkout. This task added diagnostic tests and documentation; it did not repair application code or deploy anything.

Read this document first in a new task. It updates the implementation status of the [approved launch-readiness plan](TICKETING_LAUNCH_READINESS_PLAN_2026-09-08.md), without replacing its confirmed business requirements. Earlier context is in the [7 September handover](TICKETING_HANDOVER_2026-09-07.md), [seat flow](SEAT_BOOKING_FLOW.md), [operating guide](TICKETING_SYSTEM_GUIDE.md), and [database architecture](architecture.md). Historical green test counts are not evidence that all paths are safe.

## Owner decisions to preserve

- Use **Invoice Paid as the normal ticket-fulfillment signal**. The owner does not want APCS to process Payment In details merely to mirror Paper.id; staff can inspect these in the Paper dashboard. Do not require both callback events to arrive before issuing tickets.
- A local 30-minute deadline requests cancellation; it does not make inventory available. Keep inventory held until confirmed payment or confirmed unpaid cancellation. Unknown provider outcomes require recovery.
- Winners select their existing profile and use their already-assigned competition session. Keep the editable email default and name selection without adding winner email verification.
- The personal extra Orchestra ticket is once per winning performance per Orchestra session. An ensemble counts as one performance. Per-purchased-ticket benefits remain separate; unpaid confirmed cancellation restores the personal claim, subject to available quota/capacity.
- Complimentary Orchestra seats belong only in reserved rows. Paid buyers cannot acquire these rows. Reserve capacity even when a buyer does not pay for seat selection.
- Staff assign unselected paid and complimentary seats from Seat Occupancy after payment; show quantities awaiting assignment. Public Customers is a related workflow, not the requested complete replacement.
- Assign all paid Masterclass add-on and complimentary passes in one booking to one later session, then email the buyer. Standalone paid Masterclass tickets retain their customer-selected session. No Masterclass attendee limit is required now.
- Whitelist membership grants ticketing-admin powers, enforced at the backend boundary. Booking-ID/manual entry verification is sufficient; public-booking QR check-in is not required.
- The approved rehearsal scope is a **fresh test event and 500 concurrent buyers**. This review did not run that rehearsal.

## Invoice Paid versus Payment In

The owner's approach is appropriate for invoice-based ticket fulfillment: a verified fully paid invoice can complete its matching booking. Payment In need not become a second fulfillment dependency or a new APCS accounting feature. Paper's [callback examples](https://open-api-paper-id.readme.io/reference/callback) distinguish the invoice callback from Payment In; its [callback integration guidance](https://open-api-paper-id.readme.io/reference/handling-api-callbacks) tells Sales Invoice integrators to register payment and invoice callbacks. Treat that registration instruction as a provider/account configuration item to verify, separate from application fulfillment logic. Do not claim the provider requires only one callback registration.

Invoice Paid alone does **not** remove the need to authenticate the notification, match the stored provider invoice, verify paid state and amount/currency through the supported contract, handle duplicates, and recover a missed callback. Dashboard investigation is useful, but it does not automatically repair a locally pending/failed booking or release its inventory. Verify the supported authentication/cancellation mechanism with Paper; do not invent headers or assume that any truthy deletion response proves an invoice is no longer payable.

## Review scope and workspace precautions

Reviewed the nine Ticketing System menu connections, Public Customers, public checkout/waiting, shared/legacy inventory writers, both Paper callback routes, cancellation/sweeper, and the previous handover requirements. The scope is the current dirty working tree, not a clean isolated new commit.

- Backend HEAD: `676a2b0f09501e69d85d0cafc0c1d8a6dc7bbdc4`.
- Frontend HEAD: `5739b3940f5dade4cf74e432f75b91836d2cf3b9`.
- `apcs_service` and `apcs_web` are nested repositories. Preserve their existing changes and unrelated root documentation/configuration changes. Do not reset, clean, or overwrite them based on this review.
- Follow `AGENTS.md`: no `npm run start`, no `npm run build`, no local browser/Playwright verification. Frontend dependency installation uses yarn; backend uses npm. No installation was needed here.
- Read both ticketing guides and `docs/architecture.md` before changes; update relevant project docs and `docs/progress.md` after repairs.
- The code-review skill requested independent Standards/Spec agents, but both failed to run because of the account usage limit. The reviews below were completed locally; they are not independent-agent sign-offs.

## Implemented improvements verified in local code

1. Checkout now derives session type from event configuration, validates sale/winner eligibility, and prevents the previously reproduced forged-Masterclass and paid-Orchestra reserved-capacity bypasses.
2. New public checkouts write `ticketSeatOwnership`, `ticketCapacity`, and `winnerOrchestraClaims`. Public-checkout-to-public-checkout alias protection and the ordinary repeat personal-bonus case have regressions. These records do not yet cover every writer or historical booking.
3. The booking persists `paymentUrl`; `ticketCheckoutKeys` allows simple same-request retries. The waiting page can retrieve public booking status without router state and keeps polling at a zero local countdown.
4. The public page removes duplicate special-session options and ignores stale seat responses. Seat Occupancy no longer declares old local locks available and removes duplicate Orchestra base slots.
5. Masterclass Assignments includes add-on-only, free-only, and combined paid-booking benefits in one assignment, storing the paid/free components. Assignment email remains absent.
6. Checkout failure, expiry, and sweeper paths retain inventory when provider cancellation fails or is unknown. This is an improvement, but duplicate failure cleanup and provider reconciliation remain unsafe/incomplete as detailed below.

## Spec review: reproduced defects

All source references are relative to the repository root; line numbers describe the reviewed snapshot and may shift. `P1` means resolve before launch. Test names below are in [ticketing-followup.audit.cjs](../apcs_service/audit/ticketing-followup.audit.cjs).

### F1 — P1: physical ownership is not enforced across inventory writers

**Evidence:** `apcs_web/src/Pages/AdminDashboard/PublicCustomersList.js:245` (`handleAssignSeatsSubmit`, through approximately 335) checks individual seat documents but neither reads nor writes `ticketSeatOwnership` or the booking's `physicalSeatKeys`. Public checkout at `apcs_service/src/repositories/PublicTicketRepository.js:516` checks the ledger for its requested physical key, not booked aliases outside that ledger. The actual frontend handler was executed in the offline fixture: paid booking A was assigned `staff-chair`; booking B selected a different available document for the same row/number and reached `PAID` too.

**Failing checks:** `actual staff assignment and public checkout cannot fulfill the same physical chair`; `the physical ownership guard includes existing booked aliases without a ledger`.

**Required outcome:** every assignment, checkout, paid override, legacy reservation, cancellation, and generator sharing a physical pool uses one canonical ownership invariant. Include `PublicCustomersList.js:352` (Mark Paid) and `apcs_service/src/repositories/TicketRepository.js:165` (legacy flow) in the writer audit. Reject duplicate aliases within one assignment as well as conflicts with other owners. Availability reads must agree with that invariant; the current public seat response still exposes raw seat-document status. Staff assigning an already capacity-reserved ticket must not reserve capacity a second time.

A fresh test event alone does not fix this: current staff assignment can create new missing-ledger ownership. Historical migration additionally needs a read-only conflict report, explicit handling of booked/locked aliases, and controlled repair. Do not silently make an occupied legacy chair available.

### F2 — P1: overlapping failed-checkout cleanup refunds another order's inventory

**Evidence:** `apcs_service/src/repositories/PublicTicketFailureRepository.js:39` skips paid/expired bookings, but a failed booking whose cleanup completed is still releasable. The earlier `cleanupStatus` guard around line 142 runs before the external cancellation call. Two callers can pass that guard before either cancellation returns. Capacity subtraction at lines 75–84 and quota refund then run twice.

**Failing check:** `overlapping failure cleanup cannot decrement another active booking capacity`. It coordinates two failure-recovery calls for A: acknowledgment 1 → release A → create booking B → acknowledgment 2 → release A again. B's paid capacity falls from **1 to 0**, and its complimentary claimed count from **2 to 0**. Seat ownership and winner-claim guards do not protect these counters. The database release transactions in this reproduction are serialized; it does not depend on a mock permitting concurrent conflicting Firestore commits.

**Required outcome:** re-read and enforce release completion/per-resource reservation ownership inside the releasing transaction, including failed terminal orders, so retrying cancellation or cleanup cannot subtract twice. Cover failure and expiry interleavings and partial cleanup recovery. This is a reproduced helper-level race; its frequency in live operation was not measured. Repair it before introducing a retry worker.

### F3 — P1: winner entitlement validation contradicts itself and the purchase UI

**Evidence:** `PublicTicketRepository.js:298–304` requires `ticketsQty + 1` selected complimentary seats before the transaction. Lines 469–476 later use `ticketsQty + personalWinnerBonus`, where a previous active claim makes the bonus zero. A repeat winner buying one ticket with seat selection cannot satisfy both checks: one selected seat fails the first check; two fail the transaction. The frontend at `PublicTicketBookingPage.js:160` still displays the old quota-capped `P + 1` calculation.

The same transaction rejects the whole paid order if the uncapped benefit exceeds remaining quota/capacity. A one-ticket purchase with one remaining complimentary quota is rejected instead of granting the one available complimentary ticket promised by the UI/prior flow. Separately, complimentary seat IDs are only count-checked when the flat selection add-on is present; an API request without it can lock three complimentary chairs for a two-pass allowance.

**Failing checks:** `a repeat winner can select the one remaining per-ticket complimentary seat`; `a winner paid purchase succeeds with a quota-capped complimentary allowance`; `complimentary seat IDs cannot exceed entitlement or bypass the selection add-on`.

**Required outcome:** calculate one authoritative allowance using the current personal claim, quota, and reserved-row capacity; enforce it on every request regardless of add-on flags; return enough information for the UI to show/select the correct quantity. Preserve the capped benefit behavior and require a new review before payment if concurrent demand changes the offered cart. Cover exhausted quota, repeat claims, restored canceled claims, and selection/no-selection branches. Do not grant excess chairs or silently charge a now-inapplicable add-on.

### F4 — P1: checkout retry can return the wrong cart or a canceled invoice

**Evidence:** `PublicTicketRepository.js:375–390` returns the existing invoice without comparing the request or checking terminal status. Reusing a key for quantity two after quantity one returns the old one-ticket invoice. Reusing a canceled booking's key returns ordinary checkout success with the old URL. In `PublicTicketBookingPage.js`, the key is assigned at approximately 533 and cleared after successful navigation, while `resetPurchaseChoices` at 179 does not clear it. Edits after a failed request can therefore reuse it. The key is only a `useRef`, so reload recovery for an unknown checkout response is not durable either.

**Failing checks:** `a reused checkout key cannot silently return an invoice for a different cart`; `a retry key for a canceled order cannot return its old invoice as checkout success`.

**Required outcome:** bind a key to a normalized checkout request; replay the same attempt with explicit state, reject changed-cart conflicts, and recover invoice creation in progress/unknown/failed/paid/canceled states without creating a second invoice or presenting a dead link as a new checkout. Keep recoverable attempt identity across a reload. Do not merely rotate the key on a network timeout: the original request may already have allocated inventory and created an invoice.

### F5 — P1: paid fulfillment does not match the stored provider invoice identity

**Evidence:** `PublicTicketRepository.js:694–709` validates amount but not `invoice.id` against the saved `invoiceId`. A payload with another provider invoice ID and matching amount fulfills the booking. Both HTTP callback routes reach fulfillment based on the invoice status/number, without application authenticity middleware in the reviewed route wiring.

**Failing check:** `paid fulfillment rejects a different provider invoice ID`.

**Required outcome:** share verification across both callback routes, authenticate using the supported Paper contract, match the stored invoice identity, and verify paid state/amount/currency using supported evidence before fulfillment. Explicitly reconcile the callback-before-invoice-save case. Do not weaken existing fixtures by making all missing invoice IDs acceptable. This repair uses Invoice Paid; Payment In processing is not required to solve it.

## Standards review and other remaining work

These findings are source-traced unless a diagnostic above is cited. They need implementation/integration verification; they are not all covered by the nine new tests.

| Priority | Finding and source | Required completion |
| --- | --- | --- |
| P1 | Backend admin routes lack authentication/whitelist enforcement: `apcs_service/src/routes/PaymentRoute.js:56,88,92`; `apcs_service/index.js` wires no global authentication. Browser Firestore transactions coexist with broad whitelist writes in `apcs_web/firestore.rules`. | Enforce verified Firebase identity and whitelist membership on admin mutations. Centralize protected inventory transitions and align rules so clients cannot bypass their invariants. Preserve the owner's whitelist-admin policy. Test unauthorized and authorized paths. |
| P1 | Callback errors are acknowledged with HTTP 200 in `PublicTicketController.js:122–125` and `PaperController.js`; a failed write can lose the notification. The sweeper queries only `pending` records and does not recover failed/unknown invoice outcomes. | Persist incoming notifications/reconciliation work durably or use supported retry responses; provide bounded retry/recovery for missing callbacks and ambiguous create/cancel outcomes. Keep inventory held until provider state is established. |
| P1 | `PublicTicketFailureRepository.js:120–124` treats any truthy delete response as confirmed cancellation. Payment arriving after local failure is rejected; manual Mark Paid is not coordinated with an in-flight provider cancellation. | Verify actual Paper account/API cancellation semantics and arbitrate payment/cancellation centrally. The documented singular delete path versus the repository's plural path is a provider-version question, not a proven endpoint bug. Exercise paid-before-cancel and late-callback races in a controlled provider test. |
| P1 | Configuration writes still overwrite cached arrays/counters: `OrchestraSettings.js:66–122`, `VenueSettings.js:89–132`, `MasterclassSettings.js:62–98`, Performer Sessions and Ticket Settings. Orchestra seat creation uses `batch.set` on IDs; `SeatEvent.js` uses a different ID shape and a snapshot-before-write generator. | Protect referenced schedules, layouts, tiers, quotas, and assignments once inventory is used. Preserve current claim counters during settings edits. Make generation idempotent without resetting occupied seats. Freeze/version configuration or revalidate the exact current configuration in the inventory transaction. |
| P1 | `PublicTicketRepository.js` bootstraps capacity from historical active bookings but does not add `capacityReservation` to those bookings; release cannot subtract their migrated demand. Ownership/winner claims are not comprehensively backfilled. | Audit migration for all active states and writers, including existing personal claims and reserved-row occupancy. Fresh-event rehearsal and existing-event migration are separate acceptance cases. |
| P1 | `SeatOccupancy.js` is still read-only (`onSelectSeat` is a no-op around line 384), and reads seat docs rather than unassigned paid/free demand. Public Customers has no complete complimentary assignment flow. | Complete the already-approved paid-only assignment workflow, pending-assignment quantities, reserved-row rules, and manual entry lookup. Verify that every purchased entitlement can be fulfilled. |
| P1 | Global limiter in `apcs_service/index.js:20–27` is 100 requests/minute/IP and covers callbacks; `WaitingPayment.js` polls every 3 seconds without backoff or in-flight protection. | Test shared-IP buyers and provider bursts; distinguish provider/admin/public traffic with suitable verified controls, bound retries/queries, and perform the approved 500-buyer rehearsal. Roughly five continuously polling buyers already consume 100 requests/minute before other API traffic. |
| P2 | Public UI's missing-price gate includes unrelated event tiers (`PublicTicketBookingPage.js:416`); the Masterclass branch uses different gating. Session assignment lists can include special slots and save does not inspect the API wrapper's `.error`. | Verify tier/venue/product-specific sale readiness and all UI branches; prevent a success message for a rejected assignment save. Do not ask winners to select an already-assigned performance slot again. |
| P2 | Checkout still stores raw client `tickets` and seat-label arrays (`PublicTicketRepository.js:583–587`) and uses client names in invoice lines. Duplicate tier entries can disagree with benefit calculations using `.find`. | Normalize/aggregate or reject duplicate tiers; persist server-derived labels/product metadata and calculate prices/benefits from the same normalized cart. Add malformed-cart coverage. |
| P2 | Both callback routes can send duplicate confirmation emails; `emailSent` is written on one path but does not make dispatch idempotent. Masterclass assignment has no email integration. Confirmation omits separate Orchestra schedule and full unassigned/benefit information. | Add durable, deduplicated, retryable delivery for confirmation and later assignment; preserve successful payment when delivery fails. Include all attendance/assignment details customers need. |
| P2 | Public Customers loads current-event bookings without pagination; the sweeper scans all pending bookings. Waiting-page public lookup falls back to registrant lookup on any error, including transient network/rate-limit errors. | Bound reads and retries; distinguish not-found from service failure; preserve correct booking type and status during recovery. |

The five reviewed frontend pages lint with **0 errors and 7 warnings**: unused values in Public Customers, Waiting Payment, and PublicTicketBookingPage; hook dependencies in Public Customers, Seat Occupancy, and PublicTicketBookingPage. These are secondary to the transaction and fulfillment defects. Backend syntax checks passed. No removed application variable or changed JSX branch was introduced by this review.

## Menu-by-menu handover

| Menu | Current assessment |
| --- | --- |
| System Settings (`14`) | Active event lookup improved; authenticated writes and event-switch/configuration safeguards remain. |
| Venue Settings (`17`) | Layout feeds inventory; destructive/cached edits and live inventory migration remain unsafe. |
| Performer Sessions (`19`) | Schedule/generator connection exists; duplicate generation and occupied-seat/configuration protection remain. |
| Ticket Settings (`18`) | Backend pricing/sale validation improved; configuration references, authoritative cart normalization, and UI price gates remain. |
| Orchestra Settings (`15`) | Public/reserved capacity separation improved; claim-counter preservation, repeat/capped benefits, and generation/assignment invariants remain. |
| Masterclass Settings (`23`) | Standalone quantity-only sales remain; protect referenced sessions/configuration. No attendee cap requested. |
| Masterclass Assignments (`25`) | Combined paid/free assignment implemented; authenticated mutation and assignment email still needed. |
| Seat Occupancy (`22`) | Local timeout and duplicate Orchestra display fixed; pending-assignment counts and assignment actions still missing. |
| Admin Page (`2`) | Winner assignment supplies public winner checkout; protect session relationships and handle rejected saves correctly. |
| Public Customers (`16`, outside submenu) | Paid assignment/override/delete guards improved but bypass canonical ownership; include this page in every inventory regression. |

## Reproduction and verification record

Run from the project root:

```sh
node --test --test-reporter=spec apcs_service/audit/public-ticket.audit.cjs apcs_service/audit/checkout-failure-boundaries.audit.cjs
node --test --test-reporter=spec apcs_service/audit/ticketing-followup.audit.cjs
```

Current result: **49 baseline passes; 9 follow-up failures; 58 total, 49 passed, 9 failed.** The follow-up command intentionally exits nonzero while the defects remain. Assertions describe required safe behavior; do not invert, skip, or delete them just to turn the suite green. The earlier progress entry's 48-test count is superseded by this measured count.

The new file reuses the existing in-memory fixture by extracting its setup before the first test. It exposes the fixture DB to execute the actual staff assignment handler and adds an awaitable mock cancellation hook. It makes no gateway, live Firestore, browser, or email calls. Its extraction boundaries are asserted so source changes fail visibly; when refactoring production code, move toward explicit testable interfaces rather than silently losing the handler test.

Limitations: in-memory transactions do not establish real Firestore contention/retry behavior, deployed rules/indexes, provider authentication/cancellation behavior, server restart recovery, email delivery, or 500-buyer capacity. No UI browser verification, start/build command, live-data mutation, payment, deployment, or email send was performed. A passing offline suite alone cannot certify D-day safety.

## Continuation priorities and acceptance evidence

Continue the already-approved launch plan with these findings as the updated repair backlog. First close F1/F2 and all bypassing inventory writers, then align entitlement/retry behavior (F3/F4) and verified invoice fulfillment/recovery (F5). Complete configuration protections and the already-approved assignment/delivery workflows before rehearsal. These are dependencies of existing requirements, not new business decisions to re-interview the owner about.

Before claiming readiness, retain the offline suite and add real Firestore emulator integration evidence for same-seat contention, mixed staff/public/legacy writers, counter conservation, duplicate cleanup, winner quotas/claims, and configuration races. Rehearse 500 buyers with a simulated payment provider against the fresh test event, including same-last-seat, different seats, unselected capacity, shared IPs, timeouts, duplicate callbacks, restart, and retry cases. Separately verify the Paper contract using controlled test invoices. The owner must manually verify public/admin UI and entry operations in their browser under the project's no-browser-agent rule.

Record the exact commands/results, what was deployed, any remaining limitations, and update both guides, architecture (if data flow changes), and progress. Do not certify zero bugs or launch readiness while any inventory/payment blocker or necessary acceptance check is unresolved.

## Suggested skills and starter prompt

Use `apcs-architect` for project conventions, `diagnosing-bugs` for each reproduced failure, `firebase:firebase-firestore` and `firebase:firebase-security-rules-auditor` when repairing transactions/rules, and `code-review` for final Standards/Spec review. Apply `domain-modeling` only if a repair introduces unresolved business rules; preserve the decisions above. User/AGENTS restrictions take precedence over a skill suggesting browser verification.

Copy into another AI task in this project:

> Read `AGENTS.md`, `docs/TICKETING_IMPLEMENTATION_REVIEW_HANDOVER_2026-09-08.md`, `docs/SEAT_BOOKING_FLOW.md`, `docs/TICKETING_SYSTEM_GUIDE.md`, and `docs/architecture.md`. Continue the approved ticketing launch-readiness work, preserving current dirty changes. Reproduce and repair the nine follow-up failures and the source-traced blockers in the latest handover, then complete the remaining approved fulfillment/configuration work. Use Invoice Paid as the normal fulfillment signal; do not add Payment In processing merely to mirror Paper. Preserve provider-confirmed inventory holds and all owner decisions. Keep meaningful regression assertions, verify real transaction behavior where possible, and report any unavailable acceptance checks honestly. Do not run npm start/build or browser/Playwright verification. Update project docs and progress with implementation and verification evidence before claiming completion.
