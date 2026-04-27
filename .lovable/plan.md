You’re right. The current frontend asks for a 6-digit reset code, but the password reset request is still using the backend’s default password recovery email path, which can produce a reset-link email when the custom auth email hook is not active or while the email domain is still pending. That is why you saw a link. The logic is inconsistent and needs to be fixed at the source.

Plan to make password reset OTP-only everywhere:

1. Replace the reset-link trigger
   - Stop using the default password recovery email method for `/forgot-password`.
   - Use an OTP-only auth request instead, configured to send a 6-digit code and not create new users.
   - Keep the user on the Motonita reset-code screen after submitting their email.

2. Verify the OTP correctly
   - Update `/reset-password/verify` so the 6-digit code is verified as the same OTP type that was sent.
   - After a valid code, allow the user to continue to `/reset-password/new` and set the new password.
   - Keep the flow: email → 6-digit code → new password. No clickable reset link.

3. Remove legacy reset-link handling
   - Remove the fallback path in `ResetPasswordNew.tsx` that accepts a clicked recovery link/session.
   - Update comments and error messages from “reset link” to “reset code”.
   - Add a guard so old recovery-link URLs redirect back to `/forgot-password` instead of acting as a valid reset path.

4. Fix the email templates that can still show links
   - Update auth email templates so password reset and magic-link style emails display only `{token}` as a 6-digit code.
   - Remove button/link wording from reset-related email copy.
   - Keep Motonita branding: white email background, forest text, lime code box.

5. Deploy and test the email function
   - Redeploy the auth email handler after the template changes.
   - Test the reset flow from `/forgot-password` and confirm:
     - the UI shows six OTP boxes,
     - the sent email contains a 6-digit code only,
     - no “Reset Password” button/link appears,
     - entering the code allows setting a new password,
     - “Wrong email?” returns to `/forgot-password`.

Technical details:
- Main files to update:
  - `src/stores/useAuthStore.ts`
  - `src/pages/auth/ResetPasswordVerify.tsx`
  - `src/pages/auth/ResetPasswordNew.tsx`
  - `supabase/functions/_shared/email-templates/recovery.tsx`
  - `supabase/functions/_shared/email-templates/magic-link.tsx`
  - `supabase/functions/auth-email-hook/index.ts`
- Also audit routes in `src/App.tsx` for any old `/reset-password` link destination.
- The email domain currently shows as pending, so default emails may still be used until Cloud email setup finishes. The code fix will remove the link trigger from the app and make the custom templates OTP-only when active.