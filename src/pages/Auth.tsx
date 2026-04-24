import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import type { LoginContext } from "@/lib/routeAfterAuth";

/**
 * Unified /auth page.
 *
 * Wraps the existing Login + Signup pages in a single tabbed UI.
 * Pre-selects tab/role from the URL path or query params:
 *
 *   /auth                 → login tab, no role
 *   /auth?mode=signup     → signup tab, role chosen on the page
 *   /auth?role=agency     → signup tab, agency role pre-selected
 *   /login                → login tab
 *   /signup               → signup tab
 *   /agency/login         → login tab (agency context)
 *   /agency/signup        → signup tab, agency role pre-selected
 */
export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Derive defaults from the URL path / query
  const initial = useMemo(() => {
    const path = location.pathname;
    const mode = params.get("mode");
    const roleParam = params.get("role");

    let tab: "login" | "signup" = "login";
    let role: "renter" | "agency" | undefined;
    let context: LoginContext = "renter";

    if (path === "/signup" || path === "/agency/signup" || mode === "signup") {
      tab = "signup";
    }
    if (path === "/agency/signup" || roleParam === "agency") {
      role = "agency";
    } else if (path === "/signup" || roleParam === "renter") {
      role = "renter";
    }
    if (path === "/agency/login" || path === "/agency/signup") {
      context = "agency";
    }
    return { tab, role, context };
  }, [location.pathname, params]);

  const [tab, setTab] = useState<"login" | "signup">(initial.tab);
  const [defaultRole] = useState<"renter" | "agency" | undefined>(initial.role);

  // Keep tab in sync when the user navigates between /login and /signup directly
  useEffect(() => {
    setTab(initial.tab);
  }, [initial.tab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Tab switcher overlays the AuthLayout — sits above the form */}
      <div className="absolute left-1/2 top-20 z-20 w-full max-w-[440px] -translate-x-1/2 px-6 md:left-[25%] md:translate-x-[-50%]">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            const next = v as "login" | "signup";
            setTab(next);
            // Update URL so refresh keeps the chosen tab
            navigate(next === "signup" ? "/signup" : "/login", { replace: true });
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="signup">Create an account</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Render the actual form below the tabs */}
      <div className="pt-12">
        {tab === "login" ? (
          <Login context={initial.context} />
        ) : (
          <Signup defaultRole={defaultRole} />
        )}
      </div>
    </div>
  );
}
