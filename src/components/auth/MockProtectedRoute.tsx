import { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLanguageStore } from "@/stores/useLanguageStore";
import type { AppRole } from "@/lib/mockAuth";
import enLocale from "@/locales/en.json";
import frLocale from "@/locales/fr.json";
import arLocale from "@/locales/ar.json";

const locales = { en: enLocale, fr: frLocale, ar: arLocale } as Record<string, any>;

interface MockProtectedRouteProps {
  children: ReactNode;
  role?: AppRole;
}

/**
 * Route guard for mock auth + strict role isolation.
 *
 * IMPORTANT: On a hard reload / direct URL navigation, the Zustand store
 * starts empty until checkAuth() resolves the Supabase session. We MUST
 * render a loading state during that window — otherwise we'd redirect a
 * legitimately-logged-in agency back to /login (or /agency/dashboard) just
 * because the role hasn't been hydrated yet.
 */
export function MockProtectedRoute({ children, role }: MockProtectedRouteProps) {
  const { user, currentRole, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const authListenerInitialized = useAuthStore((s) => s.authListenerInitialized);
  const location = useLocation();
  const lang = useLanguageStore((s) => s.language);
  const toastShownRef = useRef(false);
  const checkAuthStartedRef = useRef(false);

  // Kick off session hydration immediately on mount — once per app lifetime.
  // Doing this in the render phase (guarded by a ref) is intentional: a
  // useEffect would fire AFTER the first render returns, by which point
  // an unguarded redirect would have already shipped.
  if (!checkAuthStartedRef.current && !authListenerInitialized) {
    checkAuthStartedRef.current = true;
    void checkAuth();
  }

  // Keep this for re-mounts where the listener already exists but the
  // session was lost in another tab.
  useEffect(() => {
    if (!isAuthenticated && !isLoading && authListenerInitialized) {
      // Auth has fully resolved as "no session" — nothing to do, the
      // redirect below handles it. We intentionally do NOT call checkAuth()
      // here because that would loop.
    }
  }, [isAuthenticated, isLoading, authListenerInitialized]);

  // Loading window: either checkAuth is in flight, or the auth listener
  // has not been wired up yet (first paint after a hard reload).
  if (isLoading || !authListenerInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!user.email_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!role) {
    return <>{children}</>;
  }

  const userHasRole = !!user.roles[role]?.active;

  if (!userHasRole) {
    const dict = locales[lang]?.mockAuth ?? locales.en.mockAuth;
    if (role === "renter") {
      // Agency trying to reach renter area → silent redirect (stale link)
      return <Navigate to="/agency/dashboard" replace />;
    }
    // role === "agency": renter trying to reach agency area → toast
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast.error(dict?.no_access ?? "You don't have access to that area");
    }
    return <Navigate to="/rent" replace />;
  }

  // User has the requested role — switch active role if needed
  if (currentRole !== role) {
    useAuthStore.getState().switchRole(role);
  }

  // Unverified agencies are NOT blocked from the dashboard anymore.
  // We surface a banner inside AgencyShell instead. This avoids
  // redirect loops with the new agency-center hub and lets users
  // navigate to upload documents themselves.

  return <>{children}</>;
}
