DROP VIEW IF EXISTS public.bikes_public CASCADE;

REVOKE SELECT ON public.bikes FROM anon;
GRANT SELECT (id, bike_type_id, location, available, condition, owner_id, created_at, updated_at)
ON public.bikes TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view available bikes" ON public.bikes;
CREATE POLICY "Public can view available bikes"
ON public.bikes
FOR SELECT
TO anon, authenticated
USING (available = true);

CREATE VIEW public.bikes_public
WITH (security_invoker = true)
AS
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
WHERE b.available = true;

GRANT SELECT ON public.bikes_public TO anon, authenticated;