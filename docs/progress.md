# APCS Project — Progress Tracker

This document tracks features and changes made to the APCS project over time.

---

## 💱 Update USD to IDR Conversion Rate

**Date:** 2026-05-25
**Status:** ✅ Completed

### What Was Built

Updated the fixed USD to IDR conversion rate used for international payments and price registrations from 17,200 to 17,800.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/invoiceUtils.js` | MODIFIED | Updated `USD_TO_IDR_RATE` constant to 17,800 |
| `src/utils/__tests__/invoiceUtils.test.js` | MODIFIED | Updated unit tests with the new 17,800 rate calculations |

---

## 🧪 Unit Testing for Critical Business Processes

**Date:** 2026-05-24
**Status:** ✅ Completed

### What Was Built

A comprehensive unit testing suite protecting the registration pricing, invoice conversion, and payment discount flows across both frontend and backend projects. Includes a Git pre-push hook that blocks pushes if any test fails.

### Test Coverage Summary

| Project | Test File | Tests | What It Covers |
|---------|-----------|:-----:|----------------|
| `apcs_service` | `invoiceUtils.test.js` | 11 | USD→IDR conversion (rate 17,200), IDR passthrough, discount conversion, invoice notes |
| `apcs_service` | `discountUtils.test.js` | 15 | All VocalChoir discount tiers (5-10/11-20/21-30), boundary values, wrong categories, edge cases |
| `apcs_website` | `priceProvider.test.js` | 20 | Solo/Ensemble pricing, international USD, VocalChoir discounts, boundary tests, baseAmount consistency |
| **Total** | | **46** | |

### Files Created / Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | MODIFIED | Added Jest devDependency + `npm test` script |
| `src/utils/invoiceUtils.js` | NEW | Extracted USD→IDR conversion logic with `USD_TO_IDR_RATE = 17200` constant |
| `src/utils/discountUtils.js` | NEW | Extracted VocalChoir ensemble discount calculation |
| `src/utils/__tests__/invoiceUtils.test.js` | NEW | 11 tests for invoice price conversion |
| `src/utils/__tests__/discountUtils.test.js` | NEW | 15 tests for discount tiers |
| `src/repositories/PaperRepository.js` | MODIFIED | Uses `invoiceUtils` instead of inline conversion |
| `src/controllers/PaperController.js` | MODIFIED | Uses `discountUtils` instead of inline discount logic |

#### Frontend (`apcs_website/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/priceProvider.test.js` | EXPANDED | Added 13 new tests (boundary, international ensemble, non-VocalChoir, baseAmount) |

#### Project Root

| File | Action | Purpose |
|------|--------|---------|
| `test-all.ps1` | NEW | PowerShell script to run all tests across both projects |
| `.git/hooks/pre-push` | NEW | Git hook that blocks push if any test fails |

### Key Design Decisions

1. **Extracted pure functions** — Invoice conversion and discount logic were extracted from `PaperRepository.js` and `PaperController.js` into standalone utility modules (`invoiceUtils.js`, `discountUtils.js`). This makes them testable without needing to mock Firebase, Axios, or Express.

2. **Single source of truth for USD rate** — The `USD_TO_IDR_RATE = 17200` constant in `invoiceUtils.js` is used by both the conversion logic and the invoice notes, preventing the mismatch bug (16,900 vs 17,200) that was caught in the previous audit.

3. **Git pre-push hook** — Automatically runs all 46 tests before every `git push`. Can be bypassed with `git push --no-verify` for emergency hotfixes.

---

## 🎨 Jury Dashboard & Login Page Redesign (APCS Scoring Platform)

**Date:** 2026-05-15
**Status:** ✅ Completed
**Design Source:** `docs/apcs-scoring-platform/` (high-fidelity prototype by design partner)

### What Was Built

A complete visual and architectural overhaul of the **Login** and **Jury Dashboard** pages to match the new APCS Scoring Platform prototype. Transitioned from a dark-themed Ant Design/MUI layout to a **light editorial design** with IBM Plex typography. The jury scoring flow was also restructured from inline table editing to a dedicated assessment form page.

### Design System Shift

| Aspect | Before | After |
|--------|--------|-------|
| Theme | Dark (`#121212`) | Light editorial (`#f7f6f3` paper) |
| Cards | `#1E1E1E` + gold border | `#ffffff` + subtle `#e3e1da` border |
| Accent | `#EBBC64` gold | `#15161a` ink with warm status colors |
| Typography | System fonts / MUI defaults | IBM Plex Sans + IBM Plex Mono |
| Components | MUI TextField, Ant Design Table/Tabs | Native HTML with custom CSS |
| Status | Gold text on dark | Amber pills (pending) / Green pills (assessed) |

