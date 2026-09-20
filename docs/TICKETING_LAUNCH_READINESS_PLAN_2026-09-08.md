# Ticketing launch readiness — approved plan and model handoff

> **Later status:** the [implementation re-review handover](TICKETING_IMPLEMENTATION_REVIEW_HANDOVER_2026-09-08.md) records subsequent improvements and remaining failures. It also clarifies the owner's Invoice Paid-only fulfillment scope. The approved plan below is retained as historical scope.

Prepared **8 September 2026**. The owner reviewed and approved the plan below, then requested this project Markdown handoff for another task/model.

**Status: approved plan; implementation has not started in this task.** The work performed here was read-only code/document review, offline diagnostics, and this documentation handoff. Existing application edits belong to earlier work and must be preserved. No deployment, live database mutation, actual payment, email send, or browser verification was performed.

## 1. Start here

The owner wants every Ticketing System menu to work together from initial event/venue setup through public ticket purchase, payment, physical seat assignment, and event-day entry. Their highest priorities are preventing two buyers from obtaining the same physical seat and ensuring buyers can complete or recover payment reliably.

Two decisions were explicitly confirmed in this task:

- **Environment:** a fresh test event. This is not permission to delete other events, reset shared data, or assume the current active event is disposable.
- **Rehearsal target:** **500 concurrent buyers**, including buyers sharing venue Wi-Fi.

Read these files before implementation:

1. [Project instructions](../AGENTS.md).
2. [Domain glossary](../CONTEXT.md).
3. [Technical ticketing flow](SEAT_BOOKING_FLOW.md) and [staff ticketing guide](TICKETING_SYSTEM_GUIDE.md).
4. [Database and application architecture](architecture.md).
5. [Progress log](progress.md), especially the latest entries.
6. [Previous handover](TICKETING_HANDOVER_2026-09-07.md) and [original audit](TICKETING_AUDIT_2026-09-06.md) for historical repairs and business decisions.

This document is the latest approved launch-readiness plan. Earlier documents contain historical findings and repair annotations; use current code and the latest progress entries to distinguish implemented behavior from outstanding work. Do not repeat questions already answered here or in the domain glossary.

## 2. Approved plan

The following is the approved plan, preserved from the conversation.

### Ticketing launch-readiness plan

#### Current assessment

**The system is not ready for public sales.** All nine menu entries are connected, but their combined behavior still has critical gaps.

The existing **42 offline tests pass**. Additional probes against the actual application code reproduced:

- **Two `PAID` bookings for the same physical chair** when it has two document IDs—the current generators use different formats.
- A client-supplied Masterclass flag bypassing seated-ticket capacity checks.
- Unselected paid Orchestra tickets consuming capacity that belongs exclusively to complimentary reserved rows.
- The winner’s extra Orchestra ticket being granted again after a completed purchase.
- The waiting-page timer declaring expiry and stopping payment polling without provider confirmation.

Code review also found missing backend authorization, unsafe configuration writes, incomplete assignment workflows, and payment-recovery gaps. No application files were changed.

#### Configuration and inventory repairs

| Menu | Required integration work |
|---|---|
| System Settings | Validate the active event; reject checkout when authoritative settings cannot be read; retain each booking’s original event throughout fulfillment. |
| Venue Settings | Validate unique physical rows and tier mappings; prevent changes that invalidate existing inventory or bookings. |
| Performer Sessions | Use one shared seat generator; reject conflicting schedules; publish inventory only after generation completes successfully. |
| Ticket Settings | Validate product IDs, applicable venue prices, add-ons, and Jakarta sale dates consistently on frontend and backend. |
| Orchestra Settings | Share canonical seat inventory; preserve current claim counters during edits; separate paid capacity from reserved complimentary capacity. |
| Masterclass Settings | Identify standalone sessions consistently and protect sessions referenced by purchases or assignments. |
| Masterclass Assignments | Assign paid add-on and complimentary passes together after payment, then notify the buyer. |
| Seat Occupancy | Show paid tickets awaiting assignment and support both paid-seat and complimentary-seat assignment. |
| Admin Page | Validate saved winner assignments against competition sessions; surface failed saves and prevent orphaning purchased entitlements. |

