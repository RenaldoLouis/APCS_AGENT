# Project Conventions & Constraints

## 🚫 Restricted Commands
- **NEVER** run `npm run start`.
- **NEVER** run `npm run build`.
- **ALWAYS** use `yarn` instead of `npm` for installing dependencies.

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