-- Allow agency owners to view their own bikes (including unavailable ones)
CREATE POLICY "Owners can view own bikes"
ON public.bikes
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Allow admins to view all bikes regardless of availability
CREATE POLICY "Admins can view all bikes"
ON public.bikes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));