# Project Conventions & Constraints

## 🚫 Restricted Commands
- **NEVER** run `npm run start`.
- **NEVER** run `npm run build`.

## 🛠 Tech Stack & Architecture
- **Frontend:** React.js using **Ant Design** components.
- **Backend:** Node.js with **Express**.
- **Database/Auth:** Firebase (Firestore/Auth).
- **Style:** Use Tailwind CSS for custom styling alongside Ant Design.

## 📝 Coding Standards
- **Component Structure:** Prefer functional components with Hooks.
- **State Management:** Prioritize clean, modular state handling.
- **Naming:** Use camelCase for variables and functions, and PascalCase for components.

## 🤖 Agent Behavior
- **Passive Constraints:** Always check these conventions before suggesting or executing code changes.
- **Code Edits:** Ensure all changes are compatible with the existing Monorepo structure.
- **Communication:** Provide a brief summary of what was changed and why.
- **Ticketing & Seat Booking Flow:** Whenever working on or modifying logic related to seat booking, ticketing flows, or venue settings, you **MUST** refer to `docs/SEAT_BOOKING_FLOW.md` to understand the architecture and interactions between `SystemSettings`, `VenueSettings`, `OrchestraSettings`, and `PublicTicketBookingPage`.
- **Database Architecture Check:** Whenever modifying Firestore database logic, schema, or collections, you **MUST** first cross-reference and verify the structure defined in `docs/architecture.md`. Update this file if you introduce any new collections or alter the data flow.
- **Documentation Updates:** When the user asks to update or add documentation, or after completing a significant feature or UI refinement, you **MUST** update the relevant markdown files inside the project's `docs/` folder (e.g., `docs/business_perspective.md`, `docs/architecture.md`, `docs/SEAT_BOOKING_FLOW.md`, `docs/progress.md`). Do **NOT** only update internal agent artifacts or walkthrough files — those are for agent context only, not project documentation. Always choose the most appropriate existing doc file, or create a new one in `docs/` if none fits.
- **Progress Tracking:** Use `docs/progress.md` to maintain a chronological log of all completed features, bug fixes, and UI refinements. This file is the primary source of truth for the project's current state and historical changes, ensuring context is preserved across multiple sessions.