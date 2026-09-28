# Scoring centralization verification — 28 September 2026

## Result

The smaller email scope restores the original frontend `scoringCalculator.js` and `videoPenaltyRules.js` byte-for-byte from baseline commit `017dfea`. The shared-package migration has been removed. Existing scoring inputs, thresholds, rounding and Sync Awards behavior are unchanged. Earlier migration comparison passed 17,280 cases; current verification checks the restored originals directly and retains the actual award-sync integration coverage.

## Caller and data-path review

| Surface | Calculation / persistence path | Refresh behavior |
| --- | --- | --- |
| Registrant Dashboard score display | `fetchRegistrantScoringResults` loads all scores by registration ID and video config by each registration's event; `getScoreData` calls `calculateRegistrantScoreAndAward` through the original frontend calculator | The current page's data reloads after successful sync |
| Registrant Dashboard **Sync Awards** and **Sync Awards Now** | Both invoke `handleSyncScores` → `syncRegistrantAwards` → frontend calculation → `createAwardSyncPlan` → awaited Firestore batches | `fetchUserData(page)` reloads the displayed records |
| Admin Content **Sync Jury Scores** | Uses the same `syncRegistrantAwards` function as Registrant Dashboard | Its `fetchData()` refreshes the older registrant hook; it does not reload the session board |
| Admin Content session management | `SessionAssignmentManager` loads registrations and hydrated assignments; award labels, teacher statistics, and FAIL eligibility use saved `finalAward`, with legacy `achievement` fallback | Data is an in-memory snapshot, loaded on event/reload-state change or page remount |
| Scoring Recap table, comment-sheet CSV and winner export | The original frontend calculator receives grouped registration jury scores and selected-event video config | Calculated values come from the currently loaded scores/config |
| Registrant score/award exports and award synchronization | `calculateRegistrantScoringMap` and `createScoringExportFields` use the same final penalized result | Sync writes `averageScore`, `finalAward`, and `videoPenaltyConfigRevision` |
| Result email backend | Reads saved `finalAward` and `averageScore`; does not recalculate | Finalized jury results and current rule revision are checked; frontend blocks missing/unsynced finalized results |

Registrant Dashboard, Admin Content, SessionAssignmentManager and the award-sync implementation retain their original code. Scoring Recap's scoring logic is unchanged, with only the requested email controls added. Both manifests and lockfiles are restored; no package artifacts or parent-folder runtime dependency remain.

Sync retains its existing scope: it scans `Registrants2025` across events, resolves each event's configuration, queries scores in registration-ID chunks of 10, and writes up to 499 records per batch. It includes legacy-finalized registrations when derived scores need updating; jury finalization does not freeze recalculated penalties/awards. Records without scores are not updated.

## Existing session-board freshness limitation

The session board does not independently calculate scores or subscribe to live award changes. A changed jury score or penalty can make live score views differ from stored session labels until **Sync Awards succeeds**. An already-open session board can still show its earlier snapshot afterward because Admin Content does not pass a refresh signal to the child board.

To compare current results, sync first, save any unsaved assignment changes, and reload/reopen the Admin page. This limitation existed before this email feature. It is documented rather than changed in this verification task; adding an automatic reload could discard unsaved assignment state and needs a deliberate state-preserving implementation.

Raw jury scores and original averages can also differ from final penalized scores by design. Consistency comparisons must use the same registration, event config, score snapshot and final penalized result.

## Automated evidence and limits

All **178 relevant frontend tests** and **139 backend audit tests** passed, including **22 result-email cases**. Focused lint passed with zero errors; backend syntax, stale-reference and CRLF-aware whitespace checks passed. Restored calculator, rule matcher, manifests and lockfiles match their pre-refactor Git contents byte-for-byte. Tests ran with Watchman disabled after its sandbox launch failure; existing Firebase Analytics/Jest/toolchain notices remain. The sync integration tests cover multi-event configuration, adjusted jury scores, stored/displayed outcomes, three-field writes, idempotency, batching and failed commits. All Firebase/SMTP operations in tests are mocked.

Saved results have no score-input fingerprint or sync timestamp. The frontend guard uses its currently loaded data; the backend cannot independently detect an unsynced jury/penalty edit under an unchanged rule revision. Sync and refresh before email preparation. This limitation is documented without introducing a broader scoring migration.

These checks do not certify browser interactions, deployed rules, real Firestore contention, SMTP or inbox delivery. No browser, start/build command, live sync or production write was performed.
