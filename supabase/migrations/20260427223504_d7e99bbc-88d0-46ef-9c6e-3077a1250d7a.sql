
-- Drop the GENERATED column (writes fail against generated columns)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS name;

-- Re-add as a regular nullable column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;

-- Backfill name = full_name
UPDATE public.profiles SET name = full_name WHERE name IS NULL;

-- Trigger to keep them in sync going forward (writes to either col propagate)
CREATE OR REPLACE FUNCTION public.profiles_sync_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.name IS NULL AND NEW.full_name IS NOT NULL THEN NEW.name := NEW.full_name; END IF;
    IF NEW.full_name IS NULL AND NEW.name IS NOT NULL THEN NEW.full_name := NEW.name; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name AND NEW.full_name IS NOT DISTINCT FROM OLD.full_name THEN
      NEW.full_name := NEW.name;
    ELSIF NEW.full_name IS DISTINCT FROM OLD.full_name AND NEW.name IS NOT DISTINCT FROM OLD.name THEN
      NEW.name := NEW.full_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_name_trg ON public.profiles;
CREATE TRIGGER profiles_sync_name_trg
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_name();

-- Additional legacy columns used by admin verification + ID verification UI
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name_on_id text,
  ADD COLUMN IF NOT EXISTS first_name_on_id text,
  ADD COLUMN IF NOT EXISTS family_name_on_id text,
  ADD COLUMN IF NOT EXISTS id_front_image_url text,
  ADD COLUMN IF NOT EXISTS id_back_image_url text,
  ADD COLUMN IF NOT EXISTS license_front_image_url text,
  ADD COLUMN IF NOT EXISTS license_back_image_url text,
  ADD COLUMN IF NOT EXISTS selfie_image_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid;
