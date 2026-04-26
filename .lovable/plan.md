I found the Google flow is still using custom domain/iframe breakout code in `src/pages/Auth.tsx` and `src/lib/oauthDomain.ts`. The live error URL (`https://motonita.ma/#error=server_error&error_description=failed+to+exchange+authorization+code...`) means Google completed, but the backend OAuth broker failed while exchanging Google’s code. The app should not keep adding custom redirects around Lovable Cloud’s managed Google OAuth; it should use the standard same-origin broker flow and then verify the backend Google provider/domain setup.

Plan to make sign-in work:

1. Remove conflicting OAuth redirect logic
   - Update `src/pages/Auth.tsx` so the Google button calls only:
     - `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
   - Remove the forced redirect to `https://motonita.ma/auth` and the `canCompleteOAuthHere(...)` gate.
   - Keep only simple handling for returned errors/tokens.

2. Stop maintaining custom OAuth domain helpers
   - Remove or simplify `src/lib/oauthDomain.ts` so it no longer controls whether OAuth can run.
   - Keep the managed OAuth package as the source of truth, because it already handles top-level vs iframe behavior.

3. Standardize login/signup entry points
   - The app currently has two auth systems/routes: `/auth` and newer `/login`/`/signup` pages.
   - Make the public header/login/signup links consistently use the real Cloud auth flow that includes Google sign-in.
   - If needed, add the Google button to the `/login` and `/signup` pages too, or redirect those routes to `/auth` to avoid users landing on a different auth implementation.

4. Fix post-login routing/session detection
   - After Google succeeds, wait for the auth session and route the user to the correct place:
     - pending booking → booking review
     - business role → agency/business dashboard
     - normal renter → home/search
   - Clean `#error=...` or `#access_token=...` URL fragments after handling them, so users are not stuck seeing old OAuth errors.

5. Validate Lovable Cloud Google configuration
   - Refresh/reconfigure the managed Google auth provider if available in build mode.
   - If the backend is using custom Google credentials, verify the configured Google Client ID/Secret and the Google redirect URL from Lovable Cloud Auth settings. A bad or stale client secret is the most likely cause of `failed to exchange authorization code` after Google says “Continue”.
   - Confirm both `motonita.ma` and `www.motonita.ma` are active domains, with one primary domain to avoid cross-domain confusion.

6. Test and verify
   - Run TypeScript/build checks.
   - Test the Google button on the published/custom domain, not only inside preview.
   - Confirm the callback no longer lands on `#error=server_error` and that the user becomes authenticated after clicking Continue.

Technical notes:
- I will not edit the auto-generated `src/integrations/lovable/index.ts` or `src/integrations/supabase/client.ts`.
- The persistent `failed to exchange authorization code` is usually backend/provider configuration, not a React rendering issue. The code cleanup removes app-side causes; if it still fails after that, the remaining fix is updating the Google credentials/redirect URL in Lovable Cloud Authentication settings.