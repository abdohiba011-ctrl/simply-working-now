# Rent City header + Hero mobile pickers

## 1. Header on tablet — single line

In `src/pages/RentCity.tsx` (line 542) the H1 uses `flex flex-wrap items-baseline gap-x-2`, which wraps "Motorbike Rental in" above "Casablanca" on tablet because the H1 is `text-3xl md:text-4xl`.

- Remove `flex-wrap` so the title stays on one line on md+ (tablet/desktop). Keep wrap only on small mobile via responsive classes: `flex flex-wrap md:flex-nowrap items-baseline gap-x-2 whitespace-nowrap md:whitespace-normal`.
- Reduce font size on the tablet breakpoint so it fits: `text-2xl sm:text-3xl md:text-[28px] lg:text-4xl` (tuned so "Motorbike Rental in Casablanca ⌄" fits at 768–1023px).
- Ensure `CitySwitcher` trigger doesn't force a break (already inline-flex).

## 2. Equalize Filters and Sort buttons on tablet

In the same header row (lines 553–590):
- Filters button uses `Button size="sm"` (h-9). The Sort `SelectTrigger` is default (h-10) with `w-[180px]`.
- Change Filters trigger to remove `size="sm"` and give it `h-10` to match the Select trigger. Also align padding (`px-4`) so both have identical vertical/horizontal rhythm.

Result: both controls have the same height and visual weight on tablet.

## 3. Mobile hero — bottom-sheet pickers for City and Neighborhood

In `src/components/HeroSection.tsx` (lines 292–372), the City and Neighborhood inputs use shadcn `Select`, which on mobile opens a native-feeling dropdown anchored to the trigger. The Dates input already opens a bottom sheet via `BookingDatePicker` (because of `useIsBelowLg`).

Plan:
- Detect mobile only with `useIsMobile()` (existing hook, <768px). Tablet keeps current dropdown behavior since user only mentioned mobile.
- On mobile, replace the City `Select` with a button trigger that opens a `Sheet` (`side="bottom"`, same styling as Filters sheet on RentCity: rounded-top, drag handle, header "Choose a city", scrollable list). Tapping a city sets it and closes the sheet.
- Same for Neighborhood: button trigger → bottom Sheet titled "Choose a neighborhood", listing "All neighborhoods" + `neighborhoodOptions`. Disabled state preserved when no city selected.
- Keep the existing `Select` for desktop/tablet (≥768px) — render conditionally based on `useIsMobile()`.
- Dates picker already behaves correctly (bottom sheet on mobile/tablet); no change.

### UX details (mobile sheets)
- Same visual language as the Filters sheet in `RentCity.tsx`: `h-[80dvh] rounded-t-[28px] p-0`, drag handle, sticky header.
- Selected city/neighborhood shown in the trigger button with the same `MapPin`/`Building2` icon and label styling already used.
- Coming-soon cities listed as disabled rows with the "Soon" badge, matching current Select behavior.

## Files to edit

- `src/pages/RentCity.tsx` — H1 wrap/size classes; Filters button height/padding.
- `src/components/HeroSection.tsx` — wrap City and Neighborhood selects with mobile-only Sheet variants.

No business logic, data, or routing changes.
