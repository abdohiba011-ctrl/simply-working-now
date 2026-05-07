CREATE OR REPLACE FUNCTION public.bookings_protect_sensitive_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  v_role text;
BEGIN
  v_role := current_setting('role', true);
  IF v_role IN ('service_role', 'postgres') THEN
    RETURN NEW;
  END IF;

  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

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

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bookings_restrict_user_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  is_business boolean;
  is_draft_owner boolean;
  v_role text;
BEGIN
  v_role := current_setting('role', true);
  IF v_role IN ('service_role', 'postgres') THEN
    RETURN NEW;
  END IF;

  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  is_business := (auth.uid() IS NOT NULL AND auth.uid() = OLD.assigned_to_business);
  is_draft_owner := (auth.uid() IS NOT NULL
                     AND auth.uid() = OLD.user_id
                     AND OLD.booking_status = 'draft');

  IF is_draft_owner THEN
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
    NEW.assigned_to_business := OLD.assigned_to_business;
    NEW.assigned_at          := OLD.assigned_at;
    NEW.platform_fee_paid_amount_mad     := OLD.platform_fee_paid_amount_mad;
    NEW.confirmation_fee_paid_amount_mad := OLD.confirmation_fee_paid_amount_mad;
    NEW.booking_status := OLD.booking_status;
    NEW.status         := OLD.status;
    RETURN NEW;
  END IF;

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
$function$;

DO $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT bt.owner_id INTO v_owner
    FROM public.bookings bk
    JOIN public.bikes b ON b.id = bk.bike_id
    JOIN public.bike_types bt ON bt.id = b.bike_type_id
   WHERE bk.id = '428cf18f-64f4-4ff7-bc60-2850c8b58f4c';

  UPDATE public.bookings
     SET booking_status = 'pending',
         status         = 'pending',
         payment_status = 'paid',
         platform_fee_paid_amount_mad = COALESCE(platform_fee_paid_amount_mad, 10),
         assigned_to_business = COALESCE(assigned_to_business, v_owner),
         updated_at = now()
   WHERE id = '428cf18f-64f4-4ff7-bc60-2850c8b58f4c'
     AND booking_status = 'draft';
END $$;