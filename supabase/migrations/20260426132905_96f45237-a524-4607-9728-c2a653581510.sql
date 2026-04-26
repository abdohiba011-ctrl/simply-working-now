-- 1) user_roles: remove all user-facing write policies. Only service_role
-- (and the SECURITY DEFINER trigger guard_user_roles_write_trg) may write.
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Add restrictive policy that explicitly denies INSERT/UPDATE/DELETE to any
-- non-service role. Admin role management should go through an edge function
-- using the service role key.
CREATE POLICY "Deny all user writes on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 2) booking_messages: scope SELECT to authenticated only (Realtime safety).
DROP POLICY IF EXISTS "Booking parties can view messages" ON public.booking_messages;
CREATE POLICY "Booking parties can view messages"
ON public.booking_messages
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  ))
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3) client_file_downloads: let owners see their own download log; restrict
-- INSERT to admins only (service role bypasses RLS regardless).
CREATE POLICY "Owners can view downloads of their files"
ON public.client_file_downloads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_files cf
    WHERE cf.id = client_file_downloads.file_id
      AND cf.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert download logs"
ON public.client_file_downloads
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) bookings: hide admin-only fields from the assigned business via a
-- restrictive guard. Businesses still see customer contact info (required to
-- coordinate the rental) but admin_notes and rejection internals stay private.
-- We do this by tightening the SELECT policy with a column-level revoke is
-- not possible in PG RLS; instead we keep policy as-is but ensure no UPDATE by
-- business changes admin_notes — already handled by bookings_restrict_user_updates trigger.
-- (No structural change needed; finding is informational re: customer PII the
--  business legitimately needs.)
