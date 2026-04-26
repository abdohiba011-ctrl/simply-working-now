/**
 * Production origin where Google sign-in must complete.
 *
 * Lovable Cloud's managed OAuth helper opens Google in a popup or top-level
 * navigation. When the app is loaded inside the Lovable preview iframe, the
 * preview environment can interfere with the OAuth token exchange, producing
 * "failed to exchange authorization code". To avoid this, the Google
 * sign-in button bounces the user out of the preview to this origin and
 * starts the OAuth flow there.
 */
export const PRIMARY_PRODUCTION_ORIGIN = "https://motonita.ma";

/**
 * Returns true when the page is running inside an iframe that is NOT the
 * top-level browser tab. This covers the Lovable preview iframe and any
 * embedded preview/test surface.
 */
export function isRunningInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin iframe access throws — treat as iframe.
    return true;
  }
}

/**
 * Decide whether the current location can reliably complete Google OAuth.
 * Returns true when we are on the production custom domain (top-level).
 */
export function canCompleteOAuthHere(currentOrigin: string): boolean {
  if (isRunningInIframe()) return false;
  return currentOrigin === PRIMARY_PRODUCTION_ORIGIN;
}
