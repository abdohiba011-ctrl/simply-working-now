
-- 1A. Flip defaults
ALTER TABLE public.bike_types ALTER COLUMN approval_status SET DEFAULT 'pending';
ALTER TABLE public.bike_types ALTER COLUMN business_status SET DEFAULT 'inactive';
ALTER TABLE public.bike_types ALTER COLUMN is_approved SET DEFAULT false;

-- CHECK constraint (allow draft for wizard-in-progress)
ALTER TABLE public.bike_types
  ADD CONSTRAINT bike_types_approval_status_check
  CHECK (approval_status IN ('draft','pending','approved','rejected'));

-- 1B. Rejection columns
ALTER TABLE public.bike_types ADD COLUMN rejection_reason text NULL;
ALTER TABLE public.bike_types ADD COLUMN rejected_at timestamptz NULL;
ALTER TABLE public.bike_types ADD COLUMN rejected_by uuid NULL REFERENCES auth.users(id);

-- 1C. RPC: approve_bike_type
CREATE OR REPLACE FUNCTION public.approve_bike_type(p_bike_type_id uuid)
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
$$;

-- 1C. RPC: reject_bike_type
CREATE OR REPLACE FUNCTION public.reject_bike_type(p_bike_type_id uuid, p_reason text)
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
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 20 THEN
    RAISE EXCEPTION 'REASON_TOO_SHORT';
  END IF;

  SELECT * INTO v_bike FROM public.bike_types WHERE id = p_bike_type_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BIKE_NOT_FOUND'; END IF;

  UPDATE public.bike_types
     SET approval_status = 'rejected',
         is_approved = false,
         business_status = 'inactive',
         rejection_reason = p_reason,
         rejected_at = now(),
         rejected_by = v_uid,
         updated_at = now()
   WHERE id = p_bike_type_id;

  IF v_bike.owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    VALUES (
      v_bike.owner_id,
      'Bike rejected',
      'Your bike "' || v_bike.name || '" was rejected. Reason: ' || p_reason || '. You can edit and resubmit.',
      'bike_approval',
      '/agency/motorbikes/' || p_bike_type_id::text,
      '/agency/motorbikes/' || p_bike_type_id::text
    );
  END IF;

  INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
  VALUES ('bike_type_rejected', 'bike_types', p_bike_type_id::text, v_uid, v_bike.owner_id,
          jsonb_build_object('bike_name', v_bike.name, 'reason', p_reason));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 1D. Re-verification trigger function (significant field edits)
CREATE OR REPLACE FUNCTION public.bike_types_reverify_on_significant_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_significant_changed boolean := false;
BEGIN
  -- Skip during admin actions (approve/reject) and initial draft/pending transitions
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Don't re-verify if not currently approved (draft/pending/rejected can be edited freely)
  IF OLD.approval_status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.engine_cc IS DISTINCT FROM OLD.engine_cc
     OR NEW.fuel_type IS DISTINCT FROM OLD.fuel_type
     OR NEW.transmission IS DISTINCT FROM OLD.transmission
     OR NEW.license_required IS DISTINCT FROM OLD.license_required
     OR NEW.min_age IS DISTINCT FROM OLD.min_age
     OR NEW.main_image_url IS DISTINCT FROM OLD.main_image_url THEN
    v_significant_changed := true;
  END IF;

  IF v_significant_changed THEN
    NEW.approval_status := 'pending';
    NEW.business_status := 'inactive';
    NEW.is_approved := false;
    NEW.rejection_reason := NULL;
    NEW.rejected_at := NULL;
    NEW.rejected_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bike_type_reverify_on_significant_edit
  BEFORE UPDATE ON public.bike_types
  FOR EACH ROW
  EXECUTE FUNCTION public.bike_types_reverify_on_significant_edit();

-- AFTER UPDATE: notify owner + admins when re-verification fired
CREATE OR REPLACE FUNCTION public.bike_types_notify_on_reverify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_status = 'approved' AND NEW.approval_status = 'pending' THEN
    -- Notify owner
    IF NEW.owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        NEW.owner_id,
        'Bike resubmitted for review',
        'Your bike "' || NEW.name || '" has been resubmitted for review after edits. Status: pending.',
        'bike_approval',
        '/agency/motorbikes/' || NEW.id::text
      );
    END IF;
    -- Notify admins
    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    SELECT ur.user_id,
           'Bike re-submitted for review',
           NEW.name || ' was edited and is back in the review queue.',
           'bike_approval',
           '/admin/bikes/' || NEW.id::text,
           '/admin/bikes/' || NEW.id::text
      FROM public.user_roles ur
     WHERE ur.role = 'admin'::public.app_role AND ur.is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bike_type_notify_on_reverify
  AFTER UPDATE ON public.bike_types
  FOR EACH ROW
  EXECUTE FUNCTION public.bike_types_notify_on_reverify();

-- Photo add/remove → re-verify parent
CREATE OR REPLACE FUNCTION public.bike_type_images_reverify_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bike_type_id uuid;
  v_parent record;
BEGIN
  v_bike_type_id := COALESCE(NEW.bike_type_id, OLD.bike_type_id);
  IF v_bike_type_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Skip if admin is doing the change
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT * INTO v_parent FROM public.bike_types WHERE id = v_bike_type_id;
  IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;
  IF v_parent.approval_status <> 'approved' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.bike_types
     SET approval_status = 'pending',
         business_status = 'inactive',
         is_approved = false,
         rejection_reason = NULL,
         rejected_at = NULL,
         rejected_by = NULL,
         updated_at = now()
   WHERE id = v_bike_type_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_bike_type_images_reverify_parent
  AFTER INSERT OR DELETE ON public.bike_type_images
  FOR EACH ROW
  EXECUTE FUNCTION public.bike_type_images_reverify_parent();

-- 5C. Update bikes_public view to require business_status='active' on the parent bike_type
DROP VIEW IF EXISTS public.bikes_public;
CREATE VIEW public.bikes_public
WITH (security_invoker = true)
AS
  SELECT b.id,
         b.bike_type_id,
         b.location,
         b.available,
         b.condition,
         b.owner_id,
         b.agency_id,
         b.created_at,
         b.updated_at
    FROM public.bikes b
    LEFT JOIN public.agencies a ON a.id = b.agency_id
    LEFT JOIN public.bike_types bt ON bt.id = b.bike_type_id
   WHERE b.available = true
     AND b.approval_status = 'approved'
     AND bt.approval_status = 'approved'
     AND bt.business_status = 'active'
     AND (b.agency_id IS NULL OR a.is_verified = true);

GRANT SELECT ON public.bikes_public TO anon, authenticated;

-- 7A. Re-stamp Casa Moto Rent's seed bikes (preserve current approved/active state)
UPDATE public.bike_types
   SET approval_status = 'approved',
       is_approved = true,
       business_status = 'active'
 WHERE owner_id = (SELECT user_id FROM public.profiles WHERE email = 'abdrahimbamouh56@gmail.com')
   AND owner_id IS NOT NULL;
