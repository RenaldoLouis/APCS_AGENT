# APCS Project — Architecture & Data Structure

## 2026-10-26 — Seat map image download in Seat Occupancy

`GET /api/v1/apcs/venue-settings/:eventId/:venueId/seat-map` (`requireTicketingAdmin`) → `VenueController.getSeatMap` → `VenueSeatMapService.getVenueSeatMap`. It reads `events/{eventId}.venues[].imageUrl`, fetches only `https://firebasestorage.googleapis.com/v0/b/...` URLs (no client-supplied URL, no redirects, 2 MB, 15 s) and returns `{ venueId, venueLabel, svg }`. Errors: 400 invalid IDs, 404 event/venue, 409 missing or non-SVG image, 502 download failure. The proxy exists because Firebase Storage sends no CORS headers; `<img>` display is unaffected.

`src/utils/seatMapSnapshot.js` parses the SVG with `DOMParser`, finds each seat by `id="<label>"` and its number by `id="<label>-num"` ([contract](SEAT_MAP_SVG_CONTRACT.md)), greys seats whose status is not `available` or whose tier has `available <= 0` in the layout capacity rows, wraps the map with a header and legend, and `renderSeatMapPng` rasterises it on a canvas at 2x. `SeatOccupancy.js` passes the dialog's loaded `seatLayout`, `layoutCapacity`, the new `layoutLoadedAt` timestamp and the session's `displayTime` (from `getCompetitionDisplayTime`); stale responses are discarded with the existing `layoutRequestId`. `apcs_service/scripts/normalize_seat_map_svg.js` prepares designer SVGs offline.

No Firestore collection, schema, rule or index changes; the endpoint is read-only.


`SeatOccupancy.js` now reads the selected competition session's actual sale capacity when opening or refreshing its layout. The **Actual ticket availability** table shows Presto/Allegro total slots, booked/held ticket demand, blocked slots and remaining slots. Purchased tickets without the seat-selection add-on or a staff-assigned chair still consume capacity. This display derives existing data; it requests no additional customer input.

Data path: parallel server-only reads of `events/{selectedEventId}` and the exact existing `ticketCapacity` document. The ID matches `PublicTicketRepository.capacityDocumentId`: `encodeURIComponent(eventId + '|' + venueId + '|' + date + '|' + time + '|paid').replace(/%/g, '_')`. The event's current venue `seatConfig` supplies the tier ceiling, as in checkout; `reservedByTier` supplies all booked/held demand and `blockedByTier` supplies operational blocks. Saved `capacityByTier` is not substituted for the current venue layout. Remaining slots = `max(0, ceiling - reserved - blocked)`; excess demand is explicitly flagged for staff review. The counter remains authoritative even when some retained reservations belong to expired bookings.

Only when the counter document is absent, read `publicBookings` with exact event/venue/date/session filters, in server-read pages of 200, and apply checkout's existing bootstrap predicate: paid (`PAID`/`paid`), pending, and failed bookings whose cleanup is not complete; exclude Masterclass bookings. This is read-only and does not initialize a counter. The existing compound index covers this query. Existing staff whitelist permissions cover both collections. Opening a normal counter-backed layout adds two document reads; typing/searching adds none. No event-wide booking scan, new collection/field, index/rules change, API or backend change is introduced.

