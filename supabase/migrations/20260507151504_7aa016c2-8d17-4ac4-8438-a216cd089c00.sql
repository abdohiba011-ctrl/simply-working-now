-- Phase 3A: referral booking-fee discount + reward eligibility

-- 1. Eligibility RPC: caller is eligible for the first-booking discount
-- if they have an open referral in 'signed_up' status (i.e. they were
-- referred AND have not yet started their first booking).
CREATE OR REPLACE FUNCTION public.is_referral_discount_eligible()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.referrals
    WHERE invited_user_id = auth.uid()
      AND status = 'signed_up'
  );
$$;

-- 2. Trigger function: drives referral lifecycle from booking changes.
--    - INSERT booking by referred user: mark referral booked + remember first_booking_id
--    - UPDATE booking → completed: approve reward + notify referrer
--    - UPDATE booking → cancelled/rejected/refunded: reject referral (no second chance)
CREATE OR REPLACE FUNCTION public._referral_on_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_id uuid;
  v_referrer uuid;
  v_failed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Claim the (single) open signed_up referral for this user, if any.
    UPDATE public.referrals
       SET status = 'booked',
           first_booking_id = NEW.id
     WHERE invited_user_id = NEW.user_id
       AND status = 'signed_up'
       AND first_booking_id IS NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT id, referrer_id
      INTO v_ref_id, v_referrer
      FROM public.referrals
     WHERE first_booking_id = NEW.id
       AND status = 'booked'
     LIMIT 1;

    IF v_ref_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Completed → approve reward
    IF NEW.booking_status = 'completed'
       AND COALESCE(OLD.booking_status, '') <> 'completed' THEN
      UPDATE public.referrals
         SET status = 'approved',
             completed_at = now(),
             approved_at = now()
       WHERE id = v_ref_id;

      INSERT INTO public.notifications (user_id, title, message, type, action_url)
      VALUES (
        v_referrer,
        'You earned 10 MAD',
        'Your friend completed their first rental. You earned 10 MAD.',
        'success',
        '/affiliate'
      );
      RETURN NEW;
    END IF;

    -- Failed (cancel / reject / refund) → reject referral, no reward
    v_failed := (
      NEW.booking_status IN ('cancelled', 'rejected')
      OR (NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL)
      OR (NEW.rejected_at IS NOT NULL AND OLD.rejected_at IS NULL)
      OR (COALESCE(NEW.platform_fee_refunded, false)
          AND NOT COALESCE(OLD.platform_fee_refunded, false))
    );

    IF v_failed THEN
      UPDATE public.referrals
         SET status = 'rejected',
             rejection_reason = COALESCE(rejection_reason,
               'First booking did not complete (cancelled/rejected/refunded)')
       WHERE id = v_ref_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_on_booking_insert ON public.bookings;
CREATE TRIGGER trg_referral_on_booking_insert
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public._referral_on_booking_change();

DROP TRIGGER IF EXISTS trg_referral_on_booking_update ON public.bookings;
CREATE TRIGGER trg_referral_on_booking_update
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public._referral_on_booking_change();