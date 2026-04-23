import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Sticky announcement banner that scrolls trilingual marketing copy.
 *
 * - Background: deep forest (#163300)
 * - Height: 40px
 * - Sticky to top of page (sits above the main Header)
 * - Dismissable per-session (sessionStorage)
 * - Marquee: ~30s right-to-left pass, pauses on hover
 * - Respects `prefers-reduced-motion` → static, centered content
 * - RTL-aware (Arabic): scroll direction flips
 */

const FOREST = "#163300";
const LIME = "#9FE870";
const SESSION_KEY = "motonita_announcement_banner_dismissed";

type Segment = ReactNode;

function buildSegments(language: "en" | "fr" | "ar"): Segment[] {
  if (language === "fr") {
    return [
      <span key="emoji" className="mr-2" aria-hidden>
        🏍️
      </span>,
      <span key="title" className="font-bold text-white">
        Location de moto et scooter au Maroc
      </span>,
      <span key="d1" className="mx-3" style={{ color: LIME }}>
        ·
      </span>,
      <span key="cities" className="text-white">
        Casablanca · Marrakech · Agadir · Rabat · Tangier · Fes
      </span>,
      <span key="more" className="mx-2 italic" style={{ color: LIME }}>
        — et d'autres villes bientôt
      </span>,
      <span key="d2" className="mx-3" style={{ color: LIME }}>
        ·
      </span>,
      <span key="f1" className="font-semibold text-white">
        ✓ Agences vérifiées
      </span>,
      <span key="d3" className="mx-3" style={{ color: LIME }}>
        ·
      </span>,
      <span key="f2" className="font-semibold text-white">
        ✓ Réservé en 60 secondes
      </span>,
      <span key="d4" className="mx-3" style={{ color: LIME }}>
        ·
      </span>,
      <span key="f3" className="font-semibold text-white">
        ✓ Cash Plus accepté
      </span>,
    ];
  }
  if (language === "ar") {
    return [
      <span key="emoji" className="ml-2" aria-hidden>
        🏍️
      </span>,
      <span key="title" className="font-bold text-white">
        كراء الدراجات النارية والسكوتر في المغرب
      </span>,
      <span key="d1" className="mx-3" style={{ color: LIME }}>
        ·
      </span>,
      <span key="cities" className="text-white">
        الدار البيضاء · مراكش · أكادير · الرباط · طنجة · فاس
      </span>,
      <span key="more" className="mx-2 italic" style={{ color: LIME }}>
        — ومدن أخرى قريباً
      </span>,
      <span key="d2" className="mx-3" style={{ color: LIME }}>
        ·
      </span>,
      <span key="f1" className="font-semibold text-white">
        ✓ وكالات موثقة
      </span>,
      <span key="d3" className="mx-3" style={{ color: LIME }}>
        ·
      </span>,
      <span key="f2" className="font-semibold text-white">
        ✓ احجز في 60 ثانية
      </span>,
      <span key="d4" className="mx-3" style={{ color: LIME }}>
        ·
      </span>,
      <span key="f3" className="font-semibold text-white">
        ✓ نقبل كاش بلوس
      </span>,
    ];
  }
  // default: English
  return [
    <span key="emoji" className="mr-2" aria-hidden>
      🏍️
    </span>,
    <span key="title" className="font-bold text-white">
      Motorbike & scooter rental in Morocco
    </span>,
    <span key="d1" className="mx-3" style={{ color: LIME }}>
      ·
    </span>,
    <span key="cities" className="text-white">
      Casablanca · Marrakech · Agadir · Rabat · Tangier · Fes
    </span>,
    <span key="more" className="mx-2 italic" style={{ color: LIME }}>
      — and more cities coming soon
    </span>,
    <span key="d2" className="mx-3" style={{ color: LIME }}>
      ·
    </span>,
    <span key="f1" className="font-semibold text-white">
      ✓ Verified agencies
    </span>,
    <span key="d3" className="mx-3" style={{ color: LIME }}>
      ·
    </span>,
    <span key="f2" className="font-semibold text-white">
      ✓ Booked in 60 seconds
    </span>,
    <span key="d4" className="mx-3" style={{ color: LIME }}>
      ·
    </span>,
    <span key="f3" className="font-semibold text-white">
      ✓ Cash Plus accepted
    </span>,
  ];
}

export const AnnouncementBanner = () => {
  const { language, isRTL } = useLanguage();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mql.matches);
    apply();
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, []);

  if (dismissed) return null;

  const segments = buildSegments(language as "en" | "fr" | "ar");

  // Single content block (we duplicate it for the seamless marquee loop)
  const content = (
    <span className="inline-flex items-center whitespace-nowrap text-sm font-normal leading-none">
      {segments}
    </span>
  );

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div
      className="sticky top-0 z-[110] w-full"
      style={{ backgroundColor: FOREST, height: 40 }}
      role="region"
      aria-label="Site announcement"
    >
      <div className="relative flex h-10 items-center overflow-hidden">
        {reducedMotion ? (
          // Reduced motion: static, centered, no scroll
          <div className="flex h-10 w-full items-center justify-center px-12">
            {content}
          </div>
        ) : (
          // Marquee: 30s, pauses on hover, RTL flips direction
          <div
            className={cn(
              "marquee-track group flex h-10 min-w-full items-center",
              isRTL ? "marquee-track--rtl" : "marquee-track--ltr",
            )}
          >
            <div className="flex shrink-0 items-center gap-8 px-8">{content}</div>
            <div
              className="flex shrink-0 items-center gap-8 px-8"
              aria-hidden="true"
            >
              {content}
            </div>
          </div>
        )}

        {/* Dismiss button — fixed to inline-end edge */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className={cn(
            "absolute inset-y-0 my-auto flex h-7 w-7 items-center justify-center rounded text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            isRTL ? "left-2" : "right-2",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
