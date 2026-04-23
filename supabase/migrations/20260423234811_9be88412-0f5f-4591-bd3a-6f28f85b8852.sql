-- =====================================================================
-- SECURITY HARDENING MIGRATION
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BOOKINGS: prevent users / partner businesses from modifying
--    sensitive payment / status / pricing fields via direct UPDATE.
-- ---------------------------------------------------------------------
-- We replace the existing UPDATE policies with new ones that include a
-- WITH CHECK clause AND a BEFORE UPDATE trigger that locks down which
-- columns non-admin actors are allowed to change.

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Business can update assigned bookings" ON public.bookings;

CREATE POLICY "Users can update their own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business can update assigned bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = assigned_to_business)
WITH CHECK (auth.uid() = assigned_to_business);

-- Trigger that protects sensitive fields. Admins (user_roles 'admin')
-- bypass the lock. Everyone else can ONLY modify a small whitelist of
-- "soft" fields (notes, special_requests, cancellation_reason, etc.)
-- and trigger a cancel by setting booking_status = 'cancelled'.
CREATE OR REPLACE FUNCTION public.bookings_protect_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Admins can change anything.
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Lock immutable identifiers / pricing / status / payment fields.
  NEW.id                     := OLD.id;
  NEW.user_id                := OLD.user_id;
  NEW.bike_id                := OLD.bike_id;
  NEW.created_at             := OLD.created_at;
  NEW.total_price            := OLD.total_price;
  NEW.amount_paid            := OLD.amount_paid;
  NEW.discount_amount        := OLD.discount_amount;
  NEW.delivery_fee           := OLD.delivery_fee;
  NEW.total_days             := OLD.total_days;
  NEW.pricing_breakdown      := OLD.pricing_breakdown;
  NEW.payment_status         := OLD.payment_status;
  NEW.payment_method         := OLD.payment_method;
  NEW.admin_status           := OLD.admin_status;
  NEW.confirmed_by           := OLD.confirmed_by;
  NEW.confirmed_at           := OLD.confirmed_at;
  NEW.unconfirmed_by         := OLD.unconfirmed_by;
  NEW.unconfirmed_at         := OLD.unconfirmed_at;
  NEW.rejected_by            := OLD.rejected_by;
  NEW.rejected_at            := OLD.rejected_at;
  NEW.rejected_reason_code   := OLD.rejected_reason_code;
  NEW.rejected_reason_text   := OLD.rejected_reason_text;
  NEW.assigned_to_business   := OLD.assigned_to_business;
  NEW.assigned_at            := OLD.assigned_at;
  NEW.contract_url           := OLD.contract_url;
  NEW.signed_contract_url    := OLD.signed_contract_url;
  NEW.contract_status        := OLD.contract_status;
  NEW.admin_notes            := OLD.admin_notes;

  -- Allow booking_status changes ONLY to 'cancelled' (self-cancel).
  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
    IF NEW.booking_status <> 'cancelled' THEN
      NEW.booking_status := OLD.booking_status;
    ELSE
      NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
    END IF;
  END IF;

  -- Same for legacy `status` column.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status <> 'cancelled' THEN
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_protect_sensitive_fields_trg ON public.bookings;
CREATE TRIGGER bookings_protect_sensitive_fields_trg
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.bookings_protect_sensitive_fields();


-- ---------------------------------------------------------------------
-- 2. BOOKINGS: enforce server-computed total_price on INSERT.
--    Clients pass dailyPrice / total in the URL — we ignore those and
--    compute the canonical price from bike_types.daily_price * days.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bookings_enforce_canonical_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  v_daily_price numeric;
  v_days integer;
  v_total numeric;
BEGIN
  -- Admins (manual booking creation in the back office) may set price.
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Compute canonical price from the bike type linked via bikes -> bike_types.
  SELECT bt.daily_price
    INTO v_daily_price
  FROM public.bikes b
  JOIN public.bike_types bt ON bt.id = b.bike_type_id
  WHERE b.id = NEW.bike_id;

  IF v_daily_price IS NULL THEN
    -- Fall back: no price found => block at 0 to surface the error.
    v_daily_price := 0;
  END IF;

  v_days := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM (NEW.return_date::timestamptz - NEW.pickup_date::timestamptz)) / 86400)::int
  );
  v_total := v_daily_price * v_days + COALESCE(NEW.delivery_fee, 0) - COALESCE(NEW.discount_amount, 0);
  IF v_total < 0 THEN v_total := 0; END IF;

  NEW.total_days := v_days;
  NEW.total_price := v_total;

  -- Lock untrusted financial / status fields on insert as well.
  NEW.amount_paid     := 0;
  NEW.payment_status  := COALESCE(NEW.payment_status, 'unpaid');
  NEW.admin_status    := 'pending';
  NEW.booking_status  := COALESCE(NEW.booking_status, 'pending');
  NEW.confirmed_by    := NULL;
  NEW.confirmed_at    := NULL;
  NEW.assigned_to_business := NULL;
  NEW.assigned_at     := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enforce_canonical_price_trg ON public.bookings;
CREATE TRIGGER bookings_enforce_canonical_price_trg
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.bookings_enforce_canonical_price();


-- ---------------------------------------------------------------------
-- 3. STORAGE: signed-contracts — only admins may delete.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners can delete signed-contracts" ON storage.objects;

CREATE POLICY "Admins can delete signed-contracts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'signed-contracts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
