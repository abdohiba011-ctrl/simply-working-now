import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

/**
 * Watches the URL hash for OAuth callback artifacts on ANY route — not
 * just /auth. The Lovable OAuth broker can land users back on the site
 * root with `#error=...` or `#access_token=...` if `redirect_uri` was
 * `window.location.origin`. We surface the error and clean the URL so
 * users do not see stale OAuth state in their address bar.
 *
 * Tokens (`access_token`) are consumed by the supabase client itself
 * (detectSessionInUrl). We only need to handle the error case here and
 * tidy up afterwards.
 */
export function OAuthHashWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const hasTokens = /[#&]access_token=/.test(hash);

    const showError = (raw: string) => {
      const decoded = decodeURIComponent(raw.replace(/\+/g, " "));
      if (/exchange authorization code/i.test(decoded)) {
        toast.error(
          "Google sign-in could not finish. Please try again or use email sign-in.",
          { duration: 7000 },
        );
      } else {
        toast.error(decoded);
      }
    };

    if (hash.includes("error=") && !hasTokens) {
      const params = new URLSearchParams(hash.slice(1));
      const err = params.get("error_description") || params.get("error");
      if (err) showError(err);
      // Strip the broken hash without triggering a router push.
      window.history.replaceState(
        {},
        "",
        window.location.pathname + window.location.search,
      );
    } else if (search.includes("error=") && !hasTokens) {
      const params = new URLSearchParams(search);
      const err = params.get("error_description") || params.get("error");
      if (err) {
        showError(err);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    // If tokens landed on a non-auth page, give supabase a moment to
    // consume them, then clean the hash so it doesn't linger in the URL.
    if (hasTokens) {
      const t = window.setTimeout(() => {
        if (/[#&]access_token=/.test(window.location.hash)) {
          window.history.replaceState(
            {},
            "",
            window.location.pathname + window.location.search,
          );
        }
      }, 4000);
      return () => window.clearTimeout(t);
    }
  }, [navigate, location.pathname]);

  return null;
}
