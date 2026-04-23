import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export const AgencyShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileSidebar(true)} />
        <main className="flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-8">
          <Outlet />
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
