import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe, Check } from "lucide-react";

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
import logoWhite from "@/assets/motonita-logo-white.svg";
import heroImage from "@/assets/auth-renter-hero.jpg";

interface RenterAuthLayoutProps {
  children: ReactNode;
}

const LANGS: Array<{ code: "en" | "fr" | "ar"; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
];

/**
 * Split-screen layout for RENTER auth pages (login / signup / forgot pwd).
 * Left: hero photo + tagline + trust badges (md+).
 * Right: form column with back-to-home + language switcher.
 *
 * Mirrors AgencyAuthLayout in structure so visual quality matches, but
 * uses renter-specific imagery, copy, and trust signals.
 */
export function RenterAuthLayout({ children }: RenterAuthLayoutProps) {
  const { t, i18n } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const currentLang = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];
  const { theme } = useTheme();
  const logoUrl = theme === "dark" ? logoDark : logoLight;

  const handleLangChange = (code: "en" | "fr" | "ar") => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  const trustBadges = [
    t("renterAuth.trust_verified", { defaultValue: "Verified agencies only" }),
    t("renterAuth.trust_cashplus", { defaultValue: "Cash Plus accepted" }),
    t("renterAuth.trust_languages", {
      defaultValue: "Arabic, French & English",
    }),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile-only branded strip */}
      <div
        className="md:hidden flex items-center justify-center gap-2 py-3 px-4"
        style={{ backgroundColor: "#163300" }}
      >
        <img src={logoWhite} alt="Motonita" className="h-6 w-auto" />
      </div>

      {/* LEFT — hero panel (md+) */}
      <aside className="relative hidden md:block md:w-[40%] lg:w-1/2 overflow-hidden">
        <img
          src={heroImage}
          alt={t("renterAuth.image_alt", {
            defaultValue: "A traveler riding a scooter through a Moroccan city",
          })}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        {/* Brand color gradient overlay (#163300 → #1a4d00) for legibility & on-brand feel */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(22,51,0,0.55) 0%, rgba(22,51,0,0.35) 40%, rgba(22,51,0,0.85) 100%)",
          }}
        />

        {/* Brand logo top-left */}
        <div className="absolute top-6 start-6">
          <img src={logoWhite} alt="Motonita" className="h-7 w-auto" />
        </div>

        {/* Title + subtitle */}
        <div className="absolute inset-x-0 bottom-0 px-8 pb-8 lg:px-12 lg:pb-12 text-white">
          <p
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider mb-4"
            style={{ backgroundColor: "rgba(159,232,112,0.2)", color: "#9FE870" }}
          >
            {t("renterAuth.pill", { defaultValue: "For riders & travelers" })}
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight max-w-md">
            {t("renterAuth.tagline", {
              defaultValue: "Explore Morocco on two wheels",
            })}
          </h2>
          <p className="mt-3 text-sm lg:text-base text-white/85 max-w-md">
            {t("renterAuth.tagline_sub", {
              defaultValue:
                "Book verified motorbikes & scooters in 60 seconds.",
            })}
          </p>

          {/* Trust badges */}
          <ul className="mt-6 space-y-2">
            {trustBadges.map((label) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm text-white/90"
              >
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#9FE870", color: "#163300" }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {label}
              </li>
            ))}
          </ul>
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
                {t("renterAuth.back_to_home", { defaultValue: "Back to home" })}
              </span>
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              aria-label="Motonita home"
              className="md:hidden inline-flex"
            >
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
