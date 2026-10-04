# Scoring Recap result emails

For ensemble registrations, both comment-sheet and certificate PDFs may list complete performer names separated by `&`. For example, `NATANIA JANICE & GRACE FRANEL CHAO.pdf` matches either full name, ignoring whitespace, case and Unicode composition. Each performer receives the shared PDFs separately. Folder matching, Send One and backend validation use this rule. Partial names and multiple matching files remain blocked; solo filenames must match the whole performer name.

Implemented on 28 September 2026 for **APCS2026**. Other events cannot use these year-specific templates.

## Prepare and test

### Send all APCS2026 winners together

1. Select **APCS 2026** and click **Send to All Winners** in the header. No competition category selection is needed; category, age, jury, search and status filters do not narrow this campaign. APCS2025 disables the button.
2. Review the combined performer preview and competition categories. Finalized Silver, Gold, Diamond and Sapphire winners are eligible. Unsynced finalized results block preparation: run Sync Awards in affected categories and reopen the preview.
3. Choose one shared guidelines PDF, review dates and optionally send a test. Confirm the recipient count and send. Previously sent performers are skipped; Sapphire invitations still say DIAMOND WINNER.
4. Keep the modal/page open until progress finishes. Reopening restores delivery statuses. Sending/uncertain records remain blocked pending provider verification. A changed winner list before sending requires reopening the preview.

Manual verification: check APCS2025 disables the button, open APCS2026 without a category, confirm winners from multiple categories, then select a PDF and review the test email before any real campaign. Browser, live Firestore and SMTP verification remain owner acceptance steps.

### Send within the current category

The non-qualifier preview includes an **Age Category** column from the registration's assigned category, including ensemble age categories. **Send One** repeats it in the confirmation. Use this alongside registration identity when choosing PDFs for duplicate performer names; missing categories show **Unassigned**. The existing exact-name PDF checks still apply.

Both result email bodies use inline justified alignment. For a real-PDF winner test, select `WINNER ANNOUNCEMENT.pdf` through **Choose Shared Guidelines PDF**, then **Send Test Email**. The selected file replaces the dummy winner attachment. Check the recipient shown by the current app before sending; it is controlled by the configured test-email constant. Single or final lines may retain normal spacing with justified alignment.

Winner invitations bold **confirm your attendance** and **all important event guidelines and performance information**. After updating the backend, restart it and send a new test invitation to review the emphasis in your inbox.

1. Open Scoring Recap, select APCS2026 and a competition category, and set the desired table filters. Campaigns apply only to finalized rows in that filtered table, across its table pagination. They do not include other competition categories.
2. After any scoring/penalty edits, run **Sync Awards** (or Admin Content’s **Sync Jury Scores**) and refresh Scoring Recap. Then choose **Send Winner Emails** or **Send Non-Qualifier Emails**. Missing saved results or any finalized row marked **Needs Award Sync** block the entire filtered scope, even if the pending change moves a performer between winner and non-qualifier tiers. The backend uses saved `finalAward`/`averageScore`, checks jury finalization and the saved rule revision, and builds a performer-level preview. Silver, Gold, Diamond, and Sapphire qualify for invitations; Fail qualifies for the result announcement. Unscored or unfinished results are excluded.
3. Check every performer name, email, award, PDF, and delivery status. Each ensemble performer receives a separate message at their own `performers[].email`, greeted by their own name. Missing performer emails never fall back to the parent or teacher.
4. For winners, choose one shared guidelines PDF and review the confirmation deadline and rundown release date. They default to **12 October 2026** and **19 October 2026**; staff can edit them before sending if the event schedule changes. Each winner gets that one PDF. Invitations show Silver, Gold, or Diamond as saved; a saved Sapphire result is shown as **DIAMOND WINNER** until the separate admin announcement. No comment sheet is attached. The invitation retains 14–15 November 2026 at Titan Center and the supplied Bintaro address. Dates must contain actual values, without bracket placeholders.
5. For non-qualifiers, choose separate local folders containing comment-sheet PDFs and E-certificate PDFs. Subfolders are included. In each folder, each PDF's filename without `.pdf` must exactly match the performer's name, ignoring case, all whitespace and Unicode composition. For example, `Alex Example.pdf` matches `Alex Example`. Substring matching is never used. A missing file in either folder, multiple matching PDFs, duplicate performer names in the preview, or files over 4 MB block batch sending. Correct files or performer data and reopen the preview as needed.
   To send one non-qualifier independently, use **Choose Comment** and **Choose Certificate** on that performer's row, then **Send One**. Both files must still be named after that performer and be at most 4 MB each. Review the confirmation's name, address, registration, performer index and both PDFs, especially when names or addresses repeat. This action sends only the chosen row and works when duplicate names block folder-based batch matching. It uses the same saved-result checks and delivery status; sent, sending and uncertain rows cannot be sent again from the dialog.
6. Click **Send Test Email** inside either modal. Both tests send only to `renaldolouis555@gmail.com`, using fictional performer **Alex Example**, with a `[TEST]` subject. The non-qualifier test always uses generated dummy certificate and comment-sheet PDFs, even if real folders are selected. The winner test uses the selected guidelines PDF, or a generated dummy PDF when none is selected; dates default to 12 and 19 October 2026. Tests do not create delivery records for real performers. Test controls remain available when no eligible registrants are present.
7. Verify both test emails and their attachments in your Gmail inbox. A success notice means SMTP accepted the recipient, not that Gmail delivered it to the inbox.

