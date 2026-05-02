
-- Add file metadata columns to booking_messages
ALTER TABLE public.booking_messages
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint,
  ADD COLUMN IF NOT EXISTS attachment_mime text;

-- Storage policies for new path layout: <booking_id>/<sender_id>/<timestamp>_<filename>
DROP POLICY IF EXISTS "chat-attachments parties read v2" ON storage.objects;
CREATE POLICY "chat-attachments parties read v2"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "chat-attachments parties upload v2" ON storage.objects;
CREATE POLICY "chat-attachments parties upload v2"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (storage.foldername(name))[2] = auth.uid()::text
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  )
);
