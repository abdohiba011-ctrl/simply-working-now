-- ============================================================================
-- PHASE A: WIPE ALL USER DATA (cascades through every user-linked table)
-- ============================================================================

-- Drop dependent triggers first to avoid noise
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_role_created ON public.user_roles;
DROP TRIGGER IF EXISTS sync_admin_role ON public.admin_employees;
DROP TRIGGER IF EXISTS guard_user_roles ON public.user_roles;
DROP TRIGGER IF EXISTS profiles_protect_id_docs ON public.profiles;
DROP TRIGGER IF EXISTS bookings_canonical_price ON public.bookings;
DROP TRIGGER IF EXISTS bookings_protect_sensitive ON public.bookings;
DROP TRIGGER IF EXISTS bookings_restrict_user ON public.bookings;
DROP TRIGGER IF EXISTS booking_messages_restrict ON public.booking_messages;
DROP TRIGGER IF EXISTS audit_booking_message_trg ON public.booking_messages;

-- Wipe all user-linked rows. Order matters; we go from leaves to roots,
-- but FK cascades will handle most of it once we hit auth.users.
TRUNCATE TABLE
  public.booking_payments,
  public.booking_messages,
  public.booking_events,
  public.booking_notes,
  public.bike_reviews,
  public.bike_holds,
  public.bookings,
  public.bikes,
  public.bike_types,
  public.agency_wallet_transactions,
  public.agency_wallets,
  public.agency_withdrawal_requests,
  public.agency_subscriptions,
  public.renter_wallet_transactions,
  public.renter_wallets,
  public.client_files,
  public.client_file_downloads,
  public.client_trust_events,
  public.client_timeline_events,
  public.notifications,
  public.contact_messages,
  public.audit_logs,
  public.admin_employees,
  public.user_roles,
  public.profiles
RESTART IDENTITY CASCADE;

-- Wipe auth.users last (cascade will catch any stragglers)
DELETE FROM auth.users;

-- ============================================================================
-- DROP OLD AUTH STRUCTURE (we'll rebuild profiles + user_roles cleanly)
-- ============================================================================

-- Old SECURITY DEFINER functions that we're rewriting
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_agency_role() CASCADE;
DROP FUNCTION IF EXISTS public.guard_user_roles_write() CASCADE;
DROP FUNCTION IF EXISTS public.profiles_protect_id_docs_after_approval() CASCADE;
DROP FUNCTION IF EXISTS public.sync_admin_role_to_user_roles() CASCADE;

-- Drop profiles last (other tables reference it through auth.users.id, not directly)
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Recreate the app_role enum cleanly
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('renter', 'agency', 'admin');

-- ============================================================================
-- NEW PROFILES TABLE (id = surrogate PK, user_id = FK to auth.users)
-- ============================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  avatar_url text,
  preferred_language text DEFAULT 'en' CHECK (preferred_language IN ('en','fr','ar')),
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  last_login_at timestamptz,
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NEW USER_ROLES TABLE
-- ============================================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NEW VERIFICATION_CODES TABLE
-- ============================================================================
CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('email_verify','password_reset','phone_verify')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_codes_lookup
  ON public.verification_codes(email, purpose, expires_at);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NEW AGENCIES TABLE
-- ============================================================================
CREATE TABLE public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  ice text,
  rc text,
  city text,
  primary_neighborhood text,
  address text,
  phone text,
  bio text,
  logo_url text,
  is_verified boolean DEFAULT false,
  verification_status text DEFAULT 'pending'
    CHECK (verification_status IN ('pending','approved','rejected','suspended')),
  subscription_plan text DEFAULT 'free'
    CHECK (subscription_plan IN ('free','pro','business')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  is_locked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agencies_profile_id ON public.agencies(profile_id);
CREATE INDEX idx_agencies_verification ON public.agencies(verification_status, is_verified);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- has_role: same signature as before so other RLS policies that reference it keep working
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

-- handle_new_user: auto-creates profile + renter wallet + default renter role.
-- Reads role choice from raw_user_meta_data->>'signup_role' (set by client on signup).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup_role text;
  v_full_name text;
  v_lang text;
BEGIN
  v_signup_role := COALESCE(NEW.raw_user_meta_data->>'signup_role', 'renter');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  v_lang := COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en');
  IF v_lang NOT IN ('en','fr','ar') THEN v_lang := 'en'; END IF;

  -- Profile
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, preferred_language, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    NEW.raw_user_meta_data->>'avatar_url',
    v_lang,
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Default renter role (everyone gets at least renter)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'renter'::public.app_role)
  ON CONFLICT DO NOTHING;

  -- If they signed up as agency, also add agency role
  IF v_signup_role = 'agency' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agency'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Renter wallet (always)
  INSERT INTO public.renter_wallets (user_id, balance, currency)
  VALUES (NEW.id, 0, 'MAD')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- handle_new_agency_role: when an agency role is added (after signup), seed a trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_agency_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'agency'::public.app_role THEN
    INSERT INTO public.agency_subscriptions (
      user_id, plan, status, trial_ends_at, current_period_start
    )
    VALUES (
      NEW.user_id, 'pro', 'trialing', now() + interval '30 days', now()
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.agency_wallets (user_id, balance, currency)
    VALUES (NEW.user_id, 0, 'MAD')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_role_created
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_agency_role();

-- guard_user_roles_write: only admins or service role can write user_roles
-- (signup trigger uses SECURITY DEFINER so it bypasses this — that's intended)
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
  -- Service role / postgres / supabase_admin always allowed (signup trigger, edge functions)
  IF v_role IN ('service_role', 'supabase_admin', 'postgres') THEN
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

CREATE TRIGGER guard_user_roles
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles_write();

-- sync_admin_role_to_user_roles: keep admin_employees in sync with user_roles
CREATE OR REPLACE FUNCTION public.sync_admin_role_to_user_roles()
RETURNS trigger
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

CREATE TRIGGER sync_admin_role
AFTER INSERT OR DELETE ON public.admin_employees
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role_to_user_roles();

-- updated_at trigger reusable for profiles + agencies
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view minimal profile info"
  ON public.profiles FOR SELECT
  USING (true);

-- (We allow public SELECT because bike listings show owner name. Sensitive
-- fields like phone/email_verified should be filtered client-side. If you
-- want stricter, drop the public policy and add a SECURITY DEFINER getter.)

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- (No INSERT policy — handle_new_user trigger inserts via SECURITY DEFINER)
-- (No DELETE — admin only via service role; we don't expose deletion to clients)

-- user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- (Writes blocked by guard_user_roles_write trigger — only admin or service role)

-- verification_codes: service role only, no client access
-- (No policies = no access for authenticated/anon. Service role bypasses RLS.)

-- agencies
CREATE POLICY "Public can view verified agencies"
  ON public.agencies FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Owners can view own agency"
  ON public.agencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = agencies.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all agencies"
  ON public.agencies FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Owners can update own agency"
  ON public.agencies FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = agencies.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage agencies"
  ON public.agencies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Owners can insert own agency"
  ON public.agencies FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = agencies.profile_id AND p.user_id = auth.uid()
  ));