Both test and performer emails use the shared APCS email layout: logo banner, font and content card, and copyright footer. Winner emails begin with a bold performer name followed by “Congratulations!”, omit the redundant title heading, and bold the displayed invitation award, concert name, PDF reference, key deadlines, WhatsApp contact number, event name and sign-off. The number opens a WhatsApp chat at `https://wa.me/6282213002686`. The event details and dates remain in bordered panels. Non-qualifier emails bold the performer's greeting name, the attachment sentence and APCS Team sign-off. The attachment sentence is a plain paragraph without a bordered callout. The plain-text alternative keeps the same message wording. After a backend update, restart the running backend before sending a new test; previously received emails do not change.

The non-qualifier attachment sentence is **“Please find below your E-certificate and E-comment sheets.”** Its HTML paragraph uses inline `text-align:justify`; verify alignment in a newly sent test email (a single-line sentence may appear unchanged). Real sends attach one E-certificate and one comment-sheet PDF per performer, with descriptive filenames in the email.

## Send and review outcomes

Click **Send N Emails**, review the final confirmation, and choose **Send Emails**. This is the action that sends to actual performers. All selected files are read and checked before the first send; server-side PDF validation and filename validation occur again for every message. Each PDF is limited to 4 MB. Files are transmitted as bounded base64 payloads and are not stored on disk or in Firestore. The fail-email request carries both files under a dedicated 12 MB authenticated JSON limit.

The modal stays open while processing one performer at a time, reports progress, and prevents concurrent sends. Each send has its own SMTP result. The frontend spaces requests by one second to respect the existing API rate limit. Counts distinguish SMTP acceptance, previously sent messages, explicit failures, and uncertain outcomes.

Sent recipients are excluded from subsequent sends. Explicit SMTP rejections are retryable without sending again to successful recipients. If a request or SMTP outcome is uncertain, processing pauses. Close and reopen the modal to reload delivery tracking before acting further.

**Do not automatically retry `sending` or `uncertain` records.** SMTP and Firestore cannot commit atomically. A process crash or lost response may occur after email acceptance; those states require the owner to inspect the SMTP provider's delivery history. No general delivery-state editor or automatic expiry is provided. A deliberate repair of a confirmed-unsent record requires a separately authorized narrow backend action; changing a record to retryable without verification risks duplicate mail.

Tracking identity is `(eventId, registrantId, performerIndex, campaignKind)`. A successful campaign is sent once for that identity; changing the selected PDF or dates does not implicitly authorize a resend. Changing performer order after delivery does not preserve performer identity; resolve delivery history before reordering a registration's performers. Corrected results or an intentional resend require separate review.

## API and rollout

Protected POST endpoints under `/api/v1/apcs/scoring-result-emails/`:

| Endpoint | Input | Behavior |
| --- | --- | --- |
| `preview` | `eventId`, `kind`, up to 40 distinct `registrantIds` | Returns performer name/email/award, an authoritative snapshot, validation problems, and delivery status |
| `send` | `eventId`, `kind`, `registrantId`, `performerIndex`, `snapshot`, winner `dates`, `attachment: { filename, base64 }`, and for non-qualifiers `certificateAttachment: { filename, base64 }`; optional `manualAttachmentSelection: true` for one non-qualifier | Revalidates the saved result and performer, reserves delivery in a transaction, sends one winner PDF or both fail PDFs, records the outcome. Manual selection permits duplicate names only for that explicit row and still checks both PDF names. |
| `test` | `kind`, optional winner `dates` and shared `attachment` | Sends fictional content exclusively to the server-fixed Gmail recipient; fail tests attach two generated dummy PDFs |

All three endpoints require a fresh Firebase ID token and an admin whitelist record. A dedicated route authenticates before its 12 MB JSON parser; other routes retain the existing 1 MB limit. Production destinations and awards come from backend records, never from arbitrary client-provided `to` or `award` fields.

Deploy frontend/backend changes and the delivery-record Firestore rule together through the existing release process; no deployment is performed by this implementation. Restart an existing backend process to load the new route. Backend Admin SDK must have access to `scoringResultEmailDeliveries`. This path is excluded from the browser-client catch-all rule. The implementation creates no new query indexes.

The existing frontend `scoringCalculator.js` and award-sync implementation are unchanged. No backend calculator, shared package, vendor artifact, or base-folder deployment dependency is needed. Email sending reads database results and does not update scoring records.

Saved results do not include an input fingerprint or sync timestamp. The backend can reject missing results, changed preview snapshots and outdated rule revisions, but cannot independently prove that a later jury/penalty edit was synced under the same revision. Always sync and refresh after edits, including changes in other admin sessions, before preparing a real campaign.

## Acceptance boundary

Offline tests cover recipients, finalized eligibility, all award tiers, saved-result validation, sync guards, PDF matching, invalid inputs, fixed dummy destination, duplicate prevention, and partial/uncertain SMTP failures. Browser file-picker behavior, deployed authorization/rules, real Firestore transaction contention, actual SMTP service behavior, and inbox delivery remain owner-operated acceptance checks. No browser, start/build command, live Firestore mutation, deployment, or actual email send is performed during development verification.

Current smaller-scope verification: the original calculator and video-rule matcher are restored byte-for-byte from their pre-refactor Git versions. Relevant frontend tests and backend audits cover saved-result eligibility, per-performer delivery, existing scoring/sync behavior, missing or unsynced rows, stale preview snapshots and rule revisions. See [verification report](SCORING_CENTRALIZATION_VERIFICATION_2026-09-28.md) for current counts and boundaries.
