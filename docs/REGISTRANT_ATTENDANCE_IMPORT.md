# Winner attendance confirmation import

Implemented 11 October 2026. The dashboard and CLI update only optional top-level `Registrants2025/{registrationId}.willAttend: boolean`, applying to the entire solo/ensemble registration. The flag describes intended venue attendance for the current confirmation campaign; it is not historical attendance, check-in, performing, paid admission or an orchestra allocation. APCS2025 source records can describe invitations to the current APCS2026 venue event. Later imports replace this flag; no campaign history or collection is added.

## Dashboard

Open **Registrant Dashboard → Import Attendance**, choose `.csv`, `.xlsx` or `.xls`, and review the preview before **Save Attendance**. Files are parsed locally using existing SheetJS; worksheet rows are sent to the backend, not S3. Only the first worksheet is read. Its first row needs exactly one `Full Name` and one `Attendance` column, ignoring case and whitespace. Other columns, including `No`, are not identity fields. Empty rows are ignored; nonempty rows without names are rejected. Blank attendance cells are preserved.

The preview shows original responses, worksheet row numbers, proposed values, matched registration IDs, source events and existing values. It always includes APCS2025/APCS2026 regardless of dashboard filters/pagination. Missing/null/empty/whitespace-only eventId means legacy APCS2025. Candidate scans run only on explicit preview/save, in document-ID pages of 200; there is no mount-time query or new index.

Use the searchable registration selector to explicitly link misspelled/unmatched names, or **Exclude** to leave a row untouched. Manual selection applies to the whole chosen registration. Untouched auto-matches include every exact record across both years. Opposing duplicate responses require a selected value or exclusion. Opposing rows targeting one document require corrected links or exclusion. After any choice, click **Recheck matches**; Save is disabled while the preview is outdated or conflicts remain. Unmatched rows are skipped.

Save refreshes dashboard data and reports updated/unchanged registration counts, skipped/conflicting source-row counts, and stale/failed registration IDs with reasons. Successfully committed chunks remain saved after later failures. Recheck before retrying, including after an uncertain response. Close does not undo saved changes. The dashboard column distinguishes **Attending**, **Not attending**, and **Not imported** (missing/non-boolean old field).

## Classification and matching

**Viewing confirmations during assignment:** Admin Page's session board displays the saved flag as colored chips on performance cards, Overview registrants and orchestra members/options. Its shared attendance filter affects displayed registrant lists only, retaining complete group totals and hidden membership. Reload the board after an import to refresh its existing snapshot. [Assignment walkthrough](SESSION_ATTENDANCE_WALKTHROUGH.md).

| Response | Saved value |
| --- | --- |
| Hadir, Hadri (observed typo), Yes, including notes/dates/case variation/line breaks | `true` |
| Hadir tapi tidak mau main | `true` (attendance without performing) |
| Tidak hadir, Tidak hair, NO, including notes | `false` |
| YES/NO or affirmative text plus explicit negative attendance | `false` |
| Blank, pending/follow-up, Tidak balas, trophy-shipping/payment notes, other non-affirmative text | `false` |

Negative attendance phrases and the word NO take precedence. Imported responses intentionally have no pending value: the owner chose false for unclear text. Registrations absent from the file retain their existing value.

Use `performers[].fullName`, falling back to firstName + lastName (legacy string performers also work). Never match the top-level contact `name`. Normalize case, repeated whitespace and Unicode canonical form, preserving personal-name punctuation. Combined names split only on `&` and compare the complete sorted roster; order does not matter. A solo name never automatically matches an ensemble member, and incomplete saved rosters do not match automatically. No fuzzy match is saved automatically.

Agreeing duplicate roster rows deduplicate; opposing booleans require resolution/exclusion. Different rows targeting the same registration with opposing values conflict. Awards, scores, rosters, contacts, source event IDs, payments, tickets and memberships are preserved.

The CSV at implementation-time inspection has 387 rows and 377 unique name/roster groups: 250 affirmative and 137 false source rows; after agreeing duplicates, 244 affirmative and 133 false groups, with no opposing duplicates. The planning snapshot had one fewer affirmative. These are file classifications, not live match counts; each upload recomputes totals.

## Backend

Both endpoints require the existing Firebase-ID-token and whitelist administrator middleware:

| Endpoint | JSON request | Response |
| --- | --- | --- |
| `POST /api/v1/apcs/registrant-attendance/preview` | `{ sheetRows, resolutions? }` | grouped rows, eligible candidates with signed tokens, summary |
| `POST /api/v1/apcs/registrant-attendance/apply` | `{ sheetRows, resolutions?, snapshots }` | per-document results, grouped rows, summary |

