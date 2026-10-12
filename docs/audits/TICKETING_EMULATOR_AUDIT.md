# Reproduce the 7 October ticketing integration audit

## Repair-batch revision (later on 7 October)

The script now has 24 checks and runs the repaired code (see the [repair plan](../TICKETING_REPAIR_PLAN_2026-10-07.md)). Repeated runs give **23 pass / 1 fail**: [ticketing-emulator-results-2026-10-07-repair.json](ticketing-emulator-results-2026-10-07-repair.json). The remaining failure, **Anonymous matching callback must not mark a booking paid**, is the deferred callback-authenticity finding and is intentionally kept visible. The pre-repair 13/7 file below is unchanged.

Revisions:

- Checks prefixed `POLICY:` replace the two former orchestra quota/layout assertions, following the owner's staff-managed capacity decision. They are policy changes, not repaired defects.
- The Web SDK `Transaction.get(Query)` capability probe is retired, because staff assignment no longer uses it; a backend contention check replaces it.
- The generation-overlap check now drives the backend generator transaction instead of a browser facade.
- The early-callback check now enters checkout through the real controller, which replays early receipts.
- New checks: receipt and restart recovery, verified and forged lost-invoice callbacks, concurrent generation, and end-to-end attendance classification (planning → publish → generate → ready → discovery → forged checkout → direct orchestra).

The loader models a restart with a fresh module cache. The Paper.id invoice lookup is substituted per check. Run commands and guards are unchanged; `APCS_QA_WEB_PACKAGE` is no longer needed.

This is an audit, not an application repair. Required safety assertions intentionally fail while the release blockers remain. See [the launch report](../TICKETING_READINESS_AUDIT_2026-10-07.md) and [recorded results](ticketing-emulator-results-2026-10-07.json).

From the monorepo root, start an **empty** separate emulator. Do not import a snapshot into this diagnostic instance:

```sh
firebase emulators:start --only firestore --project demo-apcs-ticketing-qa --config firebase.ticketing-audit.json
```

The configuration loads the existing rules/index definitions and uses Firestore port 8082, websocket 9152, hub 4402 and logging 4502. These ports keep it separate from ordinary local development. The recorded run used Node 20.19.5 and Firebase CLI 13.29.1. Do not point the running application or ngrok at this instance; the integration script invokes repository/controller code directly.

In another terminal, run:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 node apcs_service/audit/ticketing-emulator.integration.cjs
```

The script refuses any other emulator host and refuses to seed a nonempty `demo-apcs-ticketing-qa` project. It uses real installed server SDK transactions and queries, loads actual application repository/controller source, substitutes Paper.id/email/timers/logging, and deletes each disposable fixture before the next test. It never initializes the application's production Firebase configuration or calls the provider. A successful result means an assertion passed; any unresolved safety assertion produces a nonzero exit. The final recorded run had 13 passing and 7 failing assertions.

The staff-assignment check uses the workspace's Firebase Web SDK versions: `@firebase/app` 0.10.8 and `@firebase/firestore` 4.6.5. On 7 October the workspace dependency tree was incomplete. The audit installed those exact versions in a temporary directory with yarn; it did not modify frontend dependencies or its lockfile. To reproduce that workaround:

```sh
mkdir -p /private/tmp/apcs-websdk-qa-20261007
printf '%s\n' '{"name":"apcs-sdk-audit","private":true}' > /private/tmp/apcs-websdk-qa-20261007/package.json
yarn --cwd /private/tmp/apcs-websdk-qa-20261007 add @firebase/app@0.10.8 @firebase/firestore@4.6.5 --ignore-scripts --non-interactive
FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 APCS_QA_WEB_PACKAGE=/private/tmp/apcs-websdk-qa-20261007/package.json node apcs_service/audit/ticketing-emulator.integration.cjs
```

`APCS_QA_FILTER` optionally selects a check by a substring of its name. Run only one instance at a time: checks share the same guarded disposable demo project.

The emulator is useful for the observed interleavings and transactional checks, but does not certify production contention, indexes, client rules/authentication or launch capacity. Concurrent idempotency requests intermittently produced an invalid/closed transaction error, including the final recovery control. Retrying the same checkout recovered its existing booking, so both idempotency assertions passed. Do not turn that transient outcome into a production conclusion or remove the release-blocking assertions to make the audit green.

The genuine staging rehearsal was a separate, explicitly authorized activity. Its empty port-8081 emulator used `firebase.ticketing-staging-qa.json` (project `apcs-profile`, no import/export of the saved snapshot). It reused the owner's service and ngrok, started an empty `apcs-profile` emulator on port 8081, and seeded only `QA_PAPER_20261007`. It created three invoices for the supplied contact and used the [Paper.id staging simulator](https://open-api-paper-id.readme.io/reference/payment-simulation-staging-only); all three provider/local records became paid, and the owner confirmed invoice/confirmation email arrival. Private tokens, contacts, HTTP scripts and the 16-document QA backup remain in ignored `apcs_service/.local/ticketing-qa-20261007/`. This diagnostic script does not repeat that external activity.

At handover, the port-8082 diagnostic instance is stopped. The port-8081 synthetic QA instance remains available with the user's service/ngrok for review. It has no imported customers, pending invoices or jury deadlines. The original saved export was not overwritten. Before returning to the historical snapshot, stop the QA emulator and account for the service's external cancellation/email jobs; Firestore-only isolation does not isolate those integrations. See [local Firestore instructions](../LOCAL_FIRESTORE.md).

UI acceptance remains manual: resolve the existing `e3` development-config error and incomplete dependencies, then check public/winner/orchestra discovery, seat refresh after a competing purchase, cart totals, invoice opening, reload recovery, the over-30-second checkout outcome, paid confirmation, and staff assignment. Keep the seven failing safety assertions visible until repaired. No browser or application build was used for this audit.
