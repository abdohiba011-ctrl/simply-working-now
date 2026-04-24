import { Navigate, useLocation, useSearchParams } from "react-router-dom";

/**
 * Legacy /auth route.
 *
 * Kept only as a compatibility redirect so old links continue to work,
 * while the actual UI lives on the original separate pages:
 * - /login
 * - /signup
 * - /agency/login
 * - /agency/signup
 */
export default function Auth() {
  const location = useLocation();
  const [params] = useSearchParams();

  const mode = params.get("mode");
  const role = params.get("role");

  const targetPath = (() => {
    if (location.pathname === "/agency/login") return "/agency/login";
    if (location.pathname === "/agency/signup") return "/agency/signup";
    if (mode === "signup" && role === "agency") return "/agency/signup";
    if (mode === "signup") return "/signup";
    if (role === "agency") return "/agency/signup";
    return "/login";
  })();

  return <Navigate to={`${targetPath}${location.search}`} replace />;
}
