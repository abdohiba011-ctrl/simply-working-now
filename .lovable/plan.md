## Goal

Redesign the agency Verification page (`src/pages/agency/Verification.tsx`) into a tighter, more scannable form with stronger visual hierarchy, better spacing, and field surfaces that clearly read as "fillable." No business logic changes — same data, same submit flow, same validation.

## Key UX problems today

- Each step is its own oversized `Card` with a numbered circle + heading + body — every section eats vertical space even when it holds one short input.
- "Business verification" header card alone takes ~1/3 of the viewport before the form starts.
- "What kind of business are you?" stacks two large radio cards on a row that should comfortably fit on one line.
- ICE number, RC, ICE certificate, and CIN front/back are each given a full-width card row, instead of being paired 2-per-row.
- Upload tiles use a white background identical to the page → they don't read as form fields. Inputs (ICE) also blend in.

## Redesign

### 1. Header — make it compact and informative

- Reduce the header `Card` padding (`p-6` → `p-5`) and tighten the icon/title/status row into a single compact band.
- Keep the status banner and rejection banner, but reduce vertical padding and merge the progress bar into the same card footer (no extra `mt-5` block).
- Goal: header occupies ~one screen-band, not half a screen.

### 2. Replace 5 separate step cards with a single grouped form card

One outer `Card` (`p-6 sm:p-8`) titled **"Business verification"**, then two clear sub-sections inside it separated by a thin divider:

**Section A — Business details** (one row, 12-col grid on `md+`):
```text
[ Entity type (segmented control, col-span-7) ] [ ICE Number input (col-span-5) ]
```
- Entity type becomes a **segmented control / pill toggle** (two buttons side-by-side, equal width) instead of two big choice cards. Icons stay (Building2 / UserIcon). Selected state = primary background, ring removed.
- Removes the giant numbered circles; use small numbered chips inline with section titles (`01 · Business details`).

**Section B — Documents** (2-column grid on `md+`, single column on mobile):
```text
[ RC / AE card        ] [ ICE Certificate ]
[ CIN — Front side    ] [ CIN — Back side ]
```
- 4 upload tiles in a 2×2 grid (the business doc adapts label based on entity type).
- All tiles use the same compact tile style (drop the `compact` variant distinction so the grid is visually uniform).

### 3. Field surfaces — make inputs and tiles feel "fillable"

- **Inputs** (`ICE Number`): change background from `bg-background` to `bg-muted/40` with `border-input` and `focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring`. Add a subtle inline left affix showing the digit counter (e.g. `12/15`) instead of a separate helper line.
- **Upload tiles**: switch the empty state from white `bg-background` + dashed border to `bg-muted/30` + dashed `border-input`, with `hover:bg-muted/50 hover:border-primary/50`. Done state stays `bg-success/5 border-success/40`. This gives all interactive surfaces a consistent grayish "form field" tone.
- Tighten tile internal padding (`p-4` → `p-3.5`) and reduce the icon chip size (`p-2` → `p-1.5`, icon `h-4 w-4` → `h-3.5 w-3.5`) so 4 tiles fit cleanly in 2 columns without feeling cramped.

### 4. Spacing and rhythm

- Replace top-level `space-y-5` with `space-y-4`.
- Inside the form card use `space-y-6` between Section A and Section B with a `border-t border-border/60` divider.
- Section titles: `text-xs font-semibold uppercase tracking-wider text-muted-foreground` with a small numbered chip — far less visual weight than the current `h2`-style block.
- Help text under each section is a single line; remove the redundant per-tile "Make sure the document is in focus…" copy and keep one short helper at the section level.

### 5. Sticky submit bar — keep, but slim

- Reduce padding (`p-4` → `px-4 py-3`), keep the icon + status sentence + primary button. Visually unchanged behavior.

## Files to change

- `src/pages/agency/Verification.tsx` — only file edited. Pure presentational refactor: same state, same handlers, same Supabase calls, same submit logic. Only the JSX returned from the component and the `UploadTile` styling are reworked.

## Out of scope

- No changes to data model, RLS, edge functions, or upload flow.
- No copy/i18n changes beyond shortening visible labels/helpers.
- Mobile layout keeps single-column stacking; the 2-col grids only activate at `md` breakpoint.
