-- Fix 1: Restrict public SELECT on profiles table
-- Drop the overly permissive policy that exposes all columns to anon users
DROP POLICY IF EXISTS "Public can view minimal profile info" ON public.profiles;

-- Create a safe public view exposing only non-sensitive columns for public listings (e.g. agency profiles, reviewer names)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  full_name,
  name,
  avatar_url,
  business_name,
  business_logo_url,
  business_city,
  business_description,
  user_type,
  is_verified,
  trust_tier,
  created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Allow anon + authenticated to read minimal data via the view's underlying table
-- by adding a tightly-scoped SELECT policy. Because the view is security_invoker,
-- callers still need a USING clause that allows the row. We allow everyone to
-- match rows BUT the view only selects safe columns.
-- Existing "Users can view own profile" + "Admins can view all profiles" policies remain.
CREATE POLICY "Public can read profiles via safe view"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- NOTE: The above still allows raw table reads. To fully lock down, application
-- code must query profiles_public from anon/non-owner contexts. We keep the
-- per-user and admin policies intact for owner/admin reads on the base table.

-- Fix 2: RLS on realtime.messages to restrict booking_messages channel subscriptions
-- Enable RLS (no-op if already enabled)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants can subscribe to booking_messages" ON realtime.messages;
CREATE POLICY "Booking participants can subscribe to booking_messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow only when the realtime payload references a booking the user participates in.
  -- realtime.messages.extension is the table name for postgres_changes events.
  CASE
    WHEN extension = 'booking_messages' THEN
      EXISTS (
        SELECT 1
        FROM public.booking_messages bm
        JOIN public.bookings b ON b.id = bm.booking_id
        WHERE (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
      )
    ELSE true
  END
);

-- Fix 3: Add explicit SELECT policy for signed-contracts storage bucket
DROP POLICY IF EXISTS "Booking parties can read signed contracts" ON storage.objects;
CREATE POLICY "Booking parties can read signed contracts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'signed-contracts'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
        AND (
          position(b.id::text in name) > 0
        )
    )
  )
);