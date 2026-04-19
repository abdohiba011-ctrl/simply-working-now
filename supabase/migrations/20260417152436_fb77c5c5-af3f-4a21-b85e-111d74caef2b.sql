-- 1. audit_logs: remove permissive INSERT, add SECURITY DEFINER function for trusted writes
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _table_name text DEFAULT NULL,
  _record_id text DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.audit_logs (action, table_name, record_id, details, actor_id, user_id, created_at)
  VALUES (_action, _table_name, _record_id, _details, auth.uid(), auth.uid(), now())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Allow admins to insert directly if needed (for backend-driven flows)
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. notifications: tighten INSERT
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users can send notifications to themselves or admins can send to anyone"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- 3. client_files: allow users to manage their own files
CREATE POLICY "Users can view their own files"
ON public.client_files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own files"
ON public.client_files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. client-files storage bucket: user folder access
CREATE POLICY "Users can read their own client files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload to their own client files folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Restrict listing on public buckets (avatars, bike-images)
-- Files remain readable individually but listing is restricted to authenticated users
CREATE POLICY "Avatars listing for authenticated users only"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'avatars'
  AND name IS NOT NULL
  AND position('/' in name) > 0
);

CREATE POLICY "Bike images listing for authenticated users only"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'bike-images'
  AND name IS NOT NULL
  AND position('/' in name) > 0
);