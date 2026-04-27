## Diagnosis

The app uses **Lovable Cloud Auth (managed OAuth)** — confirmed in `src/components/auth/GoogleSignInButton.tsx` and `src/pages/Auth.tsx`:

```ts
await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
```

This routes through Lovable's broker (`/~oauth/initiate` → `oauth.lovable.app/callback` → back to `redirect_uri`). I verified the broker returns `302` (healthy) on all three domains: `motonita.ma`, `simply-working-now.lovable.app`, and the preview.

### What `failed to exchange authorization code` actually means here

This error is **not** a misconfiguration in your Google Cloud project or in Supabase. With Lovable Cloud managed OAuth, you do **not** configure Google credentials — Lovable manages them. The error appears specifically when:

1. **The Lovable iframe preview proxy intercepts the token exchange POST** (a known platform-level issue with `id-preview--*.lovable.app`). It does **not** happen on the published domain or `motonita.ma`.
2. The browser already had stale OAuth `#error=...` hash from a prior failed attempt and the user re-loaded.

Per Lovable's own guidance: **the fix is to test on the published / custom domain, not the preview**.

### What we should NOT do

- ❌ Switch to `supabase.auth.signInWithOAuth` directly — would break the managed flow.
- ❌ Add Supabase callback URLs to Google Cloud — managed OAuth doesn't use your Google project.
- ❌ Edit `src/integrations/lovable/index.ts` — auto-generated, not user-editable.

## Plan (changes to make)

### 1. Friendlier error UX in `GoogleSignInButton` and `OAuthHashWatcher`
When the `failed to exchange authorization code` error returns, show a clearer message that tells the user to retry on `motonita.ma` (instead of the technical string). `OAuthHashWatcher.tsx` already has partial handling — extend it to also detect this on the **search params** branch and offer a one-click "Open on motonita.ma" action when we detect the user is on the preview/lovableproject domain.

### 2. Force OAuth onto the canonical domain when user is on `lovableproject.com`
In `GoogleSignInButton.onClick`, detect if `window.location.hostname.endsWith('lovableproject.com')` (the iframe-preview host known to break the exchange) and, if so, redirect the user to `https://motonita.ma/login` first instead of starting OAuth from the broken host. This eliminates the error class entirely for end users hitting the staging URL.

### 3. Sanity-check Lovable Cloud auth settings (no code change, verification only)
After approval, I will run `cloud_status` and check the auth provider is enabled. **No Supabase Site URL or redirect URL changes are needed** for managed OAuth — those settings only apply if the app called `supabase.auth.signInWithOAuth` directly, which it does not.

### 4. Verify on production
Once the above ships, I'll confirm with a clean network trace from `https://motonita.ma/login → Continue with Google → google.com → /~oauth/callback → motonita.ma/` that a session is established.

## Files to change

- `src/components/auth/GoogleSignInButton.tsx` — host guard + better error toast.
- `src/components/OAuthHashWatcher.tsx` — extend hash/search error detection, add CTA when on preview host.

## Files explicitly NOT changed

- `src/integrations/lovable/index.ts` (auto-generated).
- `src/integrations/supabase/client.ts` (auto-generated).
- Any Supabase auth provider config (irrelevant to managed OAuth).

## Expected result

- Users on `motonita.ma` / `www.motonita.ma`: Google login works end-to-end (already does — broker is healthy).
- Users who land on the preview host: get redirected to `motonita.ma/login` so they never hit the iframe proxy bug.
- If an OAuth error ever does come back, they see a clear message instead of a raw URL hash.
