# APCS Competition

This context defines the language used for competition registration, jury assessment, penalties, and awards.

## Language

**Verified late-payment recovery**:
Staff confirmation of a payment received for an expired booking, restoring its original tickets and seats only when those places can still be honored. Conflicting seats or uncertain capacity require separate staff review; payment verification alone does not authorize taking another customer's place.
_Avoid_: Status override, forced payment, seat block

**Competition Display Time Revision**:
An optional replacement time range shown to ticket buyers on the booking page and in subsequently sent ticket emails. It leaves the locked competition schedule, group membership and order, seats, payments and admission entitlements unchanged; saving it does not notify existing buyers.
_Avoid_: Rescheduling, session time change

**Venue attendance confirmation**:
A registrant's stated intention to attend the venue for the current winner-confirmation campaign. It applies to the entire solo/ensemble registration. It is distinct from performing, check-in, admission, payment and orchestra group membership. Unclear/blank imported responses count as not attending by the owner's chosen rule.
_Avoid_: Paid attendance, checked-in performer, confirmed performance

**Shared Ensemble Result PDF**:
A comment sheet or certificate covering named members of an ensemble. Each named performer receives the shared document in their own result email.

**Jury Assessment Lock**:
The finalized state that prevents a jury member from changing a submitted score or comment. It does not freeze derived penalties, averages, or awards.
_Avoid_: Final result lock, award lock

**Video Duration Limit**:
The maximum whole-minute duration assigned to an event and exact registration combination. Fractional padding within the maximum second is allowed; the video becomes over-limit at the next whole second.
_Avoid_: Global video threshold, video range

**Automatic Video Penalty**:
The event-wide point deduction applied once when a registrant's video exceeds its matched Video Duration Limit.
_Avoid_: Per-minute penalty

**Manual Penalty**:
An administrator-applied deduction that is independent of the Automatic Video Penalty and is added to it when both apply.

**Derived Award Result**:
The average and award calculated from effective jury scores, the Automatic Video Penalty, and any Manual Penalty. It may be recalculated while jury assessments remain locked.
_Avoid_: Finalized score

**Award Synchronization**:
The explicit admin action that compares each live Derived Award Result and configuration revision with the stored registrant result, then persists only records that differ. It includes registrants whose jury assessments are locked.
_Avoid_: Final score lock

**Competition Division**:
The ensemble entry type stored as `instrumentCategory`, such as Professionals B or Guzheng Ensemble. It is distinct from an Age Category even when the registration flow assigns an eligibility age to it.
_Avoid_: Ensemble age category
# APCS

APCS runs music competitions and related audience events. This glossary records the ticketing terms clarified with the project owner.

## Language

**Winning performance**:
A winning competition entry, either solo or ensemble. An ensemble counts as one performance regardless of its number of members.
_Avoid_: One winning performance per ensemble member

**Provisional competition group**:
An internal ordered group of performers for a known venue and date whose exact performance time has not yet been published for ticket sales.
_Avoid_: Ticketable session, placeholder time slot

**Draft competition session**:
An internal venue and date slot that can receive a final time and be linked to one provisional competition group. It is not available to ticket buyers until publication and seat verification.
_Avoid_: Published competition session, buyer-visible timeslot

**Published competition session**:
A competition group with a finalized venue, date and time made available to ticketing setup. Ticket sales begin only after its numbered seats are verified ready.
_Avoid_: Provisional group, freely editable time

**Orchestra attendance**:
All paid tickets purchased for one winning performance within an event plus its registered performers once. A solo adds one performer; an ensemble adds its members, shared across all purchases.
_Avoid_: Per-purchase performer bonus, one place per ensemble

**Free seating**:
Admission without an individual numbered seat reservation. Public orchestra buyers choose Presto or Allegro; staff choose winners' orchestra sessions after payment.
_Avoid_: Unlimited attendance

**Operational seat block**:
A numbered competition chair kept out of sale for a specific session for photography, equipment or another staff purpose. Staff can remove the block; it cannot replace a customer's booked or held chair or the space already promised to ticket holders.
_Avoid_: Customer reservation, checkout lock, venue-wide block

**Staff-managed orchestra capacity**:
The owner's policy that staff arrange sufficient orchestra admission space independently of the competition's numbered-seat layout, without a software admission-capacity ceiling. It applies to orchestra sessions only; numbered competition seating keeps its layout limits.
_Avoid_: Guaranteed unlimited physical seating

