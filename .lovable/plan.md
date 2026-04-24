## Plan

Fix the city/neighborhood navigation so each city only shows its own neighborhoods and never falls back into Casablanca by accident.

### What I’ll change

1. Route search flows directly to city pages
- Update the hero search in `src/components/HeroSection.tsx` to navigate to `/rent/:city` instead of `/listings`.
- Preserve the selected neighborhood and dates in the query string when moving to the city page.
- Normalize city names to the route format used by `RentCity` so cities like Marrakech/Marrakesh resolve correctly.

2. Stop legacy links from forcing Casablanca
- Replace old `/listings?...` links in places like:
  - `src/components/TopCitiesSection.tsx`
  - `src/components/Footer.tsx`
  - any other public links still pointing at `/listings`
- Make them point to `/rent/<city-slug>` with city-correct query params.

3. Make `RentCity` accept both old and new query param shapes safely
- Keep neighborhood selection scoped to the current route city.
- Add compatibility so if an old link still passes `location` or other legacy params, the page only applies them when they belong to the current city.
- If a neighborhood does not belong to the selected city, reset to that city’s “All <City>” option.

4. Keep data filtering locked to the route city
- Preserve the existing database filter by `city_id` in `src/pages/RentCity.tsx`.
- Tighten the UI state initialization so filters come from the active city route first, not from stale generic listing params.

### Expected result
- `/rent/casablanca` shows only Casablanca neighborhoods.
- `/rent/marrakech` shows only Marrakech neighborhoods.
- Switching city no longer carries over a neighborhood from another city.
- Clicking city cards, footer links, or hero search will open the correct city page instead of redirecting through Casablanca.

### Technical details
- Root cause: `App.tsx` currently redirects `/listings` to `/rent/casablanca`, while some components still navigate to `/listings?city=...`. That drops the selected city and creates a Casablanca fallback.
- No backend or database changes are needed.
- Main files likely affected:
  - `src/components/HeroSection.tsx`
  - `src/components/TopCitiesSection.tsx`
  - `src/components/Footer.tsx`
  - `src/pages/RentCity.tsx`
  - possibly `src/App.tsx` for safer legacy redirect behavior
