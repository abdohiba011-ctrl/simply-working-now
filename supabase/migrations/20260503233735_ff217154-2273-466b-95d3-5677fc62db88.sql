-- Tighten admin RLS: admin governs (approve/reject/archive via SECURITY DEFINER RPCs),
-- agency owners are the only ones who can directly mutate bike data.

DROP POLICY IF EXISTS "Admins can manage bike types" ON public.bike_types;
DROP POLICY IF EXISTS "Admins can manage bike type images" ON public.bike_type_images;

CREATE POLICY "Admins can read all bike types"
  ON public.bike_types FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read all bike type images"
  ON public.bike_type_images FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- bike_inventory already has only a SELECT policy (no admin write policy existed),
-- so no changes needed there. Admin SELECT continues via the existing public read policy
-- which already includes has_role(auth.uid(), 'admin').
