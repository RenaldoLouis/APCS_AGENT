# APCS Ticketing Business Process

## 2026-10-11 — Confirmation status visible to the assignment team

The Admin Page shows each registration's venue confirmation as Attending, Not attending or Not imported. Staff can filter registrant lists by these statuses while arranging performance/orchestra groups, including invited APCS2025 guests. The confirmation belongs to the whole ensemble entry. Counts stay complete and hidden members remain assigned/saved; selected orchestra members are retained in the editor. The display assists staff decisions without granting admission, blocking assignment or changing ticket purchases. [Owner walkthrough](SESSION_ATTENDANCE_WALKTHROUGH.md).

## 2026-10-11 — Winner venue confirmation records

Staff can upload a confirmation worksheet from Registrant Dashboard and store intended venue attendance on each matched solo/ensemble registration. Both APCS2025 invited guests and APCS2026 registrations are supported without changing source years. The owner chose false for negative, blank and unclear responses; affirmative venue attendance stays true even when the performer will not play. A registration not listed retains its previous flag.

The current-campaign flag is informational and does not prove payment, grant admission, count a paid orchestra place or change a performance assignment. Staff must still manage group membership, ticketing and check-in through their established workflows. There is no confirmation history; later imports replace the flag. [Import rules and review workflow](REGISTRANT_ATTENDANCE_IMPORT.md).

## 2026-10-09 — A performer can also attend the orchestra

Performance participation and orchestra attendance are independent assignments. Staff assign a child to their performance group above and may select the same registration in the separate orchestra attendance table below. Attendance membership leaves the child's performance visible and purchasable under the usual sale rules. Each registration can belong to one group of each type. An attendance group is not a ticketable competition performance, and a child who only attends has no competition performance to sell.

The table records the intended attendance group; it does not automatically issue the child's free admission, reserve capacity, or replace paid orchestra assignment. Admission remains separately arranged, consistent with the existing classification-only policy.
Updated: 19 September 2026. These rules replace the previous fixed complimentary-ticket and reserved-orchestra-seat description.

## Winners and ensembles

Winners buy competition tickets for the performance venue and session already assigned by the internal team. They may use the remaining competition add-ons and seat-selection options. They do not select an orchestra session or orchestra seats during checkout.

For a new event without prior competition sessions or ticket activity, staff may first create private venue/date performer groups without exact times. They order members and revise times while the event is in draft. Staff publish the complete timetable before generating numbered competition seats. Competition discovery and checkout open only after full seat and price readiness checks pass. Existing events without a planning state retain their current ticket path; an event with assignments, inventory or bookings needs explicit reconciliation before using planning. Published times cannot be changed through the old session editor.

For APCS2026 specifically, the owner identified the previous ticketing data as dummy/testing data and authorized a scoped reset. The event is now a planning draft with registrants and venue configuration preserved. Four terminal test bookings are archived solely to reject late provider callbacks and do not count toward new attendance or inventory.

Orchestra attendance is all paid tickets purchased using the same winning performance within the event, plus its registered performers once. A solo performer adds one place; an ensemble of four adds four places. Purchases of three and two tickets for that ensemble therefore entitle nine people to attend. Failed or pending purchases do not contribute paid attendance.

After payment, the internal team assigns the whole paid winner group to an orchestra session. Orchestra admission uses free seating. The initial payment email confirms the competition venue and ticket/seat details; a separate email communicates the assigned orchestra venue, date and time. Later purchases show additional attendees awaiting an updated assignment; staff must fit the whole group into its chosen session.

## Public buyers

Public orchestra customers choose a session and Presto or Allegro quantities. They do not select numbered orchestra seats and receive no extra performer allowance. Their receipt names the selected venue/session and explains free seating in the purchased category. Configured public competition sales remain available.

## Capacity and staff operations

Orchestra Settings defines a winner attendance quota within the venue's total capacity. Remaining capacity supports direct public ticket sales. Orchestra Assignments shows paid ticket totals, performers counted once, confirmed assignments and additional demand. Settings shows paid public attendance and assigned winners separately from pending holds and historical allocations.

Free seating removes individual orchestra seat selection, not capacity management. Assignment must fit the complete paid winner group; it must not silently cap the group's entitlement. Payment holds remain protected until a confirmed provider outcome.

## Masterclass and historical records

