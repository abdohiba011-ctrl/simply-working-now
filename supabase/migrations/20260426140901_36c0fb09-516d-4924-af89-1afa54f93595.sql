
-- Renter wallets
CREATE TABLE IF NOT EXISTS public.renter_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MAD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renter_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own renter wallet"
  ON public.renter_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all renter wallets"
  ON public.renter_wallets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER renter_wallets_set_updated_at
  BEFORE UPDATE ON public.renter_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Renter wallet transactions
CREATE TABLE IF NOT EXISTS public.renter_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,            -- topup | fee | refund | adjustment
  status text NOT NULL DEFAULT 'completed',
  balance_after numeric,
  description text,
  method text,
  reference text,
  related_payment_id uuid,
  related_booking_id uuid,
  currency text NOT NULL DEFAULT 'MAD',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renter_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own renter wallet transactions"
  ON public.renter_wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all renter wallet transactions"
  ON public.renter_wallet_transactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_renter_wallet_tx_user
  ON public.renter_wallet_transactions(user_id, created_at DESC);

-- Credit function used by the YouCan Pay webhook
CREATE OR REPLACE FUNCTION public.credit_renter_wallet(
  _user_id uuid,
  _amount numeric,
  _payment_id uuid DEFAULT NULL,
  _method text DEFAULT 'youcanpay',
  _reference text DEFAULT NULL,
  _description text DEFAULT 'Credits top up'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet record;
  v_new_balance numeric;
BEGIN
  IF _user_id IS NULL OR _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT';
  END IF;

  INSERT INTO public.renter_wallets (user_id, balance, currency)
  VALUES (_user_id, 0, 'MAD')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.renter_wallets
  WHERE user_id = _user_id
  FOR UPDATE;

  v_new_balance := COALESCE(v_wallet.balance, 0) + _amount;

  UPDATE public.renter_wallets
     SET balance = v_new_balance,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.renter_wallet_transactions
    (user_id, amount, type, status, balance_after, description, method,
     reference, related_payment_id, currency)
  VALUES
    (_user_id, _amount, 'topup', 'completed', v_new_balance, _description, _method,
     _reference, _payment_id, COALESCE(v_wallet.currency, 'MAD'));

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

-- Ensure every new user gets a renter wallet row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.renter_wallets (user_id, balance, currency)
  VALUES (NEW.id, 0, 'MAD')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill wallets for existing users
INSERT INTO public.renter_wallets (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
