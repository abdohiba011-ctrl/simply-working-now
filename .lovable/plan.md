## Goal

Keep the agency forgot-password flow exactly as it is today (the lime/forest split-screen `AgencyAuthLayout` at `/forgot-password`). Build a **separate** renter forgot-password flow that lives entirely inside the renter UI (Header + standard card, like `/auth`), so renters never get bounced into the agency-branded screens.

## Current state (problem)

- Renter login (`/auth`) → "Forgot password" button navigates to `/forgot-password`
- `/forgot-password` renders `AgencyAuthLayout` (agency-branded split screen)
- `/reset-password/verify` and `/reset-password/new` also render `AgencyAuthLayout`
- Result: a renter resetting their password is dropped into agency-branded screens — wrong UX, mixes the two contexts.

Agency side (`/agency/login` → "Forgot password" → `/forgot-password`) looks correct and stays untouched.

## Plan

### 1. Create three new renter-only pages

Mirror the existing OTP flow but wrap content in renter chrome (`<Header />` + centered `Card`, same look as `/auth`). Same 6-digit OTP logic — no magic links, no behavior change.

- `src/pages/auth/RenterForgotPassword.tsx` — email input → calls `requestPasswordReset` → navigates to `/renter/reset-password/verify?email=...`
- `src/pages/auth/RenterResetPasswordVerify.tsx` — 6-digit OTP entry → on success navigates to `/renter/reset-password/new?token=...`
- `src/pages/auth/RenterResetPasswordNew.tsx` — new password form → on success navigates to `/auth`

All three reuse the same `useAuthStore` actions (`requestPasswordReset`, `verifyResetOtp`, `resetPasswordWithToken` — whatever the existing pages call). No backend or auth-store changes.

### 2. Add new routes in `src/App.tsx`

```text
/renter/forgot-password           → RenterForgotPassword
/renter/reset-password/verify     → RenterResetPasswordVerify
/renter/reset-password/new        → RenterResetPasswordNew
```

Existing agency routes stay exactly as they are:
```text
/forgot-password           → ForgotPassword (agency layout)
/reset-password/verify     → ResetPasswordVerify (agency layout)
/reset-password/new        → ResetPasswordNew (agency layout)
```

### 3. Point the renter login button to the new flow

In `src/pages/Auth.tsx` line 452, change:
```text
navigate("/forgot-password")  →  navigate("/renter/forgot-password")
```

### 4. Verify all internal links

- Renter pages (`/auth`, renter reset screens) only link to `/renter/...` reset URLs and back to `/auth`.
- Agency pages (`/login`, `/agency/login`, agency reset screens) only link to `/forgot-password`, `/reset-password/...`, and `/login`.
- No cross-linking between the two flows.

### 5. i18n

Reuse existing translation keys (`auth.forgotPassword`, `mockAuth.reset_password`, `mockAuth.reset_password_sub`, `mockAuth.send_reset_code`, `mockAuth.back_to_login`, etc.) in all three languages — no new keys needed.

## Out of scope (do not touch)

- Agency `/forgot-password`, `/reset-password/verify`, `/reset-password/new` — keep as-is
- `AgencyAuthLayout`, agency Login/Signup, logo
- `useAuthStore`, OTP backend, email templates — already on 6-digit codes

## Files

**New**
- `src/pages/auth/RenterForgotPassword.tsx`
- `src/pages/auth/RenterResetPasswordVerify.tsx`
- `src/pages/auth/RenterResetPasswordNew.tsx`

**Modified**
- `src/App.tsx` — add 3 renter routes
- `src/pages/Auth.tsx` — change forgot-password link target
