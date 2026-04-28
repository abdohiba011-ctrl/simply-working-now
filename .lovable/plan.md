# Make agency accounts agency-only (no renter mixing)

## Problem

Today, every signed-in user is treated as both a renter AND an agency:
- In `loadAuthUserModel` (`src/stores/useAuthStore.ts`), `renterActive` is hardcoded to `true` for everyone.
- The agency role is set active when the DB has the `agency` role OR a business profile.
- Result: an agency user has BOTH roles "active", so:
  - Login routing on the renter door (`/auth`) sends them to `/rent` instead of `/agency/dashboard`.
  - The avatar dropdown shows "Switch to renter" because `canSwitchRoles = hasRenter && hasAgency` is always true.
  - Header shows renter widgets (renter wallet, "Switch to business" prompts, etc.).

The user wants: **a user who registered/logs in as an agency is an agency, period.** Always land on `/agency/dashboard` (or `/agency/verification` if not yet verified). No renter UI. No "switch to renter".

## Fix

### 1. Agency role gates renter role — `src/stores/useAuthStore.ts` (`loadAuthUserModel`)

Stop hardcoding `renterActive = true`. Compute it from real signals so agency-only accounts don't get an implicit renter role:

- `agencyActive` = `roles.includes("agency") || hasBusinessRow` (unchanged).
- `renterActive` = `roles.includes("renter") && !agencyActive` — i.e. only true when the DB explicitly grants the renter role AND the user is not an agency. Agency accounts are agency-only.
- `default_role` and the priority logic stay agency-first.

This ensures `user.roles.renter.active` is `false` for any agency user, which automatically:
- Hides "Switch to renter" in `UserMenu` (the existing `canSwitchRoles = hasRenter && hasAgency` becomes `false`).
- Makes `getDestinationForUser` go through the "agency-only" branch and return `/agency/dashboard` (or `/agency/verification`).

### 2. Login routing — `src/lib/routeAfterAuth.ts` (`getDestinationForUser`)

Add an explicit short-circuit at the top: **if the user has the agency role active, always return the agency destination, regardless of `context` or `last_active_role`.** This guarantees an agency user logging in via the renter door (`/auth`) never lands on `/rent`.

```text
if (hasAgency) {
  return user.roles.agency.verified ? "/agency/dashboard" : "/agency/verification";
}
```

Also remove the dual-role "context wins" branch (no longer reachable for agency users) and keep the renter fallback.

### 3. Header renter UI for agency users — `src/components/Header.tsx`

- Update `isRenter` so agency users are never treated as renters: `const isRenter = isAuthenticated && !hasAgencyRole && !isBusiness && !isAdmin;`
- Hide the renter wallet, "Switch to business" CTA, and other renter-only menu items when `hasAgencyRole` is true (lines ~528 and ~689).

### 4. Business layout dropdown — `src/components/layouts/BusinessLayout.tsx`

- Remove the "Switch to Client" item (line 147) from the agency-shell dropdown. Agency users should not see that option at all.

### 5. Auth context role mapping — `src/contexts/AuthContext.tsx`

- The `Header` uses `hasRole('business')`. The DB role string is `'agency'`. Add a small alias so `hasRole('business')` returns true when the user has `'agency'`, OR change the call site to `hasRole('agency')`. Pick the call-site fix (cleaner): update `Header.tsx` to use `hasRole('agency')` everywhere.

### 6. Sanity check — Signup

`Signup.tsx` already calls `navigateAfterAuth(navigate, authedUser, defaultRole)` after signup. With (1) and (2) above, an agency signup with auto-confirm enabled now lands on `/agency/dashboard` (or `/agency/verification`) automatically. No code change needed here.

## Files touched

- `src/stores/useAuthStore.ts` — change `renterActive` derivation in `loadAuthUserModel`.
- `src/lib/routeAfterAuth.ts` — agency short-circuit in `getDestinationForUser`.
- `src/components/Header.tsx` — gate renter UI on `!hasAgencyRole`; switch `hasRole('business')` → `hasRole('agency')`.
- `src/components/layouts/BusinessLayout.tsx` — remove "Switch to Client" menu item.
- `src/components/auth/UserMenu.tsx` — no change needed (the existing `canSwitchRoles` check naturally becomes false once renter is no longer auto-active).

## Verification

After approval and implementation:
1. Register a new agency via `/agency/signup` → should land on `/agency/verification` (or `/agency/dashboard` if verified). Never `/rent`.
2. Log in as an agency via `/auth` (renter door) → should still land on `/agency/dashboard`. Never `/rent`.
3. Open the avatar dropdown as an agency → no "Switch to renter" item, no renter wallet.
4. Renter accounts (no `agency` role, no business profile) keep working as before.
