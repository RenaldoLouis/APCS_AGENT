# Venue Seat Map SVG Contract

Added 26 October 2026. **Seat Occupancy → View Layout → Download image** draws the venue image uploaded in **Venue Settings** with the selected session's seat data. A script can only find a seat when the SVG names it, so every uploaded seat map must follow this contract.

## Rules

1. The file is an SVG with a `viewBox`, uploaded through **Venue Settings → Venue Image**. Firebase Storage then serves it as `image/svg+xml`.
2. Every numbered seat shape (`rect` or `path`) has `id="<row><number>"`, for example `id="A4"`. Row letters and numbers match the venue's saved rows in Venue Settings (`seatConfig`).
3. Every seat number `<text>` has `id="<row><number>-num"`, for example `id="A4-num"`.
4. Seats are drawn in their tier colour. A seat may be drawn grey only when the team keeps it out of sale for the whole event, and it must then be blocked in **every** session of the venue (**Seat Occupancy → View Layout → Block seat**). The download never recolours a seat, so a drawn-grey seat stays grey; if it were available in a session, the image would hide a seat that the public seat picker still sells. Never draw sold seats grey: the download greys them from live data.
5. IDs are unique in the file.

The public booking page shows the same image next to the seat picker, so the uploaded file is also what buyers see.

## Prepare a designer file

The designer's export usually has no seat IDs. Run the normalization script; it only adds or replaces `id` attributes and leaves the drawing, including seats drawn grey, untouched:

```bash
cd apcs_service
curl -s https://api.apcsmusic.com/api/v1/apcs/public-ticket/event-data -o .local/event-data.json
node scripts/normalize_seat_map_svg.js --svg <designer.svg> --venue .local/event-data.json \
  --venue-id <venue id> --out ../docs/seat-maps/<Venue>-seat-map.svg
```

The script matches each seat number to the seat shape around it, assigns rows from top (nearest the stage) to bottom in row-letter order, and checks that every row has seats 1 to its configured count. It writes nothing and names the problem when a row, seat or number does not match. It lists the seats drawn grey so you can check they are blocked in every session. Tests: `node --test scripts/normalize_seat_map_svg.test.cjs`.

Open the output in a browser or Quick Look and compare it with the designer file before uploading it in **Venue Settings → Edit → Venue Image → Save**.

## APCS2026 files (26 October 2026)

| Venue | Live file before | Result of the script |
|---|---|---|
| Behring Theatre (`Venue_lnssq2n1`) | `Behring-01-01-6seats.svg`: seat IDs present, numbers without IDs, 15 seats drawn grey by team decision (A1–A3, A10–A12, B1–B2, B10–B12, C5–C8) | 76 seats in rows A–F (12) and G (4); the 15 grey seats kept. On 26 October 2026 all 15 were blocked in all five Behring competition sessions |
| Titan Theatre (`Venue_mvfyegwz`) | `Titan-02-02-numbered.svg`: Illustrator export without seat IDs | 187 seats in rows C–M; no seats drawn grey |

The prepared files are in [`docs/seat-maps/`](seat-maps/). Apart from the `id` attributes they are identical to the live files, so buyers see the same image after the upload. Until they are uploaded, **Download image** stops with a list of seats it cannot find. If a new Behring session is added later, block the 15 seats there too.

## Changing the venue image during live sales

Replacing the image in **Venue Settings** is safe after seats are generated and the competition schedule is locked/published (checked 26 October 2026):

- Only the image changes. Venue Settings sends an image-only save (`/metadata`, label and image) when the seat rows are unchanged; a test with the live Behring and Titan rows confirmed the form returns them unchanged. Editing rows instead is refused once seats exist, without writing anything.
- The save is a transaction on `events/{eventId}` that replaces only that venue's `label` and `imageUrl`. Sessions, seat rows, `competitionScheduleState`, seat documents, ticket capacity, bookings and session assignments are untouched. Publishing keeps `imageUrl` (`{ ...venue, sessions }`). A checkout or planning transaction that reads the event at the same instant waits or retries automatically.
- Checkout, payments, emails, seat assignment and redemption never read `imageUrl`. Only the public booking page (display) and **Download image** do.
- Uploads get a new Storage file name and old files are never deleted, so a buyer who opened the page before the change still sees the old image; new page loads show the new one (no caching).
- Keep the venue name unchanged: emails and pages show it.

## What the download does

- Reads the SVG through the admin-only `GET /api/v1/apcs/venue-settings/:eventId/:venueId/seat-map`. Firebase Storage sends no CORS headers, so the browser cannot read the file itself.
- Greys a seat when its status is `booked`, `reserved`, `locked` or `blocked`, or when its tier has no tickets left in **Actual ticket availability**. Tickets bought without a seat number use tier capacity, so free-looking chairs of a sold-out tier are not available.
- Adds the venue, date, display time (WIB), tickets left per tier, snapshot time and a legend, then saves a PNG at twice the SVG size, for example `Behring-Theatre_2026-11-14_11-05-13-20_seats.png`.
- Stops with a message instead of drawing a misleading map when the SVG misses a seat, the image is not an SVG, or availability could not be loaded.
