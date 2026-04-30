
-- ============================================================================
-- 1) NOTIFICATION HELPERS
-- ============================================================================

-- Notify agency when a fresh pending booking lands
CREATE OR REPLACE FUNCTION public.notify_agency_on_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bike_name text;
BEGIN
  IF NEW.assigned_to_business IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' OR (OLD.assigned_to_business IS DISTINCT FROM NEW.assigned_to_business) THEN
    SELECT bt.name INTO v_bike_name
    FROM public.bikes b
    JOIN public.bike_types bt ON bt.id = b.bike_type_id
    WHERE b.id = NEW.bike_id;

    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    VALUES (
      NEW.assigned_to_business,
      'New booking received',
      'New booking #' || left(NEW.id::text, 8)
        || ' for ' || COALESCE(v_bike_name, 'a bike')
        || ' from ' || to_char(NEW.pickup_date, 'DD Mon') || ' to ' || to_char(NEW.return_date, 'DD Mon')
        || '. Renter prepaid 60 MAD. You''ll collect '
        || COALESCE(NEW.amount_due_at_pickup_mad, 0)::text || ' MAD at pickup. Confirm within 24h.',
      'booking',
      '/agency/bookings/' || NEW.id::text,
      '/agency/bookings/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_agency_on_new_booking_trg ON public.bookings;
CREATE TRIGGER notify_agency_on_new_booking_trg
AFTER INSERT OR UPDATE OF assigned_to_business ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_agency_on_new_booking();

-- ============================================================================
-- 2) UPDATE confirm_booking — add renter notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_booking(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  IF v_booking.assigned_to_business IS DISTINCT FROM v_uid
     AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'NOT_ASSIGNED_TO_YOU';
  END IF;

  IF COALESCE(v_booking.booking_status, 'pending') <> 'pending' THEN
    RAISE EXCEPTION 'NOT_PENDING';
  END IF;

  UPDATE public.bookings
     SET booking_status = 'confirmed',
         status = 'confirmed',
         confirmed_at = now(),
         confirmed_by = v_uid,
         updated_at = now()
   WHERE id = _booking_id;

  INSERT INTO public.booking_events
    (booking_id, event_type, action, actor_id, actor_type, from_state, to_state, description)
  VALUES
    (_booking_id, 'status_change', 'confirm', v_uid, 'agency',
     v_booking.booking_status, 'confirmed',
     'Agency confirmed booking (no wallet charge — renter prepaid 50 MAD confirmation fee)');

  -- Notify renter
  IF v_booking.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    VALUES (
      v_booking.user_id,
      'Booking confirmed',
      'Your booking #' || left(_booking_id::text, 8) || ' is confirmed! Pay '
        || COALESCE(v_booking.amount_due_at_pickup_mad, 0)::text
        || ' MAD to the agency at pickup on ' || to_char(v_booking.pickup_date, 'DD Mon YYYY') || '.',
      'booking',
      '/booking/' || _booking_id::text,
      '/booking/' || _booking_id::text
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'booking_id', _booking_id);
END;
$$;

-- ============================================================================
-- 3) UPDATE decline_booking — clearer renter copy
-- ============================================================================

CREATE OR REPLACE FUNCTION public.decline_booking(_booking_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  IF v_booking.assigned_to_business IS DISTINCT FROM v_uid
     AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'NOT_ASSIGNED_TO_YOU';
  END IF;
  IF COALESCE(v_booking.booking_status, 'pending') <> 'pending' THEN
    RAISE EXCEPTION 'NOT_PENDING';
  END IF;

  UPDATE public.bookings
     SET booking_status = 'declined',
         status = 'declined',
         rejected_at = now(),
         rejected_by = v_uid,
         rejected_reason_text = _reason,
         confirmation_fee_refunded = true,
         refund_reason = 'agency_declined',
         refunded_at = now(),
         updated_at = now()
   WHERE id = _booking_id;

  -- Issue 50 MAD credit (this also creates its own notification)
  PERFORM public.issue_motonita_credit(
    v_booking.user_id, 50,
    'Refund: agency declined booking', _booking_id
  );

  -- Additional explicit notification with friendlier copy
  IF v_booking.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_booking.user_id,
      'Booking could not be confirmed',
      'Your booking #' || left(_booking_id::text, 8)
        || ' couldn''t be confirmed by the agency. We''ve issued you 50 MAD as Motonita Credit, valid 6 months.',
      'booking',
      '/booking/' || _booking_id::text
    );
  END IF;

  INSERT INTO public.booking_events
    (booking_id, event_type, action, actor_id, actor_type, from_state, to_state, description)
  VALUES
    (_booking_id, 'status_change', 'decline', v_uid, 'agency',
     v_booking.booking_status, 'declined', _reason);

  RETURN jsonb_build_object('ok', true, 'credit_issued_mad', 50);
