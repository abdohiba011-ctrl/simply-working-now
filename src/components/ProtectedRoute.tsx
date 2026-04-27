import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProtectedRouteSkeleton } from "@/components/ui/bike-skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string;
}

export const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading, hasRole, refreshRoles, isRefreshingRoles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [roleRefreshAttempted, setRoleRefreshAttempted] = useState(false);

  useEffect(() => {
    setRoleRefreshAttempted(false);
  }, [requireRole, user?.id]);

  useEffect(() => {
    // Wait for auth to be ready before checking
    if (isLoading || isRefreshingRoles) return;

    if (!isAuthenticated) {
      // Store current URL to return after login
      const returnUrl = location.pathname + location.search;
      navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
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
  }, [isLoading, isRefreshingRoles, isAuthenticated, user, requireRole, hasRole, roleRefreshAttempted, refreshRoles, navigate, location]);

  // Show loading while auth is being checked
  if (isLoading || isRefreshingRoles || (requireRole && isAuthenticated && !hasRole(requireRole) && !roleRefreshAttempted)) {
    return <ProtectedRouteSkeleton />;
  }

  if (!isAuthenticated) return null;
  if (requireRole && !hasRole(requireRole)) return null;

  return <>{children}</>;
};
