# APCS ticketing — handover for the next AI

Prepared 7 September 2026, after the first checkout-failure repair batch. This document is a continuation brief, not a claim that ticketing is ready for production.

## 1. Mission and current position

The owner wants the ticketing settings, customer purchase flow, payment lifecycle, inventory, and admin fulfillment to work consistently together. The investigation covered all original Ticketing System menu entries, public booking, backend checkout/payment, expiry, emails, and Public Customers.

**Completed:** an audit and corrected documentation; a new Masterclass Assignments admin page; lifecycle/payment repairs; and checkout capacity/product/eligibility validation repairs. **Outstanding:** the separate security, entitlement-ledger, configuration, and fulfillment defects described below.

The historical baseline was **36 tests: 23 passed, 13 failed**. It is retained below as evidence of the original defects. The current complete offline run is **42 tests: 42 passed**; it is not a production-readiness claim or a complete count of every remaining bug.

No deployment, live customer-data modification, real invoice/email test, inventory migration, or browser verification was performed. No commits were made for this ticketing work. Read current files and diffs; a clean clone of the recorded HEAD revisions will not include the changes.

## 2. Read first and preserve workspace state

All code paths below are relative to the project root. If this handover is transferred to another machine, provide the current working files as well as this document.

Read these sources before editing:

1. `AGENTS.md` — current project constraints; the owner's latest instructions override older copies.
2. `CONTEXT.md` — confirmed domain vocabulary.
3. [Technical flow](SEAT_BOOKING_FLOW.md) and [staff guide](TICKETING_SYSTEM_GUIDE.md) — required before ticketing changes.
4. [Architecture](architecture.md) — required before Firestore schema/data-flow changes.
5. [Audit](TICKETING_AUDIT_2026-09-06.md) — evidence, original findings A–M, and test results.
6. [Progress log](progress.md) — chronological record; later entries supersede earlier “implementation pending” entries.

The audit includes historical pre-repair descriptions and old line numbers. Findings A/D and the callback-error portion of F have repair annotations. Search current symbols rather than trusting historical line numbers.

### Git layout and existing edits

This workspace has a root repository plus nested repositories at `apcs_web` and `apcs_service`. The root currently shows those directories as untracked; inspect each repository independently. Do not stage the entire directory tree blindly.

| Repository | Observed HEAD before handover | Relevant working changes |
| --- | --- | --- |
| Root | `39f960a` | Ticketing docs, architecture, progress, untracked glossary/audit; additional pre-existing changes |
| `apcs_web` | `5739b39` | Masterclass page/menu/index plus Public Customers and waiting-page failure handling |
| `apcs_service` | `676a2b0` | Public checkout and Paper repository changes; new failure repository and offline audit files |

Preserve unrelated existing changes, particularly `.gitignore`, `AGENTS.md`, `docs/business_perspective.md`, `scratch/`, and `apcs_service/src/jobs/JuryDeadlineReminder.js`. Do not reset, clean, or overwrite them. Recheck status on arrival because another contributor may have made further changes.

## 3. Business decisions already confirmed — do not ask again

