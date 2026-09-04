# APCS Project — Progress Tracker

This document tracks features and changes made to the APCS project over time.

---

## 👩‍⚖️ Jury Management Page

**Date:** 2026-09-04
**Status:** ✅ Completed

### What Was Built

Added a standalone **Jury Management** page within the Admin Dashboard to centralize jury account operations. 
1. **New UI Page:** Created `JuryManagement.js` with a comprehensive data table displaying Name, Email, Category, and the newly added `eventId`.
2. **Full CRUD Support:** Admins can now Create, Edit (Name, Category, Event ID), and Delete jury members directly from this page.
3. **Safety Constraints:** Backend validation in `JuryRepository` actively prevents the deletion of a jury member if they have already submitted scores in `JuryScores2025`, avoiding orphaned data.
4. **Cleanup:** Migrated the legacy "Create New Jury" modal out of `AdminContent.js`, streamlining the dashboard and centralizing jury configurations.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/repositories/JuryRepository.js` | MODIFIED | Added `eventId` support on creation, and introduced `updateJury` and `deleteJury` methods with score-dependency validation. |
| `src/services/JuryService.js` | MODIFIED | Exposed CRUD operations for controllers. |
| `src/controllers/JuryController.js` | MODIFIED | Added HTTP handler wrappers for updates and deletions. |
| `src/routes/PaymentRoute.js` | MODIFIED | Registered `PUT /updateJury/:uid` and `DELETE /deleteJury/:uid` endpoints. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/JuryManagement.js` | ADDED | The new centralized dashboard page for managing jury accounts. |
| `src/Pages/AdminDashboard/AdminContent.js` | MODIFIED | Removed legacy "Create New Jury" button and modal logic. |
| `src/Pages/AdminDashboard/AdminDashboard.js` | MODIFIED | Registered the new `JuryManagement` component into the "Scoring Management" sidebar menu. |
| `src/apis/index.js` | MODIFIED | Added frontend Axios bindings for `updateJury` and `deleteJury`. |

---

## 📊 Jury Assessment Progress Tracker

**Date:** 2026-09-04
**Status:** ✅ Completed

### What Was Built

Added a "Jury Completion Progress" visual tracker to the Admin `ScoringRecap` dashboard. 
Admins can now instantly see the percentage of assessments each jury has completed within a given category. The system dynamically excludes registrants that are unpaid, and correctly ignores students belonging to the jury themselves from the target calculation.

### Files Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/ScoringRecap.js` | MODIFIED | Added state to fetch Juries by category, created a `juryProgress` dynamic calculation that filters target vs. scored registrants, and rendered a grid of progress cards. |

---

## 📅 Event ID Filter in Public Ticket Bookings (Admin Dashboard)

**Date:** 2026-08-31
**Status:** ✅ Completed

### What Was Built

Added an "Event ID" dropdown filter to the `PublicCustomersList` admin page. Previously, the page only fetched bookings and seats associated with the global `currentEventId`. Now, administrators can toggle between different past/future events (e.g., `APCS2026`, `APCS2025`) using a dropdown. All Firestore queries for public bookings and seat availability map dynamically update based on the selected event ID.

Additionally, added a "Mark Paid" manual override button in the Actions column for pending bookings. This provides a fallback if the Paper.id webhook fails, allowing admins to manually confirm the booking, finalize seat assignments from `locked` to `booked`, and subsequently trigger the confirmation email.

### Files Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/PublicCustomersList.js` | MODIFIED | Added an `eventsList` state to fetch and display all available events. Hooked the `selectedEventId` to data-fetching logic for public tickets and seat layouts. |

---
## 📧 Jury Deadline Reminder Email System

**Date:** 2026-08-30
**Status:** ✅ Completed

### What Was Built

Added a server-side background job (`setInterval`) that checks for jury deadlines and sends automated reminder emails. 
The job runs every 30 minutes, checks if a category deadline is within 24 hours, and emails any jury members in that category who still have pending assessments. 
Idempotency is achieved by writing a `juryDeadlineReminderSent` flag to the `systemSettings/global` Firestore document.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/jobs/JuryDeadlineReminder.js` | ADDED | The main background job logic to check deadlines, calculate pending assessments, and trigger emails. |
| `index.js` | MODIFIED | Initialized `startJuryDeadlineReminder` on server startup. |
| `src/services/EmailService.js` | MODIFIED | Added `sendJuryDeadlineReminderEmail` function to interface with Nodemailer. |
| `src/services/EmailTemplateService.js` | MODIFIED | Added the `JURY_DEADLINE_REMINDER` HTML template string. |

#### Documentation (`docs/`)

| File | Action | Purpose |
|------|--------|---------|
| `architecture.md` | MODIFIED | Documented the new `juryDeadlineReminderSent` flag and background job behavior. |

---

## ⚡ Video CDN Optimization (Jury Dashboard)

**Date:** 2026-08-28
**Status:** ✅ Completed

### What Was Built

Optimized the video playback experience in the Jury Dashboard by implementing an AWS CloudFront CDN distribution. Replaced the manual backend API call for S3 Presigned URLs with direct CloudFront streaming. This eliminates the backend round-trip latency (saving ~500ms before load) and streams the video chunks from local edge servers, drastically reducing buffering times for high-resolution student uploads.

### Files Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/JuryDashboard/JuryDashboard.js` | MODIFIED | Refactored `openVideo` to parse the `s3Link` and construct a CloudFront URL directly, bypassing the `apis.aws.getPublicVideoLinkAws` endpoint. |

---
## 📊 Registrant Stats Modal in Registrant Dashboard

**Date:** 2026-08-17
**Status:** ✅ Completed

### What Was Built

Added a "View Registrant Stats" button in the Registrant Dashboard that opens a new modal. This modal displays the total number of **Solo** and **Ensemble** registrations grouped by **Competition Category** (e.g., Piano, Ensemble). It includes an `Event ID` filter and the ability to export the calculated statistics to an Excel (`.xlsx`) file.

### Files Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Added state, dynamic `useMemo` calculations, table columns, export logic, and the UI modal for the Registrant Stats. |

---

## 📄 Preview Files Modal in Registrant Dashboard

**Date:** 2026-08-16
**Status:** ✅ Completed

### What Was Built

Added a "Preview Files" button in the Registrant Dashboard action column next to "Download PDF". Instead of downloading, this button triggers a modal that embeds and previews the registrant's **Repertoire** and **Birth Certificate** files directly in the browser. Since the assets are private in S3, the modal dynamically fetches signed URLs via the backend `getPublicVideoLinkAws` endpoint.

### Files Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Added state, loading logic, and JSX for the "Preview Files" modal. Fetches signed S3 URLs. |
| `src/constant/RegistrantsColumn.js` | MODIFIED | Appended the "Preview Files" button in the action column. |

---

## 🎟️ Ticketing System Audit & Bug Fixes (Part 2)

**Date:** 2026-08-15
**Status:** ✅ Completed

### What Was Built

Completed an end-to-end audit of the ticketing system and implemented 5 critical bug fixes, along with administrative UI enhancements:

