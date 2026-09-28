# Scoring Recap result emails — implementation plan

Date: 28 September 2026. Status: approved by the owner and implemented; offline verification and manual acceptance are described in `SCORING_RESULT_EMAIL_WALKTHROUGH.md`.

## Confirmed requirements

- Send each performer a separate email to `performers[].email`, greeting them by `fullName` (or `firstName` + `lastName`). Do not fall back to a parent or teacher email.
- Winning tiers include Silver, Gold, Diamond, and Sapphire. Insert the actual award into the supplied winner invitation.
- Non-qualifiers are finalized Fail results. Exclude unscored and non-finalized results from both campaigns.
- Select a local folder when preparing non-qualifier emails. Each recipient gets exactly one PDF matched to their own performer name.
- Select one shared guidelines PDF for all winners. Winners do not receive comment sheets in this campaign.
- Provide dummy test sends for both templates to the fixed address `renaldolouis555@gmail.com`.

## Proposed interface and campaign scope

Add **Send Winner Emails** and **Send Non-Qualifier Emails** to Scoring Recap. Each opens a preparation modal for the current filtered table in the selected event/category. Display the scope and counts prominently; do not silently send to other categories or hidden rows.

Winner preparation asks for the shared PDF, confirmation deadline, and rundown release date. Dates are required for real sends; never send unresolved bracket placeholders. No additional performance-session selection is needed.

Non-qualifier preparation asks for a folder using the browser's folder file picker. Only selected files are available to the application; this does not grant access to arbitrary local folders. Match PDF basenames to performer names after trimming, normalizing Unicode, and ignoring case. Do not use substring or fuzzy matching. Show name, email, award, and attachment before enabling sending. Missing/invalid email, missing PDFs, multiple matches, and same-name performers on different registrations block the affected campaign until corrected. Never choose a file arbitrarily.

Each preparation modal includes **Send Test Email**. Use explicitly fictional performer data and a visibly dummy PDF for the non-qualifier test; the winner test may use the chosen guidelines PDF. The backend fixes the destination independently of client input. Test sends do not mark real performers as notified.

The supplied non-qualifier copy references an e-certificate, but only a jury comment-sheet PDF is requested. Proposed correction: **“Please find your e-comment sheet attached.”** All other supplied text is retained. The winner invitation retains the supplied event dates, venue, address, and WhatsApp contact wording.

## Backend and delivery behavior

Use protected Express endpoints with Firebase-token and admin-whitelist authorization. Resolve performer identities/emails, event membership, finalized jury results, and saved `finalAward`/`averageScore` from authoritative backend records. Block missing saved results and outdated rule revisions. The frontend blocks finalized rows needing award sync; staff must sync and refresh after scoring edits. Do not trust recipient addresses or awards supplied by the frontend for production sends. Keep the original frontend calculator and Sync Awards flow unchanged; email sending does not calculate results. No backend-only scoring migration or shared-package dependency is part of this scope. Saved results lack an input fingerprint, so same-revision jury/penalty edits cannot independently be detected by the email backend.

Send the locally selected PDF content with bounded payloads and validate it as PDF data. Backend paths are never supplied by the browser. Process bounded recipient batches, await each SMTP result, and return per-recipient sent/failed/skipped outcomes. The interface must not report a whole campaign as successful after partial failures.

Persist delivery state for individual performers to prevent routine duplicate sends and allow retries of failures. Reserve a send before SMTP to prevent overlapping requests. A provider-accepted message is not proof of inbox delivery; an uncertain send must not be automatically retried because SMTP and Firestore cannot commit atomically. Document any new delivery collection and this failure boundary in `docs/architecture.md`.

## Validation and documentation

- Add offline tests for finalized eligibility, all four tiers, each performer's destination/greeting, exact PDF matching, ambiguous/missing attachments, fixed test recipient, backend authorization/validation, duplicate-send handling, and partial SMTP failures.
- Run focused lint, syntax checks, relevant automated tests, stale-reference checks, and review all conditional branches.
- Update `docs/architecture.md`, `docs/progress.md`, and a manual walkthrough in `docs/` after implementation.
- Leave all changes uncommitted. Do not run start/build commands or open a browser. The owner performs browser and inbox acceptance.
- Implement the test-send functions and buttons; development verification uses mocked SMTP. Actual sending is an explicit action from the new UI or a separately requested live test.
