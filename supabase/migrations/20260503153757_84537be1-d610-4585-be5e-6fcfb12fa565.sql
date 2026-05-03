-- Reject the only inconsistent combination: available AND coming-soon
ALTER TABLE public.service_cities
  DROP CONSTRAINT IF EXISTS valid_city_status;

ALTER TABLE public.service_cities
  ADD CONSTRAINT valid_city_status
  CHECK (NOT (is_available = true AND is_coming_soon = true));