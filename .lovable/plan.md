## Problem

On `/booking-confirmed/:id` the CashPlus voucher screen shows a made-up code like `0B5B040A` (just the first 8 chars of our internal booking UUID, uppercased). YouCan Pay actually issues its own reference like `cp203854361` — that's the only code Cash Plus agents recognize. Renters paying with our code will be told "reference not found" at the agency.

The same screen also says "Expires in 72 hours", which contradicts the locked 10-minute payment window (auto-cancel cron is already in place, the UI just hasn't been updated).

## What changes (all in `src/pages/BookingConfirmed.tsx` — no backend / no schema changes)

### 1. Display YouCan's real CashPlus reference

The initial load already fetches the latest `youcanpay_payments` row. Extend that select to also pull `id`, `created_at` (used below), and keep `transaction_id`. Hold them in component state alongside the booking.

While `transaction_id` is null (YouCan hasn't returned it yet), show a friendly placeholder ("Generating your Cash Plus reference…") instead of the misleading short hex. Once present, render `transaction_id` as the big copyable reference. The 8-char internal short ref stays only for support emails / the WhatsApp share text (it's our internal handle, not the Cash Plus code).

Background poll (already running every 10s for cashplus) is reused — when the row gets a transaction_id (webhook fills it), the screen updates automatically. Add a "Refresh" / "I don't see my code" affordance that re-runs the same fetch on demand.

### 2. Switch "Expires in 72 hours" to a live 10-minute countdown

- Compute `deadline = max(payment.created_at, booking.created_at) + 10 min`.
- 1-second tick driving `mm:ss` remaining, in the slot currently labeled "Expires in".
- Re-label the card to "Time left to pay" and update the "Important to know" bullet from "valid for 72 hours" to "valid for 10 minutes — after that the booking is automatically cancelled and the bike is released."
- Drop the long-poll cashplus timeout from 72h to the same 10-min window so `phase` flips to `timeout` cleanly when it elapses.

### 3. Expired state

When the countdown hits zero (or when the polled `bookings` row comes back as `cancelled` — already done by the existing `auto_cancel_unpaid_bookings` cron), render an explicit expired card:
- "Time's up — booking released."
- "No charge was taken. The bike is available again."
- Two buttons: "Book again" → back to the bike's detail page (`/bike/:slug` from `booking.bike_id`'s slug if available, else `/listings`), and "Back to home".

Hide the WhatsApp share / "Find nearest agency" buttons in the expired state so renters don't keep walking to Cash Plus with a dead voucher.

## Out of scope

- No edge-function changes — `youcanpay-webhook` already writes `transaction_id` to `youcanpay_payments` when YouCan sends the event.
- No schema changes — auto-cancel cron from the previous turn already enforces the 10-minute rule server-side.
- `PaymentCashPlus.tsx` (the alternative voucher waiting page) already shows `transaction_id` and a 10-min countdown — leaving it alone.
