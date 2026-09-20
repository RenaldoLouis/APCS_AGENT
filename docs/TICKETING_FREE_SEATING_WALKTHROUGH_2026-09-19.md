# Manual acceptance — ticketing free seating

Use a controlled test event and test recipients. This is the owner-run browser checklist; the agent did not launch a browser or send real email.

1. **Winner checkout:** select a solo winner. Confirm competition venue/date/time is prefilled, no orchestra selector appears, and checkout has four steps. Check that competition seat-selection still works when purchased.
2. **Masterclass removal:** verify no Masterclass sessions, ticket/add-on controls, complimentary Presto notice or Masterclass summary rows appear. Confirm historical Masterclass data remains in Public Customers where applicable.
3. **Ensemble count:** with four registered members, pay for three tickets. Orchestra Assignments must show `3 + 4 = 7`. Buy two more through another buyer using the same winner: it must show `5 + 4 = 9`. Pending/failed purchases must not change that paid total.
4. **After-payment assignment:** confirm the initial receipt names the competition venue (Behring/Titan as configured), shows purchased competition seats/unassigned quantity, and says orchestra assignment pending. Assign the paid group to an orchestra session; each buyer should receive that orchestra venue/date/time and free-seating details.
5. **Repeat after assignment:** assign the initial seven before paying for the extra two. The page must show nine total, seven assigned and two awaiting assignment. Re-save the group to cover all nine; verify quota increases by two and revised emails reach both buyers.
6. **Capacity and retry:** try a session with insufficient winner quota; it must reject the whole assignment without truncating the nine attendees. Re-save an unchanged assignment and verify no double count. Reassign to another session and verify old/new counts and updated emails.
7. **Email failure:** simulate delivery failure in a non-production environment. Assignment remains saved; Retry email sends missing confirmations without re-sending recorded successes. A concurrent send should show a busy/retry response.
8. **Public orchestra:** choose a session and Presto/Allegro quantities. Confirm no numbered seats or add-ons appear. The receipt must name the selected venue/session and say free seating within the ticket category. Public Customers must not offer numbered seat assignment.
9. **Admin totals:** Orchestra Settings should show paid public attendance, pending public holds, assigned winners and confirmed total separately. Seat Occupancy's orchestra entries are explicitly historical numbered-seat records.
10. **Settings protection:** reject reducing quota below existing assignments, overallocating venue capacity, deleting/moving an active session, or converting a competition slot with assigned performers. Adding an empty orchestra session must not generate seat documents.
11. **Historical boundary:** a winner with an old paid complimentary allocation must show a reconciliation flag and block new group assignment; existing booking seats and benefits remain intact. Check an old pending booking's payment/cancellation path against test provider data.
12. **Venue correctness:** after a controlled active-event switch, resend an older booking confirmation. It must still use its own event's venue or saved venue snapshot.

Deploy backend/frontend and required indexes together before this acceptance pass. The database CLI was unavailable in the local offline cache, so the live database edition/index state was not checked. No database deployment or live migration was attempted.
