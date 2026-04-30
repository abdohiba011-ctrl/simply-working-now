
-- bike_types: replace open SELECT with verified-only public access
DROP POLICY IF EXISTS "Anyone can view bike types" ON public.bike_types;

CREATE POLICY "Public can view approved verified bike types"
ON public.bike_types
FOR SELECT
TO anon, authenticated
USING (
  (
    approval_status = 'approved'
    AND business_status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.profiles p ON p.id = a.profile_id
      WHERE p.user_id = bike_types.owner_id
        AND a.is_verified = true
    )
  )
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- bike_type_images: same logic via join to bike_types
DROP POLICY IF EXISTS "Anyone can view bike images" ON public.bike_type_images;

CREATE POLICY "Public can view images of approved verified bike types"
ON public.bike_type_images
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bike_types bt
    WHERE bt.id = bike_type_images.bike_type_id
      AND (
        (
          bt.approval_status = 'approved'
          AND bt.business_status = 'active'
          AND EXISTS (
            SELECT 1
            FROM public.agencies a
            JOIN public.profiles p ON p.id = a.profile_id
            WHERE p.user_id = bt.owner_id
              AND a.is_verified = true
          )
        )
        OR bt.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

-- bike_inventory: same logic via join
DROP POLICY IF EXISTS "Anyone can view inventory" ON public.bike_inventory;

CREATE POLICY "Public can view inventory of approved verified bike types"
ON public.bike_inventory
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bike_types bt
    WHERE bt.id = bike_inventory.bike_type_id
      AND (
        (
          bt.approval_status = 'approved'
          AND bt.business_status = 'active'
          AND EXISTS (
            SELECT 1
            FROM public.agencies a
            JOIN public.profiles p ON p.id = a.profile_id
            WHERE p.user_id = bt.owner_id
              AND a.is_verified = true
          )
        )
        OR bt.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

-- bike_reviews: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.bike_reviews;

CREATE POLICY "Authenticated users can view reviews"
ON public.bike_reviews
FOR SELECT
TO authenticated
USING (true);
