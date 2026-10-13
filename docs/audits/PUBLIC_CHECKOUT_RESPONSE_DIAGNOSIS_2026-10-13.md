# Public checkout response and email evidence — 13 October 2026

The owner reported `Cannot destructure property 'bookingId' of 'res.data' as it is undefined.` after public ticket checkout, while receiving WhatsApp and two emails. The initial investigation recorded that evidence, reproduced the exact frontend error offline, and checked the supplied staging/production callback formats without changing application behavior or database/provider records. The owner then requested a fix; the authorized implementation and current verification are recorded below.

## Evidence and timeline

The screenshots identify booking **`6ttrB0C9s4Zi6zY89Qfu`**, buyer **renald test**, performance **Afra Vahri Rafidla**, total **Rp 1,358,000**, Behring Theatre on **14 November 2026, 10:00–11:00**. The saved invoice is **`9747e8c5-09b7-4e16-a258-dd799c71125c`**, with URL **`https://stg-v2.paper.id/dfMzGF5`**. They show an APCS temporary seat reservation/payment-request email and a Paper.id invoice email, rather than a paid admission confirmation.

- [Original APCS seat-hold email screenshot](evidence/2026-10-13-public-checkout/apcs-seat-hold-email.png). SHA-256: `713f6a725b63b9954b9e37093d5f7b84fa2addbcfb73c5234e87cb410ef1892f`.
- [Original Paper.id invoice email screenshot](evidence/2026-10-13-public-checkout/paper-invoice-email.png). SHA-256: `3c18b586f2f9b8c921eae8f2309439e48e76f423e35a6fcfe7c3e6e9b266f5f3`.
- [Selected original backend log events](evidence/2026-10-13-public-checkout/booking-log-extract.json).
- [Relevant local emulator readback](evidence/2026-10-13-public-checkout/local-record-readback.json).
- [Owner-supplied illustrative callback examples](evidence/2026-10-13-public-checkout/supplied-webhook-examples.json). These are examples supplied in chat, not callbacks received for this booking.

WhatsApp receipt is the owner's report; no WhatsApp screenshot/provider delivery event was supplied. The email screenshots prove the owner received these two messages. The provider's creation log alone would not establish inbox delivery.

All displayed times below are **13 October 2026, Asia/Jakarta (WIB)**. JSON evidence retains original UTC timestamps.

| Time | Evidence |
| --- | --- |
| 10:21:35.016 | Booking committed and F5 locked; the invoice creation attempt follows. |
| 10:22:28.303 | Backend logs the returned Paper.id invoice ID and its email-send message. |
| 10:22:28.326 | Saved `invoiceCreatedAt`: approximately **53.3 seconds after booking creation**. |
| 10:22:32.631 | APCS seat-hold email send completes: approximately **57.6 seconds after booking creation**. The controller returns checkout success after this awaited send. |
| 10:51:34.901 | Saved local cancellation-request deadline. |
| 13:30:24.974 | Running background sweeper requests provider cancellation. |
| 13:30:27.894 | Backend logs successful Paper.id invoice deletion/cancellation. |
| 13:30:28.326 | Local booking becomes `expired`; F5 is available, ownership is released, and both reserved tier counts are zero. |

The local readback has **zero paid notification receipts** and no `emailSent` field for this booking. No PAID transition or paid-confirmation send is present in the selected evidence. The screenshots therefore establish successful booking/invoice creation and payment-request delivery; they do not establish payment. The earlier read-only provider invoice lookup returned HTTP 404 after cancellation. No payment or provider cancellation was initiated by this investigation.

The exact reason cancellation occurred later than the local deadline remains unverified. Thirty minutes requests provider cancellation; it is not a provider-enforced payment cutoff. APCS retains holds until provider cancellation succeeds.

## Why the page crashed after the server created an invoice

The traced path is `PublicTicketBookingPage.handleSubmit` → `apis.publicTicket.createBooking` → shared `postRequest` → `HttpService.post` → backend controller/service/repository → Paper.id invoice creation → saved invoice ID/link → APCS holding email → HTTP 201 checkout result.

`HttpService` sets a **30,000 ms timeout**. Creating this invoice alone exceeded that timeout, and the controller also awaits the holding email. A client timing out does not undo a committed booking or stop the backend's external work.

The exact defect is in the API error boundary:

1. A timeout/network error can have **no `err.response`**.
2. `handleErrors` returns `{ error: err.response }`, which becomes `{ error: undefined }`.
3. `handleSubmit` checks `if (res?.error)`, so this result passes its error check.
4. Destructuring `res.data` throws the owner's exact error. Navigation to `/waiting-payment/:bookingId` never occurs.

