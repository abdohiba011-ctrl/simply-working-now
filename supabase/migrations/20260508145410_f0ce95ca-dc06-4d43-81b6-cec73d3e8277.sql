ALTER TABLE public.youcanpay_payments
ADD COLUMN IF NOT EXISTS method text;

CREATE INDEX IF NOT EXISTS idx_youcanpay_payments_method ON public.youcanpay_payments(method);