### Files Created / Modified

#### Shared

| File | Action | Purpose |
|------|--------|---------|
| `public/index.html` | MODIFIED | Added Google Fonts import (IBM Plex Sans + Mono) |

#### Login Page (`Pages/Login/`)

| File | Action | Purpose |
|------|--------|---------|
| `Login.js` | REWRITTEN | Centered card layout, native HTML inputs, SVG icons. Removed all MUI dependencies. |
| `Login.css` | NEW | Light-theme design tokens, input groups, buttons, error banner, dividers |

#### Jury Dashboard (`Pages/JuryDashboard/`)

| File | Action | Purpose |
|------|--------|---------|
| `JuryDashboard.js` | REWRITTEN | Dashboard table view with stat cards, category tabs, search/filter, pagination. Routes to separate AssessmentForm. |
| `JuryDashboard.css` | NEW | Full design system — nav, stats, tabs, table, slider, modals, buttons, pills (~500 lines) |
| `Icons.js` | NEW | 18 SVG icon components matching the prototype's icon set |
| `ScoreSlider.js` | NEW | Hatched-fill drag slider with mouse drag + keyboard support (arrows, pgup/pgdn, home/end) |
| `AssessmentForm.js` | NEW | Dedicated scoring view — info strip, score input + slider, minus points, feedback/comments, action bar |

### Key Changes

1. **Login Page** — Centered 380px card with "A" logo block, email/password inputs with eye toggle, Google sign-in, error banner, footer. All auth logic (`signInWithEmail`, `signInWithGoogle`) preserved.

2. **Dashboard View** — Nav bar with brand + user info, 3 summary stat cards (Total/Pending/Assessed), category tabs with pending count badges, search + status filter bar, clean table with score column, pagination.

3. **Assessment Form (New Flow)** — Clicking "Assess →" or "Edit" navigates to a full-page scoring view instead of editing inline in the table row. Features:
   - Participant info strip with repertoire links (sheet music, video)
   - Score input (0–100) with quick-set chips (60/70/80/90/95) + hatched-fill drag slider
   - Minus points with ±buttons and presets (0/1/2/5)
   - Final score display with formula (`score − minus = final`)
   - Feedback textarea (with char counter) + optional comments
   - "Next participant →" button with pending queue position (e.g., "2 of 5 pending")
   - "Save assessment" → success modal → back to dashboard

4. **Score in Table** — Assessed registrants now show their score directly in the table (highlighted) for at-a-glance progress visibility.

5. **UI Refinements** — Persistent navbar across all views, formatted `videoDuration` (mm:ss) in table and assessment strip, and improved ensemble member list visibility.

### Status Logic (Pending vs Assessed)

Status is **per jury member** — based on whether the logged-in jury has a score document in `JuryScores2025` for that registrant:

- **Pending** = no `JuryScores2025` document for `(registrantId, juryUserId)` pair
- **Assessed** = document exists with a defined `score` value

Each jury member sees their own independent progress. See `docs/business_perspective.md` for the full schema.

### Business Logic Preserved

All existing data flows remain untouched:
- Firebase Auth (email + Google via `useAuth()`)
- Firestore queries (`Registrants2025`, `JuryScores2025`)
- Score saving (`setDoc` to `JuryScores2025`)
- Video loading (AWS S3 signed URLs via `apis.aws`)
- PDF viewing, Logout + redirect, Age category mapping

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

