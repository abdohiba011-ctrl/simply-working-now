CREATE OR REPLACE FUNCTION public.promote_draft_to_pending(
  _booking_id uuid,
  _platform_fee_paid integer DEFAULT 10,
  _confirmation_fee_pending integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking record;
  v_owner uuid;
  v_conflict boolean;
  v_role text;
BEGIN
  -- Defense-in-depth: even if EXECUTE is accidentally re-granted to anon/authenticated
  -- in the future, this blocks any caller that isn't service_role or postgres.
  v_role := current_setting('role', true);
  IF v_role IS NULL OR v_role NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'WEBHOOK_ONLY';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_booking.booking_status <> 'draft' THEN
    RAISE EXCEPTION 'NOT_DRAFT:%', v_booking.booking_status;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.bike_id = v_booking.bike_id
      AND b.id <> v_booking.id
      AND b.booking_status IN ('pending','confirmed')
      AND NOT (b.return_date <= v_booking.pickup_date
            OR b.pickup_date  >= v_booking.return_date)
    FOR UPDATE
  ) INTO v_conflict;

  IF v_conflict THEN
    UPDATE public.bookings
       SET booking_status = 'conflict_refunded',
           status         = 'conflict_refunded',
           payment_status = 'refund_pending',
           cancelled_at   = now(),
           cancellation_reason = 'Date taken by another booking before payment confirmed',
           updated_at     = now()
     WHERE id = _booking_id;
    RETURN jsonb_build_object('ok', false, 'booking_id', _booking_id, 'conflict', true, 'refund_required', true);
  END IF;

  SELECT bt.owner_id INTO v_owner
    FROM public.bikes b
    JOIN public.bike_types bt ON bt.id = b.bike_type_id
   WHERE b.id = v_booking.bike_id;

  UPDATE public.bookings
     SET booking_status = 'pending',
         status         = 'pending',
         payment_status = 'paid',
         platform_fee_paid_amount_mad = _platform_fee_paid,
         confirmation_fee_paid_amount_mad = 0,
         assigned_to_business = v_owner,
         assigned_at = now(),
         updated_at = now()
   WHERE id = _booking_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', _booking_id, 'conflict', false);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.promote_draft_to_pending(uuid, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_draft_to_pending(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_draft_to_pending(uuid, integer, integer) FROM authenticated;