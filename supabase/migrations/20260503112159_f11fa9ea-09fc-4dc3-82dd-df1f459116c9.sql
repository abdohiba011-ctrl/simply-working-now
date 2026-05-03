ALTER VIEW public.bikes_public SET (security_invoker = off);
ALTER VIEW public.city_bike_counts SET (security_invoker = off);
GRANT SELECT ON public.bikes_public TO anon, authenticated;
GRANT SELECT ON public.city_bike_counts TO anon, authenticated;