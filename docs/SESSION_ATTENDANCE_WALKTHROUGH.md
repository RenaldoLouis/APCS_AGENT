# Attendance chips and filtering during session assignment

Open **Admin Page** (`AdminContent.js`), whose assignment view is `SessionAssignmentManager`.

- Green **Attending** means saved `willAttend === true`.
- Red **Not attending** means saved `willAttend === false`.
- Gray **Not imported** means no saved boolean; it is distinct from false.

The chip describes venue attendance for the whole registration, including ensembles. It does not prove performance participation or paid admission. After importing confirmations elsewhere, reload the board to get the updated registration snapshot; filtering itself performs no reads.

## Manual acceptance

1. Check unassigned/assigned performance cards and Overview's Registrants view. Include true/false/missing status, ensembles, APCS2025 guests and a published read-only board.
2. Use the top **All attendance statuses** dropdown to select Attending, Not attending or Not imported. Check the pool, expanded performance groups and orchestra roster. Combine it with existing search/category filters. Select All attendance statuses to restore complete lists.
3. Overview shares the filter for Registrants; its Teachers view stays complete. Group headers retain full membership, summary counts and video totals, with a separate shown count for filtered performance/Overview registrant views. A fully hidden group's empty state says No registrants match this attendance filter; the group stays visible.
4. Check chips on orchestra dropdown choices and selected tags. New options follow the filter, while existing selected members stay visible regardless of status. Filtering must not remove members. Read-only tags and the assigned roster follow the filter; roster search composes with status.
5. In a mixed-status draft group, drag a visible performer past another while intervening members are hidden. Clear the filter: the intended performer must have moved, with every hidden member retained. Visible order numbers retain original full-group positions.
6. Switch status during Swap mode: pending selections clear so hidden selections cannot be swapped accidentally. Filtering alone must not enter Editing Mode. Changing event resets the filter to All attendance statuses.
7. Save an intended assignment change while filtered, reload and clear the filter: all membership/order must persist, including hidden records. Check compact-screen wrapping, long names/chips and empty lists manually.

This uses already-loaded fields and adds no query, backend interface, schema, attendance write, ticket rule or automatic membership policy. Code review, lint and Node-environment logic tests provide verification; browser layout/interaction remains for owner acceptance.

Verification completed: 7/7 focused attendance/guest tests passed with `CI=true ./node_modules/.bin/react-scripts test --watchAll=false --watchman=false --runInBand --env=node --runTestsByPath src/utils/registrantAttendance.test.js src/utils/guestRegistrants.test.js` from apcs_web. Targeted ESLint has zero errors and one existing handleAutoAssign warning; whitespace and self-review checks passed. The frontend server is running, but compile output was inaccessible from this chat; check its terminal during manual acceptance.
