-- 1) Extend bike hold default window from 5 to 10 minutes
ALTER TABLE public.bike_holds
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '10 minutes');

-- 2) Auto-cancel unpaid pending bookings older than 10 minutes (payment never completed)
CREATE OR REPLACE FUNCTION public.auto_cancel_unpaid_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT id, user_id, bike_id
      FROM public.bookings
     WHERE COALESCE(booking_status, 'pending') = 'pending'
       AND COALESCE(payment_status, 'unpaid') = 'unpaid'
       AND created_at < now() - interval '10 minutes'
     LIMIT 500
  LOOP
    UPDATE public.bookings
       SET booking_status = 'cancelled',
           status = 'cancelled',
           cancelled_at = now(),
           cancellation_reason = 'Auto-cancelled: payment not completed within 10 minutes',
           updated_at = now()
     WHERE id = v_row.id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_row.user_id,
      'Booking cancelled — payment not received',
      'Your booking #' || left(v_row.id::text, 8)
        || ' was automatically cancelled because the booking fee was not paid within 10 minutes. The bike is available again — please book again if you still want it.',
      'booking',
      '/bike/' || v_row.bike_id::text
    );

    INSERT INTO public.booking_events
      (booking_id, event_type, action, actor_type, from_state, to_state, description)
    VALUES
      (v_row.id, 'status_change', 'auto_cancel_unpaid', 'system',
       'pending', 'cancelled', 'Auto-cancelled: payment not completed within 10 minutes');

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 3) Schedule it every minute via pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('motonita-auto-cancel-unpaid')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'motonita-auto-cancel-unpaid');
    PERFORM cron.schedule(
      'motonita-auto-cancel-unpaid',
      '* * * * *',
      $cron$ SELECT public.auto_cancel_unpaid_bookings(); $cron$
    );
  END IF;
END $$;