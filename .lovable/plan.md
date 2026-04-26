## Goal

Replace the "click the reset link" experience with a clean **6-digit code** flow for ALL registered users (renters, agencies, admins). Fix every piece of wording (EN/FR/AR) and ship a branded recovery email that shows only the 6-digit code.

## What's already in place (good news)

- Routes exist: `/forgot-password`, `/reset-password/verify`, `/reset-password/new`.
- `ResetPasswordVerify.tsx` already uses a 6-digit `OtpInput` and calls `supabase.auth.verifyOtp({ type: "recovery", token: code })` — this works for all Supabase users.
- Backend supports it: `resetPasswordForEmail` always issues a 6-digit recovery OTP for every user; we just need to surface it instead of pushing the link.

## Bugs / gaps to fix

### 1. `ForgotPassword.tsx` — does NOT send the user to the OTP screen
After successful send it just shows a "Check your email for a reset link" message. Fix:
- After `requestPasswordReset(email)` succeeds, **navigate to `/reset-password/verify?email=…`** instead of showing the inline "sent" card.
- Update copy: "We'll email you a 6-digit code" / button label "Send code".

### 2. `Auth.tsx` — legacy inline forgot-password block uses "reset link" wording and `redirectTo: /reset-password`
- Replace the inline `handleSendOTP` form with a redirect: when the user clicks "Forgot password?", navigate to `/forgot-password` (the dedicated page). Remove the `showForgotPassword` modal block and the dead `handleResetPassword` no-op. This keeps a single, consistent flow.

### 3. `useAuthStore.requestPasswordReset` — drop `redirectTo` (or keep harmless)
- Remove `redirectTo` (we don't need a magic-link landing page anymore). Supabase will still send the 6-digit token in the email. Keeping it doesn't break OTP, but removing it stops the link from looking like the primary CTA in the default template.

### 4. `ResetPasswordNew.tsx` — keep the internal-token path, drop the email-link fallback wording
- The page already supports the internal token from `verifyResetCode`. Tidy: remove the "if reset link expired" Supabase-session fallback messaging, since users will always arrive here via the 6-digit verify step. Keep the actual `supabase.auth.updateUser({ password })` call (a recovery session is established by `verifyOtp`).

### 5. Wording cleanup — EN, FR, AR
Update every string referring to "reset link", "click the link", "magic link":

| Key (mockAuth.* / auth.*) | New EN | New FR | New AR |
|---|---|---|---|
| `send_reset_link` | "Send code" | "Envoyer le code" | "إرسال الرمز" |
| `reset_email_sent_title` | "Check your email" | "Consultez votre email" | "تحقق من بريدك" |
| `reset_email_sent_body` | "We sent a 6-digit code to {{email}}. Enter it on the next screen." | "Nous avons envoyé un code à 6 chiffres à {{email}}." | "أرسلنا رمزًا من 6 أرقام إلى {{email}}." |
| `reset_password_sub` | "Enter your email and we'll send you a 6-digit code." | "Entrez votre email pour recevoir un code à 6 chiffres." | "أدخل بريدك لتلقي رمز من 6 أرقام." |
| Any "reset link" / "lien de réinitialisation" / "رابط" | replace with "code" / "code" / "رمز" |

Files to grep/update:
- `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ar.json` (under `mockAuth` and `auth`)
- `src/locales/translations.ts` (mirror of the JSONs)
- Inline `defaultValue:` strings in `ForgotPassword.tsx`, `ResetPasswordVerify.tsx`, `ResetPasswordNew.tsx`, `Auth.tsx`

### 6. Custom recovery email template (so the email itself is code-only)
By default Supabase's recovery email includes both `{{ .Token }}` and `{{ .ConfirmationURL }}`. To make the experience truly code-only:

- Scaffold Lovable auth email templates (`scaffold_auth_email_templates`)
- Re-style with Motonita brand: lime `#9FE870` accent, deep forest `#163300` text, white background, Inter font
- In `recovery.tsx`, render the **6-digit code in a large, copyable badge** as the primary content. Do NOT render any magic-link button. Add a small line: "This code expires in 60 minutes."
- Localize the recovery email body: render in EN/FR/AR if the user's `language` metadata is set; otherwise default to EN with FR/AR sections beneath. (Simple approach: ship EN-only first; we can iterate.)
- Deploy `auth-email-hook` so the new template goes live.

### 7. Routing safety net
- If a user still clicks an old magic-link from a previously-sent email and lands on `/reset-password/new` with a recovery hash, keep the existing Supabase-session fallback so the password update still works (no regression for in-flight reset emails).

### 8. Testing checklist (manual, after implementation)
- Renter user → `/forgot-password` → submit email → redirected to `/reset-password/verify` → email arrives → enter 6-digit code → land on `/reset-password/new` → set new password → routed to `/rent`.
- Agency user → same flow → routed to `/agency/dashboard` (or verification).
- Admin user → same flow → can sign in afterwards and access `/admin/panel`.
- Wrong code → shake + error + clears digits.
- Expired code (after 60 min) → "Request new code" CTA visible.
- Resend cooldown enforced (60s).
- All three languages render correctly (RTL preserved for AR).

## Files to edit

1. `src/pages/auth/ForgotPassword.tsx` — navigate to verify page on success; update copy.
2. `src/pages/auth/ResetPasswordVerify.tsx` — copy polish only (already OTP-based).
3. `src/pages/auth/ResetPasswordNew.tsx` — remove "link expired" wording; keep functionality.
4. `src/pages/Auth.tsx` — replace inline forgot-password block with a redirect to `/forgot-password`; remove dead `handleSendOTP` / `handleResetPassword`.
5. `src/stores/useAuthStore.ts` — drop `redirectTo` in `requestPasswordReset`.
6. `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ar.json`, `src/locales/translations.ts` — wording updates.
7. New: `supabase/functions/auth-email-hook/*` and `supabase/functions/_shared/email-templates/recovery.tsx` (+ siblings) via the auth-email scaffold tool, then customize `recovery.tsx` to be code-first and brand-styled, then deploy.

## Out of scope

- Phone-based password reset (current flow is email-only — same as today).
- Changing the 60-minute Supabase OTP expiry (default is fine).
