# Search local registrant emails in Gmail

The private report folder `apcs_service/.local/reports/instrument-emails-20261010/` contains the APCS2025/APCS2026 Harp, Guzheng and Percussions email list from the 7 October 2026 local snapshot. All payment statuses were included; `performers[].email` was trimmed, lowercased and deduplicated to 63 addresses. Shared parent/teacher contacts can appear in this field.

Double-click `search-gmail.command` in Finder, or run:

```sh
python3 apcs_service/.local/reports/instrument-emails-20261010/search_gmail.py
```

The script opens Google Chrome with one Gmail search combining `from:` and `to:` alternatives and `in:inbox`. It uses the existing browser login. If necessary, select the intended Chrome profile/account. For another Gmail account number, use `--account 1` (matching `/mail/u/1/`). Use `--all-mail` to include normal archived/sent folders, or `--dry-run` to generate the query/link without opening Chrome. The plain query is saved beside the script as `gmail-search-query.txt` for manual pasting into the desired Gmail tab.

The script only constructs and opens a search URL; it does not read results, send messages or change mailbox records. It reads the text list beside itself on every run. Keep the report folder private and uncommitted. The combined search was verified offline against all 63 input addresses; Gmail results and browser behavior require manual verification.

Gmail operator reference: https://support.google.com/mail/answer/7190

## Export message dates for team review

The same private report folder now contains `export-gmail-message-dates.gs` and `GMAIL_EXPORT_INSTRUCTIONS.md`. Paste the `.gs` file into a new Google Apps Script project in the intended Gmail account and run `exportRegistrantMessageDates`. The 63-address list is embedded. After the account owner authorizes Gmail/spreadsheet access, it creates a private Google spreadsheet with **Email** and **Message date (WIB)**, downloadable through **File > Download > Microsoft Excel (.xlsx)**. Each successful run creates a new report.

There is one row per incoming message currently in the inbox, matched by exact normalized sender, with dates newest first per address. Every address is included; a blank date means no matching message found. Outgoing/unrelated messages in matched threads, drafts and trash are excluded. Set `INBOX_ONLY = false` to include archived mail. All historical matching incoming messages are included, without claiming they are replies to an event invitation or interpreting attendance. Bodies are not read/copied and messages are not changed or sent. Google authorization is required because this script runs under the mailbox owner's account; local browser login alone does not provide script access.

Paginated reads suppress duplicate message IDs. Read errors or a four-minute scan limit stop before creating a report rather than producing a knowingly partial export. Mailbox changes during pagination can shift search results; run while the mailbox is stable if exact completeness is needed. Offline mocked checks verified all 63 contacts, pagination, sender/label exclusions, duplicate suppression, chronological sorting, no-match rows, timeout and spreadsheet writing. Actual Gmail access, spreadsheet creation and Excel download remain unverified until run in the owner's account.

Reference: [GmailMessage methods](https://developers.google.com/apps-script/reference/gmail/gmail-message), [GmailApp search](https://developers.google.com/apps-script/reference/gmail/gmail-app).

## Five-column attendance report with reply evidence

The owner clarified that the intended output includes attendance signals and exact reply evidence rather than the date-only export. Use the private `export-gmail-attendance-replies.gs` replacement in the same Apps Script project and run `exportAttendanceReplies`; the old function name also delegates to this updated export. Each run creates a new **APCS attendance replies** spreadsheet and preserves prior reports. Both **Attendance summary** (one row per email) and **All incoming replies** (one row per message) have exactly five columns: **Registrant name**, **Email**, **Will come?**, **Reply evidence**, **Reply date (WIB)**. Shared addresses join linked performer names from both event years; they do not prove attendance for every named performer.

The conservative English phrase matcher labels clear first-person attendance statements Yes/No, recognizes an explicit commitment to perform as an attendance signal, and flags conditions, questions, third-person/shared-contact statements, conflicting replies and performance-only declines for review. Unrecognized replies remain Unclear; absent matching messages are separate. It strips common quoted-message delimiters before classification, retains exact matched wording and exposes all incoming messages for team review. The summary uses the newest explicit signal and retains conflicting evidence with timestamps. A reply lacking an explicit attendance phrase does not silently overwrite an earlier signal.

The scope remains all historical inbox messages, not a verified event-specific RSVP set. Dates and wording must be reviewed for event context. Quote stripping and phrase matching are heuristic; unsupported languages/context-dependent answers may remain unclear, unusual quoted text can be missed, and each evidence cell is capped at 12,000 characters. Formula-like email text is escaped. Full private run instructions are in `GMAIL_ATTENDANCE_EXPORT_INSTRUCTIONS.md` beside the script. No external AI service is used; Gmail bodies are now read for this authorized report, with no message mutation.

Offline checks passed for 13 classification cases, quote exclusion, preserved wording, all 63 contact-name mappings, contradictions, five-column writing, sender filtering, formula escaping and timeout handling. Live Gmail classification and spreadsheet layout remain for owner review.
