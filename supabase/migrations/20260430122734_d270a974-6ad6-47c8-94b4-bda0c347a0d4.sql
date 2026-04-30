-- FIX #1: Standardize verification_status vocabulary
-- Normalize legacy values
UPDATE public.agencies SET verification_status = 'pending'  WHERE verification_status = 'pending_review';
UPDATE public.agencies SET verification_status = 'approved' WHERE verification_status = 'verified';
UPDATE public.agencies SET verification_status = 'pending'  WHERE verification_status IS NULL OR verification_status NOT IN ('pending','approved','rejected');

-- Enforce is_verified is true ONLY when status = 'approved'
UPDATE public.agencies SET is_verified = (verification_status = 'approved');

-- CHECK constraint for canonical vocabulary
ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_verification_status_check;
ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_verification_status_check
  CHECK (verification_status IN ('pending','approved','rejected'));

-- FIX #2: Rejection reason capture columns
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- FIX #4: ICE column already exists on agencies; ensure it's there.
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS ice TEXT;
-- Optional sanity: 15 numeric digits when present
ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_ice_format_check;
ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_ice_format_check
  CHECK (ice IS NULL OR ice ~ '^[0-9]{15}$');

-- Update notification trigger to use new canonical 'pending' value
CREATE OR REPLACE FUNCTION public.notify_admins_on_agency_submit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.verification_status = 'pending'
     AND (TG_OP = 'INSERT' OR OLD.verification_status IS DISTINCT FROM 'pending') THEN

    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    SELECT
      ur.user_id,
      'New Agency Verification',
      COALESCE(NEW.business_name, 'An agency') || ' submitted shop verification for review.',
      'agency_verification',
      '/admin/agencies/verifications',
      '/admin/agencies/verifications'
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::public.app_role
      AND ur.is_active = true;
  END IF;

  RETURN NEW;
END;
$function$;
