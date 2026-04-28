## Problem

The user dropdown (and mobile menu) in `src/components/Header.tsx` renders two separate items that look the same and use the same icon:

- `isBusiness` → "Business Dashboard" → navigates to `/business-dashboard`
- `hasAgencyRole` → "Switch to business" → calls `handleSwitchToAgency()`

Users who qualify for both (most agency owners do) see them stacked back-to-back, exactly as in the uploaded screenshot.

There is also a hardcoded English string ("Switch to business") that is not translated.

## Fix

Show **one** business entry in the menu, chosen by priority:

1. If the user has the **agency** role → show **"Switch to business"** that calls `handleSwitchToAgency()` (this is the modern agency workspace and the canonical destination).
2. Otherwise, if the user is flagged as `isBusiness` (legacy individual owner / rental shop without the agency role yet) → show **"Business Dashboard"** that navigates to `/business-dashboard`.
3. If neither → show nothing (current behavior).

Apply the same logic in both the desktop dropdown (around lines 527–538) and the mobile menu (around lines 688–699) in `src/components/Header.tsx`.

Replace the hardcoded `"Switch to business"` string with the existing translation key `header.switchToBusiness` (already defined in EN/FR/AR in `src/locales/translations.ts` and the JSON locale files).

## Files touched

- `src/components/Header.tsx` — collapse the two conditional menu items into one in both the desktop dropdown and the mobile menu, and use the i18n key for the label.

## Out of scope

- The separate `UserMenu.tsx` component (used elsewhere) already shows a single switch entry — no change needed there.
- No DB or backend changes.
- No other admin / business pages are touched.
