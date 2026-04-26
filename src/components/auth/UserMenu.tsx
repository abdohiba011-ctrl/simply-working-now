import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  LogOut,
  Settings as SettingsIcon,
  User as UserIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
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
  const [activationModal, setActivationModal] = useState<
    null | "activate-renter" | "activate-agency"
  >(null);

  if (!user) return null;

  const hasRenter = !!user.roles.renter?.active;
  const hasAgency = !!user.roles.agency?.active;
  const initials = (user.name || user.email).slice(0, 1).toUpperCase();

  const handleSwitch = (target: "renter" | "agency") => {
    switchRole(target);
    toast.success(
      t("switched_mode").replace(
        "{role}",
        target === "renter" ? t("renter_short") : t("business_short"),
      ),
    );
    if (target === "renter") {
      navigate("/rent");
    } else {
      const verified = user.roles.agency?.verified;
      navigate(verified ? "/agency/dashboard" : "/agency/verification");
    }
  };

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
      {activationModal && (
        <RoleActivationModal
          open
          onOpenChange={(v) => !v && setActivationModal(null)}
          mode={activationModal}
        />
      )}
    </>
  );
}
