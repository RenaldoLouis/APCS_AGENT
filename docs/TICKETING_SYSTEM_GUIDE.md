# APCS Ticketing System Guide

## 2026-10-26 — Download a seat map image for a session

Open **Seat Occupancy → View Layout** for a competition session and select **Download image**. You get a PNG of the venue map with the venue, date, time, tickets left per category and the time the layout was loaded. Grey seats are not available: booked, held in checkout, reserved, blocked, or in a category with zero tickets left. Gold (Presto) and blue (Allegro) seats can still be sold. Select **Refresh layout & availability** first when you need the latest state; the image shows the layout as loaded.

The button stays disabled while **Ticket availability could not be verified** is shown. If a message lists seats the map does not contain, the venue image in Venue Settings does not follow the [seat map contract](SEAT_MAP_SVG_CONTRACT.md); upload the prepared SVG. Before the first download, upload the prepared Behring and Titan files from `docs/seat-maps/` in **Venue Settings**. They look exactly like the current images, including Behring's 15 grey team-blocked seats. Backend restart required for the new endpoint.

Replacing a venue image is safe while sales are open and the schedule is published: change only the image, keep the venue name and seat rows, and save. Bookings, seats, capacity and the published schedule are not touched. A seat drawn grey in an image must stay blocked in every session of that venue, because buyers see the image next to the seat picker.


Open **Seat Occupancy → View Layout** for the competition venue/session. Above the map, **Actual ticket availability** lists each category's **Total slots**, **Booked / held tickets**, **Blocked slots** and **Actually available**.

The available count subtracts every booked or held ticket and operational block from that category's total. Tickets bought without the seat-selection add-on are included even before staff assign their chairs. For example, 28 Allegro slots with 27 booked/held tickets and one blocked chair means **0 actually available**, even if some chairs still look available on the map. Paid tickets and pending payments both use capacity. Unresolved checkout holds remain counted until the normal protected workflow releases them; an expired local timer does not establish a release.

**Fully booked / unavailable** means the tier has zero remaining sale capacity. An **Over capacity** warning needs staff review and makes no automatic inventory correction. If **Ticket availability could not be verified** appears, use **Refresh layout & availability**; do not infer sale capacity from unassigned chairs. Counts are a snapshot, so refresh after purchases, payment/cancellation or assignment activity. Closing/reopening also reloads them. Block/unblock refreshes the summary automatically through the existing layout reload.

