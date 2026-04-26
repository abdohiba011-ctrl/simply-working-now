
-- 1) bikes: remove sensitive columns from public SELECT by restricting policy
-- and providing a public view with only safe columns.
DROP POLICY IF EXISTS "Public can view available bikes" ON public.bikes;

-- Recreate a safe public-readable view that excludes license_plate and notes.
DROP VIEW IF EXISTS public.bikes_public CASCADE;
CREATE VIEW public.bikes_public
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.bike_type_id,
  b.location,
  b.available,
  b.condition,
  b.owner_id,
  b.created_at,
  b.updated_at
FROM public.bikes b
WHERE b.available = true
  AND EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = b.bike_type_id
      AND COALESCE(bt.is_approved, true) = true
      AND COALESCE(bt.business_status, 'active') = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.agency_subscriptions s
        WHERE s.user_id = bt.owner_id AND s.status = 'locked'
      )
  );

GRANT SELECT ON public.bikes_public TO anon, authenticated;

-- Re-add a public SELECT policy on bikes that excludes sensitive columns by
-- using column-level GRANTs. RLS still allows the row, but only safe columns
-- are granted to anon. Owners and admins keep the existing full-access policy.
CREATE POLICY "Public can view available bikes (safe columns only)"
ON public.bikes
FOR SELECT
TO anon, authenticated
USING (
  available = true
  AND EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bikes.bike_type_id
      AND COALESCE(bt.is_approved, true) = true
      AND COALESCE(bt.business_status, 'active') = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.agency_subscriptions s
        WHERE s.user_id = bt.owner_id AND s.status = 'locked'
      )
  )
);

-- Revoke broad column access from anon/authenticated, then re-grant only safe columns.
REVOKE SELECT ON public.bikes FROM anon, authenticated;
GRANT SELECT (id, bike_type_id, location, available, condition, owner_id, created_at, updated_at)
  ON public.bikes TO anon, authenticated;
-- Owners/admins read full row via SECURITY DEFINER helpers or via bikes_owner_view.
-- Ensure license_plate and notes remain ungranted to anon/authenticated.

-- 2) user_roles: scope INSERT/DELETE/SELECT policies to authenticated only
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) bookings: ensure the only INSERT policy is scoped to authenticated.
-- (Already done previously, but defensively drop any stragglers.)
DROP POLICY IF EXISTS "Users can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
