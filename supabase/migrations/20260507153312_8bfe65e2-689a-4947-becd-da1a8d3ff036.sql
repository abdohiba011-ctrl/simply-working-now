-- Phase 3B: referral payouts (manual)

-- 1. Payouts table
CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_mad numeric NOT NULL CHECK (amount_mad >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  payout_method text,
  payout_reference text,
  week_start date NOT NULL,
  week_end date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_payouts_one_pending_per_user
  ON public.referral_payouts(user_id) WHERE status = 'pending';

ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payouts" ON public.referral_payouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all payouts" ON public.referral_payouts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage payouts" ON public.referral_payouts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Link referrals to a payout
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS payout_id uuid REFERENCES public.referral_payouts(id) ON DELETE SET NULL;

-- 3. Balances view
CREATE OR REPLACE VIEW public.referral_balances
WITH (security_invoker = true) AS
SELECT
  r.referrer_id AS user_id,
  COUNT(*)::int AS total_referrals,
  COUNT(*) FILTER (WHERE r.status = 'signed_up')::int AS signed_up_count,
  COUNT(*) FILTER (WHERE r.status = 'booked')::int AS booked_count,
  COUNT(*) FILTER (WHERE r.status = 'approved')::int AS approved_count,
  COUNT(*) FILTER (WHERE r.status = 'rejected')::int AS rejected_count,
  COUNT(*) FILTER (WHERE r.status = 'paid')::int AS paid_count,
  COALESCE(SUM(r.reward_amount_mad) FILTER (WHERE r.status = 'booked'), 0)::numeric AS pending_mad,
  COALESCE(SUM(r.reward_amount_mad) FILTER (WHERE r.status = 'approved' AND r.payout_id IS NULL), 0)::numeric AS approved_unpaid_mad,
  COALESCE(SUM(r.reward_amount_mad) FILTER (WHERE r.status = 'paid'), 0)::numeric AS paid_mad
FROM public.referrals r
GROUP BY r.referrer_id;

GRANT SELECT ON public.referral_balances TO authenticated;

-- 4. Admin: create payout from approved unpaid referrals
CREATE OR REPLACE FUNCTION public.admin_create_referral_payout(
  _user_id uuid,
  _week_start date DEFAULT (date_trunc('week', now())::date),
  _week_end date DEFAULT ((date_trunc('week', now()) + interval '6 days')::date),
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_count int;
  v_payout_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (SELECT 1 FROM public.referral_payouts WHERE user_id = _user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'duplicate_pending_payout';
  END IF;

  SELECT COALESCE(SUM(reward_amount_mad), 0), COUNT(*)
    INTO v_amount, v_count
    FROM public.referrals
   WHERE referrer_id = _user_id
     AND status = 'approved'
     AND payout_id IS NULL;

  IF v_amount < 50 THEN
    RAISE EXCEPTION 'below_threshold';
  END IF;

  INSERT INTO public.referral_payouts (user_id, amount_mad, status, week_start, week_end, notes)
  VALUES (_user_id, v_amount, 'pending', _week_start, _week_end, _notes)
  RETURNING id INTO v_payout_id;

  UPDATE public.referrals
     SET payout_id = v_payout_id
   WHERE referrer_id = _user_id
     AND status = 'approved'
     AND payout_id IS NULL;

  INSERT INTO public.audit_logs (user_id, action, action_type, table_name, record_id, new_value, action_description)
  VALUES (auth.uid(), 'payout_created', 'referral', 'referral_payouts', v_payout_id::text,
          jsonb_build_object('user_id', _user_id, 'amount_mad', v_amount, 'count', v_count),
          'Created referral payout');

  RETURN v_payout_id;
END;
$$;

-- 5. Admin: mark payout paid
CREATE OR REPLACE FUNCTION public.admin_mark_referral_payout_paid(
  _payout_id uuid,
  _payout_method text,
  _payout_reference text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _payout_method NOT IN ('bank_transfer','cash_plus','manual_cash','other') THEN
    RAISE EXCEPTION 'invalid_method';
  END IF;
  IF COALESCE(_payout_reference, '') = '' AND COALESCE(_notes, '') = '' THEN
    RAISE EXCEPTION 'reference_or_note_required';
  END IF;

  SELECT user_id INTO v_user FROM public.referral_payouts WHERE id = _payout_id AND status = 'pending';
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'payout_not_pending';
  END IF;

  UPDATE public.referral_payouts
     SET status = 'paid',
         payout_method = _payout_method,
         payout_reference = _payout_reference,
         notes = COALESCE(_notes, notes),
         paid_at = now(),
         paid_by = auth.uid()
   WHERE id = _payout_id;

  UPDATE public.referrals
     SET status = 'paid',
         paid_at = now()
   WHERE payout_id = _payout_id
     AND status = 'approved';

  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (v_user, 'Referral payout sent',
          'Your referral payout has been marked as paid. Check your method of payment.',
          'success', '/affiliate');

  INSERT INTO public.audit_logs (user_id, action, action_type, table_name, record_id, new_value, action_description)
  VALUES (auth.uid(), 'payout_marked_paid', 'referral', 'referral_payouts', _payout_id::text,
          jsonb_build_object('method', _payout_method, 'reference', _payout_reference),
          'Marked referral payout as paid');
END;
$$;

-- 6. Admin: cancel payout
CREATE OR REPLACE FUNCTION public.admin_cancel_referral_payout(
  _payout_id uuid,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.referrals SET payout_id = NULL WHERE payout_id = _payout_id;

  UPDATE public.referral_payouts
     SET status = 'cancelled',
         notes = COALESCE(_reason, notes)
   WHERE id = _payout_id
     AND status = 'pending';

  INSERT INTO public.audit_logs (user_id, action, action_type, table_name, record_id, new_value, action_description)
  VALUES (auth.uid(), 'payout_cancelled', 'referral', 'referral_payouts', _payout_id::text,
          jsonb_build_object('reason', _reason),
          'Cancelled referral payout');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_referral_payout(uuid, date, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_referral_payout_paid(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_referral_payout(uuid, text) FROM anon;