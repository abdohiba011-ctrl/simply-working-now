
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rejected_by UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rejected_reason_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rejected_reason_text TEXT;
