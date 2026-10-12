# Ticketing launch readiness audit — 7 October 2026

> **Repair update (7 October 2026, later):** five P1 findings were repaired in local code: failed, early and ambiguous paid callbacks, regeneration, and staff assignment. Attendance-only groups and staff-managed orchestra capacity (informational quota) were added. Evidence is local and emulator only: [plan](TICKETING_REPAIR_PLAN_2026-10-07.md), [repair results](audits/ticketing-emulator-results-2026-10-07-repair.json). Callback authenticity, the legacy capacity bypass and the other unselected findings below remain open. The findings and verdict below are historical observations of the pre-repair code.

**Verdict: do not open public or registrant sales yet.** The production configuration currently closes competition sales and today's eligibility. Independently, the current checkout/payment/seat-assignment source still has reproducible failure paths that can leave a paid customer without fulfilled tickets. Passing the existing audit suite does not remove these findings.

This is an audit, not an implemented repair or a production payment rehearsal. Application source, production data and provider callback configuration were not changed. At the owner's request, the follow-up below exercised disposable local records, Paper.id staging invoices/simulated payments, and messages to the supplied test contact. Findings about application behavior below refer to the current workspace; the deployed backend/frontend commit was not established. Production observations refer only to the GET responses described below. Staging observations are identified separately.

**Next repair chat:** the owner selected the three payment recovery findings, regeneration and staff seat assignment, plus attendance-only admin group classification; see [the scoped handoff](TICKETING_REPAIR_HANDOFF_2026-10-07.md). Legacy capacity work is excluded. The owner confirmed that group classification only hides/classifies members and admission is handled separately, so the original paid-orchestra quota finding remains open. Other unselected findings also remain documented; this scope decision does not change the audit evidence or launch verdict.

**Subsequent capacity decision:** orchestra seating can exceed the numbered competition layout. The owner selected no system orchestra admission ceiling, with staff responsible for capacity, and added decoupling of orchestra total/tier ceilings from competition seats to the handoff. This changes the requested policy, not the existing runtime or historical findings. The separate performance quota (previously proposed as 9999) must receive explicit treatment in the plan; removing venue-derived ceilings alone does not remove that guard.

## Verification and evidence boundaries

- Read the current `SEAT_BOOKING_FLOW.md`, `TICKETING_SYSTEM_GUIDE.md`, and `architecture.md`; traced the public page, APIs, callbacks, expiry/failure cleanup, capacity/ownership records, staff assignment, legacy seat writer, seat generator, and orchestra assignment.
- Ran `node --test --test-reporter=spec apcs_service/audit/*.audit.cjs`: **153 passed, 0 failed**. This is the overall existing suite, including result-email checks and repeated fixture control tests, not 153 unique ticketing guarantees.
- Ran **11 additional diagnostic probes** against actual repository/controller/handler source with in-memory dependencies. They reproduced the unsafe or incomplete behaviors listed below. The probes assert the observed current behavior; their successful exit is **not** a safety pass.
- Read the production public API using GET only. That production GET phase triggered no checkout, webhook, cancellation, resend, payment, database write or email.
- No browser, application start, build or deployment was performed. The subsequent local emulator and staging checks below extend transaction/payment evidence; production load, indexes and client authorization remain unverified. No production customer/provider ledger was reconciled, so this audit does not establish whether an existing real customer has already suffered a payment discrepancy.

Reproduce the diagnostics from the monorepo root:

```sh
node docs/audits/ticketing-readiness-probes-2026-10-07.cjs
```

The fixture does not emulate Firestore conflict detection/retries or the Web SDK's document-only transaction API. It allows controlled interleavings and fault injection, which demonstrate specific unsafe execution paths without claiming real database/load certification. Treat `TICKETING_READINESS_AUDIT_2026-10-07.md` as the current audit; older dated reports remain historical.

## Follow-up: real emulator transactions and Paper.id staging

The owner authorized local data mutation and supplied a test email/phone. Preflight established that the existing service used `APCS_FIRESTORE_MODE=emulator`, ngrok forwarded to `localhost:8080`, and `.env` selected `https://open-api.stag-v2.paper.id/api/v1`. `PAPER_ENV=production` controls pricing behavior here; the actual API host is staging. Port 8081 initially refused connections, and local API reads hung.

