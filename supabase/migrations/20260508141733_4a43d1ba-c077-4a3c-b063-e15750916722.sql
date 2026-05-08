-- Column-level REVOKE has no effect while the role still holds a
-- table-level SELECT. Drop anon's table-wide SELECT on bikes, then
-- re-grant only the columns the public listing actually needs. This
-- closes the leak of license_plate and notes via direct REST queries.
REVOKE SELECT ON public.bikes FROM anon;

GRANT SELECT (
  id,
  bike_type_id,
  location,
  available,
  condition,
  owner_id,
  agency_id,
  approval_status,
  archived_at,
  created_at,
  updated_at
) ON public.bikes TO anon;
