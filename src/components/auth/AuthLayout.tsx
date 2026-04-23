import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/stores/useLanguageStore";
import logoUrl from "@/assets/motonita-logo.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  heroTitle?: string;
  heroSubtitle?: string;
}

const LANGS: Array<{ code: "en" | "fr" | "ar"; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
];

export function AuthLayout({ children, heroTitle, heroSubtitle }: AuthLayoutProps) {
  const { i18n } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const currentLang = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  const handleLangChange = (code: "en" | "fr" | "ar") => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" aria-label="Motonita home" className="inline-flex items-center">
          <img src={logoUrl} alt="Motonita" className="h-7 w-auto" />
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
      </header>

      {/* Form column */}
      <main className="flex-1 flex items-center justify-center px-6 py-20 md:py-12">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>

      {/* Hero column (desktop only) */}
      <aside
        className="hidden md:flex md:w-1/2 relative items-center justify-center overflow-hidden"
        style={{ backgroundColor: "#9FE870" }}
        aria-hidden="true"
      >
        {/* Diagonal pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #163300 0, #163300 1px, transparent 1px, transparent 14px)",
          }}
        />
        <div className="relative z-10 max-w-md text-center px-8">
          <img src={logoUrl} alt="" className="h-10 w-auto mx-auto mb-8" />
          <h2
            className="text-3xl font-bold tracking-tight mb-4"
            style={{ color: "#163300" }}
          >
            {heroTitle ?? "Morocco's first peer-to-peer motorbike rental marketplace"}
          </h2>
          {heroSubtitle ? (
            <p className="text-base mb-8" style={{ color: "#163300", opacity: 0.75 }}>
              {heroSubtitle}
            </p>
          ) : null}
          <div
            className="inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-sm px-4 py-2 text-sm font-medium"
            style={{ color: "#163300" }}
          >
            <span>★★★★★</span>
            <span>500+ agencies trust Motonita</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
