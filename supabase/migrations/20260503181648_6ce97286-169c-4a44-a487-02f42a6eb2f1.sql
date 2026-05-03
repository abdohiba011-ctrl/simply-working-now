
-- Normalize legacy fuel values
UPDATE public.bike_types SET fuel_type = 'petrol' WHERE fuel_type = 'gasoline';

-- bike_types: new fields
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS helmets_count INTEGER DEFAULT 0;
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'moderate';
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS min_rental_days INTEGER DEFAULT 1;
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS max_rental_days INTEGER DEFAULT 30;

ALTER TABLE public.bike_types DROP CONSTRAINT IF EXISTS bike_types_cancellation_policy_check;
ALTER TABLE public.bike_types ADD CONSTRAINT bike_types_cancellation_policy_check
  CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict'));

ALTER TABLE public.bike_types DROP CONSTRAINT IF EXISTS bike_types_fuel_type_check;
ALTER TABLE public.bike_types ADD CONSTRAINT bike_types_fuel_type_check
  CHECK (fuel_type IS NULL OR fuel_type IN ('petrol', 'electric', 'hybrid'));

ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS delivery_offered BOOLEAN DEFAULT false;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC DEFAULT 0;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS delivery_fee_mad NUMERIC DEFAULT 0;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS lng NUMERIC;

UPDATE public.bike_types SET cancellation_policy = 'moderate' WHERE cancellation_policy IS NULL;
UPDATE public.bike_types SET min_rental_days = 1 WHERE min_rental_days IS NULL;
UPDATE public.bike_types SET max_rental_days = 30 WHERE max_rental_days IS NULL;
UPDATE public.bike_types SET helmets_count = 1 WHERE helmets_count IS NULL OR helmets_count = 0;
UPDATE public.bike_types SET features = ARRAY['helmet']::text[] WHERE features IS NULL OR features = '{}';
