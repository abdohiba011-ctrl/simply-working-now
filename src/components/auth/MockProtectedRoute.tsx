import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import type { AppRole } from "@/lib/mockAuth";

interface MockProtectedRouteProps {
  children: ReactNode;
  role?: AppRole;
}

/**
 * Route guard that uses the mock auth store (Zustand).
 * Distinct from the existing Supabase-backed ProtectedRoute.
 */
export function MockProtectedRoute({ children, role }: MockProtectedRouteProps) {
  const { user, currentRole, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role && !user.roles[role]?.active) {
    // User doesn't have the requested role — send them to their actual home
    const fallback =
      user.roles.agency.active
        ? user.roles.agency.verified
          ? "/agency/dashboard"
          : "/agency/verification"
        : "/rent";
    return <Navigate to={fallback} replace />;
  }

  if (role === "agency" && !user.roles.agency.verified) {
    return <Navigate to="/agency/verification" replace />;
  }

  // Switch active role to match the route if needed
  if (role && currentRole !== role) {
    useAuthStore.getState().switchRole(role);
  }

  return <>{children}</>;
}