The actual API wrapper and submit handler were executed with a substituted transport. A timeout with no response reproduced the exact error; normal Paper.id checkout, manual checkout, and HTTP 409 controls followed their expected paths. The timeout case retained the existing checkout idempotency key.

The original browser Network/HAR trace was not supplied and no browser was used. Consequently, **timeout is strongly supported by the real timestamps**, while a network/CORS disconnect is an alternative transport trigger for the same proven error-handling defect. A successful Axios response containing the controller's expected fields does not reproduce the crash.

Reproduce from the monorepo root without network, React rendering, database access, invoices or emails:

```sh
node docs/audits/evidence/2026-10-13-public-checkout/checkout-response-probe.cjs
```

Before the repair, the command printed the exact failing timeout result alongside successful controls. The deterministic safety assertion was **red** before implementation and is now **green**:

```sh
node docs/audits/evidence/2026-10-13-public-checkout/checkout-response-probe.cjs --assert-safe-errors
```

Originally that assertion failed because a transport error reached response destructuring. The probe now checks the repaired behavior by default, while the original error remains recorded above. The initial diagnostic request made no application repair; the subsequent authorized repair preserves meaningful transport-error reporting, validates the checkout response before navigation, allows more time for invoice creation, and retains/reuses the same idempotency key when the checkout outcome is uncertain. Retry must not create a second invoice or release inventory merely because the browser timed out.

## Staging and production callbacks

Both `PublicTicketController.handlePublicTicketWebhook` and `PaperController.handlePaperWebhook` normalize the payload using the top-level `invoice` when present, otherwise `data.invoice`. Public bookings then use the same durable receipt/reconciliation/payment fulfillment path.

| Payload supplied by owner | Normalized invoice | Validated invoice total |
| --- | --- | --- |
| Staging `{ message, data: { invoice } }` | `data.invoice` | `total_amount` |
| Production `{ invoice, message, payment_info }` | `invoice` | `amount` |

Fulfillment checks the saved provider invoice ID, booking reference, invoice total, optional currency and owned seats. `amount_due` is **not** the paid total; production `payment_info.bank_transfer.paid_amount` is not substituted for `invoice.amount`. If `amount` and `total_amount` are both present, both must equal the booking's server-calculated total.

APCS sets the provider invoice `number` to its **booking ID**. The owner's illustrative `INV/...` values are preserved as evidence, but are not valid references for this local booking; literal replay would not route to it. The offline tests substitute the fixture's booking ID, invoice ID and total while retaining each supplied payload structure. They were not sent to the running API or provider.

Eight new actual-controller regressions in `apcs_service/audit/ticketing-repair.audit.cjs` cover each format through each route: successful payment/seat booking/processed receipt/confirmation, replay through the other route without a duplicate confirmation, and incorrect invoice totals despite matching `amount_due`. The focused command passed **100/100 offline checks**, including the new eight:

```sh
node --test --test-reporter=spec apcs_service/audit/ticketing-repair.audit.cjs apcs_service/audit/public-ticket.audit.cjs
```

Firestore, provider calls, email and timers are substituted. This verifies handling of the two supplied structures; it does not certify production webhook delivery or callback authenticity. This booking had no real paid callback to reconcile.

## Why Email Status says PENDING/FAILED

This section records the column's behavior at diagnosis time, before the authorized label repair described below.

Public Customers' **Email Status** column reads `publicBookings.emailSent` for Paper.id bookings. That field is written by `PublicTicketPaymentService.sendConfirmation` after the **paid-booking confirmation** is sent, not when Paper.id sends its invoice or APCS sends its seat-hold email.

The holding email is sent inside the backend controller before its checkout response; it does not set `emailSent`. The invoice email/WhatsApp delivery is requested by Paper.id invoice creation, separately from that flag. Thus both payment-request emails can arrive while `emailSent` is absent. The column renders red **PENDING/FAILED** for both an absent flag and `false`, so its wording conflates not-yet-sent paid confirmations with actual send failures.

The page crash neither sets `emailSent: false` nor changes payment status. It prevents opening/navigation to the payment waiting flow. Pending payment requires a confirmed paid callback; receiving invoice/holding emails alone does not qualify. The backend can process a valid paid callback independently of whether the buyer's checkout page navigated successfully.

## Owner acceptance after a targeted repair

1. Repeat checkout with provider latency longer than 30 seconds. Confirm the invoice/booking completes and the page opens Paper.id and navigates to its own waiting page without a JavaScript destructuring error.
2. For an uncertain network result, retry unchanged checkout details and verify the same booking ID/invoice is reused. Inspect the booking directly rather than treating another invoice email as another payment.
3. Complete a genuine staging payment for a new test booking. Verify provider payment, stored processed receipt, local PAID state, booked seat, confirmation send flag and received paid-confirmation email separately. Do not pay the canceled invoice in this evidence bundle.
4. Compare the two unpaid payment-request emails with the later paid confirmation. Check the repaired APCS Email Status labels against payment/confirmation state, as described below.

