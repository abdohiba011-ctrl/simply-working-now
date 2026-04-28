
-- Trigger: notify all admins when a profile's verification_status becomes 'pending_review'
CREATE OR REPLACE FUNCTION public.notify_admins_on_verification_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  IF NEW.verification_status = 'pending_review'
     AND (OLD.verification_status IS DISTINCT FROM 'pending_review') THEN

    v_full_name := COALESCE(
      NULLIF(trim(COALESCE(NEW.first_name_on_id, '') || ' ' || COALESCE(NEW.family_name_on_id, '')), ''),
      NEW.full_name,
      NEW.name,
      NEW.email,
      'A user'
    );

    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    SELECT
      ur.user_id,
      'New Verification Submitted',
      v_full_name || ' submitted ID verification for review.',
      'verification',
      '/admin/verifications/' || NEW.user_id::text,
      '/admin/verifications/' || NEW.user_id::text
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::public.app_role
      AND ur.is_active = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_verification_submit ON public.profiles;
CREATE TRIGGER trg_notify_admins_on_verification_submit
AFTER UPDATE OF verification_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_verification_submit();

-- Speed up admin queue
CREATE INDEX IF NOT EXISTS idx_profiles_pending_verification
  ON public.profiles (updated_at DESC)
  WHERE verification_status = 'pending_review';
