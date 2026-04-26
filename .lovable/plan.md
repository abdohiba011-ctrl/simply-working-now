# Renter Credits & Billing System

Build a credits/wallet system for renters (separate from the agency wallet), surfaced as a balance pill in the public header and backed by a full Billing page for top-ups, transactions, and payment management.

## 1. Database (new migration)

Create a renter-side wallet (kept separate from the existing `agency_wallets` so the two sides never mix):

- **`renter_wallets`**
  - `id uuid PK`, `user_id uuid UNIQUE NOT NULL`, `balance numeric NOT NULL DEFAULT 0`, `currency text NOT NULL DEFAULT 'MAD'`, `created_at`, `updated_at`
  - RLS: user can `SELECT` own row; admins manage all; inserts/updates only via SECURITY DEFINER functions.

- **`renter_wallet_transactions`**
  - `id`, `user_id`, `amount numeric` (positive = top-up/refund, negative = spend/fee), `type text` (`topup` | `fee` | `refund` | `adjustment`), `status text` (`pending` | `completed` | `failed`), `balance_after numeric`, `description text`, `method text` (e.g. `youcanpay`, `cash_plus`), `reference text`, `related_payment_id uuid`, `related_booking_id uuid`, `currency`, `created_at`
  - RLS: user `SELECT` own; admins manage all.

- **DB function `credit_renter_wallet(_user_id, _amount, _payment_id, _method)`** (SECURITY DEFINER) — used by the YouCan Pay webhook on successful top-up. Updates balance + writes a `topup` transaction row atomically.

- **Trigger `handle_new_user_renter_wallet`** on `auth.users` insert (or piggyback on existing `handle_new_user`) to ensure every new renter has a wallet row with balance 0.

- **Extend `youcanpay_payments` purpose** to include `"renter_topup"` (currently supports `wallet_topup` for agencies, `subscription`, `booking_payment`). The webhook routes by `purpose`.

## 2. Edge functions

- **`youcanpay-create-token`**: accept `purpose: "renter_topup"`. Same flow as agency `wallet_topup` but writes the payment row tied to the renter and returns the hosted payment URL. Success/error redirect → `/billing?topup=success|error`.
- **`youcanpay-webhook`**: when `purpose === "renter_topup"` and status is paid, call `credit_renter_wallet(...)` instead of the agency credit path.

## 3. Frontend — Header balance pill

In `src/components/Header.tsx` (the public/renter header), insert a new pill **between the language selector and the messages icon** (matching positioning the user requested). Behavior:
- Visible only when `isAuthenticated && !isBusiness && !isAdmin` (renter only — agencies already have their own wallet pill in `src/components/agency/Header.tsx`).
- Shows `💳 {balance} MAD` with skeleton while loading.
- Click → navigates to `/billing`.
- Subscribes to `renter_wallets` realtime updates so balance refreshes after top-up without a reload.
- Mobile: condensed icon + amount; in the mobile menu overlay show a full row "Credits — XX MAD" linking to `/billing`.

New hook `src/hooks/useRenterWallet.ts`: fetches `renter_wallets` row + recent transactions, exposes `{ balance, currency, isLoading, refetch }`, sets up realtime subscription.

## 4. Frontend — Billing page (`/billing`)

New page `src/pages/Billing.tsx` (protected route, renter only). Tabs (using existing `Tabs` UI):

1. **Credits / Overview**
   - Big balance card (current MAD balance, last updated).
   - Primary CTA "Top up credits" → opens top-up dialog.
   - Quick preset chips: 50, 100, 200, 500 MAD + custom amount input.
   - Top-up dialog calls `youcanpay-create-token` with `purpose: "renter_topup"` and opens the hosted payment URL via existing `openHostedPayment` helper.
   - Returning from `?topup=success` shows a success toast and refetches wallet.

2. **Transactions**
   - Table of `renter_wallet_transactions` (date, type with colored badge, description, amount with +/− sign, balance after, status).
   - Filter chips: All / Top-ups / Fees / Refunds.
   - Search by reference/description.

3. **Payment methods** (MVP)
   - Read-only summary: "Top-ups via YouCan Pay (card or Cash Plus)". No stored cards in MVP (YouCan Pay is hosted) — show informational card, leave hook for future saved methods.

4. **Billing info**
   - Editable: full name, email, phone, billing address (saved on `profiles` — no new fields needed beyond what already exists).
   - Used to pre-fill future invoices.

Add route in `src/App.tsx`:
```tsx
const Billing = lazy(() => import("./pages/Billing"));
// ...
<Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
```

## 5. i18n

Add the following keys to `src/locales/{en,fr,ar}.json` under a new `billing` namespace: `credits`, `balance`, `topUp`, `topUpCredits`, `topUpAmount`, `presetAmounts`, `transactions`, `paymentMethods`, `billingInfo`, `noTransactions`, `topupSuccess`, `topupError`, `via_youcanpay`, plus header key `header.credits`.

## 6. Constraints respected

- Renter wallet is **strictly separate** from agency wallet (different tables, different functions, different webhook branches) — agencies and renters never share a balance.
- Top-ups go through YouCan Pay (existing integration) — no new payment provider.
- Pill only renders for renters; agencies continue to use their existing `/agency/finance#wallet` pill.
- All strings i18n'd, RTL-safe (use logical spacing utilities like `ms-`/`me-`).
- Mobile breakpoint 375px verified by using a compact pill on `sm:` and below.

## Files to add / edit

- **New**: `supabase/migrations/<timestamp>_renter_wallet.sql`
- **New**: `src/hooks/useRenterWallet.ts`
- **New**: `src/pages/Billing.tsx`
- **Edit**: `src/components/Header.tsx` (add balance pill + mobile entry)
- **Edit**: `src/App.tsx` (register `/billing` route)
- **Edit**: `supabase/functions/youcanpay-create-token/index.ts` (handle `renter_topup`)
- **Edit**: `supabase/functions/youcanpay-webhook/index.ts` (route `renter_topup` → `credit_renter_wallet`)
- **Edit**: `src/locales/en.json`, `fr.json`, `ar.json`