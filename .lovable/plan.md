
# Unified Cities & Neighborhoods + Admin QA

## Goal

Make **Cities** the single source of truth in the admin: each city owns its **neighborhoods** (currently called "locations"). One screen to add/edit/delete a city, manage its image, availability, and neighborhoods inline. Everything that consumes cities or neighborhoods on the **renter** and **agency** sides reads live from the database — no hardcoded lists.

Then QA every admin tab end-to-end.

---

## Part 1 — Unified Cities admin (replaces separate Cities + Locations tabs)

### New screen: `AdminCitiesTab` (rebuilt)

Layout:
```text
[ Stats badges: Total / Available / Coming Soon / On Homepage ]
[ Search + Add City ]

Cities table
┌────────┬──────────────┬────────┬──────────┬──────────┬────────┬─────────┐
│ Image  │ City         │ Hoods  │ Bikes    │ Status   │ Home   │ Actions │
└────────┴──────────────┴────────┴──────────┴──────────┴────────┴─────────┘
   ↘ click row → expands inline panel:
       • City details form (name, image upload, price_from, available toggle,
         coming-soon toggle, show-on-homepage toggle, display_order)
       • Neighborhoods list for this city:
            - drag to reorder
            - inline rename
            - active toggle, popular toggle
            - delete (blocked if linked inventory, with count shown)
            - "Add neighborhood" inline input
       • Save / Cancel
```

- "Locations" tab is **removed** from the admin sidebar. Existing data stays — same `service_locations` table, just renamed in the UI to "Neighborhoods" and surfaced inside each city.
- Image upload reuses `CityImageUpload` (already wired to storage).
- Delete city: if it has neighborhoods or linked inventory, show counts and block; otherwise confirm and delete.

### Translations
Add/replace keys in `src/locales/{en,fr,ar}.json` for: `admin.neighborhoods`, `admin.addNeighborhood`, `admin.cityDetails`, etc. Keep existing `admin.cities` label. Drop `admin.locations` from the tab list.

---

## Part 2 — Live data on renter & agency sides

Replace hardcoded city/neighborhood arrays with live queries to `service_cities` + `service_locations`. Cache via React Query (5-min stale) so it stays snappy.

New hook: `src/hooks/useServiceCities.ts`
- `useServiceCities()` → all cities (with `is_available`, `is_coming_soon`, `show_in_homepage`, `image_url`).
- `useNeighborhoods(cityId | cityName)` → active neighborhoods for a city.
- `useAvailableCities()` → only `is_available = true`.
- Subscribes to realtime on both tables so changes in the admin reflect everywhere within seconds (already partially done via `useServiceCitiesRealtime`).

### Files to migrate off hardcoded data
- `src/pages/auth/Signup.tsx` — drop `NEIGHBORHOODS` const, use `useNeighborhoods(cityValue)`.
- `src/components/HeroSection.tsx` — load neighborhoods for the selected city from DB.
- `src/pages/RentCity.tsx` — drop `NEIGHBORHOODS_BY_CITY`, use the hook.
- `src/components/CitiesAvailableSection.tsx` and `src/components/TopCitiesSection.tsx` — already DB-driven, just verify image/`show_in_homepage`/`is_available` filtering matches the new admin toggles.
- `src/pages/Listings.tsx` — already DB-driven; confirm filter dropdown shows only available cities and their active neighborhoods.
- `src/pages/agency/Profile.tsx` and `src/pages/BecomeBusiness.tsx` — city + neighborhood selectors driven by the hook.
- `src/components/admin/client-details/CreateBookingDialog.tsx` — already DB-driven, verify it still works after UI rename.

### Effects of admin edits (verified after change)
- Renaming a city → updates city name in HeroSection, Listings, RentCity, agency profile selector, footer, etc.
- Toggling `is_available = false` → city disappears from search filters and Listings; existing bookings/bikes are not deleted.
- Toggling `show_in_homepage = false` → city no longer appears on `CitiesAvailableSection` / `TopCitiesSection`.
- Toggling `is_coming_soon = true` → city renders with "Coming soon" badge and is non-selectable in booking flows.
- Editing/uploading a city image → updates everywhere the image is displayed.
- Adding/renaming/removing a neighborhood → updates the dropdown in renter search filters, agency signup, and admin booking creation.

---

## Part 3 — Admin QA pass (every tab)

For each tab below, check: data loads without errors, search/filter works, action buttons work end-to-end, counts match the rows displayed, and no console errors.

| Tab | What we verify |
|---|---|
| Bookings | List loads, filters (status/date/city), open detail drawer, confirm/reject/assign actions |
| Fleet | Bikes list, location dropdown shows new neighborhoods, approve/reject works |
| **Cities** (new unified) | Add/edit/delete city, image upload, all toggles, manage neighborhoods inline, drag-reorder, delete blocked when linked |
| Pricing | Pricing tiers load and render |
| Clients (Unified) | Counts match rows; Pending/Verified/Blocked filters; row click → details |
| Individual Owners | Loads, search, row click |
| Rental Shops / Agency Verifications | Loads, signed-URL documents render, approve/reject sends notification |
| Employees | List loads, super-admin can manage permissions |
| Analytics | Charts render with current data |
| Email Test | Send-test action returns success |

Any broken interaction discovered during QA gets fixed in the same change set (small fixes only — anything large is reported back).

---

## Technical notes

- DB schema is already correct: `service_locations.city_id` FK to `service_cities` with `ON DELETE CASCADE`. No migration needed.
- RLS already permits public SELECT on both tables; admin writes are admin-only via existing policies. No new policies required.
- Realtime channel `service_cities_changes` already exists; add a parallel one for `service_locations` so neighborhood edits propagate live.
- Bundle: removing the separate `AdminLocationsTab` from the panel reduces one route load; the file is kept on disk for now (unused) so we don't break any deep links — we can delete in a follow-up.
- No changes to bookings/bikes data; only the UI layer that lists cities/neighborhoods.

---

## Out of scope

- Renaming the database table `service_locations` → `neighborhoods` (cosmetic, risky, defer).
- Bulk import of neighborhoods from a CSV.
- Per-neighborhood images.
