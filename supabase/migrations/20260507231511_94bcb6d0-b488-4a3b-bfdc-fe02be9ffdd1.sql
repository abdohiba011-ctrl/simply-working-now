-- 1) Harden is_super_admin: require active admin role in user_roles
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_employees ae
    JOIN public.user_roles ur
      ON ur.user_id = ae.user_id
     AND ur.role = 'admin'::public.app_role
     AND ur.is_active = true
    WHERE ae.user_id = _user_id
      AND ae.is_super_admin = true
  )
$function$;

-- 2) Force bike_reviews.reviewer_name to match the authenticated user's profile name
CREATE OR REPLACE FUNCTION public.set_bike_review_reviewer_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(NULLIF(p.name, ''), NULLIF(p.full_name, ''), 'User')
    INTO v_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id
  LIMIT 1;
  NEW.reviewer_name := COALESCE(v_name, 'User');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_bike_review_reviewer_name ON public.bike_reviews;
CREATE TRIGGER trg_set_bike_review_reviewer_name
BEFORE INSERT OR UPDATE OF reviewer_name ON public.bike_reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_bike_review_reviewer_name();

-- 3) Drop the legacy overlapping chat-attachments SELECT policy (index [2])
DROP POLICY IF EXISTS "Booking parties can view chat attachments" ON storage.objects;