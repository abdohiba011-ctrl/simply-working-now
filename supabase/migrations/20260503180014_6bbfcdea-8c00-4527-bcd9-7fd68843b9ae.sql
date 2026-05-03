CREATE OR REPLACE FUNCTION public.cleanup_stale_draft_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
  v_n integer;
BEGIN
  -- Card / unspecified drafts: 24h TTL
  WITH del AS (
    DELETE FROM public.bookings
    WHERE booking_status = 'draft'
      AND COALESCE(payment_method, 'card') <> 'cashplus'
      AND created_at < (now() - interval '24 hours')
    RETURNING id
  )
  SELECT count(*) INTO v_n FROM del;
  v_deleted := v_deleted + v_n;

  -- Cash Plus drafts: 72h TTL (voucher validity)
  WITH del AS (
    DELETE FROM public.bookings
    WHERE booking_status = 'draft'
      AND payment_method = 'cashplus'
      AND created_at < (now() - interval '72 hours')
    RETURNING id
  )
  SELECT count(*) INTO v_n FROM del;
  v_deleted := v_deleted + v_n;

  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_stale_draft_bookings() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_booked_date_ranges(_bike_id uuid)
RETURNS TABLE(pickup_date date, return_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pickup_date, return_date
  FROM public.bookings
  WHERE bike_id = _bike_id
    AND booking_status IN ('pending', 'confirmed', 'active', 'in_progress')
    AND return_date >= CURRENT_DATE
  UNION ALL
  SELECT pickup_date, return_date
  FROM public.bookings
  WHERE bike_id = _bike_id
    AND booking_status = 'draft'
    AND payment_method = 'cashplus'
    AND created_at > (now() - interval '72 hours')
    AND return_date >= CURRENT_DATE
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_date_ranges(uuid) TO anon, authenticated;