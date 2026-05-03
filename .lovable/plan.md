# Diagnosis: Anonymous users see 0 bikes in every city

## Root cause

Two views are defined with `security_invoker=on`:

- `public.bikes_public` — used by `useBikes`/`useBike` to show bike listings to renters
- `public.city_bike_counts` — used by `TopCitiesSection` to show "X bikes available" per city

`security_invoker=on` means the view runs with the **caller's** RLS, not the view owner's. Both views internally read from `public.bikes`. The `bikes` table has these SELECT policies:

- `Owners can view own bikes` → authenticated only
- `Admins can view all bikes` → authenticated only
- `Authenticated can view available bikes` → **role = authenticated**

There is **no policy granting `anon` SELECT on `bikes`**. Result: when a logged-out renter loads the homepage or a city page, both views return empty/zero — even though `bike_types` itself is readable by anon and has 8 approved Casablanca bikes from a verified agency.

This explains:
- "0 bikes available" on every city card on the homepage (network log confirms `city_bike_counts` returns `bikes_available: 0` for all 8 cities, including Casablanca which actually has 8 approved bikes).
- Logged-out renters seeing no bikes in `useBikes` / bike detail pages that go through `bikes_public`.

Logged-in users work fine because the `Authenticated can view available bikes` policy lets them through both views.

## Fix

Make both views run with definer privileges (they already filter to safe rows/columns, so this is the standard pattern for public catalog views):

```sql
ALTER VIEW public.bikes_public        SET (security_invoker = off);
ALTER VIEW public.city_bike_counts    SET (security_invoker = off);
GRANT SELECT ON public.bikes_public      TO anon, authenticated;
GRANT SELECT ON public.city_bike_counts  TO anon, authenticated;
```

Safety check (already true today and preserved):
- `bikes_public` excludes sensitive columns (`license_plate`, `notes`) — confirmed in earlier audit.
- `city_bike_counts` only exposes city id, name, and an aggregate count — no PII.
- The base `bikes` table still denies direct anon SELECT.
- Both views internally already filter to: approved + active + verified-agency + non-archived + available.

No CHECK constraints, no triggers, no schema changes. One migration file.

## Verification after migration

1. As anon (logged out), `GET /rest/v1/city_bike_counts` returns `bikes_available: 8` for Casablanca.
2. As anon, `GET /rest/v1/bikes_public?available=eq.true` returns rows.
3. Homepage city cards show real counts; `/rent/casablanca` shows bikes without login.
4. No new columns leak (license_plate, notes still hidden).

## Files changed

- New migration: `supabase/migrations/<timestamp>_anon_view_access.sql` (the 4 statements above).

No frontend changes needed — `TopCitiesSection`, `useBikes`, `RentCity` already query the right views.