| Topic | Confirmed rule |
| --- | --- |
| Tickets without seat-selection add-on | Admin assigns physical seats from **Seat Occupancy**. Do not silently introduce automatic customer seat assignment. Capacity must still be protected before staff assignment. |
| Assignment eligibility | Seat assignment requires confirmed payment. Pending, expired, and failed bookings are ineligible. |
| Winner's extra orchestra ticket | One extra complimentary ticket per winning performance per orchestra session across completed purchases, not one extra on each purchase. The existing per-purchased-ticket benefit remains separate. |
| Ensembles | An ensemble counts as one winning performance, irrespective of member count. |
| Retry after unpaid expiry | The expired unpaid purchase does not consume the extra winner entitlement. A retry is still subject to current quota and capacity. |
| Orchestra reserved rows | Exclusively for winners' complimentary orchestra seats. All those seats must stay within reserved rows, whether customer-selected or admin-assigned. Paid seat selection cannot access those rows. |
| Masterclass benefit passes | Admin assigns paid add-on passes and any complimentary passes from one booking together to one session after payment, then emails the buyer. Paid-add-on support and assignment email remain unimplemented. |
| Paid standalone Masterclass | Remains attached to the session selected by the customer. |
| Payment hold | Seats are held until Paper.id confirms payment or successful cancellation, even beyond 30 minutes. Payment finalizes inventory; cancellation permits unpaid release. Unknown outcomes remain held for reconciliation. Provider contract/deployment verification and automated recovery remain open. |
| Buyer email and winner selection | Public buyers enter email; winners default to the registrant email and may edit it. Keep name selection without email verification; enforce backend eligibility and entitlement limits. |
| Seat Occupancy display | Show the number of seats needing assignment; only confirmed-paid bookings can be assigned. |
| Administration and entry | Whitelist membership grants all ticketing-admin powers and must be enforced by backend routes. Booking-ID/manual entry verification is sufficient; public QR is not required. |
| Masterclass capacity | No attendee limit for now. This does not authorize unlimited seated competition/orchestra sales. |

A winner already has a competition performance assignment. Derive the paid competition slot from that assignment; do not ask the winner to select it again. Their additional orchestra session is a separate choice.

The owner wants time to think when asked questions. Ask necessary business questions one at a time and wait for explicit answers. Never turn silence or a timer into an assumed decision. Continue independent work where possible.

## 4. Implemented work to preserve

### Masterclass assignment feature

- `apcs_web/src/Pages/AdminDashboard/MasterclassAssignments.js` and `AdminDashboard.js`: menu key `25`, **Ticketing System → Masterclass Assignments**.
- Loads paid bookings for the active event in batches of 50; supports both `PAID` and `paid`, then filters for positive `freeMasterclassCount`.
- Saves one `masterclassAssignment` containing `sessionId`, `sessionLabel`, `quantity`, and `assignedAt`. The transaction rechecks booking/event/payment/pass count and reads current session metadata.
- `apcs_web/firestore.indexes.json` defines the event/payment query index. It was not deployed in this session.

**Limitations:** the page handles complimentary Presto passes only; paid add-on-only bookings and combined paid/free pass assignment still need support. Assignment emails are not implemented. The assignment is currently consumed only by this page. Confirmation, attendance/check-in, and reporting are not integrated. Existing authenticated-whitelist permissions apply; no new admin-role enforcement was introduced. Local post-save display still uses cached row/session data, while the persisted assignment uses fresh transaction data. Each fetched page is sorted locally; this is not global creation-date ordering. The page needs owner-run UI verification.

### Checkout-failure repair

Main files:

- `apcs_service/src/repositories/PublicTicketRepository.js`
- `apcs_service/src/repositories/PublicTicketFailureRepository.js` (new)
- `apcs_service/src/repositories/PaperRepository.js`
- `apcs_web/src/Pages/AdminDashboard/PublicCustomersList.js`
- `apcs_web/src/Pages/Register/WaitingPayment.js`

The new `failPublicTicketBooking` helper is Promise-returning and awaited/caught by checkout. It reads the saved booking, seats, and applicable event quota before any transaction writes. It does not mutate inventory if the attempted booking does not exist. It releases only seats still locked by that booking in the booking's saved event, records terminal `failed`, and refunds the recorded quota once. It preserves other owners' seats and paid bookings. Missing seats do not prevent other owned-seat releases; missing/inconsistent quota configuration is recorded for reconciliation.

Known invoice IDs survive invoice/save failures. Cancellation runs outside Firestore transactions; outcomes are stored honestly. Eligibility lookup errors and rejected invoice promises now reach the repository callback. Failed bookings are rejected by public payment fulfillment and by the admin Mark Paid transaction/action. The waiting page stops on failed status and ignores older in-flight responses after a terminal result; it no longer claims cancellation merely from local expiry.

