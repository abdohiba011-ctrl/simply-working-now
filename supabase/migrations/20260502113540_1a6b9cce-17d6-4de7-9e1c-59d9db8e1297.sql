-- SECURITY DEFINER helper: bypasses RLS on profiles/agencies so anon's
-- public RLS policy on bike_types can succeed.
CREATE OR REPLACE FUNCTION public.is_owner_verified_agency(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.profiles p ON p.id = a.profile_id
    WHERE p.user_id = _owner_id
      AND a.is_verified = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_owner_verified_agency(uuid) TO anon, authenticated;

-- Replace the bike_types public SELECT policy
DROP POLICY IF EXISTS "Public can view approved verified bike types" ON public.bike_types;
CREATE POLICY "Public can view approved verified bike types"
ON public.bike_types FOR SELECT
TO anon, authenticated
USING (
  (
    approval_status = 'approved'
    AND business_status = 'active'
    AND public.is_owner_verified_agency(owner_id)
  )
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Replace the bike_type_images public SELECT policy
DROP POLICY IF EXISTS "Public can view images of approved verified bike types" ON public.bike_type_images;
CREATE POLICY "Public can view images of approved verified bike types"
ON public.bike_type_images FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bike_type_images.bike_type_id
      AND (
        (
          bt.approval_status = 'approved'
          AND bt.business_status = 'active'
          AND public.is_owner_verified_agency(bt.owner_id)
        )
        OR bt.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

-- Replace the bike_inventory public SELECT policy
DROP POLICY IF EXISTS "Public can view inventory of approved verified bike types" ON public.bike_inventory;
CREATE POLICY "Public can view inventory of approved verified bike types"
ON public.bike_inventory FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bike_inventory.bike_type_id
      AND (
        (
          bt.approval_status = 'approved'
          AND bt.business_status = 'active'
          AND public.is_owner_verified_agency(bt.owner_id)
        )
        OR bt.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);