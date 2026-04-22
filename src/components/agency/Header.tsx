import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, Wallet, Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { useLanguageStore, Language } from "@/stores/useLanguageStore";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMobileMenu: () => void;
}

const ROUTE_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  motorbikes: "Motorbikes",
  messages: "Messages",
  calendar: "Calendar",
  wallet: "Wallet",
  transactions: "Transactions",
  subscription: "Subscription",
  invoices: "Invoices",
  profile: "Profile",
  team: "Team",
  verification: "Verification",
  analytics: "Analytics",
  preferences: "Preferences",
  notifications: "Notifications",
  integrations: "Integrations",
  help: "Help & Support",
};

const LANGS: { code: Language; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ar", flag: "🇲🇦", label: "العربية" },
];

export const Header = ({ onMobileMenu }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const balance = useAgencyStore((s) => s.walletBalance);
  const { language, setLanguage } = useLanguageStore();
  const [cmdOpen, setCmdOpen] = useState(false);

  const segments = location.pathname.split("/").filter(Boolean).slice(1);
  const currentLang = LANGS.find((l) => l.code === language) || LANGS[0];

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
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb */}
        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <span>Agency</span>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <span className={cn(i === segments.length - 1 && "font-medium text-foreground")}>
                {ROUTE_NAMES[seg] || seg}
              </span>
            </span>
          ))}
        </nav>

        {/* Search */}
        <button
          onClick={() => setCmdOpen(true)}
          className="ml-auto hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex md:w-72"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>

        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 px-2">
              <span className="text-base">{currentLang.flag}</span>
              <span className="hidden text-xs font-medium uppercase sm:inline">{currentLang.code}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGS.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)}>
                <span className="mr-2">{l.flag}</span>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Top up wallet */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/30 hover:bg-primary/10"
          onClick={() => navigate("/agency/wallet")}
        >
          <Wallet className="h-4 w-4 text-primary" />
          <span className="font-semibold">{balance} MAD</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">Top up</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon" aria-label="Help" onClick={() => navigate("/agency/help")}>
          <HelpCircle className="h-5 w-5" />
        </Button>
      </header>

      {/* Command palette */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search bookings, bikes, customers…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {Object.entries(ROUTE_NAMES).map(([slug, name]) => (
              <CommandItem
                key={slug}
                onSelect={() => {
                  setCmdOpen(false);
                  navigate(`/agency/${slug}`);
                }}
              >
                {name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};
