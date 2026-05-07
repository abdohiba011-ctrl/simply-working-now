import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

export const AgencyShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const agencyVerified = !!user?.roles.agency?.verified;
  const showUnverifiedBanner = !!user?.roles.agency?.active && !agencyVerified;

  return (
    <div className="relative flex min-h-screen w-full bg-agency-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileSidebar(true)} />

        <main className="flex-1 px-4 pb-24 pt-2 lg:px-6 lg:pb-8">
          <div className="mx-auto max-w-7xl space-y-3">
            {showUnverifiedBanner && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
                <p className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/20">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                  </span>
                  Your agency isn't verified yet — listings won't appear in renter search until you upload your documents.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full border-warning/40 text-foreground hover:bg-warning/20"
                  onClick={() => navigate("/agency/agency-center#verification")}
                >
                  Upload documents
                </Button>
              </div>
            )}
          </div>

          <div className="mt-2">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav open={moreOpen} onOpenChange={setMoreOpen} />

      <Sheet open={mobileSidebar} onOpenChange={setMobileSidebar}>
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="flex h-full">
            <Sidebar collapsed={false} onToggle={() => setMobileSidebar(false)} hideCollapseToggle />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
