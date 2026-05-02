
-- ============================================================
-- FIX 1: Admin write policies on service_cities & service_locations
-- ============================================================

CREATE POLICY "Admins can insert cities"
  ON public.service_cities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update cities"
  ON public.service_cities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete cities"
  ON public.service_cities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert locations"
  ON public.service_locations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update locations"
  ON public.service_locations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete locations"
  ON public.service_locations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- FIX 5A: rename_neighborhood — safely rename + cascade to bike_types
-- ============================================================

CREATE OR REPLACE FUNCTION public.rename_neighborhood(
  p_location_id uuid,
  p_new_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_loc record;
  v_old text;
  v_new text;
  v_updated int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_new_name IS NULL OR length(trim(p_new_name)) < 1 THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;

  SELECT * INTO v_loc FROM public.service_locations WHERE id = p_location_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NEIGHBORHOOD_NOT_FOUND'; END IF;

  v_old := v_loc.name;
  v_new := trim(p_new_name);

  IF v_old = v_new THEN
    RETURN jsonb_build_object('ok', true, 'updated_bikes', 0);
  END IF;

  UPDATE public.service_locations
     SET name = v_new, updated_at = now()
   WHERE id = p_location_id;

  IF v_loc.city_id IS NOT NULL THEN
    UPDATE public.bike_types
       SET neighborhood = v_new, updated_at = now()
     WHERE city_id = v_loc.city_id
       AND neighborhood = v_old;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('neighborhood_renamed', 'service_locations', p_location_id::text, v_uid, v_uid,
          jsonb_build_object('old_name', v_old, 'new_name', v_new, 'updated_bikes', v_updated));

  RETURN jsonb_build_object('ok', true, 'updated_bikes', v_updated, 'old_name', v_old, 'new_name', v_new);
END;
$$;

-- ============================================================
-- FIX 5B: delete_neighborhood — blocked when bikes still use it
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_neighborhood_safe(
  p_location_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_loc record;
  v_count int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_loc FROM public.service_locations WHERE id = p_location_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NEIGHBORHOOD_NOT_FOUND'; END IF;

  IF v_loc.city_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.bike_types
    WHERE city_id = v_loc.city_id
      AND neighborhood = v_loc.name;

    IF v_count > 0 THEN
      RAISE EXCEPTION 'NEIGHBORHOOD_HAS_BIKES:%', v_count;
    END IF;
  END IF;

  DELETE FROM public.service_locations WHERE id = p_location_id;

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('neighborhood_deleted', 'service_locations', p_location_id::text, v_uid, v_uid,
          jsonb_build_object('name', v_loc.name, 'city_id', v_loc.city_id));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============================================================
-- FIX 7: delete_city_safe — blocks when any bikes belong to the city
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_city_safe(
  p_city_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_city record;
  v_bike_count int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_city FROM public.service_cities WHERE id = p_city_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CITY_NOT_FOUND'; END IF;

  SELECT COUNT(*) INTO v_bike_count
  FROM public.bike_types
  WHERE city_id = p_city_id;

  IF v_bike_count > 0 THEN
    RAISE EXCEPTION 'CITY_HAS_BIKES:%', v_bike_count;
  END IF;

  DELETE FROM public.service_locations WHERE city_id = p_city_id;
  DELETE FROM public.service_cities WHERE id = p_city_id;

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('city_deleted', 'service_cities', p_city_id::text, v_uid, v_uid,
          jsonb_build_object('name', v_city.name));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============================================================
-- FIX 4 (support): city_waitlist table for "Notify me" captures
-- ============================================================

CREATE TABLE IF NOT EXISTS public.city_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.service_cities(id) ON DELETE CASCADE,
  city_name text NOT NULL,
  email text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, email)
);

ALTER TABLE public.city_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join a city waitlist"
  ON public.city_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view waitlist"
  ON public.city_waitlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete waitlist entries"
  ON public.city_waitlist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS city_waitlist_city_idx ON public.city_waitlist (city_id);
CREATE INDEX IF NOT EXISTS city_waitlist_created_idx ON public.city_waitlist (created_at DESC);
