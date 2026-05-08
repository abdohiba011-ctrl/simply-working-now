-- The new public RLS policy on bikes lets anon match approved+verified rows
-- (so the bikes_public view works), but PostgREST/Postgres returns every
-- column the role has table-level SELECT on. Revoke the sensitive columns
-- from anon explicitly so they cannot be fetched even via a direct
-- /rest/v1/bikes call.
REVOKE SELECT (license_plate, notes) ON public.bikes FROM anon;
