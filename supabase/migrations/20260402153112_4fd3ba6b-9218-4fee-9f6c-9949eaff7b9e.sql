
-- audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;

-- bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS confirmed_by UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_location TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';

-- Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_employees 
    WHERE user_id = _user_id AND is_super_admin = true
  )
$$;
