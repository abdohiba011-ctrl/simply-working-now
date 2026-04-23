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
 * Behaviour matrix:
 *  - not authenticated → /login (preserve return path)
 *  - email not verified → /verify-email
 *  - role missing AND user is in the OTHER role:
 *      • renter trying to access /agency/* → toast + redirect to /rent
 *        (UNLESS user has agency role active, in which case auto-switch)
 *      • agency trying to access /rent/* → silent redirect to /agency/dashboard
 *  - role === "agency" but agency.verified === false → /agency/verification
 *  - currentRole !== requested role but user HAS the requested role → auto-switch
 */
export function MockProtectedRoute({ children, role }: MockProtectedRouteProps) {
  const { user, currentRole, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const location = useLocation();
  const lang = useLanguageStore((s) => s.language);
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) checkAuth();
  }, [isAuthenticated, checkAuth]);

  if (isLoading) {
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

  if (role === "agency" && !user.roles.agency.verified) {
    if (!location.pathname.includes("/agency/verification")) {
      return <Navigate to="/agency/verification" replace />;
    }
  }

  return <>{children}</>;
}
