-- 1) Tighten bikes authenticated SELECT to owners + admins only
DROP POLICY IF EXISTS "Owners and admins can view bikes" ON public.bikes;
CREATE POLICY "Owners and admins can view bikes"
ON public.bikes FOR SELECT
TO authenticated
USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Prevent customers from editing sensitive booking columns via trigger.
-- Customers may only modify: special_requests, pickup_time, return_time,
-- pickup_location, return_location, delivery_method, delivery_location,
-- notes, review, rating, cancellation_reason, and (limited) booking_status->'cancelled'
CREATE OR REPLACE FUNCTION public.bookings_restrict_user_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_business boolean;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  is_business := (auth.uid() IS NOT NULL AND auth.uid() = OLD.assigned_to_business);

  -- Customer (booking owner) path: lock everything except whitelist.
  IF auth.uid() = OLD.user_id AND NOT is_business THEN
    NEW.id                   := OLD.id;
    NEW.user_id              := OLD.user_id;
    NEW.bike_id              := OLD.bike_id;
    NEW.created_at           := OLD.created_at;
    NEW.total_price          := OLD.total_price;
    NEW.amount_paid          := OLD.amount_paid;
    NEW.discount_amount      := OLD.discount_amount;
    NEW.delivery_fee         := OLD.delivery_fee;
    NEW.total_days           := OLD.total_days;
    NEW.pricing_breakdown    := OLD.pricing_breakdown;
    NEW.payment_status       := OLD.payment_status;
    NEW.payment_method       := OLD.payment_method;
    NEW.admin_status         := OLD.admin_status;
    NEW.admin_notes          := OLD.admin_notes;
    NEW.confirmed_by         := OLD.confirmed_by;
    NEW.confirmed_at         := OLD.confirmed_at;
    NEW.unconfirmed_by       := OLD.unconfirmed_by;
    NEW.unconfirmed_at       := OLD.unconfirmed_at;
    NEW.rejected_by          := OLD.rejected_by;
    NEW.rejected_at          := OLD.rejected_at;
    NEW.rejected_reason_code := OLD.rejected_reason_code;
    NEW.rejected_reason_text := OLD.rejected_reason_text;
    NEW.assigned_to_business := OLD.assigned_to_business;
    NEW.assigned_at          := OLD.assigned_at;
    NEW.contract_url         := OLD.contract_url;
    NEW.signed_contract_url  := OLD.signed_contract_url;
    NEW.contract_status      := OLD.contract_status;
    NEW.helmet_included      := OLD.helmet_included;
    NEW.insurance_included   := OLD.insurance_included;
    NEW.source               := OLD.source;
    NEW.customer_email       := OLD.customer_email;
    NEW.customer_phone       := OLD.customer_phone;
    NEW.customer_name        := OLD.customer_name;
    NEW.pickup_date          := OLD.pickup_date;
    NEW.return_date          := OLD.return_date;

    -- booking_status: only allow cancellation
    IF NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
      IF NEW.booking_status <> 'cancelled' THEN
        NEW.booking_status := OLD.booking_status;
      ELSE
        NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
      END IF;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status <> 'cancelled' THEN
        NEW.status := OLD.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_restrict_user_updates_trg ON public.bookings;
CREATE TRIGGER bookings_restrict_user_updates_trg
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_restrict_user_updates();

-- 3) Make chat-attachments bucket private and add membership-scoped policies.
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

DROP POLICY IF EXISTS "Public can read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "chat-attachments public read" ON storage.objects;
DROP POLICY IF EXISTS "Chat parties can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat parties can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat parties can delete attachments" ON storage.objects;

-- Path convention: chat-attachments/<booking_id>/<filename>
CREATE POLICY "Chat parties can read attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = split_part(name, '/', 1)
        AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
    )
  )
);

CREATE POLICY "Chat parties can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = split_part(name, '/', 1)
        AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
    )
  )
);

CREATE POLICY "Chat parties can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR owner = auth.uid()
  )
);

-- 4) Pin search_path on internal helper functions to remove linter warnings.
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;