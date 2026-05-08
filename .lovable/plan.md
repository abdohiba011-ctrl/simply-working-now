## Change

In `src/components/rent-city/FiltersPanel.tsx` action bar (~lines 391–425), make the bar adaptive based on the panel width (using the existing `@container` already on the bar):

- **Mobile / tablet (panel width < ~640px, used in the bottom Sheet):** keep current bar exactly as-is — Clear all (X) on the left + green "Apply N filter" CTA on the right.
- **Desktop / laptop (panel width ≥ ~640px, used in the sidebar):** hide the green Apply button entirely. Filters already apply live. Show instead a compact strip:
  - On the left: "**N** filter active" / "**N** filters active" pill (white circular badge with the number, same look as the badge currently inside the Apply button).
  - On the right: the Clear all button (X icon + "Clear all" text, same red destructive styling as today, full-width-friendly height).
  - When `activeFilterCount === 0`: hide the whole bar (no border, no padding) so the desktop sidebar stays clean.

No logic changes, no new props, no other files touched.