# Ticketing repair plan — 7 October 2026

Scope source: [repair prompt](TICKETING_REPAIR_PROMPT_2026-10-07.md) and [handoff](TICKETING_REPAIR_HANDOFF_2026-10-07.md). Evidence baseline: 153/153 offline audits; emulator integration 13 pass / 7 fail ([historical result](audits/ticketing-emulator-results-2026-10-07.json)). This plan does not certify launch readiness.

## Decisions settled before planning

| Rule | Decision | Source |
| --- | --- | --- |
| Marking a group grants admission | No. Classify and hide only. | Owner, handoff |
| Orchestra admission ceiling | None in software; staff manage capacity. Competition numbered capacity remains enforced. | Owner, handoff |
| Performance-linked quota (`complimentaryQuota`) | **Informational only, for orchestra sessions only.** Assignment and Orchestra Settings no longer reject because of the quota; it is displayed for planning. Competition seat/tier limits are unchanged. | Owner answer, 7 Oct 2026 |
| Attendance-group scheduling data | **Venue and date only.** No performer-session (slot) link, no time, no seat generation, not projected as a ticketable performance. | Owner answer, 7 Oct 2026 |
| Classification after publication | Draft-only. Published groups stay read-only (existing protection). No transition policy is added. | Handoff safe default; APCS2026 is still draft |
| Legacy paid-capacity migration | Excluded. No data deletion. | Owner |

## 1–3. Payment receipt, early callback and ambiguous invoice recovery

**New collection `ticketPaymentReceipts/{safeId(bookingId|providerInvoiceId)}`** (backend-only; client writes denied by rules).

- Both callback routes (`/public-ticket/webhook` and the generic `/payment/webhooks/paper-id` used by staging) call one shared service. Archived-test guards and registration-payment routing stay in place; the registration branch is unchanged.
- **Receipt first:** for an existing non-archived public booking, the paid payload is stored durably before fulfillment. If the receipt cannot be stored, the route answers **HTTP 500** (nothing durable exists, so a provider retry is the only recovery). HTTP 200 is returned only after the receipt exists, whether or not fulfillment finished.
- **Fulfillment** reuses `handlePublicTicketWebhookPaid` and marks the receipt `processed` inside the same transaction as the booking `PAID` update. Duplicates converge on one receipt and one paid transition; confirmation email is sent only on the first transition.
- **Trust levels:**
  - Pending booking whose saved invoice ID equals the callback's invoice ID: the existing check (invoice ID, amount, currency, seat ownership). Unchanged.
  - Booking without a saved invoice ID (early callback or lost invoice response), or a `failed` booking whose inventory is still held: the callback is **not trusted**. The receipt is applied only after `GET {PAPER_BASE_URL}/sales-invoices/{invoice_id}`, called with our API credentials, returns `number == bookingId`, `payment_status == paid` and `total == booking.totalAmount`. This endpoint is Paper.id's documented "Retrieve a Sales Invoice Details" API and was observed on staging during the audit. A verified invoice ID is adopted onto the booking atomically with `PAID`.
  - Expired bookings, failed bookings already released, invoice-ID conflicts, and amount/currency mismatches become `needs_review` (durable, never released automatically, shown to staff).
- **Early callback:** the receipt waits (`pending`). Checkout replays receipts for its booking right after saving the invoice ID; the worker also retries.
- **Restart recovery:** new `PublicTicketPaymentRecoveryJob` processes `pending` receipts at startup and every 2 minutes, with backoff. After 48 attempts (roughly a day at the 30-minute cap) a receipt moves to `needs_review`. That stops automatic retries but never releases inventory.
- **Inventory:** failed bookings with an unknown outcome keep their hold until provider truth arrives (verified payment) or staff complete the existing provider-confirmed release. No timer releases.
- **Staff visibility:** the booking gets a small `paymentReceipt` marker (`pending`/`needs_review`, reason). Public Customers shows it as a tag.
- **Dependency and limits:** a lost invoice response with **no** callback cannot be discovered automatically, because Paper.id's list API has no invoice-number filter. Staff keep the existing manual provider check. Callback authenticity (an unsigned payload for a normal pending booking with matching invoice ID) remains the deferred finding; no signature contract is invented.

