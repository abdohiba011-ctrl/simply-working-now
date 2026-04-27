# Add manual payment verification fallback

A safety net for the rare cases where YouCan Pay's webhook is delayed or fails to reach our server. Lets the user (or admin) confirm a payment by polling YouCan's API directly.

## What gets added

### 1. New edge function: `youcanpay-verify-payment`
- Input: `payment_id` (our `youcanpay_payments.id`)
- Auth: requires logged-in user; only the payment owner or an admin can call it
- Action: calls YouCan Pay's transaction status API using the stored `token_id`/`transaction_id`, then runs the same credit-and-update logic as the webhook (reusing idempotency — already paid → no-op)
- Returns: `{ status: 'paid' | 'pending' | 'failed', payment }`

### 2. UI updates on `PaymentStatus.tsx`
After the existing 30 s poll times out without resolution:
- Show an amber "Still processing?" card
- Primary button: "Verify payment now" → calls the new edge function, then re-checks the row
- Secondary link: "Contact support" → mailto with payment ID prefilled

### 3. Admin recovery: stuck payments list
Small addition to `AdminPanel` (Payments / Bookings tab area):
- New "Stuck Payments" widget showing `youcanpay_payments` rows where status = `pending` AND `created_at < now() - 10 min`
- Per-row "Verify now" button that calls the same edge function

## Technical notes

- The verify function uses YouCan Pay's `GET /transactions/{id}` (sandbox or live, picked from key prefix — same logic just added to `youcanpay-create-token`).
- Logic is extracted into a small shared helper inside the function (kept in `index.ts` per Lovable edge function rules — no subfolders).
- Webhook idempotency (already enforced in the latest webhook) means double-processing is impossible if both the webhook and a manual verify race.
- No DB schema changes required.
- No new secrets required (reuses `YOUCANPAY_PRIVATE_KEY` / `YOUCANPAY_PUBLIC_KEY`).

## Files touched

- `supabase/functions/youcanpay-verify-payment/index.ts` (new)
- `supabase/config.toml` (register the new function with `verify_jwt = true`)
- `src/pages/PaymentStatus.tsx` (timeout state → verify button)
- `src/components/admin/AdminBookingsTab.tsx` or a new `StuckPaymentsCard` (small admin widget)

## Out of scope

- Refunds via API (manual via YouCan dashboard for now)
- Retry from PayYouCan page (already supported via existing `retry` query param)
- Email/Slack alert on stuck payments (can add later if it proves useful)
