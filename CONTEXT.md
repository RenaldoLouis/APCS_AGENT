# APCS Competition

This context defines the language used for competition registration, jury assessment, penalties, and awards.

## Language

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

**Orchestra attendance**:
All paid tickets purchased for one winning performance within an event plus its registered performers once. A solo adds one performer; an ensemble adds its members, shared across all purchases.
_Avoid_: Per-purchase performer bonus, one place per ensemble

**Free seating**:
Admission without an individual numbered seat reservation. Public orchestra buyers choose Presto or Allegro; staff choose winners' orchestra sessions after payment.
_Avoid_: Unlimited attendance

**Orchestra assignment**:
The venue, date, time and attendee quantity allocated by staff to a winning performance's paid group after payment, without individual orchestra seat numbers.
_Avoid_: Orchestra seat assignment

**Admin seat assignment**:
Staff selection of the physical seat for a paid ticket whose buyer did not purchase the corresponding seat-selection add-on. Only bookings with confirmed payment qualify.
_Avoid_: Automatic assignment

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
