import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { useAuth } from "@/contexts/AuthContext";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";
import {
  Home, Calendar, Bike, MessageCircle, CalendarDays,
  Wallet, Building, Settings,
  ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import logoLight from "@/assets/motonita-logo.svg";
import logoDark from "@/assets/motonita-logo-dark.svg";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const NAV: NavItem[] = [
  { to: "/agency/dashboard", label: "Dashboard", icon: Home },
  { to: "/agency/bookings", label: "Bookings", icon: Calendar },
  { to: "/agency/motorbikes", label: "Motorbikes", icon: Bike },
  { to: "/agency/messages", label: "Messages", icon: MessageCircle },
  { to: "/agency/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/agency/finance", label: "Finance", icon: Wallet },
  { to: "/agency/agency-center", label: "Agency", icon: Building },
  { to: "/agency/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const agency = useAgencyStore();
  const unread = useAgencyStore((s) => s.unreadMessages);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const itemBadge = (label: string): number | undefined => {
    if (label === "Messages") return unread;
    return undefined;
  };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-all duration-200 lg:flex",
        collapsed ? "w-16" : "w-[240px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoLight} alt="Motonita" className="h-6 w-auto dark:hidden" />
            <img src={logoDark} alt="Motonita" className="hidden h-6 w-auto dark:block" />
          </div>
        ) : (
          <span className="text-lg font-bold text-primary">M</span>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="h-7 w-7"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="scrollbar-hide flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const badge = itemBadge(item.label);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all",
                    "hover:bg-primary/10 hover:text-foreground",
                    active && "bg-primary/15 text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-all",
                      active ? "text-primary fill-primary/30 stroke-[2.25]" : "stroke-[1.75]",
                    )}
                  />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && badge !== undefined && badge > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {badge}
                    </span>
                  )}
                  {collapsed && badge !== undefined && badge > 0 && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {(user?.email || "A").charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.email?.split("@")[0] || "Agency user"}</div>
              <div className="truncate text-xs text-muted-foreground">{agency.name}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLogoutOpen(true)}
            className="mt-3 w-full justify-start gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLogoutOpen(true)}
            className="mt-3 h-8 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <LogoutConfirmDialog
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
        }}
      />
    </aside>
  );
};
