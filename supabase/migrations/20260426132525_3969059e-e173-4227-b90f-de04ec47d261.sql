-- Remove public RLS policy on bikes; route public reads through bikes_public view only.
DROP POLICY IF EXISTS "Public can view available bikes (safe columns only)" ON public.bikes;

-- Revoke any direct SELECT on bikes from anon. Authenticated owners/admins keep
-- access via the existing "Owners and admins can view bikes" policy.
REVOKE SELECT ON public.bikes FROM anon;
REVOKE SELECT ON public.bikes FROM authenticated;
GRANT SELECT ON public.bikes TO authenticated; -- RLS still restricts to owner/admin

-- Ensure bikes_public view exists with safe columns and is readable by anon/authenticated.
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
  );

-- Because security_invoker view requires SELECT on underlying table, grant a
-- minimal column-scoped SELECT to anon (license_plate and notes excluded).
GRANT SELECT (id, bike_type_id, location, available, condition, owner_id, created_at, updated_at)
  ON public.bikes TO anon;

GRANT SELECT ON public.bikes_public TO anon, authenticated;