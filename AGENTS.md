# Project Conventions & Constraints

## 🚫 Restricted Commands
- **NEVER** run `npm run start`.
- **NEVER** run `npm run build`.
- **NEVER** create Git commits or push changes to any remote. Always leave changes uncommitted for the user to review and commit manually.
- **ALWAYS** use `yarn` for installing dependencies in the frontend (`apcs_web`).
- **ALWAYS** use `npm` for installing dependencies in the backend (`apcs_service`).

## 🚫 Restricted Verification
- **NEVER** launch or use a local browser (browser subagent, Playwright MCP, etc.) to verify UI changes. Verify correctness through code review and logical reasoning only.
- The user will manually verify all UI/UX changes in their own browser. Creating a **walkthrough artifact** is sufficient for verification guidance.


## 🛠 Tech Stack & Architecture
- **Frontend:** React.js using **Ant Design** components.
- **Backend:** Node.js with **Express**.
- **Database/Auth:** Firebase (Firestore/Auth).
- **Style:** Use Tailwind CSS for custom styling alongside Ant Design.

## 📝 Coding Standards
- **Component Structure:** Prefer functional components with Hooks.
- **State Management:** Prioritize clean, modular state handling.
- **Naming:** Use camelCase for variables and functions, and PascalCase for components.
- **Backend Error Handling:** NEVER `throw` errors directly inside asynchronous repository functions that are wrapped by `DatabaseUtil.executeDatabaseOperation()`. Because `executeDatabaseOperation` expects a callback, throwing an error directly causes an Unhandled Promise Rejection which crashes the Node.js server. Instead, ALWAYS return the error via the callback (e.g., `return callback(new AppError(...))`). You may only `throw new AppError(...)` inside standard async Promise-returning functions that do not use callbacks and are properly `await`ed and caught by the controller.
- **User-Facing Language:** Write new and edited UI text, notices, buttons, and email content in English only. Never append Indonesian translations with a slash, second sentence, or line break in the same rendered message. If multilingual support is requested later, implement it through the project's proper translation feature and language selection rather than mixed-language copy. This instruction overrides any skill guidance suggesting inline EN/ID text.

