-- 1. Remove public access from bikes table; force public reads through bikes_public view (no license_plate/notes)
DROP POLICY IF EXISTS "Public can view available approved bikes" ON public.bikes;

-- Make sure the public view exists and grants are correct (view already exists per inspection)
GRANT SELECT ON public.bikes_public TO anon, authenticated;

-- 2. Restrict public agencies access to safe columns via a view
DROP POLICY IF EXISTS "Public can view verified agencies" ON public.agencies;

CREATE OR REPLACE VIEW public.agencies_public
WITH (security_invoker = true)
AS
SELECT
  id,
  profile_id,
  business_name,
  city,
  primary_neighborhood,
  bio,
  logo_url,
  is_verified,
  created_at
FROM public.agencies
WHERE is_verified = true
  AND COALESCE(is_suspended, false) = false;

GRANT SELECT ON public.agencies_public TO anon, authenticated;

-- Re-allow authenticated users to read full agency rows of verified agencies if needed (booking flow),
-- but anonymous public must use the view. We keep owner+admin policies and add an authenticated read.
CREATE POLICY "Authenticated can view verified agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (is_verified = true AND COALESCE(is_suspended, false) = false);

-- 3. Add UPDATE policy for client_files owners (metadata only; user_id locked)
CREATE POLICY "Users can update their own files"
ON public.client_files
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Replace substring-based signed-contracts storage policy with exact folder match
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
      SELECT 1
      FROM public.bookings b
      WHERE (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
        AND b.id::text = (storage.foldername(objects.name))[1]
    )
  )
);