# Seat Booking and Ticketing Flow Architecture

This document describes the data flow and system interactions between the Administrative Settings and the Public Ticket Booking interface.

## Core Components

The seat booking logic involves several administrative configuration screens and one public-facing booking interface:

### 1. SystemSettings.js
- **Purpose**: Manages high-level global environment variables.
- **Key Fields**:
  - `currentEventId`: Determines the active event ID used across the entire platform for data fetching and submission.

### 2. VenueSettings.js (`events/{eventId}.venues`)
- **Purpose**: Defines physical layout and capacities of event venues.
- **Data Structure**: Stores an array of `venues` in the main event document.
- **Key Fields**:
  - `id`: Unique identifier for the venue.
  - `label`: Display name (e.g., "Jatayu Hall").
  - `seatConfig`: Array of rows outlining the physical seats. Each row contains `row` (e.g., "A"), `seatCount` (total seats in that row), and `areaType` (the tier: Lento, Allegro, Presto).
- **Interaction**: Acts as the blueprint. Changing `VenueSettings` does not retroactively change existing seats; it only provides the layout for new sessions.

### 3. TicketSettings.js (`events/{eventId}.ticketTiers`, `.addOns`, and `systemSettings.ticketEligibility`)
- **Purpose**: A centralized configuration page for all commerce-related settings.
- **Data Structure**: Manages three distinct areas:
  - **Ticket Tiers**: Array of objects mapping tier IDs (e.g., "presto") to names, prices, and map colors. Tier IDs **MUST** match the `areaType` defined in Venue Settings for the seating map to display the correct price.
  - **Optional Add-Ons**: Array of extra items (e.g., "merchandise", "physical_ticket") with prices and descriptions.
  - **Ticket Eligibility Schedule**: (Moved from SystemSettings) Controls the sales window for different participant categories (Sapphire, Diamond, Public, etc.).
- **Interaction**: The `PublicTicketBookingPage` uses this configuration to:
  1. Determine if the "Public Buyer" option should be visible today.
  2. Filter which registered winners can proceed based on their award tier and today's date.
  3. Calculate order subtotals and render the interactive seat map with correct tier colors.

### 4. PerformerSessionsSettings.js (`events/{eventId}.venues[].sessions`)
- **Purpose**: Defines the time slots available for a specific venue (e.g., "09:00-11:00", "13:00-15:00").
- **Data Structure**: Updates the `sessions` object nested inside each venue in the `venues` array within the `events` document. It uses a structured format where each date maps to an array of time range strings.
- **Interaction**: These time slots serve as the foundation for both Performer Assignments and Orchestra (Performance) Sessions.

### 5. SessionAssignmentManager / AdminContent.js (`sessionAssignments/{eventId}`)
- **Purpose**: Organizes and schedules approved registrants (performers) into specific competition sessions.
- **Data Structure**: Stores assignments in a separate top-level collection `sessionAssignments/{eventId}`. It builds the session lists by reading the nested venue structure directly.
- **Key Fields**:
  - `assignments`: An object mapping `sessionId` to an array of assigned performers (including `registrantId`, `name`, `order`, `competitionCategory`, and `teacherName`).
- **Interaction**: Currently used for competition administration and performer scheduling. *Planned integration:* The `PublicTicketBookingPage.js` will utilize these assignments later on to display which specific performers are playing in which session, enabling ticket buyers (family/friends) to buy tickets for the correct performance slot.

### 6. OrchestraSettings.js (`events/{eventId}.orchestraSessions`)
- **Purpose**: Schedules specific public performances (Gala Concerts, Recitals) and instantiates the actual seat documents in the database.
- **Data Structure**: Updates the `orchestraSessions` array in the main event document.
- **Key Fields**:
  - `id`: Unique session identifier.
  - `venue`, `date`, `time`: The specific slot chosen from the performer sessions pool.
  - `reservedRows`: Array of rows (e.g., `["A", "B"]`) that are blocked from public selection, typically held for free complimentary tickets.
  - `complimentaryQuota`: Total number of free tickets allowed for this session.
- **Seat Generation**: *Crucial step.* When a new orchestra session is created, the system loops through the selected Venue's `seatConfig`. For every seat defined in the blueprint, it writes a document to the `seats{eventId}` collection with `status: 'available'`.

### 7. PublicTicketBookingPage.js (Public Interface)
- **Purpose**: The user-facing page where tickets are actually reserved and purchased.
- **Flow**:
  1. **Identify Entry**: Users select whether they are a "Public Buyer" or "Registered Winner". 
      - The "Public Buyer" button is hidden if today's date is not in the "Public" eligibility window defined in **Ticket Settings**.
      - Registered winners select their identity from the list of eligible winners.
  2. **Select Session**: Users choose which performance slot they wish to attend.
  3. **Seat Selection**: 
      - Fetches generated seat documents for the chosen session from the backend.
      - If the user is a registered winner and the session has `complimentaryQuota` remaining, they are granted 2 complimentary tickets automatically (assigned on the spot, not from the map).
      - Renders the remaining seats on a visual map. Seats belonging to `reservedRows` (defined in `OrchestraSettings`) are greyed out and unselectable.
      - Users can select available seats to add to their cart.
  4. **Checkout**: Consolidates selected seat IDs, add-ons, user details, and buyer type. Submits the payload to `createBooking`, which locks the seats and redirects to a payment gateway.

## Summary of the Data Flow
1. Admin designs the blueprint (`VenueSettings`).
2. Admin defines the time slots for each venue (`PerformerSessionsSettings`).
3. Admin schedules public performances and generates live seat records (`OrchestraSettings`).
4. Admin configures pricing and sales windows (`TicketSettings`).
5. Public/Winners load the session, retrieve the seat documents, pick their seats, and check out (`PublicTicketBookingPage`).
