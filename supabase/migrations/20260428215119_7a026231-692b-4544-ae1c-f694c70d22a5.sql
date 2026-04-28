-- Tighten realtime.messages policy: deny by default, only allow booking_messages topic for booking participants/admins
DROP POLICY IF EXISTS "Booking participants can subscribe to booking_messages" ON realtime.messages;

CREATE POLICY "Booking participants can subscribe to booking_messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN (realtime.messages.extension = 'postgres_changes'
          OR realtime.messages.extension = 'broadcast'
          OR realtime.messages.extension = 'presence')
         AND realtime.topic() LIKE 'booking-messages-%'
    THEN EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id::text = substring(realtime.topic() FROM 'booking-messages-(.*)')
        AND (
          b.user_id = auth.uid()
          OR b.assigned_to_business = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
    ELSE false
  END
);