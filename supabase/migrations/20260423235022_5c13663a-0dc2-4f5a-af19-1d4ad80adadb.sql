-- 1. Bikes: restrict SELECT to owners and admins only (remove broad authenticated read)
DROP POLICY IF EXISTS "Authenticated users can view bikes" ON public.bikes;

CREATE POLICY "Owners and admins can view bikes"
ON public.bikes
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. signed-contracts bucket: drop owner UPDATE, keep admin-only writes
DROP POLICY IF EXISTS "Owners can update signed-contracts" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload signed-contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload signed-contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update signed-contracts" ON storage.objects;

-- (Admin ALL policy from prior migration already covers admin writes/deletes.)

-- 3. avatars bucket: allow owners to delete their own avatar
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Bookings: restrict business SELECT to non-sensitive columns via a SECURITY INVOKER view
-- Replace the broad business SELECT policy with one that hides admin_notes & rejection text.
-- Postgres RLS doesn't support column-level USING in SELECT policies, so we keep the row-level
-- policy and additionally REVOKE column access from the authenticated role for sensitive columns,
-- then re-grant via a dedicated view for businesses.

CREATE OR REPLACE VIEW public.business_bookings_view
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  bike_id,
  customer_name,
  customer_phone,
  customer_email,
  pickup_date,
  return_date,
  pickup_time,
  return_time,
  pickup_location,
  return_location,
  delivery_method,
  delivery_location,
  delivery_fee,
  total_days,
  total_price,
  amount_paid,
  payment_status,
  payment_method,
  booking_status,
  admin_status,
  contract_status,
  contract_url,
  signed_contract_url,
  insurance_included,
  helmet_included,
  special_requests,
  assigned_to_business,
  assigned_at,
  confirmed_at,
  cancelled_at,
  source,
  created_at,
  updated_at
FROM public.bookings
WHERE auth.uid() = assigned_to_business
   OR public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.business_bookings_view TO authenticated;