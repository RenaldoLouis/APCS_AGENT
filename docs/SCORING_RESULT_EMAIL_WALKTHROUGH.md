# Scoring Recap result emails

Implemented on 28 September 2026 for **APCS2026**. Other events cannot use these year-specific templates.

## Prepare and test

1. Open Scoring Recap, select APCS2026 and a competition category, and set the desired table filters. Campaigns apply only to finalized rows in that filtered table, across its table pagination. They do not include other competition categories.
2. After any scoring/penalty edits, run **Sync Awards** (or Admin Content’s **Sync Jury Scores**) and refresh Scoring Recap. Then choose **Send Winner Emails** or **Send Non-Qualifier Emails**. Missing saved results or any finalized row marked **Needs Award Sync** block the entire filtered scope, even if the pending change moves a performer between winner and non-qualifier tiers. The backend uses saved `finalAward`/`averageScore`, checks jury finalization and the saved rule revision, and builds a performer-level preview. Silver, Gold, Diamond, and Sapphire qualify for invitations; Fail qualifies for the result announcement. Unscored or unfinished results are excluded.
3. Check every performer name, email, award, PDF, and delivery status. Each ensemble performer receives a separate message at their own `performers[].email`, greeted by their own name. Missing performer emails never fall back to the parent or teacher.
4. For winners, choose one shared guidelines PDF and enter the confirmation deadline (including time zone where needed) and rundown release date. Each winner gets that one PDF, with their actual award in the invitation. No comment sheet is attached. The invitation states 14–15 November 2026 at Titan Center and the supplied Bintaro address. Dates must contain actual values, without bracket placeholders.
5. For non-qualifiers, choose a local folder containing comment-sheet PDFs. Subfolders are included. Each PDF's filename without `.pdf` must exactly match the performer's name, ignoring case, surrounding spaces and Unicode composition. For example, `Alex Example.pdf` matches `Alex Example`. Substring matching is never used. Missing PDFs, multiple matching PDFs, duplicate performer names in the preview, and files over 4 MB block sending. Correct files or performer data and reopen the preview as needed.
6. Click **Send Test Email** inside either modal. Both tests send only to `renaldolouis555@gmail.com`, using fictional performer **Alex Example**, with a `[TEST]` subject. The non-qualifier test always uses a generated dummy jury PDF, even if a real folder is selected. The winner test uses the selected guidelines PDF, or a generated dummy PDF when none is selected; absent dates use clearly labeled sample values. Tests do not create delivery records for real performers. Test controls remain available when no eligible registrants are present.
7. Verify both test emails and their attachments in your Gmail inbox. A success notice means SMTP accepted the recipient, not that Gmail delivered it to the inbox.

The non-qualifier message preserves the supplied wording except the attachment sentence, approved as **“Please find your e-comment sheet attached.”** No certificate is promised or attached.

## Send and review outcomes

Click **Send N Emails**, review the final confirmation, and choose **Send Emails**. This is the action that sends to actual performers. All selected files are read and checked before the first send; server-side PDF validation and filename validation occur again for every message. Each PDF is limited to 4 MB. Files are transmitted as bounded base64 payloads and are not stored on disk or in Firestore.

The modal stays open while processing one performer at a time, reports progress, and prevents concurrent sends. Each send has its own SMTP result. The frontend spaces requests by one second to respect the existing API rate limit. Counts distinguish SMTP acceptance, previously sent messages, explicit failures, and uncertain outcomes.

Sent recipients are excluded from subsequent sends. Explicit SMTP rejections are retryable without sending again to successful recipients. If a request or SMTP outcome is uncertain, processing pauses. Close and reopen the modal to reload delivery tracking before acting further.

**Do not automatically retry `sending` or `uncertain` records.** SMTP and Firestore cannot commit atomically. A process crash or lost response may occur after email acceptance; those states require the owner to inspect the SMTP provider's delivery history. No general delivery-state editor or automatic expiry is provided. A deliberate repair of a confirmed-unsent record requires a separately authorized narrow backend action; changing a record to retryable without verification risks duplicate mail.

Tracking identity is `(eventId, registrantId, performerIndex, campaignKind)`. A successful campaign is sent once for that identity; changing the selected PDF or dates does not implicitly authorize a resend. Changing performer order after delivery does not preserve performer identity; resolve delivery history before reordering a registration's performers. Corrected results or an intentional resend require separate review.

## API and rollout

Protected POST endpoints under `/api/v1/apcs/scoring-result-emails/`:

| Endpoint | Input | Behavior |
| --- | --- | --- |
| `preview` | `eventId`, `kind`, up to 40 distinct `registrantIds` | Returns performer name/email/award, an authoritative snapshot, validation problems, and delivery status |
| `send` | `eventId`, `kind`, `registrantId`, `performerIndex`, `snapshot`, winner `dates`, `attachment: { filename, base64 }` | Revalidates the saved result and performer, reserves delivery in a transaction, sends one PDF, records the outcome |
| `test` | `kind`, optional winner `dates` and shared `attachment` | Sends fictional content exclusively to the server-fixed Gmail recipient |

All three endpoints require a fresh Firebase ID token and an admin whitelist record. A dedicated route authenticates before its 6 MB JSON parser; other routes retain the existing 1 MB limit. Production destinations and awards come from backend records, never from arbitrary client-provided `to` or `award` fields.

Deploy frontend/backend changes and the delivery-record Firestore rule together through the existing release process; no deployment is performed by this implementation. Restart an existing backend process to load the new route. Backend Admin SDK must have access to `scoringResultEmailDeliveries`. This path is excluded from the browser-client catch-all rule. The implementation creates no new query indexes.

The existing frontend `scoringCalculator.js` and award-sync implementation are unchanged. No backend calculator, shared package, vendor artifact, or base-folder deployment dependency is needed. Email sending reads database results and does not update scoring records.

Saved results do not include an input fingerprint or sync timestamp. The backend can reject missing results, changed preview snapshots and outdated rule revisions, but cannot independently prove that a later jury/penalty edit was synced under the same revision. Always sync and refresh after edits, including changes in other admin sessions, before preparing a real campaign.

## Acceptance boundary

Offline tests cover recipients, finalized eligibility, all award tiers, saved-result validation, sync guards, PDF matching, invalid inputs, fixed dummy destination, duplicate prevention, and partial/uncertain SMTP failures. Browser file-picker behavior, deployed authorization/rules, real Firestore transaction contention, actual SMTP service behavior, and inbox delivery remain owner-operated acceptance checks. No browser, start/build command, live Firestore mutation, deployment, or actual email send is performed during development verification.

Current smaller-scope verification: the original calculator and video-rule matcher are restored byte-for-byte from their pre-refactor Git versions. Relevant frontend tests and backend audits cover saved-result eligibility, per-performer delivery, existing scoring/sync behavior, missing or unsynced rows, stale preview snapshots and rule revisions. See [verification report](SCORING_CENTRALIZATION_VERIFICATION_2026-09-28.md) for current counts and boundaries.
