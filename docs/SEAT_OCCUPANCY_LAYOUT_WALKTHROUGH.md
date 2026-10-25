# Seat Occupancy — Buyer Names and Layout Search

## Download image

Added 26 October 2026. Owner manual acceptance:

1. Restart the backend. Upload `docs/seat-maps/Behring-seat-map.svg` and `Titan-seat-map.svg` as each venue's image in **Venue Settings**. Confirm the public booking page shows the same images as before, including Behring's 15 grey team-blocked seats, and that an open Admin Content schedule and Seat Occupancy still load.
2. Open **View Layout** for a Behring and a Titan session and select **Download image**. Compare the PNG with the dialog map: every booked, reserved, locked and blocked seat is grey, all others keep gold/blue. Check the header venue, date, time (customer display time where one is set), tickets left and snapshot time, and the legend.
3. Pick a session where a tier shows **0** in **Actual ticket availability**. All chairs of that tier are grey in the image, including unassigned chairs.
4. Block one available test-session seat, let the layout reload and download again; the seat is grey. Unblock it.
5. With **Ticket availability could not be verified** shown, the button is disabled. Before the upload in step 1, a download stops with a message listing missing seats instead of saving an image.
6. Close the dialog or select **Refresh layout & availability** while a download runs: no image from the old layout is saved, and Refresh is disabled during the download.

Source verification: see [progress](progress.md) for the 26 October 2026 entry.

## Actual ticket availability

Added 25 October 2026. **View Layout** now shows a Presto/Allegro summary above the existing map, using current checkout capacity rather than the number of chairs still awaiting assignment.

Owner manual acceptance (use existing suitable records or an approved test environment):

1. Open a generated competition layout. Confirm both tiers show total slots, booked/held tickets, blocked slots and actually available slots for this exact venue/date/time. Compare totals with Venue Settings and existing capacity/booking records; the calculation is total minus booked/held minus blocked.
2. Check a paid booking with no seat-selection add-on and no assigned chairs. Its whole ticket quantity must still be included. A fully reserved tier must show zero and **Fully booked / unavailable** even while its map contains unassigned chairs. Partial seat assignments must not subtract tickets twice.
3. Check pending Paper.id and manual-payment holds. They remain included regardless of an elapsed local timer. An unresolved failed checkout remains held according to its saved counter. A normal confirmed release reduces demand; selecting or assigning chairs for an already counted ticket must not change the ticket demand.
4. For an existing authorized block, confirm it reduces availability once without changing booked/held demand. Following an approved block/unblock action, the layout and summary refresh together. Do not create a production block only to test the display.
5. Use **Refresh layout & availability** after another staff/customer action. Close/reopen, choose a different session/venue, and switch events while a layout read is pending. Old counts must not appear in the new context. Name search changes only highlights/results and must not affect capacity.
6. In a test environment, check a session without a counter: only that exact session's paid/pending/unresolved-failed ticket quantities are summed, excluding completed failures, expired/canceled/archived and Masterclass bookings. No counter is written. Existing counter-backed sessions must keep using their saved counter, including retained reservations.
7. Simulate a denied/offline capacity read or invalid count in the test environment. Expect **Ticket availability could not be verified**, with refresh available and no invented available number. A saved over-capacity count shows zero remaining plus the explicit excess-demand warning. Existing seat-map and buyer-detail failures retain their separate behavior.
8. Confirm the existing name search, buyer captions, scrolling, map tiers/aisles and locked-seat review still behave as below. This summary does not change checkout, assignment, payment or email data.

Source verification: 13 focused capacity tests pass, covering unselected tickets, counter precedence/retained demand, legacy statuses and expired local holds, blocks, current configuration, invalid counts, oversubscription, immutability and session identity encoding. Changed-file ESLint reports zero errors and the existing Seat Occupancy hook-dependency warning. Browser rendering and live Firestore access remain owner acceptance. The new server reads are snapshots, not a reservation or a concurrent inventory audit. See the dated sections in [architecture](architecture.md), [booking flow](SEAT_BOOKING_FLOW.md) and [staff guide](TICKETING_SYSTEM_GUIDE.md).

Updated 14 October 2026. This change makes current numbered seat holders visible and searchable inside a selected session's layout.

