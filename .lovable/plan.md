## Problem

On the renter Checkout (and the agency Wallet top-up), we show one "Pay with card" CTA, but the embedded YouCan Pay form actually renders **both** Card and CashPlus gateways and we treat the result the same way:

- `PayYouCan` calls `yc.renderAvailableGateways(...)` so the user can pick CashPlus.
- After `yc.pay(token)` resolves, we always send the user to `/payment-status` which polls the webhook for ~30s.

That works for **Card** (3DS finishes in seconds, webhook fires `paid`, we auto-confirm).
It is wrong for **CashPlus** — YouCan returns a voucher (transaction stays `pending` until the user physically pays at a CashPlus point hours or days later). The poller times out, the user sees a confusing "Still processing" screen, and the voucher reference is buried.

The two methods are fundamentally different and need their own UX.

## What we'll build

### 1. Choose method on Checkout (renter)

Replace the single "Pay with card" panel with two side-by-side selectable options:

```text
┌──────────────────────┐  ┌──────────────────────┐
│ 💳 Card              │  │ 🧾 CashPlus voucher  │
│ Instant confirmation │  │ Pay at any CashPlus  │
│ Visa / Mastercard    │  │ agent · 60 MAD       │
└──────────────────────┘  └──────────────────────┘
            [ Continue to payment ]
```

The selected method is forwarded to `/pay/youcanpay` via a new `method=card|cashplus` query param.

### 2. Render only the chosen gateway

In `PayYouCan.tsx`, read `method` and call:
- `yc.renderCreditCardForm("default")` when `method=card`
- `yc.renderCashPlusForm("default")` (or the equivalent gateway-name call) when `method=cashplus`

This stops the user from silently switching method inside the form.

### 3. Two outcome paths

When `yc.pay(token)` resolves:

- **Card** → unchanged. Navigate to `/payment-status` with current 30s poll → on `paid` continue to `/confirmation`.
- **CashPlus** → navigate to a new **`/payment-cashplus`** page (not the generic status page) with the voucher details.

### 4. New `/payment-cashplus` voucher page

Dedicated, calmer UI tailored to a "pay later" flow:

- Big voucher reference number / barcode-ready string from the YouCan response.
- Clear copy: "Take this code to any CashPlus agent in Morocco. Pay 60 MAD. Your booking is held while we wait — the agency will be notified the moment CashPlus confirms."
- "Find a CashPlus agent" link.
- Status badge: **Awaiting payment**. No countdown, no fake "Still processing" alarm.
- Background poll of `youcanpay_payments.status` every ~10s with a longer/open-ended timeout, plus a **Verify now** button (reuses `youcanpay-verify-payment`).
- Buttons: **Copy code**, **Email me the code**, **I've paid — verify now**, **Back to my bookings**.
- When status flips to `paid`, auto-redirect to `/confirmation` (same `next` path Card uses).
- Page is safe to leave; the booking row in `/bookings/:id` shows the same voucher and "Awaiting CashPlus payment" status so the user can return any time.

### 5. Apply the same split to agency Wallet top-up

`src/pages/agency/Wallet.tsx` uses the same `youcanpay-create-token` + `/pay/youcanpay` route. Mirror the change:
- Pick method first (Card vs CashPlus).
- CashPlus top-ups land on `/payment-cashplus` with `next` pointing back to `/agency/wallet`.
- Wallet credit only happens when the webhook flips status to `paid` (already true today — no DB change needed).

### 6. Backend — no schema change

The webhook (`youcanpay-webhook`) and `youcanpay-verify-payment` already detect `cashplus` vs `card` from the gateway field and only credit / confirm on `paid`. We just need to:
- Make sure `youcanpay-create-token` stores the chosen `method` on the `youcanpay_payments` row (column already exists per webhook code), so `/payment-cashplus` can render the right UI even on a refresh / return-later session.
- Confirm `bookings` keeps its `pending` state until `paid` for CashPlus — no auto-cancel during the voucher wait window. (We'll review existing hold-expiry logic in `promote_hold_to_booking` and extend the booking hold for CashPlus selections; details in the technical section.)

## Files to change

- `src/pages/Checkout.tsx` — add method selector, pass `method` param.
- `src/pages/PayYouCan.tsx` — render only the chosen gateway, route success per method.
- `src/pages/PaymentCashPlus.tsx` — **new** voucher / waiting page.
- `src/pages/PaymentStatus.tsx` — keep as Card-only (tighten copy: "Confirming your card payment…").
- `src/pages/agency/Wallet.tsx` — same method selector for top-ups.
- `src/App.tsx` — register `/payment-cashplus` route.
- `supabase/functions/youcanpay-create-token/index.ts` — accept and persist `method` on insert.
- `src/locales/en.json` / `fr.json` / `ar.json` — strings for the new selector and voucher page (RTL safe).

## Out of scope

- No change to the 60 MAD amount, the 10/50 split, or refund logic.
- No new payment provider.
- No change to how the agency receives the booking notification (webhook unchanged for Card; for CashPlus the agency is still only notified on `paid`, which matches the rule that nothing is "real" until money is in).

## Open question (one)

For CashPlus, should the renter's bike **hold** be extended past the current 5-minute window so the booking isn't cancelled while the voucher is unpaid? Recommended: extend to 24h for CashPlus selections, and surface that timer to both renter and agency. I'll confirm with you before changing `promote_hold_to_booking`.
