# APCS Project — Architecture & Data Structure

This document describes the Firestore data model, API contracts, and system flows for the APCS project. It serves as the single source of truth for developers working on the codebase.

---

## Tech Stack & UI/UX Guidelines

*   **Frontend:** React.js + Ant Design (antd).
*   **Backend:** Node.js + Express.js.
*   **Database:** Firebase Firestore (NoSQL) & Firebase Auth.
*   **Storage:** AWS S3 (Presigned URLs for direct uploads/downloads).
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

**Document ID:** `APCS2026`
**Purpose:** Single source of truth for event configuration, pricing tiers, add-ons, and session schedules.
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

  "baseTicketPrice": 100000,
  "pricingTiers": { "...legacy structure for admin flow..." }
}
```

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
        "id": "reg123",
        "competitionCategory": "Piano Solo",
        "email": "user@example.com"
      }
    ],
    "Venue2_2026-11-02_14:40-16:50": [
      {
        "id": "reg456",
        "competitionCategory": "Violin Solo",
        "email": "user2@example.com"
      }
    ]
  }
}
```

---

### 2.3 `seatsAPCS2026` collection

**Document ID format:** `{areaType}-{seatLabel}_{eventId}_{sessionId}`
Example: `presto-A1_APCS2026_2026-11-01_10:00-12:25`

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

**Locked** (user clicked "Pay Now", waiting for payment — max 30 min):
```json
{
  "...same base fields...",
  "status": "locked",
  "lockedAt": "<serverTimestamp>",
  "lockedByBookingId": "abc123def456"
}
```

**Reserved** (payment confirmed via Paper.id webhook — permanent):
```json
{
  "...same base fields...",
  "status": "reserved",
  "bookingId": "abc123def456",
  "assignedTo": {
    "name": "Budi Santoso",
    "email": "budi@example.com"
  }
}
```

#### State transitions

```
available ──[Pay Now (Firestore txn)]──► locked ──[Webhook: paid]──► reserved
                                           │
                                    [30 min, no payment]
                                           │
                                           ▼
                                       available (cleanup job)
```

---

### 2.4 `publicBookings` collection

**Document ID:** Auto-generated by Firestore
**Purpose:** One document per public ticket booking. Created at checkout, updated on payment.

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

**After lock expires (cleanup):**
```json
{
  "...all above fields...",
  "paymentStatus": "expired"
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
| `PerformanceCategory` | string | `"Individual"` or `"Ensemble"` |
| `ageCategory` | string | Key from `RegisterPageConst.ageCategories` (e.g., `"primary"`, `"junior"`) |
| `totalPerformer` | number | Count of performers in the `performers` array |
| `performers` | array | Array of performer objects — **this is where performer names and emails live** (see below) |
| `repertoire` | string | Name of the piece being performed |
| `youtubeLink` | string | YouTube link for the performance |
| `videoDuration` | number | **Duration of the performance video in seconds.** Calculated during upload via `getVideoDuration()`. Display as `mm:ss` (e.g., 192 → `"03:12"`). |
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
```

---

### 2.8 `systemSettings/global` — Jury Deadlines & Exchange Rate

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
- **24 hours before deadline (H-1):** Warning modal shown to jury on login. Deadline text in dashboard nav turns red with pulsing animation.
- **After deadline:** Jury email login is blocked in `DataContext.signInWithEmail()` — user is signed out and shown "The scoring period for [category] has ended". Google login and admin login remain unaffected.
- **No deadline set:** No restrictions applied; jury can score at any time.

**Updated by:** `POST /api/v1/apcs/systemSettings/global` with `{ juryDeadlines: { ... } }` in body.
**Admin UI:** `AdminDashboard.js` → menu key `'20'` → `JuryDeadlineSettings.js` (Add/Edit/Delete per-category deadlines with date picker + Save All).

---

## 3. Public Ticket Booking Flow

### Step-by-step (frontend)

```
Step 1 — Venue & Session
   User picks Venue1/Venue2, a date, and a time slot.

Step 2 — Select Seats & Add-ons (Fused Flow)
   Live seat map (CustomSeatPicker). Users implicitly build their cart
   by clicking seats. Ticket tiers and total prices are calculated 
   automatically. Add-ons are selected here as well.

Step 3 — Your Details
   Name, email, phone. These are used for the booking record and emails.

Step 4 — Review & Pay
   Order summary. "Pay Now" triggers the backend call.
```

### Backend sequence (on "Pay Now")

```
1. POST /public-ticket/booking
2. Backend fetches events/APCS2026 → gets authoritative prices
3. Backend recalculates totalAmount server-side (never trusts client)
4. Firestore Transaction:
   a. For each selectedSeatId → read seat doc
   b. If any seat status !== 'available' → THROW (race condition caught)
   c. Lock all seats → status: 'locked', lockedAt, lockedByBookingId
   d. Create publicBookings doc
5. Call PaperRepository.createInvoice → get paymentUrl
6. Return { bookingId, paymentUrl, lockExpiresAt }
7. Send seat-hold email to user (non-blocking)
```

### Webhook sequence (Paper.id payment confirmed)

