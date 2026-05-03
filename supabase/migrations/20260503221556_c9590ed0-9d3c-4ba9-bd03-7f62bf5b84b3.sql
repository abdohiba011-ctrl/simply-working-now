CREATE TABLE IF NOT EXISTS public.bike_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_type_id UUID NOT NULL REFERENCES public.bike_types(id) ON DELETE CASCADE,
  min_days INTEGER NOT NULL CHECK (min_days IN (1, 3, 7, 15, 30)),
  daily_price_mad NUMERIC NOT NULL CHECK (daily_price_mad > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bike_type_id, min_days)
);

CREATE INDEX IF NOT EXISTS idx_bike_pricing_tiers_bike ON public.bike_pricing_tiers(bike_type_id);

ALTER TABLE public.bike_pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view bike pricing tiers"
ON public.bike_pricing_tiers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Owners can insert own bike pricing tiers"
ON public.bike_pricing_tiers FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bike_types bt
  WHERE bt.id = bike_pricing_tiers.bike_type_id AND bt.owner_id = auth.uid()
));

CREATE POLICY "Owners can update own bike pricing tiers"
ON public.bike_pricing_tiers FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bike_types bt
  WHERE bt.id = bike_pricing_tiers.bike_type_id AND bt.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bike_types bt
  WHERE bt.id = bike_pricing_tiers.bike_type_id AND bt.owner_id = auth.uid()
));

CREATE POLICY "Owners can delete own bike pricing tiers"
ON public.bike_pricing_tiers FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bike_types bt
  WHERE bt.id = bike_pricing_tiers.bike_type_id AND bt.owner_id = auth.uid()
));

CREATE POLICY "Admins manage bike pricing tiers"
ON public.bike_pricing_tiers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_bike_pricing_tiers_updated_at
BEFORE UPDATE ON public.bike_pricing_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: insert min_days=1 tier for every existing bike type using daily_price
INSERT INTO public.bike_pricing_tiers (bike_type_id, min_days, daily_price_mad)
SELECT id, 1, COALESCE(daily_price, 0)
FROM public.bike_types
WHERE COALESCE(daily_price, 0) > 0
ON CONFLICT (bike_type_id, min_days) DO NOTHING;

-- RPC: returns the daily rate that applies for a given rental duration
CREATE OR REPLACE FUNCTION public.get_bike_price(_bike_type_id uuid, _days integer)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT daily_price_mad
  FROM public.bike_pricing_tiers
  WHERE bike_type_id = _bike_type_id
    AND min_days <= GREATEST(1, COALESCE(_days, 1))
  ORDER BY min_days DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_bike_price(uuid, integer) TO anon, authenticated;