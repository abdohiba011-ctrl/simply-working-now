-- Phase 3B: exclude suspended agencies from all public bike views
CREATE OR REPLACE FUNCTION public.is_owner_verified_agency(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.profiles p ON p.id = a.profile_id
    WHERE p.user_id = _owner_id
      AND a.is_verified = true
      AND COALESCE(a.is_suspended, false) = false
  );
$function$;

-- Rebuild bikes_public to also explicitly exclude suspended agencies
DROP VIEW IF EXISTS public.bikes_public CASCADE;
CREATE VIEW public.bikes_public
WITH (security_invoker = on) AS
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
LEFT JOIN public.agencies a ON a.id = b.agency_id
WHERE b.available = true
  AND b.approval_status = 'approved'
  AND b.archived_at IS NULL
  AND bt.approval_status = 'approved'
  AND bt.business_status = 'active'
  AND bt.archived_at IS NULL
  AND (b.agency_id IS NULL OR (a.is_verified = true AND COALESCE(a.is_suspended, false) = false))
  AND public.is_owner_verified_agency(bt.owner_id);

GRANT SELECT ON public.bikes_public TO anon, authenticated;

-- Rebuild city_bike_counts (relies on is_owner_verified_agency, but be explicit)
DROP VIEW IF EXISTS public.city_bike_counts CASCADE;
CREATE VIEW public.city_bike_counts
WITH (security_invoker = on) AS
SELECT
  sc.id   AS city_id,
  sc.name AS name,
  COUNT(DISTINCT bt.id)::int AS bikes_available
FROM public.service_cities sc
LEFT JOIN public.bike_types bt
  ON bt.city_id = sc.id
 AND bt.approval_status = 'approved'
 AND bt.business_status = 'active'
 AND bt.archived_at IS NULL
 AND public.is_owner_verified_agency(bt.owner_id)
 AND EXISTS (
   SELECT 1 FROM public.bikes b
   LEFT JOIN public.agencies a ON a.id = b.agency_id
   WHERE b.bike_type_id = bt.id
     AND b.approval_status = 'approved'
     AND b.available = true
     AND b.archived_at IS NULL
     AND (b.agency_id IS NULL OR (a.is_verified = true AND COALESCE(a.is_suspended, false) = false))
 )
GROUP BY sc.id, sc.name;

GRANT SELECT ON public.city_bike_counts TO anon, authenticated;