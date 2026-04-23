
-- Add subscription_plan to profiles for quick read
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';

-- ============ agency_subscriptions ============
CREATE TABLE IF NOT EXISTS public.agency_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free', -- free | pro | business
  status text NOT NULL DEFAULT 'active', -- active | cancelled | past_due
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  last_payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
ON public.agency_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all subscriptions"
ON public.agency_subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_agency_subscriptions_updated_at
BEFORE UPDATE ON public.agency_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ agency_wallets ============
CREATE TABLE IF NOT EXISTS public.agency_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MAD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet"
ON public.agency_wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all wallets"
ON public.agency_wallets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_agency_wallets_updated_at
BEFORE UPDATE ON public.agency_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ agency_wallet_transactions ============
CREATE TABLE IF NOT EXISTS public.agency_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- topup | withdrawal | booking_payout | subscription_charge | adjustment | refund
  amount numeric NOT NULL, -- positive credit, negative debit
  balance_after numeric,
  currency text NOT NULL DEFAULT 'MAD',
  status text NOT NULL DEFAULT 'completed', -- pending | completed | failed
  method text, -- youcanpay | bank_transfer | manual
  description text,
  reference text,
  related_booking_id uuid,
  related_payment_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_wallet_tx_user ON public.agency_wallet_transactions(user_id, created_at DESC);

ALTER TABLE public.agency_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet transactions"
ON public.agency_wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all wallet transactions"
ON public.agency_wallet_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ agency_withdrawal_requests ============
CREATE TABLE IF NOT EXISTS public.agency_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'MAD',
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | paid
  bank_account_label text,
  bank_iban text,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals"
ON public.agency_withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create own withdrawals"
ON public.agency_withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all withdrawals"
ON public.agency_withdrawal_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_agency_withdrawal_requests_updated_at
BEFORE UPDATE ON public.agency_withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ youcanpay_payments ============
CREATE TABLE IF NOT EXISTS public.youcanpay_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- payer or agency depending on purpose
  purpose text NOT NULL, -- booking | subscription | wallet_topup
  amount numeric NOT NULL, -- in MAD
  currency text NOT NULL DEFAULT 'MAD',
  status text NOT NULL DEFAULT 'pending', -- pending | paid | failed | cancelled
  token_id text, -- YouCanPay token ID
  transaction_id text, -- YouCanPay transaction ID after payment
  related_booking_id uuid,
  related_subscription_id uuid,
  related_wallet_user_id uuid,
  customer_email text,
  customer_name text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ycp_payments_user ON public.youcanpay_payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ycp_payments_token ON public.youcanpay_payments(token_id);

ALTER TABLE public.youcanpay_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments"
ON public.youcanpay_payments FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = related_wallet_user_id);

CREATE POLICY "Admins manage all payments"
ON public.youcanpay_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_youcanpay_payments_updated_at
BEFORE UPDATE ON public.youcanpay_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
