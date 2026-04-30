
REVOKE EXECUTE ON FUNCTION public.approve_bike_type(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_bike_type(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_bike_type(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_bike_type(uuid, text) TO authenticated;