**Informational performance quota**:
The orchestra session's performance-linked attendance number kept for staff planning. It never blocks an orchestra assignment, Orchestra Settings save or direct orchestra sale.
_Avoid_: Orchestra capacity limit, assignment guard

**Orchestra assignment**:
The venue, date, time and attendee quantity allocated by staff to a winning performance's paid group after payment, without individual orchestra seat numbers.
_Avoid_: Orchestra seat assignment

**Orchestra session**:
A free-seating audience event with its own venue, date and time, created independently of competition performer sessions. Its venue cannot host overlapping orchestra, competition or historical Masterclass sessions, including timed competition drafts.
_Avoid_: Extra competition session, numbered orchestra session

**Orchestra attendance group**:
An admin-organized group of registered orchestra attendees, independent of their competition performance group. A child may belong to both and retain their ticketable performance; attendance membership alone grants no ticket, admission or confirmed orchestra assignment.
_Avoid_: Orchestra performance group, paid attendance group

**Planned orchestra session**:
An optional orchestra session chosen for an attendance group before ticket purchases. It suggests the later paid assignment, which staff must separately confirm; it grants no admission and does not replace an existing confirmed assignment.
_Avoid_: Confirmed orchestra assignment, automatic admission

**Guest registrant**:
An existing registrant from a different event invited into the current event's performance or orchestra attendance group. Their original registration and results stay with the source event; a performance assignment can qualify them for the destination event's existing ticketing rules.
_Avoid_: Unregistered child, transferred registration

**Payment receipt**:
The durable record of a provider's paid notification for a public booking, stored before fulfillment and replayed until applied or sent to staff review. It marks a booking paid only when the invoice identity is the booking's saved one or is confirmed by the provider's invoice API.
_Avoid_: Callback log, payment confirmation

**Admin seat assignment**:
Staff selection of the physical seat for a paid ticket whose buyer did not purchase the corresponding seat-selection add-on. Only bookings with confirmed payment qualify.
_Avoid_: Automatic assignment

**Documentation-only customer**:
A customer whose documentation purchase was paid outside the system and recorded by staff. The record grants no seat, event admission, orchestra attendance or ticket redemption, and its payment status is always Paid.
_Avoid_: Seatless ticket, free-seating booking, unpaid documentation order

**Booking buyer contact**:
The buyer's name, email and phone attached to one ticket purchase, distinct from the performer or registrant's contact details. Staff may correct it while the booking is pending; an already-issued payment invoice retains its original contact details.
_Avoid_: Registrant profile, invoice customer update

**Historical Masterclass pass assignment**:
After confirmed payment, an admin assigns paid Masterclass add-on passes together with any complimentary passes from one booking to the same Masterclass session, then emails the buyer. Masterclass ticketing is outside the current sales process; this term applies only to historical entitlements.
_Avoid_: Customer-selected free Masterclass session

**Historical standalone paid Masterclass ticket**:
A standalone ticket remains attached to the Masterclass session selected by the customer during checkout. Paid Masterclass add-on passes follow admin assignment instead.
_Avoid_: Treating all paid Masterclass products as customer-selected sessions

**Ticketing administrator**:
A whitelisted user authorized to perform all ticketing administration actions.
_Avoid_: An additional ticketing-admin role required beyond whitelist membership

**Public ticket entry verification**:
Staff manually verify the booking ID at entry; a public-ticket QR code is not required.
_Avoid_: Mandatory QR check-in

**Ticket redemption**:
Staff handing over some or all tickets covered by a paid booking for a particular session. Performance and orchestra tickets are redeemed independently; redemption is distinct from payment, seat allocation and a stated intention to attend.
_Avoid_: Mark paid, attendance confirmation

**Shared performer allowance**:
The complimentary orchestra places for performers in one paid performance group, counted once across all of that group's bookings. Redeeming a buyer's purchased tickets does not consume these performer places.
_Avoid_: Performer bonus per booking

**Venue layout lock**:
The point at which any numbered seat exists for a venue and its rows, capacities and ticket tiers can no longer be edited. Publication alone does not trigger the lock. Venue name and image remain editable.
_Avoid_: Publication lock, only occupied seats lock
