# APCS Project — Architecture & Data Structure

This document describes the Firestore data model, API contracts, and system flows for the APCS project. It serves as the single source of truth for developers working on the codebase.

> Ticketing was audited on 6 September 2026. Its current implementation has unresolved correctness and authorization defects; see [the audit](TICKETING_AUDIT_2026-09-06.md), [technical flow](SEAT_BOOKING_FLOW.md), and [staff guide](TICKETING_SYSTEM_GUIDE.md). Configuration examples are illustrative, not confirmation of deployed data.

---

## Current ticketing contract — 19 September 2026

The free-seating sections in [SEAT_BOOKING_FLOW.md](SEAT_BOOKING_FLOW.md) and [TICKETING_SYSTEM_GUIDE.md](TICKETING_SYSTEM_GUIDE.md) supersede older numbered-orchestra and Masterclass checkout examples later in this document. Those older sections describe historical records and audit history, not new-sale behavior.

### New booking fields and ownership

New `publicBookings` use `ticketingVersion: 2`, `venueName` (booking-time venue label), `seatingMode: 'numbered' | 'free'`, `performerCount` (authoritative registered roster size, solo fallback one), and `orchestraAttendanceTickets` (winner paid ticket quantity, zero for public buyers). They store no new Masterclass benefit, complimentary seat claim, winner-claim ID or selected orchestra seats. Numbered competition capacity/ownership fields and idempotency keys remain in use. Saved ticket names/prices and competition seat labels are derived by the backend.

`orchestraAssignments/{encodeURIComponent(eventId + '|' + registrantId)}` is the new assignment collection. Each document contains:

- `eventId`, `registrantId`, `sessionId`, `venue`, `venueName`, `date`, `time`.
- `paidTicketCount`, `performerCount`, `quantity`, `bookingIds` (the covered paid snapshot).
- `revision`, `assignedBy`, `assignedAt`, `notifiedBookingIds`.
- Optional `notificationLease: { token, bookingId, expiresAt }`, where `expiresAt` is epoch milliseconds; completed/failed sends clear it.

`OrchestraAssignmentRepository.readGroup` derives current demand from paid version-2 bookings grouped by event and winning performance: sum of paid ticket quantities + maximum snapshotted performer count once. It also detects paid historical complimentary allocations and blocks silent mixed-version reassignment. Later purchases produce additional pending assignment demand; they do not overwrite the existing assignment snapshot.

`events/{eventId}.orchestraSessions[]` retains venue/date/time and `complimentaryQuota` but adds `freeSeatingAssigned` and `seatingMode: 'free'`. Historical `complimentaryClaimed`/`reservedRows` values remain for legacy records. New assignments atomically decrement the old session headcount and increment the target headcount, preserving the legacy counter. Public free-seating checkout keeps tier capacity and limits total paid demand to venue capacity minus the configured winner quota.

`winnerOrchestraClaims` remains a legacy collection; new checkouts do not write it. New Masterclass purchases are rejected even if historical configuration remains. Existing invoices and legacy cleanup are unchanged.

### New admin APIs

All are POST under `/api/v1/apcs/public-ticket/admin/orchestra/`, with `requireTicketingAdmin` Firebase-token/whitelist middleware:

| Suffix | Input | Result |
| --- | --- | --- |
| `list` | `eventId`, optional booking-ID `cursor` | 25-booking discovery page, complete paid winner groups and next cursor |
| `assign` | `eventId`, `registrantId`, `sessionId` | Transactional assignment, then per-booking notification attempts; failed IDs remain retryable |
| `notify` | `eventId`, `registrantId` | Retry missing emails for the saved revision |
| `sessions` | `eventId` | Session configuration plus paid public, held public and assigned winner counts |
| `session` | `eventId`, `session` or `deleteSessionId` | Protected settings mutation preserving fresh counters and checking capacity/active allocations |

Group reads are event/registrant-scoped; discovery is paginated. Session overview and settings validation queries are event/venue/date/time-scoped. The new event/registrant composite index is checked in to `apcs_web/firestore.indexes.json`; the existing event/status index serves discovery. Actual deployed index availability and database edition were not verified locally.

`OrchestraAssignmentController` sends notifications only after an assignment commits. SMTP and persistence are not atomic; a crash after successful SMTP and before delivery acknowledgement can result in a retry duplicate. A short lease limits overlapping requests; no background outbox worker is introduced.

`EmailService.sendPublicBookingConfirmationEmail` resolves a saved venue name or the booking's event, never the current event. `OrchestraEmailDetails` generates escaped free-seating/group instructions. Covered assignments appear in confirmation resends; new purchases outside the assignment snapshot show pending. Assignment emails go to each covered booking's stored buyer email.

### Historical and rollout boundary

No live migration is performed. Unversioned/version-1 orders retain original numbered seats, Masterclass entitlements, quota, provider invoice and cleanup semantics. Reconcile an old winner allocation before assigning its new group. New Orchestra Settings does not generate physical seats; old seat generators and direct admin database access remain historical operational concerns.

Deploy the backend, frontend and indexes together and complete [manual acceptance](TICKETING_FREE_SEATING_WALKTHROUGH_2026-09-19.md). Existing payment authentication/recovery and Firestore contention limitations remain; offline tests are not deployment certification.

## Tech Stack & UI/UX Guidelines

*   **Frontend:** React.js + Ant Design (antd).
*   **Backend:** Node.js + Express.js.
*   **Database:** Firebase Firestore (NoSQL) & Firebase Auth.
*   **Storage:** AWS S3 (Presigned URLs for uploads) + AWS CloudFront CDN (Low-latency video streaming).
*   **Integrations:** Paper.id (Invoicing), Nodemailer (Emails).
*   **Theme:** Elegant Dark Mode
    *   Background: `#121212` | Card: `#1E1E1E`
    *   Accents: `#EBBC64` (Gold) | Text: `#e5cc92` (Cream)

