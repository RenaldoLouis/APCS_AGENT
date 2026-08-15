# APCS Ticketing System Guide

This document serves as a guideline for internal staff and administrators to understand and manage the APCS ticketing system effectively.

## 1. Overview
The APCS ticketing system manages public ticket bookings and complimentary tickets for the Gala Concert and other public performances. The system is designed around specific "Orchestra Sessions" and integrates with an interactive seat map for ticket buyers to choose their seats.

## 2. Key Concepts & Flow
Before any tickets can be sold, the following administrative settings must be configured in order:

### A. Venue Settings
- **What it does**: Defines the physical layout of a venue.
- **Action**: Administrators must set up the seating layout by defining rows (e.g., Row A, Row B) and specifying how many seats are in each row, as well as their `areaType` (e.g., Presto, Allegro, Lento). This acts as the "blueprint".
- **Location**: Admin Dashboard > Ticketing System > Venue Settings

### B. Performer Sessions Settings
- **What it does**: Defines available time slots for a venue on a specific date (e.g., 09:00-11:00).
- **Action**: Create the time slots before configuring performances.
- **Location**: Admin Dashboard > Ticketing System > Performer Sessions

### C. Ticket Settings
- **What it does**: Configures pricing and availability.
- **Action**: 
  - Define "Ticket Tiers" which match the `areaType` defined in Venue Settings to assign a price.
  - Define optional "Add-Ons" like merchandise.
  - Set the "Ticket Eligibility Schedule" to determine when the public booking form becomes available to different user types.
- **Location**: Admin Dashboard > Ticketing System > Ticket Settings

### D. Orchestra Settings
- **What it does**: Schedules a public performance and generates the selectable seats in the database.
- **Action**:
  - Select the Date, Venue, and Time.
  - Define `complimentaryQuota` (free tickets given automatically to registered winners).
  - Define `reservedRows` (rows blocked from public selection on the map, typically for VIPs or staff).
  - **Important**: Saving a *new* session automatically generates the actual seat records in the database based on the venue blueprint.
- **Location**: Admin Dashboard > Ticketing System > Orchestra Settings

## 3. Public Ticket Booking Process
Once settings are configured, users access the Public Ticket Booking page.

1. **Identity Selection**: Users specify if they are a Public Buyer or a Registered Winner.
2. **Session Selection**: Users select the Orchestra Session they wish to attend.
3. **Seat Selection**: 
   - An interactive seat map loads based on the generated seat documents for paid selection.
   - Greyed-out seats indicate `reservedRows` or already sold/locked seats.
   - If the user is a Registered Winner, they are granted a calculated amount of complimentary tickets based on the remaining quota (1 free ticket + 1 free ticket per paid performance seat). They will then proceed to a secondary interactive map step to physically select their free orchestra seats.
4. **Checkout**: 
   - The user proceeds to checkout.
   - The backend *lazily* locks the selected seats for 30 minutes to prevent double-booking.
   - An invoice is created via Paper.id and the user is redirected to the payment gateway.
   - An initial "Seat Held" email is dispatched to the user.

## 4. Payment & Webhooks
- The ticketing system uses **Paper.id** for payment processing.
- When a user successfully pays within 30 minutes, Paper.id sends a webhook to the APCS server.
- The APCS server verifies the payment, permanently marks the seats as `sold`, and updates the booking status in the `publicBookings` collection.
- A final "Booking Confirmation" email with seat details and QR/Booking ID is dispatched to the user. If the user booked both paid Competition Seats and free Orchestra Seats, the email format will distinctly separate them into two different lists to prevent confusion regarding venue and session times.
- **Expiration Logic**: If a user fails to pay within 30 minutes, their seat lock expires. The system automatically voids the invoice on Paper.id, ensuring the user cannot pay late, and returns the seats to `available` status for others to purchase. Delayed webhooks for expired bookings are automatically rejected to prevent race conditions.

## 5. Monitoring & Troubleshooting
### Public Customers List
- **Purpose**: View all public bookings, their payment status (Paid, Pending, Expired), selected seats, and total amounts.
- **Location**: Admin Dashboard > Ticketing System > Public Customers
- **Action**: Use this screen to verify if a customer's payment went through or if their booking expired. If a user did not receive their confirmation email, administrators can click the "Resend Email" button to manually dispatch the ticket QR and seat details again.

### Rollback / Failed Invoices
- If the system successfully locks seats but fails to generate a Paper.id invoice due to an API error, the system performs an automatic rollback, releasing the seats immediately and automatically refunding any complimentary orchestra quota that was claimed so the user can try again without waiting 30 minutes.

### Seat Occupancy Dashboard
- **Purpose**: A centralized real-time view of all sessions and their seating statistics (total, available, locked, booked).
- **Location**: Admin Dashboard > Ticketing System > Seat Occupancy
- **Action**: Use this screen to track how many seats have been sold for each session. You can also visually inspect the exact layout of any session by clicking "View Layout" to see which seats are taken and the name/email of the person occupying them.

### Non-Destructive Seat Generation
- **Purpose**: Safely adding seats to a session or recalculating the layout after a venue change.
- **Action**: When you click "Generate Seats" for a session that already has seats, the system will automatically preserve any seats that are currently `booked` or `locked`. It will only overwrite seats that are currently `available`. This guarantees you will not accidentally overwrite active customer reservations.

---

**Note to Administrators**: When altering the database structure or troubleshooting logic, always refer to `SEAT_BOOKING_FLOW.md` for the technical data flow. This guide and the flow document must be kept in sync.

### Webhook Routing Architecture
Because third-party payment gateways (e.g. Paper.id) often only allow a **single webhook URL** per account, we use `PaperController.handlePaperWebhook` as a **Unified Webhook Router**:
- The router receives the webhook payload (which is dynamically parsed to support both flat Production payloads and nested Development payloads).
- It first checks if the `invoiceNumber` (or `externalId`) exists in the `publicBookings` collection.
- If it does, the payload is dynamically routed to `PublicTicketService.handlePublicTicketWebhookPaid` to fulfill the public ticket booking and send the confirmation email.
- If it doesn't, it falls back to standard processing, assuming the invoice belongs to the `Registrants2025` collection for competition registration.
