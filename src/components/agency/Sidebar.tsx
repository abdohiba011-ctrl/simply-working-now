import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import {
  Home, Calendar, Bike, MessageCircle, CalendarDays,
  Wallet, Building, Settings,
  ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import logoLight from "@/assets/motonita-logo.svg";
import logoDark from "@/assets/motonita-logo-dark.svg";
import markLight from "@/assets/motonita-mark-dark.svg";
import markDark from "@/assets/motonita-mark-light.svg";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const NAV: NavItem[] = [
  { to: "/agency/dashboard", label: "Dashboard", icon: Home },
  { to: "/agency/motorbikes", label: "Motorbikes", icon: Bike },
  { to: "/agency/bookings", label: "Bookings", icon: Calendar },
  { to: "/agency/messages", label: "Messages", icon: MessageCircle },
  { to: "/agency/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/agency/finance", label: "Finance", icon: Wallet },
  { to: "/agency/agency-center", label: "Agency", icon: Building },
  { to: "/agency/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  hideCollapseToggle?: boolean;
}

export const Sidebar = ({ collapsed, onToggle, hideCollapseToggle }: SidebarProps) => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const agency = useAgencyStore();
  const unread = useAgencyStore((s) => s.unreadMessages);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const itemBadge = (label: string): number | undefined => {
    if (label === "Messages") return unread;
    return undefined;
  };

  // Floating panel inside the shell when on desktop; full-bleed inside the
  // mobile Sheet (hideCollapseToggle === true).
  const floating = !hideCollapseToggle;

  return (
    <aside
      className={cn(
        "relative shrink-0 flex-col bg-card transition-all duration-200",
        floating
          ? "sticky top-3 my-3 ms-3 hidden h-[calc(100vh-1.5rem)] rounded-2xl border border-border shadow-sm lg:flex"
          : "flex h-full w-full",
        floating && (collapsed ? "w-[72px]" : "w-64"),
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoLight} alt="Motonita" className="h-6 w-auto dark:hidden" />
            <img src={logoDark} alt="Motonita" className="hidden h-6 w-auto dark:block" />
          </div>
        ) : (
          <div className="flex w-full items-center justify-center">
            <img src={markLight} alt="Motonita" className="h-6 w-auto dark:hidden" />
            <img src={markDark} alt="Motonita" className="hidden h-6 w-auto dark:block" />
          </div>
        )}
      </div>

      {/* Floating collapse chip on the outer edge */}
      {floating && !hideCollapseToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Nav */}
      <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1.5">
          {NAV.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const badge = itemBadge(item.label);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex h-12 items-center gap-3 rounded-xl px-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {/* Pastel icon tile */}
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                      active
                        ? "bg-primary/25 text-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/15",
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                  </span>
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && badge !== undefined && badge > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {badge}
                    </span>
                  )}
                  {collapsed && badge !== undefined && badge > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer profile card */}
      <div className="p-3">
        <div
          className={cn(
            "rounded-2xl border border-border bg-muted/40 p-3",
            collapsed && "flex flex-col items-center gap-2 p-2",
          )}
        >
          <div className={cn("flex items-center gap-3", collapsed && "flex-col gap-0")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/25 text-sm font-semibold text-foreground">
              {(user?.email || "A").charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {user?.email?.split("@")[0] || "Agency user"}
                </div>
                <div className="mt-0.5 inline-flex items-center rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {agency.name || "Agency"}
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={() => setLogoutOpen(true)}
            className={cn(
              "mt-2 text-destructive hover:bg-destructive/10 hover:text-destructive",
              collapsed ? "h-8 w-8" : "w-full justify-start gap-2 text-xs",
            )}
            aria-label="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && "Log out"}
          </Button>
        </div>
      </div>

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </aside>
  );
};
