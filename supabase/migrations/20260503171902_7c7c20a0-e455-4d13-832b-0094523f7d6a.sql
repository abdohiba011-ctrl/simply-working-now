CREATE OR REPLACE FUNCTION public.cleanup_stale_draft_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.bookings
    WHERE booking_status = 'draft'
      AND created_at < (now() - interval '24 hours')
    RETURNING id
  )
  SELECT count(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_stale_draft_bookings() FROM PUBLIC, anon, authenticated;

-- Unschedule any prior version of this job, then schedule hourly.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'cleanup_stale_draft_bookings_hourly';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
  PERFORM cron.schedule(
    'cleanup_stale_draft_bookings_hourly',
    '0 * * * *',
    $cron$ SELECT public.cleanup_stale_draft_bookings(); $cron$
  );
END $$;