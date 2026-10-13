# Public checkout idempotency review — 13 October 2026

The owner requested a fresh check of `PublicTicketBookingPage.js` after the checkout response repair. The initial review executed the actual page/API/repository code with offline dependencies, plus real Firestore transaction checks in a separate disposable emulator, without changing application source or customer/provider data. The owner then requested repair of the refresh case; that implementation and current evidence are recorded below.

**Current conclusion:** Ordinary same-page retries, same-details refresh/reselection and simultaneous backend requests with the same key are protected. The refresh key-lifetime issue has been repaired. Display-only ticket changes can still generate another key, and sales closing can still block recovery before replay lookup; those two cases remain open.

## Verified protections

- The page saves a key and cart fingerprint in sessionStorage before submitting. A timeout, network failure or incomplete response keeps that attempt. An unchanged same-page retry uses the original key.
- The backend scopes keys by event in `ticketCheckoutKeys`, checks the normalized `requestFingerprint`, and reads/writes the key, booking and inventory inside one Firestore transaction. Reusing a key for changed ticket quantities rejects the request without another invoice.
- Only the request that creates the booking calls Paper.id to create its invoice. A matching retry returns the existing booking. While the original invoice is in progress, the controller returns HTTP 202 without sending an empty-link holding email.
- The existing paid callback receipt and fulfillment path deduplicates paid processing separately from checkout. Checkout idempotency does not by itself certify provider settlement or email delivery.

## Executed controls and initial findings

| Scenario | Key/result | Verification |
| --- | --- | --- |
| Server creates booking; browser loses response; same-page retry | Same key; one booking, invoice call and tier reservation | Actual page/API/repository code with offline dependencies |
| Same key reused with a different ticket quantity | Rejected as a different cart; one invoice | Actual repository with offline dependencies |
| Ten simultaneous same-key checkouts | One booking ID, one invoice call, one reserved tier place | Real Firestore transactions in isolated port-8082 emulator |
| Ten same-key checkouts followed by another retry | Same booking and single invoice/reservation; no surfaced request errors | Real Firestore transactions in isolated port-8082 emulator |
| Uncertain response, page state recreated, same performance selected and same cart rebuilt | Before repair: key changes; **two bookings, two invoice calls, two tier reservations**. Now repaired below. | Actual page selection/reset/submit handlers, API and repository with offline dependencies |
| Uncertain response; ticket display name changes from `Presto` to `PRESTO`, with quantities unchanged | Key changes; **two bookings, two invoice calls, two tier reservations** | Actual page/API/repository with offline dependencies |
| Uncertain response; sales schedule closes before same-key retry | Original reservation/invoice retained, but retry is rejected as sales closed | Actual page/API/repository with offline dependencies |

Duplicate-purchase cases deliberately use competition tickets **without selected numbered seats**. Chair ownership can reject a second attempt for an already locked specific chair, but unselected ticket capacity does not identify the same buyer's recovery attempt. Thus chair protection does not solve the lost-key problem. These probes created only substituted invoices/in-memory reservations; no actual customer purchase or payment was made.

## Causes and source references

### 1. Reselection erases the outstanding attempt

Before the repair, `PublicTicketBookingPage.js:206–215` reset purchase choices and removed `CHECKOUT_ATTEMPT_STORAGE_KEY`. `handleSelectWinner` calls this reset when the selected registration differs from the current component state (`:504–505`). After a page reload, the selected performance state starts empty; reselecting the same saved performance invoked the reset and erased the previous uncertain attempt. The reset now retains that attempt.

Rebuilding the original cart then cannot find that saved key, so `handleSubmit` generates another one (`:577–582`). This was reproduced by executing the actual reset/selection/submit functions with a shared sessionStorage map and a rebuilt identical cart. No DOM/browser was used; this is a code-path reproduction rather than browser UX verification.

### 2. The frontend fingerprint includes display/pricing metadata

At `PublicTicketBookingPage.js:570–576`, the fingerprint serializes `ticketsPayload`, which contains ticket `name`, `priceEach`, and event tier array ordering as well as ID/quantity. The backend fingerprint at `PublicTicketRepository.js:23–42` normalizes ticket quantities into sorted ID/quantity entries, ignoring client display names/prices.

A label-only change therefore makes the frontend generate a new key even though the backend regards the purchase's tickets as logically unchanged. The review reproduced two invoice calls after only changing `Presto` to `PRESTO` between the lost response and retry.

### 3. Current sale validation precedes replay lookup

`PublicTicketRepository.js:255–260` applies today's sales availability before the idempotency record is read at `:430–459`. Other current registration/session/pricing validations also occur first. Consequently, a previously created pending reservation can be inaccessible through the checkout retry after sales close, despite its saved invoice/key still existing. This does not release inventory or create a duplicate in the tested case; it is a recovery-availability gap.

## Saved evidence and commands

- [Offline flow probe](evidence/2026-10-13-public-checkout/idempotency-flow-probe.cjs).
- [Offline observed results](evidence/2026-10-13-public-checkout/idempotency-flow-results.txt).
- [Isolated real-transaction results](evidence/2026-10-13-public-checkout/idempotency-emulator-results.json).

