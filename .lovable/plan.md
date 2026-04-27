## What I found

The app is already using Lovable Cloud's Google OAuth helper on `/login`, and there are no recent backend auth logs for the failed attempt. That means the failure is happening before the login reaches the backend, usually in the OAuth browser/callback step.

The user-facing error is currently too vague: "Google sign-in could not finish. Please try again or use email sign-in." I will make it easier to diagnose and test.

## Plan

1. Improve the Google sign-in error message
   - Keep the simple error for normal users.
   - Add a clearer troubleshooting action that tells the tester to use the live domain, not the Lovable preview.
   - Preserve the actual OAuth error text in the console for debugging.

2. Add production Google login test guidance directly to the login page
   - Show a small help/troubleshooting section near the Google button.
   - Include these exact production test steps:
     1. Open a new incognito/private window.
     2. Go to `https://motonita.ma/login`.
     3. Click `Continue with Google`.
     4. Choose a Google account.
     5. Confirm you return to Motonita signed in.

3. Add exact callback URLs to verify if login fails
   - Show the exact URLs the user should check in Google Cloud Console / OAuth settings:
     - `https://motonita.ma/~oauth/callback`
     - `https://www.motonita.ma/~oauth/callback`
     - `https://simply-working-now.lovable.app/~oauth/callback`
     - `https://oauth.lovable.app/callback`
   - Also show the JavaScript origins to verify:
     - `https://motonita.ma`
     - `https://www.motonita.ma`
     - `https://simply-working-now.lovable.app`
     - `https://oauth.lovable.app`

4. Make preview testing safer
   - The reusable Google button already redirects preview users to `motonita.ma`, but the main `/login` page has its own Google handler.
   - I will add the same preview guard to the `/login` handler so clicking Google in preview opens the live domain instead of failing.

5. Keep all visible text multilingual-ready
   - Add or reuse i18n strings instead of hardcoding new login-page text.
   - Keep the layout mobile-friendly at 375px.

## Technical details

- Files likely to update:
  - `src/pages/Auth.tsx`
  - `src/components/auth/GoogleSignInButton.tsx` if shared behavior needs alignment
  - `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ar.json`
- No database changes are needed.
- No changes to generated auth client files.
- No backend function changes are needed.