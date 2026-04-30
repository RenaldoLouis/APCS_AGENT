# APCS Project — Progress Tracker

This document tracks features and changes made to the APCS project over time.

---

## 🎭 Premium Theater Seat Selection UI/UX Overhaul

**Date:** 2026-04-28
**Status:** ✅ Completed

### What Was Built
A complete visual and structural overhaul of the seat selection component (`CustomSeatPicker`) to provide a premium, immersive theater experience inspired by high-end ticketing platforms like demo.seats.io.

### Files Created / Modified
| File | Action | Purpose |
|---|---|---|
| `Pages/SelectSeat/CustomSeatPicker.js` | MODIFIED | Removed Ant Design dependencies in favor of pure HTML/MUI Tooltips. Implemented dynamic styling logic for selected and reserved seats. |
| `Pages/SelectSeat/CustomSeatPicker.css` | NEW | Standalone stylesheet containing the premium theater layout, CSS animations, and high-contrast state styling. |
| `Pages/TicketBooking/PublicTicketBookingPage.css` | MODIFIED | Cleaned up duplicated seat styles and enhanced the scrollable container layout. |

### Key Improvements
1. **Inverted Selection Contrast**: Selected seats now invert to a dark background (`#111`) with a brightly glowing border and text in their specific tier color (Gold, Silver, Bronze), ensuring extreme visibility.
2. **Reserved Seat Texturing**: Taken seats now display a universal diagonal striped gradient pattern with dimmed text, making them distinctly unavailable at a glance.
3. **Theater Metaphor**: Added a glowing "STAGE" anchor element, custom spacing, rounded square seat shapes, and a cascading pop-in animation on load.
4. **Universal Component**: By isolating the CSS to `CustomSeatPicker.css`, the new premium layout is automatically applied across the public booking flow, the select-seat token flow, and the admin dashboard.

---

## 🎫 Public Ticket Booking (Paper.id Integrated)

**Date:** 2026-04-27
**Status:** ✅ Implementation complete — pending manual setup & testing
**Route:** `/tickets`
**Event ID:** `APCS2026`

### What Was Built

A self-service, public-facing ticket booking flow for the APCS 2026 Gala Concert that replaces the manual admin process. Users complete the entire journey — venue selection → ticket tiers → seat picking → payment — without any admin intervention.

### Files Created / Modified

#### Backend (`apcs_service/src/`)

| File | Action | Purpose |
|---|---|---|
| `repositories/PublicTicketRepository.js` | NEW | Atomic seat locking via Firestore transaction, server-side price recalculation, Paper.id invoice creation, webhook payment handler |
| `services/PublicTicketService.js` | NEW | Thin service wrapper (same pattern as all other services) |
| `controllers/PublicTicketController.js` | NEW | 3 API endpoints + 2 transactional emails (seat-hold & payment confirmation) |
| `routes/PaymentRoute.js` | MODIFIED | +3 new routes (`GET /public-ticket/event-data`, `POST /public-ticket/booking`, `POST /public-ticket/webhook`) + 1 new import |

#### Frontend (`apcs_website/src/`)

| File | Action | Purpose |
|---|---|---|
| `Pages/TicketBooking/PublicTicketBookingPage.js` | NEW | 4-step booking page (Venue → Seats & Add-ons → Details → Pay). Features a modern, theater-style unified seat picker. |
| `Pages/TicketBooking/PublicTicketBookingPage.css` | NEW | APCS dark theme styles (`#0a0a0a` bg, `#EBBC64` gold accents) |
| `hooks/useTicketEventData.js` | NEW | Hook to fetch pricing/session data from backend |
| `apis/index.js` | MODIFIED | +`publicTicket.getEventData`, `publicTicket.createBooking` |
| `App.js` | MODIFIED | +`/tickets` public route |

### Key Design Decisions

1. **Fused, Theater-Style Selection** — Ticket tiers and quantities are implicitly derived from seat selections on the map. This consolidates steps and removes the friction of users having to pre-select ticket quantities before seeing seat availability.

2. **Seat selection before payment** — Users pick seats during checkout (Step 1), not after payment. This prevents the scenario where a user pays for "Presto" tier but their desired seat is taken by someone else before they can select it.

2. **Atomic Firestore transaction for locking** — Seats are only locked at the moment of "Pay Now", not during browsing. A Firestore transaction ensures that if two users race for the same seat, only one succeeds. The loser gets a clear error to re-select.

3. **30-minute lock TTL** — Locked seats expire after 30 minutes if payment is not completed. The deadline is communicated in both the Paper.id invoice notes and the seat-hold email.

4. **Separate webhook** — The new public booking webhook (`/public-ticket/webhook`) is separate from the existing competition registration webhook (`/payment/webhooks/paper-id`) to avoid coupling the two flows.

5. **Old flow preserved** — The existing admin flow (`SeatEvent.js`, `/select-seat` token flow) is completely untouched. Both systems coexist.

### Before Going Live

- [x] Seed `events/APCS2026` document in Firebase Console with real pricing
- [x] Seed `seatsAPCS2026` collection using admin `uploadFullSeatLayout`
- [ ] Configure Paper.id webhook URL → `/api/v1/apcs/public-ticket/webhook`
- [x] ~~Set up lock cleanup job~~ — **Not needed.** Lazy expiry check built into the Firestore transaction itself: if a seat is `locked` but `lockedAt > 30 min ago`, the transaction treats it as available and reclaims it for the new user. The old booking is also automatically marked `expired`.
- [ ] End-to-end test with `PAPER_ENV=development`
- [ ] Race condition test (two tabs, same seat, simultaneous Pay Now)

### Related Docs

- [Architecture & Data Structure](./architecture.md) — Firestore schemas, API contracts, flow diagrams
