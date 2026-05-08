-- Replace bikes_public so it no longer joins agencies (an RLS-protected
-- table anon cannot read). Verification is fully covered by
-- is_owner_verified_agency(bt.owner_id), which already requires the agency
-- to be verified and not suspended. Keep security_invoker=true so the view
-- respects RLS on the bikes table itself.

DROP VIEW IF EXISTS public.bikes_public;

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
  b.agency_id,
  b.created_at,
  b.updated_at
FROM public.bikes b
JOIN public.bike_types bt ON bt.id = b.bike_type_id
WHERE b.available = true
  AND b.approval_status = 'approved'
  AND b.archived_at IS NULL
  AND bt.approval_status = 'approved'
  AND bt.business_status = 'active'
  AND bt.archived_at IS NULL
  AND public.is_owner_verified_agency(bt.owner_id);

GRANT SELECT ON public.bikes_public TO anon, authenticated;

COMMENT ON VIEW public.bikes_public IS
  'Public, RLS-respecting view of bikes for anonymous + authenticated browsing. Excludes sensitive columns (license_plate, notes). Do not add joins to RLS-protected tables (agencies, profiles) — anon cannot read them and the view will silently return zero rows.';