The summary reads existing data and sends no email or booking change. Existing seat search, block/unblock and locked-booking review remain available; orchestra free seating is still managed separately. Frontend update only; no backend restart, data migration or new index/rule is required. [Owner verification examples and failure checks](SEAT_OCCUPANCY_LAYOUT_WALKTHROUGH.md#actual-ticket-availability).

## 2026-10-25 — Edit contact details for a pending buyer

In **Public Customers**, select the event and find a **Pending** ticket booking. Choose **Edit Buyer Contact**, correct the prefilled **Buyer Name**, **Email** and **Phone Number**, then **Save Contact Details**. Only these buyer contact details are editable. Use one plain email address; phone accepts 6–20 digits with an optional leading +, spaces, parentheses and hyphens. Name and phone are required. Paid, expired, failed and archived bookings do not qualify. Documentation-only records retain their separate Edit Customer action.

The server rechecks pending state when saving. If payment completes or another staff member changes the contact after the editor opens, save is refused: close, Refresh and review the booking before reopening. Errors keep your draft; uncertain/network responses require Refresh to check whether the correction was saved. A successful save reloads the list, so a search using the old contact may stop matching the booking.

The owner chose **APCS booking only**: future APCS messages use the corrected contact, while existing Paper.id invoice contacts and previously delivered emails remain unchanged. Save sends no email. Payment-info/confirmation delivery indicators keep their historical meaning; an intentional resend remains a separate action. Ticket quantities/prices, payment/invoice identity, original seats, capacity, session/performer assignment and the ticket buying flow stay unchanged. The backend must be released/restarted before or with the frontend. [Manual walkthrough](PUBLIC_CUSTOMERS_BUYER_CONTACT_WALKTHROUGH.md).

## 2026-10-25 — Filter buyers needing seat assignment

Public Customers now offers **All Seat Assignments → Needs seat assignment** beside the payment filter. It shows paid (`PAID`/`paid`) bookings with missing numbered seats, using the same `getMissingSeatCount` rule as the existing badge. Partially assigned purchases remain visible; free-seating, Masterclass-only and documentation-only purchases are excluded. Search and payment filters combine with this filter before pagination, so Pending or Expired produces no matches while Needs seat assignment is selected. Changing the filter resets to page one; switching events resets all filters; Refresh retains them. The gold missing-seat booking count remains event-wide. Filtering uses already-loaded rows and changes no Firestore queries, stored data, assignment API, payments, seat ownership or email behavior. Choose All Seat Assignments to restore the unfiltered seat view. See [manual checks](PUBLIC_CUSTOMERS_SEAT_ASSIGNMENT_WALKTHROUGH.md#filter-buyers-needing-seat-assignment).

## 2026-10-24 — Teacher names hidden on booking cards

Winner and public performance selection cards no longer display the teacher-name row. Buyers can still search by teacher name using the existing search field. Performance names, assigned venue/session details and the purchase process remain unchanged. Manual acceptance: check both buyer modes omit the teacher row and still allow selecting a performance and continuing to tickets. No backend release or data migration is required.

## 2026-10-21 — One-time address for an individual rundown resend

The selected-recipient dialog has an editable **Email** field prefilled with the historical campaign contact. Replace it to send that row's personalized rundown/PDF once to another mailbox. The entered address is not saved as a contact or written to Firestore; registration contacts, ticket buyer emails, bulk recipients/counts and original delivery evidence remain unchanged. Cancel/success clears the draft; errors retain it. Existing confirmation, version/dummy/runtime/completion checks, per-row cooldown and no-auto-retry behavior remain. A destination fingerprint protects request replay without persisting the alternate address. Release/restart the backend before or with the frontend and refresh recipients; older backends keep the new action disabled. [Detailed owner checks](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#send-once-to-a-different-email-address).

## 2026-10-21 — Resend a rundown email to one contact

Open **Admin Page → Session Assignment → APCS2026 → Email Assigned Registrants** after the saved campaign finishes. Choose **Resend Email** on the intended row, check the registration, performer(s), address and PDF, then confirm **Resend to This Recipient**. Only that contact receives another rundown; an ensemble's other contact rows are not selected automatically. Existing approved-file/dummy/runtime checks remain. If the campaign just finished while the modal was open, use **Refresh Recipients / Progress** first.

Rapid duplicate requests are protected, with a three-minute cooldown for another manual resend to the same row. Success means mail-server acceptance; check inbox/spam. For uncertain/interrupted results, check the mailbox/provider before any new confirmation. This action changes no ticket/payment/seat/assignment state and does not restart bulk delivery. Release frontend/backend together and restart the backend before using the new action. [Detailed acceptance steps](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#individual-resend-after-the-campaign-finishes).

## 2026-10-19 — Assigned-group bulk worker enabled

The assigned-registrant email worker is enabled on the local backend and the backend has been restarted. The exact current dummy receipt is saved. Reopen or refresh the email modal, review attendance and recipients, and confirm bulk when ready. No campaign or email was triggered during activation. Published-group scope and all remaining send gates still apply; booking, seat, payment and admission flows are unchanged. A separate hosted backend needs its own flag and restart. [Activation and rollback](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#19-october-2026--backend-worker-enabled).

## 2026-10-19 — Review attendance totals before the group email

The **Email Assigned Registrants** modal now starts with **Total not attending**, Attending, Not imported, Unavailable and total-registration counts. These are distinct registration totals: an ensemble or a registration with several email addresses counts once. Only explicit `willAttend: false` counts as Not attending; missing/unknown confirmation is shown separately as Not imported, and missing/unsupported registration data is Unavailable. A warning appears if any of these need review, so a zero Not attending count alone does not imply that everyone confirmed attendance.

Open the modal or use **Refresh Recipients / Progress** to check current attendance. For an already queued campaign, attendance is checked for its saved registrations; the frozen email list and running worker are preserved. The counts are informational and do not remove anyone from the recipient list or add a new send restriction. Review discrepancies before choosing to send. This introduces no booking, seat, payment, capacity, membership, attendance or delivery write. Release frontend/backend together and restart the backend normally; no schema, rules, index or migration change. [Attendance walkthrough](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#attendance-totals-before-sending).

## 2026-10-19 — Recover a booking when another expired purchase still holds places

An expired purchase can still hold ticket capacity through its canonical chair ownership after an older partial expiry. Reconcile Payment now recognizes a fully verified retained reservation instead of incorrectly reporting that its session counter differs. It preserves the other customer's booking and holds. No selected chair on the booking being recovered does not mean zero capacity demand: each ticket still needs a place, and missing chairs are assigned through the existing paid-booking workflow.

For `hxfzh9Cxa459dFIDACI1`, the inspected session had 25 ordinary active Allegro tickets and two retained places on another expired booking. Its counter of 27 was explained; restoring this one-ticket purchase requires 28 of the 28 places. The source fix was tested offline and does not itself mark this production booking paid. After the backend update/restart, refresh Public Customers, verify full unrefunded payment against the exact production invoice, and retry the existing Reconcile Payment action. The transaction rechecks current inventory; another intervening purchase or conflicting hold can still stop recovery.

Only complete reservations backed by matching active ownership and valid original chairs are recognized. Released/reassigned ownership is not counted twice; partial/mismatched ownership, unidentified counter drift and insufficient room still require staff review. Do not manually reduce the counter or bypass these checks. The frontend, payment confirmation/Resend controls, chair assignment and orchestra/admission flows retain their existing behavior. [Walkthrough and acceptance](LATE_PAYMENT_RECOVERY_WALKTHROUGH.md).

## 2026-10-19 — Use the final 2026 rundown PDF

The assigned-group rundown email now attaches `RUNDOWN APCS THE SOUND OF ASIA 2026 - FINALE ORCHESTRA.pdf` for both the fixed dummy test and future bulk delivery. The owner's supplied file is copied unchanged and pinned by SHA-256 in backend configuration. Existing email wording, APCS header/footer, published-group recipients, queue/retry rules and booking/seat/payment/admission behavior are unchanged. There is no schema, rules, index or migration change.

Release the backend with the new PDF/configuration and restart through the normal workflow. Open **Admin Page → Session Assignment → APCS2026 → Email Assigned Registrants** and send a **new dummy to renaldolouis555@gmail.com**. The previous PDF's dummy receipt does not unlock this new version. Review the attachment and only then use the existing bulk confirmation when its worker/recipient gates pass; no worker flag or campaign was activated by this update.

The PDF's main schedule says 14–15 November 2026, but some awarding-column headers still say **15 November 2025** (pages 2, 4, 5, 7, 8, 10, 12, 14). Those supplied bytes are preserved; check these typos during dummy review. [Attachment details and acceptance](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md).

## 2026-10-19 — Reconcile verified payment after a booking expires

For an expired version-2 Paper.id numbered competition booking with **Payment received — needs review (booking_canceled_before_payment)**, use the new **Reconcile Payment** button below that notice. The dialog displays the saved buyer/booking, invoice ID, amount, session and original seats. Verify the exact invoice is fully paid and unrefunded in the production Paper.id dashboard, check the confirmation box, add an optional note and select **Confirm Payment and Restore Booking**.

The server validates receipt/booking identity and restores payment, original chairs, ownership and capacity atomically. It stops for staff review if chairs are owned/blocked elsewhere or capacity cannot be reconciled safely; it never picks replacement chairs. Success shows PAID and removes the review warning. If filtering Expired, switch to Paid/All Payment Statuses. Expand Order Details for verifier/invoice/note. Unselected tickets retain the existing Assign Missing Seats workflow; orchestra assignment remains separate.

The first successful request attempts the normal confirmation email. Failure leaves payment confirmed and allows normal Resend after refresh. Duplicate recovery does not resend. For uncertain responses/delivery, check saved status and delivery before retrying. This is staff dashboard verification, not an independent provider lookup. It does not change cancellation behavior or establish why Paper.id accepted a late payment. Historical/legacy-quota, direct-orchestra and other review reasons remain separate staff cases.

Release frontend/backend together and restart the intended backend before use. No customer records or emails were changed during implementation. [Full walkthrough, capacity safeguards and acceptance](LATE_PAYMENT_RECOVERY_WALKTHROUGH.md).

## 2026-10-19 — Correct customer time wording on a locked competition group

In **Admin Page → Session Assignment**, published/ready competition groups have **Add Time Revision** beside **Assigned time**. Enter the replacement time range in WIB, for example `11:10-13:30`, then choose **Save Display Time**. Admins still see the original `11:05-13:20` and a separate **Customer time** tag. **Edit Time Revision → Clear Revision → Save Display Time** restores the original wording. Save or discard any unsaved running-order changes before editing time copy. Draft, legacy and orchestra-attendance groups do not have this control.

This changes the text on freshly loaded public booking pages and in emails sent afterward: paid confirmations/resends (including Send to Another Email), manual-payment instructions/resends and payment-pending seat-hold emails. **Saving sends no email.** Emails already delivered stay unchanged; use the existing paid-booking Resend action when appropriate. Generic announcement/PDF content and already-queued campaigns are not edited by a time revision. Orchestra assignment emails use their independently configured orchestra session.

The original schedule remains locked. Group order/membership, venue/date, selected seats, seat ownership, payment status, invoice totals, eligibility, booking identity and admission benefits stay unchanged. This action is appropriate for correcting the communicated time only. An actual group move, date/venue change or reassignment requires its own workflow.

The backend validates the range and checks the current published session before saving. If someone changed display copy first, save refuses to overwrite it and keeps your input open. Copy the draft if needed, close the dialog, reload the page and review the saved wording before retrying. A lost response may follow a successful save, so reload before repeating it. Cancel leaves saved wording unchanged; saving disables dismissal and event switching. No existing-data migration is required. Release the updated frontend/backend and protected Firestore rules together before owner acceptance.

See [manual checks and verification boundaries](COMPETITION_DISPLAY_TIME_WALKTHROUGH.md).

## 2026-10-18 — Finale Orchestra dummy and background bulk delivery

Open **Admin Page → Session Assignment → APCS2026 → Email Assigned Registrants** after saving/discarding board edits. The list covers published competition performers only, using their current performer contacts. Review the exact Finale Orchestra subject/body and APCS header/footer, then choose **Send Dummy to renaldolouis555@gmail.com**. There is no arbitrary test-recipient field. The dummy always uses Alex Example and goes only to that fixed address.

The supplied `Program Notes - Fixed.pdf` is dummy-only by owner choice. Client bulk stays disabled until the final client PDF is configured by its checksum, that exact message/PDF version has a successful dummy test, an intended server worker is enabled, and every contact issue is resolved. A new PDF/message needs a fresh dummy test. Review the message and attachment in the inbox before confirming **Send to All Assigned Registrants**. Starting saves a fixed recipient list and returns quickly; it does not wait for all emails in the browser.

After the campaign is saved, staff can close the dialog/page or sign out. The server continues delivery; the existing inactivity logout is unchanged. Reopen/sign in to view saved progress, including mail-server acceptance, rejected addresses and uncertain outcomes. A server restart resumes pending recipients when the enabled worker returns. Accepted, rejected and uncertain recipients are never automatically resent; check the SMTP provider before any separate staff remediation. Do not start a new version merely to work around uncertain delivery. A changed/missing approved PDF pauses the campaign until its exact version is restored and staff choose Resume. Same-version Start retries reuse the existing campaign, including after a lost acknowledgement.

This feature writes only the new protected campaign/delivery collection; it changes no ticket, seat, booking, payment, group assignment or admission data. Release backend/frontend and the updated Firestore rules together. Worker configuration is explicit and cannot run bulk from Firestore emulator mode. No production activation, real mail or live database write was performed by the agent. Follow the [release checklist and manual acceptance](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md).

## 2026-10-18 — Add an already paid documentation-only customer

Use **Public Customers → Add Documentation Customer** after staff verifies a documentation payment received outside APCS. Select the intended event first, enter the customer's name and optional note (for example documentation package and transfer reference), then **Save Customer**. The owner chose to accept **already paid customers only**: payment stays **PAID**, with no unpaid/pending choice. No performer/session/seat selection or existing registration is required.

The row shows **Documentation only**, **No seat**, and email **NOT APPLICABLE**. It appears in name searches, All Payment Statuses and Paid; Pending/Expired exclude it. Amount is **Recorded offline** because this form does not collect an amount. Expand it to read the note, or use **Edit Customer** / the note editor to correct the name/note. These entries do not have ticket email, Mark Paid, seat assignment, cancellation or booking deletion actions. They do not grant venue admission, free seating, orchestra attendance or redeemable tickets. Documentation delivery remains outside this feature.

Records are stored separately from ticket bookings and are combined only for this screen. This keeps them outside seat/attendance/capacity/payment recovery/redemption/planning validation. The missing-seat badge still counts actual bookings only. Saving checks the event and a record revision; stale edits are refused while your draft stays open. Copy the draft, cancel, **Refresh** and reopen the current record if another staff member changed it. A failed create retains its record ID so retrying the unchanged form after a lost acknowledgement does not create another entry. Changing events discards an unsaved draft; saving disables switching and dismissal.

No backend release, database migration, rule change or index definition is added by this feature. The frontend uses existing whitelist authorization; hosted permission/persistence and UI acceptance are still required. If documentation records fail to load, the warning identifies the incomplete source while existing ticket bookings remain available. Use **Refresh** to retry. Follow the [manual walkthrough](DOCUMENTATION_CUSTOMERS_WALKTHROUGH.md) to check persistence, filters, ordinary booking controls and unchanged seat/attendance totals.

## 2026-10-18 — Filter Public Customers by payment status

In **Public Customers**, use the selector beside search to choose **Expired**, **Pending** or **Paid**. **All Payment Statuses** restores all normally visible bookings, including failed ones. Paid includes both saved `PAID` and `paid` values. Search and status work together across all loaded bookings for the selected event, before the table shows ten rows per page. A status change returns to page 1; switching events restores All Payment Statuses, clears search and returns to page 1. An empty result explains that no bookings match the search or status filter. The seat-assignment badge continues to count the entire event.

Owner walkthrough after loading the updated frontend:

1. Select an event with known expired, pending and paid bookings. Choose each status and confirm every visible Payment Status tag matches, including any uppercase/lowercase paid records.
2. Enter a buyer name or email with a status selected. Confirm rows satisfy both filters; try a nonmatching search and check the empty message.
3. From a later page, change status and confirm page 1. Restore All Payment Statuses and clear search to recover all normally visible rows, including failed bookings.
4. Change events and confirm both filters and pagination reset. Verify the event-wide seat-assignment badge is independent of filters.

Filtering uses already-loaded rows only. It changes no saved payment/booking data or actions and needs only the frontend update; no backend restart, schema/index/rules change or migration is required. Source review and lint do not replace owner browser acceptance.

## 2026-10-18 — Change performance order in a published group

**Regression follow-up:** four integrated winner/public-competition × Paper.id/manual tests pass with reordering between checkout and payment and again after redemption. Discovery, idempotent replay, seat fulfillment, orchestra allocation and admission balances remain valid. The full offline suite has 363 passes and one unrelated existing email-wording assertion failure. See [evidence and acceptance limits](PUBLISHED_GROUP_ORDER_WALKTHROUGH.md#18-october-2026--ticketing-regression-follow-up).

In **Admin Page → Session Assignment**, expand a published or ready competition group, drag a registrant card above/below another card **in that same group**, then click **Save Order**. This reorders complete registration cards, including an ensemble as one registration. It does not rearrange performers inside an ensemble. **Discard** restores the last saved order; leaving the event with unsaved changes asks for confirmation. Save before exporting the final running order.

Published membership and session details remain locked: no dragging to another group or the unassigned pool, adding/removing registrants, swapping groups, changing venue/date/time or editing attendance membership. While saving, dragging/event switching/discard are disabled. Save Order is disabled when nothing changed. With an unsaved order, seat-generation/readiness buttons are disabled until staff save or discard.

The backend independently verifies that the saved group contains exactly the same registrations and that its published assignment and linked timetable still match. All changed groups save together with a shared revision check. If another staff member changed the schedule/order first, save rejects; refresh the board, review the latest order and apply the intended reorder again. Network/response failures retain the local draft; refresh to determine whether a lost response followed a successful save. Never bypass the lock with the draft save endpoint.

Tickets, seats, payment, capacity, admission benefits and session notifications retain their existing values because session identity and membership are unchanged. This action sends no email. Release both frontend/backend and restart the backend normally before testing. No database migration, rule or index change. [Manual walkthrough, failure checks and offline evidence](PUBLISHED_GROUP_ORDER_WALKTHROUGH.md).

## 2026-10-18 — Send a confirmation to another email

In **Public Customers**, paid bookings now have **Send to Another Email** beside **Resend**. Open it, check the displayed buyer/booking/saved address, enter one recipient email and choose **Send Email**. The standard booking confirmation goes to that entered address only. The buyer's saved email, registrant record and APCS Email Status remain unchanged. Use this for a one-time copy, not to correct a saved contact address. The alternate address and send history are not saved.

Both buttons can send again when the original status already says SENT. **Resend** uses the saved buyer address and updates the existing email-status flag; **Send to Another Email** sends a separate copy and leaves that flag alone. The new action is available only after confirmed payment, including paid manual bookings. For a pending manual booking's payment instructions, use the separate **Send/Resend Payment Info** action.

The modal accepts one address, not a comma/semicolon list or `Name <address>` format. Staff authentication and whitelist access are checked by the backend. Cancel discards the draft; changing events closes it. While sending, the input, Send button, event selector and dialog dismissal are disabled. Failure keeps the recipient available to correct/retry. If delivery cannot be confirmed, check the recipient's inbox/spam before retrying: a lost response can follow a successful send, and each manual retry may send another copy.

Owner walkthrough after releasing frontend/backend and restarting the backend normally:

1. Use an approved paid test booking, including one whose APCS Email Status is SENT. Click **Send to Another Email**, verify the booking context and enter an owner-controlled alternate address.
2. Choose **Send Email** once. Confirm loading/disabled controls, successful acknowledgement and delivery to the entered inbox. Check the ticket quantities, booking ID, venue/session and seat details in the usual confirmation template.
3. Refresh Public Customers. Confirm the original buyer email and original APCS Email Status are unchanged. Verify the original recipient received no extra copy from this alternate-address action.
4. Open again, enter a different address and Cancel; confirm nothing is sent. Switch events with an unsent draft; reopen a booking and confirm a fresh empty recipient.
5. Try an empty/malformed address or multiple addresses; expect validation without sending. Confirm pending/failed/expired bookings have the action disabled. Verify a paid manual booking works like a paid Paper.id booking.
6. Check an expired staff session or a simulated mail/network failure in the test environment. Expect an error with the modal/address retained and no original-status change. Avoid deliberately sending repeated copies while a request is pending.
7. Verify **Resend** still uses the saved buyer address. If the new route reports `Cannot POST`, confirm the updated backend was released/restarted before investigating booking data.

No live email or browser was used by the agent. Offline success does not certify deployed authentication, real SMTP delivery or inbox receipt.

## 2026-10-17 — Buyer booking notes

In **Public Customers**, the **Note** column lets staff add or edit a plain-text note for each buyer's booking. Choose **Add Note**, enter text (up to 2,000 characters, including multiple lines) and choose **Save Note**. The note appears directly in the list and loads again with the booking. **Edit Note** reopens it; clearing the text and saving removes it. **Cancel** discards unsaved edits. Notes belong to individual bookings, so multiple purchases by one buyer have separate notes.

Saving changes only `publicBookings.adminNote`; payment, seats, admission, cancellation and customer emails retain their existing behavior. Existing whitelisted staff permissions apply, with no new API, migration, rule or index. A failed save keeps the draft open. If another staff member has changed the note, the save is refused: copy your draft, Cancel, refresh the page and reopen the current note. Switching events discards an unsaved draft; switching or dismissing the dialog is disabled while saving.

Owner walkthrough (manual browser/live persistence checks):

1. Open Public Customers, select an event and use **Add Note** on a booking. Save a two-line note; confirm it appears on the correct row.
2. Refresh the page, select the same event and confirm the note persists. Check another booking by the same buyer remains separate.
3. Use **Edit Note**, change the text and Cancel; confirm the saved text remains. Edit again and save; confirm the change persists after refresh.
4. Clear the text and save; confirm **Add Note** returns and the note stays absent after refresh.
5. Open the same note in two staff tabs. Save different text in the first, then try saving from the second; expect conflict guidance and a retained draft. Cancel/refresh to load the newer note.
6. Confirm payment status and seat details remain unchanged. Check long text wrapping and event switching. Network/permission errors should retain the draft for retry.

No browser or live database mutation was performed by the agent; rendered appearance and real persistence remain owner acceptance checks.

## 2026-10-15 — Opening nationality modal

When the public ticket page is ready, buyers first see **What is your nationality?** with two choices:

- **Indonesian:** the existing Paper.id payment flow with a 30-minute payment window.
- **International:** the existing PayNow/bank-transfer flow. After reservation, payment instructions are emailed; there is no automatic expiry. Staff must verify payment and mark the booking paid, or explicitly cancel it if unpaid. Selected seats and purchased capacity remain held while pending.

This replaces the Step 4 international-payment checkbox for all buyer paths. Nationality is self-declared for this checkout and is not inferred from a performer's profile. The buyer must choose before continuing; **Change** above the stepper allows correction before submission. Switching performances, buyer type or session retains the choice. Review & Pay displays the payment method and the corresponding existing hold notice/button. The four checkout steps and assigned performance/session rules remain the same. Refreshing or opening the page again prompts for a new choice; it is not saved as a customer nationality field. For an uncertain checkout retry, select the same option and use the same booking details so the saved checkout key can be reused.

**Owner walkthrough after the frontend update:**

1. Open the booking link. Confirm the dark/gold modal offers both options, fits a phone-width screen, and requires a selection even when pressing Escape or clicking outside. Check keyboard focus and activation.
2. Choose International. Switch performances and buyer types, then complete the normal steps. Confirm the choice remains International and Step 4 shows PayNow/bank transfer, the pending-reservation notice and **Reserve & Email Payment Instructions**, with no international checkbox.
3. In the approved test environment, submit an international booking. Confirm the existing acknowledgement route and emailed instructions. Inspect the saved booking for `paymentMode: manual`, no Paper.id invoice and no expiry. It remains pending until staff confirms/cancels it; a delivery failure should preserve the existing recovery guidance rather than claim success.
4. Start another visit and choose Indonesian. Confirm Paper.id in review and the 30-minute notice; in the approved test environment, verify the usual payment link/status flow. A local timer alone must not release inventory before provider cancellation is confirmed.
5. Before submitting, use **Change** to switch nationality. Confirm cart, buyer details and totals remain intact while the payment method, notice and submit button update together. Closing a reopened modal without choosing keeps the current choice. Refresh and confirm the initial modal appears again.
6. Repeat the review checks for registered-winner, public performance and direct orchestra purchases. Where testing response recovery, retain the same nationality and details when retrying.

Verification completed: **19 frontend checkout/API tests**, focused ESLint, whitespace checks and standards/spec/hygiene/conditional-path review. No browser, live database/provider/email action or deployment was used; visual and live acceptance remain owner checks. This update requires frontend release only and reuses the existing backend API and staff payment workflow.

## 2026-10-14 — Seat unavailable message at final checkout

If a selected competition seat becomes held, booked, reserved or blocked before **Review & Pay** is submitted, checkout continues to reject it safely. Production now displays a clear message such as **The selected seat (A11) is no longer available. It may have been booked or blocked. Please go back to seat selection and choose another seat.** Canonical ownership and occupied legacy aliases use the same guidance. An exhausted ticket category instead asks the buyer to return to ticket selection and change the quantity or category, because replacing a seat alone cannot restore sold-out capacity.

Use **Back** twice (through Your Details) to reach Select Tickets. That step fetches the current layout; deselect the unavailable chair and choose a different available chair in the purchased category. Quantities, buyer details, the assigned performance/session and payment choice are retained. There is no automatic cart reset, redirect or new form step. A replacement seat uses the existing changed-cart checkout-key behavior. Payment timeouts and uncertain invoice responses retain their existing instruction to retry with the same details or contact APCS; they are not labeled as seat conflicts.

These errors occur in the existing transaction before a booking/invoice is committed. Seat ownership, blocking/cancellation safeguards, pricing, paid capacity, Paper.id/manual payment and confirmation-email behavior are unchanged. No database collection, schema, rule, index or migration is introduced. The existing production error middleware exposes only the operational 409 message/code; unrelated unexpected errors remain generic.

**Manual walkthrough after backend release/restart:**

1. In a test environment, select an available competition chair and reach Review & Pay. Have another buyer hold/book it or staff block it before submission.
2. Submit with Paper.id mode and then repeat with manual payment. Expect the specific seat guidance, preserved details and no new booking/invoice for the rejected attempt.
3. Go Back twice, deselect the unavailable chair, select another available chair, and proceed with the original details. Expect the existing payment or manual-instructions route.
4. If the entire category is full, expect quantity/category guidance. For a timeout or invoice still being prepared, retain the same details and follow the existing recovery message.

Offline repository/production-middleware and frontend handler/API tests pass; no browser, provider call, live database write or deployment was used for verification. Only backend source needs to be released for the changed messages; the current frontend already displays them.

## 2026-10-14 — WIB in Review & Pay and payment confirmation

The **Session** row in Step 4 **Review & Pay** and the payment-confirmed email now includes **WIB** after the time range. A saved orchestra-assignment time included in that payment email also carries **WIB**. All times remain the existing Jakarta session times; booking details and payment/assignment rules are unchanged.

Manual acceptance after frontend/backend release: check Step 4 for winner, public competition and direct orchestra purchases, then inspect a new payment-confirmed email's main Session row and any assigned orchestra time. Expect a range such as **10:00-11:00 WIB**. Restart the backend normally to load the email template; previously delivered emails remain unchanged. Offline checks passed; browser appearance and inbox delivery remain for owner verification.

## 2026-10-14 — English seat-held email deadline

Seat-held payment requests now use a fully English deadline, for example **Complete your payment before 14 October 2026 at 23:24 WIB (UTC+7).** The date still comes from the booking's existing expiry and uses Jakarta time with a 24-hour clock. Payment links, the hold duration and confirmed provider cancellation requirements are unchanged.

Restart/release the backend normally to apply the formatting to future generated emails. Already delivered emails cannot change. Manual acceptance: inspect a new seat-held email for **October** and **at** instead of **Oktober** and **pukul**, a colon-separated time, the bold deadline and the retained timezone. Offline sender/template checks passed, including midnight rollover; recipient inbox delivery was not tested.

## 2026-10-14 — Block seats for photography or equipment

Open **Seat Occupancy → View Layout** for the competition session. Click an available chair, check the seat/session, enter a reason and choose **Block seat**. It becomes purple, shows **Blocked**, and appears in the overview's Blocked count. Hover for the saved reason. Click the blocked chair and choose **Unblock seat** to make it available for sale again. Each block applies only to that venue/date/time; other sessions retain their inventory.

Blocked chairs cannot be selected by buyers or assigned in Public Customers. Booked/reserved seats cannot be blocked; checkout-locked chairs still open the existing booking cancellation review. Blocks also reduce the tier's total tickets for sale when buyers skip seat selection. If all chairs are already needed for paid or held tickets, the backend refuses a block even when the chair looks available while awaiting assignment. Manual-payment and unresolved checkout holds stay protected. Blocking/unblocking records staff identity/time and a reason, without payment, booking, email or orchestra changes.

After a stale conflict or uncertain response, the layout refreshes so staff can review its latest status. Regenerating seats keeps active blocks and block history/revisions. Existing counters default to zero blocked chairs; the first block initializes its counter and preserves legacy booking demand. The backend endpoint requires a fresh Firebase token and whitelist membership. Public seat-list responses omit staff block metadata. Release frontend/backend together and restart the backend normally; no collection/index/rules change or migration is required. [Owner walkthrough and verification limits](SEAT_BLOCKING_WALKTHROUGH.md).

## 2026-10-14 — Save venue rows before seat generation

In **Venue Settings → Edit**, row letters, capacities and tiers may be changed until numbered seats exist for that venue, even if the competition schedule is already published. Save uses the authenticated backend, preserving its ID, timetable and other venue/event records. Another venue's seats do not block saving. Once any numbered seat exists (including an available seat), a layout change is rejected with **Seat layout cannot be changed because numbered seats already exist for this venue.** Name/image-only changes remain available.

Saving does not regenerate or delete seats. Concurrent backend generation checks its layout snapshot inside each seat-write transaction. Refresh after a stale-edit rejection and review the latest values before retrying. Adding/deleting venues retains existing behavior and permissions. Keep the current Firestore rules; deploy both frontend/backend changes through the normal release process to enable this on the hosted site. [Manual acceptance walkthrough](VENUE_LAYOUT_SAVING_WALKTHROUGH.md).

## 2026-10-14 — Create orchestra sessions independently

In **Orchestra Settings → Add session**, choose an existing venue, pick a date, enter same-day start/end times, set the informational performance-linked quota and save. You do not need a Performer Session first. The new slot is separate from competition drafts/publication and remains free seating; it generates no numbered seats or bookings. Direct public buyers see configured orchestra sessions subject to existing ticket price/eligibility rules. Paid performance-linked groups still use **Orchestra Assignments → Assign & email**, and attendance planning may select the new session as an optional default without granting admission.

The backend rejects invalid dates, reversed/equal/overnight times, duplicate slots and overlaps with timed competition drafts, published competition slots, other orchestra sessions or historical Masterclass sessions in the same venue/day. Adjacent times and different venues/dates are allowed. New and edited sessions retain the existing session ID/date/time format. Informational quota edits preserve active attendance. In-use sessions cannot be moved/deleted; saved paid assignments and legacy numbered inventory protect against stale counters. Clear a planned attendance-group link before deletion or a venue/date change. Payment confirmation, purchased quantities, shared performer allowance, email retry and Ticket Redemption requirements remain unchanged.

The two owner-designated empty production Titan sessions on **15 November, 15:30–17:30 and 19:30–21:30** were backed up and removed after live reference checks. No document or unrelated record was deleted. The eight real draft sessions, eight groups and four archived booking tombstones are unchanged; revision **169 → 170** requires refreshing open planning pages. Production currently has no orchestra definitions; create the actual new ones after the frontend/backend release. The emulator retains the earlier snapshot, including its old orchestra definitions.

Verification passed **254 backend offline audits, 34 frontend tests and three cleanup safeguard tests**, plus lint/syntax and compiler checks. Live readback proves the narrow production deletion, while the new flow was checked with substituted services. Browser, genuine payment/inbox and production feature acceptance remain separate. Source changes are uncommitted and require frontend/backend release together with a normal backend restart. [Manual walkthrough, coverage and cleanup backup](ORCHESTRA_INDEPENDENT_SCHEDULING_WALKTHROUGH.md).

## 2026-10-14 — Old production Seat Occupancy row cleaned up

Removed only the obsolete **Behring Theatre / 14 November 2026 / 08:00–09:00** venue timetable entry in production. There were no generated target seat documents to delete. A private backup, dependency checks, a snapshot-guarded transaction and exact readback confirmed all **eight real draft sessions, eight groups, two orchestra sessions and four archived booking records** were preserved. Only the old time and the event/plan revision counters changed (**168 → 169**); publication, inventory generation and sale eligibility were not changed. Refresh Seat Occupancy to remove the old row, and refresh open planning pages before saving. The local emulator remains the earlier production snapshot. [Cleanup evidence and manual acceptance](audits/PRODUCTION_OBSOLETE_BEHRING_SESSION_CLEANUP_2026-10-14.md).

**Earlier orchestra creation restriction (superseded by the independent timetable above):** Orchestra Settings currently lets staff choose only dates/times already present in the venue timetable. Its backend checks the same requirement. For draft APCS2026, adding a session in Performer Sessions creates a private competition draft, which does not immediately populate those orchestra options. Publishing requires every draft session assigned to a competition group, and orchestra save rejects competition times with assigned performers/active bookings. Do not create a dummy competition session merely to add orchestra attendance. The orchestra schedule is a separate free-seating definition and needs independent date/time controls to remove this current dependency; this cleanup did not implement that change. The existing Titan orchestra definitions on **15 November, 15:30–17:30 and 19:30–21:30** remain intact, but their times are absent from the current venue timetable, so the present form cannot select them for a new/edit save without addressing its restriction.

## 2026-10-14 — Production-data copy available locally

Refreshed local Firestore from a read-only production snapshot: **7,556 documents**, with every path/field verified before and after a successful native export and restart. The emulator is running at `127.0.0.1:8081` with the refreshed everyday startup export and export-on-exit enabled. The prior local database is backed up with matching checksums; its local-only tests and planning edits are outside the new active copy.

No booking/business rules, schema, sale gates or production records were changed. The API and frontend were not started. Auth users, payment-provider state, email and Storage/S3 files were not copied; those integrations keep their existing configuration. Follow the existing integration/background-job guidance before starting the API for purchase tests. [Snapshot and rollback details, full restart verification and compatible CLI runtime](LOCAL_FIRESTORE.md#2026-10-14--production-snapshot-refreshed-and-restart-verified).

## 2026-10-14 — Find a buyer's or registrant's seats in the open layout

In **Seat Occupancy**, open **View Layout** for the required competition venue/date/time. Occupied and locked seats now show the buyer's name below the seat number. Long names use a two-line caption; hover the seat/caption for the full **Buyer** and separate **Registrant** name, status, available email and booking ID. **Buyer not recorded** means the current records do not provide a buyer name; it is not a registrant identity or payment conclusion.

Type a buyer, registrant or ensemble member in **Search registrant or buyer name in this session**. Matching ignores case and extra spaces and requires all typed words. The result table shows matching seat labels, buyers, registrants and statuses. Gold outlines identify those seats in the complete map; other seats are dimmed without moving rows or aisles. Status colors remain unchanged. Clear the field to restore the ordinary view. A no-match result means no loaded occupied seat matches that name in this session.

The dialog searches only current booked/reserved/locked numbered seats in its selected session. Use the existing **Registrant and Reservation Lookup → Load Lookup** below the overview for other sessions, performer assignments without tickets and paid reservations awaiting seat assignment. Names follow current seat-to-booking references; a canceled booking's old saved labels cannot identify a newly available/reallocated seat. Legacy holder metadata is used when there is no matching booking document. If the dialog warns that booking details could not load, reopen it to retry before relying on complete name results.

Caption-sized cells may make wide venue maps require horizontal scrolling; the complete left/right sides and center aisle remain accessible. Locked **seat buttons** retain the existing review/reconciliation action; searching or hovering does not change inventory, payment or admission. Layout opening/closing, session switching and active-event changes clear the search. This change adds only explicit linked-booking reads and local display/search, with no backend release or assignment change. [Owner acceptance steps](SEAT_OCCUPANCY_LAYOUT_WALKTHROUGH.md); source/self-review and lint pass with zero errors/one existing warning, and the running compiler has warnings without errors. Browser verification remains with the owner.

## 2026-10-14 — Identify Presto and Allegro when assigning seats

Open a paid numbered booking in **Public Customers**, expand it and choose **Assign Missing Seats**. Its map now labels **Presto section** in gold and **Allegro section** in blue above the corresponding seats. Available seats use the same section color, and hovering any seat shows its saved ticket tier and status. Existing Lento seats, if present, have a purple labeled section. Sections come from the session's actual seat records; staff should not infer tiers from row letters.

Read the purchased ticket quantities above the map and choose the remaining seats in the matching sections. Selected seats have a dark background with tier-colored text/borders. Booked, reserved and locked seats keep their status colors and cannot be selected. One stage, row numbers and venue aisles remain in place. The total selection limit and paid-only assignment flow are unchanged; the server still checks the combined existing/new seat quantities against each purchased tier before saving.

Save the assignment, review the refreshed booking's seat labels and missing-seat count, then use the existing confirmation resend action when needed. Free-seating orchestra bookings do not receive numbered seats. This display change adds no data entry, query, schema or backend requirement. Other seat-picker pages keep their existing presentation.

Code review/self-review and changed-file lint passed with zero errors/two existing warnings; the existing frontend compiler reports warnings without errors. Browser acceptance remains with the owner. Follow the [staff walkthrough](PUBLIC_CUSTOMERS_SEAT_ASSIGNMENT_WALKTHROUGH.md) for mixed-tier bookings, partial assignments, seat states and both venue layouts.

## 2026-10-14 — Plan orchestra attendance before purchases, then confirm paid assignments

1. Configure the actual orchestra sessions in **Orchestra Settings**. In an editable Admin Page plan, add/edit an **Orchestra Attendance** group with its venue and date. Select **Planned orchestra session (optional)** from the matching sessions, add the registered attendees and choose **Keep on board**, then **Save Changes**. The group and assigned-registration roster display its planned time. No purchase is needed to make this plan.
2. Follow normal competition publication/readiness and buyer payment. Once a registrant has qualifying paid performance-linked purchases, refresh **Orchestra Assignments**. For a new assignment the saved plan preselects the Session dropdown and displays **awaiting confirmation**. Its assigned quantity stays unchanged until staff confirm.
3. Review the paid headcount and session. Override the suggestion if needed, then click **Assign & email**. The saved paid assignment and buyer emails use this confirmed selection. Use **Retry email** for reported delivery failures.
4. On **Ticket Redemption**, verify the paid booking/session and record handover quantities. A planned session alone does not enable orchestra redemption. Purchased orchestra tickets and shared performer places retain their separate allowances. If more tickets are purchased later, update the paid assignment before redeeming the newly covered orchestra bookings.

Planning is optional. Without a valid linked session, choose one manually as before. Staff selection takes precedence, followed by an existing confirmed paid assignment, followed by the plan. An older group with no session link remains usable. A deleted session, mismatched venue/date or ambiguous membership supplies no default and does not disable manual assignment. Updating/removing a plan never automatically changes a confirmed paid assignment, sends emails or grants tickets. Direct orchestra-only buyers already choose their session at checkout and skip this prefill.

The optional session is saved with the same draft revision protection as membership. Changing the group's venue/date/type clears the local session link; selecting no session is valid. Published attendance groups remain read-only alongside their competition plan. This change does not add post-publication planning edits or automatic payment-triggered allocation/email. Existing registrant eligibility, independent performance membership and redemption safeguards remain in force. No records are migrated and existing groups need no new selection unless staff want prefill.

**246 backend offline audits and 8 focused frontend tests passed**, with zero lint errors and one existing unused-function warning. Use the [manual walkthrough](ORCHESTRA_ATTENDANCE_WALKTHROUGH.md#optional-session-prefill--14-october-2026) to verify the owner browser and deployed payment/email/redemption flow. Release frontend/backend together and restart the backend normally; existing unlinked records remain compatible.

## 2026-10-13 — Copyable production Firestore rules

Use the [full merged rules candidate](FIRESTORE_PRODUCTION_MERGED_2026-10-13.rules) for the owner's supplied production baseline. Replace the full console text, retaining a copy of the prior rules; do not append the old unrestricted whitelist catch-all. The candidate preserves original public reads and staff/jury workflows, adds local planning protections/public event reads, and reserves payment receipts, redemption claims/replay keys and scoring email tracking for backend writes. It excludes the local file's anonymous `users` write permission.

Public checkout, paid callbacks, manual-payment actions, orchestra assignment and redemption continue through existing backend operations. Existing direct staff non-manual Mark Paid and terminal-booking deletion permissions are retained to avoid breaking those actions. This means paid records are not fully protected against direct writes by whitelisted clients. A separate backend migration is needed before closing those permissions. Planned timetable/venue/session updates now require their supported backend workflows; unrelated event edits remain available.

**247 synthetic emulator permission checks passed**; no production publication, provider/email test or browser verification was performed. The active local rules file remains unchanged, so a later CLI deploy of that file would overwrite this candidate. Verify the intended database, matching staff email/whitelist entries, frontend/backend release and Firestore indexes separately, then manually check staff/jury login, customer/seat lookup, planning, manual-payment administration, orchestra assignment and redemption. [Full comparison, evidence and acceptance guidance](FIRESTORE_PRODUCTION_RULES_REVIEW_2026-10-13.md).

## 2026-10-13 — Find bookings that need numbered seats

Public Customers shows **Needs seat assignment (N)** in each affected row's Seats column. **N** is the number of missing performance seats for a paid booking. A gold summary above the table counts affected bookings throughout the selected event, including rows on other pages or hidden by search. The summary disappears when its count is zero.

Expand a flagged booking and use **Assign Missing Seats (N)** to open the existing picker, then save the required seats. The row badge, button and picker share the same calculation: non-Masterclass ticket quantity minus saved selected-seat count. Pending/failed/expired bookings, fully assigned bookings and free-seating orchestra orders are not flagged. Labels still show the saved performance-seat names; an absent label alone does not create a missing-seat warning. The badge reflects loaded booking records, while the backend validates current ownership/payment/session/tier before saving. Refresh the page after changes made by another staff member.

Manual acceptance: compare a partially assigned paid row with its expanded button, verify the event total survives searching/paging, complete an assignment and confirm the refreshed count decreases. Also check unpaid, fully assigned, Masterclass-only and free-seating rows have no badge. This refinement adds no Firestore reads/writes or backend behavior. See [the flow guide](SEAT_BOOKING_FLOW.md#2026-10-13--missing-numbered-seats-visible-in-public-customers) for the data rules and verification boundaries.

## 2026-10-13 — Purchase-flow isolation verified after redemption

Ticket Redemption records handover in a separate collection. Buying, prices, payment confirmation, invoices, seat ownership, inventory, confirmation emails, scoring and attendance logic retain their existing paths. Comparison checks show identical winner/public/orchestra purchase outcomes before and after redemption, including Paper.id/manual payments and retries. Staff seat assignment and adding paid purchases to the same orchestra assignment still work.

Redemption staff requests now have a separate 100-request/minute/IP allowance, so busy redemption work does not use up the existing buyer/payment/other-feature request budget. Both limits remain enforced, including for unauthorized staff requests. Restart the backend through the normal workflow to load this repair.

One deliberate admin behavior change remains: a group with active orchestra/performer claims cannot move to another orchestra session or lose redeemed entitlements until staff undo those claims with a reason. This does not prevent buying tickets or updating the same session for additional purchases. The follow-up passed **234 backend audits, 311 frontend unit/logic tests, 3 HTTP checks and 4 source comparisons**, with no browser/live-provider use. [Full isolation review](audits/TICKET_REDEMPTION_ISOLATION_REVIEW_2026-10-13.md).

## 2026-10-13 — Use the separate Ticket Redemption page on event day

Open **Ticketing System → Ticket Redemption**, choose the event and use **Exact Booking ID → Find booking**. Alternatively, search the saved buyer name, email, phone, performance name or ID and open the booking. Use **Search / load more** when the page says more bookings remain; searches examine bounded event-scoped pages. Booking data is loaded only on explicit staff actions.

1. Check the buyer, **confirmed payment** and displayed venue/date/session. Unpaid bookings are visible for review but cannot be redeemed. Reconcile payment in Public Customers if necessary.
2. Choose the appropriate allowance: **Performance tickets**, **Orchestra tickets**, or **Shared performer places**. Performance and orchestra counts are independent. Direct orchestra buyers retain their purchased categories; performance-linked orchestra benefits use their saved assignment and a separate Orchestra tickets count. Orchestra uses free seating, with no numbered-seat selection. An uncovered orchestra benefit says **Awaiting orchestra assignment**: save it through Orchestra Assignments first.
3. Enter only the quantities you are handing over now. For five tickets with two people claiming, record two; three remain for later. Click **Review redemption**, verify buyer/session/categories and click **Record redemption**. Hand over only after recording succeeds. The page then refreshes the claimed/total counts and history.
4. Claim performer places in their shared block, separately from the buyer's purchased tickets. The same group's other bookings show the same remaining performer allowance. A three-person ensemble gets three performer places across all purchases, rather than three for every booking. Public-only groups receive no performer bonus.
5. If the result is uncertain, use **Retry saved claim**, including after refreshing in the same tab. Do not create a fresh claim or issue another set of tickets while that operation is unresolved. A second staff member with stale counts must refresh and review before retrying; the server prevents over-redemption.
6. Correct a mistake with **Undo claim** and a reason. It restores only that claim once; history retains the original, the correction, the recording staff and Jakarta time. Retrying an old claim after it has been undone rejects and asks staff to review the correction. Undo active orchestra/performer claims before moving a group to another orchestra session. Adding purchases to the same assignment does not reset redemption.

The page shows each allowance's latest 20 actions; complete audit and replay records remain stored. Historical paid tickets use their existing quantities/session; this feature does not migrate old bookings or redeem Masterclass passes. Claims record physical ticket handover, independently of seat assignment, RSVP attendance, payment processing, confirmation emails and individual hall entry. Staff handle missing numbered performance seats through the existing assignment workflow.

**Release requirement:** deploy the changed Firestore rules protecting `ticketRedemptions`, release frontend/backend together and restart the backend normally. No customer records, live payments, emails or production settings were changed during implementation. [Acceptance walkthrough and verification evidence](TICKET_REDEMPTION.md).

## 2026-10-13 — Recover the same checkout after refreshing

After an uncertain checkout response, refreshing the page and reselecting its performance no longer erases the saved attempt. Rebuild the same tickets, selected seats/add-ons, contact details and payment mode, then retry; the saved key is reused and the backend returns the original booking/invoice. During invoice preparation the existing retry message retains that key. After a valid successful response the key is cleared; a genuinely different cart creates a new attempt through the existing fingerprint comparison.

Verification: all 39 focused frontend checks pass; changed-file lint has zero errors/warnings. An offline actual page/API/repository probe reproduces one booking/invoice/tier reservation after refresh instead of the original two. The original evidence is preserved beside the new result. This repair preserves the key while buyers rebuild existing form choices; it does not automatically refill the cart. Ticket metadata changes and sales closure during recovery remain separate open cases. [Evidence and manual walkthrough](audits/PUBLIC_CHECKOUT_IDEMPOTENCY_REVIEW_2026-10-13.md#authorized-refresh-recovery-repair). No backend restart is required for this frontend-only change; refresh/reload the updated frontend through its normal workflow.

## 2026-10-13 — Limits of checkout idempotency

An unchanged retry in the same checkout page is protected, including after a response timeout. Real transaction checks also confirmed one booking/invoice/reservation for ten simultaneous requests carrying the same key, followed by safe replay. These provider/email-substituted checks do not certify production delivery/load.

The initial review reproduced lost-key duplicates after reselection and after a ticket display-label change. Same-details reselection is now repaired above; display-metadata changes can still produce a new frontend fingerprint/key. Sales closing before replay can also block access to an existing booking through checkout. Keep the original invoice/booking reference and inspect its state before starting another attempt. [Full review and proof](audits/PUBLIC_CHECKOUT_IDEMPOTENCY_REVIEW_2026-10-13.md). The original recheck added evidence/docs; the later authorized refresh repair is recorded separately above.

## 2026-10-13 — Checkout crash repaired and confirmation status clarified

Checkout now waits up to 90 seconds for invoice creation and the holding email. Timeout/network failures and incomplete responses show recovery guidance without crashing. **Retry with the same details** reuses the saved checkout key and reservation. If the original invoice is still being prepared, the service returns the existing booking with HTTP 202 and a retry message; it sends no holding email containing an empty payment link. Already-paid results go to payment status, while pending manual results continue to payment instructions.

**APCS Email Status** now distinguishes AWAITING PAYMENT for unpaid Paper.id orders, NOT APPLICABLE for unpaid terminal orders, and SENT/FAILED/NOT SENT for paid confirmations. FAILED requires an explicit failed send result; a missing result is NOT SENT. Manual payment-instruction labels remain unchanged, and tooltips distinguish these APCS statuses from Paper.id's invoice delivery.

Verification: the original error reproduction is green; 34 frontend tests and all 209 offline backend audits pass. Lint has zero errors/four existing warnings, and the existing dev compiler has no compilation errors. The backend needs its normal restart to load the invoice-in-progress guard; frontend changes are present in the running compilation. No live purchase/payment, browser, email send or database mutation was used for this repair. The existing canceled test invoice remains canceled. [Full evidence and manual walkthrough](audits/PUBLIC_CHECKOUT_RESPONSE_DIAGNOSIS_2026-10-13.md#authorized-repair-after-the-owners-follow-up).

## 2026-10-13 — Invoice delivered while checkout page reports an error

Receiving Paper.id's invoice/WhatsApp request and APCS's temporary reservation email proves that booking/invoice creation reached those delivery steps, not that payment completed. For the owner's documented test, invoice creation took about 53 seconds and the holding email completed at about 58 seconds, beyond the frontend's 30-second timeout. A missing-response transport error is swallowed by the API wrapper and then produces `Cannot destructure property 'bookingId' of 'res.data' as it is undefined.` The page cannot navigate despite a backend booking/invoice. This defect is reproduced and recorded, with application behavior unchanged by the diagnostic request. Keep the same checkout details/idempotency key when recovering an uncertain result; do not create another booking or release its hold blindly.

**Email Status** currently tracks the paid-confirmation `emailSent` flag for Paper.id bookings, not these unpaid payment-request emails. An unset flag and a failed confirmation both display PENDING/FAILED. The checkout-page error does not set that flag or determine provider payment. The recorded booking has no paid callback receipt; its invoice was later canceled by the service and F5/capacity reopened.

Offline actual-controller checks confirm both staging `data.invoice.total_amount` and production `invoice.amount` on both webhook routes, processed receipts/PAID seats, one confirmation across duplicate delivery, and incorrect-total rejection. The focused suite passes 100/100; this is payload-format coverage, not a production delivery/authenticity certification. See the [full diagnosis, original screenshots, saved callback examples and owner acceptance steps](audits/PUBLIC_CHECKOUT_RESPONSE_DIAGNOSIS_2026-10-13.md).

## 2026-10-12 — Preserve local paid-test data before shutdown

A confirmed local test purchase can disappear after restarting an emulator whose latest data was never successfully exported. Friday's paid-test email matched backend logs; Saturday export-on-exit attempted to run but encountered `write EIO`, and Monday imported the unchanged Friday-noon export. This is strong evidence of a local persistence failure. Production Firestore does not use this local import/export lifecycle. Before stopping local paid testing, verify an explicit backup export completed and keep the previous good copy. Current normal-flow paid cleanup/deletion guards passed focused offline checks, but checked-in rules permit privileged direct booking deletion and deployed production rules were not verified. [Full read-only investigation](audits/LOCAL_BOOKING_PERSISTENCE_2026-10-12.md). No booking or payment was restored or changed.

## 2026-10-11 — Attendance chips during session assignment

Admin Page displays green Attending, red Not attending and gray Not imported chips on performance registrants, Overview rows and orchestra members/options. Choose a status from All attendance statuses to filter displayed registrants, including loaded APCS2025 guests. Overview shares that selection for Registrants; its teacher listing stays complete. Selected orchestra members remain visible in editable selectors regardless of the filter, while the assigned roster combines status with search.

Filtering does not change membership, saved order, group totals, video totals, awards or ticketing rules. Hidden members stay in Save Changes. Reload after importing confirmations to fetch the current flags. Missing data is separate from a confirmed false value; false neither cancels tickets nor automatically removes an assigned performer. [Manual acceptance](SESSION_ATTENDANCE_WALKTHROUGH.md).

## 2026-10-11 — Import winner venue confirmations

Use **Registrant Dashboard → Import Attendance** to preview and save the confirmation CSV/Excel. The importer matches original performer/full-ensemble names across APCS2025/APCS2026, lets staff manually link or exclude unresolved rows, and adds one `willAttend` boolean to each matched registration. Hadir/Yes (including notes) means attending; imported negative, blank or unclear text means not attending. The flag describes the current venue-confirmation campaign; an older guest's source event ID is preserved.

This confirmation is distinct from orchestra attendance membership, paid-ticket headcount, admission and check-in. It does not change ticket availability, assigned sessions, booking/payment status, seats, awards or orchestra entitlements; false does not cancel an existing booking. Check payments/assignments through their normal workflows. [Complete import instructions, CLI and owner acceptance steps](REGISTRANT_ATTENDANCE_IMPORT.md).

## 2026-10-10 — Add APCS2025 guests to APCS2026 groups

In an editable APCS2026 planning board, open **Other Event Registrants**, choose **APCS 2025**, and click **Load registrants**. The source list includes old records without eventId, treating them as APCS2025; it also includes records without createdAt, video or duration. Search by performer/teacher and filter by category. Drag a guest into a performance group. For orchestra attendance, load the source first and use the existing group's searchable attendee selector; its options show the source event. A registration can join one group of each type.

Click **Save Changes** and reopen to confirm membership. Saved guests load automatically by their original registration IDs. Source records stay in APCS2025; current-event registration totals and teacher statistics do not include the source list. Missing duration says **Unknown**, and no video upload is required for grouping. The existing FAIL exclusion still applies to new candidates.

After normal preview, publication, seat generation and readiness, a guest with an eligible award and a published performance is available through APCS2026 ticket discovery. Publication attaches a backend-derived sourceEventId; checkout checks it against the actual record and rechecks inside its transaction. Older achievement can supply the award when finalAward is absent. No award means no ticket eligibility. Daily winner-tier, seat, price and payment requirements continue to apply.

An orchestra-only guest has no competition purchase path. Adding attendance to a guest who also performs preserves their performance purchase path, and never creates admission or a paid orchestra assignment by itself. Seat Occupancy's Load Lookup resolves assigned guest names by ID. Published plans stay read-only; this feature does not transfer records or migrate published assignments. Deploy/release the frontend and backend together, with the normal backend restart. [Owner walkthrough](GUEST_REGISTRANTS_WALKTHROUGH.md).

**Ticketing parity verified (10 October):** An APCS2025 guest whose APCS2026 performance is published and ready follows the same purchase rules as an APCS2026 registrant with the same award, roster and choices. A direct production-code comparison exercised 32 scenarios: solo/ensemble, winner/public buyer, Paper.id/manual settlement, and native/explicit APCS2025/missing-event/legacy-achievement source records. Prices, invoice items, pending locks, booked ownership, payment replay, orchestra performer/ticket counts, idempotent orchestra assignment and generated email details matched. Source documents remained unchanged. A separate regression verifies identical daily winner-tier restrictions and public purchase availability. The complete offline suite passed **183/183 checks**; provider services and Firestore were substituted. This confirms code behavior, while browser, live database and genuine payment acceptance remain separate.


**Assignment preservation verified (10 October):** Adding a guest intentionally updates the destination draft's membership/revision. It uses original registration IDs and never writes the guest's source registration, source event, results, historical bookings, historical numbered seats or historical paid orchestra assignment. A focused production-repository regression adds a guest beside existing members, moves them between performance groups, removes attendance independently and publishes; existing native members and draft slots remain intact. Stale-revision and duplicate-membership saves reject atomically without changing any record. The complete offline suite now passes **184/184 checks**. This verifies the tested code paths; browser/live Firestore acceptance remains separate.


## 2026-10-09 — Booking logo and important confirmation details

The ticket-booking header now displays the same APCS logo as Home's navbar. Step 4's winner Orchestra row reads **Free Seating · Redeem your orchestra ticket at the venue.** Competition venue/date/time still comes from the selected performance's existing assignment.

Payment confirmations show a highlighted, bold **Important:** notice asking buyers to present the email or Booking ID at the venue entrance for staff verification. When a performance-linked booking is not yet covered by an orchestra assignment, its email displays:

**Orchestra & Awarding Seating**

**Seating**: Free Seating · Redeem your orchestra ticket at the venue.

The orchestra and awarding session assignments, including the venue, date, and time, will be sent by email on **19 October 2026**.

This announcement preserves the existing staff assignment/email process; it does not schedule automatic delivery. Confirmation resends for a covered booking continue to show the saved orchestra session, and direct orchestra bookings continue to show their purchased session and category instructions.

Owner walkthrough: compare Home and booking logos at desktop/mobile widths; inspect the winner's Review & Pay orchestra row; inspect the confirmation notice and bold heading, Seating label and date. Check a covered assignment and direct orchestra confirmation as controls. Browser and inbox appearance remain for owner verification; implementation sent no email.

## 2026-10-09 — Public booking award labels and buyer tabs

Sapphire performers display **Diamond** on booking-page selection cards and the winner review summary, with Diamond badge styling. The stored result and internal eligibility remain Sapphire. To permit those winners to buy, staff must still include **Sapphire** in Ticket Settings' Eligibility Schedule; selecting only Diamond does not open Sapphire eligibility.

The page uses today's saved eligibility entries in Asia/Jakarta to show buyer tabs:

| Today's allowed tiers | Visible tabs |
| --- | --- |
| Public only | Public Buyer only |
| Any winner tier(s), without Public | Registered Winner only |
| Public plus winner tier(s) | Both |
| Eligibility disabled or absent | Both |
| Enabled, no matching date or no allowed buyer tiers | Neither; sales-closed message |

Winner tiers are Sapphire, Diamond, Gold and Silver. Same-day entries combine. The sole available path is selected automatically through the existing reset behavior; customers do not enter a new performance schedule. The page waits for settings before showing purchase paths and displays a refresh error if settings cannot be verified. Only the allowed active performance list is fetched. Public buyers continue choosing an assigned performance or orchestra session; winner discovery/checkout still uses actual saved awards. This changes presentation only, not eligibility configuration or backend enforcement.

Manual walkthrough: reload under Public-only, winner-only, mixed, disabled and closed settings; verify tabs and active path, then verify Sapphire-as-Diamond in selection and review alongside ordinary Diamond/Gold/Silver cards. Check a settings-read failure. Browser acceptance remains with the owner; no settings or production records were changed during implementation.

## 2026-10-09 — Confirmation email total spacing

Newly generated ticket confirmation emails include explicit spacing after **Total Paid** before the amount (for example, **Total Paid Rp 829.000**). The label has a nonbreaking space and inline right padding so it remains separated without flex layout. This is a template-only presentation change; totals and payment/delivery behavior remain unchanged. Backend/template checks passed; no email was sent, and inbox rendering remains for owner verification.

## 2026-10-09 — Search Public Customers

Use the search field above **Public Customers → Public Ticket Bookings** to find a reservation by buyer name, saved performer/ensemble name, email, phone, booking ID or registration ID. Search covers all loaded bookings for the selected event before pagination, ignores case/repeated spaces and matches every typed word. Clearing it restores the full list; typing resets to page one, and selecting another event clears search and pagination. An unmatched query displays **No bookings match your search**.

Search uses existing booking fields, including both current `buyerName` and legacy `userName`; performer names come from the booking's saved `registrantName`. It adds no database requests and changes no payment, email, seat-assignment or cancellation behavior. Expand a matching row to inspect the existing order details and actions. Owner walkthrough: try buyer and performer names, mixed case/spaces, contact/ID searches, no matches, clear, pagination reset and another event. Browser verification remains pending owner acceptance.

## 2026-10-09 — Find registrants and public reservations on event day

For names already holding numbered seats in a specific session, **View Layout** offers buyer captions and its own name search. Continue using **Load Lookup** for event-wide assignment/reservation discovery and bookings awaiting numbered seats.

In **Seat Occupancy**, use **Registrant and Reservation Lookup → Load Lookup**. Type a performer/ensemble member or reservation name to find matching competition sessions across the active event. Registration contact/teacher names and registration/booking IDs also match. The paginated table shows performer, buyer, venue, date, time, numbered seats, record type, payment/assignment status and reference ID. Search is case-insensitive, handles extra spaces and resets to page one. Clear the input to restore the complete loaded roster.

**Performer assignment** means the performer has a session; staff must still verify admission/payment separately. **Public reservation** and **Winner reservation** show individual bookings and saved payment status. Several buyers for the same performer remain separate reservations. Current seat ownership supplies labels, including pending locks; old saved labels do not prove a seat remains assigned. A paid booking without matching seats says **Awaiting seat assignment**: use Public Customers' existing assignment flow. A failed/expired booking is not paid admission even if it still has an unresolved lock. Legacy seat holders can be found by saved holder names. Archived test bookings and free-seating orchestra sessions are outside this lookup; use Orchestra Settings/Assignments for orchestra headcounts.

Use **Refresh Lookup** after a payment, seat assignment or cancellation. The inventory overview's **Refresh Data** is separate. Lookup data is a snapshot, loaded explicitly through active-event/session queries in pages of 200; typing does not reread Firestore. Event changes clear it, and a failed refresh reports an error without showing a partial roster. The feature changes no booking, payment, admission, seat-release rule or Firestore schema.

Owner walkthrough: search a performer, an ensemble member and a public buyer; compare session and seat details with the layout/Public Customers; check pending and paid-unassigned rows, multiple reservations, no matches, clear/page reset, refresh and event switching. Browser UI acceptance remains pending owner verification.

## 2026-10-09 — Public Customers seat labels corrected

The main Seats column now reads `publicBookings.performanceSeatLabels`, matching the expanded Performance details. It previously split `selectedSeatIds` at the first underscore, which displayed the venue-ID prefix (`Venue`) instead of A9/E10. Checkout already saves canonical labels from the selected seat records; protected staff assignment appends the assigned labels to the same field. Seat IDs remain unchanged for ownership/assignment checks, and no new Firestore query, schema or migration is required. Missing/empty label arrays display `-` rather than an inferred seat.

Verification: the actual column renderer failed before the repair (`Venue, Venue`) and now passes A9/E10, E9/E8, empty and missing-label cases. JSX parsing and diff consistency pass; ESLint reports zero errors with two existing warnings (unused orderBy and the fetchCustomers hook dependency). The running localhost:3000 JavaScript bundle includes the corrected column with no module build failure found. Browser rendering was not verified; refresh Public Customers and compare the main Seats column to expanded Performance details. Self-review passed for the changed field, renderer and conditional branches. No payment logic, records, notifications or backend processes were changed.

## 2026-10-09 — Direct orchestra checkout uses its own timetable

Repaired both availability guards in `PublicTicketRepository.createPublicTicketBooking`. Before checkout and again inside its transaction, an orchestra purchase must match venue/date/time in `events.orchestraSessions` and reference an existing venue. It no longer requires the orchestra time in the competition `venues[].sessions` timetable. Competition purchases retain their timetable, publication/readiness, assignment, capacity and numbered-seat ownership checks. The transaction still rejects a removed/replaced orchestra session or deleted venue; unknown dates/times and competition-only slots cannot be purchased as orchestra tickets.

No schedule migration or new schema is needed. Keep orchestra times in `orchestraSessions`; do not copy them into competition sessions as a checkout workaround. Orchestra admission remains free seating with staff-managed capacity, existing reservation counters, and no numbered-seat selection or add-ons. Paid records, receipts and confirmation status use the existing public booking/payment flow.

The post-repair competition regression also passed all 12 copied Titan/Behring sessions × two tiers: each pair accepted one buyer, rejected the duplicate and confirmed the owned chair after payment. The admission-policy control passed separately. The prior 48-request burst timeout and callback/ngrok findings remain outside this repair. Self-review and backend/test syntax checks passed; changes remain uncommitted.

Verification: all 176 offline audit checks pass. A separate disposable Firestore emulator verified both 15:30–17:30 and 19:30–21:30 purchases, PAID transitions, processed receipts, one substituted confirmation per booking and zero numbered-chair locks. Provider/email services were substituted; this is not a new genuine Paper.id staging/browser result. The owner's database and API process were not changed. Restart the running backend through the owner's normal workflow to load the source repair. See [repair evidence and remaining limits](audits/TICKETING_ORCHESTRA_SEAT_DIAGNOSIS_2026-10-09.md#authorized-repair-and-regression-results).

## 2026-10-09 — Direct orchestra root cause and numbered-seat scope validation

Both current Titan orchestra slots fail directly at localhost:8080 with HTTP 500 before invoice/notification creation; ngrok is excluded. UI reads orchestraSessions, but repository guards at lines 293 and 512 require competition venues[].sessions. An isolated counterfactual confirms the wrong guard; no application/schema repair or timetable workaround was applied to the current database.

Current local inventory matches all 12 configured competition scopes (eight Behring × 80, four Titan × 187). Actual-repository tests in a separate emulator passed two-buyer locking and confirmation for all 24 session/tier combinations, with wrong-venue rejection and six concurrency controls. A 48-request burst hit transaction lock timeouts; peak-load reliability is not certified. No live emails/invoices in the isolated tests; direct requests used only the owner's test contact and created no booking. Temporary emulator stopped; owner's API left alone. See [diagnosis and evidence](audits/TICKETING_ORCHESTRA_SEAT_DIAGNOSIS_2026-10-09.md).

## 2026-10-09 — Callback retest: paid records and staff assignments verified

After the owner reconnected Paper.id staging, three synthetic competition invoices reached PAID through genuine automatic callbacks with matching amounts, processed receipts and test-only confirmation emails. Public Customers shows PAID/SENT; actual staff assignments persisted E10 and E9/E8, while selected A9 confirmed automatically. Seat Occupancy and Firestore agree: 80 total, 75 available, 1 locked, 4 booked. An unchanged genuine callback replayed through both routes produced no additional email or fulfillment. Original customer, seat, booking, assignment and event records are unchanged; local active event restored to APCS2026.

Full sales acceptance still fails: direct orchestra session validation rejects checkout; main-table seat labels show Venue; callback authenticity retains its earlier audit failure; the invoice paid during the outage remains pending/locked with no receipt. Browser payment success works through loopback; the restored ngrok API returns an HTML warning to browser requests and polling stays Waiting. Corrected two incomplete URL quotes in local frontend config; no ticketing business logic was repaired. The local API remains test-only with customer notification jobs disabled. Seven backend emails across both phases were SMTP-accepted only for the test mailbox; inbox/WhatsApp remain unverified. See [updated report and screenshots](audits/TICKETING_WEB_STAGING_TEST_2026-10-09.md).

## 2026-10-09 — Staging purchase rehearsal: not accepted for sales

A real browser purchase produced the correct Rp829,000 Presto/add-on invoice and pending customer record, with A10 locked in Seat Occupancy. Real API checkouts produced Rp529,000 public and Rp1,058,000 winner invoices without selected seats. The tests used only the authorized test contact and synthetic local event, with customer notification jobs disabled and all original customer documents preserved.

Staff must not consider a Paper.id payment locally recorded until the public booking is PAID and its receipt is processed. The staging simulator marked the first invoice paid in Paper.id, but the stale callback tunnel left APCS pending and the seat locked; confirmation was not sent. A replacement tunnel requires explicit approval after automatic-review rejection. Direct orchestra purchase currently errors for configured orchestra times absent from the competition session array. Public Customers' main seat label is also incorrect for current IDs; expanded A10 details are correct. The existing unsigned-callback safety test still fails (23/24 transaction checks; 170 offline checks pass). Do not use Mark Paid as evidence of provider reconciliation. Full findings, pending acceptance, reproduction and screenshots: [9 October browser/staging report](audits/TICKETING_WEB_STAGING_TEST_2026-10-09.md).

## 2026-10-09 — Local publication preview conflict cleared

The old Behring November 14 08:00–09:00 venue timetable entry duplicated Group 1's private draft time. With owner approval, that unused local timetable entry was backed up and removed after checking assignments, active bookings, seats/capacity/ownership and special sessions. Your draft sessions, groups and links remain intact; the real publication preview now passes with no errors. Refresh Admin Page and choose **Validate and preview** again before proceeding with publication and readiness. This cleanup does not publish or open sales. [Local cleanup evidence and backup](LOCAL_FIRESTORE.md#2026-10-09--removed-obsolete-local-venue-timetable-entry).

## 2026-10-09 — Separate orchestra attendance table on the Admin Page

In each orchestra group, type a performer or teacher name directly into the attendee selector to assign registrations. Matching is case-insensitive, trims spaces and includes ensemble members using the existing board matcher. Registrants assigned to another orchestra group remain visible as disabled options labeled **Already assigned: [group]**. Below the group editors, **Assigned Registrants** lists each registration with teacher, performance group and orchestra group/venue/date, plus a clearable search and pagination. Its search filters individual roster rows only; all group editors, memberships and counts remain intact. Search is available in draft and published views and resets when switching events. The roster reflects current board edits; save to persist them.

The internal attendance table uses the same simple white-card styling, light borders and default Ant Design controls as the performance panels, with concise helper text. The owner approved this page-specific exception to APCS branding.

Use **Add performance group** for the upper board and **Add orchestra group** in the lower **Orchestra Attendance** table. Attendance rows show group, venue, date, registration count and a searchable attendee selector; the optional planned-session time was added on 14 October. The selector includes eligible registered children who already have a performance group, shows their current performance group and teacher, and shows children assigned to another attendance group as disabled options labeled with that group. Existing stored members remain visible, including missing-record placeholders, so membership is not silently deleted.

A child can have one performance assignment and one attendance assignment. The left pool and assigned count refer only to performances. Adding/removing an attendee never moves their performance; deleting a group affects only its own membership. **Save Changes** saves both sections, **Discard** restores both, and **Clear All** clears both with an explicit confirmation. Published plans remain read-only. Group-type conversion is available in draft and rejects membership conflicts within the destination type.

Attendance groups stay outside ticketable performance lists. A child in both sections remains listed by their performance group after publication/readiness and can buy under the normal eligibility rules. Only children without a performance assignment are classified as attendance-only and excluded. Membership does not itself issue free admission or tickets. The optional planned session now supplies a default to paid Orchestra Assignments, while confirmation and admission remain separate.

Follow [the manual walkthrough](ORCHESTRA_ATTENDANCE_WALKTHROUGH.md). Deploy/restart the updated frontend and backend together through the normal approved workflow; existing published projections are not automatically migrated.
## 2026-10-09 — Local sessions available for all 12 planning groups

The [local seed utility](LOCAL_FIRESTORE.md#seed-performer-sessions-from-saved-local-groups) has been executed for local APCS2026: 11 missing draft sessions were created alongside the existing Behring 08:00–09:00 session, giving 12 total. They match saved competition group venues/dates; all 11 pending times were subsequently filled with one-hour sample ranges (08:00–09:00, 10:00–11:00, etc.), independently per venue/date without overlaps. Existing groups remain unassigned. The utility skips orchestra attendance groups, preserves existing timed slots and keeps draft revisions synchronized; any linked group time caches are updated together. Repeat execution creates no duplicates or time changes. It saves a private backup and refuses production access.

Refresh **Performer Sessions**, review or edit the sample times, then refresh **Admin Page**, edit each competition group, select an unused matching **Performer session**, and **Save**. Confirm **Used in Admin Page** markers after saving. Same-venue/date sessions now have distinct time ranges in the dropdown. Group 5 has a September 14 saved date despite its November 14 label; adjust both the group and unlinked slot if that is a typo. Groups 7 and 12 have no registrants; populate or remove them and unused slots before publication. Session creation alone does not publish, generate seats or open sales; complete the normal validation and readiness steps separately. Changes currently exist only in the running local emulator and need its normal shutdown export for persistence.

## 2026-10-07 — Production-data copy for local ticketing simulation

Refreshed the running `127.0.0.1:8081` Firestore emulator with **7,560 production documents** and saved the verified database in the everyday emulator startup directory. Every copied document and field matched the traversal snapshot, with no additional local records. Both earlier local copies remain backed up. Production data and ticketing business rules were not modified; sale gates and inventory were imported exactly as stored.

The emulator-connected API is **paused** because its background tasks may cancel provider invoices or send email using real copied records. It also predates the latest repair implementation. Loading Firestore data does not reload API code or sandbox Auth, Paper.id, email or S3. Before testing purchases, prepare the current API with appropriate background-job and external-service isolation. No purchase, payment, email or UI acceptance test was run for this refresh. See [local refresh details](LOCAL_FIRESTORE.md#2026-10-07--production-snapshot-refreshed).


## 2026-10-07 — Repair batch implemented: what staff will see

The selected repairs from the [plan](TICKETING_REPAIR_PLAN_2026-10-07.md) are implemented in local code. Follow the [manual walkthrough](TICKETING_REPAIR_WALKTHROUGH_2026-10-07.md) before relying on them. Deploy the backend, frontend and `apcs_web/firestore.rules` together. **Sales are still not certified ready**; the deferred findings below remain.

- **Payment received but not yet applied.** Public Customers shows **Paid callback received — reconciling** while the system retries automatically (at startup and every 2 minutes). It shows **Payment received — needs review (reason)** when automation stops, for example an invoice ID that does not belong to the booking, a wrong amount, or a payment for a booking that was already cancelled or released. For review cases, check the invoice in Paper.id and reconcile manually; never release the booking's seats on a timer. Receipts are stored in `ticketPaymentReceipts`.
- **Lost invoice response.** A failed booking whose inventory is still held becomes PAID automatically only after Paper.id's invoice API confirms the payment. If no paid callback ever arrives, reconcile it with Paper.id as before.
- **Generate numbered seats** now runs on the server. Locked, booked and assigned chairs are kept as they are. If a run reports an error under heavy activity, run it again.
- **Assign Missing Seats** (Public Customers) now runs on the server in one protected step. The same payment, session, tier, quantity and duplicate-chair checks apply.
- **Orchestra attendance groups.** On the Admin Page, edit a group and set **Group type → Orchestra attendance**. Keep its venue and date; it cannot link a performer session. As refined on 9 October, attendance appears in its own lower table. Members with a competition group remain in public and winner performance lists; only attendance-only members are excluded. This does **not** give them tickets, admission, an orchestra session or quota. Set the type before publishing; published groups are read-only. Public buyers still buy orchestra tickets by choosing a session and quantities.
- **Orchestra capacity is managed by staff.** Orchestra Settings' performance quota is informational. Assignments and direct orchestra sales are no longer blocked by the quota or by the competition seat layout, so values such as 9999 can be saved. Arrange enough physical seating yourself; the system does not guarantee a group fits. Competition seating limits are unchanged.
- **Still deferred:** callback authenticity, the unprotected global-settings write route, shared-IP rate limiting, slow-checkout UI recovery, stale price/eligibility reads, provider URL handling, legacy paid-capacity accounting, the Paper.id client-side Mark Paid path, and production opening configuration.

## 2026-10-07 — Requested repair batch and attendance-only groups

Use the [final agent prompt](TICKETING_REPAIR_PROMPT_2026-10-07.md) together with the detailed handoff for the next implementation session. It includes the final staff-managed orchestra capacity decision and all earlier selected fixes, without representing them as already implemented.

The owner subsequently clarified that orchestra seating may exceed the numbered competition layout and chose **no system orchestra capacity ceiling; staff manage admission manually**. Current software still couples them; the requested change is recorded in the [handoff](TICKETING_REPAIR_HANDOFF_2026-10-07.md#subsequent-clarification-orchestra-capacity-differs-from-competition-layout). Preserve competition limits, payment validation and accurate headcounts. The existing performance quota is a separate setting; the next plan must state whether it remains a guard with the owner's proposed allowance of 9999. This decision is not a completed configuration or code change.

See the [owner-selected repair handoff](TICKETING_REPAIR_HANDOFF_2026-10-07.md). The next implementation batch covers three payment-recording/recovery failures, overlapping seat regeneration, paid unselected-seat assignment, and a new **Orchestra attendance** classification on the Admin Page's groups. The classification must hide member names from ticketable performance choices while preserving direct public orchestra sales without a registrant selector.

The owner confirmed **classify and hide only; admission is handled separately**. Marking a group will not itself grant tickets, reserve capacity or allocate an orchestra session. This is requested behavior, not a feature currently available to staff. Legacy capacity work is excluded, and the existing sold-orchestra quota guarantee remains deferred. The audit's other findings remain documented; no application repair or production deletion was performed in this handoff.


## 2026-10-07 — Emulator and Paper.id staging follow-up

The [readiness audit](TICKETING_READINESS_AUDIT_2026-10-07.md#follow-up-real-emulator-transactions-and-paperid-staging) now includes real local Firestore transactions: **13 passing safety assertions and 7 failures**. Main checkout prevented concurrent chair/alias/capacity overselling in the clean run; confirmed expiry released once and payment winning the cancellation race retained booked inventory. The failures reproduced early/failed/lost-response payment recovery gaps, unsigned callback acceptance, stale seat regeneration, unsupported Web SDK staff assignment, and insufficient orchestra quota after payment. These findings remain unrepaired.

Three authorized synthetic purchases—public performance, winner and public orchestra—created real Paper.id staging invoices, were paid through its simulator, delivered genuine callbacks through ngrok, and persisted PAID with payment receipts. Provider invoice reads independently confirmed paid status, and the owner confirmed invoice/confirmation email receipt. Two checkouts took 45.489 and 30.759 seconds, exceeding the frontend's 30-second timeout. Local shared-IP polling also reproduced HTTP 429; the protected staff payment endpoint rejected a missing token with HTTP 401. This verifies specific happy paths and failure paths; production load, indexes/rules, live staff authorization and browser UX remain acceptance work.

Testing used disposable QA fixtures, not production writes. The original saved snapshot is unchanged; port 8081 currently contains only the synthetic QA event for owner review, with private records backed up under ignored `.local/ticketing-qa-20261007/`. The separate port-8082 audit emulator is stopped. Existing frontend edits/dependencies were preserved, including a local `e3` startup error and incomplete dependency tree. See [reproduction instructions](audits/TICKETING_EMULATOR_AUDIT.md) and the detailed audit before opening sales. The earlier read-only audit section below describes the first phase; its no-data/provider-action boundary does not describe this authorized staging follow-up.

## 2026-10-07 — Do not open sales until readiness findings are resolved

See the [current launch readiness audit](TICKETING_READINESS_AUDIT_2026-10-07.md). Live production GET responses show APCS2026 in draft, empty public/winner lists and an enabled eligibility schedule containing only October 3. Orchestra sessions appear as purchase options but lack matching venue times in the returned configuration. Do not remove sale guards to make the page available; publish, generate and verify competition inventory, mark ready, reconcile orchestra times, and configure approved sale dates.

Opening those gates alone does not resolve the audit's P1 findings: callbacks acknowledged without recorded/recoverable payment, the early-invoice callback race, unknown invoice outcomes, unauthenticated callback/settings routes, stale seat-generation writes, unsupported staff assignment queries, capacity bypass by legacy seat writers, and unguaranteed orchestra attendance after payment. Slow email/checkout timeouts also need reserved-booking recovery. The current safeguards reject conflicting ownership and insufficient assignment quota, but cannot yet establish that every paid customer will receive every sold benefit.

Initial read-only phase: 153 existing offline checks passed; 11 diagnostic probes demonstrated additional incomplete/unsafe behaviors. That phase triggered no checkout, payment, cancellation, email or data mutation; the authorized local/staging follow-up is recorded above. No deployment or browser action occurred. Findings remain open; use the detailed audit and owner manual acceptance checklist before launch.

## 2026-10-05 — White background for public venue maps

- PublicTicketBookingPage renders the venue floor-plan image on white with a light border, making dark labels in transparent SVGs readable. Surrounding ticketing panels retain their dark theme; booking logic is unchanged.
- Verification: code self-review and ESLint. Manual walkthrough: select a competition session with a venue map and confirm its row labels are readable against white on desktop and mobile.


## 2026-10-05 — Venue image save correction

- Venue Settings image/name-only edits now call `POST /venue-settings/:eventId/:venueId/metadata` with a current Firebase ID token. Whitelist authentication is required. This avoids the browser Firestore rule that protects the whole `venues` array for planning events.
- The backend transaction reads the latest event and changes only the selected venue's label and HTTPS image URL. Sessions, seat configuration, extra venue fields, other venues and schedule state are preserved. Stale label/image edits are rejected with a refresh message.
- Upload completion is required before saving; download-URL errors are caught and specific save failures are displayed. SVG files continue through the existing Firebase Storage upload path; no Storage permissions were changed.
- Scope: image/name-only edits to existing venues. Adding/deleting venues or changing seat capacity retains the existing protected flow; this endpoint does not bypass those safeguards.
- Offline verification: metadata transaction regression tests and frontend lint. Manual acceptance: edit Behring, upload `Behring-01.svg`, wait for upload success, save, then reopen and confirm the new image and unchanged seat rows/sessions. Frontend and backend must both include this change. Browser, deployed Storage rules and production acceptance remain unverified.


## 2026-10-04 — Local duplicate venue-time cleanup

- At the owner's request, removed only Behring Theatre (`Venue_lnssq2n1`) / `2026-11-14` / `08:00-09:00` from the local emulator's `events/APCS2026.venues[].sessions`. The identical linked draft slot remains intact. No production data was changed.
- Draft-mode Performer Sessions displays plan `draftSlots`, while publication also validates existing event venue times. An older entry in that separate projection can therefore block a draft without appearing as a second row. Do not ignore this guard globally; investigate the specific stored entry before cleanup.
- Saved the previous venue configuration to `/private/tmp/apcs2026-duplicate-venue-time-backup-20261004.json`. Transaction checked the draft state and unchanged venue configuration before deletion. Readback confirmed removal and unchanged draft slots; the actual publication preview at revision 51 returned `canPublish: true` with no errors. The schedule was not published.

## 2026-10-04 — Visible group assigned times

- Admin Page group headers show a dedicated gold **Assigned time: HH:mm-HH:mm** badge below the heading, including collapsed groups whose videos fit within the session. Groups without a time show **Time not assigned**. Video totals and overrun warnings remain separate.
- The badge uses the board's existing `session.time`, resolved from the linked planning slot (or the legacy event timeslot). It reflects current board edits; use Save to persist them. No new data reads, writes or schema changes. Headers and video metadata wrap when space is limited.
- Manual walkthrough: check the saved second group shows **Assigned time: 09:00-10:00** without an overrun warning; check the first and third retain their time badges and overrun warnings; check a group without a final time shows **Time not assigned**. Edit its linked session, keep it on the board, save and reopen to confirm the badge reflects the saved time.

## 2026-10-04 — Performer session usage markers

- Performer Sessions shows a gold **Used in Admin Page** marker with the linked group label for draft and published planning sessions. A linked draft counts as used even before performers are assigned. Legacy sessions show the saved registration count; empty assignments are **Unused**. Seat generation remains a separate status.
- Usage comes from the existing event planning state or the event-scoped assignment API used by AdminContent's SessionAssignmentManager. Unsaved Admin Page edits are reflected after saving and reopening Performer Sessions. Failed reads show **Usage unavailable**, rather than incorrectly marking sessions unused. No schema or write-path changes.
- Manual walkthrough: save a linked group on Admin Page, reopen Performer Sessions and check its gold marker and label; check an unlinked draft shows Unused. For published sessions verify both usage and seat-generation labels. For legacy events save an assignment and verify its registration count. Browser verification remains with the owner.

Updated for the owner-confirmed business process on **28 September 2026**, including public performance seat selection, public performance selection and optional PayNow/bank-transfer checkout. Implementation is local; deployment and owner UI acceptance are separate.

## Ticketing System menu

| Page | Staff responsibility |
| --- | --- |
| System Settings | Choose the active event and maintain sale eligibility |
| Venue Settings | Maintain venue labels (for example Behring Theatre or Titan Theatre), images and tier capacity |
| Performer Sessions | Create and edit private draft sessions for planning events; maintain legacy event times |
| Ticket Settings | Set ticket prices and remaining competition add-ons; Masterclass and orchestra seat-selection products are hidden and cannot be newly added |
| Orchestra Settings | Configure orchestra venue/date/time and an informational performance-linked quota; view session headcounts (staff manage actual capacity) |
| Orchestra Assignments | Assign paid public/winner performance groups to orchestra sessions and send/retry assignment emails |
| Seat Occupancy | Inspect numbered competition seats, block/unblock unused chairs for one session with a reason, search performer/reservation names, and reconcile linked locked competition bookings; historical orchestra seat rows are hidden |
| Admin Page | Drag performers into draft groups, mark groups as Competition performance or Orchestra attendance, link competition groups to draft sessions, publish, and finalize competition sessions; retain legacy assignment tools |

Masterclass Settings and Masterclass Assignments are removed from this menu. Public Customers remains a separate main-menu page for booking status, paid competition seat assignment, manual-payment confirmation/cancellation, payment-instruction resend and confirmation resend.

## Setup

1. Select the correct event in System Settings.
2. Check venue labels carefully: these names appear in buyer emails. Configure tier/row capacity and competition time slots.
3. Set competition and public ticket prices. Public orchestra tickets use `presto` and `allegro`; new Masterclass sales and Presto Masterclass benefits are disabled.
4. Add independent orchestra sessions in Orchestra Settings using an existing venue and the date/start/end pickers. No competition session is required; same-venue/day conflicts with timed draft and published competition sessions or other special sessions are rejected. Each has an informational **performance-linked attendance quota** for public competition ticket holders, winner ticket holders and eligible performers. Orchestra Settings does not generate numbered seats or ask for reserved rows.
5. *Updated 7 October 2026.* Orchestra admission has no software ceiling. Neither the quota nor the competition seat layout limits direct orchestra sales or group assignment. Staff must arrange enough seating for confirmed attendance; free seating is not a guarantee of unlimited physical space.
6. Save winners' competition assignments in Admin Page. They do not need an orchestra assignment before purchasing tickets.

The backend requires a whole-number quota of zero or more and prevents moving/deleting sessions with active attendance or reusing a competition slot with active bookings/performers. It no longer rejects a quota below current assignments or above the competition layout. Other older configuration pages and live database access still require care; these checks are not a general migration tool.

## Winner purchases

The winner selects their name/winning performance, then buys tickets for the competition venue/date/time already assigned by the internal team. Ensemble member names remain visible. Competition seat selection and remaining add-ons retain their existing behavior.

The customer does **not** select an orchestra session or numbered orchestra seats. After the opening nationality/payment choice, checkout has four steps: entry, tickets, details, review/payment. There is no complimentary quota banner, free-orchestra-seat step, Masterclass add-on or complimentary Masterclass notice.

After payment, the orchestra group headcount is:

**paid public competition tickets + paid winner tickets linked to the performance + registered performers once, provided a winner booking is paid**.

| Example | Orchestra attendance |
| --- | --- |
| Solo winner buys three tickets | 3 + 1 = 4 |
| Same solo winner later buys two more | 3 + 2 + 1 = 6 |
| Four-member ensemble buys three tickets | 3 + 4 = 7 |
| Another parent uses that ensemble and buys two more | 3 + 2 + 4 = 9 |
| Public buyer purchases five competition tickets for the ensemble, with no winner purchase | 5 + 0 = 5 |
| That public purchase is followed by two winner tickets for a three-member ensemble | 5 + 2 + 3 = 10 |

Pending, failed and expired purchases do not count as paid attendance. The performer allowance is shared across the ensemble, not repeated per buyer or booking. The initial payment email confirms the competition venue and ticket/seat details. If the booking has no covered orchestra assignment, its **Orchestra & Awarding Seating** block announces that orchestra and awarding venue/date/time will be emailed on **19 October 2026**, with instructions to redeem the free-seating orchestra ticket at the venue.

## Public competition purchases

Choose **Public Buyer → Watch a Performance**, search the assigned winning performance, and review its venue/date/time. Each paid Presto or Allegro competition ticket includes one complimentary, free-seating orchestra place that follows the selected performance when staff assign its orchestra session. Five tickets mean five orchestra places; public purchases add no performer places. The buyer enters their own contact details. The competition ticket remains numbered-seat inventory, with any unselected seats assigned through the existing paid-only staff workflow.

Public performance buyers may purchase the configured **performance seat-selection add-on**. Choose the number of seats to select, then select exactly that many available seats within the purchased Presto/Allegro quantities. Each add-on unit covers one numbered performance seat, and its configured price appears in the order total, cart and Review & Pay. Other winner add-ons remain unavailable to public buyers. This works with both Paper.id and manual PayNow/bank-transfer checkout. The add-on does not add orchestra places; only purchased performance ticket quantities count toward those places.

Without the add-on, or for tickets not covered by it, staff assign the remaining performance seats after payment in **Public Customers → Assign Missing Seats**, using the labeled gold Presto and blue Allegro sections to match the purchased quantities, then resend the confirmation. Switching to another performance or Orchestra Ticket clears the previous seat/add-on selections. Orchestra-only checkout has no seat-selection add-on or numbered seat map.

The public performance list is not restricted to winners currently allowed to make a winner purchase, but public sale dates still control checkout. An older public competition checkout made without a selected performance retains its original competition-only entitlement; it is not converted into an orchestra booking.

## Direct public orchestra purchases

The buyer chooses an orchestra session, then Presto or Allegro quantities and contact details, and pays. There is no numbered seat map, seat-selection charge or Masterclass benefit. The payment confirmation names the orchestra venue/date/time and explains free seating within the purchased category. Public purchases do not receive extra performer places.

Direct orchestra purchases do not create a second complimentary place or a performer allowance.

The purchased venue/date/time must match an existing `events.orchestraSessions` entry and an existing venue, both before and inside the checkout transaction. Orchestra times do not need entries in the competition `venues[].sessions` timetable. An unknown or removed orchestra slot is rejected before invoice creation. Competition purchases continue to use their own published timetable, performance assignment and seat/capacity checks. No timetable duplication or database migration is required for the 9 October checkout repair.

## International PayNow or bank-transfer option

Choose **International** in the opening nationality modal to use PayNow or bank transfer. Choose **Indonesian** for the usual Paper.id flow and 30-minute payment window. This applies to public and winner checkouts. The choice is self-declared; it does not use the registrant's country or phone prefix, and it remains selected when the buyer changes performance or session. A **Change** action above the steps allows correction before submission. Step 4 displays the chosen payment method instead of an international-payment checkbox.

For International, the ticket booking is reserved with no Paper.id invoice or 30-minute expiry. The buyer receives a ticket-specific email with the server-calculated IDR total, booking ID, existing PayNow/bank details and a request to reply with payment proof. PayNow buyers must contact admin for the SGD amount. The acknowledgement page displays the booking ID; the booking stays pending and inventory remains held until staff act. Refreshing the page asks the nationality question again; use the same choice and booking details to recover an uncertain checkout.

After verifying payment outside the system, open **Public Customers → Mark Paid**. The protected backend rechecks pending state and owned inventory, books selected seats, records the staff actor and attempts the standard ticket confirmation email. If delivery fails, use **Resend**. For an unpaid manual booking, staff first verify no payment was received, then choose **Cancel Unpaid**; the protected action releases its complete reservation. **Send/Resend Payment Info** retries instructions while the booking is pending. Do not use these manual actions for a Paper.id invoice booking.

## Assign paid winners after payment

1. Open **Orchestra Assignments**. Refresh to load current paid groups. Use **Load more** when more paid-booking pages are available; a page may have no eligible winners.
2. Review each performance's paid public competition tickets, paid winner tickets, performer count, total attendance and already assigned quantity. The group includes all eligible paid purchases even if bookings span pages. Public-only groups have no performer allowance.
3. Select one orchestra session for the whole group. Each option shows the current assigned headcount and the informational quota.
4. Click **Assign & email**. The server rechecks the paid group and assigns the whole group without truncating it. The quota does not block the assignment, so check physical seating yourself.
5. Each covered booking buyer receives an English email titled **APCS Orchestra & Awarding Session Confirmation**, with the APCS logo header and copyright footer. It confirms **APCS 2026 Orchestra & Awarding Session** and shows **Booking ID**, **Winning Performer**, **Session Details** (for example 15 November 2026, 15:30–17:30, Titan Theatre), and **Your Complimentary Tickets**. PRESTO and ALLEGRO rows show that booking's corresponding purchased quantities as `N tickets — Free Seating`, including zero for an unpurchased category. The owner confirmed there is no LENTO in this event; other saved categories remain visible for other/historical events. The notification omits internal assignment references and shared group headcounts. Ticketing screens and emails use English-only copy until a proper translation feature is implemented.
6. If delivery fails, the assignment stays saved. **Retry email** sends only missing deliveries for the current assignment revision. Refresh before retrying a busy send.

A later purchase does not invalidate existing confirmed places. For an ensemble that grows from seven to nine attendees, the table shows nine total and seven assigned. Staff must update the assignment to cover all nine. If the room cannot physically fit the additional attendees, choose another session for the entire group; all covered buyers receive the revised details.

Session changes produce a new assignment revision and fresh notifications to all covered bookings. Re-saving an unchanged assignment does not consume quota again. The email-send lease prevents simultaneous retries; after a crash during SMTP delivery, a retry can still duplicate an email if its success was not saved. There is no automatic background retry worker.

The revised notification asks buyers to present the booking ID at the counter to redeem tickets and explains that seating is first-come, first-served according to ticket category. If the assignment includes a shared performer allowance, it also says the performer's complimentary ticket can be redeemed at the same time; public-only groups omit that sentence. It closes with “We look forward to seeing you! ✨” and **APCS Music Team**. Category quantities are per booking, without adding the performer allowance or tickets from other bookings. Email formatting changes no admission quantities, paid status, assignments, redemption rules or notification tracking. The separate paid-booking confirmation still uses its existing attendance block.

After the normal backend restart/release, owner acceptance should compare received notifications for mixed categories, one purchased category (the other row shows zero), and a public-only group. Verify bold labels, the saved orchestra venue/date/time, category totals, conditional performer sentence, and logo/footer. An already delivered email remains unchanged, and Retry email still skips acknowledged deliveries; a real session change notifies the covered bookings through the existing workflow. All **26 offline orchestra audits** passed for the 13 October update; inbox appearance and delivery remain owner acceptance.

## Track event-day attendance

**Orchestra Settings** shows, per session:

- Paid public ticket quantity.
- Public quantities held pending payment/reconciliation, separately from confirmed attendance.
- Assigned performance group headcount (public competition + winner tickets + eligible performers).
- Confirmed attendance = paid direct public orchestra tickets + assigned version-2 performance-group headcount.
- Legacy complimentary allocations separately, because the historical counter includes holds and does not alone prove paid attendance.

Unassigned performance-group demand is shown in Orchestra Assignments. A session's confirmed attendance excludes those groups until staff assign them. Seat Occupancy lists only numbered competition sessions; use Orchestra Settings and Orchestra Assignments for orchestra headcounts. Historical orchestra seat documents remain stored but are not shown in Seat Occupancy.

## Competition planning on the Admin Page

The **Admin Page** assignment board is the grouping workspace before published competition sessions or active ticket inventory exist. APCS2026's prior dummy ticketing data was reset on 26 September 2026 and the event is in draft; its historical terminal bookings remain archived. Deploy the local planning code and Firestore rules before following these steps. Other events with activity require separate reconciliation. Performer Sessions creates private draft slots for planning events; only the publication action writes buyer-facing event sessions.

Admin Page planning requests and the legacy assignment save send the signed-in user's fresh Firebase ID token to the protected backend. A missing/invalid token returns HTTP `401` and the shared HTTP client redirects to login; whitelist rejection returns `403` and is shown as an error. These backend responses are separate from Firestore rule evaluation. After the frontend update, opening Admin Page should load the planning board without a login redirect for a signed-in whitelisted admin.

For a new event with no competition sessions, staff can choose **Start planning** on the Admin Page. The backend refuses to start when existing assignments or ticket records need reconciliation. APCS2026 is already in draft and does not need this action.

Archived APCS2026 test bookings remain in Firestore as callback tombstones and are hidden from the active Public Customers list. They do not contribute new orchestra attendance, seat capacity or winner eligibility.

### Steps

1. **Draft groups** — Click **Add performance group**, enter a name, venue and date, then drag performers from the pool. Search by name/music, swap or reorder performers, and use Overview to compare groups. Save the complete board. Use **Add orchestra group** in the lower attendance table and select registered attendees there, including children already performing above. The attendance group needs no performer session; only members without a performance are excluded from ticketing. Auto-assign fills competition groups only.
2. **Draft sessions** — In Performer Sessions, add one draft session per competition group with venue/date and optional time. Add or edit the final time there when known. Back on the Admin Page, edit each group and select one matching unused session. Save the board. Existing APCS2026 groups remain on the board and need linking; the reset left no sessions to select until staff create them.
3. **Preview** — Click **Validate and preview**. Resolve missing links or times, unused sessions, duplicate performers and overlapping sessions.
4. **Publish** — Click **Publish schedule**. The event's final competition timetable and ordered assignments are saved together. Published times are frozen.
5. **Generate seats** — Click **Generate numbered seats** after publication. Competition groups only; attendance groups have no seats. Generation runs on the server and keeps any locked or booked chair. If it reports an error, run it again before proceeding.
6. **Mark ready** — Click **Verify seats and mark ready**. Competition checkout opens only if numbered inventory and venue pricing checks pass. The usual day-specific sale eligibility remains in force.

### Restrictions

- Draft groups can be added, edited, reordered or removed.
- Published groups cannot have their times edited through this or the older session pages.
- Publishing requires all groups to pass validation and at least one competition group. Orchestra attendance groups need no time or session and are not published as performances.
- Group type can be changed only in draft.
- Seat generation is manual and separate from publication.
- The readiness check verifies the full seat layout, configured prices and sale-schedule setup; it does not override daily ticket eligibility.

## Confirmation and resend

Payment emails include the named booked venue, date/time, booking ID, paid ticket summary, competition seat labels and competition tickets still awaiting seat assignment. Free-seating orchestra confirmations do not imply a numbered seat reservation.

For winner and public competition buyers without a covered orchestra assignment, the initial paid email displays **Orchestra & Awarding Seating**, **Seating**: Free Seating · Redeem your orchestra ticket at the venue., and announces orchestra and awarding venue/date/time by email on **19 October 2026**. Once assigned, the separate assignment email includes the orchestra venue (such as Titan), date and time. Resending payment confirmation includes the saved orchestra assignment only when that booking is covered by it. Every payment confirmation highlights the instruction to present the email or Booking ID at the venue entrance.

Venue names use the booking-time snapshot for new purchases and the booking's own event for older records. Switching the active sale event must not relabel an older booking's venue. Booking-ID/manual entry verification remains the admission method; no public-booking QR workflow is added.

## Historical bookings and payment safety

Existing bookings retain their seats and original Masterclass entitlements. Legacy source pages remain in the repository but are no longer active menu options. Do not delete historical data or regenerate orchestra seats to adopt free seating.

Historical orchestra locked-seat rows are no longer an entry point for Seat Occupancy's release action. If an older orchestra booking needs reconciliation, review its complete booking, invoice, seat ownership and legacy quota through a separate controlled process before changing records.

A winner with paid legacy complimentary orchestra allocations is explicitly flagged in Orchestra Assignments. Staff must reconcile that allocation before assigning a new version-2 group; the system does not silently move old seats or count performer places twice. No automatic historical migration is included.

Payment and inventory safety:

- A local 30-minute deadline applies only to Paper.id bookings and requests provider cancellation; it never independently frees inventory. Manual bookings have no automatic expiry.
- Failed/unknown Paper.id outcomes retain holds until payment or cancellation is confirmed.
- Seat Occupancy cancellation operates on the whole linked booking, checks admin identity and complete owned inventory, and records an audit trail.
- Pending Paper.id checkouts without an invoice cannot be manually released while invoice creation may still be in flight. Explicitly tagged manual-payment bookings have a separate staff-confirmed unpaid cancellation path.
- Only paid bookings receive numbered competition seat assignment. New free-seating orchestra bookings have no Assign Missing Seats action.
- Protected Mark Paid settles explicit manual-payment bookings after staff verifies payment; new paid public and winner records appear in grouped attendance automatically. The existing Paper.id fallback remains separate.
- Paper.id's Invoice Paid callback accepts the staging `data.invoice.total_amount` and production `invoice.amount` forms when the invoice ID and amount match the saved booking. Every paid callback for a public booking is first stored as a receipt and retried automatically. A receipt marked **needs review** requires payment reconciliation; do not mark paid solely from a local timer or a copied callback example.
- Delete remains restricted to reconciled terminal bookings. Use the cancellation/reconciliation flow for active records.

## Rollout and verification

Deploy the backend and frontend together, and include `apcs_web/firestore.indexes.json` (including the event/registrant booking index). Existing project authentication and Firestore access configuration remain in force; orchestra-admin APIs independently verify the Firebase token and whitelist.

Follow the [manual walkthrough](TICKETING_FREE_SEATING_WALKTHROUGH_2026-09-19.md). The 19 September implementation was offline-tested. A separate 23 September staging rehearsal created one public and one eligible-winner test booking against the shared APCS Firestore project and Paper.id staging. The owner completed both payments in their browser; both genuine staging callbacks reached the local backend, both bookings became `PAID`, and both recorded a successful confirmation-email send to the saved test address. The production flat callback shape is covered by offline regression, not a real production payment. Inbox delivery, Paper.id's internal notification recipient, live contention/index availability, and deployed behavior remain unverified; see [progress](progress.md) for the test IDs and evidence.

The two paid staging bookings are linked to the current event, including one real eligible winning performance. Treat them as test records when interpreting attendance or reports. Do not delete a paid booking through an unpaid-inventory release shortcut; reconcile the test records with the normal administrative process.

See [technical flow](SEAT_BOOKING_FLOW.md), [architecture](architecture.md), [progress](progress.md), and [the historical ticketing audit](TICKETING_AUDIT_2026-09-06.md) for the preserved payment/recovery limitations. Never use the test occupancy reset utility against customer bookings.
