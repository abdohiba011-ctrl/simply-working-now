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
  /** Kept for backward compatibility — no longer rendered. */
  heroTitle?: string;
  heroSubtitle?: string;
}

const LANGS: Array<{ code: "en" | "fr" | "ar"; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
];

/**
 * Single-column, centered auth layout. No split / no green hero column.
 * One dedicated page for login, signup, forgot password, OTP and new password.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { i18n } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const currentLang = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  const handleLangChange = (code: "en" | "fr" | "ar") => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
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

      {/* Centered card */}
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[440px]">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm px-6 py-8 sm:px-8 sm:py-10"
               style={{ borderColor: "rgba(22,51,0,0.08)" }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
