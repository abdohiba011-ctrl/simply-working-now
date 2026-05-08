# City switcher on the rent-city page

## Goal
On `/rent/:citySlug` (e.g. "Motorbike Rental in Casablanca"), let users jump to another city without going back. The control should be subtle but discoverable, and feel native to the heading.

## UX decision

After looking at the page, the cleanest pattern is to make the city name itself an interactive switcher — not a separate big dropdown. Two reinforcing affordances:

1. The city word in the H1 ("…Rental in **Casablanca**") becomes a button:
   - Lime underline accent (`#9FE870`) so it reads as interactive without shouting.
   - Tiny `ChevronDown` icon right after the city name.
   - Hover: underline thickens, subtle background tint.
2. Clicking opens a Popover with:
   - A search input (filter cities as you type — useful with 16 cities).
   - List grouped into **Available** and **Coming soon** (coming-soon disabled, with the same "Soon" pill used in `HeroSection`).
   - Current city marked with a check, kept at top of the available list.
   - Keyboard accessible (arrow keys + enter), closes on select / Escape / outside click.

This keeps the heading prominent (still the H1, still the SEO target) but makes the city name itself the switch — the user's mental model ("I want to change Casablanca") maps directly to clicking the word "Casablanca".

Mobile (<768px): same popover, full-width on small screens via `PopoverContent` width override; the chevron stays inline so the tap target is the whole `City ⌄` chunk.

## Behavior

- Selecting a city navigates to `/rent/{newSlug}` using `cityToSlug` from `src/lib/citySlug.ts`.
- Preserve current query string (`from`, `to`, etc.) **except** `neighborhood` — neighborhoods are city-specific and would 404 / get reset anyway.
- Coming-soon cities are visible but not selectable (consistent with `HeroSection`).
- "All cities" / "Browse all" link at the bottom of the popover → navigates to `/listings` (or wherever the global browse page is — confirm in `App.tsx` routes if needed).

## Data

Reuse the existing source — `service_cities` via the same React Query key already used by `HeroSection`:

```ts
useQuery({ queryKey: ["service-cities-public"], ... })
```

This means the new switcher is automatically realtime (admin adds a city → switcher updates) because `useServiceCitiesRealtime` is already mounted.

## Files

- **New:** `src/components/rent-city/CitySwitcher.tsx`
  - Props: `currentCitySlug: string`, `currentCityName: string`.
  - Uses `Popover`, `Command` (shadcn) for the searchable list, `ChevronDown`, `Check`, `Clock` icons.
  - Reads cities from the shared query; navigates with `useNavigate`.
- **Edit:** `src/pages/RentCity.tsx` around line 545 — replace the inline `{cityName}` text in the H1 with `<CitySwitcher currentCitySlug={citySlug} currentCityName={cityName} />`. Also add it to the "Coming Soon" variant heading at line 765 so users on a coming-soon city can also switch out.

## Out of scope

- No change to neighborhood filter (already handled by existing reset effect).
- No change to the homepage `HeroSection`.
- No URL-shape change beyond the city slug.
