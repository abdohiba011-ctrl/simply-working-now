import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Calendar, Bike, MessageCircle, MoreHorizontal,
  Wallet, Building, Settings, CalendarDays, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgencyBadges } from "@/hooks/useAgencyBadges";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const TABS = [
  { to: "/agency/dashboard", label: "Home", icon: Home },
  { to: "/agency/motorbikes", label: "Bikes", icon: Bike },
  { to: "/agency/bookings", label: "Bookings", icon: Calendar },
  { to: "/agency/messages", label: "Messages", icon: MessageCircle },
];

const MORE_GROUPS = [
  {
    to: "/agency/calendar",
    label: "Calendar",
    subtitle: "View your booking schedule",
    icon: CalendarDays,
  },
  {
    to: "/agency/finance#wallet",
    label: "Finance",
    subtitle: "Wallet · Transactions",
    icon: Wallet,
  },
  {
    to: "/agency/agency-center#profile",
    label: "Agency",
    subtitle: "Profile · Verification · Analytics",
    icon: Building,
  },
  {
    to: "/agency/settings#preferences",
    label: "Settings",
    subtitle: "Preferences · Notifications · Help & Support",
    icon: Settings,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileNav = ({ open, onOpenChange }: Props) => {
  const { pendingBookings, unreadMessages } = useAgencyBadges();
  const navigate = useNavigate();
  const badgeFor = (label: string) =>
    label === "Bookings" ? pendingBookings : label === "Messages" ? unreadMessages : 0;

  return (
  <>
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

    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid gap-2">
          {MORE_GROUPS.map((item) => (
            <button
              key={item.to}
              onClick={() => {
                onOpenChange(false);
                navigate(item.to);
              }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-foreground">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  </>
  );
};
