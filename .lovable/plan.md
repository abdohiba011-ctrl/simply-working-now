## Goal

Replace the hand-drawn polygon approximation in `CitiesAvailableSection.tsx` with **real Morocco geometry** so the map clearly looks like Morocco (matching the reference screenshot), while preserving everything that already works: dark background, white city dots, primary-green active dot with pulse, tooltip pill, "tap again to navigate" hint, legend chips, and CTA buttons below.

## What's wrong today
- Regions are 10-vertex hand-tuned polygons → coastline looks blocky and the country outline doesn't read as Morocco.
- The screenshot the user shared (`image-34.png`) confirms this — vs. the desired look in `image-35.png` which uses the real SimpleMaps shape.

## Source of truth
- The user uploaded `ma.svg` (SimpleMaps, "Free for Commercial Use" — attribution appreciated). It contains:
  - 12 official admin regions as proper `<path d="…">` in viewBox `0 0 1000 1000` (already projected, so no manual lat/lng→pixel math needed for outlines).
  - Region IDs `MA01`–`MA12` with names (Tangier-Tetouan-Al Hoceima, Oriental, Fez-Meknes, Rabat-Salé-Kenitra, Béni Mellal-Khénifra, Casablanca-Settat, Marrakech-Safi, Drâa-Tafilalet, Souss-Massa, Guelmim-Oued Noun, Laâyoune-Sakia El Hamra, Dakhla-Oued Ed-Dahab).

## Changes

### 1) New file: `src/data/moroccoRegions.ts`
- Export `MOROCCO_VIEWBOX = { w: 1000, h: 1000 }`.
- Export `MOROCCO_REGIONS: { id: string; name: string; d: string }[]` — the 12 `<path d="…">` strings copied verbatim from `ma.svg` (one per region).
- Keep this in a data file, not inline JSX, so the component stays readable and the paths can be reused later (e.g. agency coverage view).

### 2) Update `src/components/CitiesAvailableSection.tsx`
- **Remove** the local `REGIONS` array and `MAP_BOUNDS` lat/lng bounds (no longer needed for outlines).
- **Switch the SVG viewBox** to `0 0 1000 1000` and let the existing responsive `w-full h-auto` keep it fluid. Use `preserveAspectRatio="xMidYMid meet"`.
- **Render regions** by mapping `MOROCCO_REGIONS` to `<path d={r.d} …/>` with the same fill/stroke styling already in use:
  - `fill="hsl(var(--background) / 0.10)"` (subtle white fill on dark)
  - `stroke="hsl(var(--background) / 0.35)"`, `strokeWidth="1"`
  - On hover of a region: bump fill to `0.16` (purely cosmetic — does not affect city interactivity).
- **City dot projection**: replace the existing lat/lng → SVG projector with a simple linear transform calibrated against two known SimpleMaps centroid anchors so dots land in the correct region:
  - `svgX = 968.1 + 47.34 * lng`
  - `svgY = 2279.5 - 61.00 * lat`
  - Anchors used: Tangier region (-5.83, 35.76) → (692.1, 98.1) and Dakhla region (-15.96, 23.68) → (212.6, 835). Verified that Casablanca, Marrakech, Rabat, Agadir, Fes, Oujda land inside their respective regions.
- Keep `CITY_COORDS` (lat/lng + en/fr/ar labels) as-is — only the projection function changes.
- Keep all existing UI: dot states (hover/selected, pulse ring), tooltip pill with chevron, "tap again" hint, and legend chips.
- Adjust dot/tooltip sizing for the new 1000×1000 viewBox:
  - Dot radius: `8` idle / `11` active (was 5/7) — proportional to the larger canvas.
  - Tooltip pill height `48`, font size `20`, offset `-72` from the dot — proportional bump.
  - Notch path scaled accordingly.
- Add a tiny attribution line under the chips: `Map © SimpleMaps` (small, `text-background/40`, `text-[10px]`) to honor the SimpleMaps license note ("Attribution is appreciated").

### 3) Background polish (matches reference screenshot)
- Keep the existing dot-grid background and the soft radial primary-color glow behind the country shape.
- Clip the glow gradient under the country silhouette by reusing the union of region paths inside an SVG `<clipPath id="moroccoMask">`, then drawing the glow `<rect>` with `clipPath="url(#moroccoMask)"`. This makes the green halo follow the country outline (as in the reference) instead of being a square wash.

### 4) RTL & i18n
- No new strings. Existing `cities.availableTitle`, `cities.availableSubtitle`, `cities.checkNow`, `cities.tapAgainHint`, `cities.coverageQuestion` are reused.
- Tooltip chevron continues to rotate 180° in RTL (already handled).

### 5) Performance
- Region path strings total ~30–40 KB, included once at build time as a static data module — no network fetch, no runtime parsing.
- `regionPaths` memoization can be dropped since paths are now static strings; the component re-render cost stays the same.

## Out of scope
- No change to `TopCitiesSection` (the city cards grid above).
- No change to data sources — still reads available cities from `service_cities`.
- No change to navigation: clicking a selected dot/chip/tooltip still goes to `/rent/<slug>` via `cityToSlug`.
- No new dependencies (no Leaflet, no MapLibre — pure inline SVG keeps bundle and CLS unchanged).

## Files touched
- **Add** `src/data/moroccoRegions.ts` (path data + viewBox constants).
- **Edit** `src/components/CitiesAvailableSection.tsx` (swap geometry, new projector, clipPath glow, attribution).
