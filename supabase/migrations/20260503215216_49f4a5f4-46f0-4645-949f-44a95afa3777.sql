-- FIX 3: photo trigger fires on UPDATE too, only for image_url change
CREATE OR REPLACE FUNCTION public.bike_type_images_reverify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bike_type_id uuid;
  v_owner uuid;
  v_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url THEN
    RETURN NEW;
  END IF;

  v_bike_type_id := COALESCE(NEW.bike_type_id, OLD.bike_type_id);
  IF v_bike_type_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT owner_id, approval_status INTO v_owner, v_status
  FROM public.bike_types WHERE id = v_bike_type_id;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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
$function$;

DROP TRIGGER IF EXISTS trg_bike_type_images_reverify ON public.bike_type_images;
CREATE TRIGGER trg_bike_type_images_reverify
AFTER INSERT OR UPDATE OR DELETE ON public.bike_type_images
FOR EACH ROW
EXECUTE FUNCTION public.bike_type_images_reverify();

-- FIX 4: agencies_public view exposes delivery columns
DROP VIEW IF EXISTS public.agencies_public CASCADE;
CREATE VIEW public.agencies_public
WITH (security_invoker = on) AS
SELECT
  id,
  profile_id,
  business_name,
  city,
  primary_neighborhood,
  bio,
  logo_url,
  is_verified,
  delivery_offered,
  delivery_fee_mad,
  delivery_radius_km,
  created_at
FROM public.agencies
WHERE is_verified = true
  AND COALESCE(is_suspended, false) = false;

GRANT SELECT ON public.agencies_public TO anon, authenticated;