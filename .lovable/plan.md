## Goal

Replace the current minimal price slider on `/rent/:city` with an Airbnb-style price range filter: a histogram of bike prices in the current city sitting behind a two-handle range slider, with editable Min/Max number inputs underneath.

## Reference

Airbnb pattern (from your screenshot):
- Title "Price range" + subtitle
- Bar histogram (one bar per price bucket) showing distribution
- Two-handle slider overlaid on the histogram
- Two pill inputs below: "Minimum" / "Maximum" (max shows `1300+` when at the cap)
- Bars inside the selected range are highlighted (brand green for us); bars outside are muted

## Scope

Only the Price filter inside the existing `Filters` accordion in `src/pages/RentCity.tsx`. No changes to the bike query, no changes to other filters.

## Design (Motonita tokens)

```text
Price range
Per day, MAD

[muted bar][muted bar][green bar][green bar][green bar][muted bar]   <- histogram (~30 buckets)
o━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━o              <- range slider

  Minimum                                       Maximum
  [  260  ] MAD                                 [ 1000+ ] MAD
```

- Bars: `bg-muted` outside range, `bg-primary` inside range, `rounded-sm`, `gap-px`
- Histogram height: 56px on desktop, 48px on mobile
- Min/Max inputs: `rounded-full border border-border px-3 py-2`, numeric, debounced
- "1000+" suffix only when the max handle is at the upper bound AND there are bikes priced above (already covered by bucketing the top bin as "and above")

## Build steps

1. **New component** `src/components/filters/PriceRangeFilter.tsx`
   - Props: `prices: number[]` (raw daily_price list), `value: [number, number]`, `onChange`, `bounds: [number, number]`
   - Computes ~30 equal-width buckets between `bounds[0]` and `bounds[1]`; the last bucket is open-ended ("and above")
   - Renders bars normalized to max bucket count (`Math.sqrt` scaling so a few outliers don't flatten the chart, same as Airbnb)
   - Renders the existing shadcn `Slider` (range mode) absolutely positioned over the bars
   - Renders two number inputs; clamps and snaps to slider step on blur/Enter

2. **Wire into `RentCity.tsx`**
   - Replace the current `<Slider>` block (lines ~478–488) with `<PriceRangeFilter prices={...} value={priceRange} onChange={setPriceRange} bounds={priceBounds} />`
   - Pass the unfiltered-by-price bike prices so the histogram doesn't collapse as the user drags (Airbnb behavior). Compute via `useMemo` from `bikes` after applying every filter EXCEPT price.

3. **Polish**
   - When `priceRange` equals `priceBounds`, no URL params written (already implemented)
   - Active filter count already correct
   - RTL: flip histogram and slider with `dir`-aware flex-row-reverse (Arabic users)

## Files

- create `src/components/filters/PriceRangeFilter.tsx` (~120 lines)
- edit `src/pages/RentCity.tsx` — swap the slider, add `pricesForHistogram` memo (~20 lines net)

## Out of scope

- Server-side price aggregation (city has ≤ a few hundred bikes, client-side bucketing is fine)
- Histogram on `/` homepage search (different UX)
- Animating bar heights
