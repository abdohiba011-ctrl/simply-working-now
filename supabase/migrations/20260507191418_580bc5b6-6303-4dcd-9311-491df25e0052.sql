DROP VIEW IF EXISTS public.booking_counterparty_profiles;
CREATE VIEW public.booking_counterparty_profiles
WITH (security_invoker=true)
AS
SELECT
  user_id,
  full_name,
  name,
  avatar_url,
  phone,
  preferred_language,
  business_name,
  business_type,
  business_city,
  business_address,
  business_logo_url
FROM profiles p
WHERE (EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.user_id = p.user_id AND b.assigned_to_business = auth.uid()
)) OR (EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.user_id = auth.uid() AND b.assigned_to_business = p.user_id
));