
-- 1) Bookings INSERT: restrict to authenticated and require user_id = auth.uid()
DROP POLICY IF EXISTS "Users can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users insert own bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 2) chat-attachments: drop overly permissive public SELECT policy
DROP POLICY IF EXISTS "Chat attachments are publicly readable" ON storage.objects;

-- 3) bike-images: require first path segment to equal uploader uid
DROP POLICY IF EXISTS "Auth users can upload bike images" ON storage.objects;
CREATE POLICY "Users upload bike images to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bike-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Users update own bike images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bike-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Users delete own bike images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bike-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) agency_withdrawal_requests: prevent users from updating after submission
-- (no user UPDATE policy means no user updates; admins keep their existing manage policy)
-- Just to be explicit, ensure no permissive UPDATE policy for users exists.
DROP POLICY IF EXISTS "Users can update their withdrawal requests" ON public.agency_withdrawal_requests;
DROP POLICY IF EXISTS "Users update own withdrawals" ON public.agency_withdrawal_requests;

-- 5) booking_notes: allow booking owner and assigned agency to SELECT their own
CREATE POLICY "Booking parties can read booking notes"
ON public.booking_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_notes.booking_id
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  )
);

-- 6) contact_messages: allow submitter to SELECT and DELETE their own when authenticated
CREATE POLICY "Submitters can view own contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Submitters can delete own contact messages"
ON public.contact_messages
FOR DELETE
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());
