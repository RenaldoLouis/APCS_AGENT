# Local Firestore development

The web app and API normally use the live `apcs-profile` Firestore database. Local Firestore is an explicit opt-in. Firebase Authentication, AWS S3, Paper.id and email keep their existing configuration. Do not perform payment or email actions merely to test the database copy.

## Start the emulator for everyday development

Each time you start a new local development session, run this command from `apcs_web` in its own terminal:

```sh
firebase emulators:start --only firestore --project apcs-profile --import ../apcs_service/.local/firestore-emulator --export-on-exit=../apcs_service/.local/firestore-emulator
```

This single command starts Firestore and loads the existing saved local database. There is no separate loading step and no need to copy production data again for everyday development. If the emulator is already running with this data loaded, leave it running; restarting either application does not require restarting the emulator.

Firestore listens on `127.0.0.1:8081`; the API retains port `8080`. The Emulator Suite UI is normally at `http://127.0.0.1:4000`. Keep this terminal running while developing, then start the API and web app in two separate terminals using the commands below. Stop the emulator normally with Ctrl+C and wait for export to finish so your local changes are saved for the next session. A forced termination may prevent that export.

## Copy production data locally

This section is for creating or deliberately refreshing a snapshot, not everyday startup. For a fresh, empty emulator, run from `apcs_web` without the saved-data import flag:

```sh
firebase emulators:start --only firestore --project apcs-profile
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

## Run the applications with local Firestore

From `apcs_service`:

```sh
APCS_FIRESTORE_MODE=emulator node index.js
```

From `apcs_web`:

```sh
REACT_APP_FIRESTORE_MODE=emulator REACT_APP_ENV=development yarn start
```

Start the emulator first. If it is unavailable, Firestore operations fail instead of falling back to production. For normal production Firestore behavior, omit the two mode variables. The frontend and backend must use the same mode; otherwise they will see different databases. Existing sign-in still uses live Firebase Auth. The project ID remains `apcs-profile`; the owner should verify sign-in and rule-protected pages manually in their browser.

The inline environment variables apply only to the command being run. `REACT_APP_ENV=development` selects the local API at `http://localhost:8080`.

## Production environment

No new Firestore environment variables are required on the production server. Leave `APCS_FIRESTORE_MODE` and `FIRESTORE_EMULATOR_HOST` unset and retain the existing service-account credentials. The API defaults to production Firestore. Emulator mode is rejected when `NODE_ENV=production`.

For the production frontend build, leave `REACT_APP_FIRESTORE_MODE` unset and use `REACT_APP_ENV=production` to select `https://api.apcsmusic.com`. The frontend rejects emulator mode in a production build. These configuration guards do not replace production deployment verification.

## Cost and persistence

The 1 October 2026 inventory found 7,159 top-level production documents; nested documents add to the final export count. One copy is roughly one billed document read per exported document, normally within Firestore's 50,000 free reads per day if other usage leaves enough quota. Download bandwidth may also count against the monthly free allowance. Local emulator reads and writes do not incur Firestore document-operation charges. Check the current [Firestore pricing](https://firebase.google.com/docs/firestore/pricing) before frequent large refreshes.

The emulator's memory is cleared when it stops unless you use Firebase CLI emulator export/import flags. The current copy has been saved in `apcs_service/.local/firestore-emulator/`. On later runs, start it from `apcs_web` with:

```sh
firebase emulators:start --only firestore --project apcs-profile --import ../apcs_service/.local/firestore-emulator --export-on-exit=../apcs_service/.local/firestore-emulator
```

Keep the compressed snapshot locally as a second import source. This copy is for development and is not a point-in-time consistent production backup; records changed during export can reflect different moments.