1. **Registrant Dashboard Enhancements**: Added a new filter for "Payment Status" (PAID vs PENDING) to easily identify incomplete registrations. Replaced the "User Type" column with the registrant's "Phone Number" for quicker communication access.
2. **Ticketing Resend Email**: Added a "Resend Email" button to the `PublicCustomersList` admin page to manually resend the booking confirmation email (with seat details and QR code) if the customer lost it or didn't receive it.
3. **SeatOccupancy Orchestra Bug**: Fixed a bug where generated orchestra seats were showing as "Not Generated" due to a `venueId` key mismatch when evaluating the UI state.
4. **Timezone Eligibility Fix**: Fixed a 7-hour timezone discrepancy where the public booking page evaluated the eligibility schedule in UTC (`toISOString()`) instead of the required `Asia/Jakarta` timezone.
5. **Registrant ID Traceability**: Ensured the `registrantId` is saved directly into the `publicBookings` document during checkout for easier auditing and database tracing.
6. **Rollback ReferenceError & Quota Fix**: Fixed a fatal scoping error in `PublicTicketRepository` where an invoice generation failure would throw a `ReferenceError` on rollback, permanently locking seats. Upgraded the rollback logic to also correctly refund any complimentary orchestra quota that was claimed during the failed transaction.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/controllers/PaperController.js` | MODIFIED | Added `emailSent` tracking field when sending confirmation emails. |
| `src/controllers/PublicTicketController.js` | MODIFIED | Added new endpoint logic to resend booking confirmation emails. |
| `src/routes/PaymentRoute.js` | MODIFIED | Registered the new `POST /public-ticket/resendEmail` endpoint. |
| `src/repositories/PublicTicketRepository.js` | MODIFIED | Appended `registrantId` to the booking document. Fixed the variable scope on the `catch` block and implemented complimentary quota refund logic for failed API requests. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Added Payment Status filter logic and swapped the User Type column for Phone Number. |
| `src/Pages/AdminDashboard/PublicCustomersList.js` | MODIFIED | Added the Resend Email action button and integrated it with the new backend endpoint. |
| `src/Pages/AdminDashboard/SeatOccupancy.js` | MODIFIED | Patched the `isGenerated` lookup key to correctly include `venueId`. |
| `src/Pages/TicketBooking/PublicTicketBookingPage.js` | MODIFIED | Switched `new Date().toISOString()` to `toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })`. |

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/SEAT_BOOKING_FLOW.md` | MODIFIED | Documented the `registrantId` tracking. |
| `docs/TICKETING_SYSTEM_GUIDE.md` | MODIFIED | Documented the Resend Email feature and Quota Rollback. |
| `docs/progress.md` | MODIFIED | Added this entry. |

## ⏱️ Automatic Video Duration Penalty

**Date:** 2026-07-27
**Status:** ✅ Completed

### What Was Built

1. **Configurable Video Penalty:** Admins can now configure the `videoPenaltyThresholdMinutes` and `videoPenaltyScore` in the System Settings page.
2. **Automatic Penalty Calculation:** The `ScoringRecap` admin page dynamically calculates and displays a video duration penalty (e.g., `-5`) based on the registrant's `videoDuration` and the global settings.
3. **Manual vs Automatic Handling:** Both the manual "read book" penalty and the automatic video penalty are now tracked and displayed separately on the `ScoringRecap` page. The total effective score is recalculated dynamically.
4. **Export Recalculation:** The Jury Comments export logic in `RegistrantDashboard` now dynamically calculates the final penalized average directly from the original scores and the automatic video penalty, explicitly excluding manual penalties during the export.
5. **Accurate Final Awards:** The export ensures the `Final Award` column accurately reflects the penalized average.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/repositories/SystemSettingsRepository.js` | MODIFIED | Whitelisted the new `videoPenaltyThresholdMinutes` and `videoPenaltyScore` configuration settings in the `global` system settings document. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/SystemSettings.js` | MODIFIED | Added a new "Scoring Configuration" card with inputs for threshold minutes and penalty score. |
| `src/Pages/AdminDashboard/ScoringRecap.js` | MODIFIED | Added logic to fetch settings, compute auto penalty, display both auto and manual penalties, and export them correctly. |
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Updated `handleExportJuryComments` to apply the auto penalty, recalculate averages dynamically without manual penalties, and export precise values. |

---

## 🌍 International Registration Flow Update

**Date:** 2026-07-25
**Status:** ✅ Completed

### What Was Built

