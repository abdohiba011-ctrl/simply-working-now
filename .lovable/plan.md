## Goal

Clean up the filter action bar in `src/components/rent-city/FiltersPanel.tsx`. Remove the duplicate count (currently shows "1" twice — once before "Clear all" and once inside the "Apply 1 filter" button). Keep just two items: **Clear all** on the left, **Apply N filter(s)** on the right — with the number rendered as a white circular badge inside the green button.

## Changes

**File:** `src/components/rent-city/FiltersPanel.tsx` (action bar around lines 390–423)

1. Remove the leading `activeFilterCount` pill that sits before "Clear all".
2. "Clear all" becomes a standalone ghost button on the left, fading in/out based on whether any filters are active (preserving smooth UX).
3. The "Apply" button on the right is restructured:
   - When filters are active: shows `Apply` + a small white circular badge with the count + `filter` / `filters` label + arrow icon.
   - When no filters are active: shows `Show {N} bikes` + arrow (unchanged behavior).
4. The white badge uses `bg-white text-primary` (or `bg-background text-primary`) inside the green primary button so the number reads cleanly against the green.

### Visual layout

```text
[ Clear all ]                                 [ Apply (1) filter → ]
                                                       ▲
                                              white circle w/ number
```

The count updates live (1, 2, 3…) and the badge stays the same size.

No other behavior, layout, scroll, or styling changes.