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

**Competition Division**:
The ensemble entry type stored as `instrumentCategory`, such as Professionals B or Guzheng Ensemble. It is distinct from an Age Category even when the registration flow assigns an eligibility age to it.
_Avoid_: Ensemble age category
