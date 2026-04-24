-- Fix ambiguous expires_at column in create_bike_hold
CREATE OR REPLACE FUNCTION public.create_bike_hold(_bike_id uuid, _pickup date, _return date)
 RETURNS TABLE(hold_id uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_exp timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF _pickup IS NULL OR _return IS NULL OR _return <= _pickup THEN
    RAISE EXCEPTION 'INVALID_DATES';
  END IF;

  DELETE FROM public.bike_holds h
  WHERE h.bike_id = _bike_id AND h.expires_at < now();

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.bike_id = _bike_id
      AND b.booking_status IN ('pending','confirmed')
      AND NOT (b.return_date <= _pickup OR b.pickup_date >= _return)
  ) THEN
    RAISE EXCEPTION 'BIKE_ALREADY_BOOKED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bike_holds h
    WHERE h.bike_id = _bike_id
      AND h.user_id <> v_uid
      AND h.expires_at > now()
      AND NOT (h.return_date <= _pickup OR h.pickup_date >= _return)
  ) THEN
    RAISE EXCEPTION 'BIKE_HELD_BY_OTHER';
  END IF;

  DELETE FROM public.bike_holds h WHERE h.bike_id = _bike_id AND h.user_id = v_uid;

  INSERT INTO public.bike_holds (bike_id, user_id, pickup_date, return_date)
  VALUES (_bike_id, v_uid, _pickup, _return)
  RETURNING bike_holds.id, bike_holds.expires_at INTO v_id, v_exp;

  RETURN QUERY SELECT v_id, v_exp;
END;
$function$;

-- Enable realtime on booking_messages
ALTER TABLE public.booking_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Audit trigger for off-platform contact attempts
CREATE OR REPLACE FUNCTION public.audit_booking_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_flagged boolean := false;
  v_reasons text[] := ARRAY[]::text[];
  v_body text := lower(coalesce(NEW.body, ''));
BEGIN
  -- Phone numbers (Moroccan or international, 8+ digits)
  IF v_body ~ '(\+?\d[\s.-]?){8,}' THEN
    v_flagged := true;
    v_reasons := array_append(v_reasons, 'phone_number');
  END IF;
  -- WhatsApp / Telegram / Signal mentions
  IF v_body ~ '(whatsapp|wa\.me|whats app|واتساب|telegram|t\.me|signal)' THEN
    v_flagged := true;
    v_reasons := array_append(v_reasons, 'off_platform_messenger');
  END IF;
  -- Off-platform payment hints
  IF v_body ~ '(cash app|paypal|venmo|bank transfer|virement|cash deal|outside platform|hors plateforme)' THEN
    v_flagged := true;
    v_reasons := array_append(v_reasons, 'off_platform_payment');
  END IF;

  IF v_flagged THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, actor_id, user_id, details)
    VALUES (
      'message_flagged',
      'booking_messages',
      NEW.id::text,
      NEW.sender_id,
      NEW.sender_id,
      jsonb_build_object(
        'booking_id', NEW.booking_id,
        'sender_role', NEW.sender_role,
        'reasons', to_jsonb(v_reasons),
        'preview', left(NEW.body, 200)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_messages_audit ON public.booking_messages;
CREATE TRIGGER booking_messages_audit
AFTER INSERT ON public.booking_messages
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_message();