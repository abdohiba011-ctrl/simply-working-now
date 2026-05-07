
-- ============ referral_codes ============
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral code"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all referral codes"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ referrals ============
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  invited_user_id uuid,
  invited_email text,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'signed_up'
    CHECK (status IN ('clicked','signed_up','booked','completed','approved','rejected','paid')),
  first_booking_id uuid,
  reward_amount_mad numeric NOT NULL DEFAULT 10,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  signed_up_at timestamptz,
  completed_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  CONSTRAINT no_self_referral CHECK (invited_user_id IS NULL OR invited_user_id <> referrer_id),
  CONSTRAINT unique_invited_user UNIQUE (invited_user_id)
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_invited ON public.referrals(invited_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referrals as referrer"
  ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

CREATE POLICY "Users read own referral as invited"
  ON public.referrals FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid());

CREATE POLICY "Admins read all referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ Code generation helper ============
CREATE OR REPLACE FUNCTION public._gen_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no I,O,0,1
  out text;
  i int;
BEGIN
  out := '';
  FOR i IN 1..6 LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN out;
END
$$;

-- ============ get_or_create_referral_code ============
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing text;
  candidate text;
  attempts int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT code INTO existing FROM public.referral_codes WHERE user_id = uid LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  LOOP
    candidate := public._gen_referral_code();
    attempts := attempts + 1;
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (uid, candidate);
      RETURN candidate;
    EXCEPTION
      WHEN unique_violation THEN
        -- could be the user_id race or code collision; if user got a code, return it
        SELECT code INTO existing FROM public.referral_codes WHERE user_id = uid LIMIT 1;
        IF existing IS NOT NULL THEN RETURN existing; END IF;
        IF attempts > 10 THEN RAISE EXCEPTION 'could not generate unique referral code'; END IF;
    END;
  END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;

-- ============ claim_referral ============
CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  norm_code text;
  rc_row public.referral_codes%ROWTYPE;
  existing_ref public.referrals%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_code');
  END IF;

  norm_code := upper(trim(_code));

  SELECT * INTO rc_row FROM public.referral_codes WHERE code = norm_code LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;
  IF NOT rc_row.is_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inactive_code');
  END IF;
  IF rc_row.user_id = uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  SELECT * INTO existing_ref FROM public.referrals WHERE invited_user_id = uid LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  INSERT INTO public.referrals (referrer_id, invited_user_id, referral_code, status, signed_up_at)
  VALUES (rc_row.user_id, uid, norm_code, 'signed_up', now());

  RETURN jsonb_build_object('ok', true);
END
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
