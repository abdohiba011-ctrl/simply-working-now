I found two separate issues causing the confusion:

1. The password reset flow is currently implemented as a code/OTP flow, so reset requests still generate a code email.
2. Some screens still have fallback/default text saying “6-digit code”, even though the locale files were partly updated. If translation loading misses a key or a duplicate page is used, the old wording still appears.

Plan to fix it:

1. Change password reset to link-only
- Update agency and renter forgot-password pages so they say “reset link”, not “code”.
- Send users to a “check your email” confirmation state after requesting a reset link, instead of sending them to a code-entry screen.
- Remove the reset-code verification step from the password reset flow.
- Allow the reset link from the email to open the “set new password” screen using the authenticated recovery session.

2. Only send password reset emails for existing accounts
- Before sending a reset email, check whether the email exists in Motonita.
- If the email is not registered, do not request/send a reset email.
- Show a clear message like “No account found with this email. Please sign up first.”
- Keep this behavior for both renter and agency reset pages.

3. Keep signup/account verification as code-based
- Signup verification will still use the 6-character verification code, because this is for confirming a newly created renter or agency account.
- Resending verification after signup will remain available only for pending registered accounts.

4. Clean all old UI wording
- Replace remaining “6-digit code” fallback text with the correct wording.
- For password reset: use “reset link” everywhere.
- For signup verification: use “6-character verification code” everywhere.
- Apply this in English, French, and Arabic locale files, plus the renter/agency reset screens.

5. Update auth email templates and deploy them
- Change the password reset email template from “password reset code” to “password reset link”.
- Keep the signup email template as a verification code email.
- Make sure the email hook is redeployed after template changes so the live emails use the new content.

6. Note about the custom sender domain
- The sender domain is still pending DNS verification, so branded custom templates may not be fully active until DNS finishes.
- I will still update and deploy the templates now; once DNS is verified in Cloud → Emails, the updated branded emails will be used automatically.

Technical details
- Main files to update:
  - `src/stores/useAuthStore.ts`
  - `src/pages/auth/ForgotPassword.tsx`
  - `src/pages/auth/RenterForgotPassword.tsx`
  - `src/pages/auth/ResetPasswordNew.tsx`
  - `src/pages/auth/RenterResetPasswordNew.tsx`
  - `src/pages/auth/ResetPasswordVerify.tsx` and `src/pages/auth/RenterResetPasswordVerify.tsx` only if still needed for redirects/backward compatibility
  - `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ar.json`
  - `supabase/functions/_shared/email-templates/recovery.tsx`
  - `supabase/functions/auth-email-hook/index.ts`
- Existing account detection will reuse the current backend account-check function.
- After changing files under `supabase/functions/`, the auth email backend function must be redeployed.