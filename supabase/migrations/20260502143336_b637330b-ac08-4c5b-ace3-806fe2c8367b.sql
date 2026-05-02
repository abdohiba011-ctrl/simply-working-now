
-- Backfill bike_types.main_image_url from bike_type_images when null
UPDATE public.bike_types bt
SET main_image_url = sub.image_url
FROM (
  SELECT DISTINCT ON (bike_type_id) bike_type_id, image_url
  FROM public.bike_type_images
  ORDER BY bike_type_id, display_order ASC, created_at ASC
) sub
WHERE bt.id = sub.bike_type_id AND bt.main_image_url IS NULL;

-- RPC: unarchive a bike type (owner or admin only). Sets business_status='inactive'
-- so the agency must explicitly re-enable availability.
CREATE OR REPLACE FUNCTION public.unarchive_bike_type(p_bike_type_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.bike_types WHERE id = p_bike_type_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Bike type not found';
  END IF;
  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.bike_types
    SET archived_at = NULL,
        business_status = 'inactive',
        updated_at = now()
    WHERE id = p_bike_type_id;
  UPDATE public.bikes
    SET archived_at = NULL,
        updated_at = now()
    WHERE bike_type_id = p_bike_type_id;
END;
$$;

-- RPC: hard-delete a bike type only when there are no bookings tied to its units.
CREATE OR REPLACE FUNCTION public.delete_bike_type_if_safe(p_bike_type_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_has_bookings boolean;
BEGIN
  SELECT owner_id INTO v_owner FROM public.bike_types WHERE id = p_bike_type_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Bike type not found';
  END IF;
  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.bikes bk ON bk.id = b.bike_id
    WHERE bk.bike_type_id = p_bike_type_id
  ) INTO v_has_bookings;

  IF v_has_bookings THEN
    RAISE EXCEPTION 'Cannot delete: this bike has booking history. Keep it archived.';
  END IF;

  DELETE FROM public.bike_holds WHERE bike_id IN (SELECT id FROM public.bikes WHERE bike_type_id = p_bike_type_id);
  DELETE FROM public.bike_inventory WHERE bike_type_id = p_bike_type_id;
  DELETE FROM public.bike_type_images WHERE bike_type_id = p_bike_type_id;
  DELETE FROM public.bike_reviews WHERE bike_type_id = p_bike_type_id;
  DELETE FROM public.bikes WHERE bike_type_id = p_bike_type_id;
  DELETE FROM public.bike_types WHERE id = p_bike_type_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unarchive_bike_type(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_bike_type_if_safe(uuid) TO authenticated;

-- Trigger: keep bike_types.main_image_url in sync with first bike_type_images row
CREATE OR REPLACE FUNCTION public.sync_bike_type_main_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bike_type_id uuid;
  v_first text;
BEGIN
  v_bike_type_id := COALESCE(NEW.bike_type_id, OLD.bike_type_id);
  SELECT image_url INTO v_first
    FROM public.bike_type_images
    WHERE bike_type_id = v_bike_type_id
    ORDER BY display_order ASC, created_at ASC
    LIMIT 1;
  UPDATE public.bike_types
    SET main_image_url = v_first,
        updated_at = now()
    WHERE id = v_bike_type_id
      AND main_image_url IS DISTINCT FROM v_first;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bike_type_main_image ON public.bike_type_images;
CREATE TRIGGER trg_sync_bike_type_main_image
AFTER INSERT OR UPDATE OR DELETE ON public.bike_type_images
FOR EACH ROW EXECUTE FUNCTION public.sync_bike_type_main_image();
