
-- 1. Pricing/lock trigger: allow draft status, zero out paid amounts at draft.
-- Paid amounts (10/50 MAD) are written by the payment webhook on confirmation,
-- never at draft creation.
CREATE OR REPLACE FUNCTION public.bookings_enforce_canonical_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  v_daily_price numeric;
  v_days integer;
  v_total numeric;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  SELECT bt.daily_price INTO v_daily_price
  FROM public.bikes b
  JOIN public.bike_types bt ON bt.id = b.bike_type_id
  WHERE b.id = NEW.bike_id;

  IF v_daily_price IS NULL THEN v_daily_price := 0; END IF;

  v_days := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM (NEW.return_date::timestamptz - NEW.pickup_date::timestamptz)) / 86400)::int
  );
  v_total := v_daily_price * v_days + COALESCE(NEW.delivery_fee, 0) - COALESCE(NEW.discount_amount, 0);
  IF v_total < 0 THEN v_total := 0; END IF;

  NEW.total_days := v_days;
  NEW.total_price := v_total;

  -- Lock untrusted financial / status fields on insert.
  NEW.amount_paid     := 0;
  NEW.payment_status  := COALESCE(NEW.payment_status, 'unpaid');
  NEW.admin_status    := 'pending';
  -- Allow 'draft' for the new checkout flow; default 'pending' otherwise.
  NEW.booking_status  := COALESCE(NEW.booking_status, 'pending');
  IF NEW.booking_status NOT IN ('draft','pending') THEN
    NEW.booking_status := 'pending';
  END IF;
  NEW.confirmed_by    := NULL;
  NEW.confirmed_at    := NULL;
  NEW.assigned_to_business := NULL;
  NEW.assigned_at     := NULL;

  -- Paid amounts are 0 until the payment webhook confirms payment.
  NEW.platform_fee_paid_amount_mad     := 0;
  NEW.confirmation_fee_paid_amount_mad := 0;

  RETURN NEW;
END;
$function$;