## 4. Seat regeneration race

Generation moves to a protected backend endpoint (`POST /public-ticket/admin/seats/generate`, Firebase token + whitelist). Each chunk runs in an Admin SDK transaction that reads every target seat document (current and legacy ID) and the canonical `ticketSeatOwnership` record, then:

- skips any seat that is locked, booked, reserved, or carries a booking/lock reference;
- skips any physical chair with active canonical ownership (no misleading "available" alias);
- writes the layout only for available or missing seats.

Checkout and staff transactions on the same documents therefore serialize with generation. The draft-schedule refusal and the `sessionsSeatsGenerated` flags stay. `uploadFullSeatLayout` keeps its name and callers but calls the endpoint.

## 5. Paid unselected-seat assignment

New protected endpoint `POST /public-ticket/admin/assign-seats` runs one Admin SDK transaction. Server SDK transactions support query reads, so alias queries stay inside the atomic boundary. It keeps the paid / numbered / session / tier / quantity / ownership / alias checks and adds `physicalSeatKeys` alignment plus a staff audit entry. Public Customers calls this endpoint instead of the Web SDK `Transaction.get(Query)`.

## 6. Orchestra attendance groups

- Planning group field `purpose`: `competition` (the default, and what existing groups without the field mean) or `orchestra_attendance`. Persisted by `saveGroup`/`saveDraft`, returned on reload, edited in the Admin Page group modal.
- Attendance groups keep venue and date. Saving one with a slot link is rejected.
- Publication validates slots and times only for competition groups and requires at least one competition group. Attendance members are still checked for event registration and uniqueness. Publish projects only competition groups into `sessionAssignments` and venue times, and writes `attendanceOnlyRegistrantIds` on the same document.
- Readiness and seat generation skip attendance groups. Performer Sessions usage ignores them.
- Discovery (public and winner) excludes `attendanceOnlyRegistrantIds`. Checkout rejects them before and inside its transaction, so a stale or forged competition request cannot buy a performance for an attendance member. Direct `public_orchestra` purchases are unchanged: session and quantities, no registrant.
- Registration history, paid-attendance derivation and counters are untouched.

## 7. Staff-managed orchestra capacity and the informational quota

For orchestra sessions only:

- Direct public orchestra checkout no longer applies tier ceilings or the total ceiling taken from competition `seatConfig`, nor the quota reconciliation check. It still validates Presto/Allegro, positive integer quantities, server prices, no seats/add-ons, idempotency, and increments `ticketCapacity.reservedByTier` transactionally as a headcount (`capacityPolicy: staff_managed`).
- Orchestra Settings save drops the venue-ceiling and quota-versus-assigned checks; it still validates a non-negative whole number and the existing move/delete/competition-slot protections.
- Group assignment drops the venue-ceiling and quota checks. It keeps paid-group derivation, the legacy conflict block, the notification lease, previous-counter reconciliation and exact add/remove of `freeSeatingAssigned`.

Competition sessions keep the tier capacity check, seat locks and ownership exactly as today.

## Tests

- Offline audits: revise quota and capacity assertions that encoded the old ceiling (explicitly marked as policy revisions). Add receipt, recovery, classification, assignment and generation regressions.
- Emulator integration (8082, guarded): keep the historical JSON; add regressions for receipt/restart, early callback, lost invoice with provider verification, provider-unpaid hold, generation overlap, backend staff assignment under contention, classification persistence / discovery / forged checkout / direct orchestra, and orchestra exceeding the layout while competition capacity holds. The obsolete Web SDK capability probe is replaced by the backend assignment check. Unsigned-callback acceptance stays a visible deferred failure.

## Not changed in this batch

Callback signature/authentication, the global-settings write route, rate limiting, slow-checkout UI recovery, stale price/eligibility reads, provider URL handling, production opening configuration, the frontend `e3` startup error, the legacy capacity writer, and the Paper.id client-side Mark Paid path.
