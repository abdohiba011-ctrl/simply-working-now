
-- 1. Drop unrestricted profiles update policy (column-restricted variant remains)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Protect agencies privileged fields via BEFORE UPDATE trigger
CREATE OR REPLACE FUNCTION public.agencies_protect_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.is_verified := OLD.is_verified;
  NEW.verification_status := OLD.verification_status;
  NEW.is_suspended := OLD.is_suspended;
  NEW.suspended_reason := OLD.suspended_reason;
  NEW.suspended_at := OLD.suspended_at;
  NEW.is_locked := OLD.is_locked;
  NEW.subscription_plan := OLD.subscription_plan;
  NEW.trial_started_at := OLD.trial_started_at;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.rejected_by := OLD.rejected_by;
  NEW.rejected_at := OLD.rejected_at;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.last_minute_cancel_count := OLD.last_minute_cancel_count;
  NEW.last_minute_cancel_reset_at := OLD.last_minute_cancel_reset_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agencies_protect_sensitive_fields ON public.agencies;
CREATE TRIGGER agencies_protect_sensitive_fields
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.agencies_protect_sensitive_fields();

-- 3. Storage policies for signed-contracts bucket (INSERT + DELETE)
DROP POLICY IF EXISTS "Signed contracts insert by assigned agency or admin" ON storage.objects;
CREATE POLICY "Signed contracts insert by assigned agency or admin"
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

DROP POLICY IF EXISTS "Signed contracts delete by assigned agency or admin" ON storage.objects;
CREATE POLICY "Signed contracts delete by assigned agency or admin"
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