Use one physical-seat identity based on event, venue, session, row, and number; tier and display-label formatting must not create another chair.

Centralize inventory mutations behind authenticated backend operations. Checkout, staff assignment, payment, cancellation, and any legacy flow sharing seats must enforce the same ownership rules. Replace growing booking scans with transactional capacity records per session and seating pool. Reserve unselected quantities immediately; assigning a physical seat must not consume capacity twice.

Persist the winner’s personal claim per event, winning performance, and Orchestra session. Concurrent purchases cannot claim it twice; confirmed unpaid cancellation restores it exactly once.

#### Public purchase and payment repairs

- Return an authoritative session catalogue so Orchestra and Masterclass slots cannot also appear as ordinary competition sessions. Continue deriving a winner’s competition session from their saved assignment.
- Derive product type, prices, seat labels, benefits, and capacity rules on the backend. Reject invalid quantities, unknown add-ons, and mismatched selections.
- Preserve existing cart-reset repairs; discard stale seat-fetch responses and provide recovery when another buyer obtains a selected seat.
- Add an idempotency key to checkout so retries recover the same booking and invoice.
- Persist the payment URL and provide a public booking-status URL that works without router state. Continue reconciliation after the local deadline; show confirmed payment, confirmed cancellation, and unresolved outcomes distinctly.
- Route both payment callbacks through shared verification and fulfillment. Verify invoice identity, payment amount, currency, and provider status using the supported Paper.id contract. Confirm both required callback registrations in the test environment. [Paper.id callback documentation](https://open-api-paper-id.readme.io/reference/handling-api-callbacks)
- Add durable retries for invoice uncertainty, cancellation, fulfillment, and email delivery. Unknown provider outcomes retain inventory and appear in staff reconciliation.
- Enforce Firebase authentication and whitelist membership for ticketing administration. Make confirmations retryable without duplicate dispatch from repeated callbacks.
- Include Public Customers and booking-ID entry verification in the review, although Public Customers sits outside this submenu.

#### Verification and launch gates

- Preserve the 42 passing tests and add regression assertions for every reproduced defect.
- Use Firestore emulator integration tests to verify actual transaction contention; the existing in-memory fixtures do not prove concurrent safety.
- Rehearse **500 concurrent buyers**, covering the same last seat, different seats, unselected capacity, reserved rows, repeat winner claims, simultaneous staff assignment, and configuration changes.
- Require zero duplicate physical-seat ownership, overselling, repeated personal claims, or releases of another booking’s inventory.
- Exercise duplicate checkout requests, delayed/repeated callbacks, cancellation versus payment races, server restart, provider timeouts, email failure, direct status links, and shared-IP rate limiting.
- Run load tests with a simulated payment provider; separately verify controlled Paper.id sandbox purchases and cancellation behavior.
- Provide an owner-run browser walkthrough from fresh setup through purchase, assignment, and entry. Follow project restrictions: no automated browser verification and no prohibited start/build commands.
- Update both ticketing guides, architecture, the audit record, and progress log with evidence and remaining blockers. Production readiness requires the controlled provider and owner walkthrough checks to pass.

#### Confirmed defaults

Use a **fresh test event** and a **500-buyer** target. Preserve paid-only manual seat assignment, exclusive complimentary Orchestra rows, one personal bonus per winning performance/session, combined Masterclass benefit assignment, editable buyer email, and booking-ID entry verification. Masterclass remains uncapped. Existing unrelated events and workspace changes are preserved.

## 3. Evidence and practical starting points

### Existing diagnostic baseline

Run from the project root:

```sh
node --test --test-reporter=spec apcs_service/audit/public-ticket.audit.cjs apcs_service/audit/checkout-failure-boundaries.audit.cjs
```

Executed during the 8 September review: **42 tests, 42 passed, 0 failed**. These tests load real repository/job code with in-memory Firestore and payment dependencies. They do not test real Firestore locking/retries, deployed rules/indexes, browser behavior, gateway contracts, or deployment capacity.

### Additional reproduced failures

The five scenarios below were executed with temporary, in-memory Node/VM probes. They were **not added to the saved 42-test suite**. Make them permanent regression tests before repairing their respective code paths.

| Scenario | Observed result | Required result |
|---|---|---|
| Seed two documents with the same event, venue, session, row, and number; buy each ID in a separate checkout and fulfill both | Both bookings reached `PAID` | Only one booking may own the physical chair |
| Submit 100 Presto tickets for the fixture competition slot with `isMasterclass: true` | Checkout accepted, despite capacity of 10 Presto seats | Reject the product mismatch and protect seated capacity |
| Add the Orchestra time to the venue schedule; reserve all Presto rows for complimentary seats; buy 10 unselected paid Presto tickets | Checkout accepted despite no eligible paid Presto seats in that slot | Paid capacity excludes reserved rows |
| Buy one ticket as the fixture winner, mark paid, then buy another for the same Orchestra session | Complimentary counts were 2 and 2 | Second booking receives the per-purchased-ticket benefit only: 1 |
| Execute the real waiting-page timer effect with an elapsed local deadline and no provider response | Status became `EXPIRED`; `stopPolling.current` became `true` | Keep checking authoritative payment/cancellation status |

The duplicate-chair probe proves a sequential fulfillment defect when alias documents exist. It is not a substitute for a real concurrent Firestore test.

To reconstruct the checkout probes, reuse the `fixture()` setup in [public-ticket.audit.cjs](../apcs_service/audit/public-ticket.audit.cjs). Its `seat(id, overrides)` helper seeds inventory, `book(overrides)` calls actual checkout, and `repo.handlePublicTicketWebhookPaid()` calls actual fulfillment. Use two seat IDs with identical physical fields for the first scenario. The fixture's standard one-ticket amount is 150000 IDR, or 160000 IDR with one `seat_selection_performer` add-on. Timer probes should exercise the actual timer effect in the waiting page, not an independently rewritten timer.

### Source map for the next model

| Area | Starting files and facts verified during this review |
|---|---|
| Public flow | [PublicTicketBookingPage.js](../apcs_web/src/Pages/TicketBooking/PublicTicketBookingPage.js): `allSessions` duplicates configured special-event slots as competition slots; reset handlers already exist; seat fetches lack stale-response guards; `hasMissingPricing` checks all tiers while Masterclass progression bypasses that gate. |
| Checkout and capacity | [PublicTicketRepository.js](../apcs_service/src/repositories/PublicTicketRepository.js): `createPublicTicketBooking` trusts product flags, checks document-ID uniqueness rather than physical-chair uniqueness, derives capacity from all configured tier rows, and calculates the personal winner bonus on each purchase. Settings-read helpers also fall back when reads fail. |
| Physical seat generation | [SeatEvent.js](../apcs_web/src/Pages/AdminDashboard/SeatEvent.js): `uploadFullSeatLayout` uses `row+number`; [OrchestraSettings.js](../apcs_web/src/Pages/AdminDashboard/OrchestraSettings.js) uses `row-number`. Snapshot-based batch writes can overwrite newer seat state; new Orchestra generation writes available seats directly. |
| Settings and winner assignment | Venue/Performer/Orchestra/Masterclass/Ticket Settings write cached arrays. [SessionAssignmentManager.js](../apcs_web/src/components/molecules/AdminContentComponent/SessionAssignmentManager.js) lists venue slots and saves through an API wrapper that returns errors as values; save success must be checked explicitly. |
| Payment waiting | [WaitingPayment.js](../apcs_web/src/Pages/Register/WaitingPayment.js): public classification and initial payment link depend on router state; the timer stops polling locally. The backend status endpoint reads `paymentUrl`, but checkout currently persists only the invoice ID. |
| Payment callbacks | [PublicTicketController.js](../apcs_service/src/controllers/PublicTicketController.js), [PaperController.js](../apcs_service/src/controllers/PaperController.js), and their routes: both call shared public fulfillment, but application-level authenticity checks are absent. Duplicate callbacks can send duplicate emails; the dedicated route acknowledges processing errors with HTTP 200. |
| Cancellation and recovery | [PublicTicketFailureRepository.js](../apcs_service/src/repositories/PublicTicketFailureRepository.js) retains unresolved holds, but treats a truthy invoice-delete return as cancellation confirmation. [PublicTicketSweeper.js](../apcs_service/src/jobs/PublicTicketSweeper.js) scans pending bookings; failed bookings awaiting reconciliation lack a complete recovery worker. |
| Staff fulfillment | [SeatOccupancy.js](../apcs_web/src/Pages/AdminDashboard/SeatOccupancy.js) is read-only and repeats Orchestra base slots. [MasterclassAssignments.js](../apcs_web/src/Pages/AdminDashboard/MasterclassAssignments.js) handles complimentary passes only. Preserve prior safeguards in [PublicCustomersList.js](../apcs_web/src/Pages/AdminDashboard/PublicCustomersList.js). |
| Shared inventory and trust boundaries | [TicketRepository.js](../apcs_service/src/repositories/TicketRepository.js) is the legacy seat flow; inspect every writer sharing the event inventory. [firestore.rules](../apcs_web/firestore.rules) currently allows whitelisted users broad writes; backend centralization requires corresponding rules and client changes so old direct writes do not bypass new invariants. |
| Event-day traffic | [Backend entrypoint](../apcs_service/index.js) has a global 100-request/minute/IP limiter covering the mounted routes. Each waiting page polls every 3 seconds (20 requests/minute before other traffic). Shared Wi-Fi and gateway callback bursts need explicit coverage. |

### Payment-provider facts and limits

The official [callback guide](https://open-api-paper-id.readme.io/reference/handling-api-callbacks) says Sales Invoice integrations must register the URL for both payment and invoice callbacks. This review did not verify the account's actual callback configuration or establish a supported callback-signature mechanism.

The published [Delete Sales Invoice endpoint](https://open-api-paper-id.readme.io/reference/delete-sales-invoice) uses `sales-invoice/{invoice_id}`, while the current repository calls `sales-invoices/{invoiceId}` relative to its configured base URL. Verify the account/API version and actual response semantics before changing the integration; this difference alone does not prove the deployed endpoint is wrong. Do not invent signature headers, assume deletion makes a payment link unpayable, or release inventory on an ambiguous response.

Gateway credentials, sandbox event identifiers, deployed indexes/rules, infrastructure behavior, and live delivery are **unverified external prerequisites**, not completed checks. Do not run the 500-buyer load test against a real payment gateway.

## 4. Business rules to preserve

The full definitions live in [CONTEXT.md](../CONTEXT.md) and the [previous handover](TICKETING_HANDOVER_2026-09-07.md). These are the high-impact constraints:

- An ensemble is one winning performance, irrespective of member count. The extra personal Orchestra ticket is once per winning performance per Orchestra session; the separate per-purchased-ticket benefit remains.
- A winner already has a competition assignment. Do not add a redundant competition-session selection step; the complimentary Orchestra session remains a separate choice.
- Tickets without the relevant selection add-on receive physical seats through staff assignment from Seat Occupancy after confirmed payment. Protect capacity before assignment; do not silently introduce automatic physical allocation.
- All complimentary Orchestra seats stay in reserved rows, whether customer-selected or staff-assigned. Paid buyers cannot buy access to those rows.
- Local timeout requests cancellation. Unknown or failed provider outcomes keep seats unavailable; only confirmed unpaid cancellation releases inventory and unpaid entitlement claims.
- Standalone Masterclass tickets retain the customer-selected session. Paid Masterclass add-on passes and complimentary passes from one booking are assigned together to one session after payment, then emailed. Masterclass currently has no attendee limit.
- Winner selection defaults to the registrant email and keeps it editable. Name selection does not require email verification; enforce eligibility and entitlement limits in the backend.
- Whitelist membership grants ticketing-admin powers. No new role hierarchy or mandatory public-ticket QR is required; staff booking-ID verification is sufficient.

## 5. Implementation handoff discipline

Suggested order, following the approved dependencies: preserve the baseline and add reproductions; establish authenticated mutation boundaries and canonical inventory; integrate transactional capacity and winner claims with payment/cancellation; connect configuration and staff fulfillment; complete public recovery and communication; run emulator, load, controlled-provider, and owner browser acceptance checks.

The approved plan establishes behavior and architectural direction. Exact new collection names, endpoint names, migration tooling, provider adapter details, retry intervals, and load-test latency budgets have **not** been implemented or verified. Resolve engineering details against current code and official provider documentation; do not present them as previously confirmed facts. Ask the owner only when a new business decision or unavailable external prerequisite is necessary.

### Workspace precautions

- The root, `apcs_web`, and `apcs_service` are separate Git repositories. Inspect each independently; the root currently reports the nested repositories as untracked directories.
- Existing dirty files include ticketing repairs and unrelated work. In particular preserve `.gitignore`, `AGENTS.md`, `docs/business_perspective.md`, `scratch/`, the jury reminder changes, and frontend development configuration. Do not reset, clean, bulk-stage, or overwrite these to simplify implementation.
- This document is initially an uncommitted local file. Start the next task against this same working directory, or explicitly include the working-tree files when using another checkout/worktree. A clean checkout may omit both this handoff and the prior application repairs.
- Never run `npm run start` or `npm run build`. Use yarn for frontend dependency installation and npm for backend dependency installation.
- Do not launch a browser, Playwright, or browser subagent for verification. Give the owner manual browser acceptance instructions. Use offline and emulator checks for agent-run verification.
- Follow callback error-handling conventions, perform complete stale-reference and conditional-branch checks after edits, and update the project documentation as each repair is completed.
- Update both ticketing guides after ticketing changes, architecture for database/data-flow changes, and `docs/progress.md` for completed work. Do not mark this approved plan or the whole system complete merely because static checks pass.

### Suggested skills

- `apcs-architect`: required project architecture and UI conventions; current AGENTS.md and explicit owner instructions override conflicting skill guidance.
- `diagnosing-bugs`: reproduce each defect at the real call boundary before targeted repairs.
- `firebase:firebase-firestore`: when implementing the new transactional inventory/claim records, queries, or indexes.
- `firebase:firebase-security-rules-auditor`: when checking that direct Firestore writes cannot bypass the new backend invariants.
- `grilling` or `domain-modeling`: only for unresolved business/model decisions; preserve the already confirmed answers above.

## 6. Starter prompt for the next task/model

Copy this into a new task in the same project working directory:

> Read `docs/TICKETING_LAUNCH_READINESS_PLAN_2026-09-08.md` first, then its required project references. This is the ticketing launch-readiness plan I reviewed and approved. Implement it in dependency order, preserving the existing uncommitted repairs and all confirmed business rules. Use a fresh isolated test event and a 500-concurrent-buyer rehearsal target. Start by checking all three Git working trees, rerunning the existing 42-test offline suite, and adding regression coverage for the five additional reproduced defects. Prevent duplicate physical-seat sales across every writer, protect unselected and reserved-row capacity, and complete public payment recovery and staff fulfillment. Follow AGENTS.md: no prohibited start/build commands or browser/Playwright verification. Update the ticketing guides, architecture where needed, and progress log as work completes. Clearly separate offline/emulator results from controlled provider tests and owner-run browser checks. Do not deploy, reset shared event data, send real customer emails, or create real charges as part of the test rehearsal. If a provider contract or unavailable environment blocks a release check, identify it precisely and continue independent work. Do not reopen business decisions already documented, and do not claim production readiness until every launch gate has evidence.
