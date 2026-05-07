## Goal

Split password rules by role:
- **Renters**: accept anything (min 8 chars only, no breach check, no strength UI).
- **Agencies**: require a strong password, show step-by-step guidance, and offer a "Suggest strong password" button (generated client-side, copy-to-clipboard + autofill).

## Important constraint

The "password appeared in a public data breach" error comes from Supabase's global **HIBP (Have I Been Pwned)** setting. It's account-wide — it can't be turned on for agencies only and off for renters only at the auth layer.

To honor your request ("don't show this error to renters, even if it's breached"), I will **disable HIBP globally** and instead enforce strength **client-side**, branched by role:
- Renter signup → loose rules, no breach check.
- Agency signup → strong rules + clear guidance + suggest-password button.

This is the only way to make renters bypass the breach error while keeping agencies strict. If you'd rather keep HIBP on for everyone (and just hide the message for renters with a friendlier wording), tell me and I'll do that instead.

## Changes

### 1. Disable global HIBP breach check
Call the auth config tool to set `password_hibp_enabled = false`. Renters will no longer see the breach error.

### 2. Renter signup (`Signup.tsx` when `defaultRole !== "agency"`)
- Min length: 8 characters. No uppercase/number/symbol requirement.
- Hide `<PasswordStrengthIndicator />`.
- No breach warning.

### 3. Agency signup (`Signup.tsx` when `defaultRole === "agency"`)
- Keep current strict rules: 8+ chars, uppercase, lowercase, number, special char.
- Reject common passwords from `COMMON_PASSWORDS` set (already in `mockAuth.ts`) — replaces the lost HIBP check with a basic local blacklist.
- Show `<PasswordStrengthIndicator />` (already exists).
- Add a new **"How to pick a strong password"** collapsible help block above the password field with 4 short steps:
  1. Mix uppercase + lowercase + numbers + symbols
  2. At least 12 characters
  3. Don't reuse passwords from other sites
  4. Use a password manager (Google, 1Password, Bitwarden)
- Add a **"Suggest a strong password"** button that:
  - Generates a 16-char cryptographically random password (uppercase, lowercase, digit, symbol guaranteed) using `crypto.getRandomValues`.
  - Fills both `password` and `confirmPassword` fields.
  - Reveals the password (sets visible state) and copies it to clipboard with a toast: "Password copied — save it in your password manager (e.g. Google)".

### 4. Validation schema split (`validationSchemas.ts`)
- Add `renterSignupSchema` (loose: 8+ chars only).
- Add `agencySignupSchema` (strong: 8+ chars + complexity regex + not in `COMMON_PASSWORDS`).
- Existing `signupSchema` stays as alias for agency (or is replaced where used).

### 5. Password reset (`ResetPasswordNew.tsx`)
- Same split based on the user's role at reset time. If we can't reliably know the role on the reset page, default to **loose** rules (since strict-by-default would lock out renters who already have weak passwords). I'll confirm role detection while implementing; if not available, loose-only on reset is the safe default.

## Files to change

- `src/pages/auth/Signup.tsx` — branch validation + UI by `defaultRole`, add help block + suggest button.
- `src/lib/validationSchemas.ts` — add `renterSignupSchema` and `agencySignupSchema`.
- `src/lib/passwordGenerator.ts` *(new)* — `generateStrongPassword(length=16)` helper using `crypto.getRandomValues`.
- `src/pages/auth/ResetPasswordNew.tsx` — apply loose rules (or branch if role known).
- Auth config: turn off `password_hibp_enabled` globally.

## Out of scope

- No backend/RLS changes.
- No changes to login flow (login already accepts any existing password).
- No translations added beyond the new strings (will use existing i18n pattern; English first, French/Arabic can follow in a separate pass if you want).

## One quick confirmation before I implement

Disabling HIBP globally is the only way to fully suppress the breach error for renters. Want me to proceed with that, or keep HIBP on and just soften the message?
