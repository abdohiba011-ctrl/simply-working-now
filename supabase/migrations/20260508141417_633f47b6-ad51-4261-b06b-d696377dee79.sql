-- Public-read RLS policies on bike_types, bikes, bike_type_images,
-- bike_inventory and bike_reviews all reference has_role(...) inside an OR
-- branch. Postgres still evaluates that branch, and anon lacks EXECUTE on
-- the function, which raises "permission denied for function has_role" and
-- aborts the whole query. Granting EXECUTE is safe: the function is
-- SECURITY DEFINER and only returns a boolean about role membership.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
