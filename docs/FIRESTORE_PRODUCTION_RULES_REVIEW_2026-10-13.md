# Production Firestore rule compatibility review — 13 October 2026

The owner supplied their current production rules and requested a complete copyable merge with the checked-in `apcs_web/firestore.rules`, preserving existing permissions unless they defeat ticketing protections. The supplied text is the production baseline for this review; the deployed Firebase console was not inspected. The active local rules file was not changed or deployed.

**Copyable candidate:** [FIRESTORE_PRODUCTION_MERGED_2026-10-13.rules](FIRESTORE_PRODUCTION_MERGED_2026-10-13.rules). Replace the complete console rules text with this file; do not append it alongside the old catch-all. Publishing rules does not change or delete stored records.

## Required differences

| Collection | Candidate behavior | Reason |
| --- | --- | --- |
| `events/{eventId}` | Public read; whitelist create/delete only without planning state; whitelist updates cannot introduce/change/remove planning state, or change `venues`, `orchestraSessions`, `masterclassSessions` when planning state already exists | Preserve backend publication/readiness and frozen timetable flow; unrelated event field edits remain available |
| `sessionAssignments/{eventId}` | Whitelist read; client writes only for an existing event without planning state | Planning projections must be written through the backend; legacy access remains |
| `competitionSessionPlans/{eventId}` and `groups/{groupId}` | Whitelist read; no client writes | Revision-checked backend planning mutations |
| `ticketPaymentReceipts/{receiptId}` | Whitelist read; no client writes | Durable payment recovery receipts must come from backend processing |
| `ticketRedemptions/**` | Whitelist read; no client writes, including claims and request replay keys | Prevent bypass of entitlement/revision/correction controls |
| `scoringResultEmailDeliveries/**` | No client read/write | Delivery leases and status are accessed through authenticated backend routes |

The old `match /{document=**}` is replaced with `match /{collection}/{document=**}` excluding exactly these six top-level collections. [Firebase grants access when any overlapping match allows it](https://firebase.google.com/docs/firestore/security/rules-structure#overlapping_match_statements); leaving the old fallback would nullify the protections. Auth/null/email guards are added to the whitelist helper and the existing jury registrant read. All other original match blocks remain, with equivalent permissions.

The local `users` rule (`allow read, write: if true`) is deliberately **not imported**. The candidate preserves production public user reads and existing whitelisted writes instead. The duplicate production user matches remain to minimize changes; their `allow write: if false` is not a global denial because the retained whitelist fallback also matches.

## Verified data paths and compatibility limits

- Public ticket discovery, seat listing, checkout and polling use Express APIs. `PublicTicketRepository` and payment/recovery repositories use `firebase-admin` from `configs/firebase-init.js`. [Server clients bypass Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure), so the new client write restrictions do not prevent backend fulfillment; service-account/IAM and backend validation still matter.
- Manual-payment Mark Paid, cancellation, paid seat assignment, orchestra settings/assignment and redemption use backend endpoints. Ticketing staff middleware verifies the Firebase ID token and current whitelist membership. Frontend and backend must include these routes together.
- `PublicCustomersList.handleMarkPaid` still directly transacts on `publicBookings`, dynamic `seats{eventId}` and `ticketSeatOwnership` for the older non-manual path. `handleDeleteBooking` still directly deletes reconciled terminal bookings. Their whitelist permissions remain; making these collections backend-only here would break those actions. The non-manual Mark Paid path still relies on staff independently verifying payment.
- `DataContext` creates `users/{uid}` for a newly signing-in whitelisted staff member; `FirebaseApi` also supports direct staff user management. Existing whitelisted user writes are needed for compatibility. This retains broad trusted-staff role-management authority.
- Existing whitelist access also remains for `ticketCapacity`, `ticketCheckoutKeys`, `winnerOrchestraClaims`, `orchestraAssignments`, `systemSettings`, registrations, scoring and legacy records. No anonymous write permission is added. Existing public reads of users/whitelist are preserved; their privacy implications are not repaired by this merge.
- Existing whitelisted access to registration/scoring records continues to override narrower match conditions, just as in the supplied production baseline. This is not a redesign of jury access.
- A planned event's venue edit must use the supported backend metadata endpoint. Direct legacy venue/session edits that the local rules intentionally prohibit will now be rejected in production too.

The candidate is a **compatibility merge, not complete ticketing hardening**. A whitelisted client still has direct booking/inventory write/delete privileges. Frontend checks are not enforceable Firestore restrictions; fully enforcing paid-record safety requires first migrating the remaining direct admin mutations to protected backend operations, then excluding their collections from the fallback. That migration is outside this rules-only request.

## Evidence and owner acceptance

The candidate compiled in a disposable Firestore emulator (`demo-apcs-rules-merge`, localhost `8197`), with no imports and synthetic actors/records only. **247 permission checks passed**, covering public reads/list queries, unauthorized writes, whitelisted CRUD/query compatibility, planning event fields, legacy assignments, jury ownership/category checks, protected receipt/plan/redemption state/history/replay creates/updates/deletes and backend bypass. A non-whitelisted user with an admin role also cannot write protected collections. Missing-email tokens cannot use the fallback. [Executable probe](audits/evidence/2026-10-13-firestore-rules/check-rules.cjs), [results](audits/evidence/2026-10-13-firestore-rules/results.json), [structured security assessment](audits/evidence/2026-10-13-firestore-rules/assessment.json).

The existing customer emulator on port 8081, application servers, production records, provider services and emails were untouched. No browser, application build/start command, dependency installation, deployment, commit or push was used. Self-review checked overlapping grants, defined helpers, all event-update branches and preservation of original permissions. Existing active local rules retain their separate anonymous-user-write issue until independently repaired; deploying that local file later would overwrite this candidate.

After publishing the candidate in the intended Firestore database, the owner should sign in with existing staff/jury accounts and manually verify event loading, Public Customers, seat lookup, planning/backend venue metadata, manual payment actions, orchestra assignment and redemption through the normal approved testing process. Confirm the corresponding backend/frontend release and the local Firestore indexes are deployed separately. Exact staff email/whitelist document IDs must match; the backend normalizes email to lowercase while the Firestore helper uses the token email unchanged, preserving current behavior.

Rules alone do not certify production payment callbacks, indexes, inbox delivery, traffic capacity or browser behavior. Retain the prior console rules as a rollback reference, while recognizing that restoring the old catch-all restores its bypass too.
