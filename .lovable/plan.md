## Problem

The Google flow itself is working server-side — the auth logs show successful logins for `bellaoumaima550@gmail.com`, `abdrahimbamouh56@gmail.com`, and others (`action: login, login_method: token, status: 200`). Tokens are being issued by Google and the broker.

What's broken is the **frontend handoff after the redirect back to `motonita.ma`**:
1. Google redirects to `https://motonita.ma/auth#access_token=...&refresh_token=...`
2. Supabase's `detectSessionInUrl` should pick up the tokens and create a session — but our client config (`src/integrations/supabase/client.ts`) doesn't explicitly enable it, and the URL hash is being stripped/handled by other code paths before supabase sees it.
3. Result: tokens sit in the URL, no session is created, `isAuthenticated` stays `false`, and the Auth page just re-renders itself ("stays in its place") — exactly what the user described.

## Root cause

Two compounding issues:

**A. `detectSessionInUrl` not explicit.** While it defaults to `true`, the `flowType` is also unset. The Lovable broker uses an **implicit flow** (returns tokens in the URL hash), which requires `flowType: 'implicit'` on the supabase client to be reliably parsed. Without it, supabase-js may try PKCE exchange and fail silently, leaving the tokens unprocessed.

**B. Hash-error handler in `Auth.tsx` (lines 117–126) clears the URL hash unconditionally if it contains `error=`** — and on some redirects the hash includes both tokens AND a benign warning, but more importantly, **other navigations** (e.g. the `www → apex` redirect on line 111) drop the hash entirely. If a user lands on `www.motonita.ma/auth#access_token=...`, we redirect to `motonita.ma/auth` and **lose the tokens**.

## Fix

1. **`src/integrations/supabase/client.ts`** — explicitly enable hash-based session detection so supabase-js reliably picks up `#access_token=...` after the OAuth redirect:
   ```ts
   auth: {
     storage: localStorage,
     persistSession: true,
     autoRefreshToken: true,
     detectSessionInUrl: true,
     flowType: 'implicit',
   }
   ```

2. **`src/pages/Auth.tsx`** — fix the `www → apex` canonicalization to **preserve the URL hash** when redirecting (currently it drops `window.location.hash` for the apex case in some browsers). Build the target URL as `pathname + search + hash` (already done) but **only redirect if there are no OAuth tokens in the hash** — otherwise let supabase consume them on this host first, then optionally canonicalize.

3. **`src/pages/Auth.tsx` redirect-on-auth effect** — currently it only watches `[authLoading, isAuthenticated, ...]`. Add a tiny grace-period: when the page loads with `#access_token=` in the URL, show a "Signing you in…" spinner instead of the login form, so the user doesn't see the same auth page flash and think nothing happened. After supabase-js processes the hash and `isAuthenticated` flips, the existing redirect runs.

4. **Sanity check** — add a one-time console log + toast if we land on `/auth` with a hash containing `access_token` but supabase fails to set a session within ~3 seconds, so future debugging is instant.

No backend / Supabase config changes are needed (the broker is correctly configured — auth logs prove logins succeed).

## Files to edit

- `src/integrations/supabase/client.ts` — add `detectSessionInUrl: true` and `flowType: 'implicit'`
- `src/pages/Auth.tsx` — preserve hash on www→apex redirect; add "Signing you in…" interstitial when tokens are present in the URL hash; add 3-second sanity-check toast

## Out of scope

- No changes to `src/integrations/lovable/index.ts` (auto-generated, do not touch).
- No changes to `src/lib/oauthDomain.ts` — the same-origin strategy is correct and the auth logs confirm it works.
- No changes to `/login` and `/signup` pages — they don't expose Google sign-in (and per memory the OAuth entry point lives on `/auth`).
