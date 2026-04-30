-- 1) Drop overly broad counterparty profile policies
DROP POLICY IF EXISTS "Assigned business can view renter profile" ON public.profiles;
DROP POLICY IF EXISTS "Renters can view assigned agency profile" ON public.profiles;

-- 2) Safe view exposing only business-relevant fields for booking counterparties
CREATE OR REPLACE VIEW public.booking_counterparty_profiles
WITH (security_invoker = true) AS
SELECT
  p.user_id,
  p.full_name,
  p.name,
  p.avatar_url,
  p.phone,
  p.preferred_language,
  p.business_name,
  p.business_type,
  p.business_city,
  p.business_address
FROM public.profiles p
WHERE
  -- Caller is the agency assigned to a booking by this profile's user (renter)
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.user_id = p.user_id
      AND b.assigned_to_business = auth.uid()
  )
  -- Caller is the renter of a booking assigned to this profile's user (agency)
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.user_id = auth.uid()
      AND b.assigned_to_business = p.user_id
  );

GRANT SELECT ON public.booking_counterparty_profiles TO authenticated;

-- 3) Storage SELECT policy for chat-attachments
-- Path layout: <sender_user_id>/<booking_id>/<filename>
CREATE POLICY "Booking parties can view chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = (storage.foldername(name))[2]
      AND (
        b.user_id = auth.uid()
        OR b.assigned_to_business = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);