END;
$$;

-- ============================================================================
-- 4) UPDATE report_no_show — renter notification + ban notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.report_no_show(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking record;
  v_new_count int;
  v_now_banned boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_booking.assigned_to_business IS DISTINCT FROM v_uid
     AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'NOT_ASSIGNED_TO_YOU';
  END IF;
  IF v_booking.booking_status <> 'confirmed' THEN RAISE EXCEPTION 'NOT_CONFIRMED'; END IF;
  IF v_booking.pickup_date > CURRENT_DATE THEN RAISE EXCEPTION 'PICKUP_NOT_PAST'; END IF;

  UPDATE public.bookings
     SET booking_status = 'no_show',
         status = 'no_show',
         no_show_reported_at = now(),
         no_show_reported_by = v_uid,
         updated_at = now()
   WHERE id = _booking_id;

  UPDATE public.profiles
     SET no_show_count = no_show_count + 1,
         is_banned = CASE WHEN no_show_count + 1 >= 2 THEN true ELSE is_banned END,
         banned_reason = CASE WHEN no_show_count + 1 >= 2 AND NOT is_banned
                              THEN 'Two reported no-shows' ELSE banned_reason END,
         banned_at = CASE WHEN no_show_count + 1 >= 2 AND NOT is_banned
                          THEN now() ELSE banned_at END
   WHERE user_id = v_booking.user_id
   RETURNING no_show_count, is_banned INTO v_new_count, v_now_banned;

  -- Notify renter about the no-show report
  IF v_booking.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_booking.user_id,
      'No-show reported',
      'An agency reported you as a no-show for booking #' || left(_booking_id::text, 8)
        || '. After 2 reported no-shows your account will be banned. If this is an error, contact support immediately.',
      'warning',
      '/booking/' || _booking_id::text
    );

    IF v_now_banned THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        v_booking.user_id,
        'Account banned',
        'Your account has been banned due to two reported no-shows. Contact support to appeal.',
        'critical'
      );
    END IF;
  END IF;

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('no_show_reported', 'bookings', _booking_id::text, v_uid, v_booking.user_id,
          jsonb_build_object('new_count', v_new_count, 'banned', v_now_banned));

  RETURN jsonb_build_object('ok', true, 'no_show_count', v_new_count, 'banned', v_now_banned);
END;
$$;

