# APCS Business Perspective

## Overview

This document outlines the core business logic and user flow philosophy for the APCS (Asia Pacific Choral Summit) ticketing and registration system. It serves to clarify the distinct purposes of the two main user journeys: Registrants and Public Buyers.

## The Registrant Flow

**Core Purpose:** Showcasing Talent & Competition
**Primary Audience:** Participants (kids), Parents, Teachers, and Family Members.

The registrant flow is focused on the participants who are competing or showcasing their skills. The events they participate in are generally of high interest to their immediate circle (parents and teachers) who want to see their performance.

*   **Incentive:** To reward their participation and encourage attendance at the main event, registrants are provided with **2 complimentary tickets** to watch the Orchestra sessions.
*   **Seating:** These complimentary tickets are automatically assigned seating from reserved areas (e.g., the front 3 rows of the venue) which are determined on the spot by the staff on the day of the event.

## The Public Flow (Orchestra Sessions)

**Core Purpose:** Entertainment & Revenue
**Primary Audience:** The General Public, Music Enthusiasts.

The public flow is specifically tailored for the Orchestra sessions. From a business perspective, the Orchestra is the primary entertainment draw for the general public who may not have a personal connection to any specific registrant but want to enjoy a high-quality musical performance.

*   **Ticketing:** Public buyers purchase tickets at the standard public price.
*   **Seating:** They can select their seats from the digital map during the booking process. However, the reserved rows set aside for the registrants' complimentary tickets are blocked out and unavailable for public purchase.

## System Implications

*   **Separation of Sessions:** The system distinguishes between general competition sessions (Registrants) and Orchestra sessions (Public).
*   **Quota Management:** Admin dashboards must track and manage the quota of complimentary tickets given out for Orchestra sessions to ensure the reserved seating capacity is not exceeded.
*   **Dynamic UI:** The booking interface adapts based on whether the user identifies as a Registrant (triggering the complimentary ticket flow) or a Public Buyer (triggering the standard purchase flow).

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

