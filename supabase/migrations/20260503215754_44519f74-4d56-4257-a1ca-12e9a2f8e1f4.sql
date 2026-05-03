CREATE OR REPLACE FUNCTION public.bike_has_conflict(
  _bike_id uuid,
  _pickup_date date,
  _return_date date,
  _exclude_booking_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.bike_id = _bike_id
      AND (_exclude_booking_id IS NULL OR b.id <> _exclude_booking_id)
      AND (
        b.booking_status IN ('pending','confirmed','active','in_progress')
        OR (
          b.booking_status = 'draft'
          AND b.payment_method = 'cashplus'
          AND b.created_at > (now() - interval '72 hours')
        )
      )
      AND NOT (b.return_date <= _pickup_date OR b.pickup_date >= _return_date)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.bike_has_conflict(uuid,date,date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bike_has_conflict(uuid,date,date,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_draft_booking(_bike_id uuid, _pickup_date date, _return_date date, _customer_name text DEFAULT NULL::text, _customer_email text DEFAULT NULL::text, _customer_phone text DEFAULT NULL::text, _delivery_method text DEFAULT 'pickup'::text, _pickup_location text DEFAULT NULL::text)
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

  IF public.bike_has_conflict(_bike_id, _pickup_date, _return_date, NULL) THEN
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

  UPDATE public.bookings SET booking_status = 'draft' WHERE id = v_booking_id;

  RETURN v_booking_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_draft_to_pending(_booking_id uuid, _platform_fee_paid integer DEFAULT 10, _confirmation_fee_pending integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking record;
  v_owner uuid;
  v_conflict boolean;
  v_role text;
BEGIN
  v_role := current_setting('role', true);
  IF v_role IS NULL OR v_role NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'WEBHOOK_ONLY';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_booking.booking_status <> 'draft' THEN
    RAISE EXCEPTION 'NOT_DRAFT:%', v_booking.booking_status;
  END IF;

  v_conflict := public.bike_has_conflict(
    v_booking.bike_id,
    v_booking.pickup_date,
    v_booking.return_date,
    v_booking.id
  );

  IF v_conflict THEN
    UPDATE public.bookings
       SET booking_status = 'conflict_refunded',
           status         = 'conflict_refunded',
           payment_status = 'refund_pending',
           cancelled_at   = now(),
           cancellation_reason = 'Date taken by another booking before payment confirmed',
           updated_at     = now()
     WHERE id = _booking_id;
    RETURN jsonb_build_object('ok', false, 'booking_id', _booking_id, 'conflict', true, 'refund_required', true);
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
         confirmation_fee_paid_amount_mad = 0,
         assigned_to_business = v_owner,
         updated_at = now()
   WHERE id = _booking_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', _booking_id, 'conflict', false);
END;
$function$;