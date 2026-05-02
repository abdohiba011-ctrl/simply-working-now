import { useEffect } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuthModal, type AuthModalTab } from "@/contexts/AuthModalContext";

/**
 * Backwards-compat redirect. Visiting /login or /signup sends users
 * to the homepage and auto-opens the renter auth modal.
 */
export function AuthModalRedirect({ tab }: { tab: AuthModalTab }) {
  const { openAuthModal } = useAuthModal();
  const [params] = useSearchParams();
  const location = useLocation();
  const returnTo = params.get("returnUrl") || params.get("returnTo") || undefined;

  useEffect(() => {
    openAuthModal(tab, { returnTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't redirect if user explicitly came for a returnUrl that points to homepage anyway.
  if (location.pathname === "/") return null;
  return <Navigate to="/" replace />;
}
