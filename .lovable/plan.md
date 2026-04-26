# Fix misleading login error

## Root cause (confirmed via database query)

Your account `abdrahimbamouh56@gmail.com` exists, has a password, and **just successfully signed in moments ago** (`last_sign_in_at: 2026-04-26 22:57:58`). So the credentials work.

However, you also have **3 lookalike accounts** that confuse login attempts:
- `abdrahimbamouhd56@gmail.com` (extra `d`)
- `abdrahimbamouhs56@gmail.com` (extra `s`)
- `bamouhabdrahim57@gmail.com` (Google-only — no password set, will ALWAYS fail email/password login)

Supabase always returns the same generic "Invalid login credentials" for security, which hides what's actually wrong.

## Plan

### 1. Smarter login error detection (`src/pages/auth/Login.tsx` + `useAuthStore.ts`)
When Supabase returns `invalid_credentials`, before showing the generic error:
- Call a new edge function `check-account-method` that looks up the email in `auth.users` and returns:
  - `not_found` → show "No account exists for this email. Sign up?"
  - `oauth_only` (provider is google, no password) → show **"This account was created with Google. Please use 'Continue with Google'."** + highlight the Google button
  - `has_password` → show standard "Incorrect password. Forgot it?" with a clear link to `/forgot-password`

### 2. New edge function `check-account-method`
- Public function (no JWT required)
- Input: `{ email }`
- Uses service role key to query `auth.users` for the email and inspect `encrypted_password` and `raw_app_meta_data.providers`
- Output: `{ status: 'not_found' | 'oauth_only' | 'has_password' }`
- **Privacy-safe**: only triggered AFTER a failed login attempt, rate-limited per IP, never reveals passwords or any PII

### 3. Block silent duplicate-account creation (`src/pages/auth/Signup.tsx`)
Add a pre-signup check: if email already exists, show a clear message ("An account already exists with this email — sign in instead") and prevent the lookalike duplicates problem in the future.

### 4. Optional cleanup helper (admin only)
Add an entry in the Admin panel to **merge / delete** the lookalike duplicate accounts for `abdrahimbamouh*56@gmail.com`. Requires user (you) to confirm which account is the canonical one to keep.

### Files to change
- `src/pages/auth/Login.tsx` — branch error UI on detected account state
- `src/stores/useAuthStore.ts` — call check function on `invalid_credentials`
- `src/pages/auth/Signup.tsx` — pre-flight email existence check
- `supabase/functions/check-account-method/index.ts` *(new)*
- `supabase/config.toml` — register new function with `verify_jwt = false`
- `src/locales/en.json` / `fr.json` / `ar.json` — new error strings

### What you should do RIGHT NOW (before approving the plan)
- The email that works is **`abdrahimbamouh56@gmail.com`** (no extra letter). Use that one.
- If you were trying `bamouhabdrahim57@gmail.com`, click **Continue with Google** instead — that account has no password.
