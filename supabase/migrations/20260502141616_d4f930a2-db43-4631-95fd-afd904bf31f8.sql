
-- =========================================================
-- Phase A: Bike lifecycle hygiene
-- =========================================================

-- 1. Soft-delete columns
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.bikes      ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bike_types_archived_at ON public.bike_types(archived_at);
CREATE INDEX IF NOT EXISTS idx_bikes_archived_at ON public.bikes(archived_at);

-- 2. RLS on bikes: allow owners INSERT/UPDATE, admins UPDATE
DROP POLICY IF EXISTS "Owners can insert own bikes" ON public.bikes;
CREATE POLICY "Owners can insert own bikes"
  ON public.bikes FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update own bikes" ON public.bikes;
CREATE POLICY "Owners can update own bikes"
  ON public.bikes FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update bikes" ON public.bikes;
CREATE POLICY "Admins can update bikes"
  ON public.bikes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Rebuild bikes_public to exclude archived rows on either level
DROP VIEW IF EXISTS public.bikes_public CASCADE;
CREATE VIEW public.bikes_public
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.bike_type_id,
  b.location,
  b.available,
  b.condition,
  b.owner_id,
  b.agency_id,
  b.created_at,
  b.updated_at
FROM public.bikes b
JOIN public.bike_types bt ON bt.id = b.bike_type_id
LEFT JOIN public.agencies a ON a.id = b.agency_id
WHERE b.available = true
  AND b.approval_status = 'approved'
  AND b.archived_at IS NULL
  AND bt.approval_status = 'approved'
  AND bt.business_status = 'active'
  AND bt.archived_at IS NULL
  AND (b.agency_id IS NULL OR a.is_verified = true)
  AND public.is_owner_verified_agency(bt.owner_id);

GRANT SELECT ON public.bikes_public TO anon, authenticated;

-- 4. Rebuild city_bike_counts to match bikes_public semantics
DROP VIEW IF EXISTS public.city_bike_counts CASCADE;
CREATE VIEW public.city_bike_counts
WITH (security_invoker = on) AS
SELECT
  sc.id   AS city_id,
  sc.name AS name,
  COUNT(DISTINCT bt.id)::int AS bikes_available
FROM public.service_cities sc
LEFT JOIN public.bike_types bt
  ON bt.city_id = sc.id
 AND bt.approval_status = 'approved'
 AND bt.business_status = 'active'
 AND bt.archived_at IS NULL
 AND public.is_owner_verified_agency(bt.owner_id)
 AND EXISTS (
   SELECT 1 FROM public.bikes b
   WHERE b.bike_type_id = bt.id
     AND b.approval_status = 'approved'
     AND b.available = true
     AND b.archived_at IS NULL
 )
GROUP BY sc.id, sc.name;

GRANT SELECT ON public.city_bike_counts TO anon, authenticated;

-- 5. Auto-revert to pending when an approved listing's major fields change
CREATE OR REPLACE FUNCTION public.bike_types_revert_on_major_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when the row was already approved and an agency (non-admin) edits it
  IF OLD.approval_status = 'approved'
     AND NEW.approval_status = 'approved'
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  THEN
    IF (NEW.name              IS DISTINCT FROM OLD.name)
    OR (NEW.description       IS DISTINCT FROM OLD.description)
    OR (NEW.engine_cc         IS DISTINCT FROM OLD.engine_cc)
    OR (NEW.fuel_type         IS DISTINCT FROM OLD.fuel_type)
    OR (NEW.transmission      IS DISTINCT FROM OLD.transmission)
    OR (NEW.license_required  IS DISTINCT FROM OLD.license_required)
    OR (NEW.min_age           IS DISTINCT FROM OLD.min_age)
    OR (NEW.main_image_url    IS DISTINCT FROM OLD.main_image_url)
    OR (NEW.city_id           IS DISTINCT FROM OLD.city_id)
    OR (NEW.neighborhood      IS DISTINCT FROM OLD.neighborhood)
    THEN
      NEW.approval_status := 'pending';
      NEW.business_status := 'inactive';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bike_types_revert_on_major_edit ON public.bike_types;
CREATE TRIGGER trg_bike_types_revert_on_major_edit
BEFORE UPDATE ON public.bike_types
FOR EACH ROW EXECUTE FUNCTION public.bike_types_revert_on_major_edit();

-- 6. Mirror admin approval/rejection from bike_types to fleet units
CREATE OR REPLACE FUNCTION public.bike_types_mirror_status_to_units()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NEW.approval_status = 'approved' THEN
      UPDATE public.bikes
         SET approval_status = 'approved',
             updated_at = now()
       WHERE bike_type_id = NEW.id
         AND archived_at IS NULL
         AND approval_status <> 'approved';
      -- Activate listing if admin approval came through
      IF NEW.business_status = 'inactive' THEN
        NEW.business_status := 'active';
      END IF;
    ELSIF NEW.approval_status = 'rejected' THEN
      UPDATE public.bikes
         SET approval_status = 'rejected',
             updated_at = now()
       WHERE bike_type_id = NEW.id
         AND archived_at IS NULL;
    ELSIF NEW.approval_status = 'pending' THEN
      UPDATE public.bikes
         SET approval_status = 'pending',
             updated_at = now()
       WHERE bike_type_id = NEW.id
         AND archived_at IS NULL
         AND approval_status = 'approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bike_types_mirror_status ON public.bike_types;
CREATE TRIGGER trg_bike_types_mirror_status
BEFORE UPDATE ON public.bike_types
FOR EACH ROW EXECUTE FUNCTION public.bike_types_mirror_status_to_units();
