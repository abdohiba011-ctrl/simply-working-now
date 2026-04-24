
## Auth QA Findings (current state)

I audited every screen in the auth flow. Here is what is actually broken or missing:

### 1. Google sign-in is missing on the main auth pages
- `Google` only exists on the legacy `/auth` page.
- The pages users actually land on — `/login`, `/signup`, `/agency/login`, `/agency/signup` — have **no Google button at all**.
- That's why Gmail login feels missing.

### 2. Login button is silently disabled
- `Login.tsx:308` has `disabled={... || !form.formState.isValid}` while the form runs in `mode: "onBlur"`.
- Same bug pattern we just fixed on the forgot-password page. Result: users type credentials, click "Log in", nothing happens until they tab/blur out. We need to remove that gate (Zod still validates on submit).

### 3. Forgot-password → email code → reset flow is fragile
- `requestPasswordReset` calls `resetPasswordForEmail` with `redirectTo: /reset-password/new` (magic-link flow), but the UI navigates to `/reset-password/verify` (OTP flow). Supabase emails contain a **magic link**, not a 6-digit code, so users on the verify page wait for a code that never arrives.
- `ResetPasswordVerify` therefore sits on a blank OTP screen.
- We need to pick **one** flow and make it work. The cleanest, most reliable choice with default Supabase emails is the **magic-link flow**: the email contains a link → user clicks → lands on `/reset-password/new` with a recovery session → sets new password. The OTP page should redirect users to check their email instead of asking for a code that won't be sent.

### 4. Login error UX problems
- After a failed login, the error banner stays even after the user types a new password.
- "Resend verification" button calls `mockResendVerification` (mock helper) instead of the real `resendVerificationCode` store action that hits Supabase.

### 5. Verify-email page works, but copy is misleading
- It says "Check your email" for the **6-digit code**, which is correct because signup uses `verifyOtp({ type: 'signup' })`. This part is fine — leaving it alone.

---

## Plan

### A. Add Google sign-in to the real auth pages

Create a small reusable component `src/components/auth/GoogleSignInButton.tsx` that:
- Calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- Handles `result.error` (toast), `result.redirected` (return), and the post-redirect success case
- Detects sandbox/iframe previews and shows the existing helpful toast ("only works on the live site")
- Supports a `label` prop ("Continue with Google" / "Sign up with Google")

Mount it in:
- `src/pages/auth/Login.tsx` (above the email/password form, with an "or" divider below)
- `src/pages/auth/Signup.tsx` (above the form, after role is selected)
- `src/pages/auth/AgencyLogin.tsx`
- `src/pages/auth/AgencySignup.tsx`

Note: The Google provider is already managed by Lovable Cloud and the user has provided a custom client ID (`577644891036-...`). No backend config needed from this plan.

### B. Fix the "Log in" button being silently disabled

In `src/pages/auth/Login.tsx`:
- Change `disabled={submitDisabled || !form.formState.isValid}` → `disabled={submitDisabled}`.
- Zod still blocks invalid submissions; the user just gets immediate feedback instead of a dead button.

### C. Make password reset actually work end-to-end (magic-link flow)

This is the real fix. Two file changes:

**`src/pages/auth/ForgotPassword.tsx`**
- After successful `requestPasswordReset(email)`, navigate to a new confirmation screen `/reset-password/sent?email=...` (or reuse the verify page in "check your email" mode — see below) that says: *"We've emailed a reset link to **x@y.com**. Click the link to set a new password. Didn't get it? Resend in N seconds."*
- Remove the OTP redirect.

**`src/pages/auth/ResetPasswordVerify.tsx`**
- Repurpose this page as the "check your email" confirmation screen with a Resend button (calls `requestPasswordReset` again, with a 60s cooldown using the existing `recordResetResend` / `getResetResendCooldownMs` helpers).
- Keep the route name so existing email links / browser history still work.
- Remove the OTP input UI (it's misleading because no code is sent).

**`src/pages/auth/ResetPasswordNew.tsx`** (already partially fixed last turn)
- Verify it still:
  - Reads the recovery session from `supabase.auth.getSession()` (set by Supabase when the user clicks the email link)
  - Calls `supabase.auth.updateUser({ password })`
  - On success: signs the user out (recovery sessions shouldn't auto-log in), shows a success toast, redirects to `/login`
- Confirm the route is public (it is — checked App.tsx).

### D. Tighten login error UX

In `src/pages/auth/Login.tsx`:
- Call `clearError()` on any input change in the identifier or password field (so the red banner disappears as the user retries).
- Replace the `mockResendVerification(...)` call in the "Resend verification email" button with the real store action `useAuthStore.getState().resendVerificationCode(identifier)`. Keep the same loading / toast UX.

### E. (Optional polish, included) Forgot-password "back to login"
- Already present. Leave alone.

---

## Files that will change

1. **NEW** `src/components/auth/GoogleSignInButton.tsx` — reusable Google button + sandbox detection.
2. `src/pages/auth/Login.tsx` — add Google button + "or" divider, drop `!isValid` gate, clear errors on input, switch resend handler to real store action.
3. `src/pages/auth/Signup.tsx` — add Google button after role selection.
4. `src/pages/auth/AgencyLogin.tsx` — add Google button.
5. `src/pages/auth/AgencySignup.tsx` — add Google button.
6. `src/pages/auth/ForgotPassword.tsx` — navigate to "check your email" screen instead of OTP page.
7. `src/pages/auth/ResetPasswordVerify.tsx` — convert to "check your email" confirmation with resend.
8. `src/pages/auth/ResetPasswordNew.tsx` — verify recovery-session handling, sign out after password set, redirect to /login.

No database changes, no edge functions, no new dependencies. Default Supabase auth emails (already working) carry the recovery link — no email-template scaffolding needed for this fix.

---

## Out of scope (call out so you know)

- **Phone/SMS login.** The schema accepts a phone number, but Supabase needs a Twilio (or similar) provider configured to actually send SMS. Not enabling that here unless you ask.
- **Custom-branded auth emails.** Default Supabase emails work; branded templates require an email domain setup. Happy to do this in a follow-up if you want emails to come from `notify@motonita.ma`.
- **Apple / Microsoft sign-in.** Easy to add later with the same pattern, but you only asked about Gmail.

---

## What you'll be able to do once this ships

- Click **Continue with Google** on `/login`, `/signup`, `/agency/login`, `/agency/signup` and sign in with a Gmail account in one tap (on the live domain — sandbox previews still show the helpful toast).
- Click **Log in** without first having to tab out of the password field.
- Click **Forgot password** → enter email → receive a reset email → click the link → set a new password → log in. The whole loop closes.

Approve and I'll implement.
