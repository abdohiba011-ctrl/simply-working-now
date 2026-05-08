# Responsive CitySwitcher: popover on desktop, bottom sheet on mobile/tablet

## Goal

When the user taps the city pill (the "Casablanca, Mediouna" pill next to "Pick dates", and the heading "Casablanca" with the chevron):

- **Desktop / laptop (≥768px)**: keep the current Radix Popover anchored under the trigger.
- **Mobile / tablet (<768px)**: open a Sheet that slides up from the bottom of the screen (same pattern as the Filters sheet and BookingDatePicker mobile mode), with the same Search input + "Available now" + "Coming soon" content. Scrollbar stays hidden.

This applies to **both** uses of `CitySwitcher`:
1. `variant="compact"` — the pill in the breadcrumb row of `RentCity`.
2. `variant="heading"` — the inline city name in the H1.

Tablet uses the same bottom-sheet treatment as mobile (anything below the `md` / 768px breakpoint).

## Scope

Only one file changes: `src/components/rent-city/CitySwitcher.tsx`.

No business logic changes. No styling tokens added. No changes to `BookingDatePicker` (already responsive) or to `RentCity.tsx`.

## Implementation outline (technical)

In `src/components/rent-city/CitySwitcher.tsx`:

1. Add `const isMobile = useIsMobile()` (hook already exists at `src/hooks/use-mobile.tsx`, breakpoint 768px — covers phones and small tablets, matching the existing Filters sheet which uses `lg:hidden`; we'll align with the existing `useIsMobile` hook for consistency with `BookingDatePicker`).
2. Extract the inner content (the `<Command>` block with search, Available now, Coming soon, loading + error states) into a small `CityListPanel` sub-component so it can be rendered inside either `PopoverContent` or `SheetContent` without duplication.
3. Render conditionally:
   - If `isMobile`: render a plain `<button>` trigger that toggles `open`, plus a `<Sheet open={open} onOpenChange={setOpen}>` with `<SheetContent side="bottom" className="p-0 rounded-t-xl max-h-[80vh]">` containing a small header ("Choose a city") and the `CityListPanel`. Hide the close button styling-wise as needed; rely on overlay tap + selection to close.
   - Else: keep the existing `Popover` / `PopoverTrigger` / `PopoverContent` exactly as today.
4. `handleSelect` already calls `setOpen(false)` before navigating, so it works for both Popover and Sheet without changes.
5. Keep the trigger markup (MapPin for compact, ChevronDown for heading, hover styles) identical between mobile and desktop so the pill looks the same.
6. Keep the existing `[&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]` classes on the list so the scrollbar stays invisible in both modes.

## Out of scope

- No changes to the date picker (already a bottom sheet on mobile).
- No changes to recent-cities behavior (already removed previously).
- No new translations; the popover currently uses English literals ("Search city...", "Available now", "Coming soon") and we'll keep them as-is.
