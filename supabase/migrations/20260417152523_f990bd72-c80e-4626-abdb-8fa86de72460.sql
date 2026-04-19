DROP POLICY IF EXISTS "Public can submit contact messages" ON public.contact_messages;

CREATE POLICY "Public can submit valid contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (email IS NOT NULL OR phone IS NOT NULL)
  AND message IS NOT NULL
  AND length(trim(message)) > 0
);