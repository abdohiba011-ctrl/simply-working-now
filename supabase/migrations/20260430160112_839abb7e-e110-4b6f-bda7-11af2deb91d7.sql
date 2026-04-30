-- ============================================================
-- PHASE 1: Booking payment refactor — schema changes
-- Renter pays 60 MAD upfront (10 platform + 50 confirmation),
-- agency no longer charged on confirm. New refund-as-credit
-- system, no-show ban tracking, agency suspension tracking.
-- ============================================================

-- 1) bookings: payment + refund + no-show columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS platform_fee_paid_amount_mad     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmation_fee_paid_amount_mad integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due_at_pickup_mad         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_amount_mad               integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_refunded            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmation_fee_refunded        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_reason                    text,
  ADD COLUMN IF NOT EXISTS refunded_at                      timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_reported_at              timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_reported_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) profiles: renter no-show + ban tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at     timestamptz;

-- 3) agencies: late-cancel rolling counter + suspension
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS last_minute_cancel_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_minute_cancel_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_suspended                boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason            text,
  ADD COLUMN IF NOT EXISTS suspended_at                timestamptz;

-- 4) motonita_credits — non-withdrawable platform credit, 6mo expiry
CREATE TABLE IF NOT EXISTS public.motonita_credits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_mad          integer NOT NULL CHECK (amount_mad > 0),
  reason              text NOT NULL,
  source_booking_id   uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '6 months'),
  used_at             timestamptz,
  used_on_booking_id  uuid REFERENCES public.bookings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_motonita_credits_user_id   ON public.motonita_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_motonita_credits_unused
  ON public.motonita_credits(user_id) WHERE used_at IS NULL;

ALTER TABLE public.motonita_credits ENABLE ROW LEVEL SECURITY;

-- Owners read their own; admins read all. No client write paths
-- (only SECURITY DEFINER RPCs may insert / mark-used).
DROP POLICY IF EXISTS "Users view own credits" ON public.motonita_credits;
CREATE POLICY "Users view own credits"
  ON public.motonita_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all credits" ON public.motonita_credits;
CREATE POLICY "Admins view all credits"
  ON public.motonita_credits
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- PHASE 2: SECURITY DEFINER RPCs
-- ============================================================

