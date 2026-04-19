
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'business', 'user');

-- ===================
-- ALL TABLES FIRST (no cross-references in policies)
-- ===================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'not_started',
  id_card_number TEXT,
  full_name_on_id TEXT,
  id_front_image_url TEXT,
  id_back_image_url TEXT,
  is_frozen BOOLEAN DEFAULT false,
  frozen_reason TEXT,
  user_type TEXT DEFAULT 'client',
  business_type TEXT,
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_registration TEXT,
  business_logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.service_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_key TEXT,
  image_url TEXT,
  bikes_count INTEGER DEFAULT 0,
  price_from NUMERIC DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_coming_soon BOOLEAN DEFAULT false,
  show_in_homepage BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.service_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city_id UUID REFERENCES public.service_cities(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bike_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  main_image_url TEXT,
  daily_price NUMERIC DEFAULT 0,
  engine_cc INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  weight TEXT,
  seat_height TEXT,
  fuel_capacity TEXT,
  top_speed TEXT,
  features TEXT[],
  is_original BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT true,
  city_id UUID REFERENCES public.service_cities(id),
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bike_type_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_type_id UUID NOT NULL REFERENCES public.bike_types(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_type_id UUID NOT NULL REFERENCES public.bike_types(id) ON DELETE CASCADE,
  license_plate TEXT,
  location TEXT,
  available BOOLEAN DEFAULT true,
  condition TEXT DEFAULT 'good',
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bike_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_type_id UUID NOT NULL REFERENCES public.bike_types(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  total_count INTEGER DEFAULT 0,
  available_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bike_id UUID REFERENCES public.bikes(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  total_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  admin_status TEXT DEFAULT 'new',
  booking_status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  contract_status TEXT DEFAULT 'unsigned',
  delivery_method TEXT DEFAULT 'pickup',
  delivery_location TEXT,
  assigned_to_business UUID REFERENCES auth.users(id),
  notes TEXT,
  contract_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_type TEXT DEFAULT 'payment',
  status TEXT DEFAULT 'completed',
  reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_key TEXT,
  description TEXT,
  daily_price NUMERIC DEFAULT 0,
  duration_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  features JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  type TEXT DEFAULT 'contact',
  status TEXT DEFAULT 'unread',
  user_id UUID REFERENCES auth.users(id),
  business_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_super_admin BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.client_file_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  downloaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.client_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.client_trust_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- ENABLE RLS ON ALL TABLES
-- ===================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_type_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_trust_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- ===================
-- HELPER FUNCTION (before policies that use it)
-- ===================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===================
-- RLS POLICIES
-- ===================

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- User Roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- User Locations
CREATE POLICY "Users can manage their own locations" ON public.user_locations FOR ALL USING (auth.uid() = user_id);

-- Service Cities (public read)
CREATE POLICY "Anyone can view cities" ON public.service_cities FOR SELECT USING (true);
CREATE POLICY "Admins can manage cities" ON public.service_cities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Service Locations (public read)
CREATE POLICY "Anyone can view locations" ON public.service_locations FOR SELECT USING (true);
CREATE POLICY "Admins can manage locations" ON public.service_locations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bike Types (public read)
CREATE POLICY "Anyone can view bike types" ON public.bike_types FOR SELECT USING (true);
CREATE POLICY "Owners can insert bike types" ON public.bike_types FOR INSERT WITH CHECK (
  auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Owners and admins can update bike types" ON public.bike_types FOR UPDATE USING (
  auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins can delete bike types" ON public.bike_types FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Bike Type Images (public read)
CREATE POLICY "Anyone can view bike images" ON public.bike_type_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage bike images" ON public.bike_type_images FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bikes (public read)
CREATE POLICY "Anyone can view bikes" ON public.bikes FOR SELECT USING (true);
CREATE POLICY "Owners and admins can manage bikes" ON public.bikes FOR ALL USING (
  auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin')
);

-- Bike Inventory (public read)
CREATE POLICY "Anyone can view inventory" ON public.bike_inventory FOR SELECT USING (true);
CREATE POLICY "Admins can manage inventory" ON public.bike_inventory FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Business can view assigned bookings" ON public.bookings FOR SELECT USING (auth.uid() = assigned_to_business);
CREATE POLICY "Business can update assigned bookings" ON public.bookings FOR UPDATE USING (auth.uid() = assigned_to_business);

-- Booking Events
CREATE POLICY "Users can view events for their bookings" ON public.booking_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_id AND bookings.user_id = auth.uid())
);
CREATE POLICY "Admins can manage booking events" ON public.booking_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Booking Notes
CREATE POLICY "Admins can manage booking notes" ON public.booking_notes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Booking Payments
CREATE POLICY "Users can view payments for their bookings" ON public.booking_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_id AND bookings.user_id = auth.uid())
);
CREATE POLICY "Admins can manage payments" ON public.booking_payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Pricing Tiers (public read)
CREATE POLICY "Anyone can view pricing" ON public.pricing_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage pricing" ON public.pricing_tiers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Contact Messages
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all messages" ON public.contact_messages FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update messages" ON public.contact_messages FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admin Employees
CREATE POLICY "Admins can view employees" ON public.admin_employees FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Super admins can manage employees" ON public.admin_employees FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_employees ae WHERE ae.user_id = auth.uid() AND ae.is_super_admin = true)
);

-- Audit Logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Client Files
CREATE POLICY "Admins can manage client files" ON public.client_files FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Client File Downloads
CREATE POLICY "Admins can manage downloads" ON public.client_file_downloads FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Client Timeline Events
CREATE POLICY "Admins can manage timeline events" ON public.client_timeline_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Client Trust Events
CREATE POLICY "Admins can manage trust events" ON public.client_trust_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User Notes
CREATE POLICY "Admins can manage user notes" ON public.user_notes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ===================
-- AUTO-CREATE PROFILE TRIGGER
-- ===================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================
-- UPDATED_AT TRIGGER
-- ===================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_cities_updated_at BEFORE UPDATE ON public.service_cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_locations_updated_at BEFORE UPDATE ON public.service_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bike_types_updated_at BEFORE UPDATE ON public.bike_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bikes_updated_at BEFORE UPDATE ON public.bikes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bike_inventory_updated_at BEFORE UPDATE ON public.bike_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON public.pricing_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_locations_updated_at BEFORE UPDATE ON public.user_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON public.user_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_employees_updated_at BEFORE UPDATE ON public.admin_employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================
-- STORAGE BUCKETS
-- ===================
INSERT INTO storage.buckets (id, name, public) VALUES ('bike-images', 'bike-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('id-documents', 'id-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('client-files', 'client-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('signed-contracts', 'signed-contracts', false);

-- Storage policies
CREATE POLICY "Public can view bike images" ON storage.objects FOR SELECT USING (bucket_id = 'bike-images');
CREATE POLICY "Auth users can upload bike images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'bike-images' AND auth.role() = 'authenticated'
);
CREATE POLICY "Public can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can upload their own ID docs" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users and admins can view ID docs" ON storage.objects FOR SELECT USING (
  bucket_id = 'id-documents' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);
CREATE POLICY "Admins can manage client files storage" ON storage.objects FOR ALL USING (
  bucket_id = 'client-files' AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users and admins can view contracts" ON storage.objects FOR SELECT USING (
  bucket_id = 'signed-contracts' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);
CREATE POLICY "Admins can upload contracts" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'signed-contracts' AND public.has_role(auth.uid(), 'admin')
);
