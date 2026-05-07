## Problem

On the renter checkout page (`src/pages/CheckoutDraft.tsx`), selecting **Debit or Credit Card** renders a compact YouCan Pay form that fits the mobile column. Selecting **Cash Plus** swaps in a wider widget (gateway header banner + Cash Plus storefront illustration) injected by YouCan Pay's `ycpay.js` into `#ycpay-form`. That iframe/illustration is wider than the mobile column, so it pushes the whole card past the viewport width — causing horizontal scroll, clipped text ("ooking fee", "atform fee", "onfirmation fee"), and a misaligned page (visible in the uploaded screenshot).

Card payment looks fine because that variant fits inside the column; only Cash Plus overflows.

## Root cause

The container that hosts the YouCan Pay widget has no width containment:

```tsx
<div
  id="ycpay-form"
  className="min-h-[180px] rounded-lg border border-border p-3 bg-muted/30"
/>
```

Combined with the parent `<Card>` and the two-column grid, when YouCan Pay injects a wider DOM subtree (Cash Plus illustration), it stretches the column and pushes the rest of the page sideways on mobile.

## Fix (frontend / CSS only)

Edit only `src/pages/CheckoutDraft.tsx`. No changes to YouCan Pay integration, no logic changes, no other flows touched.

1. **Constrain the YouCan Pay mount node** — add `w-full max-w-full overflow-x-auto` (and `min-w-0`) so any wider injected content scrolls *inside* this box instead of expanding the page.
2. **Force injected children to respect the container width** — add a small scoped style/class so descendant `img`, `svg`, and `iframe` inside `#ycpay-form` are capped at `max-width: 100%; height: auto;`. This shrinks the Cash Plus storefront illustration to fit the mobile column gracefully, instead of pushing the layout.
3. **Add `min-w-0` to the right column wrapper** (`<div className="lg:col-span-2">`) and to the surrounding `<Card>` body so the flex/grid child can actually shrink below its intrinsic content width on mobile (standard Tailwind grid-overflow fix).
4. **Cap the Cash Plus instructions block** with `max-w-full overflow-hidden` so the green "Pay with Cash Plus" panel underneath also stays inside the column.

No changes to:
- The card-payment path (already responsive)
- YouCan Pay token/script loading
- Cash Plus detection logic, verify handler, or DB writes
- The desktop layout (changes are width-safe at `lg:` and above)

## QA after change (mobile 390px)

- Card flow: layout unchanged, no regression.
- Cash Plus flow: page no longer scrolls horizontally; "Booking fee", "Platform fee", "Confirmation fee" labels are fully visible; the Cash Plus illustration is contained (either scaled down or scrolls within its own box); the green instructions panel and "I've paid — verify now" button stay inside the column.
- Desktop: unchanged.

## Files changed

- `src/pages/CheckoutDraft.tsx` (CSS-only edits to the payment container, its parent column, and the Cash Plus instructions panel)
