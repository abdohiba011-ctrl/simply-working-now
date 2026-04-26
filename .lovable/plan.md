## Goal
Make the bike count shown on each city card reflect **reality**: count actual approved, active, available bikes per city. Show **0** honestly when a city has none. No more admin-typed fake numbers.

## Current bug
`service_cities.bikes_count` is a manually-typed number stored in the DB (e.g. Casablanca = 400, Marrakech = 10) but the actual catalog has Casablanca = 12, Marrakech = 0, Rabat = 0. This violates the "never fake stats" rule from project knowledge.

## Solution: compute counts live from `bike_types` joined to `service_cities`

### 1. Create a database view `city_bike_counts` (read-only, public)
```sql
CREATE OR REPLACE VIEW public.city_bike_counts AS
SELECT
  sc.id AS city_id,
  sc.name,
  COUNT(DISTINCT bt.id) FILTER (
    WHERE bt.is_approved = true
      AND COALESCE(bt.business_status, 'active') = 'active'
      AND COALESCE(bt.availability_status, 'available') = 'available'
  ) AS bikes_available
FROM public.service_cities sc
LEFT JOIN public.bike_types bt ON bt.city_id = sc.id
GROUP BY sc.id, sc.name;
```
Grant SELECT to `anon` and `authenticated`. No RLS needed (it's a view over already-public data).

### 2. Update `TopCitiesSection.tsx`
- Fetch `service_cities` as today **plus** the new `city_bike_counts` view in parallel.
- Display the live `bikes_available` value (showing `0` when zero).
- For cities with 0 bikes that are still marked available: show "0 bikes available · check back soon" instead of an active CTA, OR keep the link but show the honest 0. (Recommend: keep clickable, show honest 0 — users will see the empty state on `/rent/{city}` which is already built.)
- Realtime subscription on `bike_types` so counts update when bikes are added/removed.

### 3. Update `AdminCitiesTab.tsx`
- Remove the manual `bikes_count` input field from Add and Edit dialogs.
- Replace the table's `bikes_count` column with a read-only "Live count" pulled from the view.
- This prevents admins from ever typing fake numbers again.

### 4. Deprecate the column (non-destructive)
Leave `service_cities.bikes_count` in place to avoid breaking anything else, but stop reading and stop writing to it. Optional follow-up migration can drop it later.

### 5. Verify
After deploy:
- Casablanca card → shows **12**
- Marrakech card → shows **0**
- Rabat card → shows **0**
- Add a new bike via admin → corresponding city count goes up live
- Disable/reject a bike → count goes down live

## Files changed
- New migration: `create view city_bike_counts + grants`
- `src/components/TopCitiesSection.tsx` — fetch view, display live count
- `src/components/admin/AdminCitiesTab.tsx` — remove manual input, show live read-only count
- (No changes needed to `RentCity.tsx` — it already filters real bikes)

## Out of scope
- Neighborhood-level counts (Casablanca → Bouskoura, etc.) — can be a follow-up
- Coming-soon cities stay as configured by admin (handled separately by `is_coming_soon` / `is_available` flags)
