# Published group order — owner acceptance

Date: 18 October 2026 (WIB).

## Scope and release

This feature changes the order of complete competition registrations inside an already published/ready group. It does not move registrations between groups or rearrange ensemble members. Both the frontend and backend changes must be released together; restart the backend with the normal owner workflow. A missing `/competition-planning/:eventId/reorder` route indicates the updated backend is not running. No migration or Firestore rules/index change is required.

## Manual checks

1. Use an approved test event/snapshot with at least two registrants in one published performance group and another performance group. Record membership, venue/date/time, schedule status and any test booking/seat details.
2. Open Admin Page → Session Assignment and expand the group. Drag one existing registration above/below another **in the same group**. Check card numbering and Overview reflect that order. Dragging to another group/pool must not transfer membership. Pool additions, removal, Swap Mode, group editing and attendance edits must remain unavailable after publication.
3. Choose **Save Order** once. During saving, dragging, event switching and Discard must be disabled. After acknowledgement, refresh/reopen and verify order persisted. Verify the other groups, session time, schedule status, ticket/seat details and orchestra/attendance membership remain the same. No notification should be sent. Export after saving and check the running order.
4. Reorder again and choose **Discard**. Check the last saved order returns. Reorder and attempt to change events; check the existing unsaved-changes confirmation. Cancel should retain the draft. Save Order should be disabled without changes. Unsaved ordering must disable seat-generation/readiness buttons.
5. Repeat within a **ready** test schedule, including paid test bookings. Existing tickets must still resolve to the same session and chairs; payment, capacity, orchestra assignment and redemption balances must be unchanged. Do not generate production payments for this test.
6. In two staff tabs load the same revision. Save an order in the first; attempt to save from the second. The second must reject with a refresh message and must not overwrite the first. Refresh, review and reapply intentionally.
7. In a test environment simulate an expired login, rejected request or network error. The unsaved order must remain, saving must stop and the error must be visible. If the response was lost, refresh to establish whether the transaction completed before retrying.
8. With an attendance filter active, reorder two visible cards and check the complete group after clearing the filter. Every registration must still appear exactly once. Hidden cards retain their relative order; moving a visible card uses its position in the full list.
9. Check a draft event still allows its existing grouping, movement and Save Changes behavior. Published orchestra-attendance membership remains read-only.

## Offline evidence and limits

- 42 real-repository planning audit checks pass, including published/ready same-group saves with paid inventory, metadata/lifecycle preservation, stale revision and forged membership/scope rejection, inconsistent slot/projection rejection and atomic multi-group failure.
- 9 checks exercise actual UI callback and drag/drop source without a browser: changed-group-only saves, local revision update, no-op/busy saves, invalid indices, same-group hover, blocked cross-group movement and retained drafts on rejected/network/unconfirmed responses.
- 22 frontend Jest checks pass for the protected planning API, group helpers and Excel export.
- Syntax/whitespace checks pass. ESLint has no errors and three pre-existing warnings. Project dependency warnings remain unchanged.
- No browser or live Firestore writes were used. UI appearance, deployed authentication, transaction contention and live persistence require owner acceptance. No frontend compiler result was available after the crash because no port-3000 listener or attached app terminal was found.

## 18 October 2026 — Ticketing regression follow-up

Source tracing confirms competition checkout resolves assignment by `registrantId` under the unchanged venue/date/session key, both before reservation and inside its transaction. Discovery maps the same identity/session and sorts buyer choices by performer name. Sale gating checks schedule status, not its revision. Reordering preserves status, source-event metadata and attendance-only exclusions. Orchestra demand/claims use event plus registration identity, and redemption uses booking/allowance identity; neither uses competition running-order position.

The new `published-order-ticketing.audit.cjs` executes actual planning, checkout, payment, orchestra and redemption repositories against one shared isolated fixture. All **4 cross-flow cases pass**: winner/public-competition × Paper.id/manual. Each creates a pending selected-seat booking, reorders the ready group, verifies identical discovery and idempotent checkout replay, completes payment and seat fulfillment, assigns orchestra places, redeems performance/orchestra/eligible performer benefits, reorders again after redemption, rejects excess redemption and accepts a subsequent buyer's checkout. Each reorder verifies every existing non-planning/non-assignment record is unchanged and no extra record is created.

Full offline suite: **363 passed, 1 failed (364 total)**. The sole failure is the existing orchestra-email copy assertion in `orchestra-free-seating.audit.cjs:214`: it expects “will be sent by email” whereas the template says “are sent via email”. Both that audit and `OrchestraEmailDetails.js` are unchanged from backend HEAD. No safety assertion or unrelated email implementation was changed to make the suite green. Earlier missing-dependency failures were not reproduced in the current installed environment.

No regression attributable to published reordering was found. These offline tests do not prove browser behavior, deployed rules/authentication, real provider callbacks/inbox delivery or production contention. Owner acceptance above remains required. No live database, provider, SMTP, deployment, application startup/build, commit or push was used for this follow-up.
