# Competition display time revisions

The owner selected **update the page and future/resend emails only**. Saving a revision never emails existing buyers automatically.

## Behavior and scope

**Admin Page → Session Assignment** embeds `SessionAssignmentManager` through `AdminContent.js`. On a published or ready competition group, **Add Time Revision** sits beside the original assigned-time pill. It accepts a same-day 24-hour range such as `11:10-13:30` (WIB), with the end after the start. A separate **Customer time** tag shows the saved revision. Empty text or the original time removes it. Draft/legacy/attendance groups retain their current controls.

For original `11:05-13:20` and revised `11:10-13:30`:

| Surface | Time used |
| --- | --- |
| Admin assigned time, video duration/overrun and running-order export | Original |
| Original timetable, assignment/session/seat/capacity keys | Original |
| Seat requests, checkout request, stored booking, retry fingerprint | Original |
| Newly loaded public performance cards/session labels/review/seat-load notice | Revised |
| Ticket confirmation sent after the save, including ordinary/alternate-address resend | Revised |
| Manual ticket payment instructions/resends and Paper.id seat-hold email | Revised |
| Previously delivered emails, provider invoices, PDF attachments and queued generic campaigns | Existing content |
| Orchestra session/assignment email | Independent orchestra time |

The endpoint writes only optional `events/{eventId}.competitionTimeDisplay = {revision, times}`. Times are keyed by the original full venue/date/time string. Its independent revision protects against stale edits. The transaction checks current publication, linked slot, timetable, unique group and saved ordered membership; no group, assignment, schedule revision, booking, payment, inventory, allocation or redemption is written. Both rule files protect this metadata from direct client writes. No new collection/index/migration or public-page query is needed; emails read the booking's event at send time.

## Owner acceptance

Release frontend, backend and updated protected rules together. Restart the backend through the normal workflow. Use approved test data and owner-controlled email addresses for the email checks.

1. Open a published/ready group. Record its original venue/date/time, members/order, booked seats, booking ID and schedule revision. Save/discard existing order edits before using the new button.
2. Choose **Add Time Revision**, enter `11:10-13:30`, and save. Confirm the original pill remains, the separate customer-time tag appears, and no email is sent. Reload Admin Page to verify persistence. Clicking the button should not expand/collapse the card.
3. Load the public booking page afresh. Check the correct performance card and checkout review use the revision. Confirm another venue/date/group and direct orchestra purchases keep their own times. Existing open pages need a reload to receive the new event data.
4. Confirm seat lookup still loads the original inventory. Compare the original members/order, seats and schedule revision with step 1. Buyer checkout continues submitting the original session string; choosing a revision must not create a second inventory scope.
5. With an approved paid test booking, use **Resend** (and optionally **Send to Another Email**). Check the revised competition time, original booking/seat/ticket details and saved venue-name snapshot. Old bookings for another event must not pick up the current sale event's wording.
6. Using approved test purchases, check manual-payment instructions and the Paper.id seat-hold email use the same revised text. Payment deadlines and amounts must stay unchanged. These manual email checks were not performed by the agent.
7. Choose **Edit Time Revision → Clear Revision → Save Display Time**. Reload both screens and resend only the approved test confirmation; original wording should return. This is the rollback for this copy change.
8. Enter invalid/reversed times and Cancel an unsaved correction. Invalid saves should show an error and keep the draft; Cancel should leave saved copy untouched. Structural group/session controls remain locked.
9. Open the board in two admin tabs. Save a revision in one, then try the older dialog in the other. Expect a conflict without overwriting the first edit. Copy the unsaved text if needed, close and reload before retrying. Resolve a lost acknowledgement by reloading before saving again.

Saving disables event switching, repeated submission and dialog dismissal. Display editing is disabled while board ordering is dirty or another operation is busy. No real customer email is sent by saving or clearing.

## Offline verification and limits — 19 October 2026

Final results: **30/30 new backend checks**, **52/52 frontend tests**, and **145 passes / 1 existing unrelated failure** across the 146-check backend regression selection. Changed-file ESLint has **zero errors**, with three existing warnings (unused `patchRequest`, duplicate `payment` API key, unused `handleAutoAssign`). Backend syntax and root/frontend/backend whitespace checks pass. The running frontend compiler reports warnings only, and its served bundle contains the new modal, API and display helper. No browser was opened.

The usual Jest runner initially encountered disk-space errors in Watchman/haste-map cache creation. Frontend tests then passed with Watchman/cache disabled and the test process's haste-map persistence disabled in memory; installed dependencies and user files were not modified for this workaround.

Standards/spec/hygiene/conditional-path self-review passed: repository writes are awaited and use the protected backend, the replacement session variable remains declared locally, new imports/state/props are used, no state/function identifier was removed, all canonical request/identity paths retain their original time, and clear/error/orchestra branches preserve the intended fallback.

- The new repository/email audits cover exact-write isolation, published/ready guards, clear/normalization, bad/structural payloads, stale revisions, mismatched projections, per-event email resolution and orchestra exclusions.
- Existing integrated winner/public-competition × Paper.id/manual tests now revise display wording before checkout, between checkout and fulfillment, and after redemption. They check original discovery/session identity, idempotent retries, invoice counts, paid fulfillment, owned seats, orchestra allocation, admission balances and subsequent purchases.
- Frontend tests execute the actual submit/save expressions without rendering: revised customer text leaves the canonical checkout/fingerprint unchanged, fresh tokens accompany the copy API, and conflicts/network failure retain drafts. No browser or Playwright was used.
- The broader orchestra suite retains an unrelated existing assertion expecting “will be sent by email” while the unchanged template says “are sent via email.” It is separate from time revisions; do not change customer copy to satisfy that stale assertion.

Offline checks do not certify production deployment/rules, Firestore contention, browser layout, provider callbacks or received email. No production database changes, provider calls, SMTP sends, commits or pushes were made for this feature. See [architecture](architecture.md), [technical ticketing flow](SEAT_BOOKING_FLOW.md) and [staff guide](TICKETING_SYSTEM_GUIDE.md).