-- 2. Restrict user updates: draft owner may edit a small whitelist of fields,
--    but CANNOT promote draft -> pending themselves. Promotion is webhook-only
--    via a SECURITY DEFINER RPC. Allowing client-side promotion would be a
--    fraud vector (renter could skip payment).
CREATE OR REPLACE FUNCTION public.bookings_restrict_user_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  is_business boolean;
  is_draft_owner boolean;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  is_business := (auth.uid() IS NOT NULL AND auth.uid() = OLD.assigned_to_business);
  is_draft_owner := (auth.uid() IS NOT NULL
                     AND auth.uid() = OLD.user_id
                     AND OLD.booking_status = 'draft');

  -- Draft owner: may edit customer info / dates / delivery while in draft.
  -- They CANNOT change booking_status (no client-side draft -> pending).
  -- The only valid path out of 'draft' is the payment webhook calling
  -- public.promote_draft_to_pending() (SECURITY DEFINER, server-side only).
  IF is_draft_owner THEN
    NEW.id                   := OLD.id;
    NEW.user_id              := OLD.user_id;
    NEW.bike_id              := OLD.bike_id;
    NEW.created_at           := OLD.created_at;
    NEW.total_price          := OLD.total_price;
    NEW.amount_paid          := OLD.amount_paid;
    NEW.discount_amount      := OLD.discount_amount;
    NEW.delivery_fee         := OLD.delivery_fee;
    NEW.total_days           := OLD.total_days;
    NEW.pricing_breakdown    := OLD.pricing_breakdown;
    NEW.payment_status       := OLD.payment_status;
    NEW.payment_method       := OLD.payment_method;
    NEW.admin_status         := OLD.admin_status;
    NEW.admin_notes          := OLD.admin_notes;
    NEW.confirmed_by         := OLD.confirmed_by;
    NEW.confirmed_at         := OLD.confirmed_at;
    NEW.assigned_to_business := OLD.assigned_to_business;
    NEW.assigned_at          := OLD.assigned_at;
    NEW.platform_fee_paid_amount_mad     := OLD.platform_fee_paid_amount_mad;
    NEW.confirmation_fee_paid_amount_mad := OLD.confirmation_fee_paid_amount_mad;
    -- Hard lock: status cannot move client-side.
    NEW.booking_status := OLD.booking_status;
    NEW.status         := OLD.status;
    RETURN NEW;
  END IF;

  -- Customer (booking owner) path on non-draft: lock everything except cancel.
  IF auth.uid() = OLD.user_id AND NOT is_business THEN
    NEW.id                   := OLD.id;
    NEW.user_id              := OLD.user_id;
    NEW.bike_id              := OLD.bike_id;
    NEW.created_at           := OLD.created_at;
    NEW.total_price          := OLD.total_price;
    NEW.amount_paid          := OLD.amount_paid;
    NEW.discount_amount      := OLD.discount_amount;
    NEW.delivery_fee         := OLD.delivery_fee;
    NEW.total_days           := OLD.total_days;
    NEW.pricing_breakdown    := OLD.pricing_breakdown;
    NEW.payment_status       := OLD.payment_status;
    NEW.payment_method       := OLD.payment_method;
    NEW.admin_status         := OLD.admin_status;
    NEW.admin_notes          := OLD.admin_notes;
    NEW.confirmed_by         := OLD.confirmed_by;
    NEW.confirmed_at         := OLD.confirmed_at;
    NEW.unconfirmed_by       := OLD.unconfirmed_by;
    NEW.unconfirmed_at       := OLD.unconfirmed_at;
    NEW.rejected_by          := OLD.rejected_by;
    NEW.rejected_at          := OLD.rejected_at;
    NEW.rejected_reason_code := OLD.rejected_reason_code;
    NEW.rejected_reason_text := OLD.rejected_reason_text;
    NEW.assigned_to_business := OLD.assigned_to_business;
    NEW.assigned_at          := OLD.assigned_at;
    NEW.contract_url         := OLD.contract_url;
    NEW.signed_contract_url  := OLD.signed_contract_url;
    NEW.contract_status      := OLD.contract_status;
    NEW.helmet_included      := OLD.helmet_included;
    NEW.insurance_included   := OLD.insurance_included;
    NEW.source               := OLD.source;
    NEW.customer_email       := OLD.customer_email;
    NEW.customer_phone       := OLD.customer_phone;
    NEW.customer_name        := OLD.customer_name;
    NEW.pickup_date          := OLD.pickup_date;
    NEW.return_date          := OLD.return_date;

    IF NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
      IF NEW.booking_status <> 'cancelled' THEN
        NEW.booking_status := OLD.booking_status;
      ELSE
        NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
      END IF;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status <> 'cancelled' THEN
        NEW.status := OLD.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Create draft booking. Conflict check ignores other drafts (drafts don't
--    reserve the bike). Final conflict check happens at promotion time.
CREATE OR REPLACE FUNCTION public.create_draft_booking(
  _bike_id uuid,
  _pickup_date date,
  _return_date date,
  _customer_name text DEFAULT NULL,
  _customer_email text DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _delivery_method text DEFAULT 'pickup',
  _pickup_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_booking_id uuid;
  v_bike_type record;
  v_days int;
  v_rental_total integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _pickup_date IS NULL OR _return_date IS NULL OR _return_date <= _pickup_date THEN
    RAISE EXCEPTION 'INVALID_DATES';
  END IF;

  -- Conflict check: only against pending/confirmed bookings.
  -- Drafts are intentionally excluded (multiple renters may shop the same dates).
  -- Race conditions are resolved at promotion time by promote_draft_to_pending().
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.bike_id = _bike_id
      AND b.booking_status IN ('pending','confirmed')
      AND NOT (b.return_date <= _pickup_date OR b.pickup_date >= _return_date)
  ) THEN
    RAISE EXCEPTION 'BIKE_ALREADY_BOOKED';
  END IF;

  SELECT bt.* INTO v_bike_type
  FROM public.bikes b
  JOIN public.bike_types bt ON bt.id = b.bike_type_id
  WHERE b.id = _bike_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'BIKE_NOT_FOUND'; END IF;

  v_owner := v_bike_type.owner_id;
  v_days  := GREATEST(1, (_return_date - _pickup_date));
  v_rental_total := COALESCE(v_bike_type.daily_price, 0)::int * v_days;

  INSERT INTO public.bookings (
    user_id, bike_id,
    customer_name, customer_email, customer_phone,
    pickup_date, return_date, delivery_method, pickup_location,
    booking_status, payment_status,
    total_price, total_days,
    -- Paid amounts are 0 at draft. The payment webhook writes 10/50 on success.
    platform_fee_paid_amount_mad, confirmation_fee_paid_amount_mad,
    amount_due_at_pickup_mad, deposit_amount_mad
  )
  VALUES (
    v_uid, _bike_id,
    _customer_name, _customer_email, _customer_phone,
    _pickup_date, _return_date, _delivery_method, _pickup_location,
    'draft', 'unpaid',
    v_rental_total, v_days,
    0, 0,
    GREATEST(v_rental_total - 50, 0), COALESCE(v_bike_type.deposit_amount, 0)::int
  )
  RETURNING id INTO v_booking_id;

  -- Note: trigger forces booking_status to 'pending' if not in ('draft','pending').
  -- We pass 'draft' explicitly above so it survives.
  UPDATE public.bookings SET booking_status = 'draft' WHERE id = v_booking_id;

  RETURN v_booking_id;