1. **Automated International Routing:** Updated the public registration flow (`Register.js`) to detect if a registrant is from outside of Indonesia based on their `countryCode`. 
2. **Payment Info Bypass:** If an international registrant is detected, the frontend will automatically bypass generating a Paper.id invoice link (since Paper.id doesn't support non-Indonesian credit cards yet).
3. **Automated Options Email:** Instead of redirecting to the payment wait page with a Paper link, it hits the `sendEmailPaymentInfoOptions` endpoint, dynamically inserting their registration details, and sends them the Both Options (Bank Transfer / PayNow) email automatically.
4. **Admin Testing Tool:** Added a "Test International Registration Email" button in the admin `RegistrantDashboard.js` email demo section to simulate and verify the exact email payload that gets triggered during public registration.
5. **Success Toast Update:** Updated the post-registration success message for international registrants to explicitly state: "Successfully Registered! Please check your email to continue the payment process."

### Files Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/Register/Register.js` | MODIFIED | Intercepted international users, skipped `createRegistrationInvoice`, and called `sendEmailPaymentInfoOptions` instead. |

---

## 📧 Payment Info Options - Registrant Details Enhancement

**Date:** 2026-07-25
**Status:** ✅ Completed

### What Was Built

1. **Registrant Details in Email:** Updated the "Payment Info (Both Options)" email template to dynamically include a prominent "Registration Details" box at the top of the email instead of just a generic payment reference box at the bottom. 
2. **Dynamic Data Parsing:** The email now includes the registrant's specific **Name**, **Category** (e.g., Guzheng-Openageguzheng), **Amount** (e.g., USD 95 based on their actual competition type and currency), and **Payment Reference**.
3. **Frontend Integration:** Updated `handleSendPaymentInfoOptions` and `handleSendTestEmail` in `RegistrantDashboard.js` to correctly format and pass the `price`, `competitionCategory`, and `paymentReferenceOverride` payloads to the backend API.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/services/EmailService.js` | MODIFIED | Passed new parameters (`price`, `competitionCategory`, `paymentReferenceOverride`) into the `PAYMENT_INFO_OPTIONS` template. |
| `src/services/EmailTemplateService.js` | MODIFIED | Restructured the `PAYMENT_INFO_OPTIONS` HTML to include the new "Registration Details" block at the top and removed the redundant bottom reference block. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Updated the payload for the `sendEmailPaymentInfoOptions` API call to include all required dynamic registrant information. |

---

## 🌍 Country Code Parsing Bug Fix

**Date:** 2026-07-25
**Status:** ✅ Completed

### What Was Built

1. **Country Code Parsing Fix:** Fixed a bug in `RegistrantDashboard` where the country of a registrant was being incorrectly parsed. Previously, the system would indiscriminately prepend a `+` to the `phoneNumber` field (e.g., `90029350` became `+90029350`), which falsely matched `+90` (Turkey). The code was updated to prioritize `performer.country` and `performer.countryCode` over parsing `phoneNumber`.
2. **Data Structure Documentation Update:** Updated `docs/architecture.md` with a critical warning regarding `phoneNumber` vs `countryCode` in the `performers` array to prevent similar parsing mistakes in the future.

### Files Modified

#### Documentation (`docs/`)

| File | Action | Purpose |
|------|--------|---------|
| `docs/architecture.md` | MODIFIED | Added critical documentation explaining that `phoneNumber` does not include the country code and that `country` or `countryCode` should always be prioritized. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/constant/RegistrantsColumn.js` | MODIFIED | Updated the `getCountry` extraction logic to correctly check `performer.country` and `performer.countryCode`. |

---

## 📧 Payment Request Email & Country-Specific Notes

**Date:** 2026-07-20
**Status:** ✅ Completed

### What Was Built

1. **Payment Request Feature:** Added the ability for admins to manually send Bank Transfer and PayNow payment request emails directly from the `RegistrantDashboard` per row.
2. **Dynamic Fee Notes by Country:** Integrated a country selection modal (Singapore/Malaysia/None) before sending payment requests or test emails. This allows admins to attach dynamic, country-specific fee notes (e.g., SGD vs. MYR) to the bottom of the emails based on the client's location.
3. **Backend Template Updates:** Updated `EmailService.js` to accept a `feeNote` parameter and conditionally render an "Important Notes" section at the bottom of the Bank Transfer and PayNow email templates.
4. **Test Email Enhancement:** Streamlined the "Payment Request Emails" test section with an inline country selector and consolidated buttons for testing the new templates.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/services/EmailService.js` | MODIFIED | Added `feeNote` parameter to `sendEmailPaymentRequest` and `sendEmailPaymentRequestPaynow` and injected it into the HTML templates. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Added payment request buttons per row, implemented a country selection modal for dynamic fee notes, and updated the test email section with an inline selector. |

---

## 🎟️ Dynamic Venue Seating & Validation Overhaul

**Date:** 2026-07-19
**Status:** ✅ Completed

### What Was Built

1. **Dynamic Venue Configuration:** Removed hardcoded venue fallback logic from the admin seating management, ensuring `PublicCustomersList.js` and `SeatEvent.js` dynamically pull venue data from the event configuration.
2. **Key Collision Fix (Seat Generation):** Patched the `sessionsSeatsGenerated` dictionary across the application (`PerformerSessionsSettings.js`, `OrchestraSettings.js`, and `SeatEvent.js`) to prepend `venueId` (e.g. `${venueId}_${date}_${time}`). This fixed a bug where generating seats for Session 1 in Venue A would incorrectly mark Session 1 in Venue B as generated.
3. **Complimentary Tickets UI Warning:** Added a clear warning block in `PublicTicketBookingPage.js` to alert users when their eligible complimentary tickets mathematically exceed the remaining quota of the selected orchestra session, so they understand why their grant was capped.
4. **Registrant Name Consistency:** Locked down the "Paying for Registrant" input field in Step 4 to `readOnly`, preventing users from altering the selected registrant identity at checkout.
5. **Firestore Transaction Read/Write Separation:** Fixed a fatal `Firestore transactions require all reads to be executed before all writes` error in `PublicTicketRepository.js`. Refactored the `runTransaction` block into strict **Read Phase** and **Write Phase** blocks.
6. **Ticket Quantity Validation Fix:** Updated the backend checkout validation in `PublicTicketRepository.js` to natively understand that paid seats (`selectedSeatIds`) and free seats (`orchestraSelectedSeatIds`) are passed as separate arrays, removing the legacy calculation that artificially halved seat selections.
7. **Email Seat Separation:** Updated the `sendPublicBookingConfirmationEmail` flow in `EmailService.js` and `EmailTemplateService.js` to distinctly list "Competition Seats" and "Orchestra Seats" on separate lines instead of fusing them into a single string. This prevents user confusion if they are attending sessions in different venues/times.
8. **Seat Occupancy Color Fix:** Fixed a UI bug in `CustomSeatPicker.js` where all unavailable seats (booked, locked, reserved) were hardcoded to render as grey `#2a2a2a`, making it impossible for admins to see the red/orange status colors in the `SeatOccupancy.js` dashboard. The component now accepts and prioritizes a `statusColor` prop from the admin view while maintaining the grey styling for the public view.
9. **Public Ticket Checkout Status Fix:** Updated `PublicTicketRepository.js` to save successfully paid tickets with `status: 'booked'` instead of `'reserved'`. This ensures the Admin Dashboard correctly identifies ticket ownership and displays the user's name in tooltips instead of "Reserved for: N/A".

24. **UI Seats Summary Breakout & Orchestra Session Details:** Fixed a layout issue in `PublicTicketBookingPage.js` where large numbers of selected seats broke the summary view. The summary now cleanly splits "Orchestra Seats" and "Paid/Additional Seats" into their own multi-line rows with word-wrapping. Additionally, the summary now dynamically displays the venue, date, and time of the actual selected Orchestra Session instead of incorrectly defaulting to the underlying performance session's metadata.
25. **Email Seat Labels Fix:** Fixed a critical bug in `PublicTicketRepository.js` and `EmailService.js` where seat labels (e.g. `G6`, `L8`) were failing to parse properly in confirmation emails due to the new UUID-based Seat IDs, causing the emails to render fallback text like `Venue, Venue`. The frontend now explicitly maps and sends the human-readable `performanceSeatLabels` and `orchestraSeatLabels` arrays in the booking payload. These are permanently saved into the `publicBookings` document, and the backend webhook reads them directly when dispatching the `Payment Confirmed` email.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/repositories/PublicTicketRepository.js` | MODIFIED | Fixed transactional rule violation (Read before Write) and updated ticket quantity validation logic. |
| `src/services/EmailService.js` | MODIFIED | Separated `selectedSeatIds` and `orchestraSelectedSeatIds` into distinct template variables. |
| `src/services/EmailTemplateService.js` | MODIFIED | Updated the HTML template to render Competition Seats and Orchestra Seats on separate lines if applicable. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/PerformerSessionsSettings.js` | MODIFIED | Appended `venueId` to `sessionsSeatsGenerated` keys. |
| `src/Pages/AdminDashboard/OrchestraSettings.js` | MODIFIED | Appended `venueId` to `sessionsSeatsGenerated` keys. |
| `src/Pages/AdminDashboard/PublicCustomersList.js` | MODIFIED | Removed hardcoded venues and migrated to dynamic mapping. |
| `src/Pages/AdminDashboard/SeatEvent.js` | MODIFIED | Removed hardcoded venues and updated generation keys. |
| `src/Pages/TicketBooking/PublicTicketBookingPage.js` | MODIFIED | Made Step 4 Registrant Name read-only, and added quota cap warning block in Step 3. |

---
## 🤖 ReCAPTCHA Token Expiry & Concurrent Registration Fallback

**Date:** 2026-07-19
**Status:** ✅ Completed

### What Was Built

1. **ReCAPTCHA Token Expiry Fix:** Resolved a critical issue where the Google reCAPTCHA token would expire (timeout after 2 minutes) while waiting for large 1.5GB video uploads to finish. The `grecaptcha.execute()` call was moved to trigger *after* the S3 video upload completes, right before the backend submission, guaranteeing a fresh token every time.
2. **Concurrent Registration Fallback (Invoice API):** Implemented a graceful fallback mechanism on the frontend to prevent users from encountering errors if the Paper.id invoice creation API times out or fails under heavy concurrent load (e.g., 50+ users registering simultaneously). The frontend now silently catches the error, falls back to the standard email success flow, and allows the backend to tag the `invoiceStatus` as `FAILED` for admin review.
3. **Enterprise Migration Revert:** Cleaned up and reverted an experimental reCAPTCHA Enterprise attempt, ensuring the system reliably uses the stable v3/v2 invisible `api.js` script with the correct Site/Secret key pairs mapped through the `.env` variables.

### Files Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/Register/Register.js` | MODIFIED | Relocated `grecaptcha.execute()` generation logic. Added a `try/catch` fallback block around `apis.payment.createRegistrationInvoice`. Reverted experimental enterprise script loading. |

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `.env` | MODIFIED | Re-synchronized the `RECAPTCHA_SECRET_KEY` variable to strictly match the valid Site Key provided by the admin. |

---

## 🧾 Invoice Status Tracking & Admin Filter

**Date:** 2026-07-19
**Status:** ✅ Completed

### What Was Built

1. **Invoice Status Tracking:** Added an `invoiceStatus` field to `Registrants2025` to track whether Paper.id invoice generation succeeded (`CREATED`) or failed (`FAILED`) during the automated background process.
2. **Dashboard Filter:** Added a new "Filter by Invoice Status" dropdown (`<Select>`) in the Admin `RegistrantDashboard` so admins can easily find failed invoices.
3. **Table Column:** Added an `Invoice Status` column next to `Payment Status` in the admin table.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/controllers/PaperController.js` | MODIFIED | Added `invoiceStatus: "CREATED" / "FAILED"` explicit updates to Firestore after attempting invoice generation. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Added `invoiceStatusFilter` state and UI dropdown for filtering. |
| `src/hooks/useFetchRegistrantsData.js` | MODIFIED | Added client-side filtering logic for `invoiceStatusFilter`. |
| `src/constant/RegistrantsColumn.js` | MODIFIED | Added `Invoice Status` column. |
| `src/Pages/Register/Register.js` | MODIFIED | Added a `try/catch` fallback in `apis.payment.createRegistrationInvoice` to ensure successful registration even if Paper.id API times out. |

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/architecture.md` | MODIFIED | Documented the new `invoiceStatus` field. |
| `docs/progress.md` | MODIFIED | Added this entry. |

---

## 🛡️ Infrastructure: Cloudflare "Ticket War" Defense Strategy

**Date:** 2026-07-05
**Status:** ✅ Completed

### What Was Built

Verified and documented a robust infrastructure scaling strategy to protect the constrained shared hosting server (30 Entry Process limit) during high-concurrency ticket sales ("Ticket Wars"). 

1. **Static Asset Caching**: Leveraged Cloudflare to cache all React frontend assets (`Cf-Cache-Status: HIT`), preventing static file requests from instantly exhausting the origin server's entry processes.
2. **API Bypass Rules**: Verified Cloudflare Page Rules to explicitly bypass caching for all `/api/*` endpoints (`Cf-Cache-Status: DYNAMIC`), ensuring dynamic checkout sessions and database writes securely reach the Express server without cross-user data contamination.

### Files Modified

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/architecture.md` | MODIFIED | Added Section 8 "Infrastructure & Scaling" documenting the Cloudflare defense strategy. |

---

## 🎫 Ticketing Flow & Complimentary Orchestra Quota Fix

**Date:** 2026-07-05
**Status:** ✅ Completed

### What Was Built

1. **Complimentary Quota Validation**: Fixed a critical backend bug where complimentary orchestra tickets for Registrant Winners were completely ignored. The backend now securely reads `orchestraSelectedSeatIds` and immediately increments `complimentaryClaimed` on the event document during the booking transaction to prevent overselling the free quota.
2. **Atomic Orchestra Seat Locking**: During checkout, the backend now safely locks the free `orchestraSelectedSeatIds` for 30 minutes alongside the paid `selectedSeatIds`, ensuring nobody else can take those exact seats while the user is paying via Paper.id.
3. **Automated Quota & Seat Refund**: Upgraded both the `PublicTicketSweeper.js` cron job and the `setTimeout` expiry block. If a user fails to pay within 30 minutes, an atomic transaction fires that actively releases the free orchestra seats AND automatically refunds the `complimentaryClaimed` quota back to the event pool, ensuring the tickets aren't permanently lost to abandoned carts.
4. **Webhook Reservation Confirmation**: Updated the Paper.id webhook listener `handlePublicTicketWebhookPaid` to merge the paid seats and the complimentary orchestra seats, permanently reserving both sets when the payment is successfully completed.
5. **UI Refinements**: 
   - Added a prominent "Notice: All ticket sales are final and strictly non-refundable" alert directly on the `WaitingPayment.js` checkout screen.
   - Centered the countdown timer text for better visual alignment.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/repositories/PublicTicketRepository.js` | MODIFIED | Included `orchestraSelectedSeatIds` in payload destructuring, added `complimentaryClaimed` quota management inside the `createBooking` transaction, added seat lock updates, and updated webhook confirmation merging logic. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/Register/WaitingPayment.js` | MODIFIED | Added non-refundable disclaimer and centered the countdown timer wrapper block. |

---

## 🎟️ Performance Invitation Email Flow

**Date:** 2026-07-05
**Status:** ✅ Completed

### What Was Built

1. **New Email Template**: Created `PERFORMANCE_INVITATION` email template targeting Gold, Silver, and Diamond award winners for the APCS Gala Concert. The email is highly customized based on user's name.
2. **PDF Attachment Support**: Added support for static PDF attachments via `apcs_service/src/services/attachments` (using `fs` resolving relative paths) mapping directly to the email flow without breaking Node.js server boundaries.
3. **Backend Logic & Validations**: 
   - Added logic to automatically check the `finalAward` for the selected registrants.
   - If a registrant doesn't have a valid final award (Gold, Silver, Diamond) or their award is "Participant", the backend securely drops them, logs the error, and proceeds with the rest of the batch, preventing invalid invites.
4. **Admin Dashboard Integration**: Added a prominent "Send Performance Invitation" button on the Admin Dashboard under "Email Management."
5. **Interactive UI Modal**: Admins are presented with an advanced selection modal with specific filtering criteria (Name, Category, Award), DatePickers to inject dynamic fields (`confirmationDeadline`, `rundownReleaseDate`), and comprehensive selection tracking.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/services/EmailTemplateService.js` | MODIFIED | Included `PERFORMANCE_INVITATION` template mapping |
| `src/services/EmailService.js` | MODIFIED | Implemented logic to support `.pdf` static file attachments + server-side validation |
| `src/controllers/EmailController.js` | MODIFIED | Exposed `sendEmailPerformanceInvitation` controller |
| `src/routes/PaymentRoute.js` | MODIFIED | Added POST `/sendEmailPerformanceInvitation` route |
| `src/services/attachments/PERFORMANCE_INVITATION_2026.pdf` | NEW | Dummy static PDF file |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/apis/index.js` | MODIFIED | Wrapped backend endpoints `sendEmailPerformanceInvitation` |
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Extended UI to include DatePickers, a specific Table filtering by awards, and the Action buttons in the `Email Management` panel |

---

## 🎼 Repertoire Title & Environment Hardening

**Date:** 2026-07-05
**Status:** ✅ Completed

### What Was Built

1. **Repertoire Title Field**: Added a new field for participants to input their "Title of Song / Repertoire" directly on the `/register` page below the teacher's name.
2. **Admin UI Support**: The `SessionAssignmentManager` admin panel now dynamically displays the repertoire title (🎼 [Title]) natively within the session cards, enabling admins to make more informed scheduling decisions without clicking into details.
3. **Backend Propagation**: Ensured `repertoireTitle` flows through the backend endpoints, including aggregation via `PublicTicketRepository`. Because the original backend dynamically handles incoming destructured payload fields (`...dataToSave`), the new field writes to Firestore natively without requiring schema migrations.
4. **Environment Hardening**: Patched `PaperController.js` and `PublicTicketController.js` webhook listeners to robustly handle edge cases where `process.env.PAPER_ENV` equals `'Production'` instead of strictly `'production'` or `'prod'`, preventing payload structure mismatches on incoming payments.
5. **E2E Automation**: Updated the Playwright scripts (`register.spec.js` and `vocal-choir-discount.spec.js`) to automatically inject test data for the new repertoire title field during continuous integration tests.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/controllers/PaperController.js` | MODIFIED | Added robust `paperEnv` capitalization checks for the Paper.id webhook payload |
| `src/controllers/PublicTicketController.js` | MODIFIED | Added robust `paperEnv` capitalization checks for the Public Ticket webhook payload |
| `src/repositories/PublicTicketRepository.js` | MODIFIED | Included `repertoireTitle` in the winners aggregate fetch payload |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/Register/Register.js` | MODIFIED | Rendered the "Title of Song / Repertoire" field, added it to the form schema and submission payload |
| `src/components/molecules/AdminContentComponent/SessionAssignmentManager.js` | MODIFIED | Displayed the repertoire title visually on admin session cards and mapped it into the serialized API payload |
| `src/constant/translations/en.json` & `id.json` | MODIFIED | Added translation tokens for `repertoireTitle` and placeholders |
| `e2e/register.spec.js` | MODIFIED | Automated the repertoire title input field in the main testing suite |
| `e2e/vocal-choir-discount.spec.js` | MODIFIED | Automated the repertoire title input field in the discount testing suite |

---

## 🛡️ Public Ticket Race Condition & Expiry Protection

**Date:** 2026-06-28
**Status:** ✅ Completed

### What Was Built

Implemented a bulletproof seat locking and invoice expiration mechanism ("Option 4") to prevent users from paying for expired reservations and causing race conditions on the Paper.id side.

1. **Active Invoice Deletion (Backend)**: Added `deleteInvoice` to the Paper repository. When a seat lock expires after 30 minutes, the server actively reaches out to Paper.id via `DELETE /sales-invoices/{id}` to void the invoice.
2. **Instant & Fallback Timers (Backend)**: 
   - A `setTimeout` runs exactly 30 minutes after checkout to instantly void the invoice and release seats.
   - A `PublicTicketSweeper` background job runs every 5 minutes to sweep and void any stale pending invoices in case the Node.js server restarts and drops the `setTimeout` tasks.
3. **Webhook Safety Guard (Backend)**: Added a hard check inside the `/public-ticket/webhook` handler. If the webhook arrives *after* the `lockExpiresAt` timestamp, the payment is rejected, preventing race conditions where the user pays at the exact moment their lock expires.
4. **Live Countdown (Frontend)**: Updated the `WaitingPayment.js` page to actively poll a new `/api/v1/apcs/public-ticket/booking-status/:bookingId` endpoint. Displays a real-time countdown timer (e.g., `29:59`). If the timer hits `00:00` or the ticket is marked expired, the "Pay Now" link is removed and a red "Time Expired" alert is shown to prevent the user from attempting payment.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/repositories/PaperRepository.js` | MODIFIED | Added `deleteInvoice` API integration with Paper.id. |
| `src/repositories/PublicTicketRepository.js` | MODIFIED | Added `setTimeout` logic on checkout to delete invoice on expiry. Added `lockExpiresAt` safety guard to webhook handler. |
| `src/jobs/PublicTicketSweeper.js` | NEW | Background cron job that runs every 5 mins to clean up expired invoices if server restarts. |
| `index.js` | MODIFIED | Mounted the `PublicTicketSweeper` job on startup. |
| `src/controllers/PublicTicketController.js` | MODIFIED | Added `getBookingStatus` endpoint for frontend polling. |
| `src/routes/PaymentRoute.js` | MODIFIED | Mounted `GET /public-ticket/booking-status/:bookingId`. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/Register/WaitingPayment.js` | MODIFIED | Added `setInterval` countdown timer. Triggers "Time Expired" state. |
| `src/Pages/TicketBooking/PublicTicketBookingPage.js` | MODIFIED | Passes `isPublicTicket: true` state to the waiting payment page. |
| `src/apis/index.js` | MODIFIED | Added `publicTicket.getBookingStatus` API call. |

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/SEAT_BOOKING_FLOW.md` | MODIFIED | Updated flow to document Paper.id active voiding and countdown. |
| `docs/TICKETING_SYSTEM_GUIDE.md` | MODIFIED | Updated Payment & Webhooks section with Expiry Logic details. |
| `docs/progress.md` | MODIFIED | Added this entry. |

---

## 🎫 Ticketing System Audit & Bug Fixes

**Date:** 2026-06-27
**Status:** ✅ Completed

### What Was Built

Completed a full audit of the ticketing system admin flow and implemented several fixes and documentation updates based on the user's feedback:
1. **Unified `publicBookings` Collection:** Migrated away from year-specific collections (e.g., `publicBookings2026`) to a single unified `publicBookings` collection. Updated `PublicTicketRepository` and `PublicCustomersList` to read/write from this unified collection, filtering by `currentEventId`.
2. **Fixed Rollback Bug:** Fixed a variable scope error (`bookingData.eventId` → `eventId`) in the `PublicTicketRepository` manual rollback catch block.
3. **SessionId Parsing Fix:** Fixed an issue where the Session ID parsing in `PublicTicketRepository.js` failed for Venue IDs containing underscores (e.g. `Venue_uuid`), which caused the Venue to display incorrectly as `"Venue"` and the date as `"uuid"` in the Public Booking UI.
4. **Ticket Pricing & Addon Calculation Fix:** Fixed `PublicTicketBookingPage.js` where string concatenation was happening in the total calculation instead of arithmetic addition due to `price` being stored as a string. Updated `TicketPricingSettings.js` to explicitly cast `price` values to `Number` before saving to Firestore to prevent future data issues.
5. **Dynamic Venue Labels:** Updated `PublicTicketController` to dynamically fetch the event data and resolve the venue's label for the "Seat Held" and "Booking Confirmation" emails, removing the hardcoded fallback.
6. **Orchestra Settings Polish:** Replaced the free-text `time` input with a dynamic dropdown `<Select>` populated from the venue's `sessions` for the selected date. Also added `eventId: currentEventId` to newly generated seat documents.
7. **Paper.id Invoice Dynamics:** Removed hardcoded venue names ("Jatayu" / "Melati") from the Paper.id invoice generation in `PublicTicketRepository` and updated it to dynamically read the venue label from the event configuration.
8. **Email Template Refactoring:** Moved the seat-hold and booking-confirmation email templates out of `PublicTicketController.js` and into `EmailTemplateService.js` to keep controllers clean. Standardized their design by reusing `generateCommonHeader()` and `generateCommonFooter()` for a consistent APCS brand appearance.
9. **Emoji & Emoticon Cleanup:** Removed all emojis/emoticons (e.g., 🎓, ⏱, ✓) from `PublicTicketBookingPage.js` and the email templates to ensure a highly professional UI and communication standard.
10. **Documentation Sync:** Created a comprehensive `docs/TICKETING_SYSTEM_GUIDE.md` for internal staff. Synced `docs/architecture.md` and `docs/SEAT_BOOKING_FLOW.md` with the new data model.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/repositories/PublicTicketRepository.js` | MODIFIED | Changed collection to `publicBookings`, fixed variable scope in rollback. Also fixed `getTodayAllowedTiers` to merge overlapping schedule dates. |
| `src/controllers/PublicTicketController.js` | MODIFIED | Fetches dynamic venue label before sending emails. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/PublicCustomersList.js` | MODIFIED | Changed to read from `publicBookings`, filtered by `currentEventId`, formatted columns. |
| `src/Pages/AdminDashboard/OrchestraSettings.js` | MODIFIED | Added `<Select>` for time based on selected venue/date, added `eventId` to seat batch write. |
| `src/components/molecules/AdminContentComponent/SessionAssignmentManager.css` | MODIFIED | Added `flex-shrink: 0` to `.sam-session-card` to prevent clipping when expanding multiple sessions. Updated layout to have strict height with internal scrollbars. |
| `src/Pages/TicketBooking/PublicTicketBookingPage.js` | MODIFIED | Fixed `isPublicEnabled` to merge overlapping eligibility schedule entries for the same date. Fixed UI bug where Venue IDs with underscores caused incorrect date/venue parsing. |
| `src/Pages/AdminDashboard/TicketPricingSettings.js` | MODIFIED | Updated `addScheduleEntry` to merge tiers into existing dates instead of creating duplicates. |

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/TICKETING_SYSTEM_GUIDE.md` | NEW | Internal staff guide for configuring and monitoring the ticketing flow. |
| `docs/architecture.md` | MODIFIED | Updated references to `publicBookings`. |
| `docs/SEAT_BOOKING_FLOW.md` | MODIFIED | Updated checkout flow and seat generation details. |
| `docs/progress.md` | MODIFIED | Added this entry. |

---

## ⚖️ Registrant Score & Award Discrepancy Fix

**Date:** 2026-06-23
**Status:** ✅ Completed

### What Was Built

Addressed an issue where a student's score in the `RegistrantDashboard` differed from `ScoringRecap` because the dashboard previously ignored admin-adjusted scores during dynamic average calculations.

1. **Dashboard Dynamic Average Alignment:** Updated the calculation logic in `RegistrantDashboard` (both on-the-fly and during "Sync All Scores") to prioritize `adminAdjustedScore` if one exists, matching the `ScoringRecap` logic.
2. **Tooltip Insight:** Enhanced the jury breakdown tooltip in the Registrants table to explicitly show the adjustment if an admin intervened: e.g., `75 (Original: 85)`.
3. **Award Visibility in Recap:** Added a dynamic "Award" column to the `ScoringRecap` page, mimicking the `RegistrantDashboard`, complete with tier colors and a "VERIFIED" badge when finalized.

### Files Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Included `adminAdjustedScore` in dynamic `getScoreData` mapping and the `handleSyncAllScores` database batch update to ensure accurate averages. |
| `src/constant/RegistrantsColumn.js` | MODIFIED | Updated the `Popover` list items to display both the adjusted and original scores side-by-side if applicable. |
| `src/Pages/AdminDashboard/ScoringRecap.js` | MODIFIED | Added an `Award` column dynamically calculating the final award based on the average score, utilizing `calculateAward` from `Utils.js`. |

---

## 🛑 Registration Enable/Disable Feature

**Date:** 2026-06-16
**Status:** ✅ Completed

### What Was Built

Added a global setting to the Admin Dashboard allowing admins to seamlessly enable or disable the public Registration page (`/register`). When disabled, the form is completely hidden and replaced with an elegant, APCS-branded "Under Maintenance" full-screen overlay. 

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/repositories/SystemSettingsRepository.js` | MODIFIED | Added `isRegistrationEnabled` to the `updateGlobalSettings` whitelist payload to persist the toggle state. |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/context/DataContext.js` | MODIFIED | Fetches and stores `isRegistrationEnabled` from global settings. |
| `src/Pages/AdminDashboard/SystemSettings.js` | MODIFIED | Added a new "Registration Configuration" card with a toggle switch. |
| `src/Pages/Register/Register.js` | MODIFIED | Conditionally renders the "Under Maintenance" UI when registration is disabled. |

---

## 📧 Resend Registration Confirmation Email (Admin Fallback)

**Date:** 2026-06-16
**Status:** ✅ Completed

### What Was Built

Added a "Resend Email" button to the Registrant Dashboard table so admins can manually resend the registration confirmation email to registrants who didn't receive it — e.g., due to Paper.id webhook failures or email delivery issues.

The backend endpoint replicates the **exact same email logic** used in `handlePaperWebhook`: it fetches the registrant from Firestore, groups performers by email, formats the price, and calls both `sendEmailFunc` (confirmation to user) and `sendEmailNotifyApcs` (admin notification).

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/controllers/PaperController.js` | MODIFIED | Added `resendConfirmationEmail` function — mirrors webhook email logic |
| `src/routes/PaymentRoute.js` | MODIFIED | Added `POST /resendConfirmationEmail` route |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/apis/index.js` | MODIFIED | Added `resendConfirmationEmail` API call |
| `src/Pages/AdminDashboard/RegistrantDashboard.js` | MODIFIED | Added `handleResendConfirmationEmail` handler + `resendingId` state |
| `src/constant/RegistrantsColumn.js` | MODIFIED | Added "Resend Email" button with `MailOutlined` icon to table actions column |

---

## 💱 Configurable USD→IDR Exchange Rate

**Date:** 2026-06-06
**Status:** ✅ Completed

### What Was Built

Made the USD→IDR exchange rate configurable from the Admin Dashboard instead of being hardcoded in `invoiceUtils.js`. The rate is now stored in Firestore (`systemSettings/global → usdToIdrRate`) and fetched at invoice creation time.

1. **Admin UI** — New "Exchange Rate Configuration" card on the System Settings page with an `InputNumber` (min 10,000 / max 25,000 IDR) and save button.
2. **Backend** — `PaperRepository.createInvoice` fetches the rate from Firestore and passes it to `buildInvoiceItem()` / `buildInvoiceNotes()`. Falls back to `DEFAULT_USD_TO_IDR_RATE = 17800` if the Firestore value is missing.
3. **Rate Integrity Tests** — 6 new tests in `invoiceUtils.test.js` verifying: fallback behavior (null/undefined/0 → default), custom rate is actually used, notes display the correct rate, IDR items are unaffected. These run automatically via `test-all.ps1`.

### Files Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/invoiceUtils.js` | MODIFIED | Replaced `USD_TO_IDR_RATE` constant with `DEFAULT_USD_TO_IDR_RATE` fallback; `buildInvoiceItem` and `buildInvoiceNotes` now accept `usdToIdrRate` as parameter |
| `src/repositories/PaperRepository.js` | MODIFIED | Fetches `usdToIdrRate` from `systemSettings/global` and passes it to invoice utils |
| `src/repositories/SystemSettingsRepository.js` | MODIFIED | Added `usdToIdrRate` as a supported field in `updateGlobalSettings` |
| `src/utils/__tests__/invoiceUtils.test.js` | MODIFIED | Updated existing tests to pass rate as parameter; added 6 exchange rate integrity tests |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/Pages/AdminDashboard/SystemSettings.js` | MODIFIED | Added "Exchange Rate Configuration" card with InputNumber (min/max validated) |

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/architecture.md` | MODIFIED | Updated section 2.8 with `usdToIdrRate` field documentation |
| `docs/progress.md` | MODIFIED | Added this entry |

---

## 🚀 E2E Registration Testing

**Date:** 2026-06-05
**Status:** ✅ Completed

### Latest Updates
- **E2E Playwright Tests Added:** Created `/apcs_web/e2e/register.spec.js` to automate form filling and validation for single performers, 5-person ensembles, and 12-person vocal choirs (to verify invoice splitting logic). Scripts target production by default and gracefully handle ReCAPTCHA pauses.
- **Added TESTING.md:** Documented E2E testing commands for quick reference.

---

## 🏆 Scoring Recap Admin Page & Assessment Form Layout Update

**Date:** 2026-06-04
**Status:** ✅ Completed

### What Was Built

1. **Scoring Recap Admin Page** — New page in Admin Dashboard (Scoring Management → Scoring Recap) for the APCS team to review all jury scores across registrants. Supports multiple juries per registrant with average score calculation.

2. **Admin Score Adjustments** — Admin can adjust a jury's score without modifying the original. Stored in a separate `adminAdjustedScore` field. The jury member always sees their original score. Average calculation uses the adjusted score when available.

3. **Score Finalization** — Admin can mark a registrant's scores as "Finalized", which locks the jury from editing. Shows 🔒 badge in both admin and jury dashboards. Can be reversed (unfinalized) if needed.

4. **CSV Export** — Download scoring data as CSV with all jury scores, adjustments, feedback, and APCS notes per registrant.

5. **Assessment Form Layout Update** — Restructured jury AssessmentForm to match prototype: performance feedback full-width on top, then notes + overall score side-by-side below.

6. **Menu Rename** — "Jury Management" renamed to "Scoring Management" with two sub-items: "Scoring Recap" (new) and "Jury Deadlines" (existing).

### Files Created / Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `Pages/AdminDashboard/ScoringRecap.js` | NEW | Admin page: category filter, expandable table with multi-jury scores, admin adjustments, finalization, CSV export |
| `Pages/AdminDashboard/AdminDashboard.js` | MODIFIED | Renamed "Jury Management" → "Scoring Management", added "Scoring Recap" menu item (key `'21'`) |
| `Pages/JuryDashboard/AssessmentForm.js` | MODIFIED | Added `isFinalized` prop — disables inputs and shows finalized banner when score is locked. Also restructured form layout to match prototype. |
| `Pages/JuryDashboard/JuryDashboard.js` | MODIFIED | Passes `isFinalized` to AssessmentForm, shows 🔒 Finalized badge on locked rows in table |
| `Pages/JuryDashboard/JuryDashboard.css` | MODIFIED | Added `.jd-score-input` placeholder styling |

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/architecture.md` | MODIFIED | Updated JuryScores2025 schema with admin scoring fields (`adminAdjustedScore`, `finalizedAt`, etc.) |
| `docs/progress.md` | MODIFIED | Added this entry |

### Key Design Decisions

1. **Admin edits stored separately** — `adminAdjustedScore` is a new field on `JuryScores2025` docs. The jury's original `score` is never modified. This prevents jury confusion ("why did my score change?").

2. **Effective score = adminAdjustedScore ?? score** — Average calculation uses the adjusted score when present, otherwise the original. This gives admin full control over the final average.

3. **Finalization = real lock** — Setting `isFinalized: true` on all jury score docs for a registrant actually disables the jury's form inputs and save button. It's not just a visual marker.

4. **Batch finalization** — All jury score docs for a registrant are updated in a single Firestore `writeBatch`, ensuring atomicity.

5. **No new collections** — Reuses existing `JuryScores2025` collection with new optional fields. Backward-compatible with existing data.

---

## ⏰ Jury Deadline Admin UI & Login Enforcement

**Date:** 2026-06-04
**Status:** ✅ Completed

### What Was Built

1. **Jury Deadline Settings Admin Page** — New page in Admin Dashboard (Jury Management → Jury Deadlines) to manage per-competition-category scoring deadlines. Admins can add, edit, and remove deadlines with a date-only picker. The time is automatically set to **23:59:59** end-of-day, so jury can score all day until the deadline date ends.

2. **Jury Email Login Blocking** — When a jury member tries to log in via email/password and their competition category's deadline has passed, login is blocked. The user is signed out immediately and shown an error: *"The scoring period for [category] has ended."* Admin/subadmin logins and Google sign-in are never affected.

3. **AGENTS.md Update** — Added "Restricted Verification" rule to prevent the agent from launching browsers for UI verification. The user verifies UI manually; agent provides walkthrough artifacts.

### Files Created / Modified

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `Pages/AdminDashboard/JuryDeadlineSettings.js` | NEW | Admin page: add/edit/delete per-category jury deadlines with date picker, status tags, and save |
| `Pages/AdminDashboard/AdminDashboard.js` | MODIFIED | Added "Jury Management" sidebar submenu with "Jury Deadlines" item (menu key `'20'`) |
| `context/DataContext.js` | MODIFIED | Added jury deadline enforcement in `signInWithEmail` — blocks login if category deadline has passed |

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/architecture.md` | MODIFIED | Updated section 2.8 with admin UI reference, date-only picker, auto end-of-day, and `DataContext` enforcement details |
| `docs/progress.md` | MODIFIED | Added this entry |
| `AGENTS.md` | MODIFIED | Added "Restricted Verification" section |

### Key Design Decisions

1. **Date-only picker** — Admins don't need to think about time. Selecting June 15 means the jury can score until 23:59:59 on June 15. The `toEndOfDay()` helper handles this automatically.

2. **Login blocking at auth layer** — Enforcement happens in `DataContext.signInWithEmail()` *after* Firebase Auth succeeds but *before* state is set or navigation occurs. The user is signed out of Firebase Auth immediately. This ensures the block can't be bypassed by navigating directly to `/juryDashboard`.

3. **Graceful degradation** — If the system settings API fails during login, the deadline check is skipped (jury can still log in). This prevents a settings outage from locking out all jury members.

4. **Category keys from `competitionList`** — The admin dropdown uses the same `competitionList` constant that registrants use during registration, ensuring key consistency between the deadline map and the jury user's `competitionCategory` field.

---

## 🔐 Login Split-Screen, Dashboard Logo, Simplified Scoring & Jury Deadline

**Date:** 2026-05-28
**Status:** ✅ Completed

### What Was Built

1. **Login Page Split-Screen** — Redesigned to a 50/50 split layout: left panel shows `contactUsPageBackground.jpeg` with overlay text, right panel contains the login form. Removed "forgot password" link.

2. **Dashboard Logo Replacement** — Replaced `<span class="jd-brand-logo">A</span>` text logo with `apc_logo_bold.svg` image in the JuryDashboard nav bar.

3. **Simplified Scoring** — Removed minus points, ScoreSlider, and quick-set chips from `AssessmentForm.js`. Now shows a clean single score input (0-100) + feedback textarea + comments textarea.

4. **Per-Category Jury Deadline** — Added `juryDeadlines` map field to `systemSettings/global` Firestore document. Each key is a competition category, value is an ISO-8601 deadline string.

5. **Deadline Warning Modal** — When jury logs in within 24 hours of their category's deadline, a `DeadlineWarningModal` displays a live countdown and dismiss button (shown once per session via `sessionStorage`).

6. **Deadline Display on Dashboard** — Live countdown chip in the nav bar. Normal = neutral, urgent (H-1) = red with pulse animation, expired = red static.

7. **Login Deadline Banners** — Login page shows informational banners: expired categories show "Scoring period has ended", urgent categories show remaining time. Google login and admin login remain unblocked.

### Files Created / Modified

#### Backend (`apcs_service/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/repositories/SystemSettingsRepository.js` | MODIFIED | Added support for `juryDeadlines` map field in `updateGlobalSettings` |

#### Frontend (`apcs_web/`)

| File | Action | Purpose |
|------|--------|---------|
| `Pages/Login/Login.js` | REWRITTEN | Split-screen layout, deadline banners, removed forgot password |
| `Pages/Login/Login.css` | REWRITTEN | 50/50 split screen, responsive stacking, deadline banner styles |
| `Pages/JuryDashboard/JuryDashboard.js` | MODIFIED | SVG logo import, deadline fetching/display, DeadlineWarningModal integration |
| `Pages/JuryDashboard/JuryDashboard.css` | MODIFIED | Added `.jd-brand-img`, `.jd-deadline` (normal/urgent/expired), `.jd-deadline-modal-icon` |
| `Pages/JuryDashboard/AssessmentForm.js` | REWRITTEN | Simplified to single score input + feedback + comments (removed slider, minus, quick-set) |
| `Pages/JuryDashboard/DeadlineWarningModal.js` | NEW | Warning modal with live countdown for H-1 deadline proximity |

#### Documentation

| File | Action | Purpose |
|------|--------|---------|
| `docs/architecture.md` | MODIFIED | Added section 2.8 documenting `juryDeadlines` in `systemSettings/global` |

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
- [x] Configure Paper.id webhook URL → `/api/v1/apcs/public-ticket/webhook`
- [x] ~~Set up lock cleanup job~~ — **Not needed.** Lazy expiry check built into the Firestore transaction itself: if a seat is `locked` but `lockedAt > 30 min ago`, the transaction treats it as available and reclaims it for the new user. The old booking is also automatically marked `expired`.
- [x] End-to-end test with `PAPER_ENV=development`
- [ ] Race condition test (two tabs, same seat, simultaneous Pay Now)

### Related Docs

- [Architecture & Data Structure](./architecture.md) — Firestore schemas, API contracts, flow diagrams


### Fixed
- **Paper.id Webhook Unified Router (`PaperController.handlePaperWebhook`)**: Because Paper.id only allows configuring a single webhook endpoint for an account, the controller now acts as a router. It dynamically checks if the incoming `invoiceNumber` belongs to the `publicBookings` collection first. If it does, it dynamically routes the payload to `PublicTicketService.handlePublicTicketWebhookPaid` to fulfill the public ticket booking. If not, it falls back to standard `Registrants2025` processing.
- **Seat Duplication Bug on Public Booking Page**: A recent schema migration updated the seat document ID generation to include the `venueId` prefix to prevent cross-venue collisions (e.g. `Venue_mvfyegwz-Presto-C1...`). Because the "Regenerate" function uses `batch.set` targeted at the new string ID, the older seats generated without the prefix were left orphaned in the database. A cleanup script was run to sweep and delete 1,872 duplicate orphaned seats, fixing the UI bug where "C1" appeared multiple times in the same row.
- **Seat Regeneration Safety**: Documented and verified that hitting "Regenerate Seats" on the admin dashboard intentionally preserves any seat that is `status !== 'available'`. It uses `batch.set` on the exact same document ID to safely overwrite the available seats with the updated layout without ever wiping out seats that customers have already booked or locked.

### Fixed & Enhanced (Aug 30, 2026)
- **Masterclass Settings & Booking Integration**: Created the `MasterclassSettings.js` admin page allowing staff to manage masterclass schedules. Integrated masterclass tickets into the `PublicTicketBookingPage.js` where public buyers can purchase them as simple quantities (without seat selection). For orchestra winners, they can now claim their complimentary masterclass tickets in the same flow.
- **Dynamic Quantity-based Add-on (`seat_selection_performer`)**: Transitioned the "Seat Selection Performer" add-on from a flat fee to a dynamic quantity-based calculation (`quantity * price`). The `PublicTicketBookingPage.js` and `PublicTicketRepository.js` were updated to handle this change correctly, enforcing a rule that the quantity of `seat_selection_performer` add-ons must be greater than or equal to the total performance seats selected.
- **Cart Summary Refactor & Multi-step Visibility**: Refactored the UI of `PublicTicketBookingPage.js` to render the `Order Summary` (cart) dynamically at the bottom of multiple steps (both Step 1 and Step 2). This ensures buyers see a real-time breakdown of ticket costs, add-on costs, and their total sum as they toggle options before checkout.
- **Always-Visible "Free Orchestra Seats" Step for Winners**: Changed the booking flow so that Step 2 ("Select Free Orchestra Seats") is always shown for eligible Winners. A conditional toggle now explicitly asks if they want to pay the add-on fee to manually select their orchestra seats. If 'No', the system auto-assigns seats; if 'Yes', it adds the add-on to their cart and displays the seat map for manual selection.
- **Admin Public Customers List Enhancements**: Upgraded `PublicCustomersList.js` with an `expandable` Ant Design table row. When expanded, admins can view comprehensive order details per buyer, including exact ticket quantities, add-on counts, masterclass complimentary tickets, and precise seat assignments (both performance and free orchestra seats).

### Fixed & Enhanced (Aug 31, 2026)
- **Orchestra Seat Quota Calculation**: Fixed an issue where the frontend incorrectly calculated the required number of complimentary orchestra seats (`F`). It was mistakenly basing the quota off the number of seats manually clicked on the performance map (`P`) instead of the actual number of performance tickets purchased. The `PublicTicketBookingPage.js` now aligns with the backend API by calculating `complimentaryCount` based on the sum of all purchased performance tickets.
- **Admin Manual Seat Assignment Modal (`No seat layout available`)**: Fixed a bug where the manual seat assignment modal in the Admin Dashboard (`PublicCustomersList.js`) failed to display the layout and showed "No seat layout available for this section." The issue was caused by a case mismatch: Firestore stores `areaType` capitalized (e.g., "Presto") while the layout sorting array expects lowercase. Normalizing `seat.areaType.toLowerCase()` correctly populates the layout array for the `CustomSeatPicker`.

### Fixed & Enhanced (Sep 02, 2026)
- **Multi-stage Jury Deadline Reminders (`JuryDeadlineReminder.js`)**: Upgraded the background cron job that sends jury scoring reminders. Previously, it only sent a single warning 24 hours before the deadline. The logic now cascades gracefully to dispatch emails exactly 1 week before, 3 days before, and 24 hours before the deadline. The `EmailTemplateService` was updated to dynamically reflect the `timeRemainingText` for each of these windows. The idempotency flag in Firestore was refactored to include the reminder window (`_1w`, `_3d`, `_24h`) to prevent duplicate email dispatches.

### Fixed & Enhanced (Sep 04, 2026)
- **Jury Management Dashboard (`JuryManagement.js`)**: Created a dedicated page to manage jury lists including Create, Edit, and Delete operations. Moved the "Add new jury" button from the main admin content page to this new centralized page. Implemented safety logic in `JuryRepository.js` to block deletion of any jury member who has already submitted scores in `JuryScores2025`.
- **Robust Jury Deletion**: Handled the edge case where a jury member was previously deleted directly from the Firebase Authentication console but their Firestore document remained. The deletion logic now catches the `auth/user-not-found` error and gracefully proceeds to clean up the orphaned Firestore document.
- **Robust Jury Reminders & Startup Execution (`JuryDeadlineReminder.js`)**: Fixed a critical infinite loop bug where the cron job crashed due to corrupted jury data (missing `uid`), which prevented the reminder sent flag from saving and caused duplicate emails. Wrapped the jury evaluation block in a `try-catch` and added explicit data checks so the loop safely skips corrupted accounts. Additionally, refactored the script to run immediately upon server startup instead of waiting 30 minutes for the first `setInterval` tick.
- **Jury Email Locale Fix**: Updated the date formatting in the deadline reminder email to use `en-GB` locale to properly format the date and time in English, preventing the appearance of the Indonesian word "pukul" in communications for international jury members.
