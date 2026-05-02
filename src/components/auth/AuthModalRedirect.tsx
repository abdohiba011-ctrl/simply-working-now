import { useEffect } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import {
  useAuthModal,
  type AuthModalTab,
  type AuthModalView,
} from "@/contexts/AuthModalContext";

/**
 * Backwards-compat redirect. Visiting legacy auth routes sends users
 * to the homepage and auto-opens the renter auth modal in the right view.
 */
export function AuthModalRedirect({
  tab,
  initialView,
}: {
  tab: AuthModalTab;
  initialView?: AuthModalView;
}) {
  const { openAuthModal } = useAuthModal();
  const [params] = useSearchParams();
  const location = useLocation();
  const returnTo = params.get("returnUrl") || params.get("returnTo") || undefined;

  useEffect(() => {
    openAuthModal(tab, { returnTo, initialView });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (location.pathname === "/") return null;
  return <Navigate to="/" replace />;
}
