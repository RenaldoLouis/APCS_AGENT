# APCS Ticketing Business Process

Updated: 19 September 2026. These rules replace the previous fixed complimentary-ticket and reserved-orchestra-seat description.

## Winners and ensembles

Winners buy competition tickets for the performance venue and session already assigned by the internal team. They may use the remaining competition add-ons and seat-selection options. They do not select an orchestra session or orchestra seats during checkout.

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
