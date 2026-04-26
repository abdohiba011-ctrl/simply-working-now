
-- ============================================================
-- 1) confirm_booking: agency confirms an assigned booking
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_booking(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking record;
  v_wallet record;
  v_fee numeric := 50;
  v_new_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = _booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.assigned_to_business IS DISTINCT FROM v_uid
     AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'NOT_ASSIGNED_TO_YOU';
  END IF;

  IF COALESCE(v_booking.booking_status, 'pending') <> 'pending' THEN
    RAISE EXCEPTION 'NOT_PENDING';
  END IF;

  -- Ensure wallet row exists
  INSERT INTO public.agency_wallets (user_id, balance, currency)
  VALUES (v_uid, 0, 'MAD')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.agency_wallets
  WHERE user_id = v_uid
  FOR UPDATE;

  IF v_wallet.balance < v_fee THEN
    RAISE EXCEPTION 'INSUFFICIENT_WALLET_BALANCE';
  END IF;

  v_new_balance := v_wallet.balance - v_fee;

  UPDATE public.agency_wallets
     SET balance = v_new_balance,
         updated_at = now()
   WHERE user_id = v_uid;

  INSERT INTO public.agency_wallet_transactions
    (user_id, amount, type, status, balance_after, description, related_booking_id, currency, method)
  VALUES
    (v_uid, -v_fee, 'fee', 'completed', v_new_balance,
     'Booking confirmation fee', _booking_id, v_wallet.currency, 'wallet');

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
     v_booking.booking_status, 'confirmed', 'Agency confirmed booking');

  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', _booking_id,
    'fee', v_fee,
    'new_balance', v_new_balance
  );
END;
$$;

-- agency_wallets needs a unique constraint on user_id for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agency_wallets_user_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.agency_wallets
        ADD CONSTRAINT agency_wallets_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- 2) request_plan_downgrade: only when active/trialing
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_plan_downgrade()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sub record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_sub
  FROM public.agency_subscriptions
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_SUBSCRIPTION';
  END IF;

  IF v_sub.status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'CANNOT_DOWNGRADE_FROM_%', v_sub.status;
  END IF;

  UPDATE public.agency_subscriptions
     SET plan = 'free',
         status = 'active',
         cancel_at_period_end = false,
         updated_at = now()
   WHERE user_id = v_uid;

  RETURN jsonb_build_object('ok', true, 'plan', 'free');
END;
$$;

-- ============================================================
-- 3) profiles: prevent self-escalation of system fields
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    -- Admins are not gated by this policy (they have a separate one).
    -- For regular users: forbid changes to system-controlled fields by
    -- requiring them to remain identical to the existing row.
    (
      verification_status IS NOT DISTINCT FROM (SELECT verification_status FROM public.profiles p WHERE p.id = auth.uid())
      AND is_verified IS NOT DISTINCT FROM (SELECT is_verified FROM public.profiles p WHERE p.id = auth.uid())
      AND trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM public.profiles p WHERE p.id = auth.uid())
      AND is_frozen IS NOT DISTINCT FROM (SELECT is_frozen FROM public.profiles p WHERE p.id = auth.uid())
      AND user_type IS NOT DISTINCT FROM (SELECT user_type FROM public.profiles p WHERE p.id = auth.uid())
      AND subscription_plan IS NOT DISTINCT FROM (SELECT subscription_plan FROM public.profiles p WHERE p.id = auth.uid())
      AND frozen_reason IS NOT DISTINCT FROM (SELECT frozen_reason FROM public.profiles p WHERE p.id = auth.uid())
      AND rejection_reason IS NOT DISTINCT FROM (SELECT rejection_reason FROM public.profiles p WHERE p.id = auth.uid())
    )
  )
);

-- ============================================================
-- 4) Realtime channel auth for booking_messages
--    Only the booking's customer or the assigned agency (or admin)
--    may subscribe to a booking-scoped Realtime topic.
--    Topic convention used by the client: "booking:<uuid>".
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking parties can subscribe to their booking channel" ON realtime.messages;

CREATE POLICY "Booking parties can subscribe to their booking channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow non-booking topics through (other features may use realtime).
  COALESCE(realtime.messages.topic, '') NOT LIKE 'booking:%'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = substring(realtime.messages.topic FROM 'booking:(.+)$')
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  )
);
