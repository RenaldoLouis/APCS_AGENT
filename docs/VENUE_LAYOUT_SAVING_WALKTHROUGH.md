# Venue layout saving — owner acceptance

1. Use an existing venue with no numbered seat records. Edit one row capacity or tier and save. Reopen to verify persistence; confirm its ID, timetable and other venues remain unchanged.
2. Repeat for a published event before generation. Publication alone must not reject the save. A different venue with existing seats must not prevent saving this one.
3. Generate numbered seats through Seat Occupancy. Try changing the layout again: saving must reject the change, including when all generated seats are available. Confirm the saved layout and seats remain unchanged.
4. Change only the name/image with existing seats: save should succeed and inventory/timetable must remain unchanged.
5. Open the same venue in two owner-controlled tabs. Save a layout in one, then try saving the old layout with an edit in the other: expect a refresh message rather than overwriting the first save.
6. If a generation request races with a layout save, either generation commits first and locks saving, or the save commits first and generation rejects its stale snapshot. Refresh before retrying generation. This race is covered by offline snapshot regressions; actual deployed concurrency requires owner acceptance.

Only existing-venue edits are enabled by this change. Venue creation/deletion permissions and Firebase Storage uploads are unchanged. The backend and frontend both need the updated release. No production records or rules were changed during implementation.
