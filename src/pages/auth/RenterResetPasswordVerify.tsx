import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

export default function RenterResetPasswordVerify() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        navigate("/renter/reset-password/new", { replace: true });
      } else {
        navigate("/renter/forgot-password", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
}
