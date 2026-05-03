-- S5: Add focal point support to service cities for image positioning
ALTER TABLE public.service_cities
ADD COLUMN IF NOT EXISTS image_focal_x numeric NOT NULL DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS image_focal_y numeric NOT NULL DEFAULT 0.5;

ALTER TABLE public.service_cities
DROP CONSTRAINT IF EXISTS service_cities_focal_x_range;
ALTER TABLE public.service_cities
ADD CONSTRAINT service_cities_focal_x_range CHECK (image_focal_x >= 0 AND image_focal_x <= 1);

ALTER TABLE public.service_cities
DROP CONSTRAINT IF EXISTS service_cities_focal_y_range;
ALTER TABLE public.service_cities
ADD CONSTRAINT service_cities_focal_y_range CHECK (image_focal_y >= 0 AND image_focal_y <= 1);