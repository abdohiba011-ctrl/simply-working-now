## Goal
The "Find nearest agency" button on the Cash Plus voucher screen currently links to `https://www.cashplus.ma/agences` (a static list page). Replace it with a Google Maps search for "cashplus" centered on the user's current location, so renters instantly see the closest agencies on a map.

## Change (single file: `src/pages/BookingConfirmed.tsx`)

1. Replace the anchor on line 538-543 (`Find nearest agency`) with a button that:
   - Tries `navigator.geolocation.getCurrentPosition` (silent, with a 4s timeout).
   - On success → opens `https://www.google.com/maps/search/cashplus/@{lat},{lng},14z` in a new tab.
   - On denial / unavailable / timeout → falls back to `https://www.google.com/maps/search/cashplus` (Google centers on user's IP location automatically).
   - `target="_blank"`, `rel="noopener noreferrer"`.

2. Also update the WhatsApp/share text and any other "Find an agency" links in the same file (lines 375, 377) to point to the Google Maps search URL instead of `cashplus.ma/agences`, so the renter gets the same map experience when they share with a friend.

3. No copy change to the button label ("Find nearest agency") — it now actually does what it says.

## Out of scope
- No backend changes, no schema changes, no other pages.
- No persistent geolocation permission prompts or storage.
