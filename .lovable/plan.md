## Goal

Make the entire agency dashboard free. Hide all subscription/upgrade/lock UI. Keep the underlying subscription code intact so we can re-enable later.

## Changes

### 1. `src/components/agency/AgencyShell.tsx`
- Remove the trial banner, past-due banner, and the "Account locked" full-screen overlay.
- Always render `<Outlet />` (no `isLocked` gating).
- Drop the `useAgencySubscription` / `computeLifecycle` calls.
- Keep the unverified-agency banner — that's verification, not billing.

### 2. `src/pages/agency/Dashboard.tsx`
- Remove the "Plan: free" line (and related `useAgencySubscription` usage on this page).

### 3. `src/components/agency/MobileNav.tsx` & `src/components/agency/Header.tsx`
- Remove the "Subscription" entry from the mobile bottom nav and the Header dropdown/menu.

### 4. `src/pages/agency/Finance.tsx`
- Remove the "Subscription" tab. Keep Wallet / Transactions / Invoices.

### 5. Subscription routes
- In `App.tsx`, keep the redirect from `/agency/subscription` but redirect to `/agency/finance` (no `#subscription` hash) so any old link lands on a real page instead of a missing tab.

### 6. Copy cleanup (small, surgical)
- `src/pages/agency/Verification.tsx` line 592: replace the "your Motonita subscription and booking fees" sentence with a free-version equivalent ("your Motonita booking fees").
- `src/pages/agency/Team.tsx`: drop the "enabled with Pro and Business plans" wording (becomes "Coming soon").
- `src/pages/agency/Integrations.tsx`: drop "based on your subscription" (becomes "Coming soon").
- `src/pages/agency/Help.tsx`: remove the "Subscription" FAQ entry and the "Multi-location for Business plan" announcement entry.
- `src/pages/agency/Invoices.tsx`: change empty-state text to "Top-up receipts will appear here" (drop "subscription invoices").
- `src/pages/agency/NotificationSettings.tsx`: remove the "Subscription renewal" notification row.

### 7. Files NOT changed
- `src/pages/agency/Subscription.tsx` — left in place (unrouted, dead code) so we can revive it later.
- `src/hooks/useAgencyData.ts` (`useAgencySubscription`, `computeLifecycle`) — left in place; just no longer consumed by the shell/dashboard.
- DB tables/RLS — untouched.

## Out of scope
- No backend changes.
- No translations beyond touched strings (English-only updates; Fr/Ar can follow later).
- Marketing/agencies landing page pricing copy — only touch if you tell me to.

Should I also strip the "Free / Pro / Business" pricing block from the public `/agencies` marketing page, or leave that as-is for now?
