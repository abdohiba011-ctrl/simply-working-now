-- Selective re-verification: server-side safety net.
-- Resets bike to pending/inactive when "trigger" fields change post-approval.

CREATE OR REPLACE FUNCTION public.bike_types_selective_reverify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trigger_changed boolean := false;
BEGIN
  -- Only act on UPDATEs by non-admins, and only if currently approved or rejected.
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Admins bypass (their explicit approve/reject flows manage status directly).
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Only relevant when bike is currently approved or rejected.
  IF OLD.approval_status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Detect changes to "trigger" fields.
  IF (COALESCE(NEW.description,'')   <> COALESCE(OLD.description,''))
     OR (COALESCE(NEW.brand,'')      <> COALESCE(OLD.brand,''))
     OR (COALESCE(NEW.model,'')      <> COALESCE(OLD.model,''))
     OR (COALESCE(NEW.year, -1)      <> COALESCE(OLD.year, -1))
     OR (COALESCE(NEW.category,'')   <> COALESCE(OLD.category,''))
     OR (COALESCE(NEW.engine_cc, -1) <> COALESCE(OLD.engine_cc, -1))
     OR (COALESCE(NEW.fuel_type,'')  <> COALESCE(OLD.fuel_type,''))
     OR (COALESCE(NEW.transmission,'')      <> COALESCE(OLD.transmission,''))
     OR (COALESCE(NEW.license_required,'')  <> COALESCE(OLD.license_required,''))
     OR (COALESCE(NEW.main_image_url,'')    <> COALESCE(OLD.main_image_url,''))
  THEN
    trigger_changed := true;
  END IF;

  IF trigger_changed THEN
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

DROP TRIGGER IF EXISTS trg_bike_types_selective_reverify ON public.bike_types;
CREATE TRIGGER trg_bike_types_selective_reverify
BEFORE UPDATE ON public.bike_types
FOR EACH ROW
EXECUTE FUNCTION public.bike_types_selective_reverify();

-- When images change for an approved bike, also revert it to pending.
CREATE OR REPLACE FUNCTION public.bike_type_images_reverify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bike_type_id uuid;
  v_owner uuid;
  v_status text;
BEGIN
  v_bike_type_id := COALESCE(NEW.bike_type_id, OLD.bike_type_id);
  IF v_bike_type_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT owner_id, approval_status INTO v_owner, v_status
  FROM public.bike_types WHERE id = v_bike_type_id;

  -- Skip when admin is acting.
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only revert if currently approved or rejected.
  IF v_status IN ('approved', 'rejected') THEN
    UPDATE public.bike_types
       SET approval_status = 'pending',
           business_status = 'inactive',
           is_approved = false,
           rejection_reason = NULL,
           rejected_at = NULL,
           rejected_by = NULL
     WHERE id = v_bike_type_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_bike_type_images_reverify ON public.bike_type_images;
CREATE TRIGGER trg_bike_type_images_reverify
AFTER INSERT OR DELETE ON public.bike_type_images
FOR EACH ROW
EXECUTE FUNCTION public.bike_type_images_reverify();