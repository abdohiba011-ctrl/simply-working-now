-- Allow booking parties to mark messages as read
DROP POLICY IF EXISTS "Booking parties can mark messages read" ON public.booking_messages;
CREATE POLICY "Booking parties can mark messages read"
ON public.booking_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
  )
);

-- Trigger to ensure non-admins can ONLY change read_at on messages they did not send
CREATE OR REPLACE FUNCTION public.booking_messages_restrict_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Lock all fields except read_at
  NEW.id              := OLD.id;
  NEW.booking_id      := OLD.booking_id;
  NEW.sender_id       := OLD.sender_id;
  NEW.sender_role     := OLD.sender_role;
  NEW.body            := OLD.body;
  NEW.attachment_url  := OLD.attachment_url;
  NEW.message_type    := OLD.message_type;
  NEW.flagged         := OLD.flagged;
  NEW.flag_reasons    := OLD.flag_reasons;
  NEW.created_at      := OLD.created_at;

  -- Only allow read_at to be set, not unset, and only on messages the user did not send
  IF OLD.sender_id = auth.uid() THEN
    NEW.read_at := OLD.read_at;
  END IF;
  IF NEW.read_at IS NULL THEN
    NEW.read_at := OLD.read_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_messages_restrict_updates_trg ON public.booking_messages;
CREATE TRIGGER booking_messages_restrict_updates_trg
BEFORE UPDATE ON public.booking_messages
FOR EACH ROW EXECUTE FUNCTION public.booking_messages_restrict_updates();