## Problem

Anonymous (logged-out) visitors see **0 motorbikes** on `/listings`. Confirmed via the database:

- The Listings page reads from the `bikes_public` view (defined `WITH (security_invoker=true)`).
- A `security_invoker` view enforces the **base table's RLS** as the querying role.
- The `bikes` table has **only three SELECT policies**, all restricted to `authenticated`:
  - "Owners can view own bikes"
  - "Admins can view all bikes"
  - (no public/anon policy at all)
- Result: anon → no matching policy → 0 rows from `bikes_public` → empty Listings.

`bike_types` does have a proper public policy for anon, which is why some other surfaces (homepage carousels reading `bike_types` directly) still work — but Listings filters by `bikes` and breaks.

This regresses periodically because nothing in the schema guarantees the public-read policy on `bikes` exists. Every time someone tightens RLS on `bikes`, it's silently lost.

## Fix (single migration)

Add a **permanent, idempotent** public SELECT policy on `public.bikes` that mirrors the one on `bike_types`, plus a regression safeguard.

```sql
-- 1. Public read on bikes for anon + authenticated
DROP POLICY IF EXISTS "Public can view bikes of approved verified types" ON public.bikes;

CREATE POLICY "Public can view bikes of approved verified types"
ON public.bikes
FOR SELECT
TO anon, authenticated
USING (
  available = true
  AND EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bikes.bike_type_id
      AND bt.approval_status = 'approved'
      AND bt.business_status = 'active'
      AND public.is_owner_verified_agency(bt.owner_id)
  )
);

COMMENT ON POLICY "Public can view bikes of approved verified types" ON public.bikes IS
  'CRITICAL: Required so anonymous visitors can see listings via bikes_public view. Do NOT drop without replacement.';
```

The `bikes_public` view already excludes sensitive columns (`license_plate`, `notes`), so anon only ever reads safe fields.

## Regression guard

Add a Vitest security test that hits the live Supabase project as the anon key and asserts `bikes_public` returns ≥ 1 row whenever `bike_types` has any approved+active+verified row. Place it next to the existing `src/test/security.bikes.test.ts`. If a future migration drops the policy, CI fails immediately.

## What I will NOT change

- No frontend changes — `useBikes` already targets `bikes_public` correctly.
- No edits to `bike_types` policies (they're already correct for anon).
- No change to the booking/checkout flow — anonymous visitors can already browse; auth is requested at the Book step (per project rules).

## Files touched

- `supabase/migrations/<new>.sql` — the policy + comment above
- `src/test/security.bikes.test.ts` — add anon-visibility regression test

## Verification after apply

1. Run the migration.
2. As anon (no session) call `supabase.from('bikes_public').select('*')` → expect rows.
3. Reload `/listings` logged out → bikes appear.
4. Confirm the new vitest passes.
