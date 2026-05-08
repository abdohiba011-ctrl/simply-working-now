## QA pass — last 4 hours of changes

I went through every change made today on the renter side. Here's what's good and what's actually broken.

### ✅ Working as intended
- **Header beta badge** — rendered next to the logo on mobile, tablet, desktop (no responsive hide). Tablet shows badge inline, FAQ hidden via `hidden lg:inline-block`. Matches the latest instruction.
- **"More" dropdown centering** — `align="center"` + transparent rail + `mx-auto w-[min(540px,calc(100vw-2rem))]` card. Centers horizontally on the page, anchored under the button.
- **Inbox bike strip + 24h countdown** — `Inbox.tsx` query now pulls `bikes(bike_types(name, main_image_url))` + `created_at`; `ChatThread` renders the bike thumb row and a live HH:MM:SS band that flips to a red "Agency did not respond within 24h — penalty applies" banner when expired. Verified the data flow end‑to‑end.

### 🐞 Bug found — needs to be fixed

**The CashPlus‑flicker fix on `BookingConfirmed.tsx` is non‑functional in production.**

The fix relies on a `?payment=card|cashplus` query param being on the URL when the renter lands on `/booking/:id/confirmed`. But searching the codebase, **nothing actually adds that param to the redirect**:
- `CheckoutDraft.tsx:472` (CashPlus path) → `navigate(/booking/${id}/confirmed)` — no param.
- `CheckoutDraft.tsx:478` (`next` for card) → `next=/booking/${id}/confirmed` — no param. `PaymentStatus.tsx` then redirects to that exact `next` URL untouched.
- `CheckoutDraft.tsx:137`, `:323` — same.

So `explicitMethod` is always `null`, and the original inference path runs:
```
inferredCashplus =
  latestPayment.method === "cashplus" ||
  (amount === 60 && status === "pending" && !transaction_id)
```
For a card payment that hasn't had its webhook write `payment_method` yet, the latest YouCan row commonly looks like `pending / 60 MAD / no transaction_id` → the page flips into the CashPlus voucher UI for a few seconds, exactly the bug the user reported.

### Fix (only file changes, no schema/business‑rule changes)

**`src/pages/CheckoutDraft.tsx`** — append the explicit method to every redirect into the confirmation page:

1. Line 137 (early bailout when booking already non‑draft):
   ```ts
   const pm = (data as any).payment_method;
   const q = pm ? `?payment=${pm}` : "";
   navigate(`/booking/${data.id}/confirmed${q}`);
   ```
2. Line 323 (CashPlus verify path):
   ```ts
   navigate(`/booking/${booking.id}/confirmed?payment=cashplus`);
   ```
3. Line 472 (CashPlus voucher just created):
   ```ts
   navigate(`/booking/${booking.id}/confirmed?payment=cashplus`, { replace: true });
   ```
4. Line 478 (card → PaymentStatus → confirmed): include the param in `next` so PaymentStatus forwards it untouched:
   ```ts
   next: `/booking/${booking.id}/confirmed?payment=card`,
   ```

No changes to `PaymentStatus.tsx` are needed — it already does `navigate(next)` verbatim, so the query string carries through.

### 🧹 Polish (small, recommended while I'm here)

- **`src/pages/Inbox.tsx:332`** — `counterpartySubtitle={Booking #${id.slice(0,8)}}` now duplicates the bike‑strip's "Booking #…" line. Drop the subtitle so the chat header shows just the agency name; the bike strip below carries the booking ref.
- Hard‑coded English strings I added to `ChatThread.tsx` ("Agency to confirm in", "Agency did not respond within 24h — penalty applies.", "Motorbike", "Booking #") — leaving them in English for now since the rest of `ChatThread.tsx` is already English; flagging only. **Not** part of this fix unless you want it.

### Out of scope
- Penalty engine itself (server‑side rule for "agency didn't respond" — already exists separately).
- Agency‑side inbox.
- Header / dropdown — verified, no changes.

### Files touched by this plan
- `src/pages/CheckoutDraft.tsx` (4 small edits)
- `src/pages/Inbox.tsx` (1 line — drop redundant subtitle)
