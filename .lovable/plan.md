## Issue
The mobile/tablet bottom-sheet filter (already wired in `Listings.tsx`) is being covered by the global `Header`, which uses `z-[100]`. The shadcn `Sheet` overlay and content default to `z-50`, so the sticky header overlaps the popup top.

## Fix — `src/pages/Listings.tsx`
Override the z-index on the Sheet so it floats above the Header:
- `SheetContent` → add `className="z-[200] ..."` (keep existing classes: `h-[85dvh] rounded-t-[24px] p-0 ...`).
- The internal `SheetOverlay` is rendered by the component itself; instead of editing the shared shadcn primitive, wrap the trigger with a higher-stacking portal context by setting `className` on `SheetContent` to include `z-[200]` (Radix portals the overlay+content together — overlay shares a `z-50` though, so we also need the overlay above 100).

Two clean options:

**A. Edit only `Listings.tsx`** — add `z-[200]` to `SheetContent` AND render a custom backdrop (a styled div inside SheetContent isn't enough since overlay sits behind it). Simpler: pass `className="z-[200]"` on `SheetContent` only — visually the header would still show, but tap-blocked. Not ideal.

**B. (recommended) Bump shadcn primitives globally** — `src/components/ui/sheet.tsx`:
- Change `SheetOverlay` base class `z-50` → `z-[200]`.
- Change `sheetVariants` base class `z-50` → `z-[200]`.

This keeps every Sheet across the app above the sticky header (which the user already complained about: "don't make the header affect the popup"). No callers depend on `z-50` specifically.

## Files touched
- `src/components/ui/sheet.tsx` — two single-class changes (overlay + content base z-index).

## Out of scope
- Listings.tsx logic, filter UX, animations — already correct from previous step.
