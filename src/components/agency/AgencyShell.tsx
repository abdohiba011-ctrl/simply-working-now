import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, AlertTriangle, ShieldAlert } from "lucide-react";
import { useAgencySubscription, computeLifecycle } from "@/hooks/useAgencyData";
import { useAuthStore } from "@/stores/useAuthStore";

export const AgencyShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const navigate = useNavigate();
  const { subscription } = useAgencySubscription();
  const { isTrialing, isPastDue, isLocked, daysLeftInTrial, daysLeftInGrace } =
    computeLifecycle(subscription);
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
            {showUnverifiedBanner && !isLocked && (
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

            {isTrialing && daysLeftInTrial !== null && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
                <p className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/25">
                    <Sparkles className="h-4 w-4 text-foreground" />
                  </span>
                  {daysLeftInTrial} day{daysLeftInTrial === 1 ? "" : "s"} left in your free Pro trial
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/agency/finance#subscription")}
                  className="h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Upgrade now
                </Button>
              </div>
            )}

            {isPastDue && daysLeftInGrace !== null && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/15 px-4 py-3">
                <p className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/25">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </span>
                  Trial ended. Upgrade within {daysLeftInGrace} day{daysLeftInGrace === 1 ? "" : "s"} to keep your listings live.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/agency/finance#subscription")}
                  className="h-8 rounded-full"
                >
                  Choose a plan
                </Button>
              </div>
            )}
          </div>

          <div className="mt-2">
            {isLocked ? null : <Outlet />}
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

      {isLocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <Lock className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Account locked</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Your free trial and grace period have ended. Upgrade to a paid plan to reactivate your listings and bookings.
            </p>
            <Button
              className="mt-6 h-11 w-full rounded-full px-6 font-bold"
              onClick={() => navigate("/agency/finance#subscription")}
            >
              Reactivate my account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
