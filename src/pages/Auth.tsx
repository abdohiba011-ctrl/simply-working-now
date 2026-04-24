import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * Legacy /auth route. The combined login/signup page has been replaced by
 * dedicated /login, /signup, /agency/login, /agency/signup screens.
 * This component is just a thin redirect so existing links and bookmarks
 * keep working.
 */
export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const mode = params.get("mode");
    const target =
      mode === "signup"
        ? "/signup"
        : mode === "agency-signup"
          ? "/agency/signup"
          : mode === "agency-login"
            ? "/agency/login"
            : "/login";
    navigate(target, { replace: true });
  }, [navigate, params]);

  return null;
}