```
1. Paper.id calls POST /public-ticket/webhook
2. Extract bookingId from invoice.number
3. Fetch publicBookings/{bookingId}
4. Guard: if already PAID, skip (idempotency)
5. Firestore Batch:
   a. For each selectedSeatId → update: locked → reserved, assignedTo
   b. Update booking: paymentStatus → PAID, paidAt, amountPaid
6. Send confirmation email to user
7. Respond 200 to Paper.id
```

---

## 4. API Endpoints

### Public Ticket Booking

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/apcs/public-ticket/event-data` | None | Returns event config (tiers, add-ons, sessions) |
| `POST` | `/api/v1/apcs/public-ticket/booking` | None | Creates booking, locks seats, returns paymentUrl |
| `POST` | `/api/v1/apcs/public-ticket/webhook` | Paper.id | Webhook callback on payment |

#### `POST /public-ticket/booking`

**Request:**
```json
{
  "userName": "Budi Santoso",
  "userEmail": "budi@example.com",
  "userPhone": "+6281234567890",
  "venue": "Venue1",
  "date": "2026-11-01",
  "session": "10:00-12:25",
  "tickets": [{ "id": "presto", "name": "Presto", "quantity": 2 }],
  "selectedSeatIds": ["presto-A1_APCS2026_2026-11-01_10:00-12:25"],
  "addOnIds": ["merchandise"]
}
```

**Response (201):**
```json
{
  "bookingId": "auto-generated-firestore-id",
  "paymentUrl": "https://pay.paper.id/...",
  "lockExpiresAt": "2026-11-01T10:30:00.000Z"
}
```

**Error (race condition):**
```json
{
  "message": "Seat A2 is no longer available. Please go back and re-select."
}
```

### Legacy Endpoints (unchanged)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/apcs/saveSeatBookProfileInfo` | Admin creates booking + generates JWT token |
| `POST` | `/api/v1/apcs/verify-seat-token` | Validates token on /select-seat page load |
| `POST` | `/api/v1/apcs/confirm-seats` | Confirms seat selection (legacy flow) |
| `POST` | `/api/v1/apcs/payment/createInvoice` | Creates Paper.id invoice (competition reg) |
| `POST` | `/api/v1/apcs/payment/webhooks/paper-id` | Webhook for competition registration payments |

---

## 5. Race Condition & Seat Locking

### Principle
Browsing the seat map does **not** lock any seats. Locking only happens inside a **Firestore transaction** the instant "Pay Now" is clicked.

### What happens when two users compete

| Scenario | Result |
|---|---|
| User A clicks Pay Now first (same seat) | A's transaction succeeds, seat locked |
| User B clicks Pay Now 1ms later | B's transaction reads seat as `locked` → throws → B sees error |
| User A never pays (abandons) | After 30 min, cleanup releases the seat back to `available` |

### Lock TTL: 30 minutes

The deadline is communicated in:
1. Paper.id invoice `notes` field
2. Seat-hold email sent immediately after Pay Now

### Cleanup: Lazy Expiry (no cron/Cloud Function needed)

Instead of a separate scheduled job, expired locks are cleaned up **lazily inside the booking transaction itself**. When a new user tries to book a seat that is `locked` but `lockedAt` is older than 30 minutes:

1. The transaction treats the seat as **available** (allows re-locking for the new user)
2. The old abandoned booking is automatically marked `paymentStatus: 'expired'`

This happens atomically inside `PublicTicketRepository.createPublicTicketBooking`:

```js
// Inside the Firestore transaction:
const isAvailable = seatData.status === 'available';
const isExpiredLock = seatData.status === 'locked'
    && seatData.lockedAt
    && (Date.now() - seatData.lockedAt.toDate().getTime()) > LOCK_DURATION_MS;

if (!isAvailable && !isExpiredLock) {
    throw new Error(`Seat ${seatData.seatLabel} is no longer available.`);
}

// If reclaiming an expired lock, also expire the old booking
if (isExpiredLock && seatData.lockedByBookingId) {
    transaction.update(oldBookingRef, { paymentStatus: 'expired' });
}
```

**Trade-off:** Stale lock data remains in Firestore until another user books the same seat. This is acceptable because:
- Seats are only locked for popular events where re-booking is likely
- The UI already shows locked seats as "taken" (no visual difference)
- No infrastructure overhead (no Cloud Functions billing)

---

## 6. Email Notifications

### Seat Hold Email (sent after "Pay Now")

| Field | Value |
|---|---|
| **Trigger** | `PublicTicketController.createPublicTicketBooking` (non-blocking) |
| **Subject** | "Your APCS 2026 Seat is Held – Complete Payment Within 30 Minutes" |
| **Contains** | Venue, date, session, payment link (CTA button), 30-min deadline |
| **Style** | APCS dark theme (`#0a0a0a` bg, `#111` card, `#EBBC64` gold) |

### Payment Confirmation Email (sent after webhook)

| Field | Value |
|---|---|
| **Trigger** | `PublicTicketController.handlePublicTicketWebhook` (after batch write) |
| **Subject** | "Payment Confirmed — Your APCS 2026 Gala Concert Tickets" |
| **Contains** | Booking ID, venue, date, session, seat labels, total paid, green success badge |
| **Style** | Same APCS dark theme |

---

## 7. Legacy Admin Flow (Reference)

The admin flow is preserved and works independently:

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
