## Goal
Replace the two-section city dropdown ("Available now" header + list, then "Coming soon" header + list) with a single combined list where each city carries a small inline status badge — saving vertical space and simplifying scanning.

## Change (single file: `src/components/HeroSection.tsx`)

In the City `<SelectContent>` (~lines 300–333):

- Remove the two `SelectGroup` headers ("Available now", "Coming soon").
- Render one merged list: available cities first, then coming-soon cities.
- Each `SelectItem` shows the city name on the left and a compact badge on the right:
  - **Available** → green pill: `bg-[#9FE870]/25 text-[#163300]` with a tiny dot, label "Available"
  - **Soon** → muted pill: `bg-muted text-muted-foreground` with a `Clock` icon, label "Soon"
- Coming-soon items remain `disabled` with reduced opacity so they aren't selectable.
- Keep ordering stable (available alphabetical first, then soon alphabetical) so the list is predictable without group headers.
- Keep `max-h-[320px]` scroll, no other layout changes.

## Why this works
- Removes 2 header rows + spacing → ~40–60px saved, more cities visible without scrolling.
- Status is still instantly clear via color-coded badge on each row.
- Matches the inline-badge pattern shown in the reference screenshot.

## Out of scope
- No i18n string changes beyond reusing the existing "Soon" / status copy.
- No changes to the map, neighborhood select, or data fetching.
- No design changes elsewhere on the hero.