From the monorepo, the diagnostic command reproduces the current passing controls and failing recovery scenarios without network, credentials, database access, invoice creation or email:

```sh
node docs/audits/evidence/2026-10-13-public-checkout/idempotency-flow-probe.cjs
```

The broad recovery-safety assertion originally failed on reselection. That path is now green; this broad assertion still fails on the separate unresolved ticket-display-label case:

```sh
node docs/audits/evidence/2026-10-13-public-checkout/idempotency-flow-probe.cjs --assert-recovery-safe
```

For the real transaction checks, the cached native Firestore emulator was started only on `127.0.0.1:8082` with project `demo-apcs-ticketing-qa`. The existing integration fixture refuses another host or a nonempty project, substitutes provider/email/timers and removes only its synthetic records. Each check passed:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 APCS_QA_FILTER='Concurrent retries of one checkout' node apcs_service/audit/ticketing-emulator.integration.cjs
FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 APCS_QA_FILTER='Idempotency recovery control' node apcs_service/audit/ticketing-emulator.integration.cjs
```

The emulator emitted transaction-lock-timeout warnings while the callers ultimately converged and both assertions passed. This is evidence for the tested ten-request pattern, not a peak-load or production certification. The globally installed Firebase CLI failed under Node 25 before startup (`SlowBuffer.prototype`); using the already cached native emulator avoided modifying tools/dependencies. The temporary emulator was stopped after verification. Port-8081 customer data and real Paper.id/email services were not used.

## Repair scope identified by the review

Uncertain purchase attempts need to survive cart UI resets until their outcome is known, and frontend cart identity needs to agree with the backend's normalized identity. Recovery of an already-created reservation also needs deliberate replay handling before new-sale gates, while retaining matching request identity and terminal/payment/inventory protections. Legitimate new or changed purchases must remain possible; idempotency should not globally prohibit the buyer from buying again.

The initial request was a verification check and changed only reports/diagnostic evidence. The owner subsequently authorized the refresh repair below. The earlier timeout/error/label fixes remain in place. No browser, start/build command, customer database write, real invoice/payment/email, deployment, commit or push was performed. Self-review distinguishes same-key backend safety from preservation of that key across the full buyer recovery flow.

## Authorized refresh recovery repair

The owner requested the first case to be fixed. `resetPurchaseChoices` now resets the cart controls without deleting the persisted checkout attempt or clearing its key ref. This applies to the existing performance, session, buyer-path and entry-type reset calls. The submit handler continues to compare the complete rebuilt cart fingerprint: same details reuse the key, changed details get another key, and validated success clears the completed attempt.

This is a frontend key-lifetime repair using existing sessionStorage and backend idempotency records. It introduces no Firestore/API/schema changes and does not automatically restore the cart's form inputs. Recovery requires rebuilding the same cart/contact/payment choices in the same browser tab. Backend terminal status, sale eligibility, inventory and fingerprint guards still apply.

### Verification

- Five new actual-handler regressions exercise fresh component state with shared tab storage, reselection after timeout/network errors, a genuinely changed ticket quantity, HTTP 202 invoice preparation, and another intentional purchase after successful recovery. The original key-deletion failures were observed before the edit; all tests pass after the edit.
- **39/39 focused frontend tests passed**, including the previous response/manual/paid/email and API regressions. Changed-file ESLint has zero errors/warnings. Tests execute source functions without DOM or browser; the toolchain still emits its existing CRA dependency/open-handle notices.
- The actual page/API/repository offline probe now returns keys `key-1, key-1`, **one booking, one invoice call and one reserved tier place** after refresh/reselection. [New repaired results](evidence/2026-10-13-public-checkout/refresh-recovery-results.txt) are saved separately from the original pre-repair output. The existing response-timeout safety probe also remains green.
- The probe still reproduces a second invoice for the display-label change and a blocked retry after sales closure. Those two issues were outside this requested repair and remain open. The earlier isolated ten-request Firestore controls were not rerun because backend transaction code did not change.
- Self-review and whitespace checks cover the reset/submit branches, retained and success-cleared keys, defined imports/variables, changed carts and preserved unrelated work. No declarations were removed; the two remaining sessionStorage removal calls are intentionally only in the validated-success paths.

### Owner walkthrough

1. Load the updated frontend and create a new staging test checkout. For an uncertain response, refresh the checkout page in the same tab.
2. Reselect the same performance and rebuild the same ticket quantities, selected seats/add-ons, contact details and payment mode. Retry with the same details. The booking/invoice should match the original, rather than producing another reservation. If the original invoice is still preparing, keep the same details and retry after the preparation message.
3. Confirm the saved attempt is cleared once a valid booking/link or paid result routes successfully. A later intentional purchase may create a new booking. Changing ticket quantities also produces a new cart identity; it does not cancel an existing uncertain reservation.
4. Check the original booking and invoice rather than paying the old canceled invoice from the earlier screenshots. Actual browser, provider payment and inbox acceptance remain owner checks.

This frontend-only repair requires loading the updated frontend. No backend restart, browser action, provider call, customer database mutation, deployment, dependency installation, commit or push was performed by the agent; edits remain uncommitted.
