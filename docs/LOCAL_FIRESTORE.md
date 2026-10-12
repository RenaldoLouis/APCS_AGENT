# Local Firestore development

## 2026-10-09 — Removed obsolete local venue timetable entry

With owner approval, removed only `events/APCS2026.venues[Venue_lnssq2n1].sessions[2026-11-14]`'s old `08:00-09:00` entry, leaving that date's array empty. It duplicated Group 1's valid private draft session. Preview checks existing venue times as well as draft-to-draft overlaps; this separate old entry caused `Group 1: overlaps an existing venue time.` The original seed checks covered draft slots only, so their earlier overlap verification did not cover the full publication validator.

Preflight confirmed matching draft revisions, empty published assignments, no active event bookings (four archived test bookings only), no event seats/capacity/ownership and no matching orchestra/Masterclass session. An ignored private backup is stored as `apcs_service/.local/performer-session-seeds/remove-old-venue-time-1791519380156.json`. The transaction guarded the current snapshot, changed only the target venue time, and synchronized event/plan revisions **31 → 32**. Draft slots, group membership/links, assignments, other venue data and all bookings were preserved. Order-independent readback verified the exact resulting event and unchanged draft/group/assignment data. The real repository preview returned **canPublish: true**, **errors: []**.

Refresh Admin Page before further edits or publication, then run **Validate and preview** again. The event remains draft; no publication, seat generation or production operation occurred. Preserve the cleanup with normal emulator export on shutdown. Future local seeds must consider existing venue and special-session times as well as draft overlap checks; never delete a conflicting timetable entry without reviewing its references.

## Seed performer sessions from saved local groups

Run the existing emulator first, then from `apcs_service`:

```sh
# Read-only preview
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 node scripts/seed_local_performer_sessions.js APCS2026
# Create missing sessions and fill pending times
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 node scripts/seed_local_performer_sessions.js APCS2026 --apply
```

The script fixes the project to `apcs-profile`, requires exactly the local host above, and loads no production credentials, application runtime or integration jobs. It requires matching draft event/plan revisions. Existing linked slots are reserved; unused sessions matching each competition group's saved venue/date are reused one per group, and only the shortage is added. New and reused untimed sessions receive one-hour sample ranges starting at 08:00 and advancing every two hours (08:00–09:00, 10:00–11:00, etc.), independently per venue/date. Existing timed sessions are preserved and overlapping candidates are skipped. Tentative label text is not interpreted as a timetable. Attendance groups are skipped; empty competition groups are included. The existing limit is 100 draft sessions.

Before applying, it saves the original event, plan and groups to a private Git-ignored `.local/performer-session-seeds/*.json` backup. Its transaction refuses changes since that snapshot, writes the plan's `draftSlots/revision/updatedAt` and event schedule revision, and synchronizes cached times on any linked group whose session receives a time, matching the normal saveSlot flow. Readback checks slots, revisions and expected groups. A rerun with sufficient matching, timed slots writes nothing. The output pairs groups with suggested slots but does not assign groups, publish, generate seats or open sales. Preserve edits with the normal emulator export on shutdown.

### 9 October 2026 execution and manual acceptance

The local APCS2026 plan contained **12 competition groups** and one unused Behring **14 November, 08:00–09:00** session. The script added **11** sessions for a total of **12** and advanced both revisions **25 → 26**. Readback verified the result and unchanged groups; a second apply created **zero** duplicates. Production was not accessed.

A follow-up run filled all 11 pending sessions with one-hour sample times, creating no additional slots; revisions advanced 28 → 29 after intervening local board edits. The latest plan has 12 competition groups and one orchestra attendance group, which was skipped. All 12 performer sessions now have times. Refresh Performer Sessions to review or edit the sample times. Refresh Admin Page before editing; choose a matching unused **Performer session** for each group, then **Save**. The different time ranges distinguish sessions sharing a venue/date in the dropdown. Reopen Performer Sessions to confirm **Used in Admin Page** markers. Publication validation, seat generation and readiness remain separate.

**Date mismatch:** group 5 (`[14 NOV]Diamond Titan 1`) is saved as `2026-09-14`; its new session matches that saved date so it is selectable. If November was intended, correct both the unlinked group's date and its session date before assigning. Groups 7 and 12 currently have no registrants: populate or remove them and any unused sessions before publication. Browser verification remains with the owner.

