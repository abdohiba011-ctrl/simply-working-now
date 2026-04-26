DROP VIEW IF EXISTS public.city_bike_counts;

CREATE VIEW public.city_bike_counts
WITH (security_invoker = true) AS
SELECT
  sc.id AS city_id,
  sc.name,
  COUNT(DISTINCT bt.id) FILTER (
    WHERE COALESCE(bt.is_approved, true) = true
      AND COALESCE(bt.business_status, 'active') = 'active'
      AND COALESCE(bt.availability_status, 'available') = 'available'
  )::int AS bikes_available
FROM public.service_cities sc
LEFT JOIN public.bike_types bt ON bt.city_id = sc.id
GROUP BY sc.id, sc.name;

GRANT SELECT ON public.city_bike_counts TO anon, authenticated;