### Core Rules
1.  **Bilingual Support (EN/ID):** All UI strings must consider both languages.
2.  **Firebase Optimization:** Use pagination (`limit`, `startAfter`). Never fetch entire collections.
3.  **Immutability:** Always use spread operators (`...`) for nested Firestore updates.
4.  **Dark Theme Persistence:** Override default Ant Design styles to match the APCS theme.


This project is a monorepo containing both the Frontend (`apcs_web`) and Backend (`apcs_service`). Always respect this exact directory structure, paying close attention to capitalization and nested `src` folders.

## 1. Frontend (`apcs_web/`)
A React application using Ant Design and Firebase Client SDK.

\`\`\`text
apcs_web/
├── public/
├── scripts/
├── src/
│   ├── apis/            # Axios API endpoints for communicating with the backend
│   ├── assets/          # Static images, icons, and flags
│   ├── components/      # Reusable UI components
│   ├── config/          # Frontend configurations
│   ├── constant/        # Hardcoded constants (e.g., categories, countries)
│   ├── context/         # React Context (e.g., DataContext.js for Auth state)
│   ├── hooks/           # Custom React hooks (e.g., useFetchRegistrantsData)
│   ├── middleware/      # Frontend route protection/logic
│   ├── Pages/           # Full page views (Note the capital 'P')
│   ├── services/        # Frontend business logic/services
│   ├── styles/          # Global styles
│   ├── utils/           # Helper functions (e.g., date parsing, youtube duration)
│   ├── App.js           # Main React Router setup
│   ├── firebase.js      # Firebase client initialization
│   ├── i18n.js          # Internationalization setup
│   ├── ProtectedRoute.js
│   └── PublicRoute.js
└── package.json
\`\`\`

**Frontend Rules:**
* Page components strictly go into `src/Pages/`.
* API calls to the backend must be placed in `src/apis/`.
* Utilize `src/i18n.js` for dual-language (EN/ID) text whenever adding new user-facing copy.

## 2. Backend (`apcs_service/`)
A Node.js Express server utilizing a layered architecture.

\`\`\`text
apcs_service/
├── logs/
├── migrations/
├── src/
│   ├── configs/         # Environment, DB, and 3rd party config (Firebase Admin, AWS, Nodemailer)
│   ├── controllers/     # Express route handlers (Extracts req/res, passes to Services)
│   ├── middlewares/     # Express middlewares (Auth verification, Error handling)
│   ├── models/          # Data models / interfaces
│   ├── repositories/    # Direct database interaction layer (Firestore calls)
│   ├── routes/          # Express router definitions mapping to controllers
│   ├── services/        # Core business logic (Billing, Emails, AWS uploads)
│   └── utils/           # Shared backend helpers (Logger, Custom Errors)
├── index.js             # Express server entry point
├── database.json
└── package.json
\`\`\`
---

---

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Firestore Collections](#2-firestore-collections)
- [3. Public Ticket Booking Flow](#3-public-ticket-booking-flow)
- [4. API Endpoints](#4-api-endpoints)
- [5. Race Condition & Seat Locking](#5-race-condition--seat-locking)
- [6. Email Notifications](#6-email-notifications)
- [7. Legacy Admin Flow](#7-legacy-admin-flow-reference)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  apcs_website (React)                                        │
│                                                              │
│  /tickets ──────────── PublicTicketBookingPage (5-step)       │
│  /select-seat ──────── SelectSeatPage (legacy token flow)    │
│  /register ─────────── Register (competition registration)   │
│  /admin ────────────── SeatEvent (admin seat management)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────┐
│                        Backend                               │
│  apcs_service (Express.js)                                   │
│                                                              │
│  PaymentRoute.js                                             │
│    ├── /public-ticket/event-data    (GET)                     │
│    ├── /public-ticket/booking       (POST)                    │
│    ├── /public-ticket/webhook       (POST, from Paper.id)     │
│    ├── /saveSeatBookProfileInfo     (POST, legacy)            │
│    ├── /verify-seat-token           (POST, legacy)            │
│    └── /confirm-seats               (POST, legacy)            │
│                                                              │
│  PaperRoute.js                                               │
│    ├── /createInvoice               (POST)                    │
│    ├── /webhooks/paper-id           (POST, competition reg)   │
│    └── /registrant-status/:id       (GET)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Firestore (Firebase)                      │
│                                                              │
│  events/APCS2026 ────────── Event config, pricing, sessions  │
│  sessionAssignments/* ───── Track performer assignments      │
│  seatsAPCS2026/* ────────── One doc per seat per session      │
│  publicBookings/* ───────── One doc per public booking (unified)│
│  seatBook2025/* ─────────── Legacy admin bookings             │
│  Registrants2025/* ──────── Competition registrations         │
│  JuryScores2025/* ───────── Jury assessment scores            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Firestore Collections

### 2.1 `events` collection

**Document ID:** Active event ID from `systemSettings/global.currentEventId` (for example, `APCS2026`).
**Purpose:** Event configuration, pricing tiers, add-ons, venue/session blueprints, `orchestraSessions`, `masterclassSessions`, and `sessionsSeatsGenerated`. Current ticket pricing uses `ticketTiers[].venuePrices[venueId]`; the flat `price` examples below are historical and insufficient for current public checkout.
**Used by:** `PublicTicketRepository.getPublicTicketEventData`, `PublicTicketRepository.createPublicTicketBooking` (server-side price validation).

```json
  "venues": [
    {
      "id": "Venue1",
      "label": "Jatayu Hall",
      "imageUrl": "...",
      "seatConfig": [...],
      "sessions": {
        "2026-11-01": ["10:00-12:25", "14:40-17:00"],
        "2026-11-02": ["10:05-12:15"]
      }
    }
  ],

  "ticketTiers": [
    { "id": "presto",  "name": "Presto",  "description": "Premium front section", "price": 150000 },
    { "id": "allegro", "name": "Allegro", "description": "Mid section",           "price": 100000 },
    { "id": "lento",   "name": "Lento",   "description": "Rear section",           "price": 75000  }
  ],

  "addOns": [
    { "id": "merchandise", "name": "Official Merchandise", "price": 50000 },
    { "id": "photo",       "name": "Professional Photo Package", "price": 75000 }
  ],

  "videoPenaltyConfig": {
    "revision": 1,
    "penaltyScore": 5,
    "rules": [
      {
        "competitionCategory": "Piano",
        "performanceCategory": "Solo",
        "instrumentCategory": null,
        "ageCategory": "Primary",
        "maximumMinutes": 3
      },
      {
        "competitionCategory": "VocalChoir",
        "performanceCategory": "Ensemble",
        "instrumentCategory": "Professionals_B",
        "ageCategory": "nineteen_plus",
        "maximumMinutes": 8
      }
    ]
  },

  "baseTicketPrice": 100000,
  "pricingTiers": { "...legacy structure for admin flow..." }
}
```

> **Video penalty configuration:** `videoPenaltyConfig` is event-scoped. Rules use the exact values saved by registration. Solo rules are identified by competition, `Solo`, and age; ensemble rules additionally require the saved `instrumentCategory`. The `revision` increments on every save and is copied to synchronized registrant results.
>
> A video is over-limit only when `Math.floor(videoDuration) > maximumMinutes * 60`. For any configured limit, fractional media padding through `.999` of the maximum second is allowed and the penalty begins at the next whole second.
>
> **Unified derived results:** `apcs_web/src/utils/scoringCalculator.js` is the calculation source for scoring displays. `apcs_web/src/utils/awardSynchronization.js` groups every jury score for the selected registrants, resolves event configurations, supplies the same live calculation to exports, and builds the batched award-sync updates. Neither path treats legacy `Registrants2025.isScoreFinalized` as a lock.
>
> **Note:** The `ticketTiers`, `addOns`, and `sessions` fields are new additions for the public booking flow. The existing `baseTicketPrice` and `pricingTiers` fields are preserved for the legacy admin flow and `BookingRepository.js`.

---

### 2.2 `sessionAssignments` collection

**Document ID format:** `{eventId}` (e.g., `APCS2026`)

**Purpose:** Tracks which performers/registrants are assigned to which performance timeslots.
**Used by:** `SessionAssignmentManager.js` (Admin Dashboard > Performer Sessions).

```json
{
  "eventId": "APCS2026",
  "updatedAt": "<serverTimestamp>",
  "assignments": {
    "Venue1_2026-11-01_10:00-12:25": [
      {
        "registrantId": "reg123",
        "competitionCategory": "Piano Solo",
        "email": "user@example.com"
      }
    ],
    "Venue2_2026-11-02_14:40-16:50": [
      {
        "registrantId": "reg456",
        "competitionCategory": "Violin Solo",
        "email": "user2@example.com"
      }
    ]
  }
}
```

---

### 2.3 `seatsAPCS2026` collection

**Current incompatible document ID formats:**
- Performer generator: `{venueId}-{areaType}-{row}{number}_{eventId}_{sessionId}`.
- Orchestra generator: `{venueId}-{areaType}-{row}-{number}_{eventId}_{sessionId}`.
- Older records may omit the venue prefix.

These formats can coexist for the same physical seat and create duplicate inventory. There is no enforced canonical format yet; see audit finding H before generation or migration.

**Purpose:** One document per physical seat per session. Tracks availability in real-time.
**Seeded by:** Admin dashboard `SeatEvent.js` → `uploadFullSeatLayout`.

#### Seat states

**Available** (default after seeding):
```json
{
  "eventId": "APCS2026",
  "venueId": "Venue1",
  "sessionId": "2026-11-01_10:00-12:25",
  "seatLabel": "A1",
  "areaType": "presto",
  "row": "A",
  "number": 1,
  "status": "available"
}
```

**Locked** (user clicked "Pay Now", waiting for payment — current timer targets 30 min; approved hold may extend beyond it):
```json
{
  "...same base fields...",
  "status": "locked",
  "lockedAt": "<serverTimestamp>",
  "lockedByBookingId": "abc123def456"
}
```

**Booked** (status written by the public payment handler; legacy `reserved` is also counted by occupancy):
```json
{
  "...same base fields...",
  "status": "booked",
  "bookingId": "abc123def456",
  "assignedTo": {
    "userName": "Budi Santoso",
    "userEmail": "budi@example.com",
    "registrantName": ""
  }
}
```

#### Current ticket-lock state transitions

```
available ──[Pay Now (Firestore txn)]──► locked ──[verified paid callback]──► booked
                                           │
                         [local deadline: request cancellation]
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
      [cancellation succeeds]                             [unknown / failed]
                     │                                           │
                     ▼                                           ▼
                 available                              locked for reconciliation
