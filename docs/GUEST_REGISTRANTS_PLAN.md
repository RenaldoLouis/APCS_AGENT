# Guest registrants in APCS2026 groups

Owner-confirmed scope: APCS2025 registrations can join both APCS2026 performance groups and orchestra attendance groups without changing the source registration. Missing eventId means APCS2025. Missing video, duration and other optional metadata do not block grouping.

1. Add a separate Other Event Registrants tab to the existing assignment pool. Load the APCS2025 source explicitly and paginate by document ID so missing createdAt/eventId does not exclude older documents. Search/filter locally and retain current-event statistics and auto-assignment scope.
2. Hydrate saved guest IDs independently of the source tab, so saved groups survive reload. Reuse existing registrantIds and revision-checked save paths for both group types.
3. At publication, validate real source documents and allow the specific APCS2025-to-APCS2026 guest relationship. Persist backend-derived sourceEventId on published performance entries. Discovery and checkout accept guest performers only through that published assignment, including a fresh transaction check. Keep award, readiness, attendance-only, seat and payment rules.
4. Verify incomplete legacy records, save/reload/publication and ticketing eligibility with focused code tests and the offline audit suite. Record manual owner acceptance steps; do not launch a browser or change live records.
