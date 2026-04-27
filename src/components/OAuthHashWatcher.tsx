import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { PRIMARY_PRODUCTION_ORIGIN } from "@/lib/oauthDomain";

/**
 * Watches the URL hash AND query string for OAuth callback artifacts on
 * any route. The Lovable OAuth broker can land users back on the site
 * with `#error=...`, `?error=...`, or `#access_token=...` if something
 * went wrong (or, in the case of tokens, succeeded). We surface a clear
 * error and clean the URL so users do not see stale OAuth state.
 *
 * Tokens (`access_token`) are consumed by the supabase client itself
 * (detectSessionInUrl). We only handle errors and tidy up afterwards.
 */
function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.endsWith("lovableproject.com") || h.startsWith("id-preview--");
}

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
      const isExchange = /exchange authorization code/i.test(decoded);

      if (isExchange && isPreviewHost()) {
        // Iframe preview proxy intercepts the token exchange. Offer the
        // user a one-click hop to the production origin where it works.
        toast.error(
          "Google sign-in could not finish in the preview. Open the live site to try again.",
          {
            duration: 10000,
            action: {
              label: "Open motonita.ma",
              onClick: () => {
                window.location.assign(`${PRIMARY_PRODUCTION_ORIGIN}/login`);
              },
            },
          },
        );
        return;
      }

      if (isExchange) {
        toast.error(
          "Google sign-in could not finish. Please try again or use email sign-in.",
          { duration: 7000 },
        );
        return;
      }

      toast.error(decoded);
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
