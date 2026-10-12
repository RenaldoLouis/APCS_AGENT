# Manual walkthrough — ticketing repair batch, 7 October 2026

Use this walkthrough for owner browser acceptance of the [repair plan](TICKETING_REPAIR_PLAN_2026-10-07.md). No browser, build or app start was run by the implementing agent. Use a local or QA event, never the live sale event, for the steps that publish, generate seats or create bookings.

## Before you start

1. The running API on port 8080 was started before these changes. Restart it yourself so it loads the new code. Keep `APCS_FIRESTORE_MODE=emulator` and the Paper.id **staging** host when testing payments.
2. The frontend needs its own `REACT_APP_FIRESTORE_MODE=emulator`. The existing uncommitted `apcs_web/src/config/development.config.js` starts with `e3`, which throws a ReferenceError; fix that locally first. Frontend dependencies were incomplete during the audit.
3. When deploying, ship the backend, the frontend and `apcs_web/firestore.rules` together (the rules add the server-only `ticketPaymentReceipts` collection).

## A. Orchestra attendance groups (Admin Page)

1. Open **Admin Page** on a draft planning event. Click **Add group**. Check that the modal shows **Group type** with **Competition performance** selected.
2. Change it to **Orchestra attendance**. Check that the **Performer session** field disappears, the date label reads **Attendance date**, and the help text says members are hidden from ticket performance choices without receiving tickets, admission or an orchestra session.
3. Enter a name, venue and date, keep the group, drag one or two registrants into it, then click **Save**. Its header should show the purple tag **Orchestra attendance · no performance time or ticket sales**.
4. Reload the page. The group, its type and its members must still be there.
5. Edit an existing competition group that has a performer session and switch it to **Orchestra attendance**. Keep it, save and reload. Its session link should be gone, and that slot should show **Unused** in **Performer Sessions**.
6. Existing groups you never edited must still show as competition groups with their **Assigned time** badges.
7. With only attendance groups on the board, **Validate and preview** should report **Add at least one competition group.**
8. On a QA event with at least one valid competition group: preview, then **Publish schedule**, **Generate numbered seats**, **Verify seats and mark ready**. Generation and readiness should not complain about the attendance group. After publishing, the group can no longer be edited.

## B. Public booking page

1. On the published QA event (with sale eligibility allowing the test tiers), open the public booking page.
2. **Public → Performance**: attendance-group members must not appear in the list or search.
3. **Winner**: attendance-group members must not appear either.
4. **Public → Orchestra**: choose an orchestra session and Presto/Allegro quantities. There is no registrant or performance selector, and checkout proceeds as before.

## C. Orchestra Settings and Assignments

1. **Orchestra Settings**: the info box should say staff manage capacity and the quota is informational. Edit a session and save a quota of **9999**; it should save. Saving a quota lower than the assigned count should also succeed. Deleting a session with attendance must still be refused.
2. **Orchestra Assignments**: each session option should read `… · N assigned · quota Q (informational)`. Assign a paid group whose headcount exceeds the quota; it should save the whole group and send the assignment email.
3. (QA staging, optional) Buy a direct orchestra quantity larger than the competition seat layout for that venue; checkout should succeed. A competition session must still refuse tickets beyond its numbered capacity.

## D. Public Customers

1. For a **paid** competition booking without selected seats, click **Assign Missing Seats**, pick exactly the remaining number of seats and confirm. You should see **Seats successfully assigned!**, and the seats should become booked in Seat Occupancy.
2. Open the modal again and try a seat that another booking already holds (or that changed since the map loaded). You should get a clear **Failed to assign seats: …** message, with no partial assignment.
3. An orchestra (free seating) booking must not offer numbered assignment.
4. Payment receipt tags: a booking whose paid callback is still being retried shows **Paid callback received — reconciling**; a stopped case shows **Payment received — needs review (reason)**. They only appear on QA data that produces those cases (for example a callback whose invoice ID does not match the booking). Treat a review tag as "check this invoice in Paper.id", never as permission to release seats.

## E. Seat generation

1. On a published QA event, lock a seat by starting a checkout with seat selection but don't pay. Then click **Generate numbered seats** again. The locked seat must stay locked to that booking, and missing seats are created.
2. On a legacy event, **Performer Sessions → Generate seats** still works and reports success.

## F. Payment recovery (staging, optional)

With the restarted API in emulator mode and the Paper.id staging host, repeat one authorized staging purchase with the private test contact and the simulator. It should still become PAID with one confirmation email, and a `ticketPaymentReceipts` document should show `status: processed`.

If the API is down when Paper.id sends the callback, no receipt can be stored. Paper.id staging does not retry, so that case still needs manual reconciliation; production retry behavior is unverified.

## Not covered by this walkthrough

Production deployment, deployed rules and indexes, live Paper.id recovery under real outages, load capacity, and every deferred finding listed in the plan.
