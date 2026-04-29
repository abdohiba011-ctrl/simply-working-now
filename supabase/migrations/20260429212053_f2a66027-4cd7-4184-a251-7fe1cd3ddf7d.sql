-- bike_types: owner write policies
CREATE POLICY "Owners can insert own bike types"
ON public.bike_types FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own bike types"
ON public.bike_types FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete own bike types"
ON public.bike_types FOR DELETE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Admins can manage bike types"
ON public.bike_types FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- bike_type_images: owner write policies (owner derived via parent bike_types)
CREATE POLICY "Owners can insert own bike type images"
ON public.bike_type_images FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bike_types bt
  WHERE bt.id = bike_type_images.bike_type_id AND bt.owner_id = auth.uid()
));

CREATE POLICY "Owners can update own bike type images"
ON public.bike_type_images FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bike_types bt
  WHERE bt.id = bike_type_images.bike_type_id AND bt.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bike_types bt
  WHERE bt.id = bike_type_images.bike_type_id AND bt.owner_id = auth.uid()
));

CREATE POLICY "Owners can delete own bike type images"
ON public.bike_type_images FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bike_types bt
  WHERE bt.id = bike_type_images.bike_type_id AND bt.owner_id = auth.uid()
));

CREATE POLICY "Admins can manage bike type images"
ON public.bike_type_images FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));