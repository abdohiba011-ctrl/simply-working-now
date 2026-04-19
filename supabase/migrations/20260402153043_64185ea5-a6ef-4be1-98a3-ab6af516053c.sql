
-- audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID;

-- booking_events
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS from_state TEXT;
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS to_state TEXT;
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS meta JSONB;

-- booking_payments
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS recorded_by_name TEXT;
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_time TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_time TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_days INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS helmet_included BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;

-- booking_notes
ALTER TABLE public.booking_notes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.booking_notes ADD COLUMN IF NOT EXISTS content TEXT;

-- bike_inventory
ALTER TABLE public.bike_inventory ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.service_cities(id);

-- user_notes
ALTER TABLE public.user_notes ADD COLUMN IF NOT EXISTS note_title TEXT;
ALTER TABLE public.user_notes ADD COLUMN IF NOT EXISTS note_description TEXT;

-- Fix remaining security warning
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Public can submit contact messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
