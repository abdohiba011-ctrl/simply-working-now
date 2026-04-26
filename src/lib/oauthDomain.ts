/**
 * OAuth helpers.
 *
 * Lovable Cloud's managed OAuth helper handles the full Google sign-in
 * flow (popup vs top-level redirect, broker URL, state validation, token
 * exchange). The app should not add custom redirects around it — those
 * tend to break the state/code exchange and cause:
 *   "failed to exchange authorization code"
 *
 * The only utility we keep here is the canonical production origin, which
 * other parts of the app reference for messaging/links.
 */

export const PRIMARY_PRODUCTION_ORIGIN = "https://motonita.ma";
