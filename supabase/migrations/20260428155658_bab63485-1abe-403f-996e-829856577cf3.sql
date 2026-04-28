CREATE POLICY "Booking parties can read messages"
  ON public.booking_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_messages.booking_id
        AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );