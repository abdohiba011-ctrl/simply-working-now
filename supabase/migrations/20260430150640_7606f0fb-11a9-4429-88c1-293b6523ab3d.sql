
-- Add slug column to bike_types
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS slug TEXT;

-- Slug helper: lowercase, strip diacritics, replace non-alnum with hyphens
CREATE OR REPLACE FUNCTION public.slugify(_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s TEXT;
BEGIN
  IF _input IS NULL THEN RETURN ''; END IF;
  s := lower(_input);
  -- Strip diacritics via unaccent-like manual replacements (no extension dep)
  s := translate(s,
    'àáâãäåāăąèéêëēĕėęěìíîïĩīĭįòóôõöōŏőùúûüũūŭůűñçýÿÀÁÂÃÄÅĀĂĄÈÉÊËĒĔĖĘĚÌÍÎÏĨĪĬĮÒÓÔÕÖŌŎŐÙÚÛÜŨŪŬŮŰÑÇÝ',
    'aaaaaaaaaeeeeeeeeeiiiiiiiiooooooooouuuuuuuuunnncyyaaaaaaaaaeeeeeeeeeiiiiiiiiooooooooouuuuuuuuunnncy'
  );
  -- Replace em-dash, en-dash, and similar
  s := replace(s, '—', '-');
  s := replace(s, '–', '-');
  -- Replace any non-alphanumeric run with single hyphen
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  -- Trim hyphens
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  RETURN s;
END;
$$;

-- Compute slug base from name + neighborhood
CREATE OR REPLACE FUNCTION public.compute_bike_type_slug(_name TEXT, _neighborhood TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  base TEXT;
BEGIN
  base := public.slugify(coalesce(_name, 'bike'));
  IF _neighborhood IS NOT NULL AND length(trim(_neighborhood)) > 0 THEN
    base := base || '-' || public.slugify(_neighborhood);
  END IF;
  IF base = '' OR base IS NULL THEN
    base := 'bike';
  END IF;
  RETURN base;
END;
$$;

-- Trigger: assign / refresh slug, ensuring uniqueness
CREATE OR REPLACE FUNCTION public.bike_types_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 1;
  needs_refresh BOOLEAN := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    needs_refresh := true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Prevent direct slug edits (only the trigger may set it).
    -- If a client tries to change slug, ignore their value.
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
      NEW.slug := OLD.slug;
    END IF;
    -- Recompute when name/year/neighborhood change
    IF NEW.name IS DISTINCT FROM OLD.name
       OR NEW.year IS DISTINCT FROM OLD.year
       OR NEW.neighborhood IS DISTINCT FROM OLD.neighborhood THEN
      needs_refresh := true;
    END IF;
  END IF;

  IF needs_refresh OR NEW.slug IS NULL OR NEW.slug = '' THEN
    base := public.compute_bike_type_slug(NEW.name, NEW.neighborhood);
    candidate := base;
    WHILE EXISTS (
      SELECT 1 FROM public.bike_types
      WHERE slug = candidate AND id <> NEW.id
    ) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bike_types_set_slug ON public.bike_types;
CREATE TRIGGER trg_bike_types_set_slug
BEFORE INSERT OR UPDATE ON public.bike_types
FOR EACH ROW EXECUTE FUNCTION public.bike_types_set_slug();

-- Backfill existing rows
UPDATE public.bike_types SET slug = NULL WHERE slug IS NULL;
-- Force trigger via no-op update
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.bike_types WHERE slug IS NULL LOOP
    UPDATE public.bike_types SET name = name WHERE id = r.id;
  END LOOP;
END $$;

-- Enforce NOT NULL + UNIQUE
ALTER TABLE public.bike_types ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bike_types_slug_unique ON public.bike_types(slug);
