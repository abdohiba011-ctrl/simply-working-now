
-- 1. Sync trigger admin_employees -> user_roles
CREATE OR REPLACE FUNCTION public.sync_admin_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only remove admin role if this user is no longer in admin_employees
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_employees WHERE user_id = OLD.user_id
    ) THEN
      DELETE FROM public.user_roles
      WHERE user_id = OLD.user_id AND role = 'admin'::public.app_role;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_employees_sync_roles_ins ON public.admin_employees;
DROP TRIGGER IF EXISTS trg_admin_employees_sync_roles_del ON public.admin_employees;

CREATE TRIGGER trg_admin_employees_sync_roles_ins
AFTER INSERT ON public.admin_employees
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role_to_user_roles();

CREATE TRIGGER trg_admin_employees_sync_roles_del
AFTER DELETE ON public.admin_employees
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role_to_user_roles();

-- 2. Backfill (idempotent)
DO $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO public.user_roles (user_id, role)
  SELECT ae.user_id, 'admin'::public.app_role
  FROM public.admin_employees ae
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = ae.user_id AND ur.role = 'admin'::public.app_role
  )
  ON CONFLICT DO NOTHING;
END $$;

-- 3. Sync status function (admin-only)
CREATE OR REPLACE FUNCTION public.admin_role_sync_status()
RETURNS TABLE(user_id uuid, missing_role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
  SELECT ae.user_id, 'admin'::text
  FROM public.admin_employees ae
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = ae.user_id AND ur.role = 'admin'::public.app_role
  );
END;
$$;

-- 4. Lock down SECURITY DEFINER functions that should never be called by anon/auth via PostgREST
-- Trigger-only functions
REVOKE EXECUTE ON FUNCTION public.sync_admin_role_to_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_enforce_canonical_price() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_protect_sensitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_restrict_user_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.booking_messages_restrict_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_booking_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_protect_id_docs_after_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_agency_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_user_roles_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Service-role / cron only
REVOKE EXECUTE ON FUNCTION public.enforce_subscription_lifecycle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_renter_wallet(uuid, numeric, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Anon should not call these; authenticated keeps EXECUTE (used by app RPCs / RLS)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_bike_hold(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_hold_to_booking(uuid, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_booking(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_plan_downgrade() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_role_sync_status() FROM anon;