New fields remain on `publicBookings`: `failedAt`, `paymentStatus: "failed"`, and `checkoutFailure` metadata. See the architecture's publicBookings section for exact field values. No new collection/index was introduced for this repair.

**Current limits:** timer, sweeper, checkout-failure cleanup, and payment now share the cancellation-first/saved-event ownership policy. Database cleanup failure leaves allocations intact and logs recovery information; there is no automatic recovery worker. Unknown invoice IDs and failed cancellation require investigation. `cleanupStatus: complete` records a completed local release after cancellation, not proof that all historical/provider reconciliation is resolved. Webhook authenticity, backend authorization, durable winner claims, and safe legacy reconciliation remain open. Do not replay this helper over legacy bookings and guess whether their quota was already refunded.

## 5. Remaining failing tests and required repairs

These 13 assertions failed in the previous run of `apcs_service/audit/public-ticket.audit.cjs`. Detailed evidence is in the referenced audit sections. **All thirteen now pass in the current 40-test offline run; this table is historical repair context, not an open-failure list.**

| # | Reproduced failure | Required result / starting point |
| --- | --- | --- |
| 1 | Checkout accepts 100 seated tickets with no inventory | Protect capacity for every seated quantity, even without selected seats; distinguish capacity reservation from later staff seat assignment. Audit B. |
| 2 | Public checkout ignores a closed sale window | Enforce authoritative public eligibility in backend checkout using the intended Asia/Jakarta schedule. Audit F. |
| 3 | Nonexistent winner gets quota when date restrictions are off | Validate winner existence and relevant event/assignment independently of date restrictions. Audit F. |
| 4 | Seat from wrong venue/session/tier is accepted | Validate every selected seat against the purchased product and server-derived slot. Audit G. |
| 5 | Duplicate IDs count as two seats | Reject duplicate and overlapping paid/free selections; address duplicate physical-seat documents too. Audit G/H. |
| 6 | Complimentary expiry timer fails | Read before writes; check ownership and refund once only after provider-confirmed unpaid release. Repository timer; audit C. |
| 7 | Restart sweeper fails complimentary expiry | Apply equivalent invariants in `src/jobs/PublicTicketSweeper.js`. Audit C. |
| 8 | Payment uses active event after an event switch | Fulfill against the booking's saved event, including related schedule/label lookup. Audit L. |
| 9 | Payment overwrites seats owned by another booking | Make state/ownership validation and fulfillment atomic. Audit E/L. |
| 10 | Mismatched payment amount is accepted | Validate authentic provider payment, invoice identity, expected amount, and currency. Audit E. |
| 11 | Public buyer locks arbitrary complimentary orchestra seats | Enforce complimentary entitlement, selected-session relationship, and reserved-row access server-side. Audit F/G/K. |
| 12 | Lazy lock takeover strands the old quota | Block takeover until provider-confirmed unpaid release; settle the old booking and refund quota once. Audit C. |
| 13 | Duplicate paid callback loses booking ID | Return a consistent booking result and make confirmation dispatch idempotent. Audit L. |

## 6. Other findings not fully represented by those tests

These were established through code review; add representative regression coverage before fixing them.

