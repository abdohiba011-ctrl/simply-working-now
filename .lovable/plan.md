## Context

The user `abdrahimbamouh56@gmail.com` (id `4e6fd364-…`) **already has the `admin` role** in `user_roles` (alongside `business` and `user`). No DB change is needed for admin access — the issue is purely UI: the admin entry point and the role switcher are not consistently shown across the renter and agency surfaces.

### Current state in code
- **Renter `Header.tsx`** uses the legacy `useAuth().hasRole('admin')` and already renders an "Admin Panel" link → /admin/panel for desktop dropdown and mobile menu. ✅ (works for this user on the renter side)
- **Renter `Header.tsx`** does **not** show a "Switch to agency" item, even when the user also has the agency role. ❌
- **Agency `Header.tsx`** uses `<UserMenu />` which already has the renter↔agency switch. ✅
- **`UserMenu`** does **not** show an "Admin Panel" link, so when the user is on the agency side they cannot reach `/admin/panel` from the menu. ❌
- **`loadAuthUserModel`** in `useAuthStore.ts` does not surface the `admin` role on the `MockUser` object — it only tracks `renter` and `agency`. We need an `isAdmin` flag derived from `user_roles` so `UserMenu` can conditionally show the admin link.

## Plan

### 1. Surface admin role in the auth store
- In `src/stores/useAuthStore.ts` → `loadAuthUserModel`:
  - After fetching `roles`, also expose `isAdmin = roles.includes('admin')`.
  - Add `isAdmin: boolean` to the `MockUser` shape (extend the type used by the store; non-breaking optional field).
  - No change to login/logout flow.

### 2. Add Admin Panel link to `UserMenu`
- In `src/components/auth/UserMenu.tsx`:
  - Read `user.isAdmin` from the store.
  - When `isAdmin` is true, render a new dropdown item "Admin Panel" (with Shield icon) that navigates to `/admin/panel`. Place it above the role-switch section.
  - This makes the admin entry available on **both** the renter side (header dropdown can later be migrated) and the agency side (where `UserMenu` is already used).

### 3. Add renter→agency switch on the renter Header
- In `src/components/Header.tsx`:
  - Detect dual-role users via `useAuthStore`: `hasAgency = user?.roles.agency.active`.
  - When the user is currently in renter mode AND `hasAgency` is true, add a "Switch to business" entry in the existing user dropdown (desktop) and the mobile menu, mirroring the existing "Admin Panel" entry.
  - On click: call `switchRole('agency')` and navigate to `/agency/agency-center` (matches `UserMenu` behavior).
  - Keep all existing items (Profile, Bookings, Notifications, Settings, Admin Panel, Logout) intact.

### 4. Verify the agency side already works
- `src/components/agency/Header.tsx` uses `<UserMenu />`, which already has agency→renter switch. After step 2, it will also have the Admin Panel link for this user. No further change needed there.

### 5. No DB migration required
- The user already has the `admin` role row. Once the UI changes ship, "Admin" will appear in both the renter Header dropdown (existing) and the agency `UserMenu` (new).

## Files to change
- `src/stores/useAuthStore.ts` — add `isAdmin` to `MockUser` mapping.
- `src/lib/mockAuth.ts` — extend `MockUser` interface with optional `isAdmin?: boolean`.
- `src/components/auth/UserMenu.tsx` — add conditional Admin Panel item.
- `src/components/Header.tsx` — add "Switch to business" item (desktop dropdown + mobile menu) for dual-role renters.

## Out of scope
- No changes to OAuth / Google sign-in flow.
- No changes to RLS or DB schema.
- Not migrating the renter `Header.tsx` to use `<UserMenu />` (larger refactor) — we only add the missing switch entry.

## Verification after implementation
1. Log in as `abdrahimbamouh56@gmail.com` on the renter site → header dropdown shows: Profile, …, **Switch to business**, **Admin Panel**, Logout.
2. Click "Switch to business" → lands on `/agency/agency-center`; agency header `UserMenu` now shows: Profile, Settings, **Admin Panel**, **Switch to renter**, Logout.
3. Click "Switch to renter" → returns to renter view. Both directions work symmetrically.
4. A normal renter (no agency, no admin) sees neither entry — unchanged behavior.
