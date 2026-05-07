# Redesign Filter Panel — RentCity (`/rent/:city`)

## Context (important — different file from before)

My previous redesigns targeted `src/pages/Listings.tsx` (the `/listings` page), but the filter the user is actually seeing is on `/rent/casablanca`, owned by **`src/pages/RentCity.tsx`** (lines 447–639 — the `filterPanel` JSX, plus the trigger Sheet at lines 716–734). That panel has 7 sections (Neighborhood, Rental duration, Price range, Bike type, Engine/Fuel, License, Features) inside an `Accordion`, with a sticky footer that splits Clear all / count / Apply across two rows.

I confirmed this by opening the preview at `/listings`, clicking Filters, getting redirected to `/rent/casablanca`, and seeing the screenshot match `RentCity.filterPanel`.

## Problems to fix

1. **Visible scrollbar** — `[scrollbar-width:thin]` on the scroll container shows the bar; user wants it hidden.
2. **No visual separation** between sections — all accordion items look identical and visually flat.
3. **Targets too small** — pills (`px-3 py-1.5 text-xs`) and radio rows are cramped.
4. **Footer wastes a row** — Clear all + count are on one line, Apply button on a second line. User wants them all on one line.
5. **Clear all is abrupt** — no animation/feedback.
6. **Mobile sheet uses `side="left"` and width 320px** — feels like a desktop sidebar, not a mobile-native bottom sheet.

## Plan

### A. New file: `src/components/rent-city/FiltersPanel.tsx`

Extract the panel from `RentCity.tsx` (it's ~190 lines inline) into a reusable component that takes all state + setters as props. Same logic, redesigned UI.

### B. Color-coded section cards (replace flat accordion)

Each filter section becomes a self-contained tinted card with an icon chip and title. Sections stay collapsible but the trigger sits inside the card.

| Section          | Tone            | Icon            |
|------------------|-----------------|-----------------|
| Neighborhood     | primary (lime)  | `MapPin`        |
| Rental duration  | sky             | `Clock`         |
| Price range      | amber           | `Banknote`      |
| Bike type        | violet          | `Bike`          |
| Engine / Fuel    | rose            | `Fuel`          |
| License          | indigo          | `IdCard`        |
| Features         | teal            | `Sparkles`      |

Card tokens: `rounded-2xl p-4 ring-1 ring-inset bg-{hue}/[0.06] ring-{hue}/20`. Icon chip: `h-9 w-9 rounded-xl bg-{hue}/15 text-{hue-fg}`. Title: `text-[15px] font-semibold`.

Each card replaces an `AccordionItem`; expand/collapse uses Radix Collapsible (or keep Accordion but hide the underline border — the card edges become the separators).

### C. Bigger, easier targets

- Duration pills: `h-10 px-4 text-sm rounded-full gap-2` (up from `py-1.5 text-xs`).
- Bike type / License / Features rows: convert from `Checkbox + Label` text rows into **chip toggles** (`h-10 px-4 rounded-full border`) with icon when relevant. Selected: `bg-foreground text-background border-foreground shadow-sm`.
- Neighborhood radio list: keep list layout (it's long), but each row becomes `h-11 px-3 rounded-xl hover:bg-muted/60` with the count badge as a soft pill on the right.
- Engine/Fuel: 3-up segmented control (`grid grid-cols-3 gap-2`, each option a `h-11 rounded-xl border` with icon).

### D. Hidden scroll + edge fade

- Scroll container: `overflow-y-auto overscroll-contain scrollbar-hide [&::-webkit-scrollbar]:hidden` (drop `[scrollbar-width:thin]`).
- Add `mask-image: linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)` so content fades behind sticky header/footer.

### E. Single-row sticky action bar

Replace the 2-row footer with one row:

```text
[ 3 active ]   Clear all                      Apply 3 filters →
```

- Layout: `flex items-center gap-3 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.
- Left: count pill `h-8 px-3 rounded-full bg-muted text-foreground text-xs font-semibold` — only when count > 0.
- Middle: ghost "Clear all" — only when count > 0; `active:scale-95 transition-transform` for smooth feedback.
- Right: primary CTA `ml-auto h-12 rounded-full px-6 font-semibold` showing `Apply N filters` (or `Show {filtered.length} bikes` when count = 0). Includes `ArrowRight` icon.

### F. Smooth Clear all

- Wrap the panel body in a `key={resetKey}` div; `clearAll()` bumps `resetKey` → `animate-fade-in` re-runs.
- Toast: `toast.success("Filters cleared")`.

### G. Mobile sheet polish

In `RentCity.tsx` at the trigger:
- Change `side="left"` to **`side="bottom"`** with `h-[88dvh] rounded-t-[28px] p-0`.
- Add a grab handle at the top, lighter title (`text-lg font-semibold`), close button as a rounded muted icon button.
- Desktop sidebar usage of `filterPanel` (if present elsewhere on the page) keeps the same component but rendered inline — the visual treatment works in both contexts.

## Files to change

- **New**: `src/components/rent-city/FiltersPanel.tsx` — redesigned panel + section cards.
- **Edited**: `src/pages/RentCity.tsx` — remove inline `filterPanel`, import `<FiltersPanel ... />`, update the mobile Sheet to `side="bottom"`, drop the old footer markup.

## Out of scope

- Changing what each filter does (the underlying filter logic is correct).
- Backend / data shape.
- Desktop sidebar layout if it exists elsewhere — visuals will improve automatically since the panel is shared.
