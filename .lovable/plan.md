# Fix: include tablets in the bottom-sheet behavior

## What's wrong

The previous edit wired the `CitySwitcher` to a bottom sheet via `useIsMobile()`, but that hook only returns true below 768px. Tablets (768–1023px) still get the desktop popover, which contradicts the request: tablet and mobile must both open a bottom sheet, only desktop/laptop (≥1024px) keeps the popover.

The request also covers the date picker — `BookingDatePicker` uses the same `useIsMobile` hook, so it has the same gap on tablet today.

## Change

Switch both `CitySwitcher` and `BookingDatePicker` from `useIsMobile()` (768px breakpoint) to a slightly broader "is touch / not desktop" check at the `lg` breakpoint (1024px), matching the existing Filters sheet (which uses `lg:hidden`).

Smallest-impact approach: introduce a tiny new hook `useIsBelowLg()` in `src/hooks/use-mobile.tsx` (matchMedia `(max-width: 1023px)`) and use it in both components. Keep `useIsMobile` untouched so other call sites are unaffected.

## Files

1. `src/hooks/use-mobile.tsx` — add `useIsBelowLg` hook (mirrors `useIsMobile` with breakpoint 1024).
2. `src/components/rent-city/CitySwitcher.tsx` — replace `useIsMobile` import/usage with `useIsBelowLg`.
3. `src/components/BookingDatePicker.tsx` — replace `useIsMobile` import/usage with `useIsBelowLg` so the date picker also opens as a bottom sheet on tablet.

## Verification

After the edit, re-test in the browser at 390px (mobile — bottom sheet), 820px (tablet — bottom sheet), and 1366px (desktop — popover) for both the city pill and the dates pill.
