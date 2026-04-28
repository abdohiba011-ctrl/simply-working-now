-- Fix Security Definer View finding: make bikes_public run as invoker
ALTER VIEW public.bikes_public SET (security_invoker = on);

-- Fix RLS-enabled-no-policy: add admin-only access policies on internal tables.
-- These tables hold internal/audit data; only admins should access them directly.
-- (Writes to audit_logs/verification_codes/timeline events still happen via SECURITY DEFINER functions/triggers, which bypass RLS.)

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view verification codes"
  ON public.verification_codes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view client timeline events"
  ON public.client_timeline_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert client timeline events"
  ON public.client_timeline_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view client trust events"
  ON public.client_trust_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert client trust events"
  ON public.client_trust_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view user notes"
  ON public.user_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage user notes"
  ON public.user_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));