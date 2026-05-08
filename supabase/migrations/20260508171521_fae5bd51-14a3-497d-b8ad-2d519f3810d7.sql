CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role and admins to change anything
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Pin admin-only protected columns to OLD values for regular users
  NEW.is_verified           := OLD.is_verified;
  NEW.trust_score           := OLD.trust_score;
  NEW.is_blocked            := OLD.is_blocked;
  NEW.is_banned             := OLD.is_banned;
  NEW.no_show_count         := OLD.no_show_count;
  NEW.loyalty_points        := OLD.loyalty_points;
  NEW.trust_tier            := OLD.trust_tier;
  NEW.subscription_plan     := OLD.subscription_plan;
  NEW.is_frozen             := OLD.is_frozen;
  NEW.frozen_reason         := OLD.frozen_reason;
  NEW.user_type             := OLD.user_type;

  -- verification_status: allow user-initiated submission only
  -- Allowed transitions for non-admins:
  --   unverified -> pending_review
  --   rejected   -> pending_review
  -- Any other change is reverted to OLD.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status = 'pending_review'
       AND COALESCE(OLD.verification_status, 'unverified') IN ('unverified', 'rejected', 'not_started') THEN
      -- Allowed: user is submitting documents for review
      NEW.submitted_at := now();
      NEW.rejection_reason := NULL;
    ELSE
      -- Disallowed: revert to old value
      NEW.verification_status := OLD.verification_status;
      NEW.rejection_reason    := OLD.rejection_reason;
    END IF;
  ELSE
    -- No status change: rejection_reason stays admin-only
    NEW.rejection_reason := OLD.rejection_reason;
  END IF;

  RETURN NEW;
END;
$function$;