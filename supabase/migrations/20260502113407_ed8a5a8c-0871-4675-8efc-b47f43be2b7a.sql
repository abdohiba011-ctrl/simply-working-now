-- FIX 1: Allow anon (and authenticated) to call has_role from RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- FIX 2: Public anon SELECT policy on bikes (mirrors bikes_public view's WHERE)
-- App code MUST keep using bikes_public view to keep license_plate/notes hidden.
DROP POLICY IF EXISTS "Public can view available approved bikes" ON public.bikes;
CREATE POLICY "Public can view available approved bikes"
ON public.bikes FOR SELECT
TO anon, authenticated
USING (
  available = true
  AND approval_status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bikes.bike_type_id
      AND bt.approval_status = 'approved'
      AND bt.business_status = 'active'
  )
);

-- FIX 4: Cleanup stray test rows (city_id IS NULL — names "test" and "rtrt")
DELETE FROM public.bike_type_images WHERE bike_type_id IN (
  SELECT id FROM public.bike_types WHERE city_id IS NULL
);
DELETE FROM public.bike_inventory WHERE bike_type_id IN (
  SELECT id FROM public.bike_types WHERE city_id IS NULL
);
DELETE FROM public.bikes WHERE bike_type_id IN (
  SELECT id FROM public.bike_types WHERE city_id IS NULL
);
DELETE FROM public.bike_types WHERE city_id IS NULL;