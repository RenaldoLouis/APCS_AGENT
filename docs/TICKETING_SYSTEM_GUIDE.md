# APCS Ticketing System Guide

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

Use **Add performance group** for the upper board and **Add orchestra group** in the lower **Orchestra Attendance** table. Attendance rows show group, venue, date, registration count and a searchable attendee selector. The selector includes eligible registered children who already have a performance group, shows their current performance group and teacher, and shows children assigned to another attendance group as disabled options labeled with that group. Existing stored members remain visible, including missing-record placeholders, so membership is not silently deleted.

A child can have one performance assignment and one attendance assignment. The left pool and assigned count refer only to performances. Adding/removing an attendee never moves their performance; deleting a group affects only its own membership. **Save Changes** saves both sections, **Discard** restores both, and **Clear All** clears both with an explicit confirmation. Published plans remain read-only. Group-type conversion is available in draft and rejects membership conflicts within the destination type.

Attendance groups stay outside ticketable performance lists. A child in both sections remains listed by their performance group after publication/readiness and can buy under the normal eligibility rules. Only children without a performance assignment are classified as attendance-only and excluded. Membership does not itself issue free admission or tickets; the existing paid Orchestra Assignments workflow and admission arrangements remain separate.

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
| Seat Occupancy | Inspect numbered competition seats, search performer/reservation names for session and seat details, and reconcile linked locked competition bookings; historical orchestra seat rows are hidden |
| Admin Page | Drag performers into draft groups, mark groups as Competition performance or Orchestra attendance, link competition groups to draft sessions, publish, and finalize competition sessions; retain legacy assignment tools |

Masterclass Settings and Masterclass Assignments are removed from this menu. Public Customers remains a separate main-menu page for booking status, paid competition seat assignment, manual-payment confirmation/cancellation, payment-instruction resend and confirmation resend.

## Setup

1. Select the correct event in System Settings.
2. Check venue labels carefully: these names appear in buyer emails. Configure tier/row capacity and competition time slots.
3. Set competition and public ticket prices. Public orchestra tickets use `presto` and `allegro`; new Masterclass sales and Presto Masterclass benefits are disabled.
4. Add orchestra sessions from venue/date/time options. Each has an informational **performance-linked attendance quota** for planning public competition ticket holders, winner ticket holders and eligible performers. Orchestra Settings does not generate numbered seats or ask for reserved rows.
5. *Updated 7 October 2026.* Orchestra admission has no software ceiling. Neither the quota nor the competition seat layout limits direct orchestra sales or group assignment. Staff must arrange enough seating for confirmed attendance; free seating is not a guarantee of unlimited physical space.
6. Save winners' competition assignments in Admin Page. They do not need an orchestra assignment before purchasing tickets.

The backend requires a whole-number quota of zero or more and prevents moving/deleting sessions with active attendance or reusing a competition slot with active bookings/performers. It no longer rejects a quota below current assignments or above the competition layout. Other older configuration pages and live database access still require care; these checks are not a general migration tool.

## Winner purchases

The winner selects their name/winning performance, then buys tickets for the competition venue/date/time already assigned by the internal team. Ensemble member names remain visible. Competition seat selection and remaining add-ons retain their existing behavior.

The customer does **not** select an orchestra session or numbered orchestra seats. The checkout has four steps: entry, tickets, details, review/payment. There is no complimentary quota banner, free-orchestra-seat step, Masterclass add-on or complimentary Masterclass notice.

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

Without the add-on, or for tickets not covered by it, staff assign the remaining performance seats after payment in **Public Customers → Assign Missing Seats**, then resend the confirmation. Switching to another performance or Orchestra Ticket clears the previous seat/add-on selections. Orchestra-only checkout has no seat-selection add-on or numbered seat map.

The public performance list is not restricted to winners currently allowed to make a winner purchase, but public sale dates still control checkout. An older public competition checkout made without a selected performance retains its original competition-only entitlement; it is not converted into an orchestra booking.

## Direct public orchestra purchases

The buyer chooses an orchestra session, then Presto or Allegro quantities and contact details, and pays. There is no numbered seat map, seat-selection charge or Masterclass benefit. The payment confirmation names the orchestra venue/date/time and explains free seating within the purchased category. Public purchases do not receive extra performer places.

Direct orchestra purchases do not create a second complimentary place or a performer allowance.

The purchased venue/date/time must match an existing `events.orchestraSessions` entry and an existing venue, both before and inside the checkout transaction. Orchestra times do not need entries in the competition `venues[].sessions` timetable. An unknown or removed orchestra slot is rejected before invoice creation. Competition purchases continue to use their own published timetable, performance assignment and seat/capacity checks. No timetable duplication or database migration is required for the 9 October checkout repair.

## International PayNow or bank-transfer option

On **Review & Pay**, a buyer may opt into **Use international payment options (PayNow or bank transfer)**. This applies to public and winner checkouts. The choice is self-declared; it does not use the registrant's country or phone prefix. The ticket booking is reserved with no Paper.id invoice or 30-minute expiry. The buyer receives a ticket-specific email with the server-calculated IDR total, booking ID, existing PayNow/bank details and a request to reply with payment proof. PayNow buyers must contact admin for the SGD amount. The acknowledgement page displays the booking ID; the booking stays pending until staff act.

After verifying payment outside the system, open **Public Customers → Mark Paid**. The protected backend rechecks pending state and owned inventory, books selected seats, records the staff actor and attempts the standard ticket confirmation email. If delivery fails, use **Resend**. For an unpaid manual booking, staff first verify no payment was received, then choose **Cancel Unpaid**; the protected action releases its complete reservation. **Send/Resend Payment Info** retries instructions while the booking is pending. Do not use these manual actions for a Paper.id invoice booking.

## Assign paid winners after payment

1. Open **Orchestra Assignments**. Refresh to load current paid groups. Use **Load more** when more paid-booking pages are available; a page may have no eligible winners.
2. Review each performance's paid public competition tickets, paid winner tickets, performer count, total attendance and already assigned quantity. The group includes all eligible paid purchases even if bookings span pages. Public-only groups have no performer allowance.
3. Select one orchestra session for the whole group. Each option shows the current assigned headcount and the informational quota.
4. Click **Assign & email**. The server rechecks the paid group and assigns the whole group without truncating it. The quota does not block the assignment, so check physical seating yourself.
5. Each covered booking buyer receives an English APCS email with the logo header and copyright footer, booking reference, orchestra venue/date/time, own purchased quantity and shared group headcount. Seating is free; no seat numbers are assigned. Ticketing screens and emails use English-only copy until a proper translation feature is implemented.
6. If delivery fails, the assignment stays saved. **Retry email** sends only missing deliveries for the current assignment revision. Refresh before retrying a busy send.

A later purchase does not invalidate existing confirmed places. For an ensemble that grows from seven to nine attendees, the table shows nine total and seven assigned. Staff must update the assignment to cover all nine. If the room cannot physically fit the additional attendees, choose another session for the entire group; all covered buyers receive the revised details.

Session changes produce a new assignment revision and fresh notifications to all covered bookings. Re-saving an unchanged assignment does not consume quota again. The email-send lease prevents simultaneous retries; after a crash during SMTP delivery, a retry can still duplicate an email if its success was not saved. There is no automatic background retry worker.

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
