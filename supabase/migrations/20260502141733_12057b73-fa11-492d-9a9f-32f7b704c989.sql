
CREATE OR REPLACE FUNCTION public.archive_bike_type(p_bike_type_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bike record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_bike FROM public.bike_types WHERE id = p_bike_type_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BIKE_NOT_FOUND'; END IF;
  IF v_bike.owner_id <> v_uid AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.bike_types
     SET archived_at = now(),
         business_status = 'inactive',
         updated_at = now()
   WHERE id = p_bike_type_id;

  UPDATE public.bikes
     SET archived_at = now(),
         available = false,
         updated_at = now()
   WHERE bike_type_id = p_bike_type_id
     AND archived_at IS NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_bike_type_availability(p_bike_type_id uuid, p_available boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bike record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_bike FROM public.bike_types WHERE id = p_bike_type_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BIKE_NOT_FOUND'; END IF;
  IF v_bike.owner_id <> v_uid AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.bikes
     SET available = p_available,
         updated_at = now()
   WHERE bike_type_id = p_bike_type_id
     AND archived_at IS NULL;

  UPDATE public.bike_types
     SET availability_status = CASE WHEN p_available THEN 'available' ELSE 'unavailable' END,
         updated_at = now()
   WHERE id = p_bike_type_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_bike_type(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_bike_type_availability(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_bike_type(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_bike_type_availability(uuid, boolean) TO authenticated;
