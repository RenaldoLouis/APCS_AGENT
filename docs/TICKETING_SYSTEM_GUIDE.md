# APCS Ticketing System Guide

Updated for the owner-confirmed business process on **19 September 2026**. This guide supersedes earlier instructions to select orchestra seats or sell Masterclass tickets. Implementation is local; deployment and owner UI acceptance are separate.

## Ticketing System menu

| Page | Staff responsibility |
| --- | --- |
| System Settings | Choose the active event and maintain sale eligibility |
| Venue Settings | Maintain venue labels (for example Behring Theatre or Titan Theatre), images and tier capacity |
| Performer Sessions | Set competition dates/times and generate numbered competition seats |
| Ticket Settings | Set ticket prices and remaining competition add-ons; Masterclass and orchestra seat-selection products are hidden and cannot be newly added |
| Orchestra Settings | Configure orchestra venue/date/time and winner attendance quota; view session headcounts |
| Orchestra Assignments | Assign paid winning performances to orchestra sessions and send/retry assignment emails |
| Seat Occupancy | Inspect numbered competition seats and historical orchestra seats; reconcile linked locked bookings |
| Admin Page | Save winners' competition performance assignments |

Masterclass Settings and Masterclass Assignments are removed from this menu. Public Customers remains a separate main-menu page for booking status, paid competition seat assignment, Mark Paid, cancellation audit details and email resend.

## Setup

1. Select the correct event in System Settings.
2. Check venue labels carefully: these names appear in buyer emails. Configure tier/row capacity and competition time slots.
3. Set competition and public ticket prices. Public orchestra tickets use `presto` and `allegro`; new Masterclass sales and Presto Masterclass benefits are disabled.
4. Add orchestra sessions from venue/date/time options. Each needs a **winner attendance quota**. Orchestra Settings no longer generates numbered seats or asks for reserved rows.
5. The winner quota reserves part of the overall venue capacity. The remaining capacity is available for direct public orchestra sales, still constrained by Presto/Allegro tier quantities. Do not treat free seating as unlimited attendance.
6. Save winners' competition assignments in Admin Page. They do not need an orchestra assignment before purchasing tickets.

The backend prevents reducing a quota below assigned/legacy demand, exceeding the venue capacity with paid reservations, moving/deleting sessions with active attendance, or reusing a competition slot with active bookings/performers. Other older configuration pages and live database access still require care; these checks are not a general migration tool.

## Winner purchases

The winner selects their name/winning performance, then buys tickets for the competition venue/date/time already assigned by the internal team. Ensemble member names remain visible. Competition seat selection and remaining add-ons retain their existing behavior.

The customer does **not** select an orchestra session or numbered orchestra seats. The checkout has four steps: entry, tickets, details, review/payment. There is no complimentary quota banner, free-orchestra-seat step, Masterclass add-on or complimentary Masterclass notice.

After payment, the orchestra group headcount is:

**all paid tickets bought using the winning performance + registered performers once per event**.

| Example | Orchestra attendance |
| --- | --- |
| Solo winner buys three tickets | 3 + 1 = 4 |
| Same solo winner later buys two more | 3 + 2 + 1 = 6 |
| Four-member ensemble buys three tickets | 3 + 4 = 7 |
| Another parent uses that ensemble and buys two more | 3 + 2 + 4 = 9 |

Pending, failed and expired purchases do not count as paid attendance. The performer allowance is shared across the ensemble, not repeated per buyer or booking. The initial payment email confirms the competition venue and ticket/seat details and states that the orchestra session will be assigned later.

## Public orchestra purchases

The buyer chooses an orchestra session, then Presto or Allegro quantities and contact details, and pays. There is no numbered seat map, seat-selection charge or Masterclass benefit. The payment confirmation names the orchestra venue/date/time and explains free seating within the purchased category. Public purchases do not receive extra performer places.

Public competition purchases remain available where configured; this change does not convert competition performances to free seating.

## Assign paid winners after payment

