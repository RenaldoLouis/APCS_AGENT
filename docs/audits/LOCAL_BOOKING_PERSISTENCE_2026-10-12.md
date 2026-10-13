# Local booking persistence investigation — 12 October 2026

Read-only investigation of the payment-confirmation email for booking `7Svno8pqZAaOXlfWEUu2`. All times below are Asia/Jakarta (WIB). Application code, database records, emulator exports, provider invoices and processes were not changed.

## Findings

The evidence strongly supports a failed local emulator save followed by importing an older export. It does not establish that APCS payment cleanup deleted a paid booking. No newer production-to-local refresh was found after 7 October. Export-on-exit was configured, but its presence did not guarantee a successful save.

| Time | Evidence |
| --- | --- |
| 7 October, 12:45–12:51 | Last recorded production traversal/import: 7,560 documents, verified path by path and field by field. |
| 9 October, 12:48:15 | Latest successfully saved active native emulator export. This was an export of the local emulator, not another production refresh. |
| 9 October, 21:33:04 | Backend logs record the target booking creation and A7 seat lock. |
| 9 October, 21:36:11 | Backend logs record its paid callback and PAID transition, matching the supplied email. |
| 10 October, 10:05:03–04 | Firebase CLI receives SIGTERM, attempts export-on-exit, then repeatedly fails with `Error: write EIO` in console logging; the JVM shuts down. No successful export completion appears, and saved export file times remain 9 October noon. The underlying cause of the terminal I/O error is unverified. |
| 12 October, 11:52 and 12:00 | CLI startup logs import the unchanged active export. The current Java process started at 12:00:49 with that export as its seed. |

Current readbacks: the exact target booking is absent from both loopback Firestore and production `apcs-profile`; the local emulator has only four older `archived_test` bookings, and no payment receipt for the target booking. The saved native export data files inspected do not contain the target ID. Its creation/paid logs remain available. A confirmation email and historical log do not reconstruct all transaction records or establish provider settlement details.

## Paid-record safeguards and limits

- `PublicTicketSweeper` queries pending bookings only. `expirePublicTicketBooking` refuses non-pending records.
- `PublicTicketFailureRepository.releaseBookingInventory` rechecks PAID/paid inside the inventory transaction; checkout failure handling also refuses paid records. Cleanup updates terminal booking records rather than deleting them.
- `PublicCustomersList` offers deletion only for reconciled failed/expired records and rechecks eligibility inside its transaction. PAID/paid is excluded.
- Two focused offline production-code checks preserved the complete booking, booked seat and inventory snapshot after expiry and late checkout failure for both PAID spellings; UI deletion eligibility was false.
- Existing focused audits passed **23/23**: ticketing-admin release, ticketing repair and checkout failure boundaries. Firestore/provider/email dependencies were substituted; these are not production or browser certification.
- The checked-in `apcs_web/firestore.rules` fallback still permits whitelisted writes/deletes to `publicBookings`. It does not enforce paid-record immutability at the database-rule level. This is a separate hardening gap, not evidence that this booking was deleted through rules. Deployed production rules were not inspected.
- The one-off planning test reset requires explicit execution/fingerprint and archives bookings rather than deleting them. Admin SDK scripts, privileged direct writes and database replacement remain outside normal purchase-flow protection.

## Operational follow-up

For local test purchases, create an explicit export to a new backup directory and verify completion before stopping the emulator. Keep the last good export until the new one is verified. If shutdown logs show EIO or another export failure, do not assume --export-on-exit saved the running data. The next --import loads the older saved state.

Production Firestore does not use this local import/export lifecycle. This finding explains a local persistence failure; it is not a blanket guarantee against application defects or privileged database changes. Database-rule hardening would require coordinated review of existing manual paid and booking-admin writes before implementation.

## Follow-up: disk space and the EIO source

On 12 October, `df -h` reported the project/data volume at **99% capacity, approximately 2.1 GiB available**. This is the current reading; Saturday's available space is unknown. No ENOSPC or “No space left” message was found in the retained Firebase/emulator logs.

The failing stack points to Winston's console transport at `console.js:87`. Inspection of that installed source identifies the operation as `console._stdout.write`, rather than writing an export data file. SIGTERM was followed by repeated stdout EIO failures, JVM shutdown and SIGHUP. A terminal/session interruption is therefore a stronger explanation for the observed error, but the origin of those signals is not recorded. Low storage could be a contributing condition; it is not established as the cause of this failure.

Free disk space before further testing. Stop the emulator with Ctrl+C in its still-open terminal, then wait for successful export completion before closing the terminal/application. A verified explicit backup before shutdown remains the safer protection for local paid-test records.

## Evidence locations

- `apcs_web/firebase-debug.log`: Friday launcher/import, Saturday shutdown/export attempt and EIO errors, Monday imports.
- `apcs_service/logs/combined-2026-10-09.log.gz`: target creation, paid callback and PAID transition.
- `apcs_service/.local/firestore-emulator/`: active saved export, all file timestamps 9 October 12:48.
- `apcs_service/.local/firestore-refresh-20261007/verification.json`: last production-copy verification.

No recovery or database mutation was performed. The remaining unknowns are the precise underlying shutdown I/O failure, the full historical process configuration at purchase time, and whether any other external backup contains Friday evening's emulator state.
