import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, HelpCircle, Wallet, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgencyWallet } from "@/hooks/useAgencyData";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLanguageStore, Language } from "@/stores/useLanguageStore";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/agency/ThemeToggle";
import { NotificationsPopover } from "@/components/agency/NotificationsPopover";

interface HeaderProps {
  onMobileMenu: () => void;
}

const ROUTE_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  motorbikes: "Motorbikes",
  messages: "Messages",
  calendar: "Calendar",
  finance: "Finance",
  "agency-center": "Agency Center",
  settings: "Settings",
};

const CMD_TARGETS: { label: string; path: string }[] = [
  { label: "Dashboard", path: "/agency/dashboard" },
  { label: "Bookings", path: "/agency/bookings" },
  { label: "Motorbikes", path: "/agency/motorbikes" },
  { label: "Messages", path: "/agency/messages" },
  { label: "Calendar", path: "/agency/calendar" },
  { label: "Wallet", path: "/agency/finance#wallet" },
  { label: "Transactions", path: "/agency/finance#transactions" },
  { label: "Subscription", path: "/agency/finance#subscription" },
  { label: "Invoices", path: "/agency/finance#invoices" },
  { label: "Profile", path: "/agency/agency-center#profile" },
  { label: "Team", path: "/agency/agency-center#team" },
  { label: "Verification", path: "/agency/agency-center#verification" },
  { label: "Analytics", path: "/agency/agency-center#analytics" },
  { label: "Preferences", path: "/agency/settings#preferences" },
  { label: "Notifications", path: "/agency/settings#notifications" },
  { label: "Integrations", path: "/agency/settings#integrations" },
  { label: "Help & Support", path: "/agency/settings#help" },
];

const LANGS: { code: Language; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ar", flag: "🇲🇦", label: "العربية" },
];

export const Header = ({ onMobileMenu }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wallet } = useAgencyWallet();
  const balance = Number(wallet?.balance || 0);
  const { language, setLanguage } = useLanguageStore();
  const user = useAuthStore((s) => s.user);
  const [cmdOpen, setCmdOpen] = useState(false);

  const segments = location.pathname.split("/").filter(Boolean).slice(1);
  const lastSeg = segments[segments.length - 1] || "dashboard";
  const pageTitle = ROUTE_NAMES[lastSeg] || ROUTE_NAMES[segments[0]] || "";
  const isDashboard = lastSeg === "dashboard";
  const currentLang = LANGS.find((l) => l.code === language) || LANGS[0];

  const firstName = (user?.email || "there").split("@")[0].split(/[._-]/)[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-agency-canvas/80 px-4 backdrop-blur lg:px-6">
        <Button variant="ghost" size="icon" className="rounded-xl lg:hidden" onClick={onMobileMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Greeting chip on dashboard, page title elsewhere */}
        {isDashboard ? (
          <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm md:flex">
            <span className="font-semibold text-foreground">{greeting}, {displayName}</span>
            <span className="text-base leading-none">👋</span>
            <span className="hidden text-muted-foreground lg:inline">Let's grow your business today!</span>
          </div>
        ) : (
          <h1 className="hidden text-base font-semibold text-foreground md:block">{pageTitle}</h1>
        )}

        {/* Search */}
        <button
          onClick={() => setCmdOpen(true)}
          className="ml-auto hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 md:flex md:w-72 lg:w-80"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>

        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-full px-3">
              <span className="text-base">{currentLang.flag}</span>
              <span className="hidden text-xs font-medium uppercase sm:inline">{currentLang.code}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            {LANGS.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)} className="rounded-lg">
                <span className="mr-2">{l.flag}</span>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Wallet pill */}
        <button
          onClick={() => navigate("/agency/finance#wallet")}
          className="hidden items-center gap-2 rounded-full border border-border bg-card py-1 ps-1 pe-3 text-sm transition-colors hover:bg-muted/60 sm:flex"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
            <Wallet className="h-3.5 w-3.5 text-foreground" />
          </span>
          <span className="font-semibold text-foreground">{balance.toLocaleString()} MAD</span>
        </button>

        {/* Theme + Notifications + Help */}
        <ThemeToggle />
        <NotificationsPopover />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Help"
          onClick={() => navigate("/agency/settings#help")}
          className="rounded-full"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* User chip — avatar + name + role */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 ps-1 pe-3">
          <UserMenu />
          <div className="hidden text-left lg:block">
            <div className="text-xs font-semibold leading-tight text-foreground">{displayName}</div>
            <div className="text-[10px] leading-tight text-muted-foreground">Agency</div>
          </div>
        </div>
      </header>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search bookings, bikes, customers…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {CMD_TARGETS.map((t) => (
              <CommandItem
                key={t.path}
                onSelect={() => {
                  setCmdOpen(false);
                  navigate(t.path);
                }}
              >
                {t.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};