Reads validate competition scope and counter identity/policy/counts. A failure displays **Ticket availability could not be verified** while leaving the seat-map loading path usable; it does not manufacture zero demand from a denied/offline read. Closing, reopening, switching events or refreshing clears the old summary and existing request guards discard late results. Successful or uncertain seat-block operations already reopen the layout and therefore refresh the summary. These independent reads are a snapshot, not a reservation or a transactional cross-document audit; checkout remains authoritative. [Owner walkthrough](SEAT_OCCUPANCY_LAYOUT_WALKTHROUGH.md#actual-ticket-availability).

## 2026-10-25 — Correct pending-booking buyer contact details

`PublicCustomersList.js` offers **Edit Buyer Contact** only on ticket-booking rows with exact `paymentStatus: pending`. The modal prefills buyer name (`buyerName` with `userName` fallback), email and phone. It sends the existing booking/event IDs, the three edited values and the original four-field contact snapshot to whitelist-protected `POST /api/v1/apcs/public-ticket/admin/update-buyer-contact`. `PublicTicketContactRepository.updatePendingBuyerContact` is a normal Promise-returning function awaited/caught by the controller, outside the callback-based database wrapper.

The Admin SDK transaction reads only `publicBookings/{bookingId}`, requires the selected event and current pending state, excludes documentation records and compares the saved contact snapshot to prevent overwriting another staff edit. Transaction retries recheck payment/expiry changes. An identical already-applied correction can be acknowledged without another write while pending. The only write is an explicit patch of existing `buyerName`, `userName` (the compatibility alias), `userEmail` and `userPhone`. No new collection, field, index, client permission or migration is introduced. Strict request-key and value validation prevents injected payment/seat/invoice fields; name is 1–200 characters, email is one plain mailbox up to 254 characters, and phone accepts 6–20 digits with spaces, parentheses, hyphens and an optional leading + (40 characters maximum).

The API uses a fresh Firebase ID token and requires an acknowledgement matching booking ID, event and every normalized contact value. The modal synchronously guards duplicate saves, blocks dismissal/editing/event switching during save, clears on cancel/success/event change and retains the draft on failure. Success invalidates older list loads, patches only the local contact fields and refreshes through the existing selected-event loader to pick up any subsequent payment transition. Missing/contradictory/lost acknowledgement requires a manual refresh; no automatic retry runs.

Scope explicitly confirmed by the owner: corrections apply only to the APCS booking and future APCS messages. Existing Paper.id invoice contacts and previously sent messages stay as issued. Saving sends no email and changes no delivery flags. Registrant/performance identities, frozen announcement recipients, tickets, add-ons, prices, sessions, deadlines, payment/invoice identity, checkout fingerprint/idempotency records, seats, capacity, orchestra assignments and redemption are untouched. Payment fulfillment already reads the booking transactionally and uses the saved contact for subsequent confirmation/seat metadata. Original-cart retries preserve corrected contacts and reuse the same booking/invoice. Release the backend before or together with the frontend and restart it normally; no live write/restart/deploy was performed during implementation. See [staff walkthrough](PUBLIC_CUSTOMERS_BUYER_CONTACT_WALKTHROUGH.md).

## 2026-10-22 — Search announcement recipients by name or email

The existing clearable recipient search now matches each case-insensitive query term against either the row's combined performer name or saved email. It supports partial/full addresses, domains and combined name/email queries. The same filtered table, matching/total counts and page-one reset remain. Saved campaigns search their historical displayed contact address; one-time resend addresses are not searchable or saved as contacts. No new API/Firestore reads, backend changes or send-flow changes are introduced. [Owner checks](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#search-for-a-registrant).

## 2026-10-21 — One-time recipient address in the rundown resend dialog

The row-level **Resend to this recipient only?** dialog now has a controlled **Email** input prefilled from the selected saved contact. Staff may replace it for that single send. The registration, combined performer greeting and reviewed PDF remain tied to the saved row. Cancel/success/event change clears the typed draft; validation/server failures retain it for review. Sending disables editing/dismissal and duplicate submissions. No automatic retry is introduced.

`POST /group-announcement-emails/resend` accepts optional `recipientEmail`. Missing input preserves the saved-address behavior for older clients; an explicitly supplied value must be one valid plain mailbox after trimming. Display names, lists, headers, invalid domains and oversized/non-string values reject before reservation or SMTP. The address is used only in memory for SMTP and echoed in the response; it is not written to registrations, saved campaign chunks, original deliveries or ticket bookings. Resend audit records continue storing the original saved contact. A new optional SHA-256 `recipientEmailHash` field binds each request ID to its one-time destination without storing the entered address. Reusing a request ID with a different address rejects; pre-existing receipts without this field are treated as belonging to the original saved address. The existing same-row three-minute cooldown applies even if staff change the destination.

The preview advertises `resendRecipientOverrideEnabled: true`. The updated frontend requires that capability before enabling the editable resend, so an older backend cannot silently ignore the new destination and send to the old contact. Release the backend before or together with the frontend, restart normally and refresh recipients. All existing artifact/dummy/runtime/completed-campaign/authentication gates remain. No new collection, rule, index, roster hash or email-content revision is added. [Staff acceptance steps](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#send-once-to-a-different-email-address).

## 2026-10-21 — Name search within announcement recipients

`GroupAnnouncementEmailSender` filters its existing `preview.recipients` locally using the row's combined performer `name`; no additional data is requested. Trimmed, case-insensitive search terms must all occur in the name. The clearable Ant Design input exposes **Search by registrant name**, matching/total recipient-row counts and a no-match table message. Controlled pagination resets on query changes and recipient refresh; modal close and the existing event-keyed remount clear search. Refresh retains the query. The filtered array feeds only the table: bulk counts, roster fingerprint, attendance and server snapshot stay complete, and selected-row resend retains its saved key/address. Bulk confirmation explicitly includes hidden rows. No backend/database/schema/query/email-template change is introduced. [Manual acceptance](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#search-for-a-registrant).

## 2026-10-21 — Individual rundown email resend

The recipient table in `GroupAnnouncementEmailSender` now provides **Resend Email** per saved contact row. Staff confirm the registration, performer greeting, exact saved address and reviewed PDF; the browser submits `eventId`, content `revision`, `recipientKey`, a fresh UUID `requestId`, `confirmed: true` and the optional one-time `recipientEmail` described above. It does not ask for existing assignment/contact information again. An ensemble with several addresses still has separate rows; shared-address performers within a registration keep their combined greeting.

Whitelist-protected `POST /group-announcement-emails/resend` delegates to `GroupAnnouncementCampaignService.resend`. The server resolves exactly one recipient identity/greeting from immutable saved chunks, permits the one-time address override described above and requires the current approved client artifact, its persisted same-version approved dummy receipt, enabled non-emulator client delivery, and a fully processed `completed`/`completed_with_issues` campaign with no active work. It sends the existing personalized message/PDF directly in this HTTP request. It neither starts nor resumes the bulk worker and never modifies the parent counts, original deliveries, recipients, registration or assignment data.

Two backend-only records are added beneath the existing protected campaign: `resends/{requestId}` stores recipient key/registration/name/email, request ID, actor UID, start/finish times, attachment filename/hash, the optional `recipientEmailHash` destination fingerprint described above and `sending/accepted/failed/uncertain`; `resends/recipient_{sha256(recipientKey)}` stores the key, request ID and a three-minute `leaseUntil` cooldown. A transaction reserves both before SMTP. Reusing any request ID returns its original outcome, including after restart or later manual attempts, and cannot target another row. Different request IDs for the same row are refused during the cooldown. A transport ambiguity is uncertain; a server stop/result-write failure can leave `sending`, requiring a mailbox/provider check. No automatic retry/recovery send runs. Another intentional resend requires a new explicit confirmation after the cooldown. SMTP acceptance does not establish inbox delivery.

The existing recursive campaign deny covers these subcollection records; no rules/index/migration change is needed. There are no new mount-time queries; each manual request reads only this campaign's bounded saved chunks plus its campaign/attempt/lock records. Deploy frontend/backend together and restart the backend normally before using the new route. Implementation performs no live send, campaign enqueue or deployment. [Owner walkthrough](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#individual-resend-after-the-campaign-finishes).

## 2026-10-19 — Activate the existing group email worker

The owner enabled the existing durable worker through `APCS_GROUP_EMAIL_WORKER_ENABLED=true` in the ignored local backend environment. The running port-8080 backend was restarted with its inherited environment and existing production database target preserved. The exact-current dummy approval was read and no runnable campaigns were found before activation. The live Firestore release received only the campaign recursive deny and whitelist-fallback exclusion already specified here; unrelated local rules edits were not deployed. No schema, collection, recipient flow, campaign enqueue or email send was introduced by activation. The same-version dummy, publication, contacts and manual confirmation gates remain. Hosted environments require their own explicit flag/restart. [Operational evidence and rollback](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#19-october-2026--backend-worker-enabled).

## 2026-10-19 — Attendance totals in the assigned-registrant email modal

The existing `GroupAnnouncementEmailService.preview` response now includes transient `attendanceSummary: { total, attending, notAttending, notImported, unavailable }`. This uses the existing top-level `Registrants2025.willAttend`: strict `true` is Attending, strict `false` is Not attending, and missing/null/non-boolean values are Not imported. Missing registrations or unsupported source events are Unavailable rather than assumed attending. Totals count distinct registrations, including an ensemble once, not performer/contact email rows. The counters partition `total` and are validated by the frontend before a preview is accepted; missing/malformed summaries never silently render as zero.

For a new campaign, the summary reuses the exact grouped-registration reads already needed for recipient resolution, with no extra queries. It covers all unique configured published competition members, including contact-issue rows; draft/unassigned/attendance-only membership remains excluded. For an existing campaign, the recipient list still comes from immutable chunks, while each unique saved registration is read at most once per recipient refresh (batches of six) solely to show its current attendance. No collection scan or ten-second progress-poll registration lookup is added. The summary is not written to campaign records/chunks and is outside the email-content/recipient hashes. Worker sends, frozen recipient identity, existing dummy approval, schema and rules are unchanged.

`GroupAnnouncementEmailSender` shows **Total not attending**, Attending, Not imported, Unavailable and total registrations in the first modal banner. Non-attending/unknown/unavailable values produce a warning; all-confirmed/empty values use the successful-summary style. Counts reflect opening or **Refresh Recipients / Progress**. This is informational and does not filter recipients, block sending or change attendance/membership. Existing contact and worker/version gates retain their own behavior. Release frontend/backend together and restart the backend normally; no migration/index/rules or live database write. [Owner checks](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md#attendance-totals-before-sending).

## 2026-10-19 — Late-payment recovery retains proven expired reservations

`PublicTicketReconciliationRepository` previously compared the saved session counter with pending/paid/unresolved-failed bookings only. An unrelated expired booking can still own its original chairs in `ticketSeatOwnership` after a historical partial expiry, even when its seat aliases say available. Excluding that retained demand incorrectly rejects an otherwise valid late-payment recovery as counter drift.

Recovery now reads canonical ownership for other expired competition records in the existing exact-session query. A retained reservation is included only when every purchased ticket is backed by a distinct original selected chair, every physical key remains actively owned by that booking in locked/booked state, the ownership event matches, the original chairs match the saved physical identities/session/layout/tiers, and `capacityReservation` matches this exact paid pool and ticket quantities. Fully released/reassigned ownership is not counted again. Partial ownership, unselected remainder, malformed/mismatched references or quantities stop for review. At most 400 distinct extra ownership keys are read; original chair reads are bounded by those keys. All reads remain inside the recovery transaction, before any write.

The recovered target is added once to ordinary active demand plus these proven retained holds. The saved counter must still equal that baseline or baseline plus the target; unexplained drift, other-chair conflicts, block mismatches and layout overcapacity continue to reject atomically. Other expired bookings, aliases, ownership and cancellation/payment metadata are read only. The shared checkout capacity helper and ordinary checkout/cancellation/seat assignment/orchestra/redemption paths are unchanged. No collection, schema, index, public-page query or frontend change is introduced.

For the inspected `hxfzh9Cxa459dFIDACI1` session, ordinary demand was Allegro 25, another expired booking retained two canonically owned places, and the saved counter was 27. Restoring the target's one unselected ticket requires 28 of the 28 Allegro places, preserving the other two. These are inspection-time facts; the real recovery transaction must recheck current records and staff must verify the unrefunded payment. Implementation does not run production recovery or send email. See [staff workflow and verification](LATE_PAYMENT_RECOVERY_WALKTHROUGH.md).

## 2026-10-19 — Final 2026 rundown attachment

The owner supplied the actual client rundown, `RUNDOWN APCS THE SOUND OF ASIA 2026 - FINALE ORCHESTRA.pdf` (19 pages, 750,873 bytes, SHA-256 `96876fa74d534f37bdd83b2dd511acf7e54378c37928dc8182e3eaec99ccbefa`). Its unchanged bytes are bundled in `apcs_service/src/services/attachments/`; `configs/groupAnnouncementEmailConfig.js` now selects that exact filename and hash. Both the existing fixed-address dummy sender and future bulk campaigns resolve this file through the same `resolveArtifact` path. Preview/download use the same bytes, and the old test-only warning no longer applies to the selected artifact. The prior `Program Notes - Fixed.pdf` remains preserved as a test-only fallback and its checksum still cannot be client-approved.

No email body/header/footer, recipient selection, worker enablement, database logic/schema or campaign-delivery behavior changed. The new artifact produces a new content revision, so an old successful dummy cannot unlock it. After backend release/restart, send a fresh dummy to `renaldolouis555@gmail.com`, review the message/PDF, then use the existing manual bulk confirmation only when all worker/roster gates pass. No test receipt, campaign snapshot or delivery history was rewritten and no real email was sent.

Content review: the overall schedule identifies 14–15 November 2026; eight table headers on PDF pages 2, 4, 5, 7, 8, 10, 12 and 14 still read **Awarding 15 November 2025**. The owner-supplied PDF was installed byte-for-byte and these remaining document typos were reported for dummy review, not silently edited. See [current attachment and owner checks](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md).

## 2026-10-19 — Verified payment recovery after expiry

Public Customers adds **Reconcile Payment** for expired version-2 Paper.id numbered competition bookings with `paymentReceipt.status: needs_review` / `reason: booking_canceled_before_payment`. Staff compare the saved invoice/amount with the production dashboard and explicitly confirm full, unrefunded payment. No new buyer input, provider request or performer/session selection is introduced.

The existing token/whitelist middleware protects `POST /public-ticket/admin/reconcile-expired-payment`. `PublicTicketController.reconcileExpiredPayment` awaits Promise-returning `PublicTicketReconciliationRepository.reconcileVerifiedExpiredBooking`, then attempts the existing confirmation email only after a new paid transition. The repository validates unchanged submitted booking/event/invoice/receipt/amount/seat IDs, matching paid receipt/currency, original session/layout/tier, all chair aliases/owners and other active-booking references. Foreign ownership or blocks stop recovery, as requested by the owner. Legacy/quota/Masterclass and direct-orchestra recovery is excluded.

Its single transaction reads the exact session's bookings (bounded to 1,001, rejecting above 1,000), current paid-capacity counter and physical block counts. Saved demand must be either other active demand or other demand plus the expired booking; the restored count is always the latter. This supports both proper release and leftover counted reservations without guessing or double counting. Counter drift, mismatched blocks or exhausted layout capacity rejects without writes. On success it updates `publicBookings` to PAID with original prices/tickets/session/contact/entitlements, books every original chair alias and canonical owner, aligns `ticketCapacity.reservedByTier`, and marks `ticketPaymentReceipts` plus the booking marker processed with reason `admin_reconciled`.

**Schema additions in existing collections:** `publicBookings.paymentReconciliation` and `ticketPaymentReceipts.reconciliation` contain `{source: admin_paper_dashboard, invoiceId, receiptId, amount, currency, recoveredFromStatus, previousReceiptReason, note, reconciledByUid, reconciledByEmail, reconciledAt, capacityBefore, capacityAfter}`. The booking also receives normal `paidAt`, `amountPaid`, `paymentDetails` and email status. Historical cancellation/release metadata remains for audit. Replays return already-paid without inventory mutation/email duplication. A post-commit email failure leaves payment confirmed; existing Resend handles staff recovery. Server interruption/uncertain delivery is not automatically retried. Assignment/redemption identities and snapshots are untouched; paid readers discover the restored entitlement through their existing rules.

The modal shows saved details, requires verification, disables repeated submission/dismissal/event switching during save and retains errors/notes. Order Details displays verifier/invoice/note. No new collection, rules, index definition or migration. Release frontend/backend together and restart the backend. Offline checks do not prove hosted indexes/authorization, real contention, browser or inbox acceptance. [Staff workflow, scope, incident evidence and verification](LATE_PAYMENT_RECOVERY_WALKTHROUGH.md).

## 2026-10-19 — Competition time wording without rescheduling

The owner chose a display-only time revision for published/ready competition groups, affecting the public booking page and ticket emails sent afterward (including resends). Saving sends no email. `AdminContent.js` continues to embed `SessionAssignmentManager.js`; its **Add Time Revision / Edit Time Revision** control beside the original assigned-time pill edits only customer wording. The original pill and plan-based duration/overrun calculations remain authoritative for administration. Attendance groups, draft groups and legacy boards do not expose this exception.

Optional `events/{eventId}.competitionTimeDisplay` has this shape:

```json
{
  "revision": 1,
  "times": {
    "Venue1_2026-11-14_11:05-13:20": "11:10-13:30"
  }
}
```

The map uses the **original** venue/date/time session key, never the revised string. Missing metadata defaults to revision 0 with no overrides. Only a valid `HH:mm-HH:mm` range with end after start is accepted (maximum input 30 characters; spaces around the dash and en/em dashes normalize). Empty text or the original time clears that key. No migration, collection or index is required.

Fresh-token, whitelist-protected `POST /competition-planning/:eventId/display-time` accepts only `{groupId, expectedRevision, displayTime}`. `CompetitionPlanningRepository.saveDisplayTime` is a standard awaited Promise-returning function. Its transaction reads the event, plan, groups and saved assignment projection; it verifies published/ready state, matching schedule/plan revisions, no reset, a unique competition group, matching linked slot/timetable and unchanged ordered assignment membership. Unknown/structural fields and stale **display** revisions reject. Its sole write replaces `competitionTimeDisplay` on the event, incrementing its independent revision. It does not write schedule state/revision, slots, groups, assignments, booking/payment records, seats, ownership, capacity, orchestra allocations or redemptions. Both checked-in rule sources prohibit client creation/update of this field; the Admin SDK endpoint owns it.

`getPlanningState` returns the metadata with existing reads. The board disables display edits while group order is unsaved or another operation is busy. Save updates only local display metadata; it leaves board sessions/assignments and their dirty baseline intact. Event switches discard an open draft; saving prevents switching/dismissal/repeated submission. Errors retain the draft. After a conflict or lost acknowledgement, close the dialog and reload the page to review current saved text before retrying.

`PublicTicketBookingPage.js` uses the existing event-data response to resolve customer text for performance cards, session labels, the seat-load notice and review. Canonical state, IDs, seat requests, checkout payloads and idempotency fingerprints retain the original time. Frontend/backend `competitionDisplayTime` utilities require the original configured competition scope and exclude orchestra/masterclass slots. There is no extra public query or database write.

`EmailService.getTicketDisplayDetails` reads the booking's own event at send time and preserves the booking-time venue-name snapshot. Paid confirmations, ordinary/alternate-address resends, manual-payment instructions/resends and Paper.id hold emails use the current display wording. This adds at most one event read per email (reusing the existing confirmation event lookup). Missing metadata/event falls back to the original string; read failures follow the existing email failure/retry handling. Stored bookings, invoices/payment deadlines, existing emails, queued campaign snapshots, generic announcement copy and PDF contents are not rewritten. Orchestra assignment emails keep their independent assigned times.

Release frontend, backend and the updated protected rules together; restart the backend through the normal owner workflow. [Manual acceptance and verification limits](COMPETITION_DISPLAY_TIME_WALKTHROUGH.md).

## 2026-10-18 — Durable Finale Orchestra email campaigns

The owner approved server-side bulk delivery that becomes available after a successful dummy test, and explicitly restricted the supplied 2025 PDF to dummy testing. `AdminContent.js` still supplies `GroupAnnouncementEmailSender` to the selected-event assignment toolbar. Only APCS2026 is accepted. The exact supplied Finale Orchestra subject/body and existing APCS header/footer are preserved; preview/dummy personalization remains Alex Example and the dummy recipient is fixed server-side to `renaldolouis555@gmail.com`.

`GroupAnnouncementEmailService` reads configured published competition assignments and exact assigned `Registrants2025` records in batches of six, excluding attendance-only membership and validating current performer contacts/guest provenance. `GroupAnnouncementCampaignService` owns durable campaign state. Before starting, the service rereads eligible contacts and compares their server-generated roster fingerprint with the reviewed preview; missing/invalid contacts, no recipients or a stale preview reject. Once queued, the campaign's saved recipient snapshot is authoritative and later contact/group changes do not rewrite it. Opening an existing same-version campaign loads frozen recipient identity from that snapshot; the 19 October attendance-summary update separately rereads unique saved registrations only to display current attendance. Same-address performers combine within a registration; different registrations remain separate.

The approved client attachment is configured only in backend `configs/groupAnnouncementEmailConfig.js` with a safe local filename and exact SHA-256. The 19 October update selects `RUNDOWN APCS THE SOUND OF ASIA 2026 - FINALE ORCHESTRA.pdf` with its exact approved checksum (see above). If client approval is explicitly cleared to `null`, `Program Notes - Fixed.pdf` remains a dummy-only fallback. Its known 2025 checksum is explicitly rejected for client approval, even if the file is renamed. Configured files must match their hash, have PDF header/end markers and be at most 8 MB. The content revision hashes the entire personalized-template prototype, attachment filename/hash and approval classification. A different message/PDF invalidates the prior dummy gate. A successful dummy records SMTP acceptance, not inbox receipt; staff review the inbox before confirming bulk. Neither request bodies nor client Firestore writes can approve an attachment or forge a dummy receipt.

`GroupAnnouncementEmailRuntime` uses the existing SMTP configuration with bounded connection/greeting/socket timeouts. Background delivery requires explicit `APCS_GROUP_EMAIL_WORKER_ENABLED=true` and is always disabled in Firestore emulator mode. `index.js` starts `GroupAnnouncementEmailWorker` only through that guard: startup delay 15 seconds, scan every 5 seconds, local overlap guard, at most five runnable campaigns per scan and ten recipients per campaign per pass. A durable one-second gap and three-minute per-recipient lease coordinate multiple processes. Each SMTP operation has a stable message ID, which aids investigation but is not a provider exactly-once guarantee.

Whitelist-protected `POST /group-announcement-emails/{preview,test,send,status}` use fresh Firebase tokens. `/send` returns HTTP 202 after the snapshot is committed, without waiting for SMTP. Parent, event pointer and chunks commit in one transaction (100 recipients per chunk; maximum 10,000 recipients and 8 MB serialized roster, with per-chunk size guards). The campaign ID is deterministic for event/content revision: double starts, retries after a lost response and other staff browsers reuse it. An event pointer prevents overlapping different-version campaigns with unfinished recipients. Worker sends do not depend on a browser token. The existing 60-minute inactivity logout and HTTP-401 redirect remain intact; staff may need to sign in again to view progress, but this does not cancel queued work. Polling every ten seconds uses only status reads and stops safely on errors/unmount. Latest progress can be recovered even if the current deployment's attachment is missing.

Every send is transactionally leased before SMTP, then settled with a fenced attempt ID and cursor/count updates. Accepted, rejected and uncertain deliveries are terminal and have no automatic resend path. A crash after claim/acceptance but before saving the result becomes uncertain after lease expiry; late worker results cannot overwrite recovery. Pending recipients resume on an enabled worker after restart. A missing/unapproved/different artifact pauses the saved campaign; restoring its exact approved version allows explicit resume using the frozen snapshot. The original bulk change added no cancel/resend UI. The later 21 October row action above adds explicit individual resend without changing the bulk worker. Per-recipient records preserve evidence for staff/provider review.

**New collection: `groupAnnouncementCampaigns` (backend-only reads and writes):**

| Location | Stored data |
| --- | --- |
| `{eventId}` | Event pointer: `kind: event_pointer`, `latestCampaignId`, `runnable: false`, `updatedAt`. |
| `{sha256(eventId, contentRevision)}` | `eventId`, `revision`, `status`, `runnable`, `dummyTest` (revision, SMTP acceptance time, fixed recipient, approval classification and actor UID), `total`, `cursor`, `accepted`, `failed`, `uncertain`, `issues` (latest 20 summaries), `inFlight`, `nextAttemptAt`, `recipientsHash`, attachment filename/hash, creator UID and creation/update times. A dummy-only record has no recipient snapshot and is not runnable. |
| `{campaignId}/chunks/{sixDigitIndex}` | Immutable recipient arrays containing registration ID, performer names, email, stable key and published-session display context. |
| `{campaignId}/deliveries/{sixDigitOrdinal}` | Recipient snapshot, ordinal, attempt ID, `sending/accepted/failed/uncertain`, lease/start/finish times and safe failure/review reason. |

Parent statuses are `tested`, `queued`, `running`, `blocked`, `completed`, `completed_with_issues`; an absent record presents `not_started`. All times are backend epoch milliseconds. Client rules explicitly deny all access to this collection and exclude it from the broad staff fallback; both checked-in rules and the owner production-rules candidate were updated. APIs supply all staff reads. The runnable scan is a single-field equality query and needs no composite index. Release backend/frontend and the protected rules together; no existing documents are migrated. No existing registration, event, booking, payment, seat, capacity, assignment, orchestra-allocation or redemption record is changed. Worker enablement and final-client-PDF configuration remain undeployed; no real email or live database mutation was performed. [Release and owner acceptance](GROUP_ANNOUNCEMENT_EMAIL_WALKTHROUGH.md).

## 2026-10-18 — Paid documentation-only customers in Public Customers

`PublicCustomersList.js` combines its existing selected-event `publicBookings` rows with a separately loaded `documentationCustomers` collection, solely for this screen. Staff use **Add Documentation Customer** for an already verified external payment, entering a required name (maximum 200 characters) and optional multiline note (maximum 2,000). The owner chose **already paid only**: there is no unpaid/pending option or payment-status editor. **Edit Customer** corrects name/note with a revision check. These records always display **Documentation only**, **PAID**, **No seat** and email status **NOT APPLICABLE**. Amount displays **Recorded offline** because no amount is collected; no zero-value ticket purchase is invented.

`apcs_web/src/services/documentationCustomers.js` owns collection reads and writes. Reads use `eventId == selectedEventId`, document-ID ordering and pages of 200. A form reserves one auto-ID locally before saving. A transaction reads the event and exact documentation document, verifies event existence, and creates only the documentation record. Identical create retries from the same staff account reuse that ID without another write. Existing records require matching event/type/no-seat/paid markers and revision; stale, missing or malformed records reject with the draft retained. Edits patch only name, note, revision and updater metadata. Saving blocks dismissal/event changes and repeated submissions. Source-qualified table keys distinguish equal document IDs across collections. Event changes clear drafts and documentation rows; request generations discard late loads, and successful saves invalidate older reads. Documentation-load failure is shown as a warning while existing ticket rows still load.

This new collection uses the existing checked-in whitelisted-staff Firestore fallback. No access rule is weakened or changed, and no backend endpoint, index definition, migration or payment-provider request is added. Release the frontend through the normal owner workflow. Hosted permissions and real persistence remain owner acceptance; the repository rules and saved production-rule snapshot are source evidence, not a fresh inspection of deployed rules.

The new records never enter `publicBookings`, registrants, session assignments, numbered seats, canonical ownership, capacity, checkout keys, receipts or redemptions. Seat assignment (`TicketSeatAdminRepository`), orchestra grouping (`OrchestraAssignmentRepository`), redemption (`TicketRedemptionRepository`), planning activity checks (`CompetitionPlanningRepository`), expiry (`PublicTicketSweeper`), payment fulfillment (`PublicTicketPaymentService`) and Seat Occupancy lookup consume their existing booking/receipt collections. Displaying documentation beside bookings does not feed them new input. Documentation rows have their own edit/details path and cannot invoke booking note/payment/seat/cancellation/email actions. See [owner walkthrough and verification boundaries](DOCUMENTATION_CUSTOMERS_WALKTHROUGH.md).

## 2026-10-18 — Reorder published competition performers within their group

`AdminContent.js` embeds `SessionAssignmentManager.js`. Planning groups already supply their ordered `registrantIds`, hydrated from the existing registration reads. Published and ready competition cards may now drag within their own group; staff choose **Save Order**. Membership editing, cross-group drops, pool additions, removal, swaps, group configuration and orchestra-attendance edits remain locked. Dragging uses original full-list indices even with attendance filtering. Saving or a planning operation disables dragging; saving disables event changes/discard, and unsaved ordering blocks seat generation/readiness controls. Overview and the existing export use the current local order; save before sharing an export.

The fresh-token API calls whitelist-protected `POST /competition-planning/:eventId/reorder` with `{ expectedRevision, groups: [{ groupId, registrantIds }] }`, including only changed performance groups. `CompetitionPlanningController.reorderPublished` awaits the standard Promise-returning repository function and forwards errors to middleware. This is deliberately separate from the draft-replacement endpoint, which still rejects published edits.

`CompetitionPlanningRepository.reorderPublished` transactionally reads the event, plan parent, all existing groups and published assignment document. It requires matching published/ready status and event/plan revision, no reset, unique existing competition group IDs, an exact permutation of each group's saved membership, and an unchanged linked slot and public timetable. The existing assignment array must exactly match the original ordered membership and order indices; an ambiguous session/group mapping or projection mismatch rejects before writes. Unexpected group fields, additions, removals, duplicates and stale concurrent submissions reject. All submitted groups save atomically or none do.

Writes update only changed groups' `registrantIds`/`updatedAt`, corresponding `sessionAssignments/{eventId}.assignments[venue_date_start-end]` arrays/`updatedAt`, plan revision/`updatedAt` and `events/{eventId}.competitionScheduleState.revision`. Each assignment entry retains `registrantId`, `sourceEventId` and other saved metadata; only its order/index and array position change. Other assignment keys and document metadata remain intact. Schedule status, publication/readiness timestamps, timetable, slots, membership, registration documents, ticket inventory/capacity/ownership, bookings/payment, orchestra allocations, emails and redemptions are preserved. No new schema, collection, index, migration or rules change. Release frontend/backend together and restart the backend through the normal owner workflow. See [manual acceptance and offline evidence](PUBLISHED_GROUP_ORDER_WALKTHROUGH.md).

## 2026-10-18 — Confirmation copy to another email address

`PublicCustomersList.js` adds **Send to Another Email** beside the existing Resend action, enabled for `PAID`/`paid` bookings. The modal identifies the buyer, booking and saved address, and collects one recipient. The booking already supplies performer, venue, session, tickets and seats; no new registrant/session selection is needed. Cancel/event changes clear the draft; submission disables the input, event switching and modal dismissal. Errors retain the address and open modal. The page never updates its saved buyer address or APCS Email Status for this action.

`apis.publicTicket.sendPublicTicketEmailToAddress(bookingId, recipientEmail)` obtains a fresh Firebase ID token and posts to `POST /public-ticket/admin/send-email-to-address`. `requireTicketingAdmin` verifies the token and whitelist before `PublicTicketController.sendPublicTicketEmailToAddress` validates the booking reference and one plain email address, reads the exact booking and rechecks confirmed payment. The controller passes an in-memory `{ ...booking, id, userEmail: recipient }` copy to the existing confirmation sender. The sender retains the existing booking-event venue resolution, orchestra-assignment lookup and ticket template. No booking, registrant, payment, inventory or delivery-status write occurs; no collection, schema, rule, index or migration is added. The alternate address is not persisted and there is no alternate-recipient delivery history.

The API returns `{ bookingId, recipientEmail, sent: true }` only after the sender resolves; the client validates that acknowledgement. Sender failures return 502 with delivery-check guidance; missing/malformed inputs, absent bookings and unpaid bookings return 400/404/409. A transport failure may follow successful SMTP acceptance, so the UI advises checking delivery before retrying and performs no automatic retry. This is an intentional manual copy: each successful invocation sends again regardless of the original `emailSent`. The existing `/public-ticket/resend-email` action also resends regardless of that flag, uses the saved buyer address and retains its original status writes and existing authorization behavior.

Release frontend and backend together and restart the backend through the normal process. No live email, database write or browser verification was performed; [owner acceptance steps](TICKETING_SYSTEM_GUIDE.md#2026-10-18--send-a-confirmation-to-another-email) cover the new modal and delivery.

## 2026-10-17 — Public Customers booking notes

`PublicCustomersList.js` reads the optional `publicBookings/{bookingId}.adminNote` string through its existing selected-event booking query. The Note column shows plain text and opens an Add/Edit Note modal (multiline, maximum 2,000 characters). Each booking row has its own note; notes are not shared across bookings with the same email or registration. Missing notes require no migration.

Saving uses the existing Firebase client `runTransaction` path and existing whitelisted-staff Firestore permissions. It reads the exact booking, checks existence, unchanged event and unchanged original note, then updates **only `adminNote`**. An empty/whitespace-only draft deletes that field. A concurrent note edit rejects with copy-draft/refresh guidance, retaining the draft. Successful saves merge the note into local row state; failures retain the modal and draft. Cancel discards unsaved changes, event changes reset the editor, and the event selector/modal dismissal are disabled during save. No additional collection scan, API, collection, index or rule change is introduced. Booking/payment/inventory fields and email templates are untouched. The public booking-status response explicitly selects polling fields and does not include `adminNote`.

Owner acceptance steps are in [the ticketing guide](TICKETING_SYSTEM_GUIDE.md#2026-10-17--buyer-booking-notes). No browser or live Firestore write was used for verification.

## 2026-10-15 — Frontend nationality choice for existing payment modes

`PublicTicketBookingPage` replaces the Review & Pay checkbox with a required opening Ant Design modal. Component-only `buyerNationality` derives `manualPayment` (`international` is true; `indonesia` is false). The initial modal cannot be dismissed without a choice; the displayed selection can be changed before submitting. Cart/session/performance/buyer-type resets retain it. A fresh mount asks again. The submit guard requires a choice, and review/payment labels use the same derived boolean. Existing request serialization and checkout fingerprint include `manualPayment` as before; nationality itself is not sent or stored. No schema, collection, backend API, Firestore operation or email template change is introduced.

The existing backend remains authoritative: manual bookings have no invoice/automatic expiry and send PayNow/bank instructions; Paper.id bookings keep the 30-minute deadline and confirmed-provider-cancellation release rule. Uncertain-response recovery still requires matching details/payment mode. The focused frontend checkout/API suite passes **19 tests**; manual UI/live acceptance is documented in both ticketing guides.

## 2026-10-14 — Public checkout seat-conflict response

The existing path remains `PublicTicketBookingPage.handleSubmit` → `apis.publicTicket.createBooking` → controller/service → `DatabaseUtil.executeDatabaseOperation` → `PublicTicketRepository.createPublicTicketBooking`. Within the awaited inventory transaction, seat-status, canonical-owner and physical-alias conflicts use operational `AppError` responses (**409**, `code: SEAT_UNAVAILABLE`) with safe seat-reselection guidance. Exhausted competition tier capacity uses **409 / `TICKET_CAPACITY_UNAVAILABLE`** with quantity/category guidance. The repository catches transaction rejection and settles `callback(error)`; the controller passes it to the unchanged production error middleware. Unexpected internal failures still receive a generic 500 response.

The unchanged API wrapper carries the safe message to the existing review error display. Back navigation already fetches current seats on entry to Select Tickets; replacement seats already change the checkout fingerprint. No new frontend state/navigation, backend validation condition/order, Firestore read/write, persisted field, collection, index, rule, payment/email path or migration is introduced. Both ticketing guides document owner acceptance and the distinction from uncertain-payment recovery.

## 2026-10-14 — Operational seat blocking and sale capacity

`SeatOccupancy` reuses its selected event/venue/session layout and adds an available-chair reason dialog plus an unblock review, purple blocked state and overview count. The shared picker has an opt-in `isSeatClickable` predicate for read-only staff actions; default customer/other read-only behavior is preserved. No extra registration/session selection or collection scan is added to layout opening. `apis.publicTicket.setSeatBlock` sends a fresh Firebase token to `POST /public-ticket/admin/seats/block`; `requireTicketingAdmin` supplies the audited actor, never the client body.

`PublicTicketController.setSeatBlock` awaits the Promise-returning `TicketSeatAdminRepository.setSeatBlock`. Its transaction validates the configured competition session, matching layout chair/tier, expected revision, all exact physical aliases, canonical owner and current capacity. Reads precede writes. Available aliases become blocked together; owned/booked/locked/reserved chairs cannot be overwritten. The same paid-capacity document used by checkout serializes blocking with purchases without selected seats. Both operations require reserved/requested ticket quantities plus blocked-chair quantities to fit the configured tier. Missing counters bootstrap active booking demand with checkout's shared `getReservedCapacityByTier`; inconsistent existing block counts reject for reconciliation. No admission ceiling is added to orchestra.

**Schema extensions to existing collections:**

- `seats{eventId}.status` adds `blocked`; `seatBlock` holds `reason`, `blockedByUid`, `blockedByEmail`, `blockedAt`. `seatBlockRevision` advances on every block/unblock. Removal deletes current `seatBlock` and retains `lastSeatBlock` with its original fields plus `unblockedByUid`, `unblockedByEmail`, `unblockedAt`. This retains the most recent removed block, not an unbounded history.
- `ticketSeatOwnership/{encoded physical key}` can represent an operational owner with `status: blocked`, `active: true`, `eventId`, `physicalSeatKey`, `seatId`, `seatBlockRevision`, `updatedAt`, and no booking ID. Unblock writes an inactive available owner. Selected checkout, staff assignment and legacy confirmation continue using this ledger and reject blocked aliases.
- `ticketCapacity/{existing paid capacity ID}.blockedByTier` counts physical blocked chairs per tier. Existing documents default to zero. `capacityByTier` remains the full configured layout, `reservedByTier` remains customer demand, and competition checkout subtracts blocked quantities from the layout ceiling. Ordinary checkout updates and cancellation retain this field.

Generation preserves active blocks and preserves block revisions/last removal on refreshed available seats so old dialogs cannot match new blocks after regeneration. Public seat listing strips `seatBlock` and `lastSeatBlock`; staff continue reading scoped seat documents. The mutation response contains `{ seatId, status, revision }`; the client checks the action-specific status and revision, disables repeated submission and refreshes after errors/uncertain acknowledgements. Active-event changes invalidate pending UI results.

No new collection/index/rules change or migration is needed. Existing whitelist/direct-write privileges are retained and are not covered by backend transactional guarantees. Release frontend/backend together and restart the backend normally. Offline tests substitute database/provider/email dependencies; rendered browser, real transaction contention/index availability and deployment acceptance remain open. [Walkthrough](SEAT_BLOCKING_WALKTHROUGH.md).

## 2026-10-14 — Venue layout saves before numbered inventory exists

Existing-venue row/capacity/tier edits now use `POST /venue-settings/:eventId/:venueId/layout` with the current Firebase ID token and `requireTicketingAdmin` whitelist authentication. `VenueRepository.updateLayout` validates row letters, unique rows (case-insensitive), integer capacities 1–100 and Lento/Allegro/Presto tiers. The request includes expected label/image/layout values; stale edits are rejected. The event transaction reads the latest venue and queries `seats{eventId}` by `venueId` with limit 1. Any matching numbered seat, including available inventory, blocks an actual layout change. Publication status alone does not lock the layout. Metadata-only edits retain the existing authenticated metadata endpoint.

The save merges only label, image URL and seat configuration into the latest selected venue. IDs, sessions, additional venue fields, other venues and competition state/revision remain unchanged. No collection or new persisted field is added. The browser Firestore rules remain unchanged. Venue creation/deletion keep their existing paths and permissions; this change enables edits to existing venues only.

Seat generation now re-reads the event in every chunk transaction, checks that layout/timetable still match its initial snapshot, and writes its unchanged venue snapshot back to the event in that same transaction. Completion flags are still written only after all chunks succeed. Generator and layout save both write the event document, serializing concurrent backend edits with first-seat creation; an old snapshot cannot generate seats after a changed layout. Partial generation leaves actual inventory present and therefore locks layout edits. Existing generation ownership/locked/booked protections remain intact. Legacy direct client seat writes retain their existing rule access and are outside this backend serialization guarantee.

## 2026-10-14 — Independent orchestra schedule configuration

`OrchestraSettings.js` now collects an existing venue, DatePicker date and TimePicker start/end range independently of competition times. `utils/orchestraSession.js` translates pickers into the unchanged API/stored contract `{ id?, venue, date, time, complimentaryQuota }` and translates an existing definition back into editable picker values. Picker objects and attendance counters are never submitted. The authenticated session route/controller remains unchanged; the standard Promise-returning `OrchestraAssignmentRepository.saveSession` is awaited/caught without the callback DatabaseUtil wrapper.

The transaction validates the calendar/time range and existing venue without requiring `venues[].sessions`. Creating or moving a slot checks half-open interval overlap against other `orchestraSessions`, historical `masterclassSessions`, competition venue times, populated published assignment keys and timed private `competitionSessionPlans/{eventId}.draftSlots`. Identical legacy special-session copies in venue times are excluded from competition classification. The owner explicitly chose rejection of draft as well as published conflicts. Adjacent sessions are valid. Same-slot quota edits preserve legacy metadata/attendance and do not reclassify the schedule. Changed-slot saves read the planning parent inside the transaction; concurrent draft edits cannot bypass the checked snapshot.

Removing/moving an existing session additionally checks exact saved `orchestraAssignments`, active legacy booking links and old numbered inventory, while original direct-booking/counter guards remain. Deleting or changing venue/date checks planned attendance links; staff must clear them first. These are existing indexed equality lookups, bounded to one reference where existence suffices, with no new mount-time scans, collection/index or schema. Configuration changes only `events.orchestraSessions`; event/plan competition revisions are not advanced by ordinary orchestra saves. Publication already reads this event and rejects special-session overlap. Direct checkout resolves `events.orchestraSessions`, assignments resolve its stable ID, and redemption resolves ID plus venue/date/time; their contracts and implementations are unchanged.

The separate authorized production cleanup removed only old IDs `0goivmll` and `9tixhoss` after backup/reference checks. Only `events/APCS2026.orchestraSessions`, event schedule revision and plan revision were written (**169 → 170**). Eight real draft slots/eight groups/four archived bookings and all other read records are unchanged; no document was deleted. Production has zero orchestra definitions, and the local emulator was untouched. **254 backend offline audits, 34 frontend tests, three cleanup safeguard tests, lint/syntax, compiler and live cleanup readback passed**. The new application behavior is local source and still needs coordinated frontend/backend release. [Data/verification and owner walkthrough](ORCHESTRA_INDEPENDENT_SCHEDULING_WALKTHROUGH.md).

## 2026-10-14 — Narrow production timetable cleanup and orchestra dependency

The owner's obsolete Behring `2026-11-14` `08:00-09:00` row came from `events/APCS2026.venues[Venue_lnssq2n1].sessions`, not the eight real `competitionSessionPlans/APCS2026.draftSlots`. The guarded production maintenance script removed only that time from the target venue/date, retaining the empty date key and every venue field. It updated only `events/APCS2026.venues`, `events/APCS2026.competitionScheduleState.revision` and `competitionSessionPlans/APCS2026.revision`; synchronized revisions advanced **168 → 169**. No document, collection, schema or index was added/deleted. A typed private backup preceded the transaction. Readback structurally compared every read document and checked untouched documents' update timestamps, proving unchanged draft slots, eight groups, orchestra definitions, settings and four archived booking tombstones. Target inventory/ownership/capacity/assignments were absent. The event remains draft, and the emulator was untouched. [Audit and rollback scope](audits/PRODUCTION_OBSOLETE_BEHRING_SESSION_CLEANUP_2026-10-14.md).

Before the independent-timetable follow-up, the orchestra add/edit path was `OrchestraSettings` → authenticated `orchestraAdmin('session')` → `OrchestraAssignmentRepository.saveSession` → `events.orchestraSessions`. The form reads `event.venues[].sessions` for date/time options; the transaction requires that exact configured venue time and rejects assigned competition performers or active slot bookings. It does not read private planning `draftSlots`. Those become venue times only through publication, which requires every draft slot assigned to a competition group. This makes creating extra private competition drafts an unsuitable orchestra setup workaround. Orchestra free-seating definitions are logically separate; independent orchestra time entry is not implemented by this cleanup. Both existing Titan `2026-11-15` orchestra sessions are preserved despite their times being absent from the current venue timetable.

## 2026-10-14 — Buyer captions and name search in a seat layout

`SeatOccupancy.handleViewLayout` still reads the selected competition venue/session's `seats{eventId}` documents on explicit **View Layout**. It now deduplicates the current occupied-seat booking references and reads each referenced `publicBookings/{id}` once: `lockedByBookingId` for locked seats, `bookingId` for booked/reserved seats. Available seats never supply an owner reference. No full booking/registration collection scan is added to layout opening, and typing a name performs no reads.

`seatOccupancyLookup.getSeatLayoutDetails` uses booking names only when the linked document matches the active event, venue and exact session and is neither a free-seating/orchestra nor archived-test booking. Buyer identity comes from `buyerName`, falling back to legacy `userName`; performer/ensemble identity comes from saved `registrantName`. For absent/unreadable booking documents or legacy seats, the current seat's status-appropriate `assignedTo`/`lockedBy` snapshot supplies available names. A loaded mismatched booking suppresses holder names rather than attributing another session's buyer. Missing buyer metadata displays **Buyer not recorded**. Partial booking-read failures warn staff; the seat inventory still renders. Saved booking seat arrays and labels never reconstruct current ownership.

The layout stores transient buyer/registrant/email/reference/search metadata alongside each mapped seat. The shared picker has an optional `renderSeatCaption` slot, used only by Seat Occupancy, to place a two-line buyer caption under the seat button. The tooltip identifies buyer and registrant separately. Search matches all case-insensitive, whitespace-normalized name words in memory, outlines matches in gold, dims nonmatches and lists current matching seat labels/names/status. All rows, tiers and aisles remain in the map; status colors and locked-seat actions remain intact. Session opening/closing and active-event changes reset the layout/search and invalidate earlier asynchronous reads.

There are no schema/collection/index, backend endpoint, assignment/payment/release or admission changes. The separate event-wide **Load/Refresh Lookup** keeps its existing data flow. Prior Public Customers tier headers remain available through the picker's separate `renderRowHeader` option. Changed-file lint has zero errors/one existing Seat Occupancy hook warning, and the running frontend compiler reports warnings with no errors. [Owner walkthrough](SEAT_OCCUPANCY_LAYOUT_WALKTHROUGH.md) records rendered-layout and live-read checks still pending with the owner.

## 2026-10-14 — Optional planned orchestra session prefill

Attendance planning now supplies an optional default for the paid Orchestra Assignments page. Staff can organize registered attendees before purchases, then explicitly confirm a session with **Assign & email** once qualifying bookings are paid. The planning table, confirmed paid assignment, buyer notifications and redemption remain distinct operations.

**Additive field:** `competitionSessionPlans/{eventId}/groups/{groupId}.orchestraSessionId` is an optional existing `events/{eventId}.orchestraSessions[].id`, or null. It is valid only on `purpose: orchestra_attendance` groups, must match that group's venue/date, and does not replace `slotId/start/end` (which remain null for attendance). SaveGroup and revision-checked full-board SaveDraft validate/persist it. Explicit null clears the link; older callers that omit it retain the saved link when the attendance group stays at the same venue/date. Omitted links clear on a venue/date or purpose change. Existing unlinked groups need no migration, and no collection or index is added.

`SessionAssignmentManager` loads orchestra sessions from its existing event read, offers the optional session selector in attendance-group editing, clears the local link on venue/date/type changes, and includes it in save/reload/discard state. The attendance table and roster show the planned time. **Keep on board** edits local state; **Save Changes** persists it. The existing combined draft save, per-purpose membership uniqueness, guest identities, publication/readiness projection, and published-plan read-only policy remain intact. A planned session is never published as a competition session or numbered inventory.

The authenticated orchestra `list` endpoint still lists qualifying paid version-2 performance-linked groups. For a page containing such groups, `OrchestraAssignmentRepository.listGroups` reads the event and its scoped planning-group collection once and attaches a transient `plannedSession: { sessionId, groupId, groupLabel, venue, date, time } | null` to each group. A suggestion requires one unambiguous attendance membership and a currently existing matching orchestra session/venue. Missing, deleted, mismatched, cross-event or ambiguous links produce no suggestion. This lookup performs no writes. `readGroup`, assignment transactions, checkout, paid headcount calculations, notification delivery and redemption entitlement checks are unchanged.

`OrchestraAssignments` resolves the session in this order: **staff's local selection → saved confirmed assignment → planned suggestion → manual empty selection**. The dropdown value, submitted `sessionId`, and Assign & email button use the same helper. Suggestions are labeled **awaiting confirmation** and do not change assigned counts. Planning changes cannot overwrite a confirmed assignment, email customers or unlock redemption. Later purchases still need explicit assignment updates to cover their new booking IDs. Direct public orchestra purchases retain their checkout-selected session and do not use this prefill.

Verification: **246 backend offline audits and 8 focused frontend tests passed**, with zero changed-file lint errors and one existing `handleAutoAssign` warning. See [the owner walkthrough](ORCHESTRA_ATTENDANCE_WALKTHROUGH.md#optional-session-prefill--14-october-2026). Release frontend/backend together and restart the backend normally; this source change does not migrate records or establish deployed/browser/provider acceptance.

## 2026-10-13 — Production Firestore rule compatibility review

The [owner-copyable rules candidate](FIRESTORE_PRODUCTION_MERGED_2026-10-13.rules) merges the supplied production matches with local event/planning, payment receipt, redemption and scoring-delivery boundaries. The old broad whitelist fallback must be replaced with collection-scoped exclusions for `events`, `sessionAssignments`, `competitionSessionPlans`, `ticketPaymentReceipts`, `ticketRedemptions`, `scoringResultEmailDeliveries`; overlapping allow grants otherwise defeat protection. No collections, schema fields or application data flows change. Public event reads and planning event/assignment write restrictions match the checked-in local rules. Result-email tracking remains backend-only reads/writes; whitelisted receipt/redemption/plan reads remain available.

The local unconditional `users` write rule is deliberately not copied. Original production public reads and whitelisted staff writes are retained because `DataContext` boots a whitelisted staff account through `setDoc(users/{uid})`, and `FirebaseApi` manages staff users. Existing direct `PublicCustomersList` non-manual Mark Paid transactions (`publicBookings`, `seats{eventId}`, `ticketSeatOwnership`) and terminal booking deletion keep their whitelist permissions. These compatibility requirements retain privileged direct-write/payment/deletion bypass risks; paid-record immutability is not established. Admin SDK checkout/payment/planning/redemption operations bypass client rules and continue to require proper service-account/IAM and endpoint authorization.

The candidate compiled and passed **247 permission checks** in an isolated synthetic Firestore emulator; the existing local customer emulator and production were untouched. This is a saved recommendation, not a deployment or active local rule modification. A later deploy of the unchanged local rules would replace the candidate and reintroduce anonymous user writes. [Full permissions comparison, structured assessment, evidence and release/manual acceptance](FIRESTORE_PRODUCTION_RULES_REVIEW_2026-10-13.md).

## 2026-10-13 — Redemption isolation audit and independent traffic budget

The redemption follow-up verifies that its mutations write only the protected collection and that existing checkout, fulfillment, seat, receipt, email and job modules remain unchanged. Five paired production-code purchase scenarios produce identical business-state/invoice/payment/confirmation outcomes with and without prior redemption. Staff seat assignment and same-session updates for later purchases preserve claims. Existing frontend API methods/router registrations and existing collection permissions are unchanged; earlier purchase-page recovery work remains separate.

`TicketRedemptionTraffic.js` adds a dedicated **100 requests/minute/IP** bucket, mounted before the three staff routes and their token/whitelist checks. The global limiter skips only registered `POST /api/v1/apcs/public-ticket/admin/redemption/{list|detail|claim}` paths (including Express's case/trailing-slash equivalents). All other API paths retain the original global limiter. Thus busy staff traffic cannot exhaust the buyer/payment/other-feature bucket; unauthenticated staff-route requests remain limited. The actual HTTP check confirms both independent ceilings using synthetic actors/controllers. No new database field/collection or transaction change is introduced by this repair.

The intentional guard still blocks moving/removing redeemed orchestra entitlements until corrected, while allowing later purchases and same-session updates. The complete follow-up passed **234 backend audits**, **311 frontend unit/logic tests with explicit Node-only shims**, **3 HTTP isolation checks** and **4 source comparisons**. [Scope, executable evidence and boundaries](audits/TICKET_REDEMPTION_ISOLATION_REVIEW_2026-10-13.md). Restart the backend normally to load the limiter; deployed production/browser/provider and peak-load acceptance remain separate.

## 2026-10-13 — Separate event-day Ticket Redemption

`AdminDashboard` menu key 28 opens `TicketRedemption.js`, separately from Public Customers, seat assignment and Orchestra Assignments. The page reads event choices and explicitly searches/loads bookings or looks up an exact Booking ID. It does not ask the customer to choose an already purchased/assigned session. Three whitelist-protected POST routes under `/api/v1/apcs/public-ticket/admin/redemption/` use `TicketRedemptionController` and the standard Promise-returning `TicketRedemptionRepository`; errors are awaited/caught by the controller, without the callback `DatabaseUtil` wrapper.

| Route | Input | Behavior |
| --- | --- | --- |
| `list` | `eventId`, optional `search`, `cursor` | Event-scoped document-ID scan, batches of 100, at most 500 examined documents/25 matches per request; excludes archived test bookings; returns next cursor and separate performance/orchestra redemption summaries |
| `detail` | `eventId`, `bookingId` | Fresh saved booking, event and covered orchestra assignment; separate allowances, remaining quantities/revision/session and latest 20 claim actions per allowance |
| `claim` | `eventId`, `bookingId`, `channel`, `requestId`, `expectedRevision`, `sessionKey`, `action: redeem`, `quantities` | Atomic paid/session/entitlement/revision check and partial handover by category; replaying the exact request ID does not increment again |
| `claim` (correction) | Same identity/revision fields, `action: undo`, `targetClaimId`, `reason` | Restores the referenced uncorrected claim once and appends a staff audit action; requires a nonempty reason of at most 500 characters |

**New collection:** `ticketRedemptions/{encodeURIComponent(JSON.stringify([eventId, channel, allowanceOwner]))}`. The owner is a booking ID for `performance`/`orchestra`, or the registration ID for `performers`. Each state contains `eventId`, `bookingId` (empty for the shared allowance), `registrantId`, `channel`, `redeemed` quantities by category, `revision`, `sessionKey`, `session`, `updatedAt`. Its `claims/{12-digit-padded revision}` subcollection contains `revision`, `action`, `quantities`, originating `bookingId`, `channel`, saved session, `actorUid`, `actorEmail`, server `claimedAt` and `requestId`; corrections add `targetClaimId`/`reason` and mark the original with `undoneBy`. `requests/{requestId}` stores the semantic signature and original result for durable replay. History uses the automatically indexed numeric `revision` descending; no composite index is added.

The model derives admission from existing data: paid performance ticket categories from `tickets`; paid direct orchestra categories from the purchased session; version-2 performance-linked orchestra ticket quantities from `orchestraAttendanceTickets` only when the assignment covers this booking and still matches an event orchestra session. That benefit is labeled Orchestra tickets without inventing a tier mapping from competition categories. Shared performer places use the saved assignment count once for the whole event/registration; mutation rechecks a covered paid version-2 winner booking with sufficient snapshotted performer count. Legacy complimentary tickets retain their saved quantity and orchestra session, without gaining new performer allowances. Masterclass redemption is excluded. Pending/failed/expired bookings show a payment block, and archived/wrong-event bookings are unavailable.

Every transaction reads the booking/event/assignment, stable redemption state, request key and any referenced claim/paid winner before writing. Revision checks reject concurrent stale staff requests; unchanged exact-key replays return their original result only when a redeemed claim remains active and its current entitlement/session is valid. Replaying an undone claim rejects, rather than authorizing a new physical handover. `OrchestraAssignmentRepository.assignGroup` reads all old/current booking orchestra states plus the shared performer state in its transaction, blocking moves to another session or removal of redeemed entitlements. Claims survive later purchases, assignment revisions and confirmation resends. Undoing all active claims permits a normal reassignment. Redemption never writes booking/payment status, numbered seats, inventory, capacity, attendance confirmation, awards or email delivery fields.

The frontend persists the exact pending operation in staff-scoped tab `sessionStorage` before HTTP. Transport failures, incomplete acknowledgements and HTTP 408/5xx keep it for retry; authentication/rate-limit failures also retain the saved attempt rather than discarding an earlier uncertain result. Definitive validation/conflict failures refresh the allowance. New claims stay disabled while an operation needs resolution. Staff confirm the buyer, session and category quantities, then hand over tickets after successful recording. Times are shown in Asia/Jakarta. No automatic event-date gate or public QR code is introduced.

Checked-in rules allow whitelisted state/history reads and prohibit client writes to the entire new collection, explicitly excluding it from the broad fallback. **Deploy these rules with the release**; local tests do not establish production rule state. Release the frontend/backend together and restart the backend normally to register the routes. No migration or customer-record rewrite is needed. [Operations, acceptance checklist and evidence](TICKET_REDEMPTION.md).

## 2026-10-13 — Refresh recovery keeps checkout identity across cart resets

`PublicTicketBookingPage.resetPurchaseChoices` resets selections/add-ons/quantities/layout and error display without deleting the existing sessionStorage attempt or clearing its key ref. As of 15 October, the nationality-derived payment mode survives these cart resets. A fresh component in the same tab can therefore reselect the same nationality and performance and rebuild the identical cart; `handleSubmit` compares the saved fingerprint and reuses its key. Changed cart details still create another key, while validated success still clears the completed attempt. Existing backend event/key → booking/requestFingerprint replay, inventory and provider logic remain unchanged; no schema, collection or backend data-flow modification was introduced.

Current evidence: five added frontend regressions and an actual page/API/repository offline probe verify refresh recovery, one booking/invoice/reservation, changed-cart behavior, preparation retries and post-success new purchases. All 39 focused frontend checks pass. Display-metadata fingerprint alignment and existing replay's current-sale validation remain open. [Repair and walkthrough](audits/PUBLIC_CHECKOUT_IDEMPOTENCY_REVIEW_2026-10-13.md#authorized-refresh-recovery-repair).

## 2026-10-13 — Idempotency review: transactional replay versus frontend key lifetime

`ticketCheckoutKeys` stores event/key → booking/requestFingerprint in the same transaction as booking/inventory. Ten simultaneous same-key requests and a later replay converged on one reservation/invoice in two isolated real-Firestore checks. Frontend same-page retry also retains the saved sessionStorage key after an uncertain result.

The review initially found three gaps outside that transaction: reset deleted the saved attempt after state recreation, frontend fingerprinting included ticket name/price/order unlike backend normalized ID/quantity fingerprinting, and current sale validation preceded replay lookup. The reset/key-lifetime issue is now repaired above; the fingerprint and sale-gate issues remain. Initial offline probes and the new repaired-refresh results are both preserved. No schema/data-flow change was implemented by the review or subsequent frontend-only refresh repair. [Current evidence and scoped follow-up](audits/PUBLIC_CHECKOUT_IDEMPOTENCY_REVIEW_2026-10-13.md).

## 2026-10-13 — Checkout response recovery and APCS email status

`apis.publicTicket.createBooking` makes its own Axios request with a 90-second timeout and rejects failures rather than routing through the shared wrapper that could return `{ error: undefined }`. `PublicTicketBookingPage.handleSubmit` validates the returned booking ID/link, keeps the saved sessionStorage checkout key after an uncertain result, and uses the existing backend idempotency record when unchanged details are retried. A known paid result can navigate without a payment URL; pending manual mode retains the payment-instructions route.

`PublicTicketController.createPublicTicketBooking` returns HTTP 202 for a saved Paper.id booking whose original invoice request has not yet produced its link. Its response contains the existing booking ID/payment state and a recovery message; it does not create another invoice or send an empty-link holding email. The original request persists its invoice and proceeds normally. The existing `publicBookings`, `ticketCheckoutKeys`, payment receipts, inventory and confirmation-send fields are unchanged; no collection, field, migration or database write is introduced by this repair.

Public Customers' **APCS Email Status** combines payment state with the existing `emailSent` flag: unpaid pending means AWAITING PAYMENT; unpaid terminal means NOT APPLICABLE; paid true/false/absent mean SENT/FAILED/NOT SENT. Pending manual mode continues to read `manualInstructionsEmailSent`. Provider invoice delivery and APCS holding email are not inferred from this paid-confirmation flag. [Evidence, regression results and owner walkthrough](audits/PUBLIC_CHECKOUT_RESPONSE_DIAGNOSIS_2026-10-13.md#authorized-repair-after-the-owners-follow-up).

## 2026-10-11 — Attendance chips and filters in session assignment

`AdminContent.js` embeds `SessionAssignmentManager`; current registrations and hydrated APCS2025 guests already include `willAttend` from existing reads. Shared `AttendanceStatusChip` displays strict booleans as Attending/Not attending and missing/non-boolean values as Not imported on unassigned/assigned cards, Overview registrants, orchestra roster rows and selector choices/tags.

One attendance filter defaults to All attendance statuses, is shared by the board and Overview's Registrants view, and resets on event loading. It composes with searches and pool category filters. Performance lists/Overview retain full original indices for drag-and-drop/order numbering. Membership, source-event/category summaries, video totals, event statistics, teacher lists and saved payloads stay complete; shown counts are separate. Orchestra options filter new candidates but retain selected members. Read-only tags and the roster follow the filter. Status changes clear pending swap selections.

This is presentation state only: no new Firestore read/write, schema, backend input or ticket/assignment eligibility rule. Reload the board after importing confirmations to refresh its snapshot. [Owner acceptance](SESSION_ATTENDANCE_WALKTHROUGH.md).

## 2026-10-10 — Group registrant summaries by source event and category

`GroupRegistrantSummary.js` renders a compact summary on every performance-group header, each performance column in Session Overview and each orchestra attendance group's identity cell. `groupRegistrantSummary.js` derives rows from the group's complete hydrated membership in `assignments[groupId]`, using saved `eventId` and `competitionCategory`. Columns show APCS2025, APCS2026 and Total; category rows include every present competition category, including Piano and Guzheng, with a Total registrants footer. The two requested event columns remain visible at zero; any other source event gets its own column.

Counts represent registrations, so an ensemble counts once. Known competition labels use `competitionList` casing; category matching trims whitespace and ignores case, while unrecognized categories remain visible. Missing categories display Not set. Missing/null/empty eventId on a real legacy registration follows the existing APCS2025 convention. A missing-document placeholder instead displays Unknown event / Registrant unavailable rather than being miscounted as APCS2025.

**Teacher totals (14 October 2026):** The shared summary also shows **Total teachers** immediately below **Total registrants**, using `teacherName` already present on hydrated group registrations. Names are trimmed and deduplicated case-insensitively, matching the Overview Teachers convention; blank/non-string names and missing-document placeholders are excluded. Each source-event column counts its own unique teachers, while Total deduplicates across the full group, so a teacher present in both years contributes one to the group total. Ensembles use the one saved registration teacher. All three summary placements use complete membership regardless of search/category/attendance filters; no new query, backend input, schema, collection or write path is added.

Summary counts update from local draft membership after additions, removals, moves, swaps or discard, remain visible on collapsed/read-only groups, and do not change when staff search/filter the pool or attendance roster. Performance and attendance summaries count their own membership independently. No queries, backend inputs, collections, schema or assignment writes are added. [Manual acceptance steps](SESSION_GROUP_SUMMARY_WALKTHROUGH.md).

## 2026-10-10 — Performance video playback during session assignment

`AdminContent.js` embeds `SessionAssignmentManager.js`. Its unassigned registrant cards, assigned performance cards and registrant rows in Session Overview expose **Play video** using the already loaded `Registrants2025.videoPerformanceS3Link`. This includes loaded/hydrated guest registrations and read-only published sessions. Missing/blank links disable the button with an explanatory tooltip.

The board resolves raw keys, `s3://bucket/<key>` values and full S3/CDN URLs to the existing Jury Dashboard CloudFront domain. Raw keys and S3 URI filenames are encoded by path segment to preserve spaces, Unicode, `#`, `?` and `%`. Playback opens an Ant Design modal with the performer name, native video controls and an **Open video in a new tab** fallback. Invalid saved links produce a message; media failures produce a visible alert. Closing the modal or switching events removes the player. Play clicks stop propagation to card swap handling, and drag starts on the play control are prevented.

This adds no Firestore query, backend request, collection, schema or write path. The existing registration upload already saves the video location; viewing it supplies no new assignment input. Draft membership, ordering, saving and publication retain their existing behavior. [Manual acceptance walkthrough](SESSION_VIDEO_WALKTHROUGH.md).

## 2026-10-10 — APCS2025 guest registrants in APCS2026

`AdminContent.js` embeds `SessionAssignmentManager.js`; the board exposes **Other Event Registrants** for APCS2026 planning events. Staff explicitly load APCS2025. `guestRegistrants.js` scans the existing `Registrants2025` collection in pages of 200 ordered by document ID, then selects explicit APCS2025 records and records with missing/null/empty `eventId`. This explicit scan is necessary because equality queries cannot retrieve an absent field. Missing `createdAt` does not exclude a record. It adds no full collection scan on APCS2026 mount. The current-event query, event registration statistics, teacher award statistics and automatic assignment remain scoped to current-event registrations.

Guests are separate frontend state, merged by document ID only for manual performance assignment and orchestra selectors. Search/category filters follow the active tab. Cards and attendee options show the source event. Both purposes persist original registration IDs using existing revision-checked `competitionSessionPlans/{eventId}/groups/{groupId}.registrantIds`. Saved IDs outside the current-event query hydrate in batches of up to 30 by document ID before the board is usable. Missing documents stay as placeholders and block publication. Source loading failures are visible; late results are invalidated on event switch/reload. Seat Occupancy's explicitly loaded lookup also hydrates assigned IDs outside its active-event query, so guest performer names remain searchable.

**Published schema extension:** competition entries in `sessionAssignments/{eventId}.assignments[sessionKey][]` now include `sourceEventId` alongside `registrantId` and `order`. Publication derives this value from the actual registration document, with absent/null/empty eventId interpreted as APCS2025. It accepts same-event registrations plus the specific APCS2025 → APCS2026 guest relationship for both group purposes; missing records and other source events remain rejected. Source registration documents, awards and video fields are never copied or changed. No collection or Firestore index is added.

Discovery and checkout recognize a cross-event performer only when its actual source is APCS2025 and its APCS2026 published performance entry carries the matching sourceEventId. Checkout revalidates the source marker, actual record, performance membership, attendance-only exclusion and award in its inventory transaction. Historical records may use `achievement` when `finalAward` is absent; this fallback applies only to APCS2025 records. Current-event result rules, daily winner-tier rules, readiness, seat ownership/capacity and payments retain their existing guards. Missing award is not fabricated and still blocks ticketing. Missing video or duration does not block grouping; blank/missing/invalid videoDuration displays Unknown and is omitted from the known duration total.

This extension applies to editable APCS2026 planning drafts. Existing published plans stay read-only and are not migrated. Release frontend and backend together; the backend needs its normal restart/release to load the changed code. [Staff acceptance walkthrough](GUEST_REGISTRANTS_WALKTHROUGH.md).

## 2026-10-09 — Seat Occupancy registrant/reservation lookup

`SeatOccupancy.js` adds an explicitly loaded, read-only competition lookup. It paginates `Registrants2025` and `publicBookings` by active `eventId` in pages of 200, reads `sessionAssignments/{eventId}`, and paginates the already configured generated competition seat scopes by venue/session. No collection is read for this lookup on mount. The pure `src/utils/seatOccupancyLookup.js` joins performer assignment entries by registration ID and joins current booked/reserved/locked seat records to individual reservations by `bookingId` or `lockedByBookingId`. Legacy holder metadata is presented separately when no matching booking is loaded. Performer names come from `performers[]` with full/first/last-name and legacy-string support; top-level registration `name` is searchable contact metadata, not the displayed performer identity.

Search filters the snapshot locally by all case-insensitive whitespace-normalized words across performer names, contact/teacher metadata for assignment rows, buyer names and identifying IDs. Rows preserve venue/date/time, reference ID, record type and payment/assignment status. Archived test bookings and orchestra scopes are excluded. Assignment is not admission/payment proof; an unmatched paid booking displays Awaiting seat assignment, without inferring seats from stale saved labels/IDs. Explicit refresh clears old results until all reads succeed; event changes clear data and invalidate pending lookup requests. No backend endpoint, schema, collection, index, admission policy or write path changes. See the name-lookup sections in both ticketing guides for owner acceptance steps.

## 2026-10-09 — Checkout timetable authority

Direct public orchestra checkout validates its exact venue/date/time against `events.orchestraSessions`, with venue existence verified against `events.venues`. Competition checkout validates against `events.venues[].sessions` and retains its readiness/assignment/capacity checks. Both availability guards read the authoritative session type, including a fresh event read inside the booking transaction; removed/replaced sessions and removed venues are rejected before invoice creation. This uses existing event, booking, capacity and payment records without a collection or schema migration. Orchestra admission remains free seating with staff-managed capacity and no numbered-chair ownership. See [repair evidence](audits/TICKETING_ORCHESTRA_SEAT_DIAGNOSIS_2026-10-09.md#authorized-repair-and-regression-results); the running backend must restart to load the repair.

## 2026-10-09 — Local obsolete venue-time cleanup

Owner-approved local cleanup removed only the old Behring `2026-11-14` `08:00-09:00` entry from `events/APCS2026.venues[].sessions`, preserving Group 1's private draft slot. Existing venue timetable entries and private `draftSlots` are separate data sources: publication rejects overlaps with either source, even when their time strings are identical. No schema or collection changed.

Preflight found no published assignments, active bookings, event seats/capacity/ownership or matching special session. A private ignored backup preceded a snapshot-checked transaction; event/plan draft revisions advanced 31 → 32. Readback verified the exact event change and preserved draft slots/groups/assignments. Repository publication preview now passes with no errors. [Execution, backup and manual follow-up](LOCAL_FIRESTORE.md#2026-10-09--removed-obsolete-local-venue-timetable-entry). Production and publication were not touched.

## 2026-10-09 — Independent performance and orchestra attendance assignments

`AdminContent.js` still renders `SessionAssignmentManager`. Its upper board and Overview now show competition groups only; the lower `OrchestraAttendanceTable` edits attendance membership using the same loaded event registrants, including those with a performance assignment. Counts and the left unassigned pool consider performance membership only. Both sections share draft save, revision protection, discard and event-switch handling. Clear All explicitly clears both sections; deleting a group removes only that group's membership.

The 9 October change retained existing `competitionSessionPlans/{eventId}/groups/{groupId}` documents with `purpose` and `registrantIds`, without adding a collection or field. The optional `orchestraSessionId` added on 14 October is described above. SaveGroup, full-board save and publication enforce at most one group **per purpose** for each registration. One competition membership plus one orchestra attendance membership is valid. Missing purpose still means competition; duplicate membership within a type is rejected. Attendance groups retain venue/date and null performer-session/time fields.

Publication derives `sessionAssignments/{eventId}.attendanceOnlyRegistrantIds` as **attendance members minus competition members**. Ordered `assignments` and venue times still come only from competition groups. Readiness recomputes this same exclusion set. Existing public/winner discovery and checkout guards use that projection: dual members retain their performance, while an attendee without a performance remains excluded. No ticket, payment, admission allocation or paid `orchestraAssignments` record is created by this table.

Draft groups load into the appropriate section automatically. Existing published projections are not rewritten by this code change; a published inconsistency requires separately reviewed reconciliation, rather than bypassing the read-only/ticket-activity safeguards. Backend and frontend changes must be released together. [Manual acceptance](ORCHESTRA_ATTENDANCE_WALKTHROUGH.md).
## 2026-10-09 — Local performer-session seed utility

`apcs_service/scripts/seed_local_performer_sessions.js` reads the event, plan parent and ordered saved groups only from the `apcs-profile` emulator on `127.0.0.1:8081`. It reserves linked slots, reuses matching unused sessions and adds only missing competition slots with saved venue/date. Missing times on new or reused slots are filled with one-hour sample ranges every two hours from 08:00, avoiding same-venue/date overlaps and preserving existing times; attendance groups are skipped. It uses the existing `{ slotId, venueId, date, start, end }` schema, with no new collections or fields. Output pairing is a suggestion, not a persisted assignment.

Apply saves an ignored private JSON backup, checks that the complete read snapshot is unchanged in a Firestore transaction, and updates `competitionSessionPlans/{eventId}.draftSlots/revision/updatedAt` and `events/{eventId}.competitionScheduleState.revision`. Linked groups whose slots receive times have cached `start/end/updatedAt` synchronized, matching the repository saveSlot path. Revisions advance together once. Group links/members, published venue sessions, seats and buyer gates are preserved. With sufficient matching, timed slots a rerun writes nothing. The installed Admin SDK's Firestore class is used directly without application initialization or production credentials. [Commands, local execution and manual acceptance](LOCAL_FIRESTORE.md#seed-performer-sessions-from-saved-local-groups).

## 2026-10-07 — Implemented ticketing repair batch (payment receipts, seat writes, attendance groups, orchestra capacity)

Implemented from the [repair plan](TICKETING_REPAIR_PLAN_2026-10-07.md). The sections further down describe the state before this batch and stay as history.

### New collection: `ticketPaymentReceipts/{encode(bookingId|providerInvoiceId)}`

The backend writes these; Firestore rules give whitelisted users read access and deny all client writes. One document exists per (public booking, provider invoice ID). It is written **before** fulfillment by both Paper.id callback routes.

| Field | Meaning |
| --- | --- |
| `bookingId`, `providerInvoiceId`, `payload` | Callback reference, invoice ID as reported by the callback (untrusted until matched or verified), and the full paid payload |
| `status` | `pending` (replayable), `processed` (the booking is PAID), `needs_review` (automation stopped; staff reconcile with Paper.id), `ignored` (archived test booking) |
| `reason`, `lastError` | Last outcome, e.g. `fulfillment_failed`, `awaiting_invoice_identity`, `provider_not_paid`, `provider_verification_unavailable`, `invoice_mismatch`, `payment_amount_mismatch`, `booking_canceled_before_payment`, `booking_released_before_payment`, `provider_invoice_not_for_booking`, `retry_limit_reached` |
| `attempts`, `nextAttemptAt` (ms), `deliveryCount`, `receivedAt`, `lastReceivedAt`, `lastAttemptAt`, `processedAt` | Retry, backoff and duplicate-delivery bookkeeping. Backoff runs from 1 to 30 minutes; after 48 attempts the receipt becomes `needs_review`. |

**Data flow.** Callback → booking lookup (a lookup failure returns HTTP 500) → archived guard → `recordPaymentReceipt` transaction (a failure returns HTTP 500 `RECEIPT_NOT_STORED`) → `reconcilePaymentReceipt` → `handlePublicTicketWebhookPaid(bookingId, payload, { receiptRef, verifiedInvoice })`. That function marks the receipt `processed` in the same transaction that sets the booking `PAID`. HTTP 200 (`OK` or `RECEIVED_FOR_RECONCILIATION`) is returned only after the receipt exists. The confirmation email is sent once, by the caller that performed the paid transition.

**Trust.** A pending booking's saved `invoiceId` is matched exactly, as before. When the booking has no saved invoice ID, or is `failed` with inventory still held (`checkoutFailure.cleanupStatus !== 'complete'`), the receipt is applied only after `PaperRepository.getInvoice(id)` — Paper.id's documented `GET {PAPER_BASE_URL}/sales-invoices/{invoice_id}` with API credentials — returns `number == bookingId`, `payment_status == paid` and `total == totalAmount`. The verified invoice ID is then adopted. Unverified receipts never release, book or change inventory.

**Replay.** `PublicTicketController.createPublicTicketBooking` replays pending receipts for its booking after the invoice is saved (early callbacks). `src/jobs/PublicTicketPaymentRecoveryJob.js` runs 15 s after startup and every 2 minutes, processing due `pending` receipts (restart recovery). Both queries are single-field (`status`, `bookingId`); no composite index is required.

### New and changed fields

- `publicBookings.paymentReceipt`: `{ receiptId, status, reason }` staff marker shown on Public Customers.
- `publicBookings.paymentVerification`: `{ source: 'paper_sales_invoice_api', invoiceId, recoveredFromStatus, verifiedAt }`, set when a booking was paid through provider-verified recovery.
- `publicBookings.paymentReconciliation` / `ticketPaymentReceipts.reconciliation`: staff-verified expired-payment recovery audit, source `admin_paper_dashboard`, described above. Processed receipt reason `admin_reconciled` distinguishes this from automatic provider verification.
- `publicBookings.seatAssignments[]`: `{ seatIds, assignedByUid, assignedByEmail, assignedAt }`; `physicalSeatKeys` now stays aligned with `selectedSeatIds` after staff assignment.
- `competitionSessionPlans/{eventId}/groups/{groupId}.purpose`: `competition` (the default; a missing value means competition) or `orchestra_attendance`. Attendance groups store venue and date, `slotId/start/end: null`.
- `competitionSessionPlans/{eventId}/groups/{groupId}.orchestraSessionId`: optional/null exact orchestra session link for attendance planning, added on 14 October. A validated read-only suggestion for later paid assignment; it grants no admission and does not affect publication or existing confirmed assignments.
- `sessionAssignments/{eventId}.attendanceOnlyRegistrantIds`: written by publish; as refined on 9 October, attendance members minus competition members. Discovery skips these attendance-only registrants, and checkout rejects them before and inside its transaction. `assignments` contain only competition groups.
- `ticketCapacity.capacityPolicy`: `numbered_layout` for competition sessions (`capacityByTier` enforced) or `staff_managed` for orchestra sessions (`capacityByTier: null`; `reservedByTier` is an exact headcount with no ceiling).
- `events.orchestraSessions[].complimentaryQuota` is informational. Assignment and Orchestra Settings no longer reject because of it or because of the competition `seatConfig`. `freeSeatingAssigned` stays an exact transactional counter.

### New protected endpoints (Firebase ID token and whitelist)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/public-ticket/admin/assign-seats` | `{ bookingId, seatIds }`. Runs one Admin SDK transaction that reads the booking, seats, canonical ownership and alias queries, then books the seats. Replaces the browser `Transaction.get(Query)` path. |
| POST | `/public-ticket/admin/seats/generate` | `{ eventId, venueId, sessionIds }`. Generates chunked transactions that skip locked, booked or referenced seats and canonically owned chairs, then sets the `sessionsSeatsGenerated` flags. `uploadFullSeatLayout` in `SeatEvent.js` calls it. |

Unchanged deferred boundaries: callback authenticity for a normal pending booking whose saved invoice ID matches, the unprotected global-settings route, rate limiting, slow-checkout recovery and the legacy capacity writer.

## 2026-10-07 — Pending attendance classification and repair boundaries

The [final agent prompt](TICKETING_REPAIR_PROMPT_2026-10-07.md) references the handoff's complete source/data-path/evidence map and owner-approved policy choices. It is a work request, not a new implemented schema or data flow.

Additional domain clarification: `venues[].seatConfig` is the competition seating layout, while orchestra admission can use a larger flexible layout. The current code uses it for orchestra settings/assignment total checks and direct orchestra tier/total checks. The owner chose **no system orchestra capacity ceiling with staff-managed admission**; [the handoff](TICKETING_REPAIR_HANDOFF_2026-10-07.md#subsequent-clarification-orchestra-capacity-differs-from-competition-layout) records the selected decoupling without a new session-capacity model or pre-payment admission reservation redesign. Competition capacity, payment safeguards and transactional counters remain requirements. The separate performance-quota semantics must be explicit in the next plan. No removed guards or schema changes have been implemented.

The [repair handoff](TICKETING_REPAIR_HANDOFF_2026-10-07.md#existing-data-path-traced-in-this-chat) traces AdminContent → SessionAssignmentManager → authenticated competition-planning API → `competitionSessionPlans/{eventId}/groups` → publication into `sessionAssignments`/venue times → backend discovery/checkout. All current planning groups are projected as competition sessions; current save paths explicitly persist known fields and have no attendance classification. A UI-only flag would be lost and would leave stale/forged checkout paths unprotected.

Requested **Orchestra attendance** groups classify/hide members; admission remains separate, with no automatic capacity reservation or paid entitlement. Admin planning groups are distinct from paid orchestra groups derived by `(eventId, registrantId)`. Schema choice, scheduling/publication treatment and any durable payment receipt/recovery mechanism must be finalized in the next implementation plan and documented here when implemented. No collection, schema, application flow or production data changed in this documentation handoff. Legacy migration and the original paid-orchestra quota guarantee are excluded/deferred, without erasing the audit findings.


## 2026-10-07 — Real ticketing transaction and staging verification

Follow-up testing used real server SDK transactions against an empty fixed demo project on port 8082 and an independent fresh local QA event on port 8081 for the running API/ngrok. **13 safety assertions passed, 7 failed**; [results and boundaries](TICKETING_READINESS_AUDIT_2026-10-07.md#follow-up-real-emulator-transactions-and-paperid-staging). Main checkout ownership/capacity guards passed contention tests, but durable payment recovery, callback authenticity, the generation boundary, Web SDK assignment and checkout-guaranteed orchestra entitlement remain unresolved. Actual staging callbacks saved PAID/receipts for all three purchase types; independent provider reads and owner email receipt confirmed those happy paths. Slow checkout and shared-IP rate limiting reproduced customer blocking paths.

No production collections, schema or application flow changed. Synthetic records use the existing settings/events/registration/assignment, seats, bookings, capacity, ownership and checkout-key collections. `firebase.ticketing-audit.json` targets port 8082; the audit refuses any other host or a nonempty demo database, and substitutes all external integrations. The API's separate port-8081 QA database remains available for owner review. Private staging records/tokens remain ignored; the saved local snapshot is unchanged.

## 2026-10-07 — Ticketing readiness and recovery boundary review

The [current readiness audit](TICKETING_READINESS_AUDIT_2026-10-07.md) documents unresolved source-level boundaries: paid callbacks have no durable receipt/replay record before fulfillment, invoice identity is saved after external creation, and ambiguous failed invoices lack an automatic paid reconciliation path. Canonical seat ownership protects the normal checkout, but unconditional seat regeneration can invalidate its locks, legacy reservations bypass paid-capacity accounting, and frontend staff assignment incorrectly passes a Query to Web `Transaction.get`. Paid performance-linked orchestra demand is recorded before its later quota assignment, without a checkout guarantee that all sold attendance fits. Callback and global-settings write routes lack application authentication/verification.

This review adds no collections, schema fields or application data flow. Existing `publicBookings`, `ticketCapacity`, `ticketSeatOwnership`, legacy booking and orchestra assignment records retain their implementation. The live production event was still draft with closed eligibility on 7 October; 153 existing offline checks passed while 11 diagnostic observations exposed additional open gaps. Older implementation sections below describe historical stages, not a complete launch certification.

## 2026-10-05 — Venue image save correction

- Venue Settings image/name-only edits now call `POST /venue-settings/:eventId/:venueId/metadata` with a current Firebase ID token. Whitelist authentication is required. This avoids the browser Firestore rule that protects the whole `venues` array for planning events.
- The backend transaction reads the latest event and changes only the selected venue's label and HTTPS image URL. Sessions, seat configuration, extra venue fields, other venues and schedule state are preserved. Stale label/image edits are rejected with a refresh message.
- Upload completion is required before saving; download-URL errors are caught and specific save failures are displayed. SVG files continue through the existing Firebase Storage upload path; no Storage permissions were changed.
- Scope: image/name-only edits to existing venues. Adding/deleting venues or changing seat capacity retains the existing protected flow; this endpoint does not bypass those safeguards.
- Offline verification: metadata transaction regression tests and frontend lint. Manual acceptance: edit Behring, upload `Behring-01.svg`, wait for upload success, save, then reopen and confirm the new image and unchanged seat rows/sessions. Frontend and backend must both include this change. Browser, deployed Storage rules and production acceptance remain unverified.


## 2026-10-04 — Visible group assigned times

- Admin Page group headers show a dedicated gold **Assigned time: HH:mm-HH:mm** badge below the heading, including collapsed groups whose videos fit within the session. Groups without a time show **Time not assigned**. Video totals and overrun warnings remain separate.
- The badge uses the board's existing `session.time`, resolved from the linked planning slot (or the legacy event timeslot). It reflects current board edits; use Save to persist them. No new data reads, writes or schema changes. Headers and video metadata wrap when space is limited.
- Manual walkthrough: check the saved second group shows **Assigned time: 09:00-10:00** without an overrun warning; check the first and third retain their time badges and overrun warnings; check a group without a final time shows **Time not assigned**. Edit its linked session, keep it on the board, save and reopen to confirm the badge reflects the saved time.

## 2026-10-04 — Performer session usage markers

- Performer Sessions shows a gold **Used in Admin Page** marker with the linked group label for draft and published planning sessions. A linked draft counts as used even before performers are assigned. Legacy sessions show the saved registration count; empty assignments are **Unused**. Seat generation remains a separate status.
- Usage comes from the existing event planning state or the event-scoped assignment API used by AdminContent's SessionAssignmentManager. Unsaved Admin Page edits are reflected after saving and reopening Performer Sessions. Failed reads show **Usage unavailable**, rather than incorrectly marking sessions unused. No schema or write-path changes.
- Manual walkthrough: save a linked group on Admin Page, reopen Performer Sessions and check its gold marker and label; check an unlinked draft shows Unused. For published sessions verify both usage and seat-generation labels. For legacy events save an assignment and verify its registration count. Browser verification remains with the owner.

## Event-wide winner invitations — 2 October 2026

Scoring Recap's header exposes **Send to All Winners** only for the selected APCS2026 event, independent of competition category and table filters. `loadEventResultEmailRows.js` reads `Registrants2025` with `eventId == APCS2026` in pages of 100, then linked `JuryScores2025` in registration-ID groups of ten with paginated results. Legacy scores without eventId remain linked by registration. Current video-penalty configuration and the existing calculator/sync guard validate the results; read failures block preparation.

The sender previews Silver, Gold, Diamond and Sapphire performers in requests of at most 40 registration IDs and shows competition category. One selected guidelines PDF is reused for the campaign. Before sending, fresh event rows must pass sync validation and the eligible registration list must match the preview. Backend recipient snapshots and existing delivery records still protect each send. No new endpoint, collection or schema is introduced. Sending uses the existing sequential browser campaign; keep the modal/page open until it finishes.

## Registrant Dashboard award filter — 2 October 2026

The main Registrant Dashboard adds a clearable **Filter by Award** selector for Gold, Diamond, Silver, Fail and Sapphire. It passes an optional trailing `awardFilter` argument to `useFetchRegistrantsData.js`, which matches the existing `Registrants2025.finalAward` field case-insensitively after trimming whitespace. The filter combines with existing searches and filters before totals, pagination and `filteredData` are derived, so the filtered Excel export uses the same registration set. Changing or clearing the selector resets the page to 1. Missing awards are excluded from Fail.

Filtering uses saved awards; the Result column can calculate a newer award from jury scores loaded for visible rows. Use **Sync Awards** after scoring or penalty changes to refresh saved results. The selector's hover hint states this distinction. No new reads, endpoints, collections, schema changes or writes are introduced by filtering.

## Scoring Recap all-registrants Excel export — 29 September 2026

`ScoringRecap.js` adds **Export All Registrants to Excel** beside the winner comment-sheet ZIP export. On click, it reads `Registrants2025` filtered by the selected `eventId`, then reads `JuryScores2025` for each distinct competition category present in those registrations and links scores by `registrantId`. It loads the selected event's video-penalty configuration and uses the existing `calculateRegistrantScoreAndAward` calculation, including manual/video penalties, rather than relying on potentially stale saved awards. A read failure cancels the export rather than downloading a partial workbook.

The ExcelJS workbook contains one worksheet, **All Registrants**, and exactly three columns: **Full Name**, **Competition Category**, **Award**. Every registration is included, regardless of category/search/status filters, pagination, payment status or jury finalization; calculated results from unfinished scoring are provisional. Winners and Fail results are included, and unscored/invalid-score results use `N/A`. Ensemble performer names share one registration row joined with ` & `. Names come from `performers[].fullName` with first/last-name fallback, never the top-level registration-contact name; absent performer names use `Unknown`, and absent categories use `Unassigned`. Rows sort by competition category and full name. The download is `ALL_REGISTRANTS_<eventId>_<YYYY-MM-DD>.xlsx`. No new collections, schema changes or database writes are introduced.

## Scoring result announcement emails — 28 September 2026

Scoring Recap's **Send Winner Emails** and **Send Non-Qualifier Emails** prepare performer-level messages for finalized rows in the currently filtered APCS2026 table. The frontend selects separate local comment-sheet and E-certificate folders for non-qualifiers or one shared winner guidelines PDF, displays recipients/attachments, and sends only after a preview and confirmation. Each message goes to `Registrants2025.performers[index].email`, greeting that performer's `fullName` or first/last name. No registration-contact fallback is used. All four winning tiers, including Sapphire, receive invitations. The invitation renders a saved Sapphire result as **DIAMOND WINNER** in HTML and plain text for a later separate announcement; preview eligibility and the delivery record retain the actual saved Sapphire tier. Only Fail results receive non-qualifier emails. No existing scoring, registration, assignment, or ticketing records are changed.

`ScoringResultEmailRoute` exposes authenticated POST `preview`, `send`, and `test` endpoints at `/api/v1/apcs/scoring-result-emails/`. It uses the existing Firebase-token/whitelist middleware, authenticates before a dedicated 12 MB JSON parser for two PDFs, and preserves the 1 MB parser for other routes. Each PDF is at most 4 MB decoded, has a PDF header/end marker and safe `.pdf` filename, and is transmitted as base64 rather than a local server path. Non-qualifier comment-sheet and E-certificate PDF basenames must independently match the current performer name. The browser additionally blocks duplicate performers/files and missing matches across the campaign. Winners have one attachment; non-qualifiers have two, renamed distinctly for the email. File contents are not persisted.

The non-qualifier preview also supports an explicit per-row **Choose Comment + Choose Certificate → Send One** action. It sends through the same `send` endpoint with `manualAttachmentSelection: true`, the selected `registrantId` and `performerIndex`, both PDFs and the existing preview snapshot. The backend still verifies current Fail/finalized results, performer identity/email, both exact PDF basenames, and the same delivery reservation/status record. Explicit selection removes only the same-name automatic-matching restriction for that one send; folder-based batch matching remains blocked for duplicate names. A confirmation shows the selected recipient, registration, performer index and both PDFs before sending. No new collection or delivery identity is introduced.

The backend reloads the selected registration and uses saved `finalAward` and numeric `averageScore`, produced by the existing Sync Awards flow. It reads the event to reject an outdated `videoPenaltyConfigRevision` and queries `JuryScores2025` by `registrantId` only to check finalization and membership. All score records must be finalized, with matching event/category where those fields exist; legacy scores without `eventId` remain linked through the registration. It does not calculate scores or award thresholds. The original frontend `scoringCalculator.js` remains the single calculation implementation for dashboards, exports and award synchronization; no shared package or backend calculator is required.

The preview endpoint processes at most six registrations concurrently and at most six delivery-status reads per registration while preserving the requested order. The per-registration validation and delivery-state reads remain authoritative; the bounded concurrency removes the previous sequential wait across the list. This changes no collection, schema or send transaction.

Before preparing either campaign, the frontend blocks the whole filtered scope if any finalized row has `needsAwardSync` or lacks valid saved results; it also repeats the guard before sending. Staff must run Sync Awards and refresh Scoring Recap after jury/admin-score, manual-penalty or video-rule changes. Saved records have no input fingerprint or sync timestamp: the backend cannot independently detect an unsynced jury/penalty edit when the rule revision is unchanged. This workflow guard depends on the currently loaded frontend data; edits made in another session require refreshing before sending. Saved recipient/result validation and delivery reservation occur in one Firestore transaction; the preview snapshot must match the current performer, saved score, award and rule revision.

For ensemble registrations, both comment-sheet and certificate PDFs may list complete performer names separated by `&`. For example, `NATANIA JANICE & GRACE FRANEL CHAO.pdf` matches either full name, ignoring whitespace, case and Unicode composition. Each performer receives the shared PDFs separately. Folder matching, Send One and backend validation use this rule. Partial names and multiple matching files remain blocked; solo filenames must match the whole performer name.

The preview includes the existing registration PerformanceCategory as display/matching metadata, outside the unchanged recipient snapshot. No new collection or schema is introduced.

### `scoringResultEmailDeliveries`

One backend-only record per `(eventId, registrantId, performerIndex, kind)`, with a SHA-256 document ID of the JSON-encoded tuple. Fields include `eventId`, `registrantId`, `performerIndex`, `kind`, `name`, `email`, `award`, `snapshot`, `status`, `attemptId`, `actor`, epoch-millisecond `startedAt`/`finishedAt`, attachment filename/SHA-256, optional non-qualifier `certificateFilename`/`certificateSha256`, content SHA-256, and optional SMTP `messageId` or safe failure description. No PDFs or message bodies are stored. The Firestore browser catch-all excludes this collection; Admin SDK handles reads/writes.

States: a transaction reserves `sending`; accepted mail becomes `sent`; explicit SMTP rejection becomes `failed`; ambiguous network failures become `uncertain`. Sent records are skipped, failures may retry, and sending/uncertain records never expire into retryable state automatically. SMTP acceptance and tracking persistence are not atomic: a crash or persistence failure can leave `sending` after successful delivery. Provider verification and a separately authorized narrow repair are required before retrying. Tracking assumes performer-array order is stable; reordering after sending requires history reconciliation. Intentional resends or result corrections require separate review.

Dummy tests use fictional **Alex Example**, a `[TEST]` subject and a server-fixed `renaldolouis555@gmail.com` destination, with no production delivery records. The non-qualifier test has generated dummy E-certificate and comment-sheet PDFs; the winner test has the selected guidelines PDF or a generated dummy. See [the walkthrough](SCORING_RESULT_EMAIL_WALKTHROUGH.md) for campaign scope, retries, rollout and owner acceptance. The implementation does not claim deployed Firestore rules, SMTP delivery or browser validation.

This document describes the Firestore data model, API contracts, and system flows for the APCS project. It serves as the single source of truth for developers working on the codebase.

> Ticketing was audited on 6 September 2026. Its current implementation has unresolved correctness and authorization defects; see [the audit](TICKETING_AUDIT_2026-09-06.md), [technical flow](SEAT_BOOKING_FLOW.md), and [staff guide](TICKETING_SYSTEM_GUIDE.md). Configuration examples are illustrative, not confirmation of deployed data.

---

## Current ticketing contract — 23 September 2026

The free-seating sections in [SEAT_BOOKING_FLOW.md](SEAT_BOOKING_FLOW.md) and [TICKETING_SYSTEM_GUIDE.md](TICKETING_SYSTEM_GUIDE.md) supersede older numbered-orchestra and Masterclass checkout examples later in this document. Those older sections describe historical records and audit history, not new-sale behavior.

### New booking fields and ownership

New `publicBookings` use `ticketingVersion: 2`, `bookingType` (`winner`, `public_competition`, `public_orchestra`, or `public_competition_legacy` for an older request without a performance), `paymentMode` (`paper_id` or `manual`), `venueName` (booking-time venue label), `seatingMode: 'numbered' | 'free'`, `performerCount`, and `orchestraAttendanceTickets`. A new public competition booking stores the selected performance's `registrantId`, zero performer count and its paid ticket quantity as orchestra places; a winner booking stores the authoritative performer count and its paid quantity; a direct orchestra or older competition booking stores zero linked orchestra places. `bookingType`, not presence of `registrantId`, controls entitlement. Saved ticket names/prices and competition seat labels are backend-derived. No new Masterclass benefit, personal winner claim, or numbered orchestra seat is created.

`orchestraAssignments/{encodeURIComponent(eventId + '|' + registrantId)}` is the new assignment collection. Each document contains:

- `eventId`, `registrantId`, `sessionId`, `venue`, `venueName`, `date`, `time`.
- `paidTicketCount`, `publicTicketCount`, `winnerTicketCount`, `performerCount`, `quantity`, `bookingIds` (the covered paid snapshot).
- `revision`, `assignedBy`, `assignedAt`, `notifiedBookingIds`.
- Optional `notificationLease: { token, bookingId, expiresAt }`, where `expiresAt` is epoch milliseconds; completed/failed sends clear it.

`OrchestraAssignmentRepository.readGroup` derives current demand from paid version-2 public competition and winner bookings grouped by event and selected performance: sum of both paid ticket quantities + maximum snapshotted performer count from paid winner bookings once. A public-only group adds no performers. It detects paid historical complimentary allocations and blocks silent mixed-version reassignment. Later purchases produce additional pending assignment demand without overwriting the existing assignment snapshot.

`events/{eventId}.orchestraSessions[]` retains venue/date/time and the existing `complimentaryQuota` field, now labeled performance-linked attendance quota. `freeSeatingAssigned` counts assigned public competition, winner ticket, and eligible performer places. Historical `complimentaryClaimed`/`reservedRows` remain for legacy records. Assignment moves the entire group atomically; direct public orchestra checkout keeps tier capacity and limits its paid demand to venue capacity minus the performance quota.

`winnerOrchestraClaims` remains a legacy collection; new checkouts do not write it. New Masterclass purchases are rejected even if historical configuration remains. Existing invoices and legacy cleanup are unchanged.

### Manual-payment state and APIs

**Public performance seat selection (28 September 2026):** `PublicTicketBookingPage` permits `seat_selection_performer` for `public_competition` purchases and includes its configured unit price in the cart/review total, request and idempotency fingerprint. The backend allows only this add-on for public performance purchases, recalculates its price from event configuration, and applies the existing selected-seat quantity, tier, session, availability and ownership validation. `public_orchestra` still rejects all add-ons/numbered seats. This uses existing booking, capacity and ownership fields and introduces no collection or schema change; public performer count remains zero and orchestra entitlement remains the purchased performance ticket quantity.

The review checkbox sends `manualPayment: true` for the optional PayNow/bank-transfer flow. Checkout stores `paymentMode: 'manual'`, `paymentStatus: 'pending'`, a server-priced IDR total, capacity reservation, and any locked competition seats. It creates no Paper.id invoice or 30-minute `lockExpiresAt`; the sweeper therefore does not expire it. The checkout idempotency fingerprint includes booking type and payment mode. The buyer receives a ticket-specific payment email using the existing PayNow/bank details and the booking ID as reference, then sees `/ticket-payment-instructions/:bookingId`. Failed instruction delivery is retryable with the same checkout key or by staff.

All manual staff endpoints are under `/api/v1/apcs/public-ticket/admin/` and use `requireTicketingAdmin` (Firebase ID token plus whitelist):

| Suffix | Input | Effect |
| --- | --- | --- |
| `mark-manual-paid` | `bookingId` | Transactionally checks pending manual state, no invoice/link, capacity and selected-seat ownership; books seats, records actor/payment, then attempts normal confirmation email |
| `resend-manual-instructions` | `bookingId` | Sends payment instructions only for a pending manual booking |
| `release-booking` | `bookingId`, `reason: manual_payment_unpaid`, `paymentNotReceivedConfirmed: true` | Confirms no invoice/link, atomically releases all owned inventory and audits staff cancellation |

Paper.id bookings retain provider-ID/amount checks and provider-confirmed cancellation. A pending Paper.id checkout with no invoice is still blocked from manual release because an invoice may be in flight. Manual bookings remain reserved until staff confirm payment or cancel; pending reservations do not add confirmed orchestra attendance.

### New admin APIs

All are POST under `/api/v1/apcs/public-ticket/admin/orchestra/`, with `requireTicketingAdmin` Firebase-token/whitelist middleware:

| Suffix | Input | Result |
| --- | --- | --- |
| `list` | `eventId`, optional booking-ID `cursor` | 25-booking discovery page, complete paid winner groups and next cursor |
| `assign` | `eventId`, `registrantId`, `sessionId` | Transactional assignment, then per-booking notification attempts; failed IDs remain retryable |
| `notify` | `eventId`, `registrantId` | Retry missing emails for the saved revision |
| `sessions` | `eventId` | Session configuration plus paid public, held public and assigned winner counts |
| `session` | `eventId`, `session` or `deleteSessionId` | Protected settings mutation preserving fresh counters and checking capacity/active allocations |

Group reads are event/registrant-scoped; discovery is paginated. Session overview and settings validation queries are event/venue/date/time-scoped. The new event/registrant composite index is checked in to `apcs_web/firestore.indexes.json`; the existing event/status index serves discovery. Actual deployed index availability and database edition were not verified locally.

`OrchestraAssignmentController` sends notifications only after an assignment commits. SMTP and persistence are not atomic; a crash after successful SMTP and before delivery acknowledgement can result in a retry duplicate. A short lease limits overlapping requests; no background outbox worker is introduced.

`EmailService.sendPublicBookingConfirmationEmail` resolves a saved venue name or the booking's event, never the current event. `OrchestraEmailDetails.attendanceHtml` generates the existing escaped free-seating/group instructions for payment confirmations. Covered assignments appear in confirmation resends; new purchases outside the assignment snapshot show pending. Separate assignment emails go to each covered booking's stored buyer email with subject **APCS Orchestra & Awarding Session Confirmation**. `assignmentEmail` uses that booking's saved category quantities, buyer/performance names and ID plus the assignment's orchestra venue/date/time; English long dates and an en dash format the session. Current-event PRESTO/ALLEGRO rows include zero quantities, without adding the shared performer allowance. Other saved categories remain visible for other events. A performer-redemption sentence appears only when the assignment has performer places. The standard header/footer remain. This presentation does not change the total orchestra/redemption entitlement, schema, queries, notification leases or delivery tracking.

### Paper.id paid callback amounts

Both public-ticket callback routes normalize the nested staging `data.invoice` form and the flat production `invoice` form before using the shared fulfillment transaction. The transaction requires the provider invoice ID to equal the booking's stored `invoiceId` and accepts `invoice.total_amount` or `invoice.amount` as the invoice total. If both totals are supplied, both must match the booking's server-calculated `totalAmount`; `amount_due` is not a paid-total substitute. The stored `paymentCurrency` must also match when the callback includes a currency. The production `amount` branch was added on 23 September 2026; a backend process started before that edit must be restarted before it can use the change.

### Historical and rollout boundary

No live migration is performed. Unversioned/version-1 orders retain original numbered seats, Masterclass entitlements, quota, provider invoice and cleanup semantics. Reconcile an old winner allocation before assigning its new group. New Orchestra Settings does not generate physical seats; old seat generators and direct admin database access remain historical operational concerns.

Deploy the backend, frontend and indexes together and complete [manual acceptance](TICKETING_FREE_SEATING_WALKTHROUGH_2026-09-19.md). Existing payment authentication/recovery and Firestore contention limitations remain; offline tests are not deployment certification.

## Tech Stack & UI/UX Guidelines

*   **Frontend:** React.js + Ant Design (antd).
*   **Backend:** Node.js + Express.js.
*   **Database:** Firebase Firestore (NoSQL) & Firebase Auth. Local development can opt into a Firestore-only emulator on `127.0.0.1:8081` for both the React client and Express Admin SDK; see [Local Firestore development](LOCAL_FIRESTORE.md). Authentication and external integrations retain their existing endpoints.
*   **Storage:** AWS S3 (Presigned URLs for uploads) + AWS CloudFront CDN (Low-latency video streaming).
*   **Integrations:** Paper.id (Invoicing), Nodemailer (Emails).
*   **Theme:** Elegant Dark Mode
    *   Background: `#121212` | Card: `#1E1E1E`
    *   Accents: `#EBBC64` (Gold) | Text: `#e5cc92` (Cream)

### Core Rules
1.  **Bilingual Support (EN/ID):** All UI strings must consider both languages.
2.  **Firebase Optimization:** Use pagination (`limit`, `startAfter`). Never fetch entire collections.
3.  **Immutability:** Always use spread operators (`...`) for nested Firestore updates.
4.  **Dark Theme Persistence:** Override default Ant Design styles to match the APCS theme.


This project is a monorepo containing both the Frontend (`apcs_web`) and Backend (`apcs_service`). Always respect this exact directory structure, paying close attention to capitalization and nested `src` folders.

## 1. Frontend (`apcs_web/`)
A React application using Ant Design and Firebase Client SDK.

\`\`\`text
apcs_web/
├── public/
├── scripts/
├── src/
│   ├── apis/            # Axios API endpoints for communicating with the backend
│   ├── assets/          # Static images, icons, and flags
│   ├── components/      # Reusable UI components
│   ├── config/          # Frontend configurations
│   ├── constant/        # Hardcoded constants (e.g., categories, countries)
│   ├── context/         # React Context (e.g., DataContext.js for Auth state)
│   ├── hooks/           # Custom React hooks (e.g., useFetchRegistrantsData)
│   ├── middleware/      # Frontend route protection/logic
│   ├── Pages/           # Full page views (Note the capital 'P')
│   ├── services/        # Frontend business logic/services
│   ├── styles/          # Global styles
│   ├── utils/           # Helper functions (e.g., date parsing, youtube duration)
│   ├── App.js           # Main React Router setup
│   ├── firebase.js      # Firebase client initialization
│   ├── i18n.js          # Internationalization setup
│   ├── ProtectedRoute.js
│   └── PublicRoute.js
└── package.json
\`\`\`

**Frontend Rules:**
* Page components strictly go into `src/Pages/`.
* API calls to the backend must be placed in `src/apis/`.
* Utilize `src/i18n.js` for dual-language (EN/ID) text whenever adding new user-facing copy.

## 2. Backend (`apcs_service/`)
A Node.js Express server utilizing a layered architecture.

\`\`\`text
apcs_service/
├── logs/
├── migrations/
├── src/
│   ├── configs/         # Environment, DB, and 3rd party config (Firebase Admin, AWS, Nodemailer)
│   ├── controllers/     # Express route handlers (Extracts req/res, passes to Services)
│   ├── middlewares/     # Express middlewares (Auth verification, Error handling)
│   ├── models/          # Data models / interfaces
│   ├── repositories/    # Direct database interaction layer (Firestore calls)
│   ├── routes/          # Express router definitions mapping to controllers
│   ├── services/        # Core business logic (Billing, Emails, AWS uploads)
│   └── utils/           # Shared backend helpers (Logger, Custom Errors)
├── index.js             # Express server entry point
├── database.json
└── package.json
\`\`\`
---

---

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Firestore Collections](#2-firestore-collections)
- [3. Public Ticket Booking Flow](#3-public-ticket-booking-flow)
- [4. API Endpoints](#4-api-endpoints)
- [5. Race Condition & Seat Locking](#5-race-condition--seat-locking)
- [6. Email Notifications](#6-email-notifications)
- [7. Legacy Admin Flow](#7-legacy-admin-flow-reference)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  apcs_website (React)                                        │
│                                                              │
│  /tickets ──────────── PublicTicketBookingPage (5-step)       │
│  /select-seat ──────── SelectSeatPage (legacy token flow)    │
│  /register ─────────── Register (competition registration)   │
│  /admin ────────────── SeatEvent (admin seat management)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────┐
│                        Backend                               │
│  apcs_service (Express.js)                                   │
│                                                              │
│  PaymentRoute.js                                             │
│    ├── /public-ticket/event-data    (GET)                     │
│    ├── /public-ticket/booking       (POST)                    │
│    ├── /public-ticket/webhook       (POST, from Paper.id)     │
│    ├── /saveSeatBookProfileInfo     (POST, legacy)            │
│    ├── /verify-seat-token           (POST, legacy)            │
│    └── /confirm-seats               (POST, legacy)            │
│                                                              │
│  PaperRoute.js                                               │
│    ├── /createInvoice               (POST)                    │
│    ├── /webhooks/paper-id           (POST, competition reg)   │
│    └── /registrant-status/:id       (GET)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Firestore (Firebase)                      │
│                                                              │
│  events/APCS2026 ────────── Event config, pricing, sessions  │
│  sessionAssignments/* ───── Track performer assignments      │
│  seatsAPCS2026/* ────────── One doc per seat per session      │
│  publicBookings/* ───────── One doc per public booking (unified)│
│  seatBook2025/* ─────────── Legacy admin bookings             │
│  Registrants2025/* ──────── Competition registrations         │
│  JuryScores2025/* ───────── Jury assessment scores            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Firestore Collections

### 2.1 `events` collection

**Document ID:** Active event ID from `systemSettings/global.currentEventId` (for example, `APCS2026`).
**Purpose:** Event configuration, pricing tiers, add-ons, venue/session blueprints, `orchestraSessions`, `masterclassSessions`, and `sessionsSeatsGenerated`. Current ticket pricing uses `ticketTiers[].venuePrices[venueId]`; the flat `price` examples below are historical and insufficient for current public checkout.
**Used by:** `PublicTicketRepository.getPublicTicketEventData`, `PublicTicketRepository.createPublicTicketBooking` (server-side price validation).

```json
  "venues": [
    {
      "id": "Venue1",
      "label": "Jatayu Hall",
      "imageUrl": "...",
      "seatConfig": [...],
      "sessions": {
        "2026-11-01": ["10:00-12:25", "14:40-17:00"],
        "2026-11-02": ["10:05-12:15"]
      }
    }
  ],

  "ticketTiers": [
    { "id": "presto",  "name": "Presto",  "description": "Premium front section", "price": 150000 },
    { "id": "allegro", "name": "Allegro", "description": "Mid section",           "price": 100000 },
    { "id": "lento",   "name": "Lento",   "description": "Rear section",           "price": 75000  }
  ],

  "addOns": [
    { "id": "merchandise", "name": "Official Merchandise", "price": 50000 },
    { "id": "photo",       "name": "Professional Photo Package", "price": 75000 }
  ],

  "videoPenaltyConfig": {
    "revision": 1,
    "penaltyScore": 5,
    "rules": [
      {
        "competitionCategory": "Piano",
        "performanceCategory": "Solo",
        "instrumentCategory": null,
        "ageCategory": "Primary",
        "maximumMinutes": 3
      },
      {
        "competitionCategory": "VocalChoir",
        "performanceCategory": "Ensemble",
        "instrumentCategory": "Professionals_B",
        "ageCategory": "nineteen_plus",
        "maximumMinutes": 8
      }
    ]
  },

  "baseTicketPrice": 100000,
  "pricingTiers": { "...legacy structure for admin flow..." }
}
```

> **Video penalty configuration:** `videoPenaltyConfig` is event-scoped. Rules use the exact values saved by registration. Solo rules are identified by competition, `Solo`, and age; ensemble rules additionally require the saved `instrumentCategory`. The `revision` increments on every save and is copied to synchronized registrant results.
>
> A video is over-limit only when `Math.floor(videoDuration) > maximumMinutes * 60`. For any configured limit, fractional media padding through `.999` of the maximum second is allowed and the penalty begins at the next whole second.
>
> **Unified derived results:** `apcs_web/src/utils/scoringCalculator.js` is the calculation source for scoring displays. `apcs_web/src/utils/awardSynchronization.js` groups every jury score for the selected registrants, resolves event configurations, supplies the same live calculation to exports, and builds the batched award-sync updates. Neither path treats legacy `Registrants2025.isScoreFinalized` as a lock.
>
> **Note:** The `ticketTiers`, `addOns`, and `sessions` fields are new additions for the public booking flow. The existing `baseTicketPrice` and `pricingTiers` fields are preserved for the legacy admin flow and `BookingRepository.js`.

---

### 2.2 `sessionAssignments` collection

**Document ID format:** `{eventId}` (e.g., `APCS2026`)

**Purpose:** Tracks which performers/registrants are assigned to which performance timeslots.
**Used by:** `SessionAssignmentManager.js` (Admin Dashboard > Performer Sessions).

The assignment screen reads each registrant's numeric `videoDuration` from `Registrants2025`, shows it on the card, and sums known video durations for each session against the time range in `events/{eventId}.venues[].sessions`. An overrun is a warning only; saving assignments remains allowed. Missing durations are marked unknown and omitted from the known total. Scoring Recap also shows the registrant's video duration.

The read-only Teacher Award Stats modal uses the already loaded event registrations, filtered by competition category and then teacher search. Each registration, including an ensemble, counts once under its case-insensitively grouped teacher; blank teacher names are excluded. Saved `finalAward` (falling back to `achievement`) supplies the normalized award. Per-teacher and filtered summary Winners count Sapphire + Diamond + Gold + Silver; Fail is separate. Total includes Winners + Fail + Other / no award. The summary covers all matching rows across pagination and shows zeros for an empty result. It requires no additional queries or database writes. The modal's **Export to Excel** button creates a single `Teacher Award Stats` worksheet from `visibleTeacherStats` and `teacherStatsTotals`, preserving table order and including every matching teacher across pagination. It records event/category/search context, the same nine table columns and a numeric Filtered total row. The file is `TEACHER_AWARD_STATS_<eventId>_<YYYY-MM-DD>.xlsx`. Export is disabled for empty results, shows loading while writing the workbook, and reports serialization/download errors. Award counts use the same saved results as the table; no score recalculation occurs during export.

```json
{
  "eventId": "APCS2026",
  "updatedAt": "<serverTimestamp>",
  "assignments": {
    "Venue1_2026-11-01_10:00-12:25": [
      {
        "registrantId": "reg123",
        "competitionCategory": "Piano Solo",
        "email": "user@example.com"
      }
    ],
    "Venue2_2026-11-02_14:40-16:50": [
      {
        "registrantId": "reg456",
        "competitionCategory": "Violin Solo",
        "email": "user2@example.com"
      }
    ]
  }
}
```

---

### 2.3 `seatsAPCS2026` collection

**Current incompatible document ID formats:**
- Performer generator: `{venueId}-{areaType}-{row}{number}_{eventId}_{sessionId}`.
- Orchestra generator: `{venueId}-{areaType}-{row}-{number}_{eventId}_{sessionId}`.
- Older records may omit the venue prefix.

These formats can coexist for the same physical seat and create duplicate inventory. There is no enforced canonical format yet; see audit finding H before generation or migration.

**Purpose:** One document per physical seat per session. Tracks availability in real-time.
**Seeded by:** Admin dashboard `SeatEvent.js` → `uploadFullSeatLayout`.

#### Seat states

**Available** (default after seeding):
```json
{
  "eventId": "APCS2026",
  "venueId": "Venue1",
  "sessionId": "2026-11-01_10:00-12:25",
  "seatLabel": "A1",
  "areaType": "presto",
  "row": "A",
  "number": 1,
  "status": "available"
}
```

**Locked** (user clicked "Pay Now", waiting for payment — current timer targets 30 min; approved hold may extend beyond it):
```json
{
  "...same base fields...",
  "status": "locked",
  "lockedAt": "<serverTimestamp>",
  "lockedByBookingId": "abc123def456"
}
```

**Booked** (status written by the public payment handler; legacy `reserved` is also counted by occupancy):
```json
{
  "...same base fields...",
  "status": "booked",
  "bookingId": "abc123def456",
  "assignedTo": {
    "userName": "Budi Santoso",
    "userEmail": "budi@example.com",
    "registrantName": ""
  }
}
```

#### Current ticket-lock state transitions

**Blocked (operational):** the same base seat fields with `status: "blocked"`, `seatBlockRevision` and `seatBlock: { reason, blockedByUid, blockedByEmail, blockedAt }`. It has no customer booking ID. Staff can transition `available → blocked → available` only while canonical ownership and paid/held tier capacity permit it. Unblock retains the latest removed block in `lastSeatBlock`. Blocked seats stay part of the complete generated inventory used by readiness, while checkout excludes their capacity.

```
available ──[Pay Now (Firestore txn)]──► locked ──[verified paid callback]──► booked
                                           │
                         [local deadline: request cancellation]
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
      [cancellation succeeds]                             [unknown / failed]
                     │                                           │
                     ▼                                           ▼
                 available                              locked for reconciliation
```

---

### 2.4 `publicBookings` collection

**Document ID:** Auto-generated by Firestore
**Purpose:** One document per public ticket booking. Created at checkout, updated on payment. Additional current fields include `buyerName`, `registrantId`, `registrantName`, `orchestraSessionId`, `orchestraSelectedSeatIds`, `performanceSeatLabels`, `orchestraSeatLabels`, `complimentaryTickets`, `freeMasterclassCount`, `masterclassAssignment`, `isOrchestra`, `isMasterclass`, and `invoiceId`. `masterclassAssignment` is a nested `{ sessionId, sessionLabel, quantity, freePassCount, paidAddOnPassCount, assignedAt }` written by the Admin Dashboard after payment. The Masterclass Assignments page reads paid bookings with a bounded `eventId` + `paymentStatus` query; its composite index is defined in `apcs_web/firestore.indexes.json`. Checkout bootstraps a missing `ticketCapacity` record from active booking quantities by `eventId` + venue/date/session; subsequent checkouts update that counter transactionally. Unselected seated quantities reserve capacity without receiving a physical seat. Legacy bookings included in this bootstrap do not receive per-booking reservation metadata, leaving their later release/migration incomplete. Complimentary orchestra quantity is similarly bounded by the configured reserved-row capacity for `eventId` + `orchestraSessionId`. The two required composite indexes are defined in `apcs_web/firestore.indexes.json` and must be deployed with the normal Firestore-index release process. `paymentUrl` is now persisted alongside the provider invoice ID for status-link recovery. Stored `createdAt` and `lockExpiresAt` are Firestore timestamps; ISO text below illustrates serialization.

**Checkout failure fields (7 September repair):** `paymentStatus: "failed"`, `failedAt` (server timestamp), and `checkoutFailure: { reason, cleanupStatus, quotaRefundStatus, reconciliationReasons, invoiceCancellationStatus }`. Before provider cancellation succeeds, failure cleanup uses `cleanupStatus: "awaiting_cancellation"` and `quotaRefundStatus: "held"`; after successful cancellation it records the completed release/refund state. Other quota status is `not_applicable` or `reconciliation_required`; cancellation status is `not_requested`, `unknown`, `pending`, `canceled`, `failed`, or `manually_verified_no_active_invoice`. The manual value is written only by the authenticated Seat Occupancy reconciliation endpoint after an admin explicitly confirms there is no paid or active Paper.id invoice. A returned `invoiceId` is preserved even when saving the successful invoice response fails. No new collection was introduced; the checkout capacity queries require the two documented indexes.

**Admin release fields (18 September):** a booking reconciled from Seat Occupancy receives `adminRelease: { reason, note, providerConfirmation, releasedByUid, releasedByEmail, releasedAt }`. Supported reasons are exactly `customer_declined` and `no_response_after_one_hour`. The no-response reason requires the booking to be at least one hour old. Known invoices must return a successful Paper.id cancellation before the transaction runs. A no-invoice booking must already be `failed` and requires `manualProviderConfirmation: true`; a `pending` no-invoice booking is rejected to avoid racing invoice creation. The transaction refuses paid/terminal bookings, rechecks the expected payment status and invoice identity, and preflights every expected seat, physical ownership, capacity reservation, winner claim, and complimentary quota before writing. A late invoice or any inventory inconsistency aborts all local inventory changes. A successful provider cancellation is stored before that transaction, so a repaired retry can skip a duplicate Paper.id cancellation.

**Failure data path:** `PublicTicketRepository` catches checkout/eligibility errors and awaits the Promise-returning `PublicTicketFailureRepository`. That helper uses the booking's saved event and recorded quantities, marks the booking failed, then attempts known-invoice cancellation outside Firestore. Only a truthy cancellation result enters the all-reads-before-writes release transaction, which checks current seat ownership and refunds recorded quota. The latest review reproduced duplicate capacity/quota refunds when two failed-booking cleanups overlap; exactly-once release is not yet guaranteed. Unknown or failed cancellation retains inventory for reconciliation. Missing quota configuration is flagged rather than inferred. Cleanup transaction failure is logged with the booking ID and does not replace the original callback error. There is no automated recovery worker in this batch. Both public payment webhook routes share the failed-booking guard; Public Customers independently rereads status before manual Mark Paid. Existing rules/whitelist permissions remain unchanged, so these are application guards, not newly enforced Firestore authorization.

**Lifecycle/fulfillment repair (7 September):** failure cleanup now retains inventory while provider cancellation is pending or unknown; only a truthy cancellation result releases booking-owned locks and refunds quota. Timer and sweeper use the same all-reads-before-writes release path, checkout cannot lazily take over locks, and public seat reads keep them unavailable. Payment fulfillment now uses the saved event and transactionally validates amount and lock ownership. Callback authenticity, a recovery worker, and Masterclass assignment email remain open; combined paid/free pass assignment is implemented.

**On creation (Pay Now clicked):**
```json
{
  "eventId": "APCS2026",
  "userName": "Budi Santoso",
  "userEmail": "budi@example.com",
  "userPhone": "+6281234567890",
  "venue": "Venue1",
  "date": "2026-11-01",
  "session": "10:00-12:25",
  "tickets": [
    { "id": "presto", "name": "Presto", "quantity": 2, "priceEach": 150000 }
  ],
  "selectedSeatIds": [
    "presto-A1_APCS2026_2026-11-01_10:00-12:25",
    "presto-A2_APCS2026_2026-11-01_10:00-12:25"
  ],
  "addOnIds": ["merchandise"],
  "totalAmount": 350000,
  "paymentStatus": "pending",
  "seatsSelected": true,
  "lockExpiresAt": "2026-11-01T10:30:00.000Z",
  "createdAt": "<serverTimestamp>"
}
```

**After payment confirmed (webhook update):**
```json
{
  "...all above fields...",
  "paymentStatus": "PAID",
  "paidAt": "<serverTimestamp>",
  "amountPaid": 350000,
  "paymentDetails": { "...full Paper.id webhook payload..." }
}
```

**Expiry after confirmed unpaid cancellation:**
```json
{
  "...all above fields...",
  "paymentStatus": "expired",
  "checkoutFailure": { "cleanupStatus": "complete", "quotaRefundStatus": "refunded", "invoiceCancellationStatus": "canceled" }
}
```

---

### 2.4a `documentationCustomers` collection

**Document ID:** Firestore auto-ID, allocated once per open create form and reused on save retry.
**Purpose:** Staff record of an already paid external documentation purchase; grants no admission, numbered/free seat, orchestra attendance, performer entitlement or ticket redemption.
**Used by:** Public Customers only, through `apcs_web/src/services/documentationCustomers.js`; selected-event reads only.

| Field | Type / meaning |
| --- | --- |
| `eventId` | Existing event ID, immutable through this feature |
| `userName` | Required trimmed customer name, 1–200 characters |
| `adminNote` | Trimmed free text, up to 2,000 characters; empty string clears the note |
| `recordType` | Fixed `documentation_only` |
| `withoutSeat` | Fixed `true`; does not mean free-seating admission |
| `paymentStatus` | Fixed `paid`, recorded after staff verifies receipt outside APCS |
| `revision` | Positive integer; starts at 1 and increments on edits |
| `createdAt`, `updatedAt` | Firestore server timestamps |
| `createdBy`, `updatedBy` | Signed-in staff Firebase UID; creation identity is preserved |

The stored record has no ticket quantities, amounts, booking type/version, session/registrant link, seats, invoice, payment URL or entitlement fields. Existing whitelist access applies; no new public read permission is added. Do not copy these rows to `publicBookings` or pass their IDs to ticket APIs. Payment verification and documentation delivery happen outside this feature; recording Paid does not verify a bank transfer automatically or send an email.

### 2.5 `Registrants2025` collection

**Attendance import (11 October 2026):** Registrant Dashboard parses the confirmation file locally and calls the whitelist-protected `/api/v1/apcs/registrant-attendance/preview` and `/apply` endpoints. `src/services/RegistrantAttendanceImport.js` shares classification/matching/write logic with `scripts/import_registrant_attendance.js`. Explicit scans paginate candidates by document ID in pages of 200 across APCS2025/APCS2026, including legacy missing-event APCS2025 records. Signed previews bind original roster/event/attendance; apply rechecks live data and transactionally patches only `willAttend` in chunks of at most 200. No collection/index, source-event migration, ticketing read path or automatic mount-time scan is added. [Rules, API/CLI and manual acceptance](REGISTRANT_ATTENDANCE_IMPORT.md).

**Document ID:** Auto-generated by Firestore
**Purpose:** One document per competition registration. Created during the registration flow (`Register.js`).
**Used by:** `JuryDashboard.js`, `AdminContent.js`, `SessionAssignmentManager.js`, `PaperController.handlePaperWebhook`

> **⚠️ Tech Debt Notice:** Despite the "2025" in the name, this collection is used for **all** years (e.g., APCS2025, APCS2026). The initial plan to separate years into different collections was abandoned. To differentiate registrants by year, filter queries using the `eventId` field. For legacy APCS2025 guest loading, a missing/null/empty `eventId` is interpreted as APCS2025 without rewriting the record. Normal event queries use the explicit field (e.g., `where('eventId', '==', 'APCS2026')`).

#### Key fields

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | e.g., `"APCS2025"` |
| `name` | string | **Parent/guardian/teacher name** — this is NOT the performer name. |
| `teacherName` | string | Teacher name |
| `competitionCategory` | string | e.g., `"Piano Solo"`, `"Violin Solo"` |
| `instrumentCategory` | string | Instrument sub-category |
| `PerformanceCategory` | string | `"Solo"` or `"Ensemble"` |
| `vocalGenreCategory` | string | e.g. `"Classical"`, `"FreeGenre"` (Only applicable for `VocalChoir` competition category) |
| `ageCategory` | string | Category-specific key from `RegisterPageConst` (e.g., `"Primary"`, `"JuniorwoodWind"`) |
| `totalPerformer` | number | Count of performers in the `performers` array |
| `performers` | array | Array of performer objects — **this is where performer names and emails live** (see below) |
| `willAttend` | boolean (optional) | Imported venue confirmation for the current campaign, stored on the whole registration. Blank/unclear imported responses become false; missing field means not imported. Historical APCS2025 guests retain their original event ID. Informational, not check-in or admission. See [attendance import](REGISTRANT_ATTENDANCE_IMPORT.md). |
| `repertoireTitle` | string | Title of the piece entered during registration. Older documents may omit this field. The Registrant Dashboard can filter missing titles and update this field alone. |
| `repertoire` | string | Legacy repertoire field, where present. |
| `youtubeLink` | string | YouTube link for the performance |
| `videoDuration` | number | **Duration of the performance video in seconds.** Calculated during upload via `getVideoDuration()`. Display as `mm:ss` (e.g., 192 → `"03:12"`). |
| `videoPenaltyConfigRevision` | number\|null | Event video-penalty revision used when `averageScore` and `finalAward` were last synchronized. |
| `videoPerformanceS3Link` | string | S3 key for the uploaded performance video |
| `pdfRepertoireS3Link` | string | S3 key for the uploaded sheet music PDF |
| `birthCertS3Link` | string | S3 key for birth certificate |
| `examCertificateS3Link` | string | S3 key for exam certificate / recommendation letter |
| `profilePhotoS3Link` | string | S3 key for profile photo |
| `paymentStatus` | string | `"PAID"`, `"UNPAID"`, etc. |
| `invoiceStatus` | string | `"CREATED"` (Paper.id invoice created) or `"FAILED"` (Paper.id API failed). Only present for newer registrations. |
| `amountToPay` | number | Amount in IDR |
| `duration` | string | Legacy field — formatted duration string (e.g., `"00:05:30"`). Prefer `videoDuration` for numeric calculations. |

> **⚠️ CRITICAL: `name` vs performer names**
> - `record.name` = **parent/guardian/teacher** name (top-level field)
> - `record.performers[].fullName` = **performer** name (inside the `performers` array)
>
> When displaying or referencing a registrant's performer name, **always** use `record.performers[].fullName` (with `firstName + lastName` fallback). Never use `record.name` for this purpose.

#### `performers[]` array structure

Each element in the `performers` array has the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `firstName` | string | Performer's first name |
| `lastName` | string | Performer's last name |
| `fullName` | string | **Primary display name** — use this for all UI display (e.g., `"Renaldo Louis"`) |
| `email` | string | Performer's email address (used for sending confirmation emails) |
| `dob` | string/timestamp | Date of birth |
| `gender` | string | Gender |
| `nationality` | string | e.g., `"Indonesia"` |
| `country` | string | Country of residence |
| `province` | string | Province |
| `city` | string | City |
| `zipCode` | string | Zip code |
| `addressLine` | string | Street address |
| `phoneNumber` | string | Phone number (does **not** include country code) |
| `countryCode` | string | Phone country code (e.g., `"+62"`) |

> **⚠️ CRITICAL: Parsing Performer Country & Phone**
> - Always use `p.country` if you need the performer's country name.
> - If `p.country` is missing, use `p.countryCode` (e.g., `"+65"`) to map to a country.
> - **NEVER** prepend `+` to `p.phoneNumber` to infer the country. Because `phoneNumber` is purely local (e.g., `90029350`), blindly prepending `+` (e.g., `+90...`) will cause false matches with other country codes (like `+90` for Turkey)!

**Common pattern for getting performer display name:**
```js
const performerNames = (record.performers || [])
    .map(p => p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim())
    .join(' & ');
```

> **⚠️ Important:** The `videoDuration` field stores **seconds as a number** (e.g., `312` for 5 minutes 12 seconds). Always convert to `mm:ss` for display. Do **not** confuse with the legacy `duration` string field.

> **Deprecated:** `Registrants2025.isScoreFinalized` is no longer a result lock and must not be used to skip award synchronization. Existing values are retained for historical safety. Jury editing is locked only by `JuryScores2025.isFinalized`.

---

### 2.6 Legacy collections (reference only)

| Collection | Used by | Purpose |
|---|---|---|
| `seatBook2025` | `TicketRepository.saveSeatBookProfileInfo`, `confirmSeatSelection` | Admin-created bookings (legacy flow) |

---

### 2.7 `JuryScores2025` collection

**Document ID format:** `{registrantId}_{juryUserId}` (composite key)
**Purpose:** Stores individual assessment scores, participant comments (performance feedback), and panel-specific comments.

> **⚠️ Tech Debt Notice:** Similar to `Registrants2025`, this collection is used for **all** years despite its name. To filter scores by year, you generally filter `Registrants2025` by `eventId` first, and then fetch the corresponding scores by matching `registrantId`.

```json
{
  "id": "AijmAQ8GAzBJ0ENHkKiD_mSbaqnjPVHS9XbaRP6TFcCjmcI73",
  "score": 85,
  "comment": "Nice dynamics, good posture.",
  "panelComment": "Consider for honorable mention.",
  "isFinalized": false,
  "juryUserId": "mSbaqnjPVHS9XbaRP6TFcCjmcI73",
  "juryName": "Jury Member A",
  "juryEmail": "juryA@example.com",
  "registrantId": "AijmAQ8GAzBJ0ENHkKiD",
  "registrantName": "Renaldo Louis",
  "competitionCategory": "Harp",
  "performanceCategory": "Solo",
  "ageCategory": "YoungGuitar",
  "timestamp": { "seconds": 1716307200, "nanoseconds": 0 },
  "adminAdjustedScore": null,
  "adminAdjustedAt": null,
  "adminAdjustedBy": null,
  "finalizedAt": null,
  "finalizedBy": null
}
```

#### Admin Scoring Fields

| Field | Type | Description |
|-------|------|-------------|
| `adminAdjustedScore` | number\|null | Admin-set override score. Jury member never sees this — they always see their original `score`. Average calculation uses this when present, otherwise falls back to `score`. |
| `adminAdjustedAt` | timestamp\|null | When admin last adjusted the score |
| `adminAdjustedBy` | string\|null | Email of admin who adjusted the score |
| `isFinalized` | boolean | When `true`, the jury member can no longer edit their score for this registrant. Set by admin via Scoring Recap page. |
| `finalizedAt` | timestamp\|null | When admin finalized the score |
| `finalizedBy` | string\|null | Email of admin who finalized |

> **⚠️ Finalization behavior:** When `isFinalized` is `true`, the jury's AssessmentForm disables all inputs and shows a "Finalized" banner. The jury can still view their score/feedback but cannot save changes. Admins can unfinalize to re-open editing.

---

### 2.8 `competitionSessionPlans/{eventId}` document + `groups/{groupId}` subcollection

**Document ID:** Event ID (e.g., `APCS2026`)
**Purpose:** Draft/provisional competition session groups created by staff before publication. Groups are invisible to ticket buyers until the event is marked ready. Seat generation is a separate manual step after publication. A new draft cannot be activated for an event with existing competition slots, assignments, seats, booking, capacity or ownership records; these require explicit reconciliation.

**Document fields:**
| Field | Type | Description |
| --- | --- | --- |
| `status` | string | `draft`, `published`, or `ready` |
| `revision` | number | Incremented on every draft mutation and lifecycle transition |
| `publishedAt` | timestamp or null | When the schedule was published |
| `readyAt` | timestamp or null | When readiness was confirmed |
| `draftSlots` | array | Private `{ slotId, venueId, date, start, end }` slots created in Performer Sessions; `start` and `end` may be null before publication |

**`groups/{groupId}` subcollection — document ID format:** `plan_{randomUUID}`; stable across ordering and time edits.
| Field | Type | Description |
| --- | --- | --- |
| `groupId` | string | Same as document ID |
| `eventId` | string | Parent event |
| `venueId` | string | Venue from event config |
| `date` | string | Date in `YYYY-MM-DD` |
| `ordinal` | number | Group ordering |
| `label` | string | Display label |
| `slotId` | string or null | Link to one private draft slot; null while grouping is provisional |
| `start` | string or null | Cached start time `HH:mm`, resolved from the linked slot by the backend |
| `end` | string or null | Cached end time `HH:mm`, resolved from the linked slot by the backend |
| `registrantIds` | string[] | Ordered performer IDs |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Draft board and published projection:** Performer Sessions edits private `draftSlots` in the plan parent with a revision-checked backend transaction. Editing a linked slot's time updates the group's cached time in the same transaction. Its venue/date cannot change while linked, and linked slots cannot be deleted. The Admin Page assignment board loads planning groups for planning events and uses `POST /competition-planning/:eventId/draft` to replace the complete draft in one revision-checked Firestore transaction. The backend resolves group time from the chosen slot, requires matching venue/date and one group per slot, and ignores submitted time values. This preserves cross-group moves and order without partial saves. Legacy events keep their existing session board and assignment endpoint. An atomic publish transaction requires all slots linked with final times, then writes time strings into `events/{eventId}.venues[].sessions` and ordered registrants into `sessionAssignments/{eventId}.assignments`. `events/{eventId}.competitionScheduleState` is the authoritative buyer gate; the plan parent mirrors its status and revision. Draft save does not create buyer-facing event times or assignments. Publish checks the expected revision, valid times/registrants, overlap and ticket activity. The backend blocks competition buyer discovery, seats and checkout until `ready`; events without the state field retain their historical behavior. The legacy assignment endpoint rejects planning events. Browser Firestore rules block direct edits to a planning event's venues/schedule state and assignment document. Published planning sessions are read-only in Performer Sessions. The Admin Page has a separate revision-checked same-group performance-order exception described above; all membership and session configuration edits remain locked.

**Readiness gate:** All published slots must have the exact numbered seat layout and configured venue tier prices. Enabled sale eligibility must have at least one configured allowed-tier entry. This is a structural readiness check; daily sale eligibility remains independently enforced at checkout. The event stays `published` when checks fail.

**APCS2026 test reset:** `apcs_service/reset_apcs2026_planning_test_data.js` inventories and privately backs up the event before changing Firestore. Its owner-authorized 26 September run removed dummy competition times, numbered seats, assignment and capacity/ownership/checkout records, while retaining registrants, scoring, venue layouts, prices and orchestra definitions. Four terminal public bookings remain under `publicBookings` with `paymentStatus: archived_test` and `planningReset.originalPaymentStatus`; planning ignores these tombstones and both Paper callback routes ignore late paid notifications for them. One expired staging invoice had a failed cancellation result, so its tombstone is retained. This event's `competitionScheduleState` and plan parent are `draft`, revision 0. The private JSON backup is in ignored `apcs_service/.local/backups/`.

**API endpoints:**
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/competition-planning/:eventId` | Get planning state |
| POST | `/competition-planning/:eventId/groups` | Save/update a group (draft) |
| POST | `/competition-planning/:eventId/draft` | Atomically save the complete draft board with expected revision |
| DELETE | `/competition-planning/:eventId/groups/:groupId` | Remove a group (draft only) |
| POST | `/competition-planning/:eventId/slots` | Create or edit a private draft slot with expected revision |
| POST | `/competition-planning/:eventId/slots/:slotId/delete` | Delete an unused private draft slot with expected revision |
| POST | `/competition-planning/:eventId/preview` | Validate without publishing |
| POST | `/competition-planning/:eventId/publish` | Atomic publish with revision check |
| POST | `/competition-planning/:eventId/ready` | Verify seats and mark ready |

---

### 2.10 `systemSettings/global` — Event, Ticket Eligibility, Jury Deadlines & Exchange Rate

Ticketing additionally reads `currentEventId` and `ticketEligibility: { enabled, schedule: [{ date, allowedTiers }] }`. Eligibility uses Asia/Jakarta calendar dates and is edited in Ticket Settings. The supported ticket schedule values are Sapphire, Diamond, Gold, Silver, and Public. Enabled schedules without a matching date yield no allowed tiers; checkout enforces the active day's public and winner eligibility. The registration-enabled setting does not disable ticket sales.

**Field:** `juryDeadlines` (added to existing `systemSettings/global` document)
**Purpose:** Per-competition-category deadlines for jury scoring. After the deadline passes, jury members for that category are blocked from logging in via email/password and can no longer submit scores.
**Managed by:** Admin Dashboard → Jury Management → Jury Deadlines (`JuryDeadlineSettings.js`)

```json
{
  "currentEventId": "APCS2026",
  "juryDeadlines": {
    "Piano": "2026-06-15T23:59:59.999Z",
    "Violin": "2026-06-20T23:59:59.999Z",
    "Harp": "2026-06-18T23:59:59.999Z"
  },
  "juryDeadlineReminderSent": {
    "Piano_1781567999999": true,
    "Violin_1781999999999": true
  },
  "usdToIdrRate": 17800
}
```

**Field:** `usdToIdrRate` (number)
**Purpose:** The exchange rate used for converting USD registration fees to IDR on Paper.id invoices. Defaults to `17800` if not set.
**Managed by:** Admin Dashboard → Ticketing System → System Settings (`SystemSettings.js`)
**Used by:** `PaperRepository.createInvoice` → `invoiceUtils.buildInvoiceItem` / `invoiceUtils.buildInvoiceNotes`
**Validation:** Must be between 10,000 and 25,000 (enforced in Admin UI).

> **Note:** Admins select a **date only** (no time picker). The system automatically sets the deadline to **23:59:59.999** of the selected date, so jury members can score all day until the end of that day.

**Behavior:**
- **24 hours before deadline (H-1):** 
  - A backend cron job (`JuryDeadlineReminder.js`) queries jury members with pending assessments and sends urgent email reminders. It sends reminders in three stages: 1 week before, 3 days before, and 24 hours before the deadline. To ensure idempotency, it writes a flag to `juryDeadlineReminderSent` keyed by `Category_DeadlineTimestamp_ReminderWindow` (e.g. `_1w`, `_3d`, `_24h`).
  - Reminder completion checks use the jury user document ID as the canonical UID, with the stored `users.uid` field accepted as a legacy fallback. This prevents stale or migrated `uid` fields from making fully scored juries look pending.
  - A warning modal is shown to jury on login. Deadline text in dashboard nav turns red with pulsing animation.
- **After deadline:** Jury email login is blocked in `DataContext.signInWithEmail()` — user is signed out and shown "The scoring period for [category] has ended". Google login and admin login remain unaffected.
- **No deadline set:** No restrictions applied; jury can score at any time.

**Updated by:** `POST /api/v1/apcs/systemSettings/global` with `{ juryDeadlines: { ... } }` in body.
**Admin UI:** `AdminDashboard.js` → menu key `'20'` → `JuryDeadlineSettings.js` (Add/Edit/Delete per-category deadlines with date picker + Save All).

---

## 3. Public Ticket Booking Flow

Confirmed requirements from the audit follow-up: admins assign tickets without seat selection from Seat Occupancy only after confirmed payment; standalone paid Masterclass tickets remain attached to the customer-selected session; admins assign all complimentary Masterclass passes from one booking to the same specific session after booking through the Masterclass Assignments page; Masterclass sessions have no attendee limit for now; the extra winner orchestra ticket is allowed once per winning performance per orchestra session, with an ensemble counted as one performance regardless of member count; reserved orchestra rows are exclusively for winners’ complimentary tickets, and all complimentary seats must remain within these rows for both customer selection and admin assignment. See [the flow document](SEAT_BOOKING_FLOW.md) for confirmed decisions and remaining implementation work. An unpaid booking that expires must restore eligibility to claim the extra winner ticket on retry, subject to remaining quota and reserved-row capacity. No new collection is introduced for Masterclass assignments; the nested booking field is used.

The detailed, code-verified flow is maintained in [SEAT_BOOKING_FLOW.md](SEAT_BOOKING_FLOW.md). The connections below replace the former seat-click-only description.

- Public buyers select a competition/orchestra/masterclass session, then explicit ticket quantities. A public Orchestra purchase uses the selected venue/date/time as its paid session; only a winner sends `orchestraSessionId` for a complimentary claim.
- Winners select a registrant whose competition slot is already assigned in `sessionAssignments/{eventId}` and separately select an orchestra session for complimentary tickets.
- `seat_selection_performer` is repeated in `addOnIds` once per manually chosen paid seat. `seat_selection` is a flat add-on for selecting complimentary orchestra seats.
- Presto quantities produce `freeMasterclassCount`; the existing admin page assigns those complimentary passes after payment. **Assignment implemented; email pending:** Masterclass Assignments now includes paid `allegro_masterclass` add-on passes, complimentary passes, and add-on-only bookings. Staff assign all benefit passes from one paid booking to one Masterclass session; the saved assignment includes paid/free component counts. Standalone Masterclass tickets retain the customer-selected session. Assignment-email dispatch is still missing. Masterclass sessions have no attendee limit for now.
- Details/review submit to checkout, which recalculates totals from venue-specific event prices, locks explicitly supplied seats, blocks paid access to winner-reserved Orchestra rows, increments applicable winner orchestra quota, and creates `publicBookings` in a transaction. Changing buyer type, winner, or session clears purchase selections and quantities.
- Paper.id invoicing follows the transaction. `invoiceId` is persisted; payment URL/ISO expiry are returned. The controller awaits a non-fatal holding email before sending its response.
- The waiting page polls booking status when router state identifies a public booking. Independently opening the URL loses that classification/payment-link state.

There is currently no automatic physical-seat allocator for unselected ticket quantities. Checkout nevertheless protects configured tier capacity by summing active booking quantities before accepting a new booking. The manual Public Customers workflow covers missing paid seats only. See the audit for frontend state retention and duplicated session listing defects.

## 4. API Endpoints

| Method | Path (under `/api/v1/apcs`) | Current purpose / trust boundary |
| --- | --- | --- |
| GET | `/public-ticket/event-data` | Active event config; public |
| GET | `/public-ticket/seats?venueId=...&sessionId=...` | Venue/session seats; removes owner fields and keeps provider-unresolved locks unavailable |
| GET | `/public-ticket/eligible-winners` | Assigned eligible winners, including display names/emails; public |
| POST | `/public-ticket/booking` | Create pending booking/invoice; server pricing but incomplete entitlement/inventory validation |
| GET | `/public-ticket/booking-status/:bookingId` | Payment status, attempted payment URL, ISO expiry |
| POST | `/public-ticket/webhook` | Dedicated paid callback. Stores a durable `ticketPaymentReceipts` record before fulfillment and returns 500 if it cannot. No authenticity middleware is wired in local code (deferred). |
| POST | `/public-ticket/admin/assign-seats` | Firebase-token and whitelist-protected atomic staff assignment of paid, unselected numbered seats |
| POST | `/public-ticket/admin/seats/generate` | Firebase-token and whitelist-protected transactional numbered-seat generation that preserves locks, bookings and canonical ownership |
| POST | `/public-ticket/resend-email` | Resend a paid public booking email; no admin middleware wired |
| POST | `/public-ticket/admin/send-email-to-address` | Firebase-token and whitelist-protected confirmation copy to one entered recipient; requires paid booking and does not persist the recipient or update original email status |
| POST | `/public-ticket/admin/release-booking` | Firebase-token and whitelist-protected booking cancellation; cancels a known Paper.id invoice or accepts manual no-invoice confirmation for a failed booking, then atomically releases the complete validated inventory set |
| GET/POST | `/systemSettings/global` | Read/update global configuration; write route lacks admin middleware |
| GET | `/getSessionAssignments/:eventId` | Read saved assignment map |
| POST | `/saveSessionAssignments` | Whitelisted admin route for legacy events; rejects planning events |
| POST | `/payment/webhooks/paper-id` | Unified callback (used by staging). Looks up the public booking and uses the same receipt-first path as the dedicated route; otherwise processes competition registration unchanged. Returns 500 if the booking lookup or receipt fails. No authenticity middleware is wired (deferred). |
| GET | `/competition-planning/:eventId` | Get planning state (groups + schedule status) |
| POST | `/competition-planning/:eventId/groups` | Save/update a group (draft only; admin middleware) |
| DELETE | `/competition-planning/:eventId/groups/:groupId` | Remove a group (draft only; admin middleware) |
| POST | `/competition-planning/:eventId/preview` | Validate all draft groups without publishing |
| POST | `/competition-planning/:eventId/publish` | Atomic publish with revision check (admin middleware) |
| POST | `/competition-planning/:eventId/ready` | Mark event ready for ticket sales (admin middleware) |

Checkout requires `buyerName`, `userEmail`, `userPhone`, `venue`, `date`, `session`, and `tickets`. Current frontend payload also includes the winner and orchestra fields, explicit paid/free seat IDs and labels, add-on IDs, and product flags. Client totals/benefit values are not authoritative; nevertheless the backend still stores some client product metadata and does not validate all relationships.

Example (one selected paid ticket; matching prices/add-on must exist):

```json
{
  "buyerName": "Audit Buyer",
  "userEmail": "buyer@example.com",
  "userPhone": "+6281234567890",
  "venue": "Venue1",
  "date": "2026-11-01",
  "session": "10:00-12:25",
  "tickets": [{ "id": "presto", "name": "Presto", "quantity": 1 }],
  "selectedSeatIds": ["Venue1-Presto-A1_APCS2026_2026-11-01_10:00-12:25"],
  "performanceSeatLabels": ["A1"],
  "orchestraSelectedSeatIds": [],
  "addOnIds": ["seat_selection_performer"]
}
```

Checkout returns `{ bookingId, paymentUrl, lockExpiresAt }`, where the expiry is ISO text. Legacy `/saveSeatBookProfileInfo`, `/verify-seat-token`, and `/confirm-seats` remain separate from public checkout.

## 5. Race Conditions and Seat Locking

Browsing does not lock inventory; Pay Now locks only explicit selected seat IDs. A local deadline requests provider cancellation but never independently releases or takes over inventory. The timer, sweeper, checkout-failure helper, seat reads, and public fulfillment now follow this provider-confirmed hold policy:

- Checkout failure cleanup is tied to the saved booking and retains inventory until provider cancellation succeeds; rejected booking transactions leave other inventory untouched.
- Unselected seated quantities reserve configured tier capacity; selected IDs are checked for unique physical seats, matching venue/session/tier, complimentary entitlement, and winner-reserved Orchestra rows.
- Fulfillment transactionally rechecks seat ownership, amount, and state against the stored booking event; callback authenticity remains unresolved.
- The per-booking timer and five-minute `PublicTicketSweeper` request cancellation, then use a shared all-reads-before-writes release path only after success.
- Lazy takeover is removed. A local timeout does not make a lock available.
- Invoice-creation failure records terminal `failed`. Known invoices remain locked until cancellation succeeds; unknown outcomes are recorded for reconciliation. No recovery worker exists.
- A whitelisted admin can reconcile a linked lock from Seat Occupancy. The action never mutates only the clicked seat: it validates the owning booking, all selected seats, canonical ownership, tier-capacity reservation, winner claim, and complimentary quota before any local write, then processes them together. Pending no-invoice bookings are blocked. Public Customers reads the same updated booking and displays the audit details.

A next-day Paper.id due date is configured separately from the 30-minute local hold. An expiry display cannot establish gateway cancellation. These defects are reproduced or traced in [the audit](TICKETING_AUDIT_2026-09-06.md); the original documentation's blanket race-safety and lazy-cleanup guarantees are withdrawn.

## 6. Email Notifications

Public buyers enter their email. Winner selection defaults the editable buyer email to the registrant’s stored email; confirmation uses the saved booking `userEmail`. Keep public winner name selection without email verification. Confirmation email is communication, not identity proof. Backend winner eligibility and new personal-claim records exist, but repeat selected-seat purchases and historical claim migration remain incomplete. Later Masterclass assignment emails for combined paid/free benefit passes are approved but not implemented.

- Holding email: name, main venue/date/time, invoice URL, and deadline. Controller awaits sending; failure is caught and does not invalidate the booking.
- Confirmation: booking ID, main venue/date/time, ticket summary, selected competition/orchestra labels, and total. Both webhook routes can trigger it.
- Missing from current confirmation: a separate orchestra schedule, unassigned complimentary count, and full add-on/masterclass benefits. Public-booking QR verification is not required; booking-ID/manual entry verification is sufficient.
- Duplicate paid callbacks can return booking data without its document ID while controllers send another confirmation. The unified route tracks `emailSent`; the dedicated route does not consistently do so.

The template instructs customers to present their email or booking ID for manual verification. Legacy registrant JWT check-in is not public-booking check-in.

---

## 7. Legacy Admin Flow (Reference)

The legacy admin/token flow remains separate from public booking payment records, but can share physical seat collections. It was not fully regression-tested in the September ticketing audit:

```
Admin (SeatEvent.js) → picks registrant → fills venue/session/tickets
  → POST /saveSeatBookProfileInfo → creates seatBook2025 doc + JWT token
  → Admin manually sends email with /select-seat?token=... link
  → User opens link → POST /verify-seat-token → sees seat map
  → User picks seats → POST /confirm-seats → seats reserved + confirmation email
```

This flow uses:
- `seatBook2025` collection (not `publicBookings2026`)
- `TicketRepository.js` (not `PublicTicketRepository.js`)
- Manual admin verification of payment (not Paper.id webhook)

---

## 8. Infrastructure & Scaling

### "Ticket War" Cloudflare Defense Strategy
To survive high-concurrency events (e.g., hundreds of users logging on simultaneously at exactly 12:00 PM for ticket sales) while hosted on a constrained shared hosting environment (e.g., CloudLinux 30 Entry Processes limit), the following infrastructure strategy is explicitly enforced:

1. **Frontend Caching (Bypass Origin)**: 
   - **Cloudflare** is positioned in front of the domain.
   - All static assets from the React frontend (`.js`, `.css`, media, `index.html`) are aggressively cached by Cloudflare. 
   - These requests return a `Cf-Cache-Status: HIT` header and **never** touch the origin Node.js/LiteSpeed server, thereby preserving the 30 Entry Process limit exclusively for backend data operations.
   
2. **Backend API Bypass (Dynamic Execution)**:
   - A Cloudflare Page Rule (or Cache Rule) MUST be configured to `Bypass` cache for all backend API routes (e.g., `*apcsmusic.com/api/*`).
   - This ensures all backend calls reach the Node.js Express server natively (`Cf-Cache-Status: DYNAMIC`).
   - **WARNING:** If this rule is missing or misconfigured, Cloudflare may cache API responses, leading to catastrophic data leaks (e.g., User B seeing User A's checkout session).

3. **Database Offloading**:
   - The heavy lifting of concurrency and database scaling is strictly offloaded to **Firebase Firestore**. The Node.js server acts merely as a lightweight orchestrator for payload validations, atomic transactions, and Paper.id webhook integrations.

### 8 September 2026 ticket-inventory records

New public checkouts use four Firestore collections in addition to `publicBookings` and `seats{eventId}`:

- `ticketSeatOwnership/{encoded physical key}`: one active owner for `(eventId, venueId, sessionId, row, number)`, independent of any legacy display label or seat document ID.
- `ticketCapacity/{event-venue-date-session-paid}`: transactional `capacityByTier` and `reservedByTier` for the paid pool. Orchestra reserved rows are excluded before this record is created.
- `winnerOrchestraClaims/{event-registrant-orchestra session}`: active personal winner claim tied to the booking that created it. Unpaid confirmed cancellation deactivates only that claim.
- `ticketCheckoutKeys/{encoded event-and-key}`: maps an event-scoped checkout attempt key to a booking. The current implementation lacks a normalized request fingerprint and safe terminal/in-progress replay semantics.

Bookings persist `physicalSeatKeys`, `capacityReservation`, `personalWinnerBonus`, `winnerClaimId`, `idempotencyKey`, and `paymentUrl`. The first checkout for a legacy session migrates its existing active booking count into the capacity record inside the checkout transaction; later checkouts read the bounded record rather than scanning all session bookings.


### Implementation re-review — 8 September 2026

See [the current handover](TICKETING_IMPLEMENTATION_REVIEW_HANDOVER_2026-09-08.md) for source references, nine failing follow-up checks, and remaining work. These four records describe the new public checkout path, not a completed migration or a universally enforced inventory boundary. Public Customers and legacy writers can bypass physical ownership; existing occupied aliases are not all represented. Duplicate failed-booking cleanup can subtract another booking's capacity and quota. Current cached configuration writes can invalidate reservations and reset seat documents.

Invoice Paid is the normal fulfillment signal; Payment In processing is outside the required APCS fulfillment scope. Provider callback registration is a separate configuration concern. Both paid callback routes still require authentication, stored invoice matching, reliable notification/reconciliation handling, and deduplicated delivery. Only verified provider cancellation permits unpaid inventory release; a truthy API return alone has not been validated against the live provider contract.

No collections or application data flow were changed by this review. Documentation now includes the existing fourth collection (`ticketCheckoutKeys`) and corrects earlier broad ownership, exactly-once refund, Masterclass assignment, and payment-URL statements. Measured offline result: 49 baseline passes plus 9 failing follow-up safety checks.

### Follow-up implementation — 8 September 2026

The implementation repair changes the existing ticketing records, not the collection set. `ticketCheckoutKeys` now additionally stores `requestFingerprint`, a normalized event-scoped cart identity. A key can replay only its matching pending checkout; terminal attempts and changed carts do not return a payment URL as a successful new checkout.

`ticketSeatOwnership` is now maintained by the public checkout, Public Customers manual assignment/Mark Paid, and legacy `TicketRepository.confirmSeatSelection` paths. Writers query matching seat documents for the canonical physical identity before updating raw seat status, then write the ownership record in the same transaction. `winnerOrchestraClaims` is also exposed as claimed session IDs on eligible-winner responses for UI allowance preview; it remains enforced only by the checkout transaction. Invoice Paid fulfillment requires the stored provider `invoiceId` and amount.

The offline audit now has 58 passing checks (including the nine review regressions). This does not establish deployed Firestore rules/transactions, provider authentication, or external payment/cancellation behavior.
