# Seat Booking and Ticketing Flow Architecture

This document describes the data flow and system interactions between the Administrative Settings and the Public Ticket Booking interface.

## Core Components

The seat booking logic involves three main administrative configuration screens and one public-facing booking interface:

### 1. VenueSettings.js (`events/{eventId}.venues`)
- **Purpose**: Defines physical layout and capacities of event venues.
- **Data Structure**: Stores an array of `venues` in the main event document.
- **Key Fields**:
  - `id`: Unique identifier for the venue.
  - `label`: Display name (e.g., "Jatayu Hall").
  - `seatConfig`: Array of rows outlining the physical seats. Each row contains `row` (e.g., "A"), `seatCount` (total seats in that row), and `areaType` (the tier: Sapphire, Diamond, Gold, Silver, Public).
- **Interaction**: Acts as the blueprint. Changing `VenueSettings` does not retroactively change existing seats; it only provides the layout for new sessions.

### 2. OrchestraSettings.js (`events/{eventId}.orchestraSessions`)
- **Purpose**: Schedules specific performances at a venue and instantiates actual seat documents.
- **Data Structure**: Updates the `orchestraSessions` array in the main event document and dynamically generates seat documents in the `seats{eventId}` collection.
- **Key Fields**:
  - `id`: Generated ID or `${date}_${time}`.
  - `reservedRows`: Array of rows (e.g., `["A", "B"]`) that are blocked from public selection, typically held for free complimentary tickets.
  - `complimentaryQuota`: Total number of free tickets allowed for this session.
- **Seat Generation**: *Crucial step.* When a new session is created, the system loops through the selected Venue's `seatConfig`. For every seat defined in the capacity, it writes a document to `seats{eventId}` with `status: 'available'`.

### 3. SystemSettings.js (`events/{eventId}.ticketEligibility`)
- **Purpose**: Controls access and scheduling for when specific participant tiers can purchase tickets.
- **Data Structure**: Updates the `ticketEligibility` object on the global system settings.
- **Key Fields**:
  - `enabled`: Boolean toggle to enforce or bypass the schedule.
  - `schedule`: Array of allowed purchasing windows mapping dates to allowed tiers.
- **Interaction**: The backend uses this data when `apis.publicTicket.getEligibleWinners()` is called, ensuring that a registered winner can only book tickets if their award tier falls within the currently active schedule window.

### 4. AdminContent.js -> SessionAssignmentManager.js (`sessionAssignments/{eventId}`)
- **Purpose**: Organizes and schedules approved registrants (performers) into specific competition sessions.
- **Data Structure**: Stores assignments in a separate top-level collection `sessionAssignments/{eventId}`. It builds the session lists by reading the nested structure (`venue -> date -> time`) directly from `events/{eventId}.sessions`.
- **Key Fields**:
  - `assignments`: An object mapping `sessionId` to an array of assigned performers (including `registrantId`, `name`, `order`, `competitionCategory`, and `teacherName`).
- **Interaction**: Currently used for competition administration and performer scheduling. *Planned integration:* The `PublicTicketBookingPage.js` will utilize these assignments later on to display which specific performers are playing in which session, enabling ticket buyers (family/friends) to buy tickets for the correct performance slot.

### 5. PublicTicketBookingPage.js (Public Interface)
- **Purpose**: The user-facing page where tickets are actually reserved and purchased.
- **Flow**:
  1. **Identify Entry**: Users select whether they are a "Public Buyer" or "Registered Winner". If a registered winner, they select their identity from the list of eligible winners (filtered by `SystemSettings`). They then select an `OrchestraSession`.
  2. **Seat Selection**: 
      - Fetches generated seat documents for the chosen session from the backend.
      - If the user is a registered winner and the session has `complimentaryQuota` remaining, they are granted 2 complimentary tickets automatically (assigned on the spot, not from the map).
      - Renders the remaining seats on a visual map. Seats belonging to `reservedRows` (defined in `OrchestraSettings`) are greyed out and unselectable.
      - Users can select available seats to add to their cart.
  3. **Checkout**: Consolidates selected seat IDs, add-ons, user details, and buyer type. Submits the payload to `createBooking`, which locks the seats and redirects to a payment gateway.

## Summary of the Data Flow
1. Admin designs the blueprint (`VenueSettings`).
2. Admin creates a session, and the system uses the blueprint to generate actual individual seat records in the DB (`OrchestraSettings`).
3. Admin defines when winners can buy (`SystemSettings`).
4. Public/Winners load the session, retrieve the seat documents, pick their seats, and check out (`PublicTicketBookingPage`).
