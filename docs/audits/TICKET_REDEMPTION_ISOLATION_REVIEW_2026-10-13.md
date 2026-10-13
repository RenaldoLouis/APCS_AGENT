# Ticket redemption isolation review — 13 October 2026

The owner requested confirmation that the new redemption page does not disrupt ticket buying or other features. Source review and new comparison regressions found no purchase-state coupling. The review did find one operational interaction: redemption requests originally shared the existing global 100-request/minute/IP budget with buyers. That interaction was repaired by isolating the three redemption POST endpoints behind their own 100-request/minute/IP limiter, applied before Firebase-token/whitelist authorization. Purchase/payment/unrelated requests retain their original global budget and protection.

## Verified boundaries

| Area | Evidence / result |
| --- | --- |
| Purchase API and routing | Parsed source comparison confirms every existing frontend API helper/method and every existing payment-router endpoint/handler is unchanged. New staff routes are additive and authenticated. |
| Checkout, payments, seats, email/jobs | Twelve existing backend modules match the backend HEAD snapshot exactly: checkout/failure/receipts/seat administration, payment/public services, confirmation/orchestra email details, public/Paper controllers, expiry and receipt recovery jobs. |
| Stored data | Redemption lookup is read-only. Claims/corrections write only `ticketRedemptions` state/history/replay keys. No booking/payment, seat, capacity, registration, assignment, scoring or email fields are written by redemption. |
| Purchase after handover | Five paired production-code scenarios compare otherwise identical databases with and without prior performance, orchestra and performer claims: winner Paper.id with numbered seats; public performance Paper.id with unselected seats; direct orchestra Paper.id; public performance manual payment with numbered seats; direct orchestra manual payment. Pricing, invoices, saved records/capacity/seat ownership, paid outcomes, confirmation dispatch and expiry timers match. Purchase retry reuses its original booking. Instrumented checkout/fulfillment never accesses `ticketRedemptions`. Paper.id and email are substituted. |
| Existing staff workflows | Seat assignment still succeeds after a performance claim. A later paid purchase can update the same orchestra assignment, preserving issued tickets and the shared performer count. Existing planning/scoring/venue/email/attendance and ticketing audits all pass. |
| Existing client permissions | Removing only the new protected collection rule and fallback exclusion reproduces the old rules exactly. Existing collection permissions are unchanged. The earlier isolated Firestore run verifies that clients cannot overwrite redemption state/history/replay records. Deployed production rules are not asserted. |
| Shared client storage | Saving/retrying/clearing redemption preserves the existing `apcs.publicTicket.checkoutAttempt` value. Existing purchase retry/auth/header behavior is covered by the frontend suite. |
| Shared request budget | An actual local Express test sends 100 synthetic redemption requests from one IP, then 100 purchase/payment/registration/unrelated requests from that same IP. Each budget independently accepts its first 100 and limits the next. Unauthenticated redemption attempts are also limited before authorization and do not consume the purchase budget. No application server, real controllers, database or integrations are loaded. |

## Intentional change to existing behavior

An orchestra group with **active orchestra or shared performer claims** cannot be moved to another orchestra session or lose redeemed entitlements until those claims are undone with an audit reason. This protects tickets already handed over. The guard does not block additional purchases, same-session assignment updates, performance seat assignment or customer payment. A performance-only claim does not prevent an orchestra move. Lookup adds scoped reads; claims share the existing database/server infrastructure. These checks do not certify production peak-load capacity.

The earlier uncommitted purchase-page refresh/retry changes and development config existed before redemption and were preserved. This review does not attribute those changes to redemption or repair unrelated checkout issues. No application data, customer emulator, payment/invoice, email, deployment, app restart, dependency, commit or push was changed/performed.

## Results and reproducibility

- **234/234 backend audits**: `node --test --test-reporter=spec apcs_service/audit/*.audit.cjs`. Includes seven new purchase/staff isolation regressions and two traffic-boundary audits. [Output](evidence/2026-10-13-ticket-redemption/isolation-backend-results.txt).
- **311/311 frontend tests across all 19 suites**, in Node with Watchman disabled. The initial unshimmed Node run lacked `window` for Firebase Analytics and `File`/`FileReader` for three existing utility suites. The rerun uses an explicit test-only Firebase bootstrap mock and native Node file/data-URL reader shim; no production source or Jest defaults were changed, and no DOM/browser was used. These are unit/logic checks, not Firebase authorization, inbox, file-picker or visual acceptance. [Output](evidence/2026-10-13-ticket-redemption/isolation-frontend-results.txt), [setup](evidence/2026-10-13-ticket-redemption/frontend-node-setup.cjs).
- **3/3 actual HTTP isolation checks**, using only synthetic routes/actors in a temporary local Express process which closes after the test. [Results](evidence/2026-10-13-ticket-redemption/traffic-results.json), [script](../../apcs_service/audit/ticket-redemption-traffic.integration.cjs).
- **4/4 source comparisons**, including twelve unchanged core backend files. This is a read-only review snapshot against the recorded nested repository HEADs, not a permanent test baseline. [Results](evidence/2026-10-13-ticket-redemption/isolation-source-results.json), [script](evidence/2026-10-13-ticket-redemption/check-isolation-scope.cjs).
- The feature's earlier **7/7 real Firestore concurrency/rules checks** remain recorded in the [walkthrough](../TICKET_REDEMPTION.md). The traffic repair changes middleware only; it does not change that tested transaction code.

To reproduce the frontend run from `apcs_web` without a browser:

```sh
CI=true ./node_modules/.bin/react-scripts test --watchAll=false --watchman=false --env=node --runInBand --setupFilesAfterEnv ../docs/audits/evidence/2026-10-13-ticket-redemption/frontend-node-setup.cjs
```

The toolchain retains its existing dependency/open-handle notices. Syntax and whitespace checks pass. Standards/spec/hygiene review confirms bounded staff lookup, unchanged customer APIs, protected additive routing, isolated writes, local UI theme/state and separate retry storage. Normal release/restart is needed to load the new route/limiter; deploy the protected rules with the feature. No live browser/provider/production or peak-load acceptance is claimed.