```

---

### 2.4 `publicBookings` collection

**Document ID:** Auto-generated by Firestore
**Purpose:** One document per public ticket booking. Created at checkout, updated on payment. Additional current fields include `buyerName`, `registrantId`, `registrantName`, `orchestraSessionId`, `orchestraSelectedSeatIds`, `performanceSeatLabels`, `orchestraSeatLabels`, `complimentaryTickets`, `freeMasterclassCount`, `masterclassAssignment`, `isOrchestra`, `isMasterclass`, and `invoiceId`. `masterclassAssignment` is a nested `{ sessionId, sessionLabel, quantity, freePassCount, paidAddOnPassCount, assignedAt }` written by the Admin Dashboard after payment. The Masterclass Assignments page reads paid bookings with a bounded `eventId` + `paymentStatus` query; its composite index is defined in `apcs_web/firestore.indexes.json`. Checkout bootstraps a missing `ticketCapacity` record from active booking quantities by `eventId` + venue/date/session; subsequent checkouts update that counter transactionally. Unselected seated quantities reserve capacity without receiving a physical seat. Legacy bookings included in this bootstrap do not receive per-booking reservation metadata, leaving their later release/migration incomplete. Complimentary orchestra quantity is similarly bounded by the configured reserved-row capacity for `eventId` + `orchestraSessionId`. The two required composite indexes are defined in `apcs_web/firestore.indexes.json` and must be deployed with the normal Firestore-index release process. `paymentUrl` is now persisted alongside the provider invoice ID for status-link recovery. Stored `createdAt` and `lockExpiresAt` are Firestore timestamps; ISO text below illustrates serialization.

**Checkout failure fields (7 September repair):** `paymentStatus: "failed"`, `failedAt` (server timestamp), and `checkoutFailure: { reason, cleanupStatus, quotaRefundStatus, reconciliationReasons, invoiceCancellationStatus }`. Before provider cancellation succeeds, failure cleanup uses `cleanupStatus: "awaiting_cancellation"` and `quotaRefundStatus: "held"`; after successful cancellation it records the completed release/refund state. Other quota status is `not_applicable` or `reconciliation_required`; cancellation status is `not_requested`, `unknown`, `pending`, `canceled`, `failed`, or `manually_verified_no_active_invoice`. The manual value is written only by the authenticated Seat Occupancy reconciliation endpoint after an admin explicitly confirms there is no paid or active Paper.id invoice. A returned `invoiceId` is preserved even when saving the successful invoice response fails. No new collection was introduced; the checkout capacity queries require the two documented indexes.

**Admin release fields (18 September):** a booking reconciled from Seat Occupancy receives `adminRelease: { reason, note, providerConfirmation, releasedByUid, releasedByEmail, releasedAt }`. Supported reasons are exactly `customer_declined` and `no_response_after_one_hour`. The no-response reason requires the booking to be at least one hour old. Known invoices must return a successful Paper.id cancellation before the transaction runs. A no-invoice booking must already be `failed` and requires `manualProviderConfirmation: true`; a `pending` no-invoice booking is rejected to avoid racing invoice creation. The transaction refuses paid/terminal bookings, rechecks the expected payment status and invoice identity, and preflights every expected seat, physical ownership, capacity reservation, winner claim, and complimentary quota before writing. A late invoice or any inventory inconsistency aborts all local inventory changes. A successful provider cancellation is stored before that transaction, so a repaired retry can skip a duplicate Paper.id cancellation.

**Failure data path:** `PublicTicketRepository` catches checkout/eligibility errors and awaits the Promise-returning `PublicTicketFailureRepository`. That helper uses the booking's saved event and recorded quantities, marks the booking failed, then attempts known-invoice cancellation outside Firestore. Only a truthy cancellation result enters the all-reads-before-writes release transaction, which checks current seat ownership and refunds recorded quota. The latest review reproduced duplicate capacity/quota refunds when two failed-booking cleanups overlap; exactly-once release is not yet guaranteed. Unknown or failed cancellation retains inventory for reconciliation. Missing quota configuration is flagged rather than inferred. Cleanup transaction failure is logged with the booking ID and does not replace the original callback error. There is no automated recovery worker in this batch. Both public payment webhook routes share the failed-booking guard; Public Customers independently rereads status before manual Mark Paid. Existing rules/whitelist permissions remain unchanged, so these are application guards, not newly enforced Firestore authorization.

**Lifecycle/fulfillment repair (7 September):** failure cleanup now retains inventory while provider cancellation is pending or unknown; only a truthy cancellation result releases booking-owned locks and refunds quota. Timer and sweeper use the same all-reads-before-writes release path, checkout cannot lazily take over locks, and public seat reads keep them unavailable. Payment fulfillment now uses the saved event and transactionally validates amount and lock ownership. Callback authenticity, a recovery worker, and Masterclass assignment email remain open; combined paid/free pass assignment is implemented.

**On creation (Pay Now clicked):**
```json
{
  "eventId": "APCS2026",
  "userName": "Budi Santoso",
  "userEmail": "budi@example.com",
  "userPhone": "+6281234567890",
  "venue": "Venue1",
  "date": "2026-11-01",
  "session": "10:00-12:25",
  "tickets": [
    { "id": "presto", "name": "Presto", "quantity": 2, "priceEach": 150000 }
  ],
  "selectedSeatIds": [
    "presto-A1_APCS2026_2026-11-01_10:00-12:25",
    "presto-A2_APCS2026_2026-11-01_10:00-12:25"
  ],
  "addOnIds": ["merchandise"],
  "totalAmount": 350000,
  "paymentStatus": "pending",
  "seatsSelected": true,
  "lockExpiresAt": "2026-11-01T10:30:00.000Z",
  "createdAt": "<serverTimestamp>"
}
```

**After payment confirmed (webhook update):**
```json
{
  "...all above fields...",
  "paymentStatus": "PAID",
  "paidAt": "<serverTimestamp>",
  "amountPaid": 350000,
  "paymentDetails": { "...full Paper.id webhook payload..." }
}
```

**Expiry after confirmed unpaid cancellation:**
```json
{
  "...all above fields...",
  "paymentStatus": "expired",
  "checkoutFailure": { "cleanupStatus": "complete", "quotaRefundStatus": "refunded", "invoiceCancellationStatus": "canceled" }
}
```

---

### 2.5 `Registrants2025` collection

**Document ID:** Auto-generated by Firestore
**Purpose:** One document per competition registration. Created during the registration flow (`Register.js`).
**Used by:** `JuryDashboard.js`, `AdminContent.js`, `SessionAssignmentManager.js`, `PaperController.handlePaperWebhook`

> **⚠️ Tech Debt Notice:** Despite the "2025" in the name, this collection is used for **all** years (e.g., APCS2025, APCS2026). The initial plan to separate years into different collections was abandoned. To differentiate registrants by year, you **must** filter queries using the `eventId` field (e.g., `where('eventId', '==', 'APCS2026')`).

#### Key fields

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | e.g., `"APCS2025"` |
| `name` | string | **Parent/guardian/teacher name** — this is NOT the performer name. |
| `teacherName` | string | Teacher name |
| `competitionCategory` | string | e.g., `"Piano Solo"`, `"Violin Solo"` |
| `instrumentCategory` | string | Instrument sub-category |
| `PerformanceCategory` | string | `"Solo"` or `"Ensemble"` |
| `vocalGenreCategory` | string | e.g. `"Classical"`, `"FreeGenre"` (Only applicable for `VocalChoir` competition category) |
| `ageCategory` | string | Category-specific key from `RegisterPageConst` (e.g., `"Primary"`, `"JuniorwoodWind"`) |
| `totalPerformer` | number | Count of performers in the `performers` array |
| `performers` | array | Array of performer objects — **this is where performer names and emails live** (see below) |
| `repertoire` | string | Name of the piece being performed |
| `youtubeLink` | string | YouTube link for the performance |
| `videoDuration` | number | **Duration of the performance video in seconds.** Calculated during upload via `getVideoDuration()`. Display as `mm:ss` (e.g., 192 → `"03:12"`). |
| `videoPenaltyConfigRevision` | number\|null | Event video-penalty revision used when `averageScore` and `finalAward` were last synchronized. |
| `videoPerformanceS3Link` | string | S3 key for the uploaded performance video |
| `pdfRepertoireS3Link` | string | S3 key for the uploaded sheet music PDF |
| `birthCertS3Link` | string | S3 key for birth certificate |
| `examCertificateS3Link` | string | S3 key for exam certificate / recommendation letter |
| `profilePhotoS3Link` | string | S3 key for profile photo |
| `paymentStatus` | string | `"PAID"`, `"UNPAID"`, etc. |
| `invoiceStatus` | string | `"CREATED"` (Paper.id invoice created) or `"FAILED"` (Paper.id API failed). Only present for newer registrations. |
| `amountToPay` | number | Amount in IDR |
| `duration` | string | Legacy field — formatted duration string (e.g., `"00:05:30"`). Prefer `videoDuration` for numeric calculations. |

> **⚠️ CRITICAL: `name` vs performer names**
> - `record.name` = **parent/guardian/teacher** name (top-level field)
> - `record.performers[].fullName` = **performer** name (inside the `performers` array)
>
> When displaying or referencing a registrant's performer name, **always** use `record.performers[].fullName` (with `firstName + lastName` fallback). Never use `record.name` for this purpose.

#### `performers[]` array structure

Each element in the `performers` array has the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `firstName` | string | Performer's first name |
| `lastName` | string | Performer's last name |
| `fullName` | string | **Primary display name** — use this for all UI display (e.g., `"Renaldo Louis"`) |
| `email` | string | Performer's email address (used for sending confirmation emails) |
| `dob` | string/timestamp | Date of birth |
| `gender` | string | Gender |
| `nationality` | string | e.g., `"Indonesia"` |
| `country` | string | Country of residence |
| `province` | string | Province |
| `city` | string | City |
| `zipCode` | string | Zip code |
| `addressLine` | string | Street address |
| `phoneNumber` | string | Phone number (does **not** include country code) |
| `countryCode` | string | Phone country code (e.g., `"+62"`) |

> **⚠️ CRITICAL: Parsing Performer Country & Phone**
> - Always use `p.country` if you need the performer's country name.
> - If `p.country` is missing, use `p.countryCode` (e.g., `"+65"`) to map to a country.
> - **NEVER** prepend `+` to `p.phoneNumber` to infer the country. Because `phoneNumber` is purely local (e.g., `90029350`), blindly prepending `+` (e.g., `+90...`) will cause false matches with other country codes (like `+90` for Turkey)!

**Common pattern for getting performer display name:**
```js
const performerNames = (record.performers || [])
    .map(p => p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim())
    .join(' & ');
