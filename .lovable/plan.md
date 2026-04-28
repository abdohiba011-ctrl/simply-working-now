I found the likely reason it still looks unchanged: the app has two different signup/auth paths, and the active signup page is still using the normal backend signup email path. The custom email hook also has no recent send logs, and the email domain is still pending DNS, so the deployed OTP templates are not currently the email users are receiving.

Plan to fix it properly:

1. Make the active signup flow use the OTP verification path consistently
   - Update the signup flow used by `/signup` and `/agency/signup` so it sends a real 6-digit verification code email and routes the user to the existing code-entry screen.
   - Remove/avoid the older magic-link style behavior for this flow.
   - Keep the current `/verify-email` page as the code entry UI.

2. Fix the email template activation issue
   - Reconnect/re-scaffold the managed auth email templates if needed so the backend uses the current Motonita code templates, not the default link template.
   - Redeploy the auth email backend after changes so the live email content updates immediately.
   - Confirm the template uses a visible 6-digit code and no “click this link” primary action.

3. Clean up confusing UI copy
   - Replace old wording such as “verification email” with “verification code” where it appears in auth screens/toasts.
   - Keep all text in the localization files for English, French, and Arabic.
   - Ensure the UI says “6-digit code” consistently, not 8-digit or magic-link wording.

4. Verify email delivery state
   - Check the email domain/status and email send logs after deployment.
   - If DNS is still pending, I’ll tell you clearly: custom branded emails may not be active until the domain finishes verification in Cloud → Emails. The app code can still be fixed now, but domain activation controls whether users receive the custom Motonita template instead of the default email.

Technical details:
- Files likely involved: `src/pages/auth/Signup.tsx`, `src/stores/useAuthStore.ts`, `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ar.json`, and `supabase/functions/auth-email-hook/*`.
- The current `auth-email-hook` code already contains OTP-style templates, but it is not showing activity in recent logs, which points to activation/domain/runtime configuration rather than only template text.
- After any change under `supabase/functions/`, the backend function will be redeployed.