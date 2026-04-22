/**
 * Lovable Cloud's managed OAuth proxy intercepts `/~oauth/initiate` and
 * `/~oauth/callback`. On freshly-connected custom domains the proxy worker
 * sometimes does NOT intercept those paths — the request falls through to
 * the SPA and React Router renders a regular page, which silently breaks
 * Google sign-in (user clicks "Continue", lands back on the auth page,
 * loops forever).
 *
 * To make Google sign-in reliable on every domain, we always start the
 * OAuth dance on the project's `*.lovable.app` published domain (where the
 * proxy is guaranteed to be active) and tell it to send the user back to
 * the original site once tokens are issued. supabase-js then picks the
 * tokens up from the URL hash via its built-in `detectSessionInUrl`.
 */

// Lovable's published domain for this project. The OAuth broker is always
// active here.
export const LOVABLE_PUBLISHED_ORIGIN = "https://simply-working-now.lovable.app";

// Canonical primary domain — the one users should always end up on.
export const PRIMARY_PRODUCTION_ORIGIN = "https://motonita.ma";

// All origins we recognize as "ours". Anything that matches is allowed to
// receive the OAuth callback hash.
const KNOWN_PRODUCTION_ORIGINS = [
  PRIMARY_PRODUCTION_ORIGIN,
  "https://www.motonita.ma",
  LOVABLE_PUBLISHED_ORIGIN,
];

export function isCustomProductionDomain(origin: string): boolean {
  return (
    origin === "https://motonita.ma" || origin === "https://www.motonita.ma"
  );
}

export function isLovableHostedOrigin(origin: string): boolean {
  return /\.lovable\.app$/i.test(new URL(origin).hostname);
}

/**
 * Resolve the redirect_uri we should send to the OAuth broker.
 *
 * - On the custom domain the proxy is unreliable, so we send the user to
 *   the Lovable published origin to start, but ask the broker to redirect
 *   back to our chosen primary domain so the session lands where users
 *   actually live.
 * - On the Lovable-hosted previews / published URL the broker works
 *   natively, so just use the current origin.
 */
export function resolveOAuthRedirectUri(currentOrigin: string): string {
  if (isCustomProductionDomain(currentOrigin)) {
    return PRIMARY_PRODUCTION_ORIGIN;
  }
  return currentOrigin;
}

/**
 * Decide whether we need to bounce the user to a different origin BEFORE
 * starting the OAuth flow. Returns the URL to navigate to, or null if the
 * current origin can start OAuth itself.
 */
export function getOAuthInitiationUrl(currentOrigin: string): string | null {
  if (isCustomProductionDomain(currentOrigin)) {
    // Send them to the published Lovable domain to start sign-in. We pass a
    // marker so the published page knows to immediately kick off Google
    // sign-in and then bounce back to PRIMARY_PRODUCTION_ORIGIN.
    const url = new URL("/auth", LOVABLE_PUBLISHED_ORIGIN);
    url.searchParams.set("startGoogleOAuth", "1");
    url.searchParams.set("returnOrigin", PRIMARY_PRODUCTION_ORIGIN);
    return url.toString();
  }
  return null;
}

export function isAllowedReturnOrigin(origin: string): boolean {
  return KNOWN_PRODUCTION_ORIGINS.includes(origin);
}
