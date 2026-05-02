-- Manually finalize stuck YouCan Pay payment whose webhook never fired.
-- Payment was successfully charged at the provider (MAD 60, card 4242, May 2 2026).
UPDATE public.youcanpay_payments
   SET status = 'paid',
       paid_at = COALESCE(paid_at, now()),
       updated_at = now()
 WHERE id = 'f6bcf5f9-10d5-4e5b-b946-47eed23b774d'
   AND status <> 'paid';

-- Ensure the booking reflects the paid platform fee.
UPDATE public.bookings
   SET payment_status = 'paid',
       updated_at = now()
 WHERE id = 'c2163bba-1a28-4a34-8dbc-d696eef61e1e'
   AND payment_status <> 'paid';

-- Insert the missing booking_payments ledger row (idempotent guard).
INSERT INTO public.booking_payments (
  booking_id, amount, currency, provider, method, payment_type, status, paid_at, external_reference
)
SELECT 'c2163bba-1a28-4a34-8dbc-d696eef61e1e'::uuid, 60, 'MAD', 'youcanpay', 'card',
       'platform_fee', 'completed', now(), 'manual-recover-f6bcf5f9'
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_payments
  WHERE booking_id = 'c2163bba-1a28-4a34-8dbc-d696eef61e1e'
    AND payment_type = 'platform_fee'
);