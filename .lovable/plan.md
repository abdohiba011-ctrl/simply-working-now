## Plan to fix login, registration, and forgot-password QA

I’ll fix the auth area as one clean, dedicated Motonita experience — no two-sided green hero page like the screenshot.

### 1. Remove the split auth layout everywhere
- Replace the current two-column `AuthLayout` with a single centered auth card/page.
- Keep the Motonita logo, language selector, and clean Wise-style branding.
- Apply it to login, signup, forgot password, OTP verification, and new password pages.
- Ensure mobile works cleanly at 375px and Arabic RTL still behaves correctly.

### 2. Make forgot password a true 6-digit OTP flow
- Keep `/forgot-password` as the only starting page for password reset.
- User enters email → receives a 6-digit code → enters code → sets new password.
- Remove the confusing password reset link/button experience from the recovery email.
- Update wording everywhere to say “code” / “6-digit code”, not “reset link”.
- Make the OTP screen and new password screen feel like one dedicated flow, not separate unrelated pages.

### 3. Send auth emails from Motonita’s email domain
- Your custom domain `motonita.ma` exists, but the email sender domain is not currently configured for sending.
- To send password reset and verification emails from your Motonita email domain instead of the default `no-reply@auth.lovable.cloud`, I’ll start the email sender setup for `motonita.ma` / `notify.motonita.ma`.
- If DNS setup is required, I’ll show the Cloud email setup dialog and continue after it’s configured.
- Once active, reset emails should show Motonita branding and sender domain, with only the 6-digit code.

### 4. Fix “Remember me” so it has visible behavior
- Save the user’s email/phone when “Remember me” is checked and prefill it on the next visit.
- If “Remember me” is not checked, clear the saved identifier.
- Add session-handling logic so the checkbox actually controls whether the login is kept across browser restarts as much as the current Cloud auth client allows.
- Update label wording if needed so users understand what it does.

### 5. QA login and signup flows
I’ll review and test:
- Login with email/password
- Login with Google account messaging
- Wrong password messaging
- Account exists / duplicate registration handling
- Signup renter flow
- Signup agency flow
- Forgot password → OTP → new password
- Resend code cooldown
- Auth pages in English, French, Arabic
- Desktop and mobile layout

### Technical details
- I’ll update `AuthLayout`, the login/signup/reset pages, and i18n text files.
- I’ll adjust the auth recovery email template so it renders a 6-digit code, not a reset button/link.
- I’ll update the auth email hook sender/site naming so emails say Motonita and use the configured sender domain.
- I’ll add or update tests/smoke checks for the auth pages, then run the project tests and build checks after implementation.