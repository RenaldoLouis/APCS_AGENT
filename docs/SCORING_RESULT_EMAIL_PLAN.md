# Scoring Recap result emails — implementation plan

Event-wide winner scope approved 2 October 2026: **Send to All Winners** uses only the selected APCS2026 event, across all competition categories regardless of table filters. It prepares one combined performer preview and one shared guidelines PDF, refreshes result/scope checks before sending, and reuses the existing delivery identity. It remains a browser-driven sequential campaign; the page must remain open. The existing category-based winner/non-qualifier actions remain available.

For ensemble registrations, both comment-sheet and certificate PDFs may list complete performer names separated by `&`. For example, `NATANIA JANICE & GRACE FRANEL CHAO.pdf` matches either full name, ignoring whitespace, case and Unicode composition. Each performer receives the shared PDFs separately. Folder matching, Send One and backend validation use this rule. Partial names and multiple matching files remain blocked; solo filenames must match the whole performer name.

Date: 28 September 2026; attachment update confirmed 1 October 2026. Status: approved by the owner and implemented; offline verification and manual acceptance are described in `SCORING_RESULT_EMAIL_WALKTHROUGH.md`.

## Confirmed requirements

- Send each performer a separate email to `performers[].email`, greeting them by `fullName` (or `firstName` + `lastName`). Do not fall back to a parent or teacher email.
- Winning tiers include Silver, Gold, Diamond, and Sapphire. Winner invitations show the saved tier except Sapphire, which is shown as Diamond until a separate admin announcement reveals it. Eligibility and saved awards stay unchanged.
- Non-qualifiers are finalized Fail results. Exclude unscored and non-finalized results from both campaigns.
- Select separate local comment-sheet and E-certificate folders when preparing non-qualifier emails. Each recipient gets one PDF from each folder, both matched to their own performer name. Sending one recipient requires choosing both PDFs on that row.
- Select one shared guidelines PDF for all winners. Winners do not receive comment sheets in this campaign.
- Provide dummy test sends for both templates to the fixed address `renaldolouis555@gmail.com`.

## Proposed interface and campaign scope

Add **Send Winner Emails** and **Send Non-Qualifier Emails** to Scoring Recap. Each opens a preparation modal for the current filtered table in the selected event/category. Display the scope and counts prominently; do not silently send to other categories or hidden rows.

Winner preparation asks for the shared PDF, confirmation deadline, and rundown release date. Dates are required for real sends; never send unresolved bracket placeholders. No additional performance-session selection is needed.

Non-qualifier preparation asks for separate comment-sheet and E-certificate folders using the browser's folder file picker. Only selected files are available to the application; this does not grant access to arbitrary local folders. Match PDF basenames in each folder to performer names after removing all whitespace, normalizing Unicode, and ignoring case. Do not use substring or fuzzy matching. Show name, email, award, and both attachments before enabling sending. Missing/invalid email, missing PDFs, multiple matches, and same-name performers on different registrations block the affected campaign until corrected. Never choose a file arbitrarily.

Each preparation modal includes **Send Test Email**. Use explicitly fictional performer data and two visibly dummy PDFs for the non-qualifier test; the winner test may use the chosen guidelines PDF. The backend fixes the destination independently of client input. Test sends do not mark real performers as notified.

The 1 October attachment update restores the supplied non-qualifier sentence **“Please find below your E-certificate and comment sheets.”** as a bold paragraph without a bordered callout. Both named PDFs must be present for a real send. The winner invitation retains the supplied event dates, venue, address, and WhatsApp contact wording.

## Backend and delivery behavior

Use protected Express endpoints with Firebase-token and admin-whitelist authorization. Resolve performer identities/emails, event membership, finalized jury results, and saved `finalAward`/`averageScore` from authoritative backend records. Block missing saved results and outdated rule revisions. The frontend blocks finalized rows needing award sync; staff must sync and refresh after scoring edits. Do not trust recipient addresses or awards supplied by the frontend for production sends. Keep the original frontend calculator and Sync Awards flow unchanged; email sending does not calculate results. No backend-only scoring migration or shared-package dependency is part of this scope. Saved results lack an input fingerprint, so same-revision jury/penalty edits cannot independently be detected by the email backend.

Send the locally selected PDF content with bounded payloads and validate it as PDF data. For non-qualifiers, require both the comment sheet and E-certificate, each independently matched to the performer. Backend paths are never supplied by the browser. Process bounded recipient batches, await each SMTP result, and return per-recipient sent/failed/skipped outcomes. The interface must not report a whole campaign as successful after partial failures.

Persist delivery state for individual performers to prevent routine duplicate sends and allow retries of failures. Reserve a send before SMTP to prevent overlapping requests. A provider-accepted message is not proof of inbox delivery; an uncertain send must not be automatically retried because SMTP and Firestore cannot commit atomically. Document any new delivery collection and this failure boundary in `docs/architecture.md`.

## Validation and documentation

- Add offline tests for finalized eligibility, all four tiers, each performer's destination/greeting, exact PDF matching, ambiguous/missing attachments, fixed test recipient, backend authorization/validation, duplicate-send handling, and partial SMTP failures.
- Run focused lint, syntax checks, relevant automated tests, stale-reference checks, and review all conditional branches.
- Update `docs/architecture.md`, `docs/progress.md`, and a manual walkthrough in `docs/` after implementation.
- Leave all changes uncommitted. Do not run start/build commands or open a browser. The owner performs browser and inbox acceptance.
- Implement the test-send functions and buttons; development verification uses mocked SMTP. Actual sending is an explicit action from the new UI or a separately requested live test.
