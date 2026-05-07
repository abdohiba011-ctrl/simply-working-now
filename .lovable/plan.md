# Filter Sheet Redesign — Listings (all devices)

Scope: the **bottom-sheet filter UI** in `src/pages/Listings.tsx` (the `<SheetContent>` block, ~lines 319–414). One sheet covers mobile / tablet / desktop, so a single redesign solves all viewports.

## Problems today

1. The sheet body still shows a visible scrollbar while scrolling.
2. All sections look the same — no visual separation between Where / When / Sort, hard to scan.
3. Tap targets are small (px-4 py-2 pills, py-3 sort rows).
4. Footer is a 2-column grid with Clear/Apply, and the active count badge sits up in the trigger button — disconnected.
5. "Clear all" is abrupt — no smooth transition.

## What we'll build

### 1. Hidden scroll, fully

- Scroll container gets `scrollbar-hide overscroll-contain [&::-webkit-scrollbar]:hidden` plus `scrollbar-width: none` via the existing global utility.
- Add `mask-image: linear-gradient(...)` top + bottom fade so content gracefully fades behind sticky header/footer instead of showing a hard cut.
- Verify no inner element re-introduces overflow.

### 2. Color-coded section cards (clear visual separation)

Each filter group becomes a self-contained card with a tinted background, colored icon chip, and section title. Tints stay subtle so they read as separators, not decoration.

```text
┌─────────────────────────────────┐
│ 🟢  Where                       │  bg-primary/8        ring-primary/15
│   [Anfa] [Maârif] [Gauthier]…   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 🔵  When                        │  bg-sky-500/8        ring-sky-500/15
│   [date picker]                 │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 🟣  Sort by                     │  bg-violet-500/8     ring-violet-500/15
│   ◉ Recommended       ✓        │
│   ○ Price: low → high           │
└─────────────────────────────────┘
```

Card tokens:
- `rounded-2xl p-5 ring-1 ring-inset` with the hue ring above.
- Icon chip: `h-9 w-9 rounded-xl flex items-center justify-center` matching hue at /15.
- Section title: `text-[15px] font-semibold` next to the chip, with a muted helper line under it ("Choose neighborhood", "Pick rental dates", "How to order results").

### 3. Bigger, easier targets

- Location pills: `h-11 px-5 text-[15px] rounded-full gap-2.5`, hover lift `hover:-translate-y-px hover:shadow-sm`. Selected: `bg-foreground text-background shadow-sm`.
- Sort options: full-width rows `h-14 rounded-2xl px-5` with a left radio dot, label, and right `Check` icon when active. Active row: `bg-primary/10 border-primary ring-1 ring-primary/30`.
- Date picker stays embedded but inside a clean white card (no nested border noise).

### 4. Single-row sticky action bar

Replace the 2-column footer with a 3-zone bar so count + clear + apply share one line:

```text
[ 3 active ]   Clear all                    Show 24 results  →
```

- Layout: `flex items-center gap-3 justify-between border-t border-border bg-background/95 backdrop-blur px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.
- **Left**: count pill `h-8 px-3 rounded-full bg-muted text-foreground text-xs font-semibold` — only when count > 0, with `transition-all`.
- **Middle**: ghost "Clear all" — `text-muted-foreground hover:text-foreground` — only when count > 0.
- **Right**: primary CTA "Show {N} results" — `flex-1 max-w-[55%] h-12 rounded-full font-semibold` with arrow icon. Always present.
- Remove the count badge from the trigger button (it now lives in the bar).

### 5. Smooth Clear all

- Reset wrapped in a tiny stagger: bump a `resetKey` state on the scroll container so children fade-in (`animate-fade-in`) on reset.
- Toast confirmation `t("listings.cleared") || "Filters cleared"`.
- Clear button itself: `transition-opacity` + `active:scale-95`.

### 6. Header polish

- Title `text-lg font-semibold` (lighter than current `text-xl font-bold`).
- Add a top grab handle on mobile only: `h-1.5 w-12 rounded-full bg-muted-foreground/30 mx-auto mt-2`.
- Close button stays top-right.

### 7. Component split (architecture)

`Listings.tsx` is already long. Extract the sheet into:
- `src/components/listings/FilterSheet.tsx` — owns the `<Sheet>`, sections, and action bar; receives state + setters via props.

`Listings.tsx` keeps the trigger button (without the count badge) and renders `<FilterSheet ... />`.

## Files to change

- `src/pages/Listings.tsx` — replace lines 303–415 (Sheet block); drop the badge in the trigger.
- `src/components/listings/FilterSheet.tsx` — new file containing the redesigned sheet.

## Out of scope

- Desktop top toolbar (already redone with chip-popovers in a previous turn).
- Adding **Rental duration** or **Price range** as new filters — they were used as examples by the user but require schema/query work; happy to plan separately if wanted.
- i18n strings: reuse existing keys (`home.where`, `home.when`, `listings.sortBy`, `listings.clearAll`, `listings.applyFilters`, `listings.filtersTitle`); add `listings.cleared` only if missing.