`sheetRows` is the two-dimensional worksheet array including its header. `resolutions` is keyed by the first worksheet row ID of each duplicate group (`row-2`, etc.), containing optional `registrantIds: string[]`, `excluded: boolean`, or `willAttend: boolean` for opposing duplicates. An empty registrantIds array leaves that row unmatched. `snapshots` maps target IDs to preview tokens.

Controllers await the shared Promise-returning importer and forward errors to Express; it does not use callback-based DatabaseUtil. Apply re-parses source rows, reloads candidates and rebuilds matching. A new exact match without an accepted token invalidates the source row's targets. Each transaction reads all documents before patching only `willAttend`; at most 200 targets per chunk. A stale target during a transaction blocks all writes in that chunk. A database failure stops later chunks and reports failed/unattempted IDs, preserving earlier committed chunks. Unrelated concurrent edits survive the single-field patch.

Tokens cover source event, complete original roster and prior attendance, expire after one hour, and detect tampering. A valid retry with unchanged identity and a current boolean already equal to the target returns unchanged, including after a lost response. A rename/deletion that removes an automatic match leaves its row skipped/unmatched rather than guessing a replacement. Missing manual targets require correcting the resolution.

The optional backend-only `REGISTRANT_ATTENDANCE_PREVIEW_SECRET` should be the same strong secret across workers in a multi-process deployment. Otherwise an in-memory random secret is used: a restart or another worker requires a new preview. Never put the signing secret in frontend configuration.

Limits: 5,000 data rows, 100 columns; dashboard files at most 5 MB and JSON requests below 900,000 bytes, inside the existing server 1 MB limit. Split oversized imports. Header/schema/resolution errors reject before any write.

## CLI

From `apcs_service`, preview by default without starting the server or background jobs:

```sh
node scripts/import_registrant_attendance.js --file '/path/to/confirmation.csv' --target emulator
node scripts/import_registrant_attendance.js --file '/path/to/confirmation.xlsx' --target production
```

The target is required. Emulator uses `127.0.0.1:8081`, rejecting another configured host. Production requires `APCS_FIRESTORE_MODE` and `FIRESTORE_EMULATOR_HOST` to be unset, including backend `.env` values. Existing backend Firebase credentials supply project identity, printed with the target before writes. The script does not launch an emulator or import the server entry point.

After reviewing preview, explicitly append `--apply` to write. Both modes accept `--resolutions /path/to/choices.json`:

```json
{
  "row-2": { "registrantIds": ["existing-registration-id"] },
  "row-7": { "excluded": true },
  "row-12": { "willAttend": false }
}
```

Apply refuses unresolved conflicts and first writes a private timestamped preview/snapshot backup to ignored `apcs_service/.local/attendance-import/` (0600 permissions). It then rechecks and applies. Stale/failed results produce a nonzero exit code and detailed results. Preview again before retrying; completed targets become unchanged. No production import ran during implementation.

## Owner acceptance walkthrough

1. Restart the backend to load the endpoints. Sign in as a whitelisted admin, import the supplied CSV, and compare current totals and affirmative/negative/blank/unclear responses.
2. Check one performer with multiple solo registrations, a full ensemble in reversed order, a solo/ensemble shared member, and a comma within a personal name. Only whole-roster ensembles match automatically.
3. Manually link an unmatched row and exclude another. Save must stay disabled until Recheck matches. Use a disposable file with opposite duplicate responses: resolve/exclude before saving.
4. Save against test/emulator records. Confirm the column refreshes and only willAttend changes. Check untouched records, source years, awards, payments and assignments. Repeat the import: prior targets report unchanged.
5. Change a target's roster/attendance after preview, or restart a backend without a configured shared secret. Saving must report stale/conflicted targets; recheck to see current data. Check expired sessions and non-whitelisted users cannot access either endpoint.
6. Verify desktop/mobile dark/gold layout, long ensemble selections, pagination, failure details, close/reopen and selecting the same file again in your own browser.

Offline tests: `node --test --test-reporter=spec apcs_service/audit/registrant-attendance.audit.cjs` from the monorepo root. Tests use mock Firestore/Auth and real spreadsheet parsing; they do not establish browser, live Firestore or provider acceptance.

Final verification: all 16 focused tests and all 200 backend audit tests passed. Backend syntax and targeted whitespace checks passed; frontend lint reported zero errors and no warnings in the new component (26 pre-existing dashboard/API warnings). Self-review passed for standards/spec, declared imports/state, conditional branches and field preservation; no variables/functions were removed. Browser and live-database acceptance remain manual.