## 🤖 Agent Behavior
- **Passive Constraints:** Always check these conventions before suggesting or executing code changes.
- **Code Edits:** Ensure all changes are compatible with the existing Monorepo structure.
- **Communication:** Provide a brief summary of what was changed and why.
- **Ticketing & Seat Booking Flow:** Whenever working on or modifying logic related to seat booking, ticketing flows, validations, or venue settings, you **MUST** consult and refer to both `docs/SEAT_BOOKING_FLOW.md` and `docs/TICKETING_SYSTEM_GUIDE.md` before making changes to understand the architecture and business process. After completing any feature or workaround in these areas, you **MUST** comprehensively update both documents to ensure consistency and prevent mistakes in future updates.
- **Database Architecture Check:** Whenever modifying Firestore database logic, schema, or collections, you **MUST** first cross-reference and verify the structure defined in `docs/architecture.md`. Update this file if you introduce any new collections or alter the data flow.
- **Documentation Updates:** When the user asks to update or add documentation, or after completing a significant feature or UI refinement, you **MUST** update the relevant markdown files inside the project's `docs/` folder (e.g., `docs/business_perspective.md`, `docs/architecture.md`, `docs/SEAT_BOOKING_FLOW.md`, `docs/progress.md`). Do **NOT** only update internal agent artifacts or walkthrough files — those are for agent context only, not project documentation. Always choose the most appropriate existing doc file, or create a new one in `docs/` if none fits.
- **Critical Flow Validation (Moyu & Grilling):** Do NOT blindly implement user requests if they contradict the established business logic, technical flow, or user context. Always cross-reference the request against the codebase (e.g., if a user already has an assigned performance session, they shouldn't need to select it again for ticketing). If a request seems logically flawed or introduces complex new business rules, STOP and respectfully push back. **Before writing any implementation plan for complex features**, you MUST invoke the `grilling` or `domain-modeling` skills to systematically interview the user, stress-test the design, and resolve dependencies one-by-one until a shared understanding is reached.
- **Progress Tracking:** Use `docs/progress.md` to maintain a chronological log of all completed features, bug fixes, and UI refinements. This file is the primary source of truth for the project's current state and historical changes, ensuring context is preserved across multiple sessions.
- **Playwright Test Maintenance:** Whenever you make structural, functional, or UI updates to `apcs_web/src/Pages/Register/Register.js`, you **MUST** check and update the Playwright test scenarios (e.g. `apcs_web/e2e/register.spec.js` and `apcs_web/e2e/vocal-choir-discount.spec.js`) to ensure the end-to-end tests do not break due to DOM or selector changes.
- **Dead Reference Sweep:** When removing any variable, state, function, or prop, you MUST grep the entire affected file(s) for ALL remaining references before considering the removal complete. Partial removal (deleting the declaration but leaving usages) is a guaranteed ESLint/runtime error. Use `grep_search` on the variable name across the file to verify zero remaining references.
- **Post-Edit Verification:** After completing code edits, you MUST verify self-consistency before claiming completion. At minimum: (1) grep for any variables/functions you removed to confirm zero stale references, (2) verify all new variables/imports you introduced are properly declared, (3) check that conditional rendering branches are internally consistent. Never say "done" or "fixed" without this check. If the frontend dev server is running, wait for and report any compile errors.
- **Pre-Implementation Data Flow Check:** Before implementing any user-facing feature, you MUST trace the data path end-to-end: (1) What data does the user/registrant already have assigned? (2) What does the backend endpoint expect as input? (3) Does the new UI step actually produce new information, or is it redundant? If a step asks the user to provide data they already have, STOP and push back. This check replaces blind implementation with deliberate design validation.
- **Self-Review Checklist:** After completing any feature or significant edit, perform a self-review before reporting completion: (1) Standards — does the code follow project patterns and conventions? (2) Spec — does it match what was requested? (3) Hygiene — are there stale references, dead branches, or unused imports? (4) Consistency — do all conditional paths reference only defined variables? Report the self-review result in your summary.
- **Systematic Bug Fixing:** When encountering any error (ESLint, runtime, logic bug), do NOT immediately propose a fix. First: (1) Read the FULL error message including line numbers, (2) Trace the root cause — what variable is undefined? Where was it supposed to come from? (3) Check if the error is a symptom of a larger incomplete edit. Only then apply the minimal targeted fix. Never apply "shotgun" fixes that change multiple things hoping one works.
- **Conditional Branch Awareness:** When editing JSX with ternary/conditional rendering, you MUST audit ALL branches of the conditional, not just the one you're focused on. If removing a variable from one branch, verify it isn't used in the other branch. If both branches become identical after edits, collapse the conditional into a single unconditional render. Partial edits to multi-branch UI are the #1 source of stale-reference ESLint errors.

<claude-mem-context>
# Memory Context

# [apcs_Project] recent context, 2026-10-01 10:05pm GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (19,542t read) | 979,979t work | 98% savings

### Sep 8, 2026
2655 9:55p 🔴 Paper.id Sales Invoice Cancellation Endpoint Corrected
### Sep 10, 2026
2813 10:21p 🔄 Retired Registrant Dashboard score finalization UI and lock
2814 " 🟣 Award sync now processes all registrants including finalized assessments
2815 " ✅ ScoringRecap now defaults to current event and handles config load errors
2816 " 🔴 Fixed ES module import paths for Node.js compatibility
2817 " ✅ Removed unused imports and ESLint warnings from core scoring modules
2818 10:25p 🟣 Event-specific video duration penalty system with centralized scoring
2819 " ⚖️ Jury assessment lock decoupled from award recalculation during finalization
2820 " 🔵 All 40 Jest tests passing; video penalty rules and calculator fully validated
2821 10:28p 🟣 Event-Specific Video Penalty Configuration System
2822 " 🔵 Firestore APCS2026 Video Penalty Seed Verification Prepared
2823 10:54p 🟣 Unified Award Synchronization Service
2824 " 🟣 Event-Specific Video Penalty Configuration with Atomic Revision Management
2825 " 🔴 Jury Name Deduplication Performance Optimization
2826 " ✅ Test Coverage Expansion and Boundary Validation
2827 " ✅ Architecture and Business Documentation Updated
2828 " ✅ Translation Keys Added for Video Penalty Settings UI
### Sep 23, 2026
3860 9:14p 🔴 Fixed Paper.id webhook payload field name mismatch between staging and production
3861 9:21p 🔵 APCS Winner Booking Flow with Paper.id Payment Integration
3862 9:25p 🔵 Paper.id staging invoice verification and webhook testing preparation
3863 9:29p 🔵 Firestore fallback verification deployed after Paper.id endpoint timeout
### Sep 26, 2026
3948 3:01p 🟣 Competition Session Planning Flow with Draft-to-Publish Capability
3949 " 🔴 Protected Existing Session Assignment Write Path from Planning Overwrite
3950 " 🟣 Video Duration Tracking in Competition Planning UI
3951 " ✅ Manual Walkthrough and Implementation Documentation Created
3952 " ⚖️ APCS2026 Event Data Reset Strategy for Planning Flow Adoption
3953 3:08p 🟣 APCS2026 Ticketing Reset with Test Data Archival
3954 " 🔵 Paper.id Staging Invoice Already Purged
3955 " ✅ Active Booking Detection Filter in Planning Repository
3956 " 🔴 Paper.id Callback Guard Against Archived Test Bookings
3957 " 🟣 Audit Tests for APCS2026 Planning Reset Flow
3958 3:13p 🟣 Implemented event ticketing reset capability for APCS2026 planning phase
3959 " 🟣 Added archived test booking protection to payment callback handlers
3960 " ✅ Updated competition planning documentation with APCS2026 reset details
3961 " 🟣 Added audit tests for ticketing reset and archived booking callback protection
### Sep 28, 2026
3975 10:11a 🟣 Email sending for scoring results in ScoringRecap
3976 " ⚖️ Centralize scoring calculator into shared @apcs/scoring package
3984 11:38p 🔵 APCS ticketing system business-process audit completed
### Oct 1, 2026
4221 10:40a ✅ Removed legacy orchestra rows from Seat Occupancy page
4222 " 🔵 Verified ticketing workflow sequence and validation behavior
S917 Audit the public ticket booking purchase flow to identify blockers, fatal errors, and ensure seats cannot be double-booked, payments don't fail silently, and seat displays work correctly (Oct 1 at 10:43 AM)
4223 10:56a 🟣 Local Firestore Emulator Setup for Development
4224 11:02a 🟣 Local Firestore Emulator Development Environment
4225 " 🔵 Production Data Export to Local Snapshot
4226 11:07a 🟣 Local Firestore Emulator Development Environment Configured
4337 7:28p 🔴 Removed legacy orchestra rows from Seat Occupancy display
4338 " 🔵 Schedule publishing does not auto-generate numbered seats
4339 " 🔵 Performance quota still governs free-seating capacity in orchestra sessions
4340 " 🔵 Planning validation does not reliably detect same child across separate registrations
4341 " 🔵 Ticketing audit suite passes 147 offline checks; live payment and Firestore gaps remain
4342 " 🔵 Payment webhook processing may require manual reconciliation on fulfillment failure
S946 Audit APCS ticketing purchase flow for blockers and fatal errors; remove unused orchestra seat display; confirm planning and payment workflows are sound (Oct 1 at 7:29 PM)
**Investigated**: - Removed legacy orchestra numbered-seat rows from Seat Occupancy display (still keeping historical records)
    - Confirmed performance quota is still active and required for capacity control in free-seating orchestra flow
    - Validated the multi-stage planning workflow: publish schedule → generate seats → verify and mark ready → sales eligible
    - Discovered planning validation catches same-registration-ID conflicts but NOT same-child-across-separate-registrations
    - Reviewed full ticketing purchase path from seat display through checkout, payment webhook, and fulfillment
    - Audited Firestore indexes, transaction guards, and concurrent-booking prevention
    - Examined payment confirmation and webhook reconciliation logic

**Learned**: - Publishing schedule does NOT auto-generate numbered seats; that's a separate explicit step requiring staff action
    - Checkout opens only when competition schedule status is "ready" (not just "published")
    - Eligibility schedule in Ticket Pricing Settings gates WHO can buy WHEN, independent of seat readiness
    - Performance quota splits capacity between eligible-performer and public-orchestra buyers even without numbered seating
    - Payment webhook success does not guarantee fulfillment completion; partial failures leave bookings in paid-pending state needing staff reconciliation
    - Offline audit suite passes 147 tests covering simultaneous checkout, double-booking prevention, and capacity guards
    - Seat ownership tracked via physicalSeatKeys with transaction-protected updates; concurrent buyers cannot select same seat

**Completed**: - Removed empty orchestra rows from SeatOccupancy.js display (competition sessions only)
    - Updated documentation in SEAT_BOOKING_FLOW.md, TICKETING_SYSTEM_GUIDE.md, and progress.md to clarify the separate seat-generation gate
    - Ran complete offline audit suite (147 checks pass)
    - Code review of payment handlers, repository transaction patterns, and seat-ownership verification
    - ESLint verification on modified pages (0 errors, 1 existing Hook warning)

**Next Steps**: Complete the pending read-only Firestore check (with escalated permissions) to verify the active event's published competition sessions have generated seats and proper status. This will confirm ticket-sale readiness by checking seat counts across the first 10 sessions and validating the eligibility schedule for today's date. Upon completion, the full ticketing workflow audit will be documented with any discovered live-data gaps.


Access 980k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>

Access 193k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
