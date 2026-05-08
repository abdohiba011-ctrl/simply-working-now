-- Allow anonymous + authenticated visitors to read public bikes via the
-- bikes_public view (which is security_invoker and therefore enforces RLS
-- on the underlying bikes table as the calling role).
DROP POLICY IF EXISTS "Public can view bikes of approved verified types" ON public.bikes;

CREATE POLICY "Public can view bikes of approved verified types"
ON public.bikes
FOR SELECT
TO anon, authenticated
USING (
  available = true
  AND EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bikes.bike_type_id
      AND bt.approval_status = 'approved'
      AND bt.business_status = 'active'
      AND public.is_owner_verified_agency(bt.owner_id)
  )
);

COMMENT ON POLICY "Public can view bikes of approved verified types" ON public.bikes IS
  'CRITICAL: Required so anonymous visitors can see public listings via the bikes_public view. Do NOT drop without an equivalent replacement, or logged-out users will see zero bikes on /listings.';
