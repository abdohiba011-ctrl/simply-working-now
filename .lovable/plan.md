## Goal

Match the spec layout exactly:

```
Price range
Per day · MAD
[ subtle histogram ]
[min handle]====selected range====[max handle]
Minimum  [ 80 MAD ]
Maximum  [ 450+ MAD ]
```

The current `PriceRangeFilter` already renders all of these pieces, but it duplicates "Price range" (the accordion trigger in `RentCity.tsx` already says "Price range", and the component renders it again right below), and the `+` suffix on the Maximum input has a fragile focus handler that mutates `e.target.value` directly (React/controlled-input footgun).

## Changes

### 1. `src/components/filters/PriceRangeFilter.tsx`

- Remove the inner `Price range` title — the parent (accordion trigger or section heading) owns it.
- Keep the small `subtitle` line (defaults to `Per day · MAD`).
- Replace the focus-mutation trick on the Max input with a proper controlled display: show `${maxInput}+` in the input value when `value[1] >= max`, strip the `+` in the `onChange` regex (already filters non-digits anyway), so editing just works.
- Default `subtitle` from `"Per day, includes all fees"` → `"Per day · MAD"` to match the spec.

### 2. `src/pages/RentCity.tsx`

- Pass `subtitle="Per day · MAD"` (or rely on new default) — drop the redundant `currency="MAD"` text duplication. No structural change to the accordion.

## Out of scope

- No change to the histogram math, slider behavior, bucket count, sqrt scaling, or the `pricesForHistogram` memo in RentCity.
- No new props, no API change for callers other than the (optional) subtitle text.

## Files

- edit `src/components/filters/PriceRangeFilter.tsx` (~10 lines)
- edit `src/pages/RentCity.tsx` (1 line, subtitle prop)
