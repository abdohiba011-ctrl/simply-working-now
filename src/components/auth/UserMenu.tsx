import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { useAuthStore, readCachedIsAdmin } from "@/stores/useAuthStore";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import enLocale from "@/locales/en.json";
import frLocale from "@/locales/fr.json";
import arLocale from "@/locales/ar.json";

const locales = { en: enLocale, fr: frLocale, ar: arLocale } as Record<string, any>;

function useT() {
  const lang = useLanguageStore((s) => s.language);
  return (key: string): string => {
    const dict = locales[lang]?.mockAuth ?? locales.en.mockAuth;
    return dict?.[key] ?? key;
  };
}

interface Props {
  align?: "start" | "center" | "end";
}

export function UserMenu({ align = "end" }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const currentRole = useAuthStore((s) => s.currentRole);
  const switchRole = useAuthStore((s) => s.switchRole);

  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!user) return null;

  const hasRenter = !!user.roles.renter?.active;
  const hasAgency = !!user.roles.agency?.active;
  // Renter Site is a public view available to any authenticated user.
  // Agency-only accounts can switch to Renter Site without losing
  // agency permissions.
  const canSwitchToRenter = currentRole !== "renter";
  const canSwitchToAgency = hasAgency && currentRole !== "agency";
  // Use store value if loaded; fall back to localStorage cache for instant render on refresh.
  const showAdmin = user.isAdmin || readCachedIsAdmin(user.id);

  const handleSwitchToRenter = () => {
    switchRole("renter");
    toast.success(t("switch_to_renter"));
    navigate("/");
  };
  const handleSwitchToAgency = () => {
    switchRole("agency");
    toast.success(t("switch_to_business"));
    navigate("/agency/agency-center");
  };
  const initials = (user.name || user.email).slice(0, 1).toUpperCase();


  const roleBadgeLabel =
    hasRenter && hasAgency
      ? t("business_plus_renter")
      : currentRole === "agency"
      ? t("business_account")
      : t("renter_account");

  const roleBadgeStyle =
    currentRole === "agency"
      ? { backgroundColor: "#163300", color: "#fff" }
      : { backgroundColor: "rgba(159,232,112,0.25)", color: "#163300" };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label="User menu"
            data-admin={user.isAdmin ? "true" : "false"}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
              style={{ backgroundColor: "rgba(159,232,112,0.4)", color: "#163300" }}
            >
              {initials}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-64">
          <DropdownMenuLabel className="space-y-1.5">
            <div className="text-sm font-semibold">{user.name}</div>
            <div className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </div>
            <div>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={roleBadgeStyle}
              >
                {roleBadgeLabel}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              navigate(currentRole === "agency" ? "/agency/agency-center" : "/profile")
            }
          >
            <UserIcon className="mr-2 h-4 w-4" />
            {t("profile_link")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              navigate(currentRole === "agency" ? "/agency/settings" : "/settings")
            }
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            {t("settings_link")}
          </DropdownMenuItem>

          {showAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/panel")}>
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </DropdownMenuItem>
            </>
          )}

          {(canSwitchToRenter || canSwitchToAgency) && <DropdownMenuSeparator />}
          {canSwitchToAgency && (
            <DropdownMenuItem onClick={handleSwitchToAgency}>
              <Briefcase className="mr-2 h-4 w-4" />
              {t("switch_to_business")}
            </DropdownMenuItem>
          )}
          {canSwitchToRenter && (
            <DropdownMenuItem onClick={handleSwitchToRenter}>
              <UserIcon className="mr-2 h-4 w-4" />
              {t("switch_to_renter")}
            </DropdownMenuItem>
          )}

          {!hasAgency && hasRenter && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/agency/signup")}>
                <Briefcase className="mr-2 h-4 w-4" />
                {t("become_agency")}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setLogoutOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("logout_confirm")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}
