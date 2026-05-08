## Goal
Polish the City Switcher popover so the whole pill (map icon + city name + chevron) is one clickable trigger, and hide the visible scrollbar in the cities list while keeping it scrollable.

## Changes (single file: `src/components/rent-city/CitySwitcher.tsx`)

1. **Unified clickable trigger**
   - The trigger is already a single `<button>` wrapping the map pin icon, city name, and chevron — so clicking the map icon, the city text, or the chevron all open the popover. Confirm this stays true for both `compact` and `heading` variants by ensuring the icon/text/chevron live inside the same `<PopoverTrigger asChild>` button (no nested buttons or stopPropagation).
   - Add a subtle hover state on the whole pill so it visually reads as one clickable unit.

2. **Hide scrollbar but keep scrollable**
   - Add a utility class `scrollbar-hide` to the `CommandList` so the cities list scrolls vertically but the scrollbar is invisible across browsers:
     - `scrollbar-width: none` (Firefox)
     - `-ms-overflow-style: none` (IE/old Edge)
     - `&::-webkit-scrollbar { display: none }` (Chrome/Safari)
   - Apply via Tailwind arbitrary variants inline on `CommandList`, e.g. `[&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]` — no global CSS edit needed.

3. **No behavior changes** to:
   - Search input, recent cities, available list, coming soon list
   - Prefetch on hover/focus
   - Loading skeleton, error/retry state
   - Routing on select

## Out of scope
- No backend / SQL / RLS changes
- No design token changes
- No new dependencies

## QA checklist
- Click map icon → popover opens
- Click city name → popover opens
- Click chevron → popover opens
- Scroll inside cities list → works, no visible scrollbar (test Chrome + Firefox)
- Coming-soon cities still appear disabled with "Soon" badge
