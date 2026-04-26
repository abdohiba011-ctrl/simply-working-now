## Add role-switcher item to the user menu

Add a "Switch to Renter / Switch to Agency" entry inside `UserMenu` (the avatar dropdown), shown **only when both `renter` and `agency` roles are active** on the same account.

### Changes

**`src/components/auth/UserMenu.tsx`**
- Compute `canSwitchRoles = hasRenter && hasAgency` (both flags already derived from `user.roles`).
- When `canSwitchRoles` is true, render a new `DropdownMenuItem` above the logout separator:
  - If `currentRole === "agency"` → label `mockAuth.switch_to_renter`, icon `User`, calls `switchRole("renter")` then navigates to `/profile`.
  - Else → label `mockAuth.switch_to_business`, icon `Briefcase`, calls `switchRole("agency")` then navigates to `/agency/agency-center`.
- Pull `switchRole` from `useAuthStore`.
- After switching, also `toast.success(...)` so the user gets feedback (sonner already used elsewhere).
- Hidden entirely when only one role is active (renter-only or agency-only accounts see nothing new).

### Why this rule
- Renter-only users have no agency profile → would land on a broken dashboard.
- Agency-only accounts in this codebase don't really exist (every signup gets renter active), but the guard keeps the UI honest if that ever changes.
- Reuses the existing `switchRole` action in `useAuthStore` which already persists the choice via `writeLastRole` and is wired into both the agency shell and renter pages.

### i18n
No new strings — `mockAuth.switch_to_renter` and `mockAuth.switch_to_business` already exist in `en.json`, `fr.json`, and `ar.json`.

### Out of scope
- No DB changes.
- No changes to `Header.tsx` (the avatar dropdown there delegates to `UserMenu`).
- No changes to agency sidebar (already has its own switcher).