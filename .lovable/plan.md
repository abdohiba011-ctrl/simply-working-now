# Restore unified Auth page

## Goal
Replace the split `/login`, `/signup`, `/agency/login`, `/agency/signup` flow with a single unified `/auth` page that has:
- Tabs: **Log in** / **Create account**
- Role toggle (signup only): **I am a Client** / **I am a Business**
- Google sign-in at the top
- Email + password
- Business-only fields when "I am a Business" is selected

## Changes

### 1. Rewrite `src/pages/Auth.tsx`
Replace the redirect stub with the full unified UI:
- `Tabs` (shadcn) with two values: `login` | `signup`
- Role segmented control (only shown on signup tab): `renter` | `agency`
- `GoogleSignInButton` at top of both tabs
- Login form: identifier (email/phone) + password + remember me + forgot password link
- Signup form: name, email, phone, password (with strength indicator), terms checkbox
- Signup form (agency only): business name, city, business type, number of bikes
- Uses `react-hook-form` + `zod` (dynamic schema based on role)
- Calls `useAuthStore.login()` / `signup()` — no auth logic changes
- Wrapped in existing `AuthLayout`
- Reads URL params: `?tab=signup`, `?role=agency` to pre-select state
- Brand: lime `#9FE870` for active states, Wise-inspired clean layout

### 2. Update `src/App.tsx` routing
Point all auth routes to the unified `Auth` component:
- `/auth` → `<Auth />`
- `/login` → `<Auth />` (defaults to login tab)
- `/signup` → `<Auth />` (defaults to signup tab, renter role)
- `/agency/login` → `<Auth />` (login tab)
- `/agency/signup` → `<Auth />` (signup tab, agency role pre-selected)

Pass defaults via URL param redirect or component props.

### 3. Keep but stop routing to:
- `src/pages/auth/Login.tsx`
- `src/pages/auth/Signup.tsx`
- `src/pages/auth/AgencyLogin.tsx`
- `src/pages/auth/AgencySignup.tsx`

(Files left on disk for safe rollback — not deleted.)

### 4. Verify `src/components/Header.tsx` links
Confirm "Log in" / "Sign up" buttons still go to `/login` and `/signup` (which now resolve to unified page). No change expected.

## Post-auth routing (UNCHANGED)
- Client → `/rent` or last intended page
- Business unverified → `/agency/verification`
- Business verified → `/agency/dashboard`

## What stays untouched
- All booking flow, listings, chat, seeding, wallet logic from earlier today
- `useAuthStore` (login/signup/logout methods)
- Google OAuth flow via `GoogleSignInButton`
- i18n keys (reuse existing `auth.*` translations)

## Trade-off
Keeping old split files instead of deleting them — slightly messier file tree, but instant rollback if needed.

## Files touched
- **Rewrite**: `src/pages/Auth.tsx`
- **Modify**: `src/App.tsx`
- **Verify only**: `src/components/Header.tsx`
