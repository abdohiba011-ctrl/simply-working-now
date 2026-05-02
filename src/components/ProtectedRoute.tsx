import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProtectedRouteSkeleton } from "@/components/ui/bike-skeleton";
import { useAuthModal } from "@/contexts/AuthModalContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string;
}

export const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading, hasRole, refreshRoles, isRefreshingRoles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthModal } = useAuthModal();
  const [roleRefreshAttempted, setRoleRefreshAttempted] = useState(false);

  useEffect(() => {
    setRoleRefreshAttempted(false);
  }, [requireRole, user?.id]);

  useEffect(() => {
    // Wait for auth to be ready before checking
    if (isLoading || isRefreshingRoles) return;

    if (!isAuthenticated) {
      const returnTo = location.pathname + location.search;
      // Admin route → keep dedicated admin login page
      if (requireRole === "admin") {
        navigate(`/admin/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      // Send the user back to the homepage and pop the modal over it
      // so they don't lose visual context.
      navigate("/", { replace: true });
      openAuthModal("login", { returnTo });
      return;
    }

    // Check if user has required role
    if (requireRole && !hasRole(requireRole)) {
      if (!roleRefreshAttempted) {
        setRoleRefreshAttempted(true);
        refreshRoles();
        return;
      }
      navigate("/");
    }
  }, [isLoading, isRefreshingRoles, isAuthenticated, user, requireRole, hasRole, roleRefreshAttempted, refreshRoles, navigate, location, openAuthModal]);

  // Show loading while auth is being checked
  if (isLoading || isRefreshingRoles || (requireRole && isAuthenticated && !hasRole(requireRole) && !roleRefreshAttempted)) {
    return <ProtectedRouteSkeleton />;
  }

  if (!isAuthenticated) return null;
  if (requireRole && !hasRole(requireRole)) return null;

  return <>{children}</>;
};
