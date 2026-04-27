## Goal

Wire up branded, Motonita-styled auth emails for the entire flow — forgot password (6-digit code), signup verification (6-digit code), magic link, invite, email change, and reauthentication — all sent from `notify.motonita.ma` via Lovable's built-in email infrastructure (no Resend account needed).

## Heads-up about Resend

You linked `resend.com`. Lovable already has a built-in transactional email system that works exactly the same way — no API key, no signup, no monthly fee — and your domain `notify.motonita.ma` is already configured for it. I'll use the built-in system. If you specifically want to switch to Resend later, we'd need to remove the NS delegation at your registrar first; happy to do that on request, but it's not necessary.

## Current State

- ✅ `notify.motonita.ma` configured (DNS still verifying — emails activate automatically once DNS is green)
- ✅ `auth-email-hook` edge function exists and routes all 6 auth event types
- ✅ All 6 template files exist in `supabase/functions/_shared/email-templates/`
- ✅ Frontend pages exist: `ForgotPassword.tsx`, `ResetPasswordVerify.tsx`, `ResetPasswordNew.tsx`, `VerifyEmail.tsx` (already using `verifyOtp` for 6-digit codes)
- ✅ `useAuthStore` already calls `resetPasswordForEmail` and `verifyOtp` correctly
- ⚠️ Only `recovery.tsx` and `signup.tsx` have Motonita styling. The other 4 templates still use generic black/Arial defaults.

## Changes

### 1. Re-style 4 remaining email templates with Motonita brand

Apply the same brand system already used in `recovery.tsx` to:

- `magic-link.tsx` — login link email
- `invite.tsx` — agency team invitation email
- `email-change.tsx` — confirm new email address
- `reauthentication.tsx` — sensitive-action 6-digit code

Brand tokens applied to every template:
- Background: white `#ffffff`
- Body text: forest `#163300`
- Muted text: `rgba(22, 51, 0, 0.7)`
- Footer text: `rgba(22, 51, 0, 0.55)`
- Primary CTA button: lime `#9FE870` background, forest `#163300` text, `border-radius: 12px`
- 6-digit code box: lime tint `rgba(159, 232, 112, 0.18)` background, forest border, large mono font with letter-spacing
- Font: Inter stack with system fallbacks
- Container: 480px max-width, 32px padding

### 2. Add Motonita logo header to all 6 templates

- Use the existing `favicon.svg` (or upload a wider wordmark to a new `email-assets` storage bucket if you prefer — let me know)
- Add a small logo + "Motonita" wordmark at the top of every template (forest text, lime accent dot)
- Footer: "Motonita SARLAU · Casablanca · motonita.ma" in muted forest

### 3. Localize subject lines and copy

Subjects already exist in the hook. Refine for clarity:
- `signup` → "Confirm your Motonita account"
- `recovery` → "Reset your Motonita password"
- `magiclink` → "Your Motonita login link"
- `invite` → "You've been invited to Motonita"
- `email_change` → "Confirm your new Motonita email"
- `reauthentication` → "Your Motonita verification code"

Copy stays in English (matches default site language). Arabic/French versions are out of scope for this round — happy to add multi-language detection later if you want it.

### 4. Redeploy the auth-email-hook

After template edits, redeploy so Supabase serves the new code (edge functions don't auto-pick up template changes).

## Out of Scope (ask if you want any of these)

- Switching to Resend instead of Lovable's built-in email
- Arabic / French versions of the email templates
- Custom email-assets storage bucket with a PNG/SVG wordmark logo (currently planning to use `favicon.svg`)
- Changing the 6-digit code length, expiry, or rate limits (Supabase defaults stay)
- Welcome / onboarding emails (those are transactional, not auth — separate setup)

## Technical Notes

- All edits stay inside `supabase/functions/_shared/email-templates/*.tsx` and one redeploy of `auth-email-hook`
- No DB migrations, no new edge functions, no new env vars
- Email body background must remain white (#ffffff) per email client compatibility — dark mode of the app does NOT carry into emails
- Once DNS for `notify.motonita.ma` finishes verifying, emails ship automatically; until then, default Lovable templates are sent as a fallback