- **Webhook/admin authorization (E):** both webhook entry points lack verified application-level authenticity checks. Inspect `PaymentRoute.js`, `PaperRoute.js`, `PublicTicketController.js`, `PaperController.js`, and the shared fulfillment function. Verify the actual Paper.id contract through official documentation/configuration; do not invent signature headers or payload fields. Some admin backend write routes also lack authorization. Whitelist membership is the approved ticketing-admin authority; backend routes must authenticate callers and enforce that membership, without adding a separate role hierarchy.
- **Once-per-performance entitlement:** no durable claim accounting prevents repeat extra winner tickets or concurrent double claims. Expiry must restore unpaid eligibility without undoing completed claims. Derive and verify a stable winning-performance key from registrant/assignment records before introducing claim accounting; name selection needs no email verification. Ask only if the existing records cannot unambiguously identify one performance.
- **Seat identity/generation (H):** Performer/SeatEvent generation uses row+number (`A1`), while Orchestra uses a separator (`A-1`). Both can represent one chair twice. New Orchestra entries may overwrite inventory; regeneration uses snapshots that can race with purchases. Reconcile existing references before migration; do not delete/recreate booked inventory blindly.
- **Settings edits (I):** cached orchestra arrays can overwrite newer `complimentaryClaimed`; booking retains an array index across concurrent edits. Venue/session deletion or schedule changes can orphan assignments/orders. Add dependency checks and preserve concurrent counters.
- **Public cart and session listing (J):** switching buyer/winner/session can retain stale seat IDs, add-ons, and winner identity. Orchestra/Masterclass base slots are also listed as competition slots. Seat Occupancy duplicates orchestra slots. Start in `PublicTicketBookingPage.js` and `SeatOccupancy.js`.
- **Pricing and input validation (G/K):** missing-price gating checks hidden/unpurchased tiers inconsistently; Masterclass can proceed with unavailable pricing. Validate quantities, product IDs, add-ons, and tier availability on the server.
- **Seat Occupancy fulfillment:** the requested assignment workflow is still missing. Existing Public Customers paid-seat assignment is not a substitute for complete paid/complimentary assignment with tier, remaining-quantity, ownership, and reserved-row checks.
- **Public Customers operations (M):** expired orders can still be manually marked paid; stale seat assignment can overassign; `master_class`/`masterclass` naming differs; deletion lacks complete quota/invoice cleanup; resend may report success despite wrapper errors. Only the failed-booking Mark Paid guard was fixed.
- **Payment recovery/communication (L):** standalone waiting-page URLs lose router state and use the wrong polling classification; successful checkout does not persist `paymentUrl`; the approved provider-confirmed hold policy still needs implementation, including delayed notifications and reconciliation of existing inconsistent bookings. Emails omit separate orchestra schedule and some benefits. Public booking-ID entry verification is separate from legacy registrant JWT/QR logic.
- **Masterclass completion:** connect assignments to staff order views, attendee lists, and appropriate customer communication. Extend the complimentary-only page to paid `allegro_masterclass` add-on passes, including add-on-only bookings; assign paid/free benefits from one booking together to one session and email the buyer. Standalone Masterclass tickets keep their customer-selected session. Audit/persisted session-edit dependencies still need attention.
- **Failure repair follow-up:** add durable retry/reconciliation for cleanup or cancellation failures and unknown invoice outcomes. Provider cancellation acknowledgement and deployment behavior were not tested against the real gateway.

## 7. Recommended next batches — recommendation, not already approved implementation design

1. **Provider security and recovery:** verify Paper.id's real callback/authentication contract and deployment settings, enforce it in both webhook routes, add backend admin authorization, and build durable reconciliation/retry for failed or unknown cancellations.
2. **Winner claims and fulfillment:** introduce a stable, durable once-per-winning-performance/per-orchestra-session entitlement claim, then implement the requested Seat Occupancy assignment flow and paid Masterclass add-on assignment emails.
3. **Configuration integrity and cart behavior:** repair seat-ID duplication, concurrent settings edits, dependency-aware deletion, stale cart/session selection, and safe legacy reconciliation.
4. **Configuration integrity and recovery:** resolve seat ID duplication, concurrent settings edits, dependency-aware deletions, and safe reconciliation of historical records. Changes to live inventory require an explicit migration plan.
5. **Complete fulfillment:** close Masterclass/order/email/check-in gaps and validate all admin actions. Keep authorization hardening and authentic payment verification as release blockers even if implementation is staged.

Do not claim production readiness after completing only one batch. This ordering is guidance; concrete plans must account for dependencies found in current code.

### Original owner answers and subsequently confirmed decisions

- How should pending and paid-but-unassigned capacity appear in Seat Occupancy? Assignment timing itself is already settled.
  - show how many seat need to be assigned
