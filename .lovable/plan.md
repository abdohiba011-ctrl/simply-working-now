## Three small fixes — date picker only

### 1. Date picker fills the available width (mobile + desktop)

**Root cause:** The calendar table uses fixed cell widths (`w-9` / `sm:w-8` = 36px / 32px). On mobile, 7 cells × 36px = 252px sits left-aligned inside the full-width sheet, leaving a big white gap on the right. On desktop, the popover container is 640px but two months × ~252px each = ~504px, so extra space on the right.

**Fix in `src/components/ui/calendar.tsx`:**
- Make the calendar table stretch to its container: change `table` to `w-full border-collapse table-fixed`, change `head_row` and `row` from `flex` to plain table rows, use `head_cell`/`cell` as actual `<td>`-style flex children with `flex-1` widths instead of fixed `w-9`/`w-8`.
- Concretely: replace `head_cell` width with `flex-1 min-w-0` and `cell` with `flex-1 aspect-square`. The day button inside (`day`) becomes `h-full w-full` so the hit area still grows with the cell.
- Result: cells naturally expand on mobile (full sheet width) and on desktop (each month fills its half of the panel). Today/selected ring stays a circle because `aspect-square` keeps cells square.

**Fix in `src/components/BookingDatePicker.tsx`:**
- Desktop: drop the fixed 640px popover width — set the panel to `w-auto` and let it size to its content, or keep a max but use `min(560, viewport-16)`. Recompute `left` using the actual measured panel width after mount so it never has trailing whitespace.
- Mobile sheet: the inner `<div className="flex-1 overflow-y-auto px-2 pb-3">` adds 8px side padding — keep it minimal (`px-2`) but ensure the calendar inside uses `w-full` so it fills the sheet edge-to-edge minus that 8px.

### 2. Reverse date selection works (click later date first, then earlier)

**Current behavior in `BookingDatePicker.tsx` `handleSelect`:** when focus is `"to"` and the clicked date is before `prev.from`, it discards the original pickup and starts over. User wants it to swap.

**Fix:** rewrite the focus-`"to"` branch so that whenever a `prev.from` exists and the user clicks any second date, the range is normalized:
```
const a = prev.from, b = clicked;
const range = isBefore(b, a) ? { from: b, to: a } : { from: a, to: b };
setRange(range); // then auto-close after 280ms (existing behavior)
```
Also when focus is `"from"` and a `prev.to` exists, apply the same normalization instead of clearing `to`. Net effect: clicking any two dates in any order produces a valid range; focus-jump from Pickup → Return still works for the empty-state flow.

### 3. Hide the floating "scroll to top" arrow on bike details pages

In `src/components/ScrollToTopButton.tsx`, the `isLongPage` check includes `location.pathname.startsWith('/bike/')`. Remove that clause so the arrow no longer appears on `/bike/:id`. All other pages (`/`, `/listings`, etc.) keep it.

### Out of scope (untouched)
Search bar layout, bike cards, sticky mobile booking bar, availability badge, URL-param persistence, all other Phase 1 work.
