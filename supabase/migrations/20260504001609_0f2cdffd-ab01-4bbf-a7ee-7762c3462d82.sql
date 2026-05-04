CREATE POLICY "Anon can view verified agencies"
ON public.agencies FOR SELECT
TO anon
USING (
  is_verified = true 
  AND COALESCE(is_suspended, false) = false
);