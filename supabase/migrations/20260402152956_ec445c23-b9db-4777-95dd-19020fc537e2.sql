
-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name_on_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family_name_on_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selfie_with_id_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality TEXT;

-- Add missing columns to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Add missing columns to bike_types
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS business_status TEXT DEFAULT 'active';
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE public.bike_types ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available';

-- Add missing columns to bike_inventory
ALTER TABLE public.bike_inventory ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE public.bike_inventory ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 0;
ALTER TABLE public.bike_inventory ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.service_locations(id);

-- Add missing columns to service_locations
ALTER TABLE public.service_locations ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;

-- Add missing columns to service_cities
ALTER TABLE public.service_cities ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.service_cities ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.service_cities ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing columns to pricing_tiers
ALTER TABLE public.pricing_tiers ADD COLUMN IF NOT EXISTS tier_name TEXT;
ALTER TABLE public.pricing_tiers ADD COLUMN IF NOT EXISTS tier_key TEXT;
ALTER TABLE public.pricing_tiers ADD COLUMN IF NOT EXISTS min_days INTEGER;
ALTER TABLE public.pricing_tiers ADD COLUMN IF NOT EXISTS max_days INTEGER;

-- Add missing columns to admin_employees
ALTER TABLE public.admin_employees ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';

-- Add missing columns to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

-- Add missing columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS review TEXT;

-- Fix security warnings: replace overly permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Authenticated or anon can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
