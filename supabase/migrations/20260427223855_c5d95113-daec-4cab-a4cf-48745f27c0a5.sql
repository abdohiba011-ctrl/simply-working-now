
CREATE OR REPLACE FUNCTION public.guard_user_roles_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('role', true);
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  -- Inside another trigger (e.g. handle_new_user) → trust it
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_role IN ('service_role', 'supabase_admin', 'supabase_auth_admin', 'postgres') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'::public.app_role AND is_active = true
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'FORBIDDEN: only admins can modify user_roles';
END;
$$;
