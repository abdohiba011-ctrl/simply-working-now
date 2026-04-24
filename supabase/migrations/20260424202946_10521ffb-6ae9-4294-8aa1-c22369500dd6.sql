
-- Add attachment + flag fields to booking_messages
ALTER TABLE public.booking_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reasons text[];

-- Allow image-only messages (body can be empty when attachment present)
ALTER TABLE public.booking_messages
  ALTER COLUMN body DROP NOT NULL;

-- Update audit trigger to mark message + populate reasons (still inserts audit_log)
CREATE OR REPLACE FUNCTION public.audit_booking_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_flagged boolean := false;
  v_reasons text[] := ARRAY[]::text[];
  v_body text := lower(coalesce(NEW.body, ''));
BEGIN
  IF v_body ~ '(\+?\d[\s.-]?){8,}' THEN
    v_flagged := true;
    v_reasons := array_append(v_reasons, 'phone_number');
  END IF;
  IF v_body ~ '(whatsapp|wa\.me|whats app|واتساب|telegram|t\.me|signal)' THEN
    v_flagged := true;
    v_reasons := array_append(v_reasons, 'off_platform_messenger');
  END IF;
  IF v_body ~ '(cash app|paypal|venmo|bank transfer|virement|cash deal|outside platform|hors plateforme)' THEN
    v_flagged := true;
    v_reasons := array_append(v_reasons, 'off_platform_payment');
  END IF;

  IF v_flagged THEN
    NEW.flagged := true;
    NEW.flag_reasons := v_reasons;

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
        'preview', left(coalesce(NEW.body,''), 200)
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS audit_booking_message_trg ON public.booking_messages;
CREATE TRIGGER audit_booking_message_trg
BEFORE INSERT ON public.booking_messages
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_message();

-- Storage bucket for chat attachments (public so signed URLs aren't required for in-app display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read (public bucket); only authenticated booking parties can upload/delete their own files
DROP POLICY IF EXISTS "Chat attachments are publicly readable" ON storage.objects;
CREATE POLICY "Chat attachments are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
