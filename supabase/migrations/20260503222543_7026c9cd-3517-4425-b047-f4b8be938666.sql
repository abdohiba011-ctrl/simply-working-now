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
  v_daily_rate numeric;
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

  -- Resolve tiered daily rate; fall back to bike_types.daily_price if no tiers configured.
  v_daily_rate := public.get_bike_price(v_bike_type.id, v_days);
  IF v_daily_rate IS NULL THEN
    v_daily_rate := COALESCE(v_bike_type.daily_price, 0);
  END IF;

  v_rental_total := (v_daily_rate * v_days)::int;

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