- What proof should authorize a winner claim: current public name selection, a verified claim link, or another owner-approved method? Clarify the stable performance identity if the existing registrant record can represent multiple relevant performances.
  - they get email for their ticket confirmation right?
- Is booking-ID/manual entry verification sufficient, or is public-ticket QR check-in required?
  - booking-id/manual entry verifciation is enough
- How should legitimate late payments be handled if inventory has already been released: staff reconciliation, alternative seats, refund workflow, or another policy? Do not silently accept or discard money.
  - there can;t be late payment becuase that mean the invoice from paper will already expired, does this make sense to you?
- Does whitelist membership intentionally confer all ticketing-admin powers, or must roles be differentiated?
  - yes the whitelist  membership intentionally confer all ticketing-admin powers
- How are paid Masterclass add-on purchases fulfilled, and how should customers receive their later assignment?
  - they receive the information through email

The original answers above are preserved verbatim. The subsequent decisions below resolve those questions and supersede their earlier provisional interpretation:

- **Confirmed:** Seat Occupancy should show how many seats still need assignment. Assignment remains paid-only; pending demand must not be presented as assignable paid tickets.
- **Confirmed:** Booking-ID/manual entry verification is enough; public QR check-in is not required.
- **Confirmed:** Whitelist membership intentionally grants all ticketing-admin powers. A separate admin-role hierarchy is not needed. Backend endpoints still need to enforce the whitelist rather than rely on menu visibility.
- **Confirmed:** Admin assigns paid Masterclass add-on passes later, together with any complimentary passes from that booking, to one session after payment and emails the buyer. Standalone Masterclass tickets keep their customer-selected session.
- **Confirmed — email and winner selection:** Public buyers enter their email. Winner selection defaults the editable buyer email to the registrant’s stored email; confirmation uses the saved booking `userEmail`. Keep public winner name selection without email verification. Confirmation email is communication, not identity proof; backend winner eligibility and once-per-winning-performance/per-orchestra-session entitlement checks are still required.
- **Confirmed — payment/expiry:** The owner accepted holding seats until Paper.id confirms payment or successful cancellation, even beyond 30 minutes. This is a required future behavior, not a verified gateway guarantee or an implemented fix. Next-day invoice due dates, fallible deletion, delayed notifications, and current failure cleanup must be reconciled with it.

No business question in this owner-answer section remains open. Provider cancellation/payment semantics, durable recovery, performance-key mapping, and safe legacy reconciliation remain engineering work. Investigate those facts before asking any genuinely new question; do not reopen the confirmed choices.

## 8. Verification commands and acceptance discipline

Run from the project root:

```sh
node --test --test-reporter=spec apcs_service/audit/public-ticket.audit.cjs apcs_service/audit/checkout-failure-boundaries.audit.cjs
```

Previous recorded baseline (not rerun for this documentation update): **36 total, 23 passing, 13 failing; exit code 1**. Do not delete/weaken failing assertions to make the suite green.

Focused checkout-failure regression checks:

```sh
node --test --test-reporter=spec --test-name-pattern='FAILURE|CONTROL|rejected booking|invoice failure|eligibility database failure' apcs_service/audit/public-ticket.audit.cjs
node --test --test-reporter=spec apcs_service/audit/checkout-failure-boundaries.audit.cjs
```

Previous focused results: 20 pass/13 skip in the first command, 3 pass in the second. Fixtures load actual code with allowlisted fake dependencies, enforce read ordering and atomic writes, and make no network calls. They do not establish real Firestore contention, gateway authenticity, deployed rules, or UI correctness. The boundary suite executes the real admin/polling handlers without rendering a browser.

Syntax checks:

```sh
node --check apcs_service/src/repositories/PublicTicketRepository.js
node --check apcs_service/src/repositories/PublicTicketFailureRepository.js
node --check apcs_service/src/repositories/PaperRepository.js
```

From `apcs_web`:

