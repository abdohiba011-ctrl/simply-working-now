
-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS signed_contract_url TEXT;

-- booking_events
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS actor_type TEXT;
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS old_status TEXT;
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS new_status TEXT;
ALTER TABLE public.booking_events ADD COLUMN IF NOT EXISTS notes TEXT;

-- booking_payments
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD';
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS external_reference TEXT;
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- client_trust_events
ALTER TABLE public.client_trust_events ADD COLUMN IF NOT EXISTS delta INTEGER DEFAULT 0;
ALTER TABLE public.client_trust_events ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.client_trust_events ADD COLUMN IF NOT EXISTS related_booking_id UUID;

-- client_timeline_events
ALTER TABLE public.client_timeline_events ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.client_timeline_events ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.client_timeline_events ADD COLUMN IF NOT EXISTS actor_type TEXT;
ALTER TABLE public.client_timeline_events ADD COLUMN IF NOT EXISTS related_id TEXT;

-- user_notes
ALTER TABLE public.user_notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_description TEXT;

-- Fix the remaining security warning: contact_messages INSERT
DROP POLICY IF EXISTS "Authenticated or anon can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