-- ============================================================================
-- 5) UPDATE last_minute_cancel_by_agency — agency + suspension notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION public.last_minute_cancel_by_agency(_booking_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking record;
  v_wallet record;
  v_hours numeric;
  v_agency record;
  v_new_count int;
  v_suspended boolean := false;
  v_remaining int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_booking.assigned_to_business IS DISTINCT FROM v_uid
     AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'NOT_ASSIGNED_TO_YOU';
  END IF;
  IF v_booking.booking_status <> 'confirmed' THEN RAISE EXCEPTION 'NOT_CONFIRMED'; END IF;

  v_hours := EXTRACT(EPOCH FROM (v_booking.pickup_date::timestamptz - now())) / 3600;
  IF v_hours >= 24 THEN RAISE EXCEPTION 'NOT_LAST_MINUTE'; END IF;

  INSERT INTO public.agency_wallets (user_id, balance, currency)
  VALUES (v_uid, 0, 'MAD') ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet FROM public.agency_wallets WHERE user_id = v_uid FOR UPDATE;
  UPDATE public.agency_wallets
     SET balance = balance - 50, updated_at = now()
   WHERE user_id = v_uid;

  INSERT INTO public.agency_wallet_transactions
    (user_id, amount, type, status, balance_after, description, related_booking_id, currency, method)
  VALUES
    (v_uid, -50, 'penalty', 'completed', v_wallet.balance - 50,
     'Late cancellation penalty', _booking_id, v_wallet.currency, 'wallet');

  -- Refund renter as credit (also issues a notification)
  PERFORM public.issue_motonita_credit(
    v_booking.user_id, 50, 'Refund: agency cancelled last-minute', _booking_id
  );

  -- Friendlier renter notification
  IF v_booking.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_booking.user_id,
      'Agency cancelled your booking',
      'The agency cancelled your booking #' || left(_booking_id::text, 8)
        || '. We''ve issued you 50 MAD as Motonita Credit. We''re sorry for the inconvenience.',
      'booking',
      '/booking/' || _booking_id::text
    );
  END IF;

  UPDATE public.bookings
     SET booking_status = 'cancelled_by_agency_late',
         status = 'cancelled_by_agency_late',
         cancelled_at = now(),
         cancellation_reason = _reason,
         confirmation_fee_refunded = true,
         refund_reason = 'agency_cancelled_late',
         refunded_at = now(),
         updated_at = now()
   WHERE id = _booking_id;

  -- Agency rolling 30-day counter + suspension
  SELECT a.* INTO v_agency
    FROM public.agencies a
    JOIN public.profiles p ON p.id = a.profile_id
   WHERE p.user_id = v_uid
   FOR UPDATE;

  IF FOUND THEN
    IF v_agency.last_minute_cancel_reset_at IS NULL
       OR v_agency.last_minute_cancel_reset_at < now() - interval '30 days' THEN
      UPDATE public.agencies
         SET last_minute_cancel_count = 1,
             last_minute_cancel_reset_at = now(),
             updated_at = now()
       WHERE id = v_agency.id
       RETURNING last_minute_cancel_count INTO v_new_count;
    ELSE
      UPDATE public.agencies
         SET last_minute_cancel_count = last_minute_cancel_count + 1,
             updated_at = now()
       WHERE id = v_agency.id
       RETURNING last_minute_cancel_count INTO v_new_count;
    END IF;

    IF v_new_count >= 2 THEN
      UPDATE public.agencies
         SET is_suspended = true,
             suspended_reason = 'Two late cancellations within 30 days',
             suspended_at = now(),
             updated_at = now()
       WHERE id = v_agency.id;
      v_suspended := true;
    END IF;
  END IF;

  v_remaining := GREATEST(0, 2 - COALESCE(v_new_count, 0));

  -- Penalty notification to agency
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_uid,
    'Late cancellation penalty',
    'You late-cancelled booking #' || left(_booking_id::text, 8)
      || '. 50 MAD has been deducted from your wallet. You have '
      || v_remaining::text || ' more late cancellation(s) available before suspension.',
    'wallet'
  );

  IF v_suspended THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_uid,
      'Account suspended',
      'Your agency has been suspended due to repeated late cancellations. Contact support to appeal.',
      'critical'
    );
  END IF;

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('agency_late_cancel', 'bookings', _booking_id::text, v_uid, v_booking.user_id,
          jsonb_build_object('reason', _reason, 'agency_late_count', v_new_count, 'suspended', v_suspended));

  RETURN jsonb_build_object('ok', true, 'penalty_mad', 50, 'credit_to_renter_mad', 50,
                            'agency_late_count', v_new_count, 'suspended', v_suspended);
END;
$$;

-- ============================================================================
-- 6) AUTO-CANCEL stale pending bookings (>24h old) — pg_cron job
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT id, user_id, assigned_to_business, bike_id, created_at
      FROM public.bookings
     WHERE COALESCE(booking_status, 'pending') = 'pending'
       AND created_at < now() - interval '24 hours'
     LIMIT 200
  LOOP
    UPDATE public.bookings
       SET booking_status = 'declined',
           status = 'declined',
           rejected_at = now(),
           rejected_reason_text = 'Auto-cancelled: agency did not confirm within 24 hours',
           confirmation_fee_refunded = true,
           refund_reason = 'auto_cancelled_24h',
           refunded_at = now(),
           updated_at = now()
     WHERE id = v_row.id;

    PERFORM public.issue_motonita_credit(
      v_row.user_id, 50,
      'Refund: agency did not confirm within 24h', v_row.id
    );

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_row.user_id,
      'Booking auto-cancelled',
      'Your booking #' || left(v_row.id::text, 8)
        || ' was auto-cancelled because the agency did not confirm within 24 hours. We''ve issued you 50 MAD as Motonita Credit.',
      'booking',
      '/booking/' || v_row.id::text
    );

    INSERT INTO public.booking_events
      (booking_id, event_type, action, actor_type, from_state, to_state, description)
    VALUES
      (v_row.id, 'status_change', 'auto_cancel', 'system',
       'pending', 'declined', 'Auto-cancelled after 24h with no agency confirmation');

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Schedule via pg_cron, every 15 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('motonita-auto-cancel-pending')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'motonita-auto-cancel-pending');
    PERFORM cron.schedule(
      'motonita-auto-cancel-pending',
      '*/15 * * * *',
      $cron$ SELECT public.auto_cancel_stale_pending_bookings(); $cron$
    );
  END IF;
END $$;
