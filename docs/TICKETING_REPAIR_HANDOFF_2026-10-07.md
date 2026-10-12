# Ticketing repair handoff — owner-selected scope, 7 October 2026

> **Update (7 October 2026, later):** the selected scope was implemented. See the [repair plan](TICKETING_REPAIR_PLAN_2026-10-07.md), [walkthrough](TICKETING_REPAIR_WALKTHROUGH_2026-10-07.md) and [progress entry](progress.md). Emulator integration now records 23 pass / 1 deferred fail ([results](audits/ticketing-emulator-results-2026-10-07-repair.json)). The handoff text below is the historical pre-implementation brief. Sales remain not certified ready.

This document is the entry point for the next implementation chat. It preserves the owner's latest scope and the evidence already collected. **No application repairs or group-classification feature have been implemented. Sales are not certified ready.** Read the existing evidence instead of repeating the entire audit; refresh only facts that can drift or code affected by the repair.

Use the [final copyable agent prompt](TICKETING_REPAIR_PROMPT_2026-10-07.md) to dispatch this work. It includes all five original repairs, group classification and the final staff-managed orchestra capacity decision. It supersedes earlier chat prompt versions that predate the capacity discussion.

## Read first

1. Root `AGENTS.md`, plus applicable nested instructions and the current status of the root, `apcs_service` and `apcs_web` Git repositories.
2. [Readiness audit](TICKETING_READINESS_AUDIT_2026-10-07.md): complete findings, source references, observed customer effects, production GET configuration and staging boundaries.
3. [Recorded emulator results](audits/ticketing-emulator-results-2026-10-07.json) and [reproduction instructions](audits/TICKETING_EMULATOR_AUDIT.md).
4. [Seat booking flow](SEAT_BOOKING_FLOW.md), [ticketing guide](TICKETING_SYSTEM_GUIDE.md), [architecture](architecture.md), root `CONTEXT.md` and [progress](progress.md).

The readiness report remains the evidence source. This handoff changes **repair priorities**, not its historical observations or launch verdict.

## Subsequent clarification: orchestra capacity differs from competition layout

The owner clarified that `venues[].seatConfig` describes the numbered competition layout. Orchestra sessions use a flexible layout in the same venue, with additional seating possible; the competition seat count should therefore not be assumed to be the orchestra admission ceiling. This corrects the domain assumption behind the current coupling, without claiming unlimited attendance can always be fulfilled.

Current coupling occurs in orchestra settings save, paid-group assignment, and direct public orchestra checkout. Direct public tier limits also come from competition `seatConfig`; removing only the quota-versus-total check would leave those tier limits in place. A consistent repair must use the selected orchestra policy across these paths while retaining competition seat validation.

**Owner decision: no system capacity ceiling for orchestra; staff manage admission capacity manually.** Do not add a separate orchestra capacity field or pre-payment admission-reservation redesign to this batch. Remove the orchestra admission ceiling derived from the competition seat layout consistently in settings save, group assignment and direct public checkout, including direct orchestra tier ceilings derived from competition seat rows. Retain normal numbered competition capacity/seat validation, valid ticket quantities, server prices, payment validation, idempotency and accurate transactional attendance counters. This is an accepted operational policy, not software proof that every paid attendance group physically fits. The classify/hide-only group feature remains separate.

