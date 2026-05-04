-- 1. Remove the conflicting permissive INSERT policy on chat-attachments
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;

-- 2. Admin SELECT/UPDATE/DELETE on client-files bucket
CREATE POLICY "Admins can view all client files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-files' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'client-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete client files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Public SELECT on bike-images bucket
CREATE POLICY "Public can view bike images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'bike-images');