```

> **⚠️ Important:** The `videoDuration` field stores **seconds as a number** (e.g., `312` for 5 minutes 12 seconds). Always convert to `mm:ss` for display. Do **not** confuse with the legacy `duration` string field.

> **Deprecated:** `Registrants2025.isScoreFinalized` is no longer a result lock and must not be used to skip award synchronization. Existing values are retained for historical safety. Jury editing is locked only by `JuryScores2025.isFinalized`.

---

### 2.6 Legacy collections (reference only)

| Collection | Used by | Purpose |
|---|---|---|
| `seatBook2025` | `TicketRepository.saveSeatBookProfileInfo`, `confirmSeatSelection` | Admin-created bookings (legacy flow) |

---

### 2.7 `JuryScores2025` collection

**Document ID format:** `{registrantId}_{juryUserId}` (composite key)
**Purpose:** Stores individual assessment scores, participant comments (performance feedback), and panel-specific comments.

> **⚠️ Tech Debt Notice:** Similar to `Registrants2025`, this collection is used for **all** years despite its name. To filter scores by year, you generally filter `Registrants2025` by `eventId` first, and then fetch the corresponding scores by matching `registrantId`.

```json
{
  "id": "AijmAQ8GAzBJ0ENHkKiD_mSbaqnjPVHS9XbaRP6TFcCjmcI73",
  "score": 85,
  "comment": "Nice dynamics, good posture.",
  "panelComment": "Consider for honorable mention.",
  "isFinalized": false,
  "juryUserId": "mSbaqnjPVHS9XbaRP6TFcCjmcI73",
  "juryName": "Jury Member A",
  "juryEmail": "juryA@example.com",
  "registrantId": "AijmAQ8GAzBJ0ENHkKiD",
  "registrantName": "Renaldo Louis",
  "competitionCategory": "Harp",
  "performanceCategory": "Solo",
  "ageCategory": "YoungGuitar",
  "timestamp": { "seconds": 1716307200, "nanoseconds": 0 },
  "adminAdjustedScore": null,
  "adminAdjustedAt": null,
  "adminAdjustedBy": null,
  "finalizedAt": null,
  "finalizedBy": null
}
```

#### Admin Scoring Fields

| Field | Type | Description |
|-------|------|-------------|
| `adminAdjustedScore` | number\|null | Admin-set override score. Jury member never sees this — they always see their original `score`. Average calculation uses this when present, otherwise falls back to `score`. |
| `adminAdjustedAt` | timestamp\|null | When admin last adjusted the score |
| `adminAdjustedBy` | string\|null | Email of admin who adjusted the score |
| `isFinalized` | boolean | When `true`, the jury member can no longer edit their score for this registrant. Set by admin via Scoring Recap page. |
| `finalizedAt` | timestamp\|null | When admin finalized the score |
| `finalizedBy` | string\|null | Email of admin who finalized |

> **⚠️ Finalization behavior:** When `isFinalized` is `true`, the jury's AssessmentForm disables all inputs and shows a "Finalized" banner. The jury can still view their score/feedback but cannot save changes. Admins can unfinalize to re-open editing.

---

### 2.8 `systemSettings/global` — Event, Ticket Eligibility, Jury Deadlines & Exchange Rate

Ticketing additionally reads `currentEventId` and `ticketEligibility: { enabled, schedule: [{ date, allowedTiers }] }`. Eligibility uses Asia/Jakarta calendar dates and is edited in Ticket Settings. The supported ticket schedule values are Sapphire, Diamond, Gold, Silver, and Public. Enabled schedules without a matching date yield no allowed tiers; backend enforcement for public checkout is currently missing. The registration-enabled setting does not disable ticket sales.

**Field:** `juryDeadlines` (added to existing `systemSettings/global` document)
**Purpose:** Per-competition-category deadlines for jury scoring. After the deadline passes, jury members for that category are blocked from logging in via email/password and can no longer submit scores.
**Managed by:** Admin Dashboard → Jury Management → Jury Deadlines (`JuryDeadlineSettings.js`)

```json
{
  "currentEventId": "APCS2026",
  "juryDeadlines": {
    "Piano": "2026-06-15T23:59:59.999Z",
    "Violin": "2026-06-20T23:59:59.999Z",
    "Harp": "2026-06-18T23:59:59.999Z"
  },
  "juryDeadlineReminderSent": {
    "Piano_1781567999999": true,
    "Violin_1781999999999": true
  },
  "usdToIdrRate": 17800
}
```

**Field:** `usdToIdrRate` (number)
**Purpose:** The exchange rate used for converting USD registration fees to IDR on Paper.id invoices. Defaults to `17800` if not set.
**Managed by:** Admin Dashboard → Ticketing System → System Settings (`SystemSettings.js`)
**Used by:** `PaperRepository.createInvoice` → `invoiceUtils.buildInvoiceItem` / `invoiceUtils.buildInvoiceNotes`
**Validation:** Must be between 10,000 and 25,000 (enforced in Admin UI).

> **Note:** Admins select a **date only** (no time picker). The system automatically sets the deadline to **23:59:59.999** of the selected date, so jury members can score all day until the end of that day.

**Behavior:**
- **24 hours before deadline (H-1):** 
  - A backend cron job (`JuryDeadlineReminder.js`) queries jury members with pending assessments and sends urgent email reminders. It sends reminders in three stages: 1 week before, 3 days before, and 24 hours before the deadline. To ensure idempotency, it writes a flag to `juryDeadlineReminderSent` keyed by `Category_DeadlineTimestamp_ReminderWindow` (e.g. `_1w`, `_3d`, `_24h`).
  - Reminder completion checks use the jury user document ID as the canonical UID, with the stored `users.uid` field accepted as a legacy fallback. This prevents stale or migrated `uid` fields from making fully scored juries look pending.
  - A warning modal is shown to jury on login. Deadline text in dashboard nav turns red with pulsing animation.
- **After deadline:** Jury email login is blocked in `DataContext.signInWithEmail()` — user is signed out and shown "The scoring period for [category] has ended". Google login and admin login remain unaffected.
- **No deadline set:** No restrictions applied; jury can score at any time.

**Updated by:** `POST /api/v1/apcs/systemSettings/global` with `{ juryDeadlines: { ... } }` in body.
**Admin UI:** `AdminDashboard.js` → menu key `'20'` → `JuryDeadlineSettings.js` (Add/Edit/Delete per-category deadlines with date picker + Save All).

---

## 3. Public Ticket Booking Flow

Confirmed requirements from the audit follow-up: admins assign tickets without seat selection from Seat Occupancy only after confirmed payment; standalone paid Masterclass tickets remain attached to the customer-selected session; admins assign all complimentary Masterclass passes from one booking to the same specific session after booking through the Masterclass Assignments page; Masterclass sessions have no attendee limit for now; the extra winner orchestra ticket is allowed once per winning performance per orchestra session, with an ensemble counted as one performance regardless of member count; reserved orchestra rows are exclusively for winners’ complimentary tickets, and all complimentary seats must remain within these rows for both customer selection and admin assignment. See [the flow document](SEAT_BOOKING_FLOW.md) for confirmed decisions and remaining implementation work. An unpaid booking that expires must restore eligibility to claim the extra winner ticket on retry, subject to remaining quota and reserved-row capacity. No new collection is introduced for Masterclass assignments; the nested booking field is used.

The detailed, code-verified flow is maintained in [SEAT_BOOKING_FLOW.md](SEAT_BOOKING_FLOW.md). The connections below replace the former seat-click-only description.

- Public buyers select a competition/orchestra/masterclass session, then explicit ticket quantities. A public Orchestra purchase uses the selected venue/date/time as its paid session; only a winner sends `orchestraSessionId` for a complimentary claim.
- Winners select a registrant whose competition slot is already assigned in `sessionAssignments/{eventId}` and separately select an orchestra session for complimentary tickets.
- `seat_selection_performer` is repeated in `addOnIds` once per manually chosen paid seat. `seat_selection` is a flat add-on for selecting complimentary orchestra seats.
- Presto quantities produce `freeMasterclassCount`; the existing admin page assigns those complimentary passes after payment. **Assignment implemented; email pending:** Masterclass Assignments now includes paid `allegro_masterclass` add-on passes, complimentary passes, and add-on-only bookings. Staff assign all benefit passes from one paid booking to one Masterclass session; the saved assignment includes paid/free component counts. Standalone Masterclass tickets retain the customer-selected session. Assignment-email dispatch is still missing. Masterclass sessions have no attendee limit for now.
- Details/review submit to checkout, which recalculates totals from venue-specific event prices, locks explicitly supplied seats, blocks paid access to winner-reserved Orchestra rows, increments applicable winner orchestra quota, and creates `publicBookings` in a transaction. Changing buyer type, winner, or session clears purchase selections and quantities.
- Paper.id invoicing follows the transaction. `invoiceId` is persisted; payment URL/ISO expiry are returned. The controller awaits a non-fatal holding email before sending its response.
- The waiting page polls booking status when router state identifies a public booking. Independently opening the URL loses that classification/payment-link state.

There is currently no automatic physical-seat allocator for unselected ticket quantities. Checkout nevertheless protects configured tier capacity by summing active booking quantities before accepting a new booking. The manual Public Customers workflow covers missing paid seats only. See the audit for frontend state retention and duplicated session listing defects.

## 4. API Endpoints

| Method | Path (under `/api/v1/apcs`) | Current purpose / trust boundary |
| --- | --- | --- |
| GET | `/public-ticket/event-data` | Active event config; public |
| GET | `/public-ticket/seats?venueId=...&sessionId=...` | Venue/session seats; removes owner fields and keeps provider-unresolved locks unavailable |
| GET | `/public-ticket/eligible-winners` | Assigned eligible winners, including display names/emails; public |
| POST | `/public-ticket/booking` | Create pending booking/invoice; server pricing but incomplete entitlement/inventory validation |
| GET | `/public-ticket/booking-status/:bookingId` | Payment status, attempted payment URL, ISO expiry |
| POST | `/public-ticket/webhook` | Dedicated paid callback; no authenticity middleware wired in local code |
| POST | `/public-ticket/resend-email` | Resend a paid public booking email; no admin middleware wired |
| POST | `/public-ticket/admin/release-booking` | Firebase-token and whitelist-protected booking cancellation; cancels a known Paper.id invoice or accepts manual no-invoice confirmation for a failed booking, then atomically releases the complete validated inventory set |
| GET/POST | `/systemSettings/global` | Read/update global configuration; write route lacks admin middleware |
| GET | `/getSessionAssignments/:eventId` | Read saved assignment map |
| POST | `/saveSessionAssignments` | Replace event assignment map; write route lacks admin middleware |
| POST | `/payment/webhooks/paper-id` | Unified callback: look up public booking, otherwise process competition registration; no authenticity middleware wired |

Checkout requires `buyerName`, `userEmail`, `userPhone`, `venue`, `date`, `session`, and `tickets`. Current frontend payload also includes the winner and orchestra fields, explicit paid/free seat IDs and labels, add-on IDs, and product flags. Client totals/benefit values are not authoritative; nevertheless the backend still stores some client product metadata and does not validate all relationships.

Example (one selected paid ticket; matching prices/add-on must exist):

```json
{
  "buyerName": "Audit Buyer",
  "userEmail": "buyer@example.com",
  "userPhone": "+6281234567890",
  "venue": "Venue1",
  "date": "2026-11-01",
  "session": "10:00-12:25",
  "tickets": [{ "id": "presto", "name": "Presto", "quantity": 1 }],
  "selectedSeatIds": ["Venue1-Presto-A1_APCS2026_2026-11-01_10:00-12:25"],
  "performanceSeatLabels": ["A1"],
  "orchestraSelectedSeatIds": [],
  "addOnIds": ["seat_selection_performer"]
}
```

Checkout returns `{ bookingId, paymentUrl, lockExpiresAt }`, where the expiry is ISO text. Legacy `/saveSeatBookProfileInfo`, `/verify-seat-token`, and `/confirm-seats` remain separate from public checkout.

## 5. Race Conditions and Seat Locking

Browsing does not lock inventory; Pay Now locks only explicit selected seat IDs. A local deadline requests provider cancellation but never independently releases or takes over inventory. The timer, sweeper, checkout-failure helper, seat reads, and public fulfillment now follow this provider-confirmed hold policy:

- Checkout failure cleanup is tied to the saved booking and retains inventory until provider cancellation succeeds; rejected booking transactions leave other inventory untouched.
- Unselected seated quantities reserve configured tier capacity; selected IDs are checked for unique physical seats, matching venue/session/tier, complimentary entitlement, and winner-reserved Orchestra rows.
- Fulfillment transactionally rechecks seat ownership, amount, and state against the stored booking event; callback authenticity remains unresolved.
- The per-booking timer and five-minute `PublicTicketSweeper` request cancellation, then use a shared all-reads-before-writes release path only after success.
- Lazy takeover is removed. A local timeout does not make a lock available.
- Invoice-creation failure records terminal `failed`. Known invoices remain locked until cancellation succeeds; unknown outcomes are recorded for reconciliation. No recovery worker exists.
- A whitelisted admin can reconcile a linked lock from Seat Occupancy. The action never mutates only the clicked seat: it validates the owning booking, all selected seats, canonical ownership, tier-capacity reservation, winner claim, and complimentary quota before any local write, then processes them together. Pending no-invoice bookings are blocked. Public Customers reads the same updated booking and displays the audit details.

A next-day Paper.id due date is configured separately from the 30-minute local hold. An expiry display cannot establish gateway cancellation. These defects are reproduced or traced in [the audit](TICKETING_AUDIT_2026-09-06.md); the original documentation's blanket race-safety and lazy-cleanup guarantees are withdrawn.

## 6. Email Notifications

Public buyers enter their email. Winner selection defaults the editable buyer email to the registrant’s stored email; confirmation uses the saved booking `userEmail`. Keep public winner name selection without email verification. Confirmation email is communication, not identity proof. Backend winner eligibility and new personal-claim records exist, but repeat selected-seat purchases and historical claim migration remain incomplete. Later Masterclass assignment emails for combined paid/free benefit passes are approved but not implemented.

- Holding email: name, main venue/date/time, invoice URL, and deadline. Controller awaits sending; failure is caught and does not invalidate the booking.
- Confirmation: booking ID, main venue/date/time, ticket summary, selected competition/orchestra labels, and total. Both webhook routes can trigger it.
- Missing from current confirmation: a separate orchestra schedule, unassigned complimentary count, and full add-on/masterclass benefits. Public-booking QR verification is not required; booking-ID/manual entry verification is sufficient.
- Duplicate paid callbacks can return booking data without its document ID while controllers send another confirmation. The unified route tracks `emailSent`; the dedicated route does not consistently do so.

The template instructs customers to present their email or booking ID for manual verification. Legacy registrant JWT check-in is not public-booking check-in.

---

## 7. Legacy Admin Flow (Reference)

The legacy admin/token flow remains separate from public booking payment records, but can share physical seat collections. It was not fully regression-tested in the September ticketing audit:

```
Admin (SeatEvent.js) → picks registrant → fills venue/session/tickets
  → POST /saveSeatBookProfileInfo → creates seatBook2025 doc + JWT token
  → Admin manually sends email with /select-seat?token=... link
  → User opens link → POST /verify-seat-token → sees seat map
  → User picks seats → POST /confirm-seats → seats reserved + confirmation email
