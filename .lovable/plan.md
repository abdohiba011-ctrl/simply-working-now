## Goal

In the header "More" dropdown (desktop and mobile), reorder the items and disable the Mechanics link so it appears as "Coming Soon". The `/fixers` page and route stay in the codebase untouched, ready to re-enable later by reverting one small block.

## New order in "More"

1. Agencies (active link → `/agencies`)
2. About Us (active link → `/about`)
3. Contact Us (active link → `/contact`)
4. Booking Fee & Terms (active link → `/booking-fee`)
5. Mechanics — Coming Soon (non-clickable)
6. Marketplace — Coming Soon (non-clickable, already exists)
7. GPS Tracking — Coming Soon (non-clickable, already exists)

## Changes

### `src/components/Header.tsx`

Desktop dropdown (lines ~378–407):
- Reorder the grid items to match the order above.
- Replace the Mechanics `<Link to="/fixers">` with the same disabled "Coming Soon" tile pattern already used for Marketplace / GPS Tracking (muted icon, `opacity-60 cursor-not-allowed`, no link).

Mobile menu (lines ~753–762):
- Apply the same reorder.
- Replace the Mechanics `<Link to="/fixers">` with a muted non-clickable row using the same pattern as Marketplace / GPS Tracking.

### What stays untouched

- `src/pages/Fixers.tsx` — kept as-is.
- The `/fixers` route in `App.tsx` — kept as-is.
- All translation keys (`header.fixers`, etc.) — kept as-is.

### Re-enabling later

When Mechanics goes live, the only change needed is to swap the disabled Mechanics tile back to the original `<Link to="/fixers">` block (one tile in desktop, one row in mobile). No data, no routing, no page changes.

## Out of scope

- No changes to the Fixers page content, no route removal, no translation cleanup.
- No changes to the auth/avatar dropdown or the rest of the header.
