-- Base table grants required for RLS policies to take effect for anon/authenticated.
-- Without these, PostgREST returns "permission denied for table X" before RLS even runs.
GRANT SELECT ON public.bike_types TO anon, authenticated;
GRANT SELECT ON public.bike_type_images TO anon, authenticated;
GRANT SELECT ON public.bike_inventory TO anon, authenticated;
GRANT SELECT ON public.bikes TO anon, authenticated;
GRANT SELECT ON public.bikes_public TO anon, authenticated;
GRANT SELECT ON public.city_bike_counts TO anon, authenticated;
GRANT SELECT ON public.service_cities TO anon, authenticated;
GRANT SELECT ON public.agencies TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;