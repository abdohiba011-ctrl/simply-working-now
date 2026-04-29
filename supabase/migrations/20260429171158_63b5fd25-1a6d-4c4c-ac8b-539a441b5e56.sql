-- 1) Verification codes: drop plaintext column, lock down reads
ALTER TABLE public.verification_codes DROP COLUMN IF EXISTS code;

-- Ensure RLS on and remove any lingering select policy
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view verification codes" ON public.verification_codes;

-- Explicit deny for authenticated/anon (service role bypasses RLS)
CREATE POLICY "No client read access to verification codes"
ON public.verification_codes
FOR SELECT
TO authenticated, anon
USING (false);

-- 2) Client files: scope admin policy + allow owners to delete their own
DROP POLICY IF EXISTS "Admins can manage all client files" ON public.client_files;

CREATE POLICY "Admins can update client files"
ON public.client_files
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND user_id = (SELECT cf.user_id FROM public.client_files cf WHERE cf.id = client_files.id)
);

CREATE POLICY "Admins can delete client files"
ON public.client_files
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can delete their own files"
ON public.client_files
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);