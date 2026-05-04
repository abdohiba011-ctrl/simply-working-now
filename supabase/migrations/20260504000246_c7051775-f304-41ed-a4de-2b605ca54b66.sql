CREATE POLICY "Anon can view available approved bikes"
ON public.bikes
FOR SELECT
TO anon
USING (
  available = true
  AND approval_status = 'approved'
  AND archived_at IS NULL
);

ALTER VIEW public.city_bike_counts SET (security_invoker = on);