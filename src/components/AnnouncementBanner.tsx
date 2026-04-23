import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Sticky announcement banner that scrolls trilingual marketing copy.
 *
 * - Background: brand lime (#9FE870)
 * - Height: 40px
 * - Sticky to top of page (sits above the main Header)
 * - Always visible (no dismiss)
 * - Marquee: ~30s right-to-left pass, pauses on hover
 * - Respects `prefers-reduced-motion` → static, centered content
 * - RTL-aware (Arabic): scroll direction flips
 */

const LIME = "#9FE870";
const FOREST = "#163300";

type Segment = ReactNode;

function buildSegments(language: "en" | "fr" | "ar"): Segment[] {
  if (language === "fr") {
    return [
      <span key="title" className="font-bold" style={{ color: FOREST }}>
        Location de moto et scooter au Maroc
      </span>,
      <span key="d1" className="mx-3" style={{ color: FOREST }}>
        ·
      </span>,
      <span key="cities" style={{ color: FOREST }}>
        Casablanca · Marrakech · Agadir · Rabat · Tangier · Fes
      </span>,
      <span key="more" className="mx-2 italic" style={{ color: FOREST }}>
        — et d'autres villes bientôt
      </span>,
      <span key="d2" className="mx-3" style={{ color: FOREST }}>
        ·
      </span>,
      <span key="f1" className="font-semibold" style={{ color: FOREST }}>
        ✓ Agences vérifiées
      </span>,
      <span key="d3" className="mx-3" style={{ color: FOREST }}>
        ·
      </span>,
      <span key="f2" className="font-semibold" style={{ color: FOREST }}>
        ✓ Réservé en 60 secondes
      </span>,
      <span key="d4" className="mx-3" style={{ color: FOREST }}>
        ·
      </span>,
      <span key="f3" className="font-semibold" style={{ color: FOREST }}>
        ✓ Cash Plus accepté
      </span>,
    ];
  }
  if (language === "ar") {
    return [
      <span key="title" className="font-bold" style={{ color: FOREST }}>
        كراء الدراجات النارية والسكوتر في المغرب
      </span>,
      <span key="d1" className="mx-3" style={{ color: FOREST }}>
        ·
      </span>,
      <span key="cities" style={{ color: FOREST }}>
        الدار البيضاء · مراكش · أكادير · الرباط · طنجة · فاس
      </span>,
      <span key="more" className="mx-2 italic" style={{ color: FOREST }}>
        — ومدن أخرى قريباً
      </span>,
      <span key="d2" className="mx-3" style={{ color: FOREST }}>
        ·
      </span>,
      <span key="f1" className="font-semibold" style={{ color: FOREST }}>
        ✓ وكالات موثقة
      </span>,
      <span key="d3" className="mx-3" style={{ color: FOREST }}>
        ·
      </span>,
      <span key="f2" className="font-semibold" style={{ color: FOREST }}>
        ✓ احجز في 60 ثانية
      </span>,
      <span key="d4" className="mx-3" style={{ color: FOREST }}>
        ·
      </span>,
      <span key="f3" className="font-semibold" style={{ color: FOREST }}>
        ✓ نقبل كاش بلوس
      </span>,
    ];
  }
  // default: English
  return [
    <span key="title" className="font-bold" style={{ color: FOREST }}>
      Motorbike & scooter rental in Morocco
    </span>,
    <span key="d1" className="mx-3" style={{ color: FOREST }}>
      ·
    </span>,
    <span key="cities" style={{ color: FOREST }}>
      Casablanca · Marrakech · Agadir · Rabat · Tangier · Fes
    </span>,
    <span key="more" className="mx-2 italic" style={{ color: FOREST }}>
      — and more cities coming soon
    </span>,
    <span key="d2" className="mx-3" style={{ color: FOREST }}>
      ·
    </span>,
    <span key="f1" className="font-semibold" style={{ color: FOREST }}>
      ✓ Verified agencies
    </span>,
    <span key="d3" className="mx-3" style={{ color: FOREST }}>
      ·
    </span>,
    <span key="f2" className="font-semibold" style={{ color: FOREST }}>
      ✓ Booked in 60 seconds
    </span>,
    <span key="d4" className="mx-3" style={{ color: FOREST }}>
      ·
    </span>,
    <span key="f3" className="font-semibold" style={{ color: FOREST }}>
      ✓ Cash Plus accepted
    </span>,
  ];
}

export const AnnouncementBanner = () => {
  const { language, isRTL } = useLanguage();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mql.matches);
    apply();
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, []);

  const segments = buildSegments(language as "en" | "fr" | "ar");

  // Single content block (we duplicate it for the seamless marquee loop)
  const content = (
    <span className="inline-flex items-center whitespace-nowrap text-sm font-normal leading-none">
      {segments}
    </span>
  );

  return (
    <div
      className="relative z-[110] w-full"
      style={{ backgroundColor: LIME, height: 40 }}
      role="region"
      aria-label="Site announcement"
    >
      <div className="relative flex h-10 items-center overflow-hidden">
        {reducedMotion ? (
          <div className="flex h-10 w-full items-center justify-center px-12">
            {content}
          </div>
        ) : (
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
      </div>
    </div>
  );
};

export default AnnouncementBanner;
