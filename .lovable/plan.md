I found why this is still failing. The current auth code is mixing OAuth hosts and forcing the callback to `https://motonita.ma`, while Lovable Cloud’s Google OAuth helper expects the initiation and callback state to stay in the same managed OAuth flow. That mismatch is exactly what causes: “failed to exchange authorization code state”.

Plan:

1. Restore the Google sign-in flow to the supported Lovable Cloud pattern
   - In `src/pages/Auth.tsx`, call `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` from the same site the user is on.
   - Remove the forced redirect to `https://motonita.ma/auth?startGoogleOAuth=1` before Google starts.
   - Remove the auto-start `startGoogleOAuth` logic that can trigger a second OAuth attempt and invalidate state.

2. Clean up the custom OAuth domain helper usage
   - Stop using `PRIMARY_PRODUCTION_ORIGIN` for the OAuth `redirect_uri`.
   - Leave normal domain canonicalization only where it is safe, but never in the middle of an OAuth callback.
   - Remove or stop importing unused helper code if it is no longer needed.

3. Keep the user experience clear
   - Keep the “Signing you in…” interstitial for successful token callbacks.
   - Improve the error handling so if Google returns an error hash/query, the user sees a clear message and the broken callback params are removed.

4. Verify after changes
   - Type-check/build the project.
   - Test the login button behavior in preview enough to confirm it initiates the managed OAuth route correctly.
   - Note: the real Google consent flow must be validated on the published/custom domain after deployment, because Google OAuth cannot be fully completed from my side with your Google account.

Technical details:

- The installed `@lovable.dev/cloud-auth-js` helper generates a `state`, sends it to `~oauth/initiate`, and validates the returned state/tokens. The app should not move the flow from preview/published/custom domain to another origin manually.
- The previous forced canonical-domain workaround can break state/cookie binding, producing the exact authorization-code exchange failure you are seeing.
- I will not change generated Lovable integration files or the auto-generated backend client file unless absolutely necessary.