# Public Customers — Seat Tier Assignment Walkthrough

Updated 14 October 2026. The assignment map labels ticket sections so staff can match numbered seats to purchased tiers.

## Owner browser acceptance

Use an appropriate local/test booking for any save check.

1. In **Ticketing System → Public Customers**, select the booking's event. Expand a paid numbered booking that needs seats and choose **Assign Missing Seats**.
2. Confirm there is one stage and the map shows **Presto section** above the gold Presto seats and **Allegro section** above the blue Allegro seats. Compare the boundaries with the venue's saved seat configuration. Headers appear once per section and use the fetched seats' `areaType`; neither A–D/E–H nor any other row range is hardcoded. If the session has historical Lento seats, check their purple section as well. A missing tier should not produce an empty section.
3. Hover seats in both sections, including occupied seats. The tooltip should show the seat label, section name and existing availability/customer information. Booked, reserved and locked seats keep their status colors and cannot be selected.
4. For a booking with two Presto and two Allegro tickets and no assigned seats, select two available seats in each section. Confirm the dark selected seats retain their section color in the number/border, the total reaches four and an additional seat cannot be selected. Deselect and reselect one seat to check the count. Save once, review the refreshed labels/count and use the existing resend action only if an email is intended.
5. For a partially assigned booking, retain its existing seats and select only the remaining purchased quantities by tier. The note shows the full purchase; the required selection count shows the missing total. Server validation counts existing and new seats together and remains authoritative if the purchase tier or availability does not match.
6. Repeat the display checks for each venue, including the layout with a center aisle. Row labels, seat numbers, aisle spacing and horizontal scrolling should remain usable. Verify an unpaid or free-seating booking has no numbered assignment action and a fully assigned booking has no missing-seat action.
7. Open existing customer seat-selection or Seat Occupancy maps. Their existing labels, presentation and behavior should remain as before; the optional row-header renderer is enabled only in the Public Customers assignment dialog.

## Verified in source

- Seat data follows the existing event/venue/session-scoped read into the layout. Only transient `areaType`, seat color and tooltip/header presentation are added; there is no extra query or saved field.
- `CustomSeatPicker` retains its selection/read-only/locked-seat handlers, reserved disabling and status-color priority. An optional `renderRowHeader` inserts a section label before its first row without adding another stage or changing seat order.
- Saving still sends `{ bookingId, seatIds }` to the existing authenticated assignment endpoint. Its backend transaction continues checking paid state, combined tier quantities, venue/session, availability and physical ownership.
- Changed-file ESLint: **zero errors, two existing warnings** in Public Customers (unused `orderBy`, `fetchCustomers` effect dependency). The running frontend compiler reports warnings with **no compile errors**.
- Standards/spec/hygiene and conditional-branch self-review passed. No declarations were removed. No browser was opened; rendered layout and save/email acceptance remain owner checks.

See [seat booking architecture](SEAT_BOOKING_FLOW.md#2026-10-14--ticket-tiers-visible-during-staff-seat-assignment) and [staff guide](TICKETING_SYSTEM_GUIDE.md#2026-10-14--identify-presto-and-allegro-when-assigning-seats).

## Filter buyers needing seat assignment

Added 25 October 2026. Owner browser acceptance:

1. Select an event and choose **Needs seat assignment** from **All Seat Assignments**. Every result should have the existing gold missing-seat badge, including partially assigned paid bookings.
2. Confirm fully assigned, unpaid, free-seating, Masterclass-only and documentation-only purchases are excluded. Mixed competition/Masterclass purchases count only competition tickets.
3. Search for a matching name/email; clear the search. Paid retains matches; Pending or Expired shows the no-match message. Restore All Payment Statuses.
4. From a later page if available, change the seat filter and confirm page one. All Seat Assignments restores rows hidden by this filter.
5. Refresh retains filters. Switching events resets search, both filters and pagination. The gold event-wide count stays independent of display filters.
6. For a local/test booking, use the existing assignment workflow above. After all seats are assigned and the list refreshes, it should disappear from the filtered results. Filtering itself must not assign seats or send email.
