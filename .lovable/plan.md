I found the current failure is happening in the managed Google OAuth helper while exchanging the authorization code. The latest console/session data shows it occurs on the preview URL inside an iframe/popup flow, which is a known place where the preview fetch/proxy can interfere with auth token exchange. I’ll make the auth flow more robust and stop users from hitting the broken preview-specific path.

Plan:

1. Update the Google sign-in handler in `src/pages/Auth.tsx`
   - Detect when the app is running inside Lovable preview/iframe.
   - Instead of opening Google in the iframe popup flow, send the user to the published production URL auth page in a top-level tab/window context.
   - Keep the production flow on the same origin once it starts, so the OAuth state/code exchange matches correctly.

2. Add a safe return-path handoff
   - Preserve `returnUrl` where appropriate.
   - Only allow internal return paths, not arbitrary external redirects.
   - After successful Google sign-in, continue using the existing role-based redirect logic.

3. Clean up stale/conflicting OAuth code
   - Remove or stop relying on the old `oauthDomain.ts` custom-domain workaround comments/functions, because they contradict the current managed OAuth behavior and can lead to more cross-domain state issues.
   - Do not edit the auto-generated Lovable auth integration file.
   - Revert the manual Supabase auth client OAuth options if needed, because the generated client should not be manually maintained and the managed Lovable OAuth helper is responsible for the flow.

4. Improve the user-facing error state
   - If OAuth returns `error` / `error_description`, clear the broken URL parameters and show a clearer message like: “Google sign-in could not finish here. Please open the live site and try again.”
   - Keep the “Signing you in…” interstitial for real callback token processing.

5. Verify after implementation
   - Run TypeScript/build checks.
   - Test that clicking Google sign-in from preview redirects out to the live site instead of failing inside the iframe.
   - Confirm the live-site path remains `https://motonita.ma/auth` and does not jump between `www`, preview, and published domains during the same OAuth attempt.

Technical note:
The preview error is consistent with the known OAuth preview limitation: the preview environment can interfere with auth POST/token exchange. The fix is to avoid completing Google OAuth inside the preview iframe and force the real sign-in attempt to happen on the live, top-level site.