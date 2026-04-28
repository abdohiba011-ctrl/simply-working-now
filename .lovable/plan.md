# Merge Cities & Locations into one "Cities" admin page

## Goal
Replace the two separate admin tabs (Cities + Locations) with a single **Cities** tab where each city is a card/row that expands to show and manage its neighborhoods inline. Renter side and agency side keep working unchanged because the underlying tables (`service_cities`, `service_locations`) stay the same.

## What you'll see in the admin panel

A single tab called **Cities**. Each city appears as an expandable card showing:
- City image, name, status badges (Available / Coming Soon / On Homepage)
- Bike count, neighborhood count
- Buttons: Edit city, Delete city, Add neighborhood
- Expanding the card reveals the list of that city's neighborhoods, each with: name, popular toggle, active toggle, rename, delete

A top toolbar with: Search, Refresh, **+ Add city** button.

```text
┌─ Cities ──────────────────────────────────────────────┐
│  [search]                       [refresh] [+ Add city]│
├───────────────────────────────────────────────────────┤
│ ▸ Casablanca   [Available] [Homepage]  12 bikes  8 nb │
│ ▾ Marrakech    [Available]              7 bikes  6 nb │
│      • Gueliz       [popular] [active]  edit  delete  │
│      • Medina       [        ] [active]  edit  delete │
│      [+ Add neighborhood to Marrakech]                │
│ ▸ Rabat        [Coming soon]            0 bikes  4 nb │
└───────────────────────────────────────────────────────┘
```

## Behavior

**City management** (same as today's Cities tab):
- Add city, rename city, edit image / price-from / homepage flag / availability / coming-soon
- Delete city (with the existing safety check showing how many neighborhoods will be orphaned)

**Neighborhood management** (same as today's Locations tab, but scoped per-city):
- Add neighborhood directly under its city (no city dropdown needed — context is the parent card)
- Rename neighborhood, toggle popular, toggle active, delete
- Drag-to-reorder within the same city (kept from current Locations tab)

## Effect on the rest of the app
None. The renter search and agency dashboard read from the same `service_cities` and `service_locations` tables, so editing here updates them live as before.

## Technical details

- Create `src/components/admin/AdminCitiesTab.tsx` (rewritten) that combines the logic of the current `AdminCitiesTab` and `AdminLocationsTab`. Use a single fetch that pulls cities + locations together, groups locations by `city_id` in memory, and renders an expandable list (Accordion or controlled `useState<Set<string>>` of expanded city IDs).
- Reuse existing pieces: `CityImageUpload`, `useServiceCitiesRealtime`, `AdminTableSkeleton`, the existing dialogs for add/edit/delete city.
- Add a small "Add neighborhood" inline form/dialog inside each expanded city card (city_id pre-filled, hidden).
- Delete the old `AdminLocationsTab.tsx` file.
- Update `src/pages/AdminPanel.tsx`:
  - Remove the `locations` tab from `TabValue`, `tabConfig`, the tab list, and the render switch
  - Remove the `AdminLocationsTab` import
  - Keep only the `cities` tab pointing to the new merged component
- Update admin permissions check: any user who currently has `locations` permission should still see the Cities tab. Either grant access if they have `cities` OR `locations`, or migrate their permission JSON. Simpler: in the permission check for the Cities tab, accept either flag.
- No database migration needed — schema already supports the city → neighborhoods relationship via `service_locations.city_id`.

## Out of scope
- No changes to the renter-facing city pages or agency dashboard UI.
- No bulk import / CSV.
- Map/coordinates editing stays as-is (still on the city edit dialog if currently there).