Local development uses **three separate processes**: Firestore on `127.0.0.1:8081`, the Express API on port `8080`, and the React frontend on port `3000` (or the next available frontend port). Start them in that order and keep each terminal open. Firebase Authentication stays live; only Firestore is redirected locally.

The backend command **is still required**. Starting the Firestore emulator does not start Express, and starting React does not redirect the backend database. Both applications must explicitly select emulator mode.

This is Firestore-only isolation: Auth, S3, Paper.id and email keep their existing configuration. The backend starts invoice expiry/recovery and jury email reminder jobs; local copied records can still lead to real provider requests or emails. Use appropriate provider/email configuration before exercising those flows. Starting the emulator alone does not run those jobs.

## Start the emulator for everyday development

**Terminal 1 — run from `apcs_web`, not the repository root:**

```sh
cd /Users/renaldolouis/Documents/Personal/Work/APCS/apcs_Project/apcs_web
firebase --config firebase.json emulators:start --only firestore --project apcs-profile --import ../apcs_service/.local/firestore-emulator --export-on-exit=../apcs_service/.local/firestore-emulator
```

Wait for the ready message and confirm the Firestore address is **`127.0.0.1:8081`**. This loads the existing saved database; no new production export is needed for ordinary development. The Emulator Suite UI is normally at `http://127.0.0.1:4000`.

The explicit `--config firebase.json` selects `apcs_web/firebase.json`, which declares port `8081`. On 8 October 2026, running the previous command from the repository root instead of `apcs_web` started Firestore on its default port `8080`. The served React app was correctly targeting `8081`, but that port had no listener, so the user-profile read failed with `unavailable` / “client is offline.” The working directory also determines the relative import/export paths. Do not change the app to use port `8080`: that port belongs to Express.

If an emulator already has the correct port and saved data loaded, leave it running. If it is on the wrong port, stop its Firebase CLI terminal with **Ctrl+C**, wait for shutdown/export to finish, then use the command above. If startup cannot find `firebase.json` or the saved import, check the current folder and path instead of continuing with an empty database.

## Run the applications with local Firestore

**Terminal 2 — backend, from `apcs_service`:**

```sh
cd /Users/renaldolouis/Documents/Personal/Work/APCS/apcs_Project/apcs_service
APCS_FIRESTORE_MODE=emulator node index.js
```

This starts the API on `8080` and makes its Admin SDK use `127.0.0.1:8081`. Do not use plain `node index.js` for local database work: with emulator variables absent, it uses live Firestore. An already-running backend must be restarted with the intended mode; starting the emulator does not change its mode.

**Terminal 3 — frontend, from `apcs_web`:**

```sh
cd /Users/renaldolouis/Documents/Personal/Work/APCS/apcs_Project/apcs_web
REACT_APP_FIRESTORE_MODE=emulator REACT_APP_ENV=development yarn start
```

`REACT_APP_FIRESTORE_MODE=emulator` redirects direct browser Firestore reads/writes to `127.0.0.1:8081`. `REACT_APP_ENV=development` independently selects the local Express API at `http://localhost:8080`. Restart React after changing these variables; an open page must then reload the updated bundle.

Use the inline variables shown above instead of adding emulator settings permanently to shared `.env` files or exporting them globally. Inline assignments apply only to that command and its child processes. Previously exported variables or values in `.env` files remain until explicitly removed.

When finished, stop React and Express first, then stop the emulator with **Ctrl+C** and wait for export to finish. The export preserves local edits for the next session; a forced termination can lose them.

## Verify startup and troubleshoot login

Check these addresses before signing in:

| Process | Expected address / setting |
| --- | --- |
| Firestore emulator | `127.0.0.1:8081`, loaded from the saved import |
| Express API | Port `8080`, launched with `APCS_FIRESTORE_MODE=emulator` |
| React frontend | Usually `http://localhost:3000`, launched with both frontend variables above |
| Emulator UI | Usually `http://127.0.0.1:4000` |

A read-only terminal check for the Firestore listener is:

