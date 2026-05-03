-- Enable unaccent for slugifying
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============ Storage bucket: city-images ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('city-images', 'city-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read city images" ON storage.objects;
CREATE POLICY "Public read city images"
ON storage.objects FOR SELECT
USING (bucket_id = 'city-images');

DROP POLICY IF EXISTS "Admins insert city images" ON storage.objects;
CREATE POLICY "Admins insert city images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'city-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update city images" ON storage.objects;
CREATE POLICY "Admins update city images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'city-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete city images" ON storage.objects;
CREATE POLICY "Admins delete city images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'city-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ DB-driven slugs ============
ALTER TABLE public.service_cities
  ADD COLUMN IF NOT EXISTS slug text;

-- Helper to slugify a name with accent + Arabic fallback. Uniqueness is the
-- caller's job (the trigger handles it via a counter loop).
CREATE OR REPLACE FUNCTION public.generate_city_slug(input_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  base_slug := lower(regexp_replace(unaccent(coalesce(input_name, '')), '[^a-z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  IF base_slug IS NULL OR base_slug = '' OR length(base_slug) < 2 THEN
    base_slug := 'city-' || substr(md5(coalesce(input_name, '') || random()::text || clock_timestamp()::text), 1, 8);
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.service_cities WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- Backfill (use canonical slugs that match existing routes)
UPDATE public.service_cities SET slug = 'casablanca'  WHERE lower(name) = 'casablanca'  AND slug IS NULL;
UPDATE public.service_cities SET slug = 'marrakech'   WHERE lower(name) IN ('marrakech','marrakesh') AND slug IS NULL;
UPDATE public.service_cities SET slug = 'rabat'       WHERE lower(name) = 'rabat'       AND slug IS NULL;
UPDATE public.service_cities SET slug = 'fes'         WHERE lower(name) IN ('fes','fez') AND slug IS NULL;
UPDATE public.service_cities SET slug = 'tangier'     WHERE lower(name) IN ('tangier','tanger') AND slug IS NULL;
UPDATE public.service_cities SET slug = 'agadir'      WHERE lower(name) = 'agadir'      AND slug IS NULL;
UPDATE public.service_cities SET slug = 'essaouira'   WHERE lower(name) = 'essaouira'   AND slug IS NULL;
UPDATE public.service_cities SET slug = 'chefchaouen' WHERE lower(name) = 'chefchaouen' AND slug IS NULL;

-- Anything left over: generate from name
UPDATE public.service_cities
   SET slug = public.generate_city_slug(name)
 WHERE slug IS NULL OR slug = '';

ALTER TABLE public.service_cities ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_cities_slug_unique'
  ) THEN
    ALTER TABLE public.service_cities
      ADD CONSTRAINT service_cities_slug_unique UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_service_cities_slug ON public.service_cities(slug);

-- Auto-fill slug on insert
CREATE OR REPLACE FUNCTION public.set_city_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_city_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS city_slug_trigger ON public.service_cities;
CREATE TRIGGER city_slug_trigger
BEFORE INSERT ON public.service_cities
FOR EACH ROW EXECUTE FUNCTION public.set_city_slug();