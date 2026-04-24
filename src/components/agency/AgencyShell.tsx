import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, AlertTriangle } from "lucide-react";
import { useAgencySubscription, computeLifecycle } from "@/hooks/useAgencyData";

export const AgencyShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const navigate = useNavigate();
  const { subscription } = useAgencySubscription();
  const { isTrialing, isPastDue, isLocked, daysLeftInTrial, daysLeftInGrace } = computeLifecycle(subscription);

  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileSidebar(true)} />

        {isTrialing && daysLeftInTrial !== null && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 lg:px-8" style={{ background: "#9FE870", color: "#163300" }}>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {daysLeftInTrial} day{daysLeftInTrial === 1 ? "" : "s"} left in your free Pro trial
            </p>
            <Button size="sm" onClick={() => navigate("/agency/finance#subscription")} className="h-8 bg-[#163300] text-white hover:bg-[#163300]/90">
              Upgrade now
            </Button>
          </div>
        )}

        {isPastDue && daysLeftInGrace !== null && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 lg:px-8 dark:bg-amber-900/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Trial ended. Upgrade within {daysLeftInGrace} day{daysLeftInGrace === 1 ? "" : "s"} to keep your listings live.
            </p>
            <Button size="sm" onClick={() => navigate("/agency/finance#subscription")} className="h-8">
              Choose a plan
            </Button>
          </div>
        )}

        <main className="flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-8 relative">
          <Outlet />
          {isLocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
              <div className="max-w-md w-full mx-4 rounded-2xl border-2 border-destructive/40 bg-card p-8 text-center shadow-xl">
                <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <Lock className="h-7 w-7 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "#163300" }}>Account locked</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Your free trial and grace period have ended. Upgrade to a paid plan to reactivate your listings and bookings.
                </p>
                <Button
                  className="mt-6 h-11 px-6 font-bold w-full"
                  style={{ background: "#9FE870", color: "#163300" }}
                  onClick={() => navigate("/agency/finance#subscription")}
                >
                  Reactivate my account
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
      <MobileNav open={moreOpen} onOpenChange={setMoreOpen} />

      <Sheet open={mobileSidebar} onOpenChange={setMobileSidebar}>
        <SheetContent side="left" className="w-[260px] p-0">
          <div className="flex h-full">
            <Sidebar collapsed={false} onToggle={() => setMobileSidebar(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
