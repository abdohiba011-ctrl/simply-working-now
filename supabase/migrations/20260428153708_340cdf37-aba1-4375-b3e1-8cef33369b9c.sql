
-- 1. Add approval_status and agency_id to bikes
ALTER TABLE public.bikes
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS agency_id uuid;

ALTER TABLE public.bikes
  DROP CONSTRAINT IF EXISTS bikes_approval_status_check;
ALTER TABLE public.bikes
  ADD CONSTRAINT bikes_approval_status_check
  CHECK (approval_status IN ('pending','approved','rejected'));

-- 2. Backfill agency_id from owner -> profile -> agency
UPDATE public.bikes b
   SET agency_id = a.id
  FROM public.profiles p
  JOIN public.agencies a ON a.profile_id = p.id
 WHERE b.owner_id = p.user_id
   AND b.agency_id IS NULL;

-- 3. Indexes for admin queues
CREATE INDEX IF NOT EXISTS idx_bikes_approval_status ON public.bikes(approval_status);
CREATE INDEX IF NOT EXISTS idx_bikes_agency_id ON public.bikes(agency_id);
CREATE INDEX IF NOT EXISTS idx_agencies_verification_status ON public.agencies(verification_status);
CREATE INDEX IF NOT EXISTS idx_bike_types_approval_status ON public.bike_types(approval_status);

-- 4. Replace bikes_public view with double-gated visibility:
--    available + bike approved + owner agency verified
DROP VIEW IF EXISTS public.bikes_public CASCADE;

CREATE VIEW public.bikes_public
WITH (security_invoker = false) AS
SELECT
  b.id,
  b.bike_type_id,
  b.location,
  b.available,
  b.condition,
  b.owner_id,
  b.agency_id,
  b.created_at,
  b.updated_at
FROM public.bikes b
LEFT JOIN public.agencies a ON a.id = b.agency_id
WHERE b.available = true
  AND b.approval_status = 'approved'
  -- Either owned by a verified agency, or legacy/admin-curated bikes with no agency_id
  AND (b.agency_id IS NULL OR a.is_verified = true);

GRANT SELECT ON public.bikes_public TO anon, authenticated;

-- 5. Trigger: notify admins when an agency submits for verification
CREATE OR REPLACE FUNCTION public.notify_admins_on_agency_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status = 'pending_review'
     AND (TG_OP = 'INSERT' OR OLD.verification_status IS DISTINCT FROM 'pending_review') THEN

    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    SELECT
      ur.user_id,
      'New Agency Verification',
      COALESCE(NEW.business_name, 'An agency') || ' submitted shop verification for review.',
      'agency_verification',
      '/admin/agencies/verifications',
      '/admin/agencies/verifications'
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::public.app_role
      AND ur.is_active = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_agency_submit ON public.agencies;
CREATE TRIGGER trg_notify_admins_on_agency_submit
AFTER INSERT OR UPDATE OF verification_status ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_agency_submit();

-- 6. Trigger: notify admins when a new motorbike is created (or set back to pending)
CREATE OR REPLACE FUNCTION public.notify_admins_on_bike_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.approval_status = 'pending'
     AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'pending') THEN

    SELECT bt.name INTO v_name FROM public.bike_types bt WHERE bt.id = NEW.bike_type_id;

    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    SELECT
      ur.user_id,
      'New Motorbike Pending Approval',
      COALESCE(v_name, 'A motorbike') || ' is awaiting admin approval.',
      'bike_approval',
      '/admin/bikes/approvals',
      '/admin/bikes/approvals'
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::public.app_role
      AND ur.is_active = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_bike_submit ON public.bikes;
CREATE TRIGGER trg_notify_admins_on_bike_submit
AFTER INSERT OR UPDATE OF approval_status ON public.bikes
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_bike_submit();

-- 7. Same trigger pattern for bike_types pending submissions (BusinessMotorbikes flow)
CREATE OR REPLACE FUNCTION public.notify_admins_on_bike_type_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'pending'
     AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'pending') THEN

    INSERT INTO public.notifications (user_id, title, message, type, link, action_url)
    SELECT
      ur.user_id,
      'New Motorbike Listing Pending',
      COALESCE(NEW.name, 'A new bike model') || ' was submitted for review.',
      'bike_approval',
      '/admin/bikes/approvals',
      '/admin/bikes/approvals'
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::public.app_role
      AND ur.is_active = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_bike_type_submit ON public.bike_types;
CREATE TRIGGER trg_notify_admins_on_bike_type_submit
AFTER INSERT OR UPDATE OF approval_status ON public.bike_types
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_bike_type_submit();
