ALTER TABLE public.bike_types
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

CREATE OR REPLACE FUNCTION public.approve_bike_type(p_bike_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_bike record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_bike FROM public.bike_types WHERE id = p_bike_type_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BIKE_NOT_FOUND'; END IF;

  UPDATE public.bike_types
     SET approval_status = 'approved',
         is_approved = true,
         business_status = 'active',
         rejection_reason = NULL,
         rejected_at = NULL,
         rejected_by = NULL,
         approved_at = now(),
         approved_by = v_uid,
         updated_at = now()
   WHERE id = p_bike_type_id;

  IF v_bike.owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    VALUES (
      v_bike.owner_id,
      'Bike approved',
      'Your bike "' || v_bike.name || '" has been approved and is now live on Motonita.',
      'bike_approval',
      '/agency/motorbikes/' || p_bike_type_id::text,
      '/agency/motorbikes/' || p_bike_type_id::text
    );
  END IF;

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('bike_type_approved', 'bike_types', p_bike_type_id::text, v_uid, v_bike.owner_id,
          jsonb_build_object('bike_name', v_bike.name));

  RETURN jsonb_build_object('ok', true);
END;
$function$;