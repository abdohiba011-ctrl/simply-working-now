
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selfie_with_id_url text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_email text;
