-- =========================================================
-- Fix 1: verification_codes — store only hashed codes,
-- block all client access (service role only).
-- =========================================================

-- Add hashed-code column for future writers (edge functions
-- should hash before insert and compare hashes on verify).
ALTER TABLE public.verification_codes
  ADD COLUMN IF NOT EXISTS code_hash text;

COMMENT ON COLUMN public.verification_codes.code IS
  'DEPRECATED: do not write plaintext codes here. Use code_hash (sha256 hex) instead. Reads must go through SECURITY DEFINER functions or service role only.';

COMMENT ON COLUMN public.verification_codes.code_hash IS
  'SHA-256 hex digest of the verification code. Edge functions must hash the user-supplied code and compare against this column, while also enforcing expires_at > now(), used_at IS NULL, and attempts < max_attempts.';

-- Purge any existing plaintext codes — they should be treated as compromised.
UPDATE public.verification_codes
   SET code = '',
       used_at = COALESCE(used_at, now())
 WHERE used_at IS NULL;

-- Drop the admin SELECT policy: nobody should read verification codes
-- through the API, not even admins. Verification flows must run via
-- service_role inside edge functions, which bypasses RLS entirely.
DROP POLICY IF EXISTS "Admins can view verification codes" ON public.verification_codes;

-- RLS stays enabled with no policies → all client access denied by default.
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes FORCE ROW LEVEL SECURITY;

-- =========================================================
-- Fix 2: admin_employees — remove self-referential ALL policy,
-- split into granular policies, prevent self-promotion / self-demotion.
-- =========================================================

DROP POLICY IF EXISTS "Super admins can manage employees" ON public.admin_employees;

-- SELECT: super admins can list employees (uses SECURITY DEFINER helper,
-- so it does not recursively re-evaluate RLS on admin_employees).
CREATE POLICY "Super admins can view employees"
ON public.admin_employees
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- INSERT: only super admins may add new employees, and they cannot
-- insert a row for themselves (prevents self-promotion if their existing
-- super_admin row is ever revoked but session still has the role cached).
CREATE POLICY "Super admins can add employees"
ON public.admin_employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  AND user_id <> auth.uid()
);

-- UPDATE: super admins may edit other employees only — never their own row.
-- WITH CHECK also prevents handing super_admin to themselves via update.
CREATE POLICY "Super admins can update other employees"
ON public.admin_employees
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  AND user_id <> auth.uid()
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  AND user_id <> auth.uid()
);

-- DELETE: super admins may remove other employees, never themselves.
CREATE POLICY "Super admins can remove other employees"
ON public.admin_employees
FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  AND user_id <> auth.uid()
);

ALTER TABLE public.admin_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_employees FORCE ROW LEVEL SECURITY;