```sh
./node_modules/.bin/eslint src/Pages/AdminDashboard/PublicCustomersList.js src/Pages/Register/WaitingPayment.js
```

Last lint result: zero errors, three existing warnings (`orderBy`, a hook dependency in Public Customers, and unused `loading` in WaitingPayment). Masterclass page/dashboard previously linted without errors. Review diffs and run `git diff --check` separately in root/frontend/backend. Report remaining failures explicitly. User-run browser steps are in the staff guide and audit.

## 8.1 Lifecycle and checkout-validation repairs completed after this handover

The provider-confirmed lifecycle repair was completed locally after this handover was prepared. Timer, sweeper, and checkout-failure cleanup now keep inventory held until `deleteInvoice` returns a truthy result; then a saved-event, ownership-checked, all-reads-before-writes transaction releases seats and refunds quota once. Lazy checkout takeover and public-read availability conversion were removed. Public payment fulfillment now uses the booking event, checks amount and current lock ownership transactionally, accepts a still-held pending callback after the local deadline, and returns a booking ID on replays. Failed/unknown cancellation remains reconciliation-only.

Checkout now enforces configured tier capacity even where customers leave seats unselected; it validates the public sale window, real same-event winner and assigned session, ticket quantities, physical-seat uniqueness, venue/session/tier relationships, and orchestra reserved rows. Complimentary orchestra demand is bounded by reserved-row capacity. The Firestore index definitions needed by the new capacity queries are in `apcs_web/firestore.indexes.json`; they have not been deployed.

The offline audit is now **42 total: 42 passing**. A follow-up repaired the public Orchestra payload/reserved-row/cart-state issues and Public Customers local-expiry/manual-Mark-Paid/delete/masterclass-ID issues. Real Paper.id cancellation/authentication semantics, a recovery worker, deployment/index rollout, durable winner extra-ticket claims, and the other backlog items in section 6 remain unverified or unimplemented.

## 9. Constraints and suggested skills

- Never run `npm run start` or `npm run build`. Do not launch/use any local browser, Playwright, or browser subagent for verification. The owner performs UI verification.
- Use yarn for frontend dependency installation and npm for backend installation. Avoid unnecessary dependencies.
- Callback-style repositories wrapped by `DatabaseUtil.executeDatabaseOperation` must report errors through callbacks; never let async errors escape that wrapper. Promise-returning helpers must be awaited/caught. Firestore transaction reads precede all writes; external side effects stay outside transactions.
- Trace existing assigned data through frontend/API/database before adding user input. Use Ant Design/React Hooks and existing APCS styling; consider EN/ID copy.
- After repairs, update both ticketing guides, architecture if schema/data flow changes, and `docs/progress.md`. Sweep removed references, audit every changed JSX branch, and report standards/spec/hygiene/consistency self-review.
- Suggested skills under `.agents/skills/`: `apcs-architect`, `diagnosing-bugs`, and `domain-modeling` or `grilling` before complex design. Use `tdd` where the real failure seam supports it. Apply review skills only within the user's requested scope. Latest owner constraints override conflicting skill advice, especially browser verification.

## 10. Suggested opening instruction for the receiving AI

> Continue the APCS ticketing repair from this handover. Read the required docs and current nested-repository diffs, preserve uncommitted and unrelated changes, and reproduce the 36-test baseline. Preserve the completed Masterclass page and checkout-failure ownership, idempotency, callback, and failed-state protections. Prepare the next bounded lifecycle repair around holding inventory until provider-confirmed payment or successful cancellation, including checkout-failure cleanup which currently releases before cancellation. The email, name-selection, and Masterclass add-on assignment decisions are resolved in sections 3 and 7; do not ask them again. Verify provider semantics and revise release-timing tests to match the approved policy. Ask only genuinely new blocking questions and wait for explicit answers. Implement authorized repairs with regression coverage, update project documentation, and report exactly which failures remain. Do not deploy, migrate live data, or run a browser without the appropriate owner direction and project constraints.
