# Operational seat blocking in Seat Occupancy

Implemented 14 October 2026. Blocks apply to the selected numbered competition session only, as agreed with the owner. Use them for photographers, cameras, equipment or other operational needs.

## Staff steps

1. Open **Seat Occupancy → View Layout** for the required venue, date and time. Seats must already have been generated.
2. Click an available chair. Confirm the seat and session, enter **Reason for blocking** (up to 500 characters), and click **Block seat**.
3. The chair becomes purple with a **Blocked** caption. Its tooltip shows the saved reason. The overview's **Blocked** total updates; it is excluded from Available and Booked counts.
4. Click that purple chair to review its reason and choose **Unblock seat**. It becomes available again for that session.

Booked/reserved chairs are disabled. Clicking a checkout-locked chair still opens the existing whole-booking cancellation review. Blocking cannot cancel or replace customer inventory. There is no venue-wide block or numbered orchestra-seat operation.

The backend also protects tickets already purchased or held without seat selection. For example, a tier with ten chairs and nine paid/held tickets permits one blocked chair. Ten paid/held tickets permit none, even if several chairs still look available while staff assignment is pending. Both Paper.id and manual-payment holds retain their space. An unresolved failed checkout also retains its capacity. A failed block leaves all records unchanged.

## Owner acceptance

Use an isolated test event and deliberately isolated payment/email configuration for checkout checks. A Firestore emulator alone does not isolate Paper.id or email.

- Block A1 for photography, close/reopen the layout and confirm its reason, purple status and overview count persist.
- Confirm A1 in another session is unchanged. Check tier boundaries and both venue layouts retain their rows and aisles.
- Check public seat selection and Public Customers assignment cannot choose the blocked chair. A checkout using an old selected-chair snapshot must be rejected by the backend.
- Check purchases without selected seats stop at layout capacity minus blocked chairs, including pending/manual holds and paid tickets awaiting assignment. A full tier must reject a new block without affecting customers.
- Unblock the chair; confirm it can be selected and the tier regains one place.
- Confirm booked/reserved chairs remain disabled and locked chairs retain booking review/cancellation. Regenerate the same layout in the test event and confirm blocked chairs remain blocked.
- With two staff views, change the same block in one. An old action in the other must be rejected and refresh the layout. After an uncertain response, review the refreshed status before another action.
- Try signed-out/non-whitelisted API requests; expect rejection. Verify public seat-list responses contain availability but no staff block notes/audit identities.

## Release and evidence

Release backend and frontend together and restart the backend through the usual process so `/public-ticket/admin/seats/block` exists. No new collection, index, rules change or data migration is required. Blocked capacity defaults to zero on existing counters and is initialized by the first block. Existing whitelist/direct-write rules retain their current privileges; the transaction guarantees apply to the backend operations, not unrestricted privileged edits.

Offline regressions execute production repository/controller code with substituted Firestore, provider and email dependencies; frontend tests run in a simulated DOM. They cover aliases, protected ownership, selected/unselected checkout, legacy confirmation, staff assignment, cancellation, regeneration, capacity bootstrap, revision conflicts, authentication wiring and public response redaction. This does not establish real Firestore contention/index behavior, rendered browser UX, production deployment or provider/inbox delivery. No live database blocks were applied during implementation.

The complete offline backend suite passed **285/285**; focused API/picker/checkout frontend tests passed **28/28**. Changed-file ESLint has zero errors and three existing warnings; backend syntax and document whitespace checks pass. Standards, requested behavior, stale-reference hygiene and all conditional paths were reviewed. No frontend server was listening on port 3000 during these checks.
