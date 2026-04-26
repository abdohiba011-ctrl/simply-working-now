
-- ============================================================
-- 1. user_roles: prevent privilege escalation
-- Block any INSERT/UPDATE/DELETE on user_roles unless performed
-- by a verified admin OR by the service_role (edge functions / handle_new_agency_role).
-- A trigger gives defense-in-depth even if a SECURITY DEFINER
-- function were misconfigured.
-- ============================================================
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
  v_target_role text;
BEGIN
  -- Allow service role (edge functions, triggers running as postgres) unconditionally.
  IF v_role IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determine target role being written
  IF TG_OP = 'DELETE' THEN
    v_target_role := OLD.role::text;
  ELSE
    v_target_role := NEW.role::text;
  END IF;

  -- Check admin via user_roles directly (avoid recursion: SECURITY DEFINER bypasses RLS)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'::public.app_role
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Allow self-insert of NON-admin roles only when no admin role is being granted.
  -- This supports the handle_new_agency_role flow if it ever runs as the user.
  IF TG_OP = 'INSERT' AND v_target_role <> 'admin' AND NEW.user_id = v_uid THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'FORBIDDEN: only admins can modify user_roles';
END;
$$;

DROP TRIGGER IF EXISTS guard_user_roles_write_trg ON public.user_roles;
CREATE TRIGGER guard_user_roles_write_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles_write();

-- ============================================================
-- 2. profiles: also lock ID document fields after they've been
-- approved (verification_status = 'approved'). Users can still
-- upload during 'not_started' / 'pending' / 'rejected' phases.
-- ============================================================
CREATE OR REPLACE FUNCTION public.profiles_protect_id_docs_after_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Once approved, ID document fields are immutable for the user.
  IF COALESCE(OLD.verification_status, 'not_started') = 'approved' THEN
    NEW.id_card_number       := OLD.id_card_number;
    NEW.id_front_image_url   := OLD.id_front_image_url;
    NEW.id_back_image_url    := OLD.id_back_image_url;
    NEW.selfie_with_id_url   := OLD.selfie_with_id_url;
    NEW.first_name_on_id     := OLD.first_name_on_id;
    NEW.family_name_on_id    := OLD.family_name_on_id;
    NEW.full_name_on_id      := OLD.full_name_on_id;
    NEW.date_of_birth        := OLD.date_of_birth;
    NEW.nationality          := OLD.nationality;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_id_docs_trg ON public.profiles;
CREATE TRIGGER profiles_protect_id_docs_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_id_docs_after_approval();

-- ============================================================
-- 3. realtime: restrict channel subscriptions for booking topics
-- Topic convention used in the app: 'booking:<booking_id>'
-- Only the renter (bookings.user_id) and the agency
-- (bookings.assigned_to_business) — plus admins — can subscribe.
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking parties can subscribe to booking topics" ON realtime.messages;
CREATE POLICY "Booking parties can subscribe to booking topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Non-booking topics: allow (other features rely on realtime too).
  COALESCE(realtime.topic(), '') NOT LIKE 'booking:%'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = split_part(realtime.topic(), ':', 2)
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  )
);

-- ============================================================
-- 4. bikes: hide license_plate and notes from public SELECT.
-- Replace the broad public SELECT policy with a column-aware
-- approach: keep public SELECT, but expose a sanitized view for
-- public consumption and revoke direct SELECT on sensitive cols.
-- Postgres lacks per-column RLS, so we use column GRANTs.
-- ============================================================
-- Revoke broad SELECT on the table from anon/authenticated, then
-- grant SELECT only on safe columns. The existing policy still
-- gates row visibility; column grants gate column visibility.
REVOKE SELECT ON public.bikes FROM anon, authenticated;

GRANT SELECT
  (id, bike_type_id, available, condition, location, owner_id, created_at, updated_at)
  ON public.bikes TO anon, authenticated;

-- Owners and admins still need full access; they go through the
-- "Owners and admins can manage/view bikes" policies which run as
-- authenticated. Re-grant full SELECT to authenticated only via
-- a separate path: keep license_plate/notes accessible only via
-- the existing owner/admin policies — owners querying their own
-- rows will be filtered by RLS, but column-level GRANT applies
-- globally. To preserve owner access to license_plate/notes,
-- create a SECURITY DEFINER helper view.

CREATE OR REPLACE VIEW public.bikes_owner_view
WITH (security_invoker = true) AS
SELECT * FROM public.bikes
WHERE auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.bikes_owner_view TO authenticated;