```sh
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

If this shows no listener, the app cannot reach its configured emulator. A running Emulator UI on `4000` does not establish that Firestore is on the right port.

Google sign-in still uses live Firebase Auth. After authentication, `DataContext.js` reads `users/{uid}` from the selected Firestore database; for a new Google user, it also checks `whitelist/{email}`. Both the imported data and the port must be correct. “Could not reach Cloud Firestore backend” or “Failed to get document because the client is offline” is a connection failure, not proof that the email is missing from the whitelist. After correcting the startup, refresh the page and retry. The owner verifies sign-in and rule-protected pages in their browser.

If Firestore is listening on `8081` but reads still fail, check the failed Firestore request hostname in the browser Network panel. Local mode should use `127.0.0.1:8081`; requests to `firestore.googleapis.com` mean that browser bundle is using live Firestore. Restart React with the inline emulator variable and reload. API requests should separately target `localhost:8080` for this local setup.

## Normal startup and database selection

The web app and API default to live `apcs-profile` Firestore when emulator variables are absent. Installing dependencies or having an emulator running does not change that selection.

| Frontend command (from `apcs_web`) | API selected | Firestore used directly by the frontend |
| --- | --- | --- |
| `yarn start` (with both frontend variables unset) | Local API, `http://localhost:8080` | Production `apcs-profile` |
| `REACT_APP_ENV=production yarn start` (with emulator mode unset) | Hosted API, `https://api.apcsmusic.com` | Production `apcs-profile` |
| `REACT_APP_FIRESTORE_MODE=emulator REACT_APP_ENV=development yarn start` | Local API, `http://localhost:8080` | Local emulator, `127.0.0.1:8081` |

| Backend command (from `apcs_service`) | Backend Firestore |
| --- | --- |
| `node index.js` (with both backend emulator variables unset) | Production `apcs-profile` |
| `APCS_FIRESTORE_MODE=emulator node index.js` | Local emulator, `127.0.0.1:8081` |

`REACT_APP_ENV` only selects the API hostname. It does not select Firestore for either application. A local frontend can otherwise talk to a backend using production data, or a hosted API can be selected while direct frontend reads remain local. Use the complete three-terminal recipe for local development.

On 8 October 2026, stray `e3` text at line 1 of `src/config/development.config.js` caused `no-unused-expressions` and `no-undef`. Its removal fixed those errors without changing URLs or database selection. Both configs are statically imported, so a lint error in the development config can also block a production-configured frontend.

## Production environment

The local startup recipe does not persist emulator settings into source or production configuration. Keep the existing Firebase project and credentials, and use these settings in the actual deployment environment:

| Setting | Production value |
| --- | --- |
| `REACT_APP_ENV` | `production` when building the frontend, to select `https://api.apcsmusic.com` |
| `REACT_APP_FIRESTORE_MODE` | Unset (or empty) when building the frontend |
| `APCS_FIRESTORE_MODE` | Unset (or empty) in the backend runtime |
| `FIRESTORE_EMULATOR_HOST` | Unset (or empty) in the backend runtime |
| `NODE_ENV` | `production` in the backend runtime; the React production build sets it automatically |

Before using a local shell for the existing production build/deploy process, clear inherited emulator overrides:

```sh
unset REACT_APP_FIRESTORE_MODE APCS_FIRESTORE_MODE FIRESTORE_EMULATOR_HOST
```

Also remove those overrides from production `.env` files, CI settings and the backend host/process manager; `unset` in one shell does not edit those other environments. Supply `REACT_APP_ENV=production` to the frontend build itself: changing it only after building cannot change the already-generated browser bundle. An unset `REACT_APP_ENV` defaults to the localhost API even in a production build.

Both frontend Firebase Hosting workflows (`firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml`) now explicitly set `REACT_APP_ENV: production` and `REACT_APP_FIRESTORE_MODE: ''` on their build steps. The preview workflow also uses the hosted API and live Firestore; it is not a local database sandbox. Retain the required Firebase API key/build configuration and deployment credentials in the CI environment. These workflow changes do not deploy anything until the user commits/pushes and the workflow runs.

Backend production startup remains the existing Express process, with `NODE_ENV=production`, the backend emulator variables absent, and the existing service-account credentials. For a direct terminal launch from `apcs_service`, that is:

```sh
NODE_ENV=production node index.js
```

Do not start a Firestore emulator on the production server. The `emulators` section in `apcs_web/firebase.json` configures local emulator commands; it does not redirect SDKs or start an emulator during Hosting deployment.

Existing source guards were verified by executing the real initialization code with mocked Firebase SDKs:

- Frontend: absent/empty mode uses live Firestore; local emulator mode connects to `127.0.0.1:8081`; unknown modes throw; emulator mode with `NODE_ENV=production` throws during Firebase initialization.
- Backend: absent/empty mode and host use live Firestore; emulator mode sets the exact loopback host; unknown modes, unexpected hosts and a host supplied without explicit emulator mode throw; emulator mode with `NODE_ENV=production` throws before Admin initialization.

