import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe } from "lucide-react";

import { useLanguageStore } from "@/stores/useLanguageStore";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import logoLight from "@/assets/motonita-logo.svg";
import logoDark from "@/assets/motonita-logo-dark.svg";
import bikeImage from "@/assets/auth-agency-bike.jpg";

interface AgencyAuthLayoutProps {
  children: ReactNode;
}

const LANGS: Array<{ code: "en" | "fr" | "ar"; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
];

/**
 * Split-screen layout for agency auth pages (signup / login).
 * Left: hero motorbike image with brand quote (md+).
 * Right: form column with back-to-home + language switcher.
 */
export function AgencyAuthLayout({ children }: AgencyAuthLayoutProps) {
  const { t, i18n } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const currentLang = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];
  const { theme } = useTheme();
  const logoUrl = theme === "dark" ? logoDark : logoLight;

  const handleLangChange = (code: "en" | "fr" | "ar") => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* LEFT — image (md+) */}
      <aside className="relative hidden md:block md:w-[42%] lg:w-[48%] overflow-hidden">
        <img
          src={bikeImage}
          alt={t("agencyAuth.image_alt", {
            defaultValue: "Yellow sportbike on a city street",
          })}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        {/* Dark gradient overlay so text reads well */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

        {/* Brand badge top-left */}
        <div className="absolute top-6 start-6 inline-flex items-center gap-2 text-white">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#9FE870" }}
          />
          <span className="text-base font-bold tracking-tight">Motonita</span>
        </div>

        {/* Quote bottom-left */}
        <div className="absolute bottom-8 start-8 end-8 text-white">
          <p className="text-2xl lg:text-3xl font-bold leading-snug max-w-md">
            {t("agencyAuth.tagline", {
              defaultValue:
                "“Flat fees, no commission. Keep 100% of every rental.”",
            })}
          </p>
          <p className="mt-3 text-sm text-white/80">
            {t("agencyAuth.tagline_sub", {
              defaultValue:
                "Morocco's first peer-to-peer motorbike rental marketplace.",
            })}
          </p>
        </div>
      </aside>

      {/* RIGHT — form column */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 sm:px-8 py-4 gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 -ms-2 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              <span className="text-sm">
                {t("agencyAuth.back_to_home", { defaultValue: "Back to home" })}
              </span>
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Motonita home" className="md:hidden inline-flex">
              <img src={logoUrl} alt="Motonita" className="h-6 w-auto" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">
                    {currentLang.flag} {currentLang.code.toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {LANGS.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => handleLangChange(l.code)}
                    className="gap-2"
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Centered form */}
        <div className="flex-1 flex items-start sm:items-center justify-center px-5 sm:px-8 pb-10">
          <div className="w-full max-w-[460px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
