CREATE POLICY "Admins can view all client files"
  ON public.client_files
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));