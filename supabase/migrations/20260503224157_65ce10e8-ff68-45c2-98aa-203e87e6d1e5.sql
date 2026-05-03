-- Add working_hours JSONB column to agencies
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{
  "monday":    {"open": true,  "from": "09:00", "to": "19:00"},
  "tuesday":   {"open": true,  "from": "09:00", "to": "19:00"},
  "wednesday": {"open": true,  "from": "09:00", "to": "19:00"},
  "thursday":  {"open": true,  "from": "09:00", "to": "19:00"},
  "friday":    {"open": true,  "from": "09:00", "to": "19:00"},
  "saturday":  {"open": true,  "from": "09:00", "to": "19:00"},
  "sunday":    {"open": true,  "from": "10:00", "to": "18:00"}
}'::jsonb;

-- Backfill existing rows that have NULL
UPDATE public.agencies SET working_hours = '{
  "monday":    {"open": true,  "from": "09:00", "to": "19:00"},
  "tuesday":   {"open": true,  "from": "09:00", "to": "19:00"},
  "wednesday": {"open": true,  "from": "09:00", "to": "19:00"},
  "thursday":  {"open": true,  "from": "09:00", "to": "19:00"},
  "friday":    {"open": true,  "from": "09:00", "to": "19:00"},
  "saturday":  {"open": true,  "from": "09:00", "to": "19:00"},
  "sunday":    {"open": true,  "from": "10:00", "to": "18:00"}
}'::jsonb
WHERE working_hours IS NULL;

-- Recreate agencies_public view to include working_hours
DROP VIEW IF EXISTS public.agencies_public;
CREATE VIEW public.agencies_public AS
SELECT id, profile_id, business_name, city, primary_neighborhood, bio,
       logo_url, is_verified, delivery_offered, delivery_fee_mad,
       delivery_radius_km, working_hours, created_at
FROM public.agencies
WHERE is_verified = true AND COALESCE(is_suspended, false) = false;

GRANT SELECT ON public.agencies_public TO anon, authenticated;

-- Update create_draft_booking to validate working hours
CREATE OR REPLACE FUNCTION public.create_draft_booking(
  _bike_id uuid, _pickup_date date, _return_date date,
  _customer_name text DEFAULT NULL::text,
  _customer_email text DEFAULT NULL::text,
  _customer_phone text DEFAULT NULL::text,
  _delivery_method text DEFAULT 'pickup'::text,
  _pickup_location text DEFAULT NULL::text,
  _pickup_time text DEFAULT NULL::text,
  _return_time text DEFAULT NULL::text
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
  v_daily_rate numeric;
  v_rental_total integer;
  v_hours jsonb;
  v_day_keys text[] := ARRAY['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  v_pickup_day_key text;
  v_return_day_key text;
  v_pickup_day jsonb;
  v_return_day jsonb;
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

  -- Working hours check
  SELECT a.working_hours INTO v_hours
  FROM public.profiles p
  JOIN public.agencies a ON a.profile_id = p.id
  WHERE p.user_id = v_owner
  LIMIT 1;

  IF v_hours IS NOT NULL THEN
    v_pickup_day_key := v_day_keys[EXTRACT(DOW FROM _pickup_date)::int + 1];
    v_return_day_key := v_day_keys[EXTRACT(DOW FROM _return_date)::int + 1];
    v_pickup_day := v_hours -> v_pickup_day_key;
    v_return_day := v_hours -> v_return_day_key;

    IF v_pickup_day IS NOT NULL AND COALESCE((v_pickup_day->>'open')::boolean, true) = false THEN
      RAISE EXCEPTION 'AGENCY_CLOSED_ON_DATE: %', v_pickup_day_key;
    END IF;
    IF v_return_day IS NOT NULL AND COALESCE((v_return_day->>'open')::boolean, true) = false THEN
      RAISE EXCEPTION 'AGENCY_CLOSED_ON_DATE: %', v_return_day_key;
    END IF;

    IF _pickup_time IS NOT NULL AND v_pickup_day IS NOT NULL THEN
      IF _pickup_time < (v_pickup_day->>'from') OR _pickup_time > (v_pickup_day->>'to') THEN
        RAISE EXCEPTION 'PICKUP_TIME_OUTSIDE_HOURS: %', _pickup_time;
      END IF;
    END IF;
    IF _return_time IS NOT NULL AND v_return_day IS NOT NULL THEN
      IF _return_time < (v_return_day->>'from') OR _return_time > (v_return_day->>'to') THEN
        RAISE EXCEPTION 'PICKUP_TIME_OUTSIDE_HOURS: %', _return_time;
      END IF;
    END IF;
  END IF;

  v_days  := GREATEST(1, (_return_date - _pickup_date));
  v_daily_rate := public.get_bike_price(v_bike_type.id, v_days);
  IF v_daily_rate IS NULL THEN
    v_daily_rate := COALESCE(v_bike_type.daily_price, 0);
  END IF;
  v_rental_total := (v_daily_rate * v_days)::int;

  INSERT INTO public.bookings (
    user_id, bike_id,
    customer_name, customer_email, customer_phone,
    pickup_date, return_date, pickup_time, return_time,
    delivery_method, pickup_location,
    booking_status, payment_status,
    total_price, total_days,
    platform_fee_paid_amount_mad, confirmation_fee_paid_amount_mad,
    amount_due_at_pickup_mad, deposit_amount_mad
  )
  VALUES (
    v_uid, _bike_id,
    _customer_name, _customer_email, _customer_phone,
    _pickup_date, _return_date, _pickup_time, _return_time,
    _delivery_method, _pickup_location,
    'draft', 'unpaid',
    v_rental_total, v_days,
    0, 0,
    GREATEST(v_rental_total - 50, 0), COALESCE(v_bike_type.deposit_amount, 0)::int
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$function$;