-- Allow anyone (anon + authenticated) to read available bikes from approved bike types.
-- This is required for the public marketplace bike detail page.
CREATE POLICY "Public can view available bikes"
ON public.bikes
FOR SELECT
TO anon, authenticated
USING (
  available = true
  AND EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bikes.bike_type_id
      AND COALESCE(bt.is_approved, true) = true
      AND COALESCE(bt.business_status, 'active') = 'active'
  )
);