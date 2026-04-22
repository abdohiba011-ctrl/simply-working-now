import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar as SidebarBody } from "./Sidebar";

export const AgencyLayout = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileSidebar(true)} />
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <MobileNav open={moreOpen} onOpenChange={setMoreOpen} />

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileSidebar} onOpenChange={setMobileSidebar}>
        <SheetContent side="left" className="w-[260px] p-0">
          <div className="flex h-full">
            <SidebarBody collapsed={false} onToggle={() => setMobileSidebar(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
