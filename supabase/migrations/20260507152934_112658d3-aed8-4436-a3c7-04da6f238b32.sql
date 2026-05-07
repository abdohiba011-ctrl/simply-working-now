-- Phase 3A fix: don't burn referral discount on raw booking INSERT.
-- Move signed_up -> booked only when payment_status flips to 'paid'.

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
  v_payment_just_succeeded boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Intentionally no-op: do not move referral to 'booked' here.
    -- Wait for successful payment (UPDATE branch below).
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_payment_just_succeeded := (
      NEW.payment_status = 'paid'
      AND COALESCE(OLD.payment_status, '') <> 'paid'
    );

    -- Payment just succeeded: claim the open signed_up referral, if any.
    IF v_payment_just_succeeded THEN
      UPDATE public.referrals
         SET status = 'booked',
             first_booking_id = NEW.id
       WHERE invited_user_id = NEW.user_id
         AND status = 'signed_up'
         AND first_booking_id IS NULL;
    END IF;

    -- Find an active referral tied to THIS booking (only set after paid).
    SELECT id, referrer_id
      INTO v_ref_id, v_referrer
      FROM public.referrals
     WHERE first_booking_id = NEW.id
       AND status = 'booked'
     LIMIT 1;

    IF v_ref_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Completed -> approve reward
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

    -- Failed AFTER successful payment -> reject referral
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
               'Paid first booking did not complete (cancelled/rejected/refunded)')
       WHERE id = v_ref_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers stay attached (INSERT now no-ops, UPDATE does the work).