
-- 1) Profiles: protect sensitive fields via trigger
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role and admins to change anything
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Pin protected columns to their OLD values for regular users
  NEW.is_verified           := OLD.is_verified;
  NEW.verification_status   := OLD.verification_status;
  NEW.trust_score           := OLD.trust_score;
  NEW.is_blocked            := OLD.is_blocked;
  NEW.is_banned             := OLD.is_banned;
  NEW.no_show_count         := OLD.no_show_count;
  NEW.loyalty_points        := OLD.loyalty_points;
  NEW.trust_tier            := OLD.trust_tier;
  NEW.subscription_plan     := OLD.subscription_plan;
  NEW.is_frozen             := OLD.is_frozen;
  NEW.frozen_reason         := OLD.frozen_reason;
  NEW.rejection_reason      := OLD.rejection_reason;
  NEW.user_type             := OLD.user_type;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_sensitive_fields ON public.profiles;
CREATE TRIGGER profiles_protect_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 2) Bike reviews: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON public.bike_reviews;

CREATE POLICY "Public can view reviews of approved active bikes"
ON public.bike_reviews
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bike_reviews.bike_type_id
      AND bt.approval_status = 'approved'
      AND bt.business_status = 'active'
      AND public.is_owner_verified_agency(bt.owner_id)
  )
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) signed-contracts bucket: INSERT / UPDATE / DELETE policies
DROP POLICY IF EXISTS "Assigned agency can upload signed contracts" ON storage.objects;
CREATE POLICY "Assigned agency can upload signed contracts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signed-contracts'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.assigned_to_business = auth.uid()
        AND b.id::text = (storage.foldername(name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Assigned agency can update signed contracts" ON storage.objects;
CREATE POLICY "Assigned agency can update signed contracts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signed-contracts'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.assigned_to_business = auth.uid()
        AND b.id::text = (storage.foldername(name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'signed-contracts'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.assigned_to_business = auth.uid()
        AND b.id::text = (storage.foldername(name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Assigned agency or admin can delete signed contracts" ON storage.objects;
CREATE POLICY "Assigned agency or admin can delete signed contracts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'signed-contracts'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.assigned_to_business = auth.uid()
        AND b.id::text = (storage.foldername(name))[1]
    )
  )
);