-- Helper: issue Motonita Credit (internal — no GRANT to anon/authenticated)
CREATE OR REPLACE FUNCTION public.issue_motonita_credit(
  _user_id uuid,
  _amount_mad integer,
  _reason text,
  _source_booking_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF _user_id IS NULL OR _amount_mad IS NULL OR _amount_mad <= 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT';
  END IF;

  INSERT INTO public.motonita_credits (user_id, amount_mad, reason, source_booking_id)
  VALUES (_user_id, _amount_mad, _reason, _source_booking_id)
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _user_id,
    'Motonita credit issued',
    _amount_mad || ' MAD credit added to your account. Valid 6 months.',
    'credit'
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_motonita_credit(uuid, integer, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_motonita_credit(uuid, integer, text, uuid) FROM anon, authenticated;

-- apply_motonita_credit: locks a credit row for use against a booking
-- Returns amount actually applied (capped to credit balance and 60 MAD).
CREATE OR REPLACE FUNCTION public.apply_motonita_credit(
  _booking_id uuid,
  _credit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_credit record;
  v_booking record;
  v_apply integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_credit FROM public.motonita_credits
   WHERE id = _credit_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CREDIT_NOT_FOUND'; END IF;
  IF v_credit.used_at IS NOT NULL THEN RAISE EXCEPTION 'CREDIT_ALREADY_USED'; END IF;
  IF v_credit.expires_at < now() THEN RAISE EXCEPTION 'CREDIT_EXPIRED'; END IF;

  SELECT * INTO v_booking FROM public.bookings
   WHERE id = _booking_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  v_apply := LEAST(v_credit.amount_mad, 60);

  UPDATE public.motonita_credits
     SET used_at = now(), used_on_booking_id = _booking_id
   WHERE id = _credit_id;

  RETURN jsonb_build_object('ok', true, 'applied_mad', v_apply);
END;
$$;

-- promote_hold_to_booking — replaces existing version
DROP FUNCTION IF EXISTS public.promote_hold_to_booking(uuid, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.promote_hold_to_booking(
  _hold_id uuid,
  _customer_name text,
  _customer_email text,
  _customer_phone text,
  _delivery_method text DEFAULT 'pickup',
  _pickup_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hold record;
  v_owner uuid;
  v_bike_type record;
  v_days int;
  v_rental_total integer;
  v_deposit integer;
  v_booking_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_hold FROM public.bike_holds
  WHERE id = _hold_id AND user_id = v_uid AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'HOLD_EXPIRED'; END IF;

  SELECT bt.* INTO v_bike_type
  FROM public.bikes b
  JOIN public.bike_types bt ON bt.id = b.bike_type_id
  WHERE b.id = v_hold.bike_id;

  v_owner   := v_bike_type.owner_id;
  v_days    := GREATEST(1, (v_hold.return_date - v_hold.pickup_date));
  v_rental_total := COALESCE(v_bike_type.daily_price, 0)::int * v_days;
  v_deposit := COALESCE(v_bike_type.deposit_amount, 0)::int;

  INSERT INTO public.bookings (
    user_id, bike_id, customer_name, customer_email, customer_phone,
    pickup_date, return_date, delivery_method, pickup_location,
    booking_status, payment_status, assigned_to_business, assigned_at,
    total_price, total_days,
    platform_fee_paid_amount_mad, confirmation_fee_paid_amount_mad,
    amount_due_at_pickup_mad, deposit_amount_mad
  )
  VALUES (
    v_uid, v_hold.bike_id, _customer_name, _customer_email, _customer_phone,
    v_hold.pickup_date, v_hold.return_date, _delivery_method, _pickup_location,
    'pending', 'paid', v_owner, now(),
    v_rental_total, v_days,
    10, 50,
    GREATEST(v_rental_total - 50, 0), v_deposit
  )
  RETURNING id INTO v_booking_id;

  DELETE FROM public.bike_holds WHERE id = _hold_id;
  RETURN v_booking_id;
END;
$$;

-- confirm_booking — NO LONGER deducts agency wallet (clean cutover)
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

  RETURN jsonb_build_object('ok', true, 'booking_id', _booking_id);
END;
$$;

-- decline_booking — agency declines a pending booking; refund 50 MAD as credit
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

  PERFORM public.issue_motonita_credit(
    v_booking.user_id, 50,
    'Refund: agency declined booking', _booking_id
  );

  INSERT INTO public.booking_events
    (booking_id, event_type, action, actor_id, actor_type, from_state, to_state, description)
  VALUES
    (_booking_id, 'status_change', 'decline', v_uid, 'agency',
     v_booking.booking_status, 'declined', _reason);

  RETURN jsonb_build_object('ok', true, 'credit_issued_mad', 50);
END;
$$;

-- cancel_booking_by_renter — refund 50 MAD as credit (10 always kept)
CREATE OR REPLACE FUNCTION public.cancel_booking_by_renter(_booking_id uuid)
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
  IF v_booking.user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'NOT_YOUR_BOOKING'; END IF;
  IF COALESCE(v_booking.booking_status, 'pending') NOT IN ('pending') THEN
    RAISE EXCEPTION 'CANNOT_CANCEL';
  END IF;

  UPDATE public.bookings
     SET booking_status = 'cancelled',
         status = 'cancelled',
         cancelled_at = now(),
         confirmation_fee_refunded = true,
         refund_reason = 'renter_cancelled',
         refunded_at = now(),
         updated_at = now()
   WHERE id = _booking_id;

  PERFORM public.issue_motonita_credit(
    v_uid, 50, 'Refund: cancelled before confirmation', _booking_id
  );

  INSERT INTO public.booking_events
    (booking_id, event_type, action, actor_id, actor_type, from_state, to_state, description)
  VALUES
    (_booking_id, 'status_change', 'cancel', v_uid, 'renter',
     v_booking.booking_status, 'cancelled', 'Renter cancelled');

  RETURN jsonb_build_object('ok', true, 'credit_issued_mad', 50);
END;
$$;

-- report_no_show — agency action after pickup_date past, no money movement
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

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('no_show_reported', 'bookings', _booking_id::text, v_uid, v_booking.user_id,
          jsonb_build_object('new_count', v_new_count, 'banned', v_now_banned));

  RETURN jsonb_build_object('ok', true, 'no_show_count', v_new_count, 'banned', v_now_banned);
END;
$$;

-- last_minute_cancel_by_agency — penalty 50 MAD from wallet + credit to renter
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

  -- Penalty: 50 MAD off agency wallet
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

  -- Refund renter as credit
  PERFORM public.issue_motonita_credit(
    v_booking.user_id, 50, 'Refund: agency cancelled last-minute', _booking_id
  );

  -- Booking transition
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
    -- Reset window if older than 30 days
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

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('agency_late_cancel', 'bookings', _booking_id::text, v_uid, v_booking.user_id,
          jsonb_build_object('reason', _reason, 'agency_late_count', v_new_count, 'suspended', v_suspended));

  RETURN jsonb_build_object('ok', true, 'penalty_mad', 50, 'credit_to_renter_mad', 50,
                            'agency_late_count', v_new_count, 'suspended', v_suspended);
END;
$$;