## Problems

### Bug 1 — Duplicate primary image on renter side
On `BikeDetails.tsx` (renter), the gallery is built by **prepending** `main_image_url` and then **appending all rows** from `bike_type_images`:

```ts
// src/pages/BikeDetails.tsx, lines 153-158
const main = getBikeImageUrl(bike.bike_type.main_image_url);
const extras = (detailImages || []).map((d) => d.image_url);
return [main, ...extras];
```

But in our upload flow (`MotorbikeImageManager.tsx`), every uploaded image — including the one chosen as primary — is also stored as a row in `bike_type_images`. So the primary image appears twice: once from `main_image_url`, once from the matching `bike_type_images` row.

The agency-side `MotorbikeDetail.tsx` (lines 110-122) handles this correctly: it removes the matching row and re-inserts the primary at index 0. The renter page is missing this dedup.

### Bug 2 — Cramped action buttons on hover
In `MotorbikeImageManager.tsx` (lines 419-449), the hover bar shows up to 3 buttons (Primary, Replace, Delete) inside a small thumbnail. At the grid's narrow column widths (`md:grid-cols-4`), the buttons overflow horizontally and get visually crushed (as in the screenshot). Labels add to the problem.

## Fixes

### Fix 1 — Dedup gallery on renter page
In `src/pages/BikeDetails.tsx` `allImages` useMemo:
- Filter `extras` to drop any URL equal to `main`
- Keep main as the first image

```ts
const allImages = useMemo(() => {
  if (!bike?.bike_type) return [];
  const main = getBikeImageUrl(bike.bike_type.main_image_url);
  const extras = (detailImages || [])
    .map((d: any) => d.image_url)
    .filter((u): u is string => !!u && u !== main);
  return main ? [main, ...extras] : extras;
}, [bike, detailImages]);
```

This is the same dedup pattern used by the agency page.

### Fix 2 — Make hover buttons fit cleanly
Rework the hover action bar in `MotorbikeImageManager.tsx`:

- Switch to **icon-only square buttons** (h-8 w-8) for a uniform compact row that always fits, even at small thumbnail widths.
- Keep accessible labels via `title` / `aria-label` (tooltip on hover).
- Add `flex-wrap` as a safety net for very narrow widths.
- Slightly increase action-bar padding (`p-1.5`) and use `gap-1.5` for breathing room.
- Always show all 3 actions (Primary stays disabled+highlighted when already primary instead of being hidden — avoids layout shift between thumbnails).

Resulting bar:
```text
[★]  [⇄]  [🗑]    ← three equal-sized icon buttons, centered
```

No other behavior changes — handlers (`setPrimary`, `replaceImage`, `deleteImage`) stay the same.

## Files to change
- `src/pages/BikeDetails.tsx` — dedup `allImages`
- `src/components/agency/MotorbikeImageManager.tsx` — icon-only action bar

## Out of scope
- No DB changes
- No changes to upload/storage logic
- Agency `MotorbikeDetail.tsx` already dedups correctly — leave alone
