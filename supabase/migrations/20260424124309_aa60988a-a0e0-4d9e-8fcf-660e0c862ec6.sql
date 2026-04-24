
-- ============================================================
-- Phase 1: Listings, booking concurrency, reviews, chat
-- ============================================================

-- ---------- bike_types: extra columns ----------
ALTER TABLE public.bike_types
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS weekly_price numeric,
  ADD COLUMN IF NOT EXISTS monthly_price numeric,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS license_required text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS min_age integer DEFAULT 18,
  ADD COLUMN IF NOT EXISTS min_experience_years integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS mileage_km integer;

CREATE INDEX IF NOT EXISTS idx_bike_types_neighborhood ON public.bike_types(neighborhood);
CREATE INDEX IF NOT EXISTS idx_bike_types_category ON public.bike_types(category);
CREATE INDEX IF NOT EXISTS idx_bike_types_owner ON public.bike_types(owner_id);

-- ---------- bike_holds ----------
CREATE TABLE IF NOT EXISTS public.bike_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id uuid NOT NULL,
  user_id uuid NOT NULL,
  pickup_date date NOT NULL,
  return_date date NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bike_holds_bike_expires ON public.bike_holds(bike_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_bike_holds_user ON public.bike_holds(user_id);

ALTER TABLE public.bike_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own holds" ON public.bike_holds;
CREATE POLICY "Users manage own holds"
ON public.bike_holds
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all holds" ON public.bike_holds;
CREATE POLICY "Admins manage all holds"
ON public.bike_holds
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---------- bike_reviews ----------
CREATE TABLE IF NOT EXISTS public.bike_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_type_id uuid NOT NULL,
  user_id uuid,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bike_reviews_bike_type ON public.bike_reviews(bike_type_id);

ALTER TABLE public.bike_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.bike_reviews;
CREATE POLICY "Anyone can view reviews"
ON public.bike_reviews
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users insert own reviews" ON public.bike_reviews;
CREATE POLICY "Users insert own reviews"
ON public.bike_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all reviews" ON public.bike_reviews;
CREATE POLICY "Admins manage all reviews"
ON public.bike_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---------- booking_messages ----------
CREATE TABLE IF NOT EXISTS public.booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  sender_id uuid,
  sender_role text NOT NULL CHECK (sender_role IN ('renter','agency','system','admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking ON public.booking_messages(booking_id, created_at);

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_messages REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Booking parties can view messages" ON public.booking_messages;
CREATE POLICY "Booking parties can view messages"
ON public.booking_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Booking parties can send messages" ON public.booking_messages;
CREATE POLICY "Booking parties can send messages"
ON public.booking_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins manage all messages" ON public.booking_messages;
CREATE POLICY "Admins manage all messages"
ON public.booking_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;

-- ---------- create_bike_hold RPC ----------
CREATE OR REPLACE FUNCTION public.create_bike_hold(
  _bike_id uuid,
  _pickup date,
  _return date
)
RETURNS TABLE(hold_id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_exp timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF _pickup IS NULL OR _return IS NULL OR _return <= _pickup THEN
    RAISE EXCEPTION 'INVALID_DATES';
  END IF;

  -- 1. Clean expired holds for this bike.
  DELETE FROM public.bike_holds
  WHERE bike_id = _bike_id AND expires_at < now();

  -- 2. Conflict check: confirmed bookings.
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bike_id = _bike_id
      AND booking_status IN ('pending','confirmed')
      AND NOT (return_date <= _pickup OR pickup_date >= _return)
  ) THEN
    RAISE EXCEPTION 'BIKE_ALREADY_BOOKED';
  END IF;

  -- 3. Conflict check: other users' active holds.
  IF EXISTS (
    SELECT 1 FROM public.bike_holds
    WHERE bike_id = _bike_id
      AND user_id <> v_uid
      AND expires_at > now()
      AND NOT (return_date <= _pickup OR pickup_date >= _return)
  ) THEN
    RAISE EXCEPTION 'BIKE_HELD_BY_OTHER';
  END IF;

  -- 4. Refresh / create user's own hold.
  DELETE FROM public.bike_holds WHERE bike_id = _bike_id AND user_id = v_uid;

  INSERT INTO public.bike_holds (bike_id, user_id, pickup_date, return_date)
  VALUES (_bike_id, v_uid, _pickup, _return)
  RETURNING id, bike_holds.expires_at INTO v_id, v_exp;

  RETURN QUERY SELECT v_id, v_exp;
END;
$$;

-- ---------- promote_hold_to_booking RPC ----------
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
  v_booking_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_hold FROM public.bike_holds
  WHERE id = _hold_id AND user_id = v_uid AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HOLD_EXPIRED';
  END IF;

  SELECT bt.owner_id INTO v_owner
  FROM public.bikes b
  JOIN public.bike_types bt ON bt.id = b.bike_type_id
  WHERE b.id = v_hold.bike_id;

  INSERT INTO public.bookings (
    user_id, bike_id, customer_name, customer_email, customer_phone,
    pickup_date, return_date, delivery_method, pickup_location,
    booking_status, payment_status, assigned_to_business, assigned_at
  )
  VALUES (
    v_uid, v_hold.bike_id, _customer_name, _customer_email, _customer_phone,
    v_hold.pickup_date, v_hold.return_date, _delivery_method, _pickup_location,
    'pending', 'paid', v_owner, now()
  )
  RETURNING id INTO v_booking_id;

  DELETE FROM public.bike_holds WHERE id = _hold_id;

  RETURN v_booking_id;
END;
$$;