These guards deliberately stop invalid startup instead of silently selecting another database. A frontend build can still compile with an accidental emulator flag and then throw when loaded; clear the flag at build time. No production build, deployment or live production acceptance was run for this documentation update. Deployment verification still needs the generated frontend to target the hosted API, live Firestore, and a production backend with the intended runtime settings.

## Copy production data locally

This section is for creating or deliberately refreshing a snapshot, not everyday startup. For a fresh, empty emulator, run from `apcs_web` without the saved-data import flag:

```sh
firebase --config firebase.json emulators:start --only firestore --project apcs-profile
```

From `apcs_service`, export with a read-only production connection:

```sh
node scripts/firestore_local_snapshot.js export
```

The command prints the new snapshot path and document count, without printing document contents. It traverses top-level collections and nested subcollections. The compressed snapshot is under ignored `apcs_service/.local/firestore-snapshots/`, with owner-only permissions. It contains real personal and business data; keep it on this computer and do not commit or share it. The export reads each production document once, plus metadata requests. It does not write to production.

Import into a **fresh, empty** emulator, using the path printed by the export:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 node scripts/firestore_local_snapshot.js import .local/firestore-snapshots/NAME.ndjson.gz
```

The importer refuses to run without the exact loopback emulator address and refuses to import into an emulator that already contains data. It writes only to the local emulator. To refresh the copy, restart with an empty emulator and repeat export/import. The snapshot does not include Firebase Auth users, Storage files, S3 objects, email, or Paper.id data.

The first local copy was made on 1 October 2026: 7,171 documents (7,159 top-level and 12 nested). Its compressed snapshot and a Firebase CLI emulator export are both retained privately under `apcs_service/.local/`.

## Cost and persistence

The 1 October 2026 inventory found 7,159 top-level production documents; nested documents add to the final export count. One copy is roughly one billed document read per exported document, normally within Firestore's 50,000 free reads per day if other usage leaves enough quota. Download bandwidth may also count against the monthly free allowance. Local emulator reads and writes do not incur Firestore document-operation charges. Check the current [Firestore pricing](https://firebase.google.com/docs/firestore/pricing) before frequent large refreshes.

The emulator's memory is cleared when it stops unless you use Firebase CLI emulator export/import flags. The current copy has been saved in `apcs_service/.local/firestore-emulator/`. On later runs, start it from `apcs_web` with:

```sh
firebase --config firebase.json emulators:start --only firestore --project apcs-profile --import ../apcs_service/.local/firestore-emulator --export-on-exit=../apcs_service/.local/firestore-emulator
```

Keep the compressed snapshot locally as a second import source. This copy is for development and is not a point-in-time consistent production backup; records changed during export can reflect different moments.

## 2026-10-07 — Production snapshot refreshed

At the owner's request, the production `apcs-profile` Firestore data was exported starting at **12:45 WIB** and copied into the running emulator at `127.0.0.1:8081`: **7,560 documents** (7,548 top-level, 12 nested), traversing 18 collection paths. Verification compared every document path and encoded field against the snapshot and confirmed there were no extra local documents. This is a traversal snapshot, not a point-in-time backup.

Private, Git-ignored files:

- Source: `apcs_service/.local/firestore-snapshots/firestore-2026-10-07T05-45-56-417Z.ndjson.gz`.
- Refreshed Firebase-native startup export: `apcs_service/.local/firestore-emulator/`.
- Previous running synthetic QA database and previous saved database: `apcs_service/.local/firestore-refresh-20261007/`.
- Document-by-document verification: `apcs_service/.local/firestore-refresh-20261007/verification.json`.

The running API's `APCS_FIRESTORE_MODE=emulator` was confirmed. The existing API process (PID 60766 at refresh time) was **paused and left paused** before replacing local data. Its sweeper can cancel provider invoices, its jury reminder can email actual recipients, and the current payment recovery job can contact Paper.id and send confirmations. A production-data copy is not an isolated payment/email sandbox. Before resuming or replacing this API, explicitly arrange the desired provider/email configuration and background-job isolation. The paused process also predates the latest repair implementation; resuming it does not load edited source.

At the time of this refresh, the orphaned Java emulator had no Firebase CLI hub or automatic export-on-exit. The verified refresh was explicitly exported and saved; later local edits need another export or a restart under the everyday Firebase CLI command below to persist. Auth users, Storage/S3 objects, Paper.id state and emails were not copied. No production writes, application-source edits, provider actions, emails, browser verification, commits or pushes were performed during this refresh.
