-- Allow users to read their own ID documents (needed for upsert + signed URLs)
CREATE POLICY "Users can view their own ID docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to update (overwrite via upsert) their own ID documents
CREATE POLICY "Users can update their own ID docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'id-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'id-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own ID documents
CREATE POLICY "Users can delete their own ID docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'id-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow admins to view all ID documents (for verification review)
CREATE POLICY "Admins can view all ID docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