The owner earlier proposed **9999 for the performance-linked quota**. That field and its assigned-group guard are distinct from the venue-derived ceiling. The next plan must state explicitly whether it retains that editable quota (with 9999 as the owner's intended allowance) or also changes it to informational-only. Do not silently remove all quota semantics or claim that removing the venue ceiling alone prevents every quota rejection. This is the remaining quota-specific detail to resolve; the no-venue-capacity-ceiling decision itself is settled.

## Owner's selected work

| Selected finding | Existing evidence | Required customer outcome |
| --- | --- | --- |
| P1 — A failed paid callback is acknowledged without a durable recovery record | Both real callback controllers returned HTTP 200 after an injected pre-commit transaction failure; booking stayed pending with no payment details or durable replay record. | A received payment cannot disappear when fulfillment fails. A successful acknowledgement must follow a durable, recoverable receipt; persistence failure must not pretend successful processing. Recovery must survive a service restart. |
| P1 — A paid callback can precede saved invoice identity | Callback arrived before the invoice response was saved: HTTP 200, then invoice ID persisted, booking remained pending. | Preserve the early callback and reconcile/replay it once authoritative invoice identity is available, with duplicate handling and existing amount/currency/ownership checks. |
| P1 — An ambiguous invoice failure cannot recover a later paid callback | Lost invoice response produced a failed booking with unknown cancellation; a later matching paid callback was rejected and acknowledged with HTTP 200. | Distinguish an uncertain provider outcome from a definitively unpaid/cancelled booking. A genuinely paid invoice must reach paid fulfillment or durable reconciliation, while its inventory remains protected. Never release on elapsed time alone. |
| P1 — Seat regeneration can overwrite a concurrent lock or paid-seat update | The actual generator plus real emulator batch overwrote a newly committed checkout lock with `available`. Canonical ownership still prevented a normal second public checkout. | Generation must preserve current locked/booked/owned seats under overlap with checkout, payment and staff assignment, or be safely refused while those operations are possible. |
| P1 — Staff assignment of already-paid, unselected seats calls an unsupported Web SDK API | Exact-version Web SDK `Transaction.get(Query)` threw `Cannot read properties of undefined (reading 'path')`. | Paid unselected tickets can be assigned through a supported, authorized, atomic path that retains canonical chair/alias protection and booking/session/tier/quantity validation. Moving alias reads outside the transaction alone is insufficient. |
| Orchestra attendance group classification requested in response to the P1 quota finding | A winner paid for two tickets; its three-person attendance group then failed assignment against quota one. The owner subsequently requested attendance-only group classification and clarified that admission is handled separately. | Implement the classification/hiding feature below. Do not reserve admission when marking a group or claim this repairs the original paid-quota guarantee; that guarantee is deferred in this batch. |
| Owner-selected orchestra admission policy | Orchestra total and direct-sale tier ceilings currently come from the competition seat layout, although the owner can expand orchestra seating. | Remove those orchestra ceilings consistently and leave actual admission capacity to staff, preserving competition and payment safeguards. Explicitly settle the separate performance-quota semantics described above. |

These are outcome requirements and acceptance criteria, **not a finalized implementation plan**. Use domain modeling or grilling to settle the remaining business rules, then produce the written implementation plan before complex edits, following project conventions. Do not interview the owner again about decisions already explicit here.

## Legacy decision and deferred scope

The owner explicitly excludes **P1 — Legacy seat reservations do not share public paid-capacity accounting** from this repair batch. They state that legacy data/writers are unused and there is no actual real legacy data in production; they would accept deleting unused legacy data. That is an owner statement, not a production inventory verified by this audit.

Do not spend this batch building legacy capacity migration. No data deletion was performed or is needed to produce this handoff. If retiring an unused legacy writer is necessary for a selected repair, identify that exact writer and its callers; do not equate all older records, all `Registrants2025` entries, or historical test invoices with disposable legacy ticket data. Keep the historical capacity finding in the audit and record its exclusion transparently.

The original software guarantee of performance-linked orchestra admission is not being implemented in this batch: the owner selected manually managed orchestra admission capacity and **classify and hide only; admission is handled separately** for the group feature. Decoupling orchestra from competition capacity is now selected work, while the performance-quota guard needs the explicit treatment described above. Callback authenticity, the unprotected global-settings write route, shared-IP rate limiting, slow-checkout UI recovery, stale sale/pricing reads, provider URL handling, production opening configuration and the existing frontend local setup error are also **not separately selected in this batch**. Preserve their findings and avoid unrelated repairs. The selected payment recovery work must still validate trusted provider identity/payment truth: retaining unverified payloads is not permission to mark an arbitrary callback PAID. Do not invent a provider signature/header contract. If the chosen recovery design requires wider authentication/provider changes, explain that dependency in the plan rather than quietly expanding scope. Completing this batch cannot establish overall launch readiness while deferred risks remain.

## New request: orchestra attendance groups on Admin Page

### Confirmed intent

- Some groups created through `AdminContent.js` are intended for orchestra attendance rather than competition performance.
- Add a way for staff to mark a group **Orchestra attendance**. Retain its registration membership for administration; marking it must not erase registration/performance history.
- The owner explicitly confirmed **classify and hide only; admission is handled separately**. Marking a group creates no admission reservation, free-ticket entitlement, paid status, orchestra assignment, or quota/capacity change. Do not add admission allocation to this feature or ask this question again.
- Registrant names belonging to a marked group must not appear as selectable performances on `PublicTicketBookingPage.js`. The owner refers to the whole page; the handoff interprets that as both its public performance list and winner list, with no new buyer exception unless the owner requests one.
- Public customers must still be able to purchase a direct orchestra ticket by selecting an orchestra session and ticket quantities, **without choosing a registrant name**. Preserve the existing `public_orchestra` flow and free seating.
- Enforce the distinction in authoritative backend discovery and checkout as well as the UI. A stale browser or crafted competition request must not turn attendance-only membership into a purchasable competition performance.
- Existing unmarked groups must retain their competition behavior. Classification is a new requirement, not a field already supported by current persistence.

### Existing data path, traced in this chat

| Step | Current implementation and implication |
| --- | --- |
| Admin entry | `apcs_web/src/Pages/AdminDashboard/AdminContent.js:208` renders `SessionAssignmentManager`; group logic is in that child, not the parent. |
| Board hydration and editing | `apcs_web/src/components/molecules/AdminContentComponent/SessionAssignmentManager.js:508`, `:743`, `:756`, `:817`, `:1224` load planning groups, build form/local state and serialize label, venue, date, slot and registration IDs. No attendance purpose is persisted. All affected hydrate/edit/save/reopen paths need to agree. |
| API | `apcs_web/src/apis/index.js:226` defines authenticated `/competition-planning/:eventId` state, group/draft save, preview, publish and ready APIs. Draft save carries `expectedRevision` and `groups`; retain stale-write rejection. |
| Storage | `competitionSessionPlans/{eventId}/groups/{groupId}` plus the parent plan's `draftSlots` and revision. `CompetitionPlanningRepository.js:219` writes an explicit field list; an extra UI flag alone would be dropped. No schema choice for classification has been approved yet. |
| Publication/readiness | `apcs_service/src/repositories/CompetitionPlanningRepository.js:253`, `:319`, `:364` currently treat every group as a competition slot, project membership into `sessionAssignments/{eventId}.assignments`, add venue times and require numbered-seat readiness. Attendance groups must not masquerade as competition performances. Resolve their scheduling and publication treatment explicitly. |
| Seat generation | `SessionAssignmentManager.js:950` iterates every planning group and calls `uploadFullSeatLayout`; group classification must be respected here and in readiness/Performer Sessions usage displays. Orchestra attendance uses free seating. |
| Discovery | `apcs_service/src/repositories/PublicTicketRepository.js:898` joins `sessionAssignments/{eventId}` with `Registrants2025`, awards and today's eligibility for both public and winner queries. It currently has no group-purpose filter. |
| Competition checkout | `PublicTicketRepository.js:232-306` requires a registrant for competition/winner bookings and validates that registration against the chosen published assignment. Filtering discovery alone cannot protect a stale or forged request. |
| Direct orchestra checkout | The page's payload at `PublicTicketBookingPage.js:543` omits `registrantId` for direct orchestra; backend rejects a direct orchestra request containing one. Preserve this established separation. |

The current admin planning group is **not** the same object as the paid attendance group in `OrchestraAssignmentRepository`: the latter is derived from paid bookings keyed by `(eventId, registrantId)`. An administrative classification must not double-count registered members or manufacture paid-ticket entitlement.

### Rules still needing agreement before an implementation plan

1. Does this classification need an explicit orchestra-session link for admin organization, or just purpose/name/date metadata? Admission and session allocation are handled separately. Do not invent an allocation step or require the buyer to select an assigned session again. Attendance groups must not be forced to create numbered competition/orchestra inventory merely because today's competition schema does.
2. Are group-purpose changes needed only in draft, or after publication/payment? Current published groups are read-only; preserving that protection is the safe default. Discuss a transition policy only if the requested feature needs a change after publication. Do not silently reclassify a group with live bookings or erase their benefits.

These narrow questions should be resolved from current code and the owner's intended board workflow where possible. The admission-versus-classification question is already answered; the original quota guarantee is a known deferred issue, not a reason to force an admission redesign into this feature.

## Evidence already collected — use it

- Existing offline suite: `node --test --test-reporter=spec apcs_service/audit/*.audit.cjs` → **153 pass**. These include non-ticketing/repeated controls and are not complete readiness proof.
- `docs/audits/ticketing-readiness-probes-2026-10-07.cjs` → **11 reproduced observations** using source-loaded functions and in-memory substitutes. Its success asserts the observed defects; it is not a safety pass.
- `apcs_service/audit/ticketing-emulator.integration.cjs` → **20 real-emulator safety assertions: 13 pass, 7 fail**, saved in the linked result JSON. It loads actual repository/controller/generator source, substitutes provider/email/timers, and uses real server SDK queries/transactions/batches. The staff API check uses exact Web SDK versions. Generator execution uses a server-SDK-backed Web facade, so client rules/browser acceptance are not proven.
- The seven historical failing checks are three payment recovery cases, unsigned callback acceptance, stale generation, Web SDK staff assignment and paid orchestra quota. Five map directly to selected payment/generation/staff repairs. Unsigned callback is deferred unless authentication becomes a necessary recovery dependency. The orchestra quota assertion captures the former guaranteed-capacity expectation: staff-managed capacity is now the chosen policy, while the separate quota guard must be addressed explicitly in the plan. Add classification and revised policy tests, preserve historical results, and distinguish accepted policy changes from repaired safety defects. Keep genuinely deferred failures visible instead of weakening assertions to claim all tests pass.
- Passing contention controls: 20 buyers/one chair, physical aliases, 20 buyers/last tier place, checkout idempotency and retry recovery, duplicate paid callbacks, cancellation failure retaining inventory, confirmed expiry releasing once, payment winning cancellation, manual settlement retries and direct/group orchestra controls. One idempotency request intermittently saw emulator `INVALID_ARGUMENT: Transaction is invalid or closed`; same-key retry recovered its existing booking. Do not label that transient result a production oversell.
- Three real Paper.id staging purchases through the running API/ngrok—public competition, winner and direct public orchestra—ended provider-paid and locally PAID with saved receipts. Three genuine callbacks at `/api/v1/apcs/payment/webhooks/paper-id` returned 200. The owner confirmed receipt of both invoice and APCS confirmation email. Test-contact delivery is not production-wide delivery proof.
- Two staging checkouts took 45.489/30.759 seconds, above the 30-second frontend timeout; 110 local status reads gave 99 success and 11 HTTP 429 after one preceding request. Those are recorded deferred findings.
- Production was read with GET only: APCS2026 draft revision 25, sole eligibility date October 3, no selectable public/winner performances; advertised orchestra times missing from venue projection. These are dated observations to refresh before any eventual opening. Deployed commit, production ledger completeness, indexes/rules, browser UX and capacity remain unverified.

## Source map for selected repairs

All paths are relative to the monorepo root; line numbers are audit-time anchors and may move after edits.

- `apcs_service/src/controllers/PublicTicketController.js:142-178` — dedicated callback; catch returns 200.
- `apcs_service/src/controllers/PaperController.js:75-222` — **the generic callback actually used by staging**; routes public bookings, otherwise handles competition registration payments. Preserve its non-ticket registration behavior and archived-test guards.
- `apcs_service/src/repositories/PublicTicketRepository.js:684-700`, `:743-815` — invoice identity persistence, shared paid transaction, failed-state rejection and payment details. Keep saved-event, ID, total/currency and physical ownership validation.
- `apcs_service/src/repositories/PublicTicketFailureRepository.js:269-293`, `apcs_service/src/services/PublicTicketAdminReleaseService.js`, `apcs_service/src/jobs/PublicTicketSweeper.js` — uncertain creation/cancellation, authorized release and pending-only sweeper. Its existing timer is not paid reconciliation.
- `apcs_service/src/repositories/PaperRepository.js`, `apcs_service/src/services/PaperService.js`, `apcs_service/src/routes/PaymentRoute.js`, `apcs_service/src/routes/PaperRoute.js` — invoice creation/provider contract and callback routes. Verify supported provider lookup/verification before using it for recovery.
- `apcs_web/src/Pages/AdminDashboard/SeatEvent.js:84-134` — unconditional generation batch; also inspect its callers and post-generation metadata.
- `apcs_web/src/Pages/AdminDashboard/PublicCustomersList.js:315-326` — unsupported Web transaction query in paid seat assignment. Existing staff API mutations use Firebase ID token plus whitelist.
- `apcs_service/src/repositories/OrchestraAssignmentRepository.js` — paid per-registration group calculation and quota assignment; classification feature must respect those counters or explicitly replace a rule after agreement.
- `apcs_web/src/Pages/AdminDashboard/PerformerSessionsSettings.js` — group-slot usage/seat-generation labels; synchronize with attendance classification.

## Local environment and safe continuation

Working directory: `/Users/renaldolouis/Documents/Personal/Work/APCS/apcs_Project`. Root and both application directories are separate Git repositories. Root reports nested repos as untracked; **do not add entire nested repos**. Existing root `.gitignore`/`AGENTS.md` and frontend `src/config/development.config.js` changes predate this audit and must be preserved. The latter starts with `e3`, an independently reproduced local ReferenceError; frontend dependencies were also incomplete. No frontend startup/browser/build was attempted.

At this handoff, listeners were rechecked: API port 8080 (PID 60766), ngrok's local inspection port 4040 (PID 61319), QA Firestore 8081 (PID 69999); diagnostic 8082 is stopped. PIDs and listeners are session facts to refresh, not restart instructions. The API was verified in explicit `APCS_FIRESTORE_MODE=emulator` and ngrok targeted local 8080. Do not assume an emulator redirects a default-configured app; frontend requires its own `REACT_APP_FIRESTORE_MODE=emulator`.

Port 8081 currently holds only synthetic event `QA_PAPER_20261007`, not the owner's historical snapshot. All three staging invoices are paid; there are no copied customers or jury deadlines. `firebase.ticketing-staging-qa.json` starts this empty instance without importing/exporting the saved snapshot. Private HTTP scripts/provider responses, test contacts/tokens and a 16-document QA backup are in ignored, permission-restricted `apcs_service/.local/ticketing-qa-20261007/`. Do not copy their secrets or contact details into tracked docs/prompts. The October 1 saved export remains unchanged in `.local/firestore-emulator/`. **Do not import it into the running API's database while provider/email jobs are enabled:** Firestore isolation does not isolate cancellation, Paper.id, Auth or SMTP.

The next chat may mutate isolated emulator fixtures as authorized by the owner. Previous staging activity was explicitly authorized for the supplied test contact; check current local mode/provider host before repeating it, use only that privately saved contact, and never substitute a real customer's details. Current `.env` used `https://open-api.stag-v2.paper.id/api/v1`; `PAPER_ENV=production` selected pricing behavior, not the provider host. No production writes, real-money tests, deployment, commit or push is authorized by this handoff.

Reproduce the diagnostic suite using the linked instructions. Node 20.19.5 + Firebase CLI 13.29.1 worked; Node 25 caused earlier Firebase CLI incompatibility. The script requires exact emulator host `127.0.0.1:8082`, fixed disposable project `demo-apcs-ticketing-qa`, an empty database, and one test process at a time. It is separate from the app's 8081 project and refuses another host. A temporary exact-version Web SDK package was installed under `/private/tmp/apcs-websdk-qa-20261007`, selected with `APCS_QA_WEB_PACKAGE`; see the reproduction guide if it no longer exists. Do not change production/default hosts or bypass these guards to run tests.

## Verification and reporting expectations

- Reuse the recorded baseline and add meaningful safety regressions for durable replay/restart, callback timing/duplication, unknown invoice outcomes and late paid-versus-cancel overlap, generation conflicts, authorized atomic assignment, and attendance classification persistence/discovery/forged checkout/direct orchestra. Existing source-loader dependencies may need updates when introducing modules; do not substitute away the actual repair under test.
- Add policy regressions showing orchestra settings/assignment/direct sales can exceed the competition seat layout under the chosen manual-capacity policy, while competition limits, payment/quantity checks and accurate repeated/reassigned attendance remain intact. Revise direct-orchestra capacity expectations explicitly for the new business policy; preserve the old result artifact as historical evidence. Keep any retained performance-quota tests separate from removed venue/tier ceilings.
- New payment states/collections/workers require updates to architecture, rules/indexes where applicable and operation/recovery documentation. Both callback routes must share the repaired outcome. Do not crash callback-based repositories by throwing outside `DatabaseUtil.executeDatabaseOperation`'s callback handling.
- No `npm run start`, `npm run build`, browser/Playwright verification, commits or pushes. Use yarn for frontend dependency changes and npm for backend. New UI/email copy is English only. Owner performs browser acceptance from a saved walkthrough.
- Update both ticketing guides, `docs/architecture.md`, relevant domain terms and `docs/progress.md` after implementation. Keep initial evidence historical and add fresh repair results rather than rewriting previous failures as if they never occurred.
- Report standards/spec/hygiene/conditional-branch self-review, relevant syntax/lint/tests and remaining deferred failures. Distinguish simulator/emulator success from production provider, deployed rules/indexes, browser and capacity proof. Do not claim the whole system ready merely because selected repairs pass.

## Suggested skills

Use `apcs-architect` for APCS patterns, `domain-modeling` or `grilling` before the complex plan, `diagnosing-bugs` for each failing path, and `tdd`/`senior-backend` where their workflows help the selected repairs. Project/user restrictions override conflicting skill suggestions about bilingual copy or browser verification. The memory skill `/Users/renaldolouis/.codex/memories/skills/apcs-ticketing-audit/SKILL.md` contains the earlier writer map; current checked-in audit evidence takes precedence over old conclusions.
