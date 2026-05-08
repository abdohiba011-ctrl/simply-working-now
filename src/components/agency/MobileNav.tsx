import { NavLink } from "react-router-dom";
import { Home, Calendar, Bike, MessageCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgencyBadges } from "@/hooks/useAgencyBadges";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Wallet, Receipt, Building, ShieldCheck,
  BarChart, Settings, Bell, LifeBuoy, CalendarDays,
} from "lucide-react";

const TABS = [
  { to: "/agency/dashboard", label: "Home", icon: Home },
  { to: "/agency/motorbikes", label: "Bikes", icon: Bike },
  { to: "/agency/bookings", label: "Bookings", icon: Calendar },
  { to: "/agency/messages", label: "Messages", icon: MessageCircle },
];

const MORE_ITEMS = [
  { to: "/agency/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/agency/finance#wallet", label: "Wallet", icon: Wallet },
  { to: "/agency/finance#transactions", label: "Transactions", icon: Receipt },
  { to: "/agency/agency-center#profile", label: "Profile", icon: Building },
  { to: "/agency/agency-center#verification", label: "Verification", icon: ShieldCheck },
  { to: "/agency/agency-center#analytics", label: "Analytics", icon: BarChart },
  { to: "/agency/settings#preferences", label: "Preferences", icon: Settings },
  { to: "/agency/settings#notifications", label: "Notifications", icon: Bell },
  { to: "/agency/settings#help", label: "Help & Support", icon: LifeBuoy },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileNav = ({ open, onOpenChange }: Props) => {
  const { pendingBookings, unreadMessages } = useAgencyBadges();
  const badgeFor = (label: string) =>
    label === "Bookings" ? pendingBookings : label === "Messages" ? unreadMessages : 0;

  return (
  <>
    {/* Floating bottom tab bar */}
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/95 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      {TABS.map((tab) => {
        const count = badgeFor(tab.label);
        return (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  isActive ? "bg-primary/25" : "bg-transparent",
                )}
              >
                <tab.icon className="h-[18px] w-[18px]" />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-card">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </>
          )}
        </NavLink>
        );
      })}
      <button
        onClick={() => onOpenChange(true)}
        className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium text-muted-foreground"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl">
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </span>
        <span>More</span>
      </button>
    </nav>

    {/* More drawer */}
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid gap-1">
          {MORE_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )
              }
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  "bg-muted text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  </>
  );
};
