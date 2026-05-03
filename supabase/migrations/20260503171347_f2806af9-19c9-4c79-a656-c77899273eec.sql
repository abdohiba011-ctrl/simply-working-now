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
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_date_ranges(uuid) TO anon, authenticated;