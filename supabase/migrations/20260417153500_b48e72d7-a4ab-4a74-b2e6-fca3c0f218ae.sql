-- Owner-scoped UPDATE/DELETE policies for bike-images, id-documents, signed-contracts
-- Convention: files are stored under a path where the first folder segment is the owner's auth.uid()

-- bike-images (public bucket): owners can update/delete their own files; admins can manage all
DROP POLICY IF EXISTS "Owners can update bike-images" ON storage.objects;
CREATE POLICY "Owners can update bike-images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'bike-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Owners can delete bike-images" ON storage.objects;
CREATE POLICY "Owners can delete bike-images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'bike-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- id-documents (private bucket)
DROP POLICY IF EXISTS "Owners can update id-documents" ON storage.objects;
CREATE POLICY "Owners can update id-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'id-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Owners can delete id-documents" ON storage.objects;
CREATE POLICY "Owners can delete id-documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'id-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- signed-contracts (private bucket)
DROP POLICY IF EXISTS "Owners can update signed-contracts" ON storage.objects;
CREATE POLICY "Owners can update signed-contracts"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'signed-contracts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Owners can delete signed-contracts" ON storage.objects;
CREATE POLICY "Owners can delete signed-contracts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'signed-contracts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);