import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

/**
 * Legacy in-app reset-code page. The product now uses an emailed reset
 * LINK instead. We redirect:
 *   - to /reset-password/new if Supabase already has a recovery session
 *     (the user may have arrived from the email link and been bounced
 *     here by an old bookmark),
 *   - otherwise back to /forgot-password to start over.
 */
export default function ResetPasswordVerify() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        navigate("/reset-password/new", { replace: true });
      } else {
        navigate("/forgot-password", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
}
