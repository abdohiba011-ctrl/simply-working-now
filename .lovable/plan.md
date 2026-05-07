## Goal
Remove the renter-side "Credits" entry point entirely so users can no longer access the Billing/Credits page from the renter UI.

## Changes

1. **`src/components/Header.tsx`** (lines 486–491)
   - Remove the `DropdownMenuItem` that links renters to `/billing` ("Credits").
   - Check the mobile menu section of the same file for a matching renter Credits link and remove it too.

2. **`src/App.tsx`**
   - Remove the `Billing` lazy import (line 60).
   - Remove the `/billing` route (line 231).

3. **`src/pages/Billing.tsx`** and renter-only billing helpers
   - Delete `src/pages/Billing.tsx`.
   - Check `src/components/billing/*` (BalanceChart, TopupConfirmDialog, TransactionFilters) and `src/lib/billingFilters.ts` for usage outside renter Billing. If unused elsewhere, delete them; otherwise leave them.

4. **i18n cleanup (optional, low risk)**
   - Remove `header.credits` key from `src/locales/en.json`, `fr.json`, `ar.json` if no other surface uses it.

## Out of scope
- Admin Credits page (`/admin/credits`, `AdminCredits.tsx`) — stays.
- Agency wallet/finance — unrelated.
- Database `motonita_credits` table and RPCs — untouched.

## Verification
- Renter dropdown no longer shows "Credits".
- Visiting `/billing` should 404 via the NotFound route.
- Build passes with no broken imports.
