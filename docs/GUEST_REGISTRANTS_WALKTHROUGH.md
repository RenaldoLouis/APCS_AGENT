# APCS2025 guest assignment — owner acceptance

Use an editable APCS2026 draft after releasing both frontend and backend. Existing published boards remain read-only. These steps are manual acceptance guidance; browser, live Firestore, provider payments and deployment were not exercised by the agent.

1. Open Admin Page with APCS2026 selected. Check the existing current-event pool, event totals and teacher statistics. Open **Other Event Registrants**, select **APCS 2025**, then click **Load registrants**. Current APCS2026 records should not appear there. Records missing eventId or createdAt should appear as APCS2025.
2. Search a performer, an ensemble member and a teacher. Try a category filter and clear it. Missing video/duration should display **Unknown** without preventing drag/drop. A legacy string performer name should display correctly. Confirm new FAIL candidates remain excluded.
3. Drag a guest into a performance group. Add the same guest to an orchestra group through its selector. Confirm performance membership remains intact; another group of the same type should not allow a duplicate. Add another guest only to orchestra attendance.
4. Save Changes and reopen the page without loading the source tab. Both saved guests and their names should remain visible. Discard an unsaved removal, then try a saved removal. Each action should affect only its selected membership; original registrations and source event IDs must remain unchanged.
5. Switch events during an in-flight source load. The previous event's source list must not appear in the new board. A failed load should show an error. Refresh the source list after correcting the failure.
6. On an appropriate disposable draft, preview/publish using the normal linked-session workflow. Generate seats and verify readiness. A guest with a valid award and a performance assignment should appear in public/winner discovery subject to existing eligibility. The orchestra-only guest should not. A missing award must not acquire ticket benefits; missing video must not block grouping/publication.
7. Load Seat Occupancy's registrant/reservation lookup. Search an assigned guest performer or teacher and verify the destination session. Assignment alone should not imply paid admission. Follow the existing payment and seat checks for any separately authorized test purchase.

The APCS2025 source scan is explicitly requested by staff and paginated internally; it can take longer on a large collection because records missing eventId cannot be selected by an equality query. Only APCS2025-to-APCS2026 guest membership is supported in this release.

## Confirm equal purchase treatment

Compare one APCS2025 guest and one APCS2026 registrant with the same award and performer count after their APCS2026 performance assignments are published and ready. The same ticket choices should yield the same price, add-on charge, seat rules and orchestra benefits. Verify both the Paper.id and manual paths only in the owner's authorized test environment. A winner purchase adds performer places once per group; a public purchase adds purchased ticket places only. Missing video/duration must not change those benefits. Daily award restrictions apply equally to both sources.

Offline regression evidence: all 183 backend checks passed, including 32 direct native-versus-historical business-outcome comparisons. No genuine provider payment, email delivery or database write was performed for this verification.

## Verify preservation of existing data

When adding a guest to a populated group, retain its existing registrants. Move the guest to another performance group and check that only their intended performance membership moves, while their orchestra attendance is retained. Remove their attendance and verify their performance remains. Save/reopen and check member order and linked draft sessions. A save from another stale board must be rejected, rather than overwriting the newer board.

The offline preservation regression verifies source registration/event/results, historical assignments/bookings/seats/paid orchestra records, current native registrations and draft slots remain intact through those operations and publication. Duplicate and stale saves leave all records unchanged. Full backend regression suite: 184/184 passed; no live records were changed for this check.
