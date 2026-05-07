# Desktop Filter Bar Redesign — Listings page

Scope: only the **desktop (lg+) filter bar** on `src/pages/Listings.tsx` (lines 410–468). Mobile/tablet bottom-sheet stays as-is.

## Issues today

1. Location pill row scrolls horizontally and the **scrollbar is visible** while scrolling.
2. Layout is flat: back button + title row, then pills row, then date+sort row — no clear hierarchy, weak hover states, inconsistent radii, no active-filter feedback, no clear-all.

## What to build

### 1. Hide horizontal scrollbar (functional fix)

The `.scrollbar-hide` class is already applied on the pill row but the scrollbar still shows. Confirm the global utility exists in `src/index.css`; if not, add:

```css
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

Also add subtle **edge fade masks** (left/right gradient) so users sense more content off-screen, plus left/right chevron buttons that appear on hover and scroll the row by ~240px.

### 2. Restructure the desktop bar into one cohesive card

Replace the 3 stacked rows with a single elevated **toolbar card** inside the sticky container:

```text
┌───────────────────────────────────────────────────────────────────────┐
│  ← Back     [📍 Location ▼]  [📅 Dates ▼]  [⇅ Sort ▼]      3 active  │
│             ─────────────────────────────────────────────  Clear all  │
│  ‹  [Anfa] [Maârif] [Gauthier] [Aïn Diab] [Bourgogne] …          ›   │
└───────────────────────────────────────────────────────────────────────┘
```

- Wrapper: `rounded-2xl border border-border bg-card shadow-sm` with `p-2` inside the sticky band.
- Top row = three **filter trigger chips** (Location / Dates / Sort), each shows the current value as a secondary label (e.g. "Location · Anfa"). Active chips get `bg-primary/10 border-primary text-foreground`, inactive get `bg-background hover:bg-muted hover:border-foreground/30`. All `rounded-full h-10`.
- Right side: active-filter count badge + **Clear all** ghost link (only when ≥1 filter active).
- Bottom row = the neighborhood pill rail (existing behavior), now with hidden scrollbar, edge fade, and hover chevrons.

### 3. Pill polish

- `rounded-full px-4 h-9` consistent.
- Selected: `bg-foreground text-background` (keep) + subtle `shadow-sm`.
- Unselected: `bg-muted/40 border-transparent hover:bg-muted hover:border-border` — softer than current border-on-default look.
- Hover lifts with `transition-all` + `-translate-y-0.5` micro-interaction.
- Add `aria-pressed` for a11y.

### 4. Date & Sort moved into popovers

Instead of always-visible inputs, both open as `Popover` panels anchored to their chip:

- **Dates** popover: contains the existing `BookingDatePicker`, shows formatted range on the chip (`Mar 12 – Mar 16`), with a small "Clear" button inside.
- **Sort** popover: list of 4 options as the same styled radio buttons used in the mobile sheet (consistency), with a check on the active one.

Both popovers use shadcn `Popover` with `rounded-xl border-border shadow-lg p-3 w-[320px]`, animate-in fade+slide.

### 5. Active-state summary + Clear all

- Compute `activeCount = (selectedTab !== defaultTab) + !!dateRange + (sortBy !== 'recommended')`.
- Show small `Badge` with count when > 0.
- "Clear all" resets all three; uses `text-muted-foreground hover:text-foreground` ghost button.

### 6. RTL & i18n

- All chevrons flip with `isRTL && rotate-180` (already pattern in file).
- No hardcoded strings — reuse existing `t("listings.*")` keys; add `listings.clearAll`, `listings.location`, `listings.dates` if missing in `src/i18n/locales/{en,fr,ar}.json`.

## Files to change

- `src/pages/Listings.tsx` — replace lines 410–468 (desktop bar block) only.
- `src/index.css` — add `.scrollbar-hide` utility if not already present.
- `src/i18n/locales/en.json`, `fr.json`, `ar.json` — add any missing keys.

## Out of scope

- Mobile/tablet bottom sheet (already done last turn).
- Grid/card layout below.
- Backend / data filtering logic — purely presentational.  
  
  
  
NOT ONLY DESKTOP ALL DEVICES NEEDS TO HAVE SAME UI AND UX 
- &nbsp;