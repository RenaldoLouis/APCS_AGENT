# Browser and staging ticket tests — 9 October 2026

Status: **competition payment recording passed after callback reconnection; full sales acceptance remains incomplete**. Three test invoices reached PAID through genuine automatic staging callbacks. Public Customers and Seat Occupancy reflect persisted payments and staff assignments. Direct orchestra checkout has since been repaired in source with 176 offline passes and isolated Firestore/payment-service evidence; the owner backend needs a restart and no genuine post-fix staging/browser result is claimed. See [the repair follow-up](TICKETING_ORCHESTRA_SEAT_DIAGNOSIS_2026-10-09.md#authorized-repair-and-regression-results). Callback authenticity, lost-callback recovery and browser polling through the ngrok API remain unresolved. The matrix below preserves the historical browser results.

## Scope and safety

**Later seat-label repair:** the owner requested the Public Customers display fix. Its main Seats column now uses stored `performanceSeatLabels`, matching expanded Performance details, rather than splitting seat IDs. A9/E10 and E9/E8 renderer checks, empty/missing labels, JSX parse and the running development bundle pass. ESLint has no errors (two existing warnings); no new browser verification is claimed. The historical display defect in this report is fixed in source. Callback authenticity and missed-callback recovery were only investigated/recommended in that follow-up; no payment changes or customer notifications were made.

The owner authorized browser/API/hybrid testing of localhost tickets, Paper.id staging, Public Customers and Seat Occupancy, and explicitly overrode the repository's browser restriction for this run. Every checkout and notification uses only `renaldolouis555@gmail.com` and `082385590505`. All purchases use synthetic local event `QA_TICKETS_20261009` and synthetic performer `qa-ticket-winner-20261009`, never a real customer's identity.

The real application API runs through a private launcher: collection-wide sweeper/payment recovery/jury reminders disabled; mutations restricted to test-contact bookings; Paper.id invoice host/customer checked; every Nodemailer transport rejects other To/CC/BCC/envelope recipients. Firestore is the existing local emulator at 127.0.0.1:8081. Paper.id is staging, not production. No actual money, production write, deployment, build, commit or push was performed.

The initial browser purchase selected A10 with one Presto ticket and the selection add-on, reached a genuine invoice for Rp829,000, and correctly created a pending booking and seat lock. The original callback endpoint was unavailable. The owner then connected a replacement callback tunnel and requested this retest. New payments below used the genuine staging simulator and automatic provider callbacks; no fabricated payment callback or direct PAID write was used. The single later duplicate test replays an unchanged captured genuine provider payload.

## Retest matrix

| Scenario | Result | Evidence |
| --- | --- | --- |
| Public competition, no selected seat | PASS | Invoice total Rp529,000; provider paid; APCS PAID; amountPaid 529000; processed durable receipt; SMTP accepted confirmation |
| Winner, two tickets without selected seats | PASS | Invoice total Rp1,058,000; provider paid; APCS PAID; amountPaid 1058000; processed receipt; performerCount 1; orchestraAttendanceTickets 2 |
| Fresh selected-seat public payment | PASS | Rp829,000 = Presto 729000 + selection 100000; genuine callback; PAID; A9 booked with correct booking ownership; processed receipt |
| Public Customers after payment | PASS with display defect | Three rows PAID/SENT with correct buyer, contact, totals and session; expanded details show assigned seat labels |
| Staff Assign Missing Seats, public | PASS | Real signed-in browser selected E10 and saved through protected backend; booking and physical seat read back booked |
| Staff Assign Missing Seats, winner | PASS | Browser required two Allegro seats; saved E9/E8; correct paid owner and tier persisted |
| Seat Occupancy | PASS | Browser and Firestore both: total 80, available 75, locked 1, booked 4, occupancy 5% |
| Genuine callback duplicate via both routes | PASS | Generic and public routes each HTTP 200; one receipt with deliveryCount 3; PAID and inventory preserved; SMTP count unchanged 7 → 7 |
| Duplicate selected-seat purchase, initial phase | PASS safety | A10 rejected as unavailable before creating another invoice; business rejection currently HTTP 500 |
| Direct public orchestra purchase | FAIL, repeated after reconnect | Buyer-visible configured orchestra slot returns HTTP 500: Selected venue session is unavailable |
| Original invoice paid during outage | UNRESOLVED | Provider previously confirmed paid; APCS still pending, A10 locked, no receipt; second simulation returns HTTP 404 |
| Browser payment status with loopback API | PASS | Actual browser shows Payment Successful for the paid public booking |
| Browser payment status through owner ngrok API | FAIL setup | Browser API receives HTML warning; page stays Waiting; polling raises undefined paymentStatus |
| Offline audits, initial phase | 170 PASS | Unchanged audit run under installed Node 20 |
| Isolated real-Firestore transaction audit, initial phase | 23 PASS / 1 FAIL | Unsigned matching callback still persists PAID; provider/email substituted |

Earlier pending-state screenshots and audit files are retained as historical evidence. The offline and isolated transaction suites were not rerun in this callback-only retest; no ticketing business logic was repaired.

## Paid records and reconciliation

| Booking reference | Amount | Local result | Physical seats |
| --- | ---: | --- | --- |
| `v1MkDciRdE5hbYx22xyF` | Rp529,000 | PAID, amount matches, processed receipt, emailSent true | E10 after staff assignment |
| `nIQEU8hacFn6ukPUpwfU` | Rp1,058,000 | PAID, amount matches, processed receipt, emailSent true | E9, E8 after staff assignment |
| `qwyXksF3r3jU6y1D4wcE` | Rp829,000 | PAID, amount matches, processed receipt, emailSent true | A9 confirmed automatically |
| `RpCjw1OW3cLRf9qsZNGX` | Rp829,000 | Pending locally despite earlier provider-paid evidence | A10 remains locked |

Capacity reservedByTier is Presto 2 and Allegro 3: four paid ticket places plus the unresolved Presto hold. Physical ownership and inventory match these booking records. Every paid booking has one processed receipt. The public receipt increments deliveryCount from 1 to 3 after the two deliberate replay deliveries without repeating fulfillment or confirmation.

The first genuine retest callback reached `/api/v1/apcs/payment/webhooks/paper-id` through the owner's tunnel at 19:24:22 GMT+7 and returned HTTP 200. Subsequent winner and selected-seat callbacks also processed successfully. Seven backend emails across both phases were SMTP-accepted, all for the authorized test mailbox: four holding messages and three paid confirmations. SMTP acceptance and emailSent true do not prove inbox arrival; inbox delivery, provider WhatsApp/SMS and actual-money payment were not verified.

## Remaining failures

1. **Direct orchestra validation:** UI options come from `events.orchestraSessions`, while `PublicTicketRepository.js` requires the selected slot in competition `venues[].sessions` both before and inside the transaction (approximately lines 293 and 512). Titan competition is 08:00–09:00, orchestra is 15:30–17:30/19:30–21:30. The repeatable synthetic probe returns HTTP 500 before invoice creation. No fixture workaround hides this mismatch.
2. **Public Customers seat labels:** the main table uses `selectedSeatIds.map(id => id.split('_')[0])`, producing Venue and Venue, Venue. Expanded details correctly use performanceSeatLabels (A9, E10, E9/E8). Stored seats are correct; the main staff display is wrong.
3. **Callback authenticity:** the existing isolated audit reproduces an unsigned matching callback persisting PAID. Genuine delivery in this retest does not repair authenticity. The private guard applies only to this rehearsal.
4. **Lost callback recovery:** reconnecting the provider does not automatically recover the previously paid invoice with no received receipt. It remains pending/locked. A repeat simulation returned HTTP 404. Reconcile or redeliver with authoritative provider evidence; do not release A10 or use the client Mark Paid button as proof of provider verification.
5. **Local tunnel polling:** development config was first observed with an appended :8080, then changed during testing to unterminated URL strings. Two missing quotes were corrected. Browser testing temporarily used `http://localhost:8080`, which displayed successful payment. The owner's corrected HTTPS tunnel config was then restored. With a browser User-Agent, that endpoint returns ngrok's HTML warning instead of JSON; actual browser polling stays Waiting and raises a TypeError. Use loopback for localhost API calls, or separately configure browser access through the tunnel. The provider webhook POST works independently of this browser GET limitation.

## Evidence

- [Machine-readable retest](ticketing-web-2026-10-09/retest-summary.json)
- [Browser payment success through loopback](ticketing-web-2026-10-09/retest-payment-success.jpg)
- [Paid customers and expanded seat assignments](ticketing-web-2026-10-09/retest-public-customers-paid.jpg)
- [Final Seat Occupancy](ticketing-web-2026-10-09/retest-seat-occupancy-paid.jpg)
- [Browser polling through restored tunnel](ticketing-web-2026-10-09/retest-tunnel-polling-blocked.jpg)
- [Initial orchestra purchase failure](ticketing-web-2026-10-09/orchestra-checkout-blocked.jpg)

Private ignored files retain provider tokens, payment links, outbound logs, baseline snapshots, the actual captured callback and continuation scripts. These are intentionally excluded from the public evidence summary.

## End state and review

Restored local active event APCS2026 in a verified transaction. Fresh baseline comparison preserved all non-QA documents in the checked collections: 1,392 registrants, 1,388 original seats, four original bookings, one original assignment and three original events. Existing collections/schema were used; no production or customer data was changed. Synthetic QA bookings, seats and receipts remain for review.

The owner's ngrok tunnel and callback setting remain in place. The local API remains running in its test-only guard with broad jobs disabled; do not treat that launcher as the normal unrestricted API. Frontend/emulator are left running. The frontend's owner tunnel configuration is restored with only the two URL quote corrections retained. Its browser polling limitation remains unresolved.

Self-review: unchanged business logic; contact, host and emulator isolation verified; original records structurally compared; staff assignments and payment amounts read back; duplicate side effects checked; no removed declarations/imports or JSX changes; frontend config syntax and private script syntax checked. No claim of full sales readiness, inbox delivery, production authorization, deployment or load proof is made.

## Subsequent focused diagnosis

The owner later encountered a port conflict; the guarded test API was stopped and port 8080 freed. They restarted their own emulator-mode API. Direct requests against that current API reproduce both orchestra failures without ngrok. The focused seat matrix and burst timeout limitation are recorded in [the follow-up diagnosis](TICKETING_ORCHESTRA_SEAT_DIAGNOSIS_2026-10-09.md). The temporary isolated emulator used for that diagnosis was stopped.