Masterclass ticketing is outside this system for new purchases: no standalone sales, paid add-on or free Presto Masterclass pass. Its active admin menu entries are removed. Historical bookings retain their original entitlements and seats; migration requires explicit reconciliation rather than automatic data deletion or conversion.

See [staff guide](TICKETING_SYSTEM_GUIDE.md) and [technical flow](SEAT_BOOKING_FLOW.md) for implementation details and operating limits.

## The Jury Scoring Flow

**Core Purpose:** Fair & Efficient Assessment
**Primary Audience:** Adjudicators (Jury Members)

The jury flow enables assigned adjudicators to score and provide feedback on registrant performances within their designated competition category.

### Status Model: Pending vs Assessed

Each registrant's status is determined **per jury member** — it reflects whether the currently logged-in jury user has submitted a score for that specific registrant, not a global or aggregated status.

| Status | Condition | Visual |
|--------|-----------|--------|
| **Pending** | No `JuryScores2025` document exists for this `(registrantId, juryUserId)` pair, or document exists but `score` is `undefined` | Amber pill |
| **Assessed** | A `JuryScores2025` document exists with a defined `score` value | Green pill |

**Data source:** `JuryScores2025` Firestore collection, filtered by `where('juryUserId', '==', loggedInUser.uid)`.

**Per-jury scoping:** Two different jury members will see independent Pending/Assessed counts for the same set of registrants. Jury A may have scored 5 out of 8, while Jury B has scored 3 out of 8 — each sees their own progress.

### Video Duration Penalties and Finalization

- Each event owns one shared automatic penalty score and a duration matrix keyed by the exact competition registration combination.
- Solo limits use the music category and age category. Ensemble limits also use the competition division because divisions such as Vocal Professionals B and C can share an eligibility age while having different maximum durations.
- A video is penalized once when it reaches one whole second beyond its configured maximum. Fractional padding within the maximum second is not penalized.
- A missing event configuration or unmatched registration never causes an assumed deduction; administrators receive a warning and must correct the configuration.
- Finalizing a jury assessment locks the jury's submitted input only. Automatic penalties, averages, and awards remain derived values and are recalculated by Sync Awards without reopening the jury assessment.
- Administrative score corrections remain available after jury finalization. They belong on individual jury scores through `adminAdjustedScore`; manual deductions remain separate through the registrant's manual penalty fields.
- Scoring Recap, dashboard score displays, scoring exports, and award synchronization consume the same live calculation, including finalized and non-finalized jury-score documents. Exports do not fall back to stale stored awards.
**Reminder safety:** The backend deadline reminder treats the Firestore `users` document ID as the canonical jury UID and also accepts the stored `users.uid` field as a legacy fallback when counting submitted scores. A stale `users.uid` field must not cause reminders to be sent to a jury who has already completed all required assessments.

### Dashboard Summary Cards

The three summary stat cards on the Jury Dashboard derive from this logic:

*   **Total Participants** = all registrants in the jury's assigned `competitionCategory`
*   **Pending** = registrants where the jury has no score document (needs attention)
*   **Assessed** = registrants where the jury has a submitted score (completed)

### Assessment Flow

1.  Jury clicks **"Assess →"** (pending) or **"Edit"** (already assessed) on a registrant row
2.  A dedicated **Assessment Form** opens with the registrant's info, repertoire links, and scoring controls
3.  Jury sets a score (0–100) via slider or number input, optionally applies minus points (deductions), writes feedback and comments
4.  **Final score** = `score − minus points` (clamped to 0–100)
5.  Jury clicks **"Save assessment"** → writes to `JuryScores2025` → success modal
6.  **"Next participant →"** button allows moving to the next unscored registrant without returning to the dashboard

### Score Document Schema (`JuryScores2025`)

| Field | Type | Description |
|-------|------|-------------|
| `registrantId` | string | Reference to the registrant |
| `juryUserId` | string | UID of the jury member |
| `juryName` | string | Display name of the jury |
| `juryEmail` | string | Email of the jury |
| `score` | number | Final score (0–100, after deductions) |
| `comment` | string | Performance feedback text |
| `competitionCategory` | string | e.g., "Piano Solo" |
| `ageCategory` | string | e.g., "Junior" |
| `performanceCategory` | string | "Individual" or "Ensemble" |
| `registrantName` | string | Name of the scored registrant |
| `timestamp` | Timestamp | Server timestamp of submission |
| `isFinalized` | boolean | Whether the score has been admin-finalized |
