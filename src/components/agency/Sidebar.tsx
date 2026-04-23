import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, Calendar, Bike, MessageCircle, CalendarDays,
  Wallet, Receipt, Sparkles, FileText,
  Building, Users, ShieldCheck, BarChart,
  Settings, Bell, Plug, LifeBuoy,
  ChevronLeft, ChevronRight, LogOut, Repeat,
} from "lucide-react";
import logoLight from "@/assets/motonita-logo.svg";
import logoDark from "@/assets/motonita-logo-dark.svg";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Main",
    items: [
      { to: "/agency/dashboard", label: "Dashboard", icon: Home },
      { to: "/agency/bookings", label: "Bookings", icon: Calendar },
      { to: "/agency/motorbikes", label: "Motorbikes", icon: Bike },
      { to: "/agency/messages", label: "Messages", icon: MessageCircle },
      { to: "/agency/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/agency/wallet", label: "Wallet", icon: Wallet },
      { to: "/agency/transactions", label: "Transactions", icon: Receipt },
      { to: "/agency/subscription", label: "Subscription", icon: Sparkles },
      { to: "/agency/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    title: "Agency",
    items: [
      { to: "/agency/profile", label: "Profile", icon: Building },
      { to: "/agency/team", label: "Team", icon: Users },
      { to: "/agency/verification", label: "Verification", icon: ShieldCheck },
      { to: "/agency/analytics", label: "Analytics", icon: BarChart },
    ],
  },
  {
    title: "Settings",
    items: [
      { to: "/agency/preferences", label: "Preferences", icon: Settings },
      { to: "/agency/notifications", label: "Notifications", icon: Bell },
      { to: "/agency/integrations", label: "Integrations", icon: Plug },
      { to: "/agency/help", label: "Help & Support", icon: LifeBuoy },
    ],
  },
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

  const itemBadge = (label: string): number | undefined => {
    if (label === "Messages") return unread;
    if (label === "Verification") return agency.verificationStepsTotal - agency.verificationStepsCompleted;
    return undefined;
  };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-all duration-200 lg:flex",
        collapsed ? "w-16" : "w-[260px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-primary">Motonita</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Agency
            </span>
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
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            {!collapsed && (
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                const badge = itemBadge(item.label);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        "hover:bg-primary/10 hover:text-foreground",
                        active && "bg-primary/15 text-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
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
          </div>
        ))}
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
              <div className="text-xs text-muted-foreground">{agency.name}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 flex gap-1">
            <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-xs">
              <Repeat className="h-3.5 w-3.5" />
              Switch role
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-xs text-destructive hover:text-destructive"
              aria-label="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
};
