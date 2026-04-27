import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { getErrMsg } from "@/lib/errorMessages";
import { PRIMARY_PRODUCTION_ORIGIN } from "@/lib/oauthDomain";

interface GoogleSignInButtonProps {
  label?: string;
  className?: string;
}

/**
 * Returns true if we are running on the iframe-preview host. The Lovable
 * preview proxy intercepts the OAuth token-exchange POST, which produces
 * `failed to exchange authorization code`. Google sign-in must run on
 * the published origin (`motonita.ma`) instead.
 */
function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.endsWith("lovableproject.com") || h.startsWith("id-preview--");
}

/**
 * Reusable "Continue with Google" button using Lovable Cloud's managed
 * OAuth flow. Same-origin only — do NOT add custom redirects around it.
 */
export function GoogleSignInButton({
  label = "Continue with Google",
  className,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const onClick = useCallback(async () => {
    // Hard guard: the iframe preview proxy breaks the token exchange.
    // Hop the user onto the production origin where it works reliably,
    // preserving the path so they land back where they started.
    if (isPreviewHost()) {
      const target = `${PRIMARY_PRODUCTION_ORIGIN}${window.location.pathname}${window.location.search}`;
      toast.message("Opening sign-in on motonita.ma…", {
        description: "Google sign-in must run on the live domain.",
      });
      window.location.assign(target);
      return;
    }

    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const raw = getErrMsg(result.error) || "";
        if (/exchange authorization code/i.test(raw)) {
          toast.error(
            "Google sign-in could not finish here. Please try again on motonita.ma.",
            { duration: 7000 },
          );
        } else {
          toast.error(raw || "Google sign-in failed.");
        }
        setLoading(false);
        return;
      }
      // result.redirected → browser is going to Google.
      // popup flow → supabase session is set, auth listener will redirect.
    } catch (err) {
      const raw = getErrMsg(err) || "";
      if (/exchange authorization code/i.test(raw)) {
        toast.error(
          "Google sign-in could not finish here. Please try again on motonita.ma.",
          { duration: 7000 },
        );
      } else {
        toast.error(raw || "Google sign-in failed.");
      }
      setLoading(false);
    }
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className={className ?? "w-full h-10 gap-3 rounded-md text-sm font-medium"}
      aria-label={label}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? "Connecting…" : label}
    </Button>
  );
}
