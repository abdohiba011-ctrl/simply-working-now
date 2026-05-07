CREATE OR REPLACE FUNCTION public.admin_cancel_referral_payout(_payout_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT status INTO _status FROM public.referral_payouts WHERE id = _payout_id FOR UPDATE;
  IF _status IS NULL THEN
    RAISE EXCEPTION 'payout_not_found';
  END IF;
  IF _status <> 'pending' THEN
    RAISE EXCEPTION 'payout_not_pending';
  END IF;

  UPDATE public.referrals SET payout_id = NULL WHERE payout_id = _payout_id;

  UPDATE public.referral_payouts
    SET status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || COALESCE('Cancelled: ' || _reason, 'Cancelled')
    WHERE id = _payout_id;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'payout_cancelled', 'referral_payout', _payout_id, jsonb_build_object('reason', _reason));
END;
$$;