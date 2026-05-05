## Three fixes for the renter side

### 1. Bug: "0 bikes" on the detail page

**What I need from you first.** I couldn't reproduce a "0 bikes" string from the data alone — the city has 8 approved bikes, each with a `bikes_public` row, and `useBike()` resolves them by slug. I'll start by reproducing in the browser tool: navigate to `/rent/casablanca`, click each card, and capture exactly which element shows `0` (and on which bike). Three plausible culprits:

- **Pricing tier 0**: `tiers[0].daily_price_mad` reads as `0` for a bike that has no tiers configured → "From 0 MAD" appears in the price block.
- **Helmets count 0**: `helmetsCount = 0` may render an empty "What's included" line as "0 helmets" instead of hiding it.
- **Days = 0** before a date is picked: total displays as "0 MAD" until dates are chosen.

After I reproduce, I'll fix the specific render path so the number either hides or shows a sensible fallback (e.g., fall back to `bike_type.daily_price` when no tiers exist, hide the helmet line when 0, hide totals when `days === 0`).

### 2. Remove emojis from all renter-facing pages

Confirmed emoji locations on renter surfaces:

| File | Line | Emoji |
|------|------|-------|
| `src/pages/RentCity.tsx` | 828 | 🛵 (city-not-found illustration) |
| `src/pages/BikeDetails.tsx` | 744 | ⚡ "Confirm in 60 seconds" |
| `src/pages/BikeDetails.tsx` | 893 | 🪖 helmet icon |
| `src/pages/BikeDetails.tsx` | 991 | ✓ Available |
| `src/pages/BikeDetails.tsx` | 994 | ⚠ Unavailable |

Replace each with a `lucide-react` icon (`Zap`, `HardHat` / shield, `Check`, `AlertTriangle`) sized and colored to match. I'll also sweep `src/pages/Index.tsx`, `src/pages/Favorites.tsx`, `src/pages/Bookings*`, `src/components/BikeCard.tsx`, the renter header/footer, and checkout for any remaining emojis and convert them the same way.

**Excluded (kept as-is):**
- The bike `description` field (free text written by the agency).
- Agency dashboard pages (`src/pages/agency/*`, `src/components/agency/*`).
- Admin pages (`src/pages/admin/*`, `src/components/admin/*`).

### 3. Price range slider — clearer two-handle behavior

You skipped the question, so I'll go with the lighter option that keeps the existing histogram intact:

- Keep the single Radix two-handle slider (left = min, right = max — both already independently draggable).
- Add small floating labels above each thumb: `Min · 80 MAD` on the left thumb, `Max · 450+ MAD` on the right thumb, so it's visually obvious there are two handles.
- Show the value in a tooltip-style chip while dragging (fades out 1s after release).
- Keep the Minimum / Maximum number inputs below as the precise entry path.

If you actually wanted **two separate sliders stacked** instead, tell me and I'll swap the approach — but the labeled-handles version preserves the histogram-as-context UX, which is the part that makes it feel like Airbnb.

---

### Technical notes

- `BikeDetails.tsx` ref warning in console (`BikeCard` is a function component being given a ref) — I'll wrap `BikeCard` in `React.forwardRef` while I'm in the file. Unrelated to the bug but cheap to fix.
- No DB or RLS changes. No new migrations.
- No changes to agency or admin UI.

### Files I expect to touch

- `src/pages/BikeDetails.tsx` (bug fix + emoji removal)
- `src/pages/RentCity.tsx` (emoji removal)
- `src/components/BikeCard.tsx` (forwardRef + any emoji)
- `src/components/filters/PriceRangeFilter.tsx` (handle labels + drag tooltip)
- Possibly `src/pages/Index.tsx`, `Favorites.tsx`, renter header/footer if the sweep finds more emojis.
