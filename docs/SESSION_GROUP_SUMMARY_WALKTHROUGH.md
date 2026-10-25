# Group summaries by registration event and competition category

Each performance group now shows a summary in its header. The same summary appears in Session Overview and beside each orchestra attendance group's name.

- Columns: **Competition category**, **APCS2025**, **APCS2026**, **Total**.
- Rows: every competition category represented in that group, including Piano and Guzheng, plus **Total registrants** and **Total teachers** directly below it.
- Counts refer to registrations. An ensemble counts once, regardless of the number of children.
- Teacher counts use each registration's saved `teacherName`, counting unique names per source event and across the complete group. Names are trimmed and matched case-insensitively; blanks, unavailable registrations and non-string names are excluded. The same teacher in both APCS2025 and APCS2026 counts once in each event column and once in **Total**, so the group total may be smaller than the sum of event columns. One ensemble's saved teacher counts once. This is a name-based count, matching the existing Overview Teachers view.

## Manual acceptance

1. Place APCS2025 and APCS2026 Piano/Guzheng registrations in one performance group. Check each category's year counts and the total row against the member cards. Collapse the group and confirm the summary stays visible.
2. Move, remove or swap a member and confirm the affected summaries update immediately. Discard the draft changes and confirm the counts return to the saved membership. Save and reload to verify counts from the saved groups.
3. Search/filter the registrant pool and confirm the complete group counts stay unchanged. Check Session Overview in both Registrants and Teachers views; the summary must still count registrations.
4. Assign members to orchestra attendance groups. Confirm each attendance group's summary counts its own members, including any member who also has a performance group. Attendance roster search must not change these counts.
5. Check an empty group and a read-only published group. Empty groups show zero APCS2025/APCS2026 totals. Legacy records without eventId count as APCS2025; missing categories show Not set. Missing registration placeholders show Unknown event / Registrant unavailable.
6. Confirm **Total teachers** is directly below **Total registrants** on every summary, including collapsed groups, Overview in both tabs, and orchestra attendance groups. Assign several registrations with the same teacher, including capitalization and surrounding-space variations, and verify one teacher is counted. Blank names and unavailable registrations must add no teacher; an empty group shows zero.
7. Put registrations for one teacher from both APCS2025 and APCS2026 in the same group: each event shows one teacher and **Total** shows one. Add a different teacher and verify the group total becomes two. Move/remove/swap members and discard/save/reload changes as in step 2; verify teacher counts follow full membership and remain unchanged by search, category and attendance-status filters.

Source and markup checks passed offline. Browser layout and interactions remain for owner verification.

14 October 2026 teacher-count update: changed-file ESLint and standards/spec/hygiene self-review passed. The existing frontend compiler reports warnings in unchanged files and no errors; teacher-row layout and interactions remain for the manual checks above.