Initial diagnostic self-review: the diagnosis distinguishes server-side booking success from payment and client navigation; covers both callback routes/formats; preserves all source/customer/database records; adds only evidence, documentation and offline regressions. No browser, start/build command, deployment, database/provider mutation, email send, process restart, commit or push was performed by the initial investigation.

## Authorized repair after the owner's follow-up

The owner explicitly requested implementation after the diagnosis. The following targeted changes are now in source:

- `apcs_web/src/apis/index.js`: the public checkout request uses a **90-second timeout**, preserving the shared default for other calls. Backend rejection messages remain visible; timeout/network failures without a response reject with guidance to retry the same details or contact APCS because a reservation may already exist.
- `PublicTicketBookingPage.js`: safely reads an optional response, validates booking identity and the required pending Paper.id link, displays an invoice-in-progress response without navigating, and retains the checkout key on any uncertain result. A matching retry reuses the same key. Already-paid results reach the payment-status route without reopening the invoice. Pending manual checkout still uses its payment-instructions route.
- `PublicTicketController.js`: a retry that finds the existing pending booking before the original invoice link is saved returns **HTTP 202** with that booking and a message. It does not send a holding email with an empty payment link. The original request continues normally. An actual-controller regression proves one invoice and one complete holding email in this interleaving.
- `PublicCustomersList.js`: **APCS Email Status** shows AWAITING PAYMENT for an unpaid pending Paper.id booking and NOT APPLICABLE for unpaid terminal states. A paid confirmation is SENT for explicit true, FAILED for explicit false, and NOT SENT for an absent result. Pending manual payment-info statuses are preserved; tooltips explain the different email types.

No booking/payment schema, Firestore collection, inventory state, saved invoice, provider integration or 30-minute cancellation policy was changed. The old canceled invoice in the screenshots was not reopened or paid. This repair changes request/response handling and the interpretation of existing email-status fields.

Verification results:

| Check | Result |
| --- | --- |
| Original no-response timeout safety probe | Green; recovery guidance shown, key retained, no malformed navigation |
| Focused frontend handler/API/renderer plus existing API regressions | **34/34 passed**; actual source executed without DOM/browser |
| Complete offline backend suite | **209/209 passed**, including both callback formats/routes and the new in-flight invoice retry |
| ESLint on changed frontend source/tests | **0 errors**, four existing warnings (`orderBy`, `fetchCustomers` dependency, `patchRequest`, duplicate legacy `payment` key) |
| Backend syntax and diff whitespace | Passed |
| Existing frontend dev-server webpack status, read through its local compiler socket | Warnings, **no compilation errors**; this is a compiler check, not browser UX proof |

Frontend tests failed on the original timeout/response/label cases before the implementation. The in-flight retry backend test also failed first because an empty-link holding email was sent. They pass after the targeted repairs. The frontend toolchain also emits existing CRA dependency/open-handle notices; dependency files were not changed.

Self-review passed: existing API conventions are retained outside this call; manual, pending Paper.id, missing-response, invoice-in-progress and paid branches use defined values; uncertainty retains the correct checkout key; paid and invoice emails remain distinct. There were no application variables/imports removed; the renamed test variable was swept for stale references. Changes remain uncommitted and preserve unrelated development configuration/work.

### Owner walkthrough

1. Restart the existing backend through the usual workflow to load the HTTP 202 retry guard, and refresh the frontend. The existing dev compiler already accepted the frontend changes. No process restart was performed by the agent.
2. Create a new staging test checkout. Allow for a slow invoice response; it should open Paper.id and route to the matching waiting page after receiving a valid booking/link. If a popup is blocked, use the waiting page's payment link.
3. If a request times out or disconnects, keep the same checkout details and retry. Expect recovery guidance, then the same booking/invoice after creation completes. A retry during invoice preparation should show the preparing message, retain its key, and create no new invoice or empty-link holding email.
4. Pay a new staging invoice and check provider settlement, processed receipt, local PAID status, booked seat, paid-confirmation send and inbox receipt separately. Replay handling for both payload formats is covered offline; production delivery/authenticity remains separate acceptance work.
5. Inspect APCS Email Status: pending Paper.id orders should say AWAITING PAYMENT; the expired screenshot booking should say NOT APPLICABLE; a paid successful/failed/unrecorded confirmation should say SENT/FAILED/NOT SENT. Pending manual payment info keeps its existing labels.

No browser, live checkout/payment, callback to the running API, email, database mutation, start/build command, deployment, commit or push was performed for the repair. The backend guard requires its normal restart; browser appearance and provider/inbox acceptance remain owner checks.
