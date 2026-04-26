## Goal
Replace the rough hand-drawn silhouette in the "Cities Available" section with an accurate Morocco map (with regional borders), add a two-click interaction (1st click reveals city tooltip with a chevron arrow → 2nd click navigates to `/rent/{slug}`), fix the missing translation keys (currently rendering as raw `cities.availableTitle`), and polish the section visually to match the reference image.

## 1. Use a real Morocco map (with region borders)
- In `src/components/CitiesAvailableSection.tsx`, replace the single hand-drawn `<path>` silhouette with an inline GeoJSON of Morocco's 12 administrative regions, embedded as a constant in the file. Each region renders as its own SVG `<path>` projected through the existing `project(lat, lng)` function (so dot positions stay aligned).
- No new npm dependencies, no external network fetch — the GeoJSON is bundled in the component so it's instant and offline-safe.
- Region styling: `fill = background/15`, `stroke = background/35`, thin `strokeWidth = 1` between regions so it reads like a real country map (matches uploaded reference image #2).
- Keep the existing `viewBox` so the section's layout doesn't shift.

## 2. Two-step click interaction
Replace the always-on tooltip with explicit selection state:
- New state: `selectedCity: string | null` (separate from `hoveredCity`).
- 1st click on a dot → set `selectedCity` → show a tooltip pill with the city name **and a `ChevronRight` icon** (matching the reference). The dot enlarges and pulses in primary green.
- 2nd click on the **same** dot, OR a click on the tooltip pill itself → `navigate(/rent/{slug})`.
- Click on a different dot → switches selection to that new city (becomes its 1st click).
- Click on the map background or anywhere outside a dot → clears selection.
- Keyboard accessible: each dot is a `<g role="button" tabIndex={0}>`, Enter/Space follows the same two-step rule. Selected dot has `aria-pressed="true"`.
- Small helper text appears under the tooltip on first tap: "Tap again to view rentals" — disappears once the user navigates or selects another city.

## 3. Add the missing translations
Currently the UI shows raw keys (`cities.availableTitle`, `cities.availableSubtitle`) because i18next returns the key when missing and the `||` fallback never fires. Add these keys to `src/locales/en.json`, `fr.json`, `ar.json`:
- `cities.availableTitle` — EN "We reach you everywhere!" / FR "Nous vous rejoignons partout !" / AR "نصل إليك في كل مكان!"
- `cities.availableSubtitle` — EN "Available across Morocco's major cities — from Casablanca to Rabat, Marrakech and beyond." (+ FR/AR)
- `cities.coverageQuestion` — EN "Does our service cover your city?" (+ FR/AR)
- `cities.checkNow` — EN "Check now" / FR "Vérifier" / AR "تحقق الآن"
- `cities.tapAgainHint` — EN "Tap again to view rentals" (+ FR/AR)
- `cities.suggestCity` — EN "Suggest a city" (+ FR/AR)

## 4. Visual polish (matches reference)
- Heading scales up on desktop: `text-3xl md:text-4xl lg:text-5xl` with tight tracking.
- Subtle dot-grid background pattern behind the map at very low opacity for depth on the dark section.
- Tooltip pill: white background, rounded-full, soft shadow, city name + `ChevronRight` lucide icon (rotated 180° in RTL), positioned just above the active dot.
- Active dot: brand primary `#9FE870`, with an animated pulsing ring + a thin white inner ring. Non-selected dots are smaller, white, and dimmer.
- Section padding bumped on desktop (`py-24 lg:py-28`).
- Add a small legend row of city name chips below the map (clickable as an alternate selection path) — useful on mobile where tapping tiny dots is fiddly.
- "Check now" CTA stays and routes to `/agencies`. Add a secondary ghost link "Suggest a city" → routes to `/contact`.

## 5. Mobile / RTL
- On `<sm` screens the map scales down responsively. Each dot gets an invisible 18px hit-area circle on top of the 5–7px visible dot so taps are reliable at the 375px minimum breakpoint.
- RTL: tooltip chevron and CTA chevron are rotated; legend chips wrap right-to-left via flex; tooltip always anchors above the dot regardless of direction.

## Files touched
- `src/components/CitiesAvailableSection.tsx` — main rewrite (inline GeoJSON regions, two-step click, polished tooltip, legend, larger hit areas).
- `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ar.json` — add the 6 keys above.

## Out of scope
- No new npm packages (no Leaflet, no react-simple-maps) — kept as a self-contained inline SVG for performance.
- Coordinate table (`CITY_COORDS`) and the data source (`service_cities` where `is_available = true`) stay as they are.