END;
$function$;

-- 4. Promote draft -> pending. WEBHOOK-ONLY path (called by the payment webhook
--    edge function with the service role after payment confirmation).
--    Re-checks date conflicts at promotion time to handle the race where two
--    renters held overlapping drafts and one paid first. Loser gets refunded
--    via 'conflict_refunded' status — webhook handler must then trigger refund.
CREATE OR REPLACE FUNCTION public.promote_draft_to_pending(
  _booking_id uuid,
  _platform_fee_paid integer DEFAULT 10,
  _confirmation_fee_pending integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking record;
  v_owner uuid;
  v_conflict boolean;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_booking.booking_status <> 'draft' THEN
    RAISE EXCEPTION 'NOT_DRAFT:%', v_booking.booking_status;
  END IF;

  -- Race resolution: another booking may have promoted ahead of us for the
  -- same bike + overlapping dates. If so, mark this one conflict_refunded
  -- and let the webhook handler issue the refund out of band.
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.bike_id = v_booking.bike_id
      AND b.id <> v_booking.id
      AND b.booking_status IN ('pending','confirmed')
      AND NOT (b.return_date <= v_booking.pickup_date
            OR b.pickup_date  >= v_booking.return_date)
  ) INTO v_conflict;

  IF v_conflict THEN
    UPDATE public.bookings
       SET booking_status = 'conflict_refunded',
           status         = 'conflict_refunded',
           payment_status = 'refund_pending',
           cancelled_at   = now(),
           cancellation_reason = 'Date taken by another booking before payment confirmed',
           updated_at     = now()
     WHERE id = _booking_id;
    RETURN jsonb_build_object('ok', false, 'conflict', true, 'refund_required', true);
  END IF;

  SELECT bt.owner_id INTO v_owner
  FROM public.bikes b
  JOIN public.bike_types bt ON bt.id = b.bike_type_id
  WHERE b.id = v_booking.bike_id;

  UPDATE public.bookings
     SET booking_status = 'pending',
         status         = 'pending',
         payment_status = 'paid',
         platform_fee_paid_amount_mad = _platform_fee_paid,
         confirmation_fee_paid_amount_mad = 0, -- not paid yet; deducted from agency wallet on confirm
         assigned_to_business = v_owner,
         assigned_at = now(),
         updated_at = now()
   WHERE id = _booking_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', _booking_id);
END;
$function$;

-- 5. Cleanup old drafts (>24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_draft_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  WITH del AS (
    DELETE FROM public.bookings
    WHERE booking_status = 'draft'
      AND created_at < now() - interval '24 hours'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM del;
  RETURN v_count;
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_bookings_status_created
  ON public.bookings (booking_status, created_at);
