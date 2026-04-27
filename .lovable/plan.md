## Goal

A clean, professional, email-only auth flow with no Google sign-in anywhere. Three flows, all using your branded `notify.motonita.ma` emails:

1. **Sign up** → email + password + confirm password → 6-digit code emailed → enter code → logged in
2. **Log in** → email + password → logged in (blocked with "Verify your email" message if not yet verified)
3. **Forgot password** → email → 6-digit code emailed → enter code → set new password → logged in

## Heads-up

A *huge* amount of this is already built and working — your project already has the OTP signup verification page, forgot-password page, reset-verify page, reset-new-password page, and the Motonita-branded emails (deployed last turn). The actual changes needed are smaller than the request implies. I'm being explicit about what stays, what goes, and what gets touched so you know exactly what's happening.

## What's already in place (kept as-is)

- ✅ `/signup` & `/agency/signup` — email + password + confirm password forms with strength meter, password rules, terms checkbox
- ✅ `/verify-email?email=...` — 6-digit OTP input, resend with cooldown, change-email link
- ✅ `/login` & `/agency/login` — email/phone + password
- ✅ `/forgot-password` — email entry → triggers OTP send
- ✅ `/reset-password/verify` — 6-digit OTP for password reset
- ✅ `/reset-password/new` — set new password after verifying
- ✅ `useAuthStore` already calls `supabase.auth.signUp`, `verifyOtp({type:'signup'})`, `resetPasswordForEmail`, `verifyOtp({type:'recovery'})`, `signInWithPassword` correctly
- ✅ Branded emails (recovery, signup, magic-link, invite, email-change, reauthentication) shipping from `notify.motonita.ma` with Motonita forest+lime brand, 6-digit code box, brand header & footer

## Changes — Remove every Google touch-point

### 1. Strip Google from auth pages (UI + handlers)

- `src/pages/auth/Login.tsx` — remove `<GoogleSignInButton />` block, the "OR" divider, the `import GoogleSignInButton`, and the "this account uses Google" error branch
- `src/pages/auth/Signup.tsx` — remove `<GoogleSignInButton />` block and "OR" divider, the import, and the `oauth_only` `checkAccountMethod` branch (no longer reachable in pure password flow)
- `src/pages/auth/AgencyLogin.tsx` — same treatment
- `src/pages/auth/AgencySignup.tsx` — same treatment
- `src/pages/Auth.tsx` (legacy unified auth page) — remove `handleGoogleSignIn`, the "Continue with Google" button, the troubleshooting accordion, and OAuth error redirect handling
- `src/components/auth/GoogleSignInButton.tsx` — delete file
- `src/integrations/lovable/index.ts` — leave intact (the Lovable SDK; we just stop calling `signInWithOAuth`)
- Localization keys for `googleSignIn*`, `signUpWithGoogle*`, `continueWithGoogle*`, `completingGoogle` — leave the strings (harmless), or remove on request

### 2. Enforce email confirmation server-side

Use the auth-config tool to disable Supabase's auto-confirm so the 6-digit code is always required for new signups. Without this, signups could log in instantly without verifying. After this change:

- New signup → no session returned → user routed to `/verify-email`
- Login attempt before verification → blocked with "Please verify your email first — check your inbox for the 6-digit code" + a "Resend code" link

The store already handles both cases — this just guarantees the verify step runs every time.

### 3. Polish copy & consistency

- Login page: replace "Email or phone" label with just **"Email"** (the request was email-only). Phone login stays disabled in this round; the existing phone normalization code is kept but unused.
- Signup pages: confirm the "Confirm password" field is visible and validates equality (already done — just verifying)
- VerifyEmail page: tighten the headline to **"Confirm your email"** and subtitle to **"We sent a 6-digit code to {email}. Enter it below to activate your account."**
- ForgotPassword page: align copy with the same tone
- All button colors stay on Motonita brand (lime + forest)

### 4. Visual polish (light pass, not a redesign)

- Remove the now-unused "OR" dividers
- Center the form a bit tighter without the OAuth column
- Keep the existing AuthLayout, password strength meter, and 6-digit OTP box (already on-brand)

## Out of Scope

- Phone/SMS login (kept disabled but code untouched in case you want it later)
- Apple / SAML / any other social provider
- Multi-language polish for newly-changed copy (i18n keys updated; FR/AR translations can be added later if you want)
- Switching to a third-party email provider (Resend) — emails already ship from your domain via Lovable's built-in system

## Technical Notes

- All edits are inside `src/pages/auth/*` and `src/pages/Auth.tsx`; one file deletion (`GoogleSignInButton.tsx`)
- One backend change: turn off auto-confirm via the auth-config tool (no migration, no edge function)
- No DB schema changes, no RLS changes, no new tables
- Memory note: the existing memory says "auto email confirmation" — I'll update that memory rule to "6-digit OTP required for signup, password reset, and reauthentication"
