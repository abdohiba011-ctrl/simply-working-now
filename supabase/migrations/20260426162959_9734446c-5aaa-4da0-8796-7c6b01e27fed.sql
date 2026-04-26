DROP VIEW IF EXISTS public.bikes_public CASCADE;

CREATE VIEW public.bikes_public
WITH (security_invoker = false)
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