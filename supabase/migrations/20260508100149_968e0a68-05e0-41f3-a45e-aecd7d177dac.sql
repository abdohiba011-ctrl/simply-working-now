
-- 1) Fix function with mutable search_path
ALTER FUNCTION public._gen_referral_code() SET search_path = public;

-- 2) Convert SECURITY DEFINER views to SECURITY INVOKER (enforce caller RLS)
ALTER VIEW public.bikes_public SET (security_invoker = true);
ALTER VIEW public.agencies_public SET (security_invoker = true);
ALTER VIEW public.city_bike_counts SET (security_invoker = true);
ALTER VIEW public.booking_counterparty_profiles SET (security_invoker = true);

-- 3) Harden EXECUTE permissions on public-schema functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Re-allow anonymous browsing for the few read-only helpers used by public pages
GRANT EXECUTE ON FUNCTION public.get_booked_date_ranges(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.bike_has_conflict(uuid, date, date, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bike_price(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.is_owner_verified_agency(uuid) TO anon;

-- 4) Lock down the signed-contracts bucket: scope SELECT to admin or the assigned agency
DROP POLICY IF EXISTS "Booking parties can read signed contracts" ON storage.objects;

CREATE POLICY "Signed contracts read by assigned agency or admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'signed-contracts'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.assigned_to_business = auth.uid()
        AND b.id::text = (storage.foldername(storage.objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.user_id = auth.uid()
        AND b.id::text = (storage.foldername(storage.objects.name))[1]
    )
  )
);
