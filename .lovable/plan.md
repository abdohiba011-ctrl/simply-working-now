# Auth System Overhaul — Execution Plan

## 1. Seed Test Accounts (do FIRST, then verify before tests)
Create idempotent admin-only edge function `supabase/functions/seed-test-accounts/index.ts`:
- Uses `SUPABASE_SERVICE_ROLE_KEY` + `auth.admin.createUser` (or update if exists).
- Creates exactly:
  - `renter@test.com` / `Renter123` → `email_confirm: true`, role `renter`, `profiles.user_type='client'`.
  - `business@test.com` / `Business123` → `email_confirm: true`, role `agency`, `profiles.user_type='agency'`, `is_verified=true`, `verification_status='verified'`.
  - `both@test.com` / `Both123` → `email_confirm: true`, roles `renter`+`agency`, agency profile verified.
  - `unverified@test.com` / `Unverified123` → `email_confirm: false`, role `renter`.
- Upserts `profiles` and inserts `user_roles` with `ON CONFLICT DO NOTHING`.
- Returns JSON status per account; invoke once and paste verification output before tests.

## 2. Email + 6-digit OTP Infrastructure
- Configure Supabase auth email templates to use `{{ .Token }}` (6-digit) for confirm signup + recovery.
- Scaffold `auth-email-hook` via `email_domain--scaffold_auth_email_templates` (requires email domain — if not set, surface setup dialog) and deploy.
- Branded templates: Motonita lime/forest, code displayed prominently.

## 3. Remember Me (strict)
- In `useAuthStore.login`: when `rememberMe=false`, after successful sign-in, copy session to `sessionStorage` and clear from `localStorage` (or swap supabase storage adapter). Result: closing the browser logs the user out.
- When `rememberMe=true`: keep default `localStorage` persistence (30d).

## 4. Login Lockout (5 attempts / 15 min)
- Wire `recordLockout` + `getLockoutRemainingMs` in `useAuthStore.login` failure path.
- Throw `AuthError(code: 'ACCOUNT_LOCKED', remainingMs)` when threshold hit; `Login.tsx` already handles this.

## 5. Password Reset (6-digit OTP flow)
- `ForgotPassword.tsx`: keep `requestPasswordReset` (calls `supabase.auth.resetPasswordForEmail` with `redirectTo=/reset-password/new`) AND show "check your email for 6-digit code" message with rate limit (3/hour).
- `ResetPasswordVerify.tsx`: restore 6-digit OTP UI; on submit call `supabase.auth.verifyOtp({ email, token, type: 'recovery' })` — on success navigate to `/reset-password/new` with active recovery session.
- `ResetPasswordNew.tsx`: confirm recovery session, `updateUser({ password })`, sign out + redirect to login with success toast (or auto-login per spec, then route by role).
- Always show success message even for non-existent emails (anti-enumeration).

## 6. Role Routing (centralize in `routeAfterAuth.ts`)
- Email not verified → `/verify-email`
- Both roles → `/agency/dashboard` unless `last_active_role==='renter'` and rememberMe → `/rent`
- Agency only verified → `/agency/dashboard`; not verified → `/agency/verification`
- Renter only → `/rent`

## 7. Already-Logged-In Redirect
- Add guard in `Login.tsx`, `Signup.tsx`, `AgencyLogin.tsx`, `AgencySignup.tsx`, `ForgotPassword.tsx`, `ResetPasswordVerify.tsx`: if `isAuthenticated` on mount → `navigateAfterAuth`.

## 8. Logout Confirm
- Verify `LogoutConfirmDialog` is wired to all logout buttons (Header, AgencyHeader, UserMenu). Toast on success.

## 9. Cleanup
- Delete legacy `src/pages/Auth.tsx` and remove route from `App.tsx`.
- Remove dead OTP edge-function calls.

## 10. Testing
- Create `docs/AUTH_TESTING.md` runbook with all 22 scenarios.
- Run automated checks: invoke seed function, query DB to verify state, curl signup/login flows where possible.
- Manual scenarios (Google OAuth, browser-close session) documented with explicit steps.
- Final report: PASS/FAIL per test + manual TODO list (email domain setup if missing, Google provider config).

## Files Modified/Created
**Created**: `supabase/functions/seed-test-accounts/index.ts`, `supabase/functions/auth-email-hook/*` (via scaffold), `docs/AUTH_TESTING.md`
**Modified**: `useAuthStore.ts`, `mockAuth.ts`, `routeAfterAuth.ts`, `Login.tsx`, `Signup.tsx`, `AgencyLogin.tsx`, `AgencySignup.tsx`, `ForgotPassword.tsx`, `ResetPasswordVerify.tsx`, `ResetPasswordNew.tsx`, `App.tsx`
**Deleted**: `src/pages/Auth.tsx`

## Likely Manual TODOs for Founder
- Approve email domain setup dialog (required for branded 6-digit emails).
- Configure Google OAuth in Lovable Cloud / Google Console (test on production domain only — sandbox blocks OAuth).

Approve and I'll switch to default mode and execute step-by-step, posting the seed verification JSON before running the test suite.