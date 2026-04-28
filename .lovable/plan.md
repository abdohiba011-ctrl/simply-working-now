## Goal

Stop sending "click this link" magic-link buttons in auth emails. Instead, display the **6-digit OTP code** so users can type it into the existing `/verify-email` and `/reset-verify` pages (which already call `supabase.auth.verifyOtp`).

## Why it's currently broken

The `auth-email-hook` already receives both the URL and the `token` (6-digit code) from the auth system. But the React Email templates only render `confirmationUrl` as a button — the `token` is silently dropped. Users get a link, click it, and bypass our OTP-based verification flow.

The shared brand file (`_brand.tsx`) already defines `styles.codeWrap` and `styles.code` (36px, mono, lime tint background) — clearly designed for OTPs but never wired up.

## Changes

### 1. `auth-email-hook/index.ts`
- Pass `token` into `templateProps` for **all** templates (currently only `reauthentication` uses it).
- Add `token` to `SAMPLE_DATA` for `signup`, `magiclink`, `recovery`, `email_change`, `invite` so previews render correctly.

### 2. Rewrite 5 templates to display the OTP code

For each of `signup.tsx`, `magic-link.tsx`, `recovery.tsx`, `email-change.tsx`, `invite.tsx`:
- Remove the `<Button href={confirmationUrl}>` CTA entirely.
- Add a centered `{token}` block using `styles.codeWrap` + `styles.code` (the brand file already defines these).
- Add small note: "Enter this 6-digit code in the verification page. The code expires in 60 minutes." (translated/adapted per template purpose).
- Keep `BrandHeader` / `BrandFooter`.
- Update `Preview` text and `Heading` to reflect "Your verification code" / "Your reset code" / etc.
- Add new prop `token: string` to each template's interface.

`reauthentication.tsx` already uses the token — leave as-is (verify quickly).

### 3. Redeploy `auth-email-hook`

After file changes, deploy the edge function so the new templates take effect immediately.

## Out of scope

- No changes to `useAuthStore.ts`, `/verify-email`, or `/reset-verify` — they already call `verifyOtp` correctly.
- No changes to email subjects or queue infrastructure.
- No changes to brand colors / layout (already on-brand).

## Files touched

- `supabase/functions/auth-email-hook/index.ts` (pass `token`, add to sample data)
- `supabase/functions/_shared/email-templates/signup.tsx` (rewrite)
- `supabase/functions/_shared/email-templates/magic-link.tsx` (rewrite)
- `supabase/functions/_shared/email-templates/recovery.tsx` (rewrite)
- `supabase/functions/_shared/email-templates/email-change.tsx` (rewrite)
- `supabase/functions/_shared/email-templates/invite.tsx` (rewrite)

## Verification after deploy

User signs up → receives email with a 6-digit code → enters code on `/verify-email` → account confirmed. No magic links anywhere.
