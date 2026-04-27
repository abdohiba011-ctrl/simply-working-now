-- Restrict public access to bikes table; anon must use bikes_public view which excludes license_plate and notes
DROP POLICY IF EXISTS "Public can view available bikes" ON public.bikes;

-- Authenticated users (renters) still need to read available bikes for booking flows.
-- They get full row access EXCEPT license_plate/notes which we only expose via the view going forward.
-- Re-create a policy scoped to authenticated only, since the public bikes_public view is what anon should use.
CREATE POLICY "Authenticated can view available bikes"
ON public.bikes
FOR SELECT
TO authenticated
USING (available = true);

-- Ensure bikes_public view is accessible to anon (it should be by default, grant explicitly)
GRANT SELECT ON public.bikes_public TO anon, authenticated;