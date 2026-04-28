-- Allow a signed-in user to add the 'agency' role to their own account
-- and populate business profile fields. SECURITY DEFINER bypasses the
-- guard_user_roles_write trigger safely because we hard-code the role
-- to 'agency' and the user_id to auth.uid().
CREATE OR REPLACE FUNCTION public.add_agency_role_to_self(
  _business_name text,
  _business_type text,
  _city text,
  _neighborhood text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF _business_name IS NULL OR length(trim(_business_name)) < 2 THEN
    RAISE EXCEPTION 'BUSINESS_NAME_REQUIRED';
  END IF;
  IF _business_type IS NULL OR length(trim(_business_type)) < 1 THEN
    RAISE EXCEPTION 'BUSINESS_TYPE_REQUIRED';
  END IF;
  IF _city IS NULL OR length(trim(_city)) < 1 THEN
    RAISE EXCEPTION 'CITY_REQUIRED';
  END IF;

  -- Add the agency role (idempotent). The handle_new_agency_role
  -- trigger will create the wallet + trial subscription rows.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'agency'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Populate the business fields on the user's profile.
  UPDATE public.profiles
     SET user_type = 'business',
         business_name = _business_name,
         business_type = _business_type,
         business_city = _city,
         business_address = COALESCE(_neighborhood, business_address),
         phone = COALESCE(NULLIF(trim(COALESCE(_phone, '')), ''), phone),
         updated_at = now()
   WHERE user_id = v_uid;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_agency_role_to_self(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_agency_role_to_self(text, text, text, text, text) TO authenticated;