1. Open **Orchestra Assignments**. Refresh to load current paid groups. Use **Load more** when more paid-booking pages are available; a page may have no eligible winners.
2. Review each winning performance's paid ticket count, performer count, total attendance and already assigned quantity. The group total includes all its eligible paid purchases, even if its bookings span pages.
3. Select one orchestra session for the whole group. Remaining quota shown in the option excludes current allocations; re-saving the group's own session correctly credits its existing allocation before checking the new total.
4. Click **Assign & email**. The server rechecks the paid group and session capacity. It rejects insufficient quota rather than reducing the group entitlement.
5. Each covered booking buyer receives their booking reference, orchestra venue/date/time, own purchased quantity and shared group headcount. Seating is free; no seat numbers are assigned.
6. If delivery fails, the assignment stays saved. **Retry email** sends only missing deliveries for the current assignment revision. Refresh before retrying a busy send.

A later purchase does not invalidate existing confirmed places. For an ensemble that grows from seven to nine attendees, the table shows nine total and seven assigned. Staff must update the assignment to cover all nine. If the session cannot fit the additional attendees, choose another session that fits the entire group; all covered buyers receive the revised details.

Session changes produce a new assignment revision and fresh notifications to all covered bookings. Re-saving an unchanged assignment does not consume quota again. The email-send lease prevents simultaneous retries; after a crash during SMTP delivery, a retry can still duplicate an email if its success was not saved. There is no automatic background retry worker.

## Track event-day attendance

**Orchestra Settings** shows, per session:

- Paid public ticket quantity.
- Public quantities held pending payment/reconciliation, separately from confirmed attendance.
- Assigned winner group headcount.
- Confirmed attendance = paid public tickets + assigned version-2 winner headcount.
- Legacy complimentary allocations separately, because the historical counter includes holds and does not alone prove paid attendance.

Unassigned winner demand is shown in Orchestra Assignments. A session's confirmed attendance excludes those groups until staff assign them. Seat Occupancy is not the orchestra headcount report: its historical numbered seat documents do not represent new free-seating purchases.

## Confirmation and resend

Payment emails include the named booked venue, date/time, booking ID, paid ticket summary, competition seat labels and competition tickets still awaiting seat assignment. Free-seating orchestra confirmations do not imply a numbered seat reservation.

For winners, the initial email says orchestra assignment is pending. Once assigned, the separate assignment email includes the orchestra venue (such as Titan), date and time. Resending payment confirmation includes the saved orchestra assignment only when that booking is covered by it.

Venue names use the booking-time snapshot for new purchases and the booking's own event for older records. Switching the active sale event must not relabel an older booking's venue. Booking-ID/manual entry verification remains the admission method; no public-booking QR workflow is added.

## Historical bookings and payment safety

Existing bookings retain their seats and original Masterclass entitlements. Legacy source pages remain in the repository but are no longer active menu options. Do not delete historical data or regenerate orchestra seats to adopt free seating.

A winner with paid legacy complimentary orchestra allocations is explicitly flagged in Orchestra Assignments. Staff must reconcile that allocation before assigning a new version-2 group; the system does not silently move old seats or count performer places twice. No automatic historical migration is included.

Payment safety is unchanged:

- A local 30-minute deadline requests provider cancellation; it never independently frees inventory.
- Failed/unknown Paper.id outcomes retain holds until payment or cancellation is confirmed.
- Seat Occupancy cancellation operates on the whole linked booking, checks admin identity and complete owned inventory, and records an audit trail.
- Pending no-invoice checkouts cannot be manually released while invoice creation may still be in flight. A terminal failed no-invoice booking needs explicit provider verification.
- Only paid bookings receive numbered competition seat assignment. New free-seating orchestra bookings have no Assign Missing Seats action.
- Mark Paid remains a staff fallback after payment verification. New paid winner records appear in grouped attendance automatically.
- Delete remains restricted to reconciled terminal bookings. Use the cancellation/reconciliation flow for active records.

## Rollout and verification

Deploy the backend and frontend together, and include `apcs_web/firestore.indexes.json` (including the event/registrant booking index). Existing project authentication and Firestore access configuration remain in force; orchestra-admin APIs independently verify the Firebase token and whitelist.

Follow the [manual walkthrough](TICKETING_FREE_SEATING_WALKTHROUGH_2026-09-19.md). Local offline tests cover the rules and failure paths, but do not prove browser rendering, live Firestore contention/index availability, Paper.id behavior, or actual email delivery. No live bookings, invoices, assignments or emails were changed during implementation.

See [technical flow](SEAT_BOOKING_FLOW.md), [architecture](architecture.md), [progress](progress.md), and [the historical ticketing audit](TICKETING_AUDIT_2026-09-06.md) for the preserved payment/recovery limitations. Never use the test occupancy reset utility against customer bookings.