```

This flow uses:
- `seatBook2025` collection (not `publicBookings2026`)
- `TicketRepository.js` (not `PublicTicketRepository.js`)
- Manual admin verification of payment (not Paper.id webhook)

---

## 8. Infrastructure & Scaling

### "Ticket War" Cloudflare Defense Strategy
To survive high-concurrency events (e.g., hundreds of users logging on simultaneously at exactly 12:00 PM for ticket sales) while hosted on a constrained shared hosting environment (e.g., CloudLinux 30 Entry Processes limit), the following infrastructure strategy is explicitly enforced:

1. **Frontend Caching (Bypass Origin)**: 
   - **Cloudflare** is positioned in front of the domain.
   - All static assets from the React frontend (`.js`, `.css`, media, `index.html`) are aggressively cached by Cloudflare. 
   - These requests return a `Cf-Cache-Status: HIT` header and **never** touch the origin Node.js/LiteSpeed server, thereby preserving the 30 Entry Process limit exclusively for backend data operations.
   
2. **Backend API Bypass (Dynamic Execution)**:
   - A Cloudflare Page Rule (or Cache Rule) MUST be configured to `Bypass` cache for all backend API routes (e.g., `*apcsmusic.com/api/*`).
   - This ensures all backend calls reach the Node.js Express server natively (`Cf-Cache-Status: DYNAMIC`).
   - **WARNING:** If this rule is missing or misconfigured, Cloudflare may cache API responses, leading to catastrophic data leaks (e.g., User B seeing User A's checkout session).

3. **Database Offloading**:
   - The heavy lifting of concurrency and database scaling is strictly offloaded to **Firebase Firestore**. The Node.js server acts merely as a lightweight orchestrator for payload validations, atomic transactions, and Paper.id webhook integrations.

### 8 September 2026 ticket-inventory records

New public checkouts use four Firestore collections in addition to `publicBookings` and `seats{eventId}`:

- `ticketSeatOwnership/{encoded physical key}`: one active owner for `(eventId, venueId, sessionId, row, number)`, independent of any legacy display label or seat document ID.
- `ticketCapacity/{event-venue-date-session-paid}`: transactional `capacityByTier` and `reservedByTier` for the paid pool. Orchestra reserved rows are excluded before this record is created.
- `winnerOrchestraClaims/{event-registrant-orchestra session}`: active personal winner claim tied to the booking that created it. Unpaid confirmed cancellation deactivates only that claim.
- `ticketCheckoutKeys/{encoded event-and-key}`: maps an event-scoped checkout attempt key to a booking. The current implementation lacks a normalized request fingerprint and safe terminal/in-progress replay semantics.

Bookings persist `physicalSeatKeys`, `capacityReservation`, `personalWinnerBonus`, `winnerClaimId`, `idempotencyKey`, and `paymentUrl`. The first checkout for a legacy session migrates its existing active booking count into the capacity record inside the checkout transaction; later checkouts read the bounded record rather than scanning all session bookings.


### Implementation re-review — 8 September 2026

See [the current handover](TICKETING_IMPLEMENTATION_REVIEW_HANDOVER_2026-09-08.md) for source references, nine failing follow-up checks, and remaining work. These four records describe the new public checkout path, not a completed migration or a universally enforced inventory boundary. Public Customers and legacy writers can bypass physical ownership; existing occupied aliases are not all represented. Duplicate failed-booking cleanup can subtract another booking's capacity and quota. Current cached configuration writes can invalidate reservations and reset seat documents.

Invoice Paid is the normal fulfillment signal; Payment In processing is outside the required APCS fulfillment scope. Provider callback registration is a separate configuration concern. Both paid callback routes still require authentication, stored invoice matching, reliable notification/reconciliation handling, and deduplicated delivery. Only verified provider cancellation permits unpaid inventory release; a truthy API return alone has not been validated against the live provider contract.

No collections or application data flow were changed by this review. Documentation now includes the existing fourth collection (`ticketCheckoutKeys`) and corrects earlier broad ownership, exactly-once refund, Masterclass assignment, and payment-URL statements. Measured offline result: 49 baseline passes plus 9 failing follow-up safety checks.

### Follow-up implementation — 8 September 2026

The implementation repair changes the existing ticketing records, not the collection set. `ticketCheckoutKeys` now additionally stores `requestFingerprint`, a normalized event-scoped cart identity. A key can replay only its matching pending checkout; terminal attempts and changed carts do not return a payment URL as a successful new checkout.

`ticketSeatOwnership` is now maintained by the public checkout, Public Customers manual assignment/Mark Paid, and legacy `TicketRepository.confirmSeatSelection` paths. Writers query matching seat documents for the canonical physical identity before updating raw seat status, then write the ownership record in the same transaction. `winnerOrchestraClaims` is also exposed as claimed session IDs on eligible-winner responses for UI allowance preview; it remains enforced only by the checkout transaction. Invoice Paid fulfillment requires the stored provider `invoiceId` and amount.

The offline audit now has 58 passing checks (including the nine review regressions). This does not establish deployed Firestore rules/transactions, provider authentication, or external payment/cancellation behavior.
