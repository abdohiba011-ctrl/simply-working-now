/**
 * Auth Broker — single source of truth for Supabase auth events.
 *
 * Why this exists:
 *   The Supabase JS client serializes session reads and token refreshes
 *   behind a Web Lock keyed on the storage entry. When multiple parts of
 *   the app each call `onAuthStateChange` and `getSession()` independently
 *   (we had three: AuthContext, useAuthStore, useAgencyData), and React 18
 *   Strict Mode double-mounts every effect in dev, the lock contends with
 *   itself and you get:
 *     - "@supabase/gotrue-js: Lock 'lock:sb-…-auth-token' was not released within 5000ms"
 *     - "AbortError: Lock broken by another request with the 'steal' option."
 *   Worse, a transient network hiccup during `_callRefreshToken` throws
 *   "TypeError: Failed to fetch" and the gotrue client treats that as a
 *   sign-out signal — silently logging the user out.
 *
 * What this does:
 *   - One module-level `onAuthStateChange` subscription. All callers
 *     register listeners with `subscribeAuth()`; the broker fans out.
 *   - One in-flight `getSession()` promise; concurrent callers share it.
 *   - Caches the latest session so new subscribers get it synchronously
 *     (no re-acquiring the lock).
 *   - Wraps `getSession()` to swallow transient `Failed to fetch` errors
 *     and retry with exponential backoff, instead of letting them bubble
 *     up as a fake "logged out" event.
 */

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "PASSWORD_RECOVERY"
  | "MFA_CHALLENGE_VERIFIED";

type Listener = (event: AuthEvent | string, session: Session | null) => void;

const listeners = new Set<Listener>();
let cachedSession: Session | null = null;
let cachedReady = false;
let initStarted = false;
let inflightGetSession: Promise<Session | null> | null = null;

function fanout(event: string, session: Session | null) {
  cachedSession = session;
  cachedReady = true;
  // Snapshot to allow listeners to unsubscribe during fanout safely
  for (const l of Array.from(listeners)) {
    try {
      l(event, session);
    } catch (e) {
      console.error("[authBroker] listener threw", e);
    }
  }
}

function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as Error)?.message ?? String(err);
  return /Failed to fetch|NetworkError|network request failed|load failed/i.test(
    msg,
  );
}

/**
 * Initialize the single Supabase listener exactly once. Idempotent and
 * safe under React 18 Strict Mode double-mount.
 */
export function initAuthBroker(): void {
  if (initStarted) return;
  initStarted = true;

  supabase.auth.onAuthStateChange((event, session) => {
    fanout(event, session ?? null);
  });

  // Kick off the first session read; the listener above will also fire
  // INITIAL_SESSION, but starting this here primes the cache for the
  // very first synchronous subscriber.
  void getSessionShared().catch(() => {
    // already logged inside
  });
}

/**
 * Shared, de-duplicated `getSession()` call. Returns the cached session
 * synchronously if known. Retries transient network errors instead of
 * propagating them as "no session" (which would cascade into a logout).
 */
export function getSessionShared(): Promise<Session | null> {
  if (cachedReady && cachedSession !== null) {
    return Promise.resolve(cachedSession);
  }
  if (inflightGetSession) return inflightGetSession;

  const attempt = async (tries: number): Promise<Session | null> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const session = data.session ?? null;
      cachedSession = session;
      cachedReady = true;
      return session;
    } catch (err) {
      if (isTransientNetworkError(err) && tries > 0) {
        const delay = (4 - tries) * 400; // 400ms, 800ms, 1200ms
        console.warn(
          `[authBroker] transient network error during getSession, retrying in ${delay}ms`,
          err,
        );
        await new Promise((r) => setTimeout(r, delay));
        return attempt(tries - 1);
      }
      // Non-transient: rethrow so caller can decide (but DO NOT clear cache).
      throw err;
    }
  };

  inflightGetSession = attempt(3).finally(() => {
    inflightGetSession = null;
  });
  return inflightGetSession;
}

/**
 * Subscribe to auth changes via the broker.
 * If a cached session is already known, the listener is invoked
 * synchronously with `INITIAL_SESSION` so callers don't need a separate
 * `getSession()` call.
 */
export function subscribeAuth(listener: Listener): () => void {
  initAuthBroker();
  listeners.add(listener);
  if (cachedReady) {
    try {
      listener("INITIAL_SESSION", cachedSession);
    } catch (e) {
      console.error("[authBroker] initial listener call threw", e);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Read the broker's last known session without touching Supabase. */
export function peekSession(): Session | null {
  return cachedSession;
}
