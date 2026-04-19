import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ProtectedRouteSkeleton } from "@/components/ui/bike-skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string;
}

export const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth to be ready before checking
    if (isLoading) return;

    if (!isAuthenticated) {
      // Store current URL to return after login
      const returnUrl = location.pathname + location.search;
      navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Check if user has required role
    if (requireRole && !hasRole(requireRole)) {
      navigate("/");
    }
  }, [isLoading, isAuthenticated, user, requireRole, hasRole, navigate, location]);

  // Show loading while auth is being checked
  if (isLoading) {
    return <ProtectedRouteSkeleton />;
  }

  if (!isAuthenticated) return null;
  if (requireRole && !hasRole(requireRole)) return null;

  return <>{children}</>;
};
