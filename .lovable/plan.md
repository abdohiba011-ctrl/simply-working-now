## Cash Plus Waiting Room — Improved UX

Rewrite the Cash Plus waiting screen in `src/pages/BookingConfirmed.tsx` (the `if (isCashplus && phase === "waiting")` block, lines ~242–410) to give users full clarity on what to do, what to expect, and how to get help. Polling, auto-confirm, and the success/messages flow already work — we are only improving the waiting screen content and adding a support block. No backend changes.

### What the new screen will contain (top → bottom)

1. **Hero** — keep the green icon + headline, but rewrite subcopy:
   "Your booking is reserved. To confirm it, take the reference below to any **Cash Plus** agency in Morocco and pay **60 MAD in cash**. As soon as Cash Plus reports the payment to us, we'll confirm your bike automatically — you don't need to come back to this page."

2. **Reference card** (kept) — big code, Copy button, 60 MAD amount, "Expires in 72 hours" *(see note below on 24h vs 72h)*, WhatsApp share, "Find nearest agency" button.

3. **NEW — How to pay (4 steps, clearer wording)**
   1. Walk into any Cash Plus agency (over 2,500 across Morocco).
   2. Show the reference `XXXXXXXX` to the agent and say it's for "Motonita / YouCan Pay".
   3. Pay **60 MAD in cash**. Keep your receipt.
   4. Wait for our confirmation — usually **1 to 60 minutes** after the agent processes your payment.

4. **NEW — Important to know (callout card, amber/info style)**
   - Cash Plus agencies are usually **closed on Sundays** and may have reduced hours on public holidays. Plan accordingly.
   - Your reference is valid for **72 hours**. After that, the booking is automatically cancelled and you'll need to start over.
   - We confirm bookings **automatically**. The delay between paying at the agency and seeing confirmation depends on Cash Plus's system — usually a few minutes, sometimes up to an hour.
   - Once paid, you can safely close this page. We'll email you the moment it's confirmed, and you'll be able to message the agency from your bookings.

5. **Status pill** (kept) — "Waiting for payment at Cash Plus" with spinner.

6. **NEW — Support card (only show after payment, not before)**
   Heading: **"Already paid? Need help?"**
   Subcopy: *"If you've paid at Cash Plus and nothing happened after 1 hour, contact us. Please don't call before paying — it slows us down for users who actually need help."*
   Three actions side-by-side (stack on mobile):
   - **WhatsApp** button → `https://wa.me/212710564476` (uses existing `WhatsAppIcon`)
   - **Call us** button → `tel:+212710564476`, label shows the number `+212 710 564 476`
   - **Email** button → `mailto:support@motonita.ma?subject=Cash Plus payment — <REF>&body=…` (prefills the booking ref)

7. **Booking summary** (kept, compact, at the bottom).

### What does NOT change

- The polling loop, `payment_status` checks, and the auto-transition from `waiting` → `confirmed` are already wired. Once Cash Plus reports the payment via the YouCan Pay webhook, the page swaps to the existing confirmed view and the "Message agency" button appears — exactly the same flow as card payments.
- No edge function, RLS, or database changes.
- No translation work — file is currently English-only and the rest of the screen matches.

### Open question — expiry window

The current backend keeps Cash Plus drafts alive for **72 hours** (matches `BookingHistory` 72h draft expiry). You mentioned "I think 24 hours is the maximum." Two options:

- **A (recommended, no backend change):** keep showing "72 hours" — matches how the system actually behaves today.
- **B:** change copy to "24 hours" and later reduce the backend expiry to 24h in a follow-up.

I'll go with **A** unless you say otherwise when approving.

### Files to edit

- `src/pages/BookingConfirmed.tsx` — replace the Cash Plus waiting JSX block (~lines 242–410) and add `Phone`, `Mail` imports from `lucide-react` plus `WhatsAppIcon` import.

That's it — single file, presentation-only change.