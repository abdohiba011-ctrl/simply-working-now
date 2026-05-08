## Problem

When a renter pays the booking fee with debit/credit card, after the YouCan Pay form succeeds the app briefly shows the **CashPlus voucher flow** (10‑minute countdown, "pay at any agent", voucher code area) for ~3‑5 seconds before flipping to "Booking confirmed". CashPlus UI must only ever appear when the renter explicitly chose CashPlus.

## Root cause

`src/pages/BookingConfirmed.tsx` infers the payment method when `bookings.payment_method` is still `null`:

```ts
const inferredCashplus =
  !data.payment_method &&
  ((latestPayment?.method === "cashplus") ||
    (Number(latestPayment?.amount) === 60 &&
      latestPayment?.status === "pending" &&
      !latestPayment?.transaction_id));
```

Right after a card payment, the webhook hasn't written `payment_method` yet, the latest `youcanpay_payments` row can momentarily look like `pending` with no `transaction_id`, so the inference resolves to `cashplus = true`. The page then renders the CashPlus waiting UI until the next poll updates `payment_status = paid`.

The actual chosen method is already known on the client — `Checkout.tsx` forwards it through the URL as `?payment=card|cashplus` into the confirmation route — but `BookingConfirmed.tsx` ignores that param.

## Fix

Trust the explicit `payment` query param as the source of truth and only fall back to inference when it's missing.

### 1. `src/pages/BookingConfirmed.tsx`
- Read `payment` from `useSearchParams()` (values: `"card" | "cashplus"`).
- When computing `inferredCashplus`:
  - If URL `payment === "card"` → force `false` (never show CashPlus UI).
  - If URL `payment === "cashplus"` → force `true`.
  - If absent (e.g. user landed via a deep link) → keep the existing inference as a fallback.
- Use the resolved value to set `row.payment_method` and `isCashplus`.

### 2. Light hardening (same file)
- Memoize `isCashplus` from the resolved value so later re‑renders/polling can't flip it.
- No change to the polling logic, voucher sessionStorage, or CashPlus countdown — they only run when `isCashplus` is true.

### 3. No backend / webhook changes
The webhook continues to write `payment_method` correctly; we're only fixing the UI's premature inference window.

## Files touched
- `src/pages/BookingConfirmed.tsx` (one effect + one derived value)

## Out of scope
- `PaymentStatus.tsx` (already generic, no CashPlus copy)
- `PayYouCan.tsx` routing (already correct: card → `/payment-status`, cashplus → `/payment-cashplus`)
- Checkout already passes `payment=method` — no change needed there.
