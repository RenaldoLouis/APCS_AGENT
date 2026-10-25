# Paid documentation customers — owner acceptance

## Scope and agreed behavior

Public Customers centralizes existing ticket bookings and staff records of documentation purchases paid outside APCS. The owner selected **already paid only**. The new form collects a required name (maximum 200 characters) and optional multiline note (maximum 2,000); payment is fixed to Paid and the record is marked documentation only / without seat. Name/note can be corrected later. No amount/contact fields, unpaid workflow or documentation-delivery action is included.

`documentationCustomers` is separate from `publicBookings`. Only this screen combines them for display. No ticket, admission, seat/capacity/ownership, payment-provider receipt, orchestra attendance, assignment or redemption is created. Existing checkout and ticket-admin implementations are unchanged.

## Manual checks in your browser

1. Sign in as whitelisted staff, open Public Customers and select the intended event. Record the event's existing missing-seat badge and any relevant seat/orchestra totals.
2. Choose **Add Documentation Customer**. Confirm the event, PAID marker and documentation-only/no-seat notice. A blank/whitespace name must fail and retain the form. Enter a name and a multiline note, then save.
3. Confirm one new row shows the saved name/note, **Documentation only**, **PAID**, **No seat**, **Recorded offline**, and email **NOT APPLICABLE**. No venue/session is fabricated. Expand the row: it must show documentation details, without ticket entitlements or an Assign Missing Seats button.
4. Confirm its Actions contains **Edit Customer**, without Resend, Send to Another Email, Mark Paid, Cancel Unpaid or booking Delete. Edit the name/note; save, refresh and reload the page. Verify persistence and unchanged Paid status. Clear the note and save to check that the customer remains.
5. Search the customer name. Paid and All Payment Statuses must include the record; Pending and Expired must exclude it. Switch to another event and back; no record should appear in the wrong event. Equal IDs across the two collections must still have distinct table rows.
6. Check a normal pending ticket booking and a normal paid booking. Their original settlement/email/seat-assignment controls should remain. Confirm the event's missing-seat count, Seat Occupancy, Orchestra Assignments/Settings and Ticket Redemption have no new entitlement or headcount from the documentation customer.
7. For concurrent editing, open the same documentation record in two staff sessions. Save in the first, then save the second's older draft. The second must reject and retain the draft; copy it, cancel, refresh and reopen before reconciling.
8. A failed save must retain the form/name/note and show no success. Retry the unchanged create form if an acknowledgement was lost; it reuses its allocated ID. Saving must disable duplicate submission, form dismissal and event switching. If the documentation collection cannot load, its warning must be visible while ticket bookings still load; Refresh retries it.

## Release and limits

This feature changes frontend source only and adds one collection on first use. Existing checked-in whitelist rules and the saved production-rule snapshot cover it without permission expansion; deployed rules were not inspected or changed during implementation. Release the frontend normally and verify hosted persistence. No schema migration, composite-index definition or backend endpoint/restart is needed for this feature.

Automated checks substitute Firestore/auth and inspect actual React handlers/renderers without a browser. They establish source behavior and write isolation, not deployed authorization, live contention, UI appearance or payment receipt. No production record, transfer, provider request, email or documentation delivery is created during verification. See [progress](progress.md) for the completed check counts and [architecture](architecture.md#24a-documentationcustomers-collection) for the collection schema.
