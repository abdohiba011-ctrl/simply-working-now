DROP POLICY IF EXISTS "Anyone can view bikes" ON public.bikes;

CREATE POLICY "Authenticated users can view bikes"
ON public.bikes
FOR SELECT
TO authenticated
USING (true);