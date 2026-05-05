-- Drop overly broad authenticated SELECT on bikes
DROP POLICY IF EXISTS "Authenticated can view available bikes" ON public.bikes;

-- Drop overly broad authenticated SELECT on agencies
DROP POLICY IF EXISTS "Authenticated can view verified agencies" ON public.agencies;

-- Tighten city_waitlist INSERT: signed-in users can only submit their own row
DROP POLICY IF EXISTS "Anyone can join a city waitlist" ON public.city_waitlist;

CREATE POLICY "Anon can join city waitlist"
ON public.city_waitlist
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated can join city waitlist as self"
ON public.city_waitlist
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());