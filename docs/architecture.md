# APCS Project — Architecture & Data Structure

This document describes the Firestore data model, API contracts, and system flows for the APCS project. It serves as the single source of truth for developers working on the codebase.

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
│  seatsAPCS2026/* ────────── One doc per seat per session      │
│  publicBookings2026/* ───── One doc per public booking        │
│  seatBook2025/* ─────────── Legacy admin bookings             │
│  Registrants2025/* ──────── Competition registrations         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Firestore Collections

### 2.1 `events` collection

**Document ID:** `APCS2026`
**Purpose:** Single source of truth for event configuration, pricing tiers, add-ons, and session schedules.
**Used by:** `PublicTicketRepository.getPublicTicketEventData`, `PublicTicketRepository.createPublicTicketBooking` (server-side price validation).

```json
{
  "title": "APCS Gala Concert 2026",

  "sessions": {
    "Venue1": {
      "2026-11-01": ["10:00-12:25", "14:40-17:00", "18:50-20:40"],
      "2026-11-02": ["10:05-12:15", "14:10-16:30", "18:40-20:50"]
    },
    "Venue2": {
      "2026-11-01": ["10:20-12:20", "14:10-16:00", "18:05-20:15"],
      "2026-11-02": ["10:25-12:45", "14:40-16:50", "18:35-20:35"]
    }
  },

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

### 2.2 `seatsAPCS2026` collection

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

### 2.3 `publicBookings2026` collection

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

### 2.4 Legacy collections (reference only)

| Collection | Used by | Purpose |
|---|---|---|
| `seatBook2025` | `TicketRepository.saveSeatBookProfileInfo`, `confirmSeatSelection` | Admin-created bookings (legacy flow) |
| `Registrants2025` | `PaperController.handlePaperWebhook`, `Register.js` | Competition registrations |

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
   d. Create publicBookings2026 doc
5. Call PaperRepository.createInvoice → get paymentUrl
6. Return { bookingId, paymentUrl, lockExpiresAt }
7. Send seat-hold email to user (non-blocking)
```

### Webhook sequence (Paper.id payment confirmed)

```
1. Paper.id calls POST /public-ticket/webhook
2. Extract bookingId from invoice.number
3. Fetch publicBookings2026/{bookingId}
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
