-- Remove the temporary "public read all" policy added in the previous migration.
DROP POLICY IF EXISTS "Public can read profiles via safe view" ON public.profiles;

-- Allow assigned business (agencies) to view the renter profile attached to their bookings,
-- so existing dashboards keep working without exposing data to the public.
DROP POLICY IF EXISTS "Assigned business can view renter profile" ON public.profiles;
CREATE POLICY "Assigned business can view renter profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.user_id = public.profiles.user_id
      AND b.assigned_to_business = auth.uid()
  )
);

-- Allow renters to view the agency owner profile for bookings they made.
DROP POLICY IF EXISTS "Renters can view assigned agency profile" ON public.profiles;
CREATE POLICY "Renters can view assigned agency profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.user_id = auth.uid()
      AND b.assigned_to_business = public.profiles.user_id
  )
);

-- Make sure the public-safe view stays available to anon + authenticated.
GRANT SELECT ON public.profiles_public TO anon, authenticated;