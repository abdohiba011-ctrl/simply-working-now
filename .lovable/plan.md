# Fix: "Bike not found" on `/bike/:id` for anonymous visitors

## Root cause

The recent security hardening revoked `SELECT` on `public.bikes` from the `anon` role and routed public reads through the `bikes_public` view. `useBikes` (listings) was updated, but the **detail hook `useBike` was missed** — it still queries `public.bikes` directly.

Verified in the database:

- Bike type `11111111-0000-0000-0000-000000000003` exists (Peugeot Kisbee 50 — 2024, approved).
- A real bike row `22222222-0000-0000-0000-000000000003` (Bouskoura, available) is linked to it.
- `has_table_privilege('anon', 'public.bikes', 'SELECT')` → **false**
- `has_table_privilege('anon', 'public.bikes_public', 'SELECT')` → **true**

So when a logged-out user opens `/bike/11111111-...`, both the direct `id` lookup and the `bike_type_id` fallback in `useBike` return zero rows, and the page renders the "Bike not found" empty state.

## Fix

Update `useBike` in `src/hooks/useBikes.ts` to read from `bikes_public` instead of `bikes`, keeping the same two-step lookup:

1. Try `bikes_public` by `id`.
2. Fallback: query `bikes_public` by `bike_type_id` (the path used when listings cards link with the bike_type_id).

The `bikes_public` view already excludes `license_plate` and `notes`, so the security posture is preserved. `BikeDetails` does not read those fields (confirmed via grep), so no UI impact.

## Files to change

- `src/hooks/useBikes.ts` — in `useBike`, change `.from("bikes")` to `.from("bikes_public" as any)` for both the direct and the fallback queries. Cast the returned row to `Bike` (the `license_plate` field on the type just becomes `null`/`undefined` — already typed as nullable).

No DB migration needed — the view and grants are already in place.

## Verification after default mode

- Reload `/bike/11111111-0000-0000-0000-000000000003` while logged out → renders the Peugeot Kisbee 50 detail page.
- Existing `src/test/security.bikes.test.ts` regression tests still pass (anon still cannot read `license_plate`/`notes`).
- Spot-check one or two other bike URLs from the listings page to confirm the fallback path works.