## Owner browser acceptance

Use suitable local/test records for any reconciliation action. Opening/searching the map itself is read-only.

1. Open **Seat Occupancy → View Layout** for a generated competition session with booked seats. Confirm buyer names appear directly below their seat numbers. Hover a seat/caption: **Buyer** must match its current Public Customers booking's `buyerName` or legacy `userName`, while **Registrant** shows its saved performer/ensemble identity. For the supplied example, a seat should retain its ensemble's registrant names and show its buyer independently, rather than calling the ensemble the buyer.
2. Type the buyer's name in the dialog search. Check the matching-seat count and result table show the current labels, buyer, registrant and status. Those seats have gold outlines; other seats are dimmed. Clear the field and verify the normal map returns with buyer captions still visible.
3. Search a registrant or one ensemble member. Repeat using mixed case, partial name words and extra spaces. All typed words must match. If several buyers booked for one registrant, all of their current seats in this session should appear, with each buyer shown separately. Search a nonexistent name and check the explicit no-match result while the full map stays visible.
4. Check available, booked, reserved and locked seats. Available seats have no buyer caption and cannot match a stale owner name. Occupied seats retain red/gray/amber status colors even when outlined in gold. Pending locked seats can show their linked buyer before payment; a name or search match does not imply paid admission. A legacy reserved/locked seat can show its holder's recorded buyer/registrant metadata; missing buyers say **Buyer not recorded**, without relabeling the registrant as buyer.
5. Reopen the layout after a payment, assignment, cancellation or reallocation made through an authorized normal workflow. Verify names follow current seat ownership, not an old booking's saved labels. A paid booking with no numbered seat should not appear in the layout results; it remains findable through the separate event-wide **Load Lookup** below the overview.
6. Try both venue layouts, including the wide map with a center aisle. Captions should fit two lines, show full names in tooltips and align seat rows. Horizontally scroll wide maps to both outer sides; all original numbers, row labels, tiers and aisle spacers should remain reachable. The search field remains visible while scrolling vertically through the map.
7. Close/reopen the dialog, open another session and switch the active event. Search/results should reset. Closing or switching while a layout is loading must not display late results from the previous session/event. If a booking-detail read fails, check the warning that names may be incomplete and reopen to retry; inventory still renders from the seat read.
8. A locked **seat button** still opens the existing booking review/reconciliation dialog; hovering its caption or typing a name must not release seats or change payment state. Other seat-picker pages retain their existing selection/read-only behavior. Verify **Public Customers → Assign Missing Seats** still shows the previously added Presto/Allegro section labels without buyer captions.

## Source verification

- Layout opening deduplicates only current occupied-seat booking references, reading `publicBookings/{id}` once per distinct reference after the existing event/venue/session seat query. No full-event booking/registration scan or typing-time read is added.
- Names use scoped booking identity when available, with current status-appropriate seat metadata as the missing/legacy fallback. Loaded cross-event/venue/session, archived-test or orchestra/free-seating documents cannot supply names. Current seat references, not saved selected-seat arrays, establish the association.
- The existing event-wide lookup builder and normalized search are retained. The new dialog uses the same all-word matching over its transient buyer/registrant search metadata.
- Shared-picker captions are optional; the original selection, reserved/read-only disabling and locked-seat click handlers remain. Gold search outlines preserve existing background/status colors, and the prior optional tier-header renderer remains intact.
- Changed-file ESLint: **zero errors, one existing warning** (`fetchData` effect dependency in Seat Occupancy). The running compiler reports warnings with **no compile errors**. Changed-file whitespace checks and standards/spec/hygiene/conditional-branch self-review passed, including zero stale `tooltipText` references.
- No browser or live customer/provider operation was used for verification. These checks establish source/compiler consistency; the owner verifies rendered layout and actual Firestore name reads through the steps above. Changes remain uncommitted.

See [architecture](architecture.md#2026-10-14--buyer-captions-and-name-search-in-a-seat-layout), [seat booking flow](SEAT_BOOKING_FLOW.md#2026-10-14--identify-buyers-and-search-names-inside-a-seat-layout) and [staff guide](TICKETING_SYSTEM_GUIDE.md#2026-10-14--find-a-buyers-or-registrants-seats-in-the-open-layout).