The saved October 1 snapshot was inspected on a separate port. It is historical: draft revision 25, eligibility dated October 1, and an old Behring venue time. It is not the newer local revisions mentioned elsewhere in the docs. That imported snapshot was not exported over the saved copy or exposed to the existing service's background cancellation/reminder jobs.

The first integration attempt against an imported snapshot was discarded: an assertion selected an unrelated archived historical booking, and dependency incompleteness prevented the Web SDK test. Its contention anomaly is **not evidence of a production double-booking defect**. The final run used an empty emulator on `127.0.0.1:8082`, one fixed `demo-apcs-ticketing-qa` project, an empty-database precondition, a minimal independent claim control, and cleanup of each fixture. Paper.id, email, logging and timers were substituted; Firestore reads, queries, transactions, retries, batches and commits used the actual installed server SDK.

### Final safety assertions: 13 passed, 7 failed

[Executable integration audit](../apcs_service/audit/ticketing-emulator.integration.cjs), [recorded results](audits/ticketing-emulator-results-2026-10-07.json), and [reproduction instructions](audits/TICKETING_EMULATOR_AUDIT.md).

Passing checks covered the independent transaction control; 20 buyers competing for one chair; document aliases for one chair; 20 buyers competing for the last tier place; concurrent checkout/idempotency and retry recovery; concurrent duplicate paid callbacks; failed cancellation retaining inventory; repeated confirmed expiry releasing once; payment winning while cancellation waits; manual settlement retries with no invoice; direct orchestra paid-capacity/quota limits; and the correct combined public/winner/performer attendance calculation and assignment. The emulator intermittently returned `INVALID_ARGUMENT: Transaction is invalid or closed` during concurrent idempotency requests, including the final recovery control. Retrying the same checkout recovered the existing booking; both idempotency assertions passed. This does not certify production contention or 500-buyer capacity. Firebase documents [transaction and index differences in its emulator](https://firebase.google.com/docs/emulator-suite/connect_firestore#how_the_cloud_firestore_emulator_differs_from_production).

| Failed required behavior | Actual local outcome |
| --- | --- |
| Record/recover an early paid callback | HTTP 200, invoice ID later saved, booking still pending, no durable payment receipt/replay record. |
| Record/retry a paid callback when the transaction fails | Injected failure before real commit rolled back the transaction. Both actual callback controllers returned HTTP 200, leaving a pending booking with no durable paid payload. |
| Recover payment after a lost invoice response | Failed booking, unknown cancellation, HTTP 200, no saved paid recovery. |
| Reject an unauthenticated paid callback | Matching unsigned payload persisted PAID. |
| Preserve checkout ownership during seat regeneration | Actual generator function plus real batch overwrote the newly committed chair lock with available. The generator's Web API facade used server SDK operations; this does not test client rules or UI. |
| Assign a paid customer's unselected seats through the Web SDK | Exact SDK runtime rejected `Transaction.get(Query)` with an undefined-path error. |
| Fulfill all promised orchestra attendance after payment | Winner purchase persisted PAID, then the real assignment transaction rejected the group because quota was insufficient. |

These are failing **safety assertions**, not tests that pass by expecting the unsafe behavior. The integration script exits nonzero while they remain unresolved.

### Genuine API → Paper.id staging → ngrok → Firestore

A fresh empty `apcs-profile` emulator on port 8081 contains only synthetic `QA_PAPER_20261007` records. The existing service and ngrok were reused. No production snapshot was loaded into that service's database. Public/winner seats were deliberately ready in the QA fixture; this does not prove the real event's publishing/readiness workflow or numbered inventory.

| Purchase | Checkout HTTP | Duration | Final provider invoice | Final local booking |
| --- | --- | --- | --- | --- |
| Public competition, selected A1 | 201 | 45.489 s | paid, IDR 11,000 | PAID, receipt stored, chair booked |
| Winner, selected A2 | 201 | 30.759 s | paid, IDR 11,000 | PAID, receipt stored, performer count 1 |
| Direct public orchestra, free seating | 201 | 13.802 s | paid, IDR 10,000 | PAID, receipt stored, no performance-linked benefit |

Each invoice was initialized using its legitimate staging invoice-link context, then settled through Paper.id's [documented staging simulator](https://open-api-paper-id.readme.io/reference/payment-simulation-staging-only). No real money was transferred and no browser was launched. Three genuine provider callbacks reached `/api/v1/apcs/payment/webhooks/paper-id` through ngrok and returned HTTP 200. Separate provider invoice GETs eventually confirmed all three as paid; the initial invoice read immediately after simulation was still unpaid, so it was rechecked after synchronization. Both selected seats became booked. The owner confirmed receipt of both a Paper.id invoice and an APCS confirmation email; this is inbox evidence for the tested contact, not every production recipient.

**Confirmed timeout blocker:** `apcs_web/src/services/http.js:30` gives checkout 30 seconds. Two actual staging checkouts exceeded that limit even though their bookings and invoices were created. The rehearsal allowed a longer timeout to inspect their eventual responses; it did not change the application timeout. Staging latency is not a production latency benchmark, but it directly demonstrates the existing ambiguous-checkout path.

**Confirmed shared-IP blocking:** 110 read-only booking-status requests to the actual local API returned 99 HTTP 200 and 11 HTTP 429 after one preceding staff-authorization request consumed a slot. The global limit is 100 requests/IP/minute; six still-pending browser tabs polling every three seconds exceed it. The limiter also covers callback routes, but the genuine provider callbacks in this rehearsal were not rate-limited. Protected staff settlement rejected a missing token with HTTP 401; authenticated live staff/browser acceptance was not exercised.

**Additional local startup blocker:** the owner's existing uncommitted `apcs_web/src/config/development.config.js` begins with `e3`. Source execution confirmed `ReferenceError: e3 is not defined`. The installed frontend Firebase entrypoint and `idb` build were incomplete. Those files/dependencies were preserved; no frontend app or build was launched. UI acceptance requires resolving this local setup and manual owner verification.

Private QA records and provider responses are retained under ignored `apcs_service/.local/ticketing-qa-20261007/`; 16 local QA documents were backed up, and test contacts/tokens were not added to tracked artifacts. The original saved emulator export remains unchanged. The port-8082 diagnostic emulator is stopped after testing. The port-8081 QA emulator is left running for owner review with the synthetic event active; the existing API/ngrok remain running. Stop this QA emulator before importing the original saved copy, and account for external payment/email background jobs before connecting the service to copied records.

## Live production configuration

Read from `https://api.apcsmusic.com/api/v1/apcs/` on 7 October 2026, using the Asia/Jakarta sale date. All four GETs returned HTTP 200 and `Cf-Cache-Status: DYNAMIC`; this establishes these responses were not Cloudflare cache hits, not an independently verified cache policy for every API.

| Endpoint | Observed result | Customer consequence |
| --- | --- | --- |
| `public-ticket/event-data` | `id: APCS2026`; `competitionScheduleState: {status: draft, revision: 25}` | Competition sales are intentionally closed until publish → generate numbered seats → verify and mark ready. |
| `systemSettings/global` | Active event APCS2026; eligibility enabled; sole schedule date `2026-10-03`, allowed Sapphire/Diamond/Gold/Silver/Public | No allowed tier for 7 October, or other dates unless staff change the schedule. This gate is independent of readiness. |
| `public-ticket/eligible-winners?buyerType=public` | Zero performances; `allowedTiers: []`, `eligibilityEnabled: true` | No public competition performance is selectable. |
| `public-ticket/eligible-winners` | Zero winners; same empty allowed tiers | No registrant purchase entry is selectable. |

The event response has Behring and Titan venue sessions only as `2026-11-14: []`. It separately advertises Titan orchestra sessions on `2026-11-15` at `15:30-17:30` and `19:30-21:30`, with performance quotas 15 and 8 respectively. Neither orchestra time appears in its venue's session projection. The current page lists orchestra options from `orchestraSessions`, but checkout requires the selected time in `venues[].sessions[date]` (`PublicTicketRepository.js:289`). **Code plus live configuration predicts these options will fail checkout even after eligibility opens.** No live purchase was submitted to test that prediction. Draft event-data filtering preserves configured orchestra times, so this is not explained by normal competition filtering.

Competition numbered inventory was not counted: the live schedule is still draft and public competition discovery is closed. Empty discovery is evidence of closure, not evidence that production seat records are absent.

## Critical payment-recording findings

### P1 — A failed paid callback is acknowledged without a durable recovery record

`PublicTicketController.js:174-178` and `PaperController.js:215-222` return HTTP 200 even when fulfillment throws. The paid payload is stored on the booking only inside the successful fulfillment transaction (`PublicTicketRepository.js:809`); a failed transaction leaves neither a paid booking nor a saved payment receipt/retry job.

Fault injection into **each actual controller** returned `{status: 'Error handled'}`, HTTP 200, while the booking remained pending and `paymentDetails` was absent. The status endpoint only reads Firestore. The sweeper only expires pending holds; it does not independently query Paper.id for missing paid confirmations. Logging an error is not durable payment reconciliation.

Consequences: a real provider payment can remain pending/failed locally; the buyer continues waiting, staff do not receive a fulfilled booking, and automatic recovery is absent. Paper.id's [staging guide](https://open-api-paper-id.readme.io/reference/the-staging-environment) states that staging does not retry callbacks; production retry guarantees remain unverified; the defect does not depend on assuming a particular retry count. An acknowledgement before a durable receipt/recoverable state is unsafe.

### P1 — A paid callback can precede saved invoice identity

Checkout commits booking/inventory before calling Paper.id, then saves `invoiceId` after the API response (`PublicTicketRepository.js:684-700`). `PaperRepository.createInvoice` asks Paper.id to send the invoice by email/WhatsApp as part of invoice creation. Fulfillment rejects a callback if its invoice ID does not equal the locally stored ID (`PublicTicketRepository.js:757-759`).

Probe: dispatch the actual paid callback before the mocked invoice response. It returned HTTP 200 with `Error handled`. The invoice was then saved successfully, but the booking **remained pending**; no saved callback was replayed. A fast payment or delayed/lost invoice response can therefore lose the local payment transition.

### P1 — An ambiguous invoice failure cannot recover a later paid callback

`PublicTicketFailureRepository.js:269-293` marks an uncertain invoice attempt `failed`, retains inventory, and records cancellation as unknown. Fulfillment rejects `failed` bookings before recording payment (`PublicTicketRepository.js:754-755`). The sweeper queries only pending bookings (`PublicTicketSweeper.js:11-13`), and ordinary staff Mark Paid accepts only pending bookings. The no-invoice release flow confirms absence of a payable invoice; it is not a recovery flow for a genuinely paid invoice.

Probe: invoice response fails without an invoice ID. The booking is failed/awaiting cancellation with unknown outcome; a later paid payload is rejected. **Keeping inventory held is correct**, but the customer still needs a durable provider-verification and payment-reconciliation path. Do not repair this by trusting arbitrary callback IDs or releasing seats on a timer.

### P1 — Callback authenticity is not enforced in application code

Both callback routes have no authentication middleware (`PaymentRoute.js:90`, `PaperRoute.js:6`). The controller/repository checks invoice identity, amount, and optional currency, but does not authenticate the sender or fetch trusted provider payment state. The public booking-status endpoint returns the payment URL, and the invoice is available to its recipient; matching invoice fields are not provider identity proof.

Probe: the actual public controller accepted a matching paid payload with no authentication headers and marked the fixture booking PAID. This is an offline demonstration of missing application verification, not an exploit attempt against production. External gateway/WAF restrictions, if any, were not verified. Do not invent a Paper.id signature/header contract; confirm the applicable provider-supported verification mechanism before repair.

Related configuration exposure: `POST /systemSettings/global` is also not protected by route middleware, and its repository writes the active event and sale eligibility through Admin SDK. This allows a caller that reaches the unprotected route to change the buying gates in the current source. Production protection was not tested with a POST.

## Inventory and paid-customer fulfillment findings

### P1 — Seat regeneration can overwrite a concurrent lock or paid-seat update

`SeatEvent.js:84-134` reads existing seats, preserves their status in memory, then writes them with unconditional `batch.set`. It blocks draft generation, but permits regeneration while the event is published or ready. A checkout or callback between the read and batch commit makes that preservation stale.

Probe: generator reads A1 as available → checkout atomically locks A1 → generator commits its stale available copy → real paid fulfillment rejects because A1 is no longer locked by that booking. The canonical ownership ledger still blocks another normal checkout from taking the chair; this probe establishes a broken seat/ownership state and lost fulfillment, **not** a successful second public purchase of the same chair. The same unconditional write pattern can overwrite a newer booked state with an older locked snapshot. Generation needs a transactional/exclusive boundary shared with sales.

### P1 — Staff assignment of already-paid, unselected seats calls an unsupported Web SDK API

The page permits competition purchases without explicit seat selection; their seats must later be assigned by staff. `PublicCustomersList.js:315-326` constructs a Firestore Query for seat aliases and calls `transaction.get(aliasQuery)` from the **Web SDK** imported from `firebase/firestore`.

Web `Transaction.get` accepts a **DocumentReference**, not a Query; see [Firebase Transaction.get](https://firebase.google.com/docs/reference/js/firestore.transaction#transactionget). Server Admin SDK query support does not apply to this frontend transaction. This path cannot complete on the supported Web API. Existing fixtures accept query reads and therefore conceal the incompatibility. Follow-up runtime execution with the exact workspace SDK versions (`@firebase/app` 0.10.8 and `@firebase/firestore` 4.6.5) threw `Cannot read properties of undefined (reading 'path')` when a Query was passed to `Transaction.get`. The workspace dependency tree was incomplete, so those exact versions were installed with yarn into a temporary directory. No browser or frontend dependency/lockfile change was used.

The repair must retain atomic physical-seat ownership and alias protection; merely moving alias reads outside the transaction would weaken the concurrency guarantee.

### P1 — Legacy seat reservations do not share public paid-capacity accounting

`TicketRepository.confirmSeatSelection` protects selected physical chairs but never reads or increments `ticketCapacity`. Public checkout reserves unselected quantities in `ticketCapacity`, and its initial migration counts `publicBookings`, not legacy seat bookings/other occupied chairs. Thus disjoint physical-seat guards cannot guarantee that all paid, unselected customers will fit when legacy writers use the same session.

Probe using the actual legacy function: public purchase of 10 Presto tickets without selected seats reaches PAID for a tier configured with 10 places; a legacy booking independently reserves one Presto chair. Demand is 11 for 10 places. No individual chair was double-booked in that probe. If legacy reservations remain in use, this must be reconciled into the shared capacity boundary or excluded from live sale sessions through an enforced policy.

### P1 — Payment does not guarantee advertised performance-linked orchestra attendance

Public competition and winner bookings promise subsequent orchestra attendance, but checkout reserves only competition capacity. The chosen orchestra session/quota is checked when staff assign the **paid** performance group (`OrchestraAssignmentRepository.js:94-97`).

Probe: the only orchestra session has quota 1; winner successfully pays for two competition tickets and has a three-person orchestra entitlement including the performer; staff assignment then rejects the whole group. This correctly prevents overfilling the orchestra, but does not make the sold benefit fulfillable. Staff assignment after payment remains the agreed product flow; capacity must nevertheless be guaranteed before accepting the entitlement or explicitly governed by an approved recovery policy. The current live quotas of 15 + 8 are configuration observations, not proof that all planned demand fits.

## Additional blocking/recovery risks

| Finding | Evidence and customer effect |
| --- | --- |
| Slow email can hide a completed reservation | Browser HTTP timeout is 30 seconds (`services/http.js:30`); checkout awaits holding/instruction email, while SMTP connection/socket timeouts are 120 seconds. A customer can see checkout fail after inventory/invoice already exists. Manual email-failure probe returned 503 after saving a pending booking with no expiry. The frontend keeps an error on the review page and does not navigate using the reserved booking ID in that error. |
| In-progress idempotent replay has no ready invoice | Overlapping retry with the same key returns the same booking and `paymentUrl: null` before the original invoice completes. Probe confirmed one invoice, which is good. Waiting-page polling can later recover a saved URL; process death/unknown invoice outcome lacks an automatic provider recovery path. |
| Fresh transaction still uses stale prices/sale settings | Checkout reads pricing and allowed tiers outside the transaction. Probe changed price from 150,000 to 250,000 before the transaction; booking and invoice still used 150,000. Separate probe closed eligibility before commit; checkout still succeeded. Define explicit price-version/cart binding and read the active event/eligibility in the authoritative transaction. |
| Polling and callbacks share a global rate limit | `index.js:19-28` applies 100 requests/IP/minute to all routes, including callbacks. Waiting page polls every 3 seconds: six tabs behind one effective IP produce approximately 120 status requests/minute before other calls. Proxy IP attribution, provider retry behavior, and load capacity remain unverified. |
| Data-loading errors can look like empty inventory | Performance/seat loads log failures without an actionable retry/error state. API error wrappers use `err.response`; network failures can become `{error: undefined}`, so callers do not consistently preserve the underlying failure. This is secondary to the payment/inventory findings but violates the requested clear, recoverable purchase flow. |
| Invoice URL and environment need provider verification | PaperRepository always prepends `https://` to the returned URL; a fully qualified provider URL would be malformed. Local `.env` has `PAPER_ENV=production` with a `stag-v2.paper.id` base URL. This is local configuration evidence only; deployed provider settings and response shapes were not accessed or changed. |
| Confirmation email is not a reliable fulfillment/recovery signal | Callback sends are inline; repeated callbacks may send duplicates, and dedicated callback does not persist `emailSent` consistently. Resend requires an already-paid booking and cannot repair an unrecorded payment. The owner confirmed staging invoice/confirmation delivery to the test contact; production delivery remains unverified. |

## What is already protected

- Main public checkout transaction locks selected seats, writes canonical physical ownership, reserves tier quantities including unselected tickets, and creates booking/idempotency records together.
- Same attempt/cart replay is guarded by a normalized fingerprint; changed carts and terminal attempts are rejected.
- Fulfillment binds invoice identity and amount to the saved booking and uses the booking's event, not whatever event is currently active.
- Local expiry alone does not release seats; unresolved provider cancellation retains holds. Paid bookings cannot be ordinarily released through the protected cancellation action.
- Manual-payment confirmation/cancellation endpoints require Firebase-token and whitelist authorization.
- Orchestra assignment rejects insufficient quota atomically, prevents partial group truncation, and counts the performer roster once.

These are useful safeguards. They do not cover every writer, all ambiguous provider outcomes, or all sold benefits.

## Required evidence before opening sales

This is a release acceptance checklist, not an approved implementation plan. Complex flow changes require the project's domain/grilling discussion before a plan is finalized.

1. Resolve the P1 payment receipt/authenticity/recovery, generator, staff-assignment, shared-capacity and orchestra-entitlement findings. Add safety regressions that fail on the current unsafe behavior; the observational probes are not a replacement.
2. Deploy matching frontend/backend and verify the actual deployed rules/indexes. Establish a supported provider environment, invoice URL/cancellation contract and registered Invoice Paid callback. [Paper.id's callback guide](https://open-api-paper-id.readme.io/reference/handling-api-callbacks) says Sales Invoice integration requires registering payment and invoice callbacks; staging Invoice Paid delivery was verified in the follow-up; production registration and delivery remain unverified.
3. Publish the intended competition schedule, generate/verify real numbered inventory, and mark ready. Fix the orchestra session/venue projection. Configure approved sale dates/tiers; do not bypass readiness/eligibility validation to open the page.
4. Reconcile provider invoice/payment state with existing bookings and inventory before selling, using read-only inspection first. A production GET configuration audit cannot certify payment-ledger completeness.
5. In an isolated database with a supported test provider/contact, exercise public performance, winner, direct orchestra and manual payment; simultaneous buyers/last capacity; duplicate/delayed/early callbacks; invoice timeout and process restart; payment/cancellation overlap; regeneration overlap; paid unselected-seat assignment; and email failure/retry. Verify one valid inventory owner and a durably recorded payment/reconciliation outcome for every accepted payment.
6. Have the owner verify the UI in their browser: visible sale-closed reason, eligible entry, correct cart/price, unavailable-seat refresh, popup-blocked invoice access, reload/direct-link payment recovery, reserved-booking recovery after timeout, and paid confirmation. Complete inbox acceptance separately. No browser verification was performed in this audit.

## Self-review

Standards: audit-only; no restricted start/build/browser/commit/push actions. Spec: checked both public and registrant paths, actual live closure, payment recording, seat/capacity writers and later fulfillment. Hygiene/consistency: no application variables, imports, branches or schemas were edited. Diagnostic fixtures substitute external integrations; the separately authorized staging rehearsal used only the supplied test contact. A guarded integration script, isolated emulator configuration and result artifact were added; existing application and nested repository edits were preserved. Both primary ticketing documents and the project progress log reference this audit, without presenting the findings as repaired.
