import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cityToSlug } from "@/lib/citySlug";

// Approximate lat/lng for major Moroccan cities
const CITY_COORDS: Record<string, { lat: number; lng: number; label: { en: string; fr: string; ar: string } }> = {
  casablanca:  { lat: 33.5731, lng: -7.5898,  label: { en: "Casablanca",  fr: "Casablanca",  ar: "الدار البيضاء" } },
  rabat:       { lat: 34.0209, lng: -6.8416,  label: { en: "Rabat",       fr: "Rabat",       ar: "الرباط" } },
  marrakesh:   { lat: 31.6295, lng: -7.9811,  label: { en: "Marrakech",   fr: "Marrakech",   ar: "مراكش" } },
  marrakech:   { lat: 31.6295, lng: -7.9811,  label: { en: "Marrakech",   fr: "Marrakech",   ar: "مراكش" } },
  tangier:     { lat: 35.7595, lng: -5.8340,  label: { en: "Tangier",     fr: "Tanger",      ar: "طنجة" } },
  fes:         { lat: 34.0181, lng: -5.0078,  label: { en: "Fes",         fr: "Fès",         ar: "فاس" } },
  meknes:      { lat: 33.8935, lng: -5.5473,  label: { en: "Meknes",      fr: "Meknès",      ar: "مكناس" } },
  agadir:      { lat: 30.4278, lng: -9.5981,  label: { en: "Agadir",      fr: "Agadir",      ar: "أكادير" } },
  essaouira:   { lat: 31.5085, lng: -9.7595,  label: { en: "Essaouira",   fr: "Essaouira",   ar: "الصويرة" } },
  chefchaouen: { lat: 35.1689, lng: -5.2636,  label: { en: "Chefchaouen", fr: "Chefchaouen", ar: "شفشاون" } },
  tetouan:     { lat: 35.5785, lng: -5.3684,  label: { en: "Tetouan",     fr: "Tétouan",     ar: "تطوان" } },
  oujda:       { lat: 34.6814, lng: -1.9086,  label: { en: "Oujda",       fr: "Oujda",       ar: "وجدة" } },
  nador:       { lat: 35.1681, lng: -2.9335,  label: { en: "Nador",       fr: "Nador",       ar: "الناظور" } },
  kenitra:     { lat: 34.2610, lng: -6.5802,  label: { en: "Kenitra",     fr: "Kénitra",     ar: "القنيطرة" } },
  "el-jadida": { lat: 33.2316, lng: -8.5007,  label: { en: "El Jadida",   fr: "El Jadida",   ar: "الجديدة" } },
  ifrane:      { lat: 33.5333, lng: -5.1167,  label: { en: "Ifrane",      fr: "Ifrane",      ar: "إفران" } },
  dakhla:      { lat: 23.6848, lng: -15.9579, label: { en: "Dakhla",      fr: "Dakhla",      ar: "الداخلة" } },
};

// Morocco map bounding box — covers from Western Sahara to the north
const MAP_BOUNDS = { minLng: -17.5, maxLng: -0.5, minLat: 21.0, maxLat: 36.5 };
const VIEW_W = 600;
const VIEW_H = 720;

const project = (lat: number, lng: number) => {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * VIEW_W;
  const y = VIEW_H - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * VIEW_H;
  return { x, y };
};

// Simplified polygons of Morocco's 12 administrative regions, in [lng, lat].
// Hand-tuned to be lightweight (~10 vertices each) yet recognizable as Morocco
// when assembled. Northern regions are denser; southern Sahara regions wider.
type Region = { id: string; name: string; coords: Array<[number, number]> };

const REGIONS: Region[] = [
  // ---- Northern Morocco ----
  { id: "tanger-tetouan", name: "Tanger-Tétouan-Al Hoceïma", coords: [
    [-6.0,35.92],[-5.3,35.78],[-4.6,35.45],[-3.9,35.30],[-3.55,35.18],
    [-3.85,34.85],[-4.55,34.85],[-5.30,34.95],[-5.95,35.10],[-6.30,35.40],[-6.30,35.78],
  ]},
  { id: "oriental", name: "Oriental", coords: [
    [-3.55,35.18],[-2.20,35.10],[-1.05,34.75],[-1.05,33.40],[-1.55,32.50],
    [-2.40,32.40],[-3.25,32.95],[-3.85,33.50],[-3.95,34.10],[-3.85,34.85],
  ]},
  // ---- North-central ----
  { id: "fes-meknes", name: "Fès-Meknès", coords: [
    [-5.95,35.10],[-5.30,34.95],[-4.55,34.85],[-3.85,34.85],[-3.85,33.50],
    [-4.55,33.40],[-5.30,33.55],[-5.85,33.85],[-6.20,34.30],[-6.20,34.80],
  ]},
  { id: "rabat-sale", name: "Rabat-Salé-Kénitra", coords: [
    [-6.95,35.05],[-6.20,34.80],[-6.20,34.30],[-5.85,33.85],[-6.30,33.65],
    [-6.95,33.75],[-7.40,34.10],[-7.30,34.55],[-7.10,34.85],
  ]},
  { id: "beni-mellal", name: "Béni Mellal-Khénifra", coords: [
    [-5.85,33.85],[-5.30,33.55],[-4.55,33.40],[-3.85,33.50],[-3.25,32.95],
    [-3.95,32.45],[-5.05,32.20],[-5.85,32.55],[-6.30,32.95],[-6.30,33.65],
  ]},
  // ---- Central / Atlantic ----
  { id: "casablanca-settat", name: "Casablanca-Settat", coords: [
    [-7.40,34.10],[-6.95,33.75],[-6.30,33.65],[-6.30,32.95],[-6.85,32.55],
    [-7.65,32.30],[-8.45,32.40],[-8.95,32.70],[-9.05,33.05],[-8.65,33.40],[-8.10,33.80],
  ]},
  { id: "marrakech-safi", name: "Marrakech-Safi", coords: [
    [-8.10,33.80],[-8.65,33.40],[-9.05,33.05],[-8.95,32.70],[-9.55,32.05],
    [-9.85,31.40],[-9.55,30.95],[-8.65,30.85],[-7.85,30.95],[-7.05,31.20],
    [-6.55,31.60],[-6.30,32.20],[-6.85,32.55],[-7.65,32.30],
  ]},
  { id: "draa-tafilalet", name: "Drâa-Tafilalet", coords: [
    [-3.95,32.45],[-3.25,32.95],[-2.40,32.40],[-1.95,31.40],[-2.55,30.45],
    [-3.85,29.75],[-5.05,29.55],[-5.85,29.85],[-6.30,30.55],[-6.55,31.20],
    [-6.30,31.85],[-5.85,32.55],[-5.05,32.20],
  ]},
  // ---- South ----
  { id: "souss-massa", name: "Souss-Massa", coords: [
    [-9.85,31.40],[-9.55,30.95],[-8.65,30.85],[-7.85,30.95],[-7.05,31.20],
    [-6.55,31.20],[-6.30,30.55],[-6.85,29.85],[-7.85,29.45],[-9.05,29.55],
    [-9.85,29.95],[-10.05,30.55],
  ]},
  { id: "guelmim", name: "Guelmim-Oued Noun", coords: [
    [-10.05,30.55],[-9.85,29.95],[-9.05,29.55],[-7.85,29.45],[-6.85,29.85],
    [-5.85,29.85],[-5.05,29.55],[-5.55,28.55],[-7.05,28.05],[-9.05,27.95],
    [-10.55,28.30],[-11.05,29.10],[-10.85,29.95],
  ]},
  { id: "laayoune", name: "Laâyoune-Sakia El Hamra", coords: [
    [-11.05,29.10],[-10.55,28.30],[-9.05,27.95],[-7.05,28.05],[-7.05,26.05],
    [-9.05,25.95],[-11.85,26.55],[-13.05,27.65],[-13.55,28.45],
  ]},
  { id: "dakhla", name: "Dakhla-Oued Ed-Dahab", coords: [
    [-13.05,27.65],[-11.85,26.55],[-9.05,25.95],[-9.05,23.05],[-11.05,21.55],
    [-13.05,21.45],[-15.55,22.85],[-16.85,24.55],[-15.95,26.05],[-14.55,27.05],
  ]},
];

export const CitiesAvailableSection = () => {
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const { data: cities = [] } = useQuery({
    queryKey: ["cities-available-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_cities")
        .select("id, name, name_key, is_available, is_coming_soon")
        .eq("is_available", true);
      if (error) throw error;
      return data || [];
    },
  });

  const points = cities
    .map((c) => {
      const key = (c.name_key || c.name || "").toLowerCase().trim();
      const coords = CITY_COORDS[key];
      if (!coords) return null;
      const { x, y } = project(coords.lat, coords.lng);
      const label = coords.label[language as "en" | "fr" | "ar"] || coords.label.en;
      return { id: c.id, key, label, x, y, comingSoon: !!c.is_coming_soon };
    })
    .filter(Boolean) as Array<{ id: string; key: string; label: string; x: number; y: number; comingSoon: boolean }>;

  // Clear selection on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const target = e.target as HTMLElement;
      if (!target.closest("[data-city-dot]") && !target.closest("[data-city-tooltip]") && !target.closest("[data-city-chip]")) {
        setSelectedCity(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleCityActivate = (key: string) => {
    if (selectedCity === key) {
      navigate(`/rent/${cityToSlug(key)}`);
    } else {
      setSelectedCity(key);
    }
  };

  const activePoint =
    points.find((p) => p.key === (selectedCity || hoveredCity)) || null;

  // Pre-project region paths once per render
  const regionPaths = REGIONS.map((r) => {
    const d =
      r.coords
        .map(([lng, lat], i) => {
          const { x, y } = project(lat, lng);
          return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ") + " Z";
    return { id: r.id, d };
  });

  return (
    <section
      ref={sectionRef}
      className="relative bg-foreground text-background py-20 lg:py-28 overflow-hidden"
      aria-labelledby="cities-available-heading"
    >
      {/* Subtle dot-grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--background)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="container relative mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1 text-xs font-medium text-background/80 mb-5">
            <MapPin className="h-3.5 w-3.5" />
            {t("cities.checkNow")}
          </div>
          <h2
            id="cities-available-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4"
          >
            {t("cities.availableTitle")}
          </h2>
          <p className="text-background/70 text-base md:text-lg">
            {t("cities.availableSubtitle")}
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Map of Morocco showing available cities"
          >
            {/* Soft glow under the map */}
            <defs>
              <radialGradient id="moroccoGlow" cx="50%" cy="55%" r="55%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#moroccoGlow)" />

            {/* Regions */}
            <g>
              {regionPaths.map((r) => (
                <path
                  key={r.id}
                  d={r.d}
                  fill="hsl(var(--background) / 0.10)"
                  stroke="hsl(var(--background) / 0.35)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              ))}
            </g>

            {/* City dots */}
            {points.map((p) => {
              const isSelected = selectedCity === p.key;
              const isHover = hoveredCity === p.key;
              const isActive = isSelected || isHover;
              return (
                <g
                  key={p.id}
                  data-city-dot
                  onMouseEnter={() => setHoveredCity(p.key)}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCityActivate(p.key);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCityActivate(p.key);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={p.label}
                  aria-pressed={isSelected}
                  className="cursor-pointer focus:outline-none"
                >
                  {isSelected && (
                    <circle cx={p.x} cy={p.y} r="14" fill="hsl(var(--primary) / 0.30)">
                      <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 7 : 5}
                    fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--background))"}
                    stroke={isSelected ? "hsl(var(--background))" : "hsl(var(--foreground))"}
                    strokeWidth="1.5"
                  />
                  {/* Larger invisible hit-area for mobile */}
                  <circle cx={p.x} cy={p.y} r="18" fill="transparent" />
                </g>
              );
            })}

            {/* Active city tooltip pill */}
            {activePoint && (
              <g
                data-city-tooltip
                style={{ cursor: selectedCity === activePoint.key ? "pointer" : "default" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedCity === activePoint.key) {
                    navigate(`/rent/${cityToSlug(activePoint.key)}`);
                  }
                }}
              >
                {(() => {
                  const padX = 14;
                  const iconW = 16;
                  const gap = 8;
                  // approximate text width (avg ~7.5px per char at fontSize 14)
                  const textW = Math.max(60, activePoint.label.length * 7.5);
                  const w = padX * 2 + textW + (selectedCity === activePoint.key ? gap + iconW : 0);
                  const h = 34;
                  const x = activePoint.x - w / 2;
                  const y = activePoint.y - 52;
                  return (
                    <>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx={h / 2}
                        fill="hsl(var(--background))"
                        filter="drop-shadow(0 4px 12px hsl(var(--foreground) / 0.35))"
                      />
                      <text
                        x={x + padX + textW / 2}
                        y={y + h / 2 + 5}
                        textAnchor="middle"
                        fill="hsl(var(--foreground))"
                        fontSize="14"
                        fontWeight="600"
                      >
                        {activePoint.label}
                      </text>
                      {selectedCity === activePoint.key && (
                        <g transform={`translate(${x + padX + textW + gap}, ${y + h / 2 - 8}) ${isRTL ? "rotate(180 8 8)" : ""}`}>
                          {/* ChevronRight glyph */}
                          <path
                            d="M5 3 L11 8 L5 13"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                      {/* Little notch */}
                      <path
                        d={`M ${activePoint.x - 6} ${y + h} L ${activePoint.x} ${y + h + 7} L ${activePoint.x + 6} ${y + h} Z`}
                        fill="hsl(var(--background))"
                      />
                    </>
                  );
                })()}
              </g>
            )}
          </svg>

          {/* Helper hint when a city is selected (1st tap) */}
          {selectedCity && (
            <p className="mt-2 text-center text-xs text-background/60 animate-fade-in">
              {t("cities.tapAgainHint")}
            </p>
          )}
        </div>

        {/* City legend chips */}
        {points.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {points.map((p) => {
              const isSelected = selectedCity === p.key;
              return (
                <button
                  key={p.id}
                  data-city-chip
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCityActivate(p.key);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background/5 text-background/80 border-background/15 hover:bg-background/10"
                  }`}
                  aria-pressed={isSelected}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <h3 className="text-xl md:text-2xl font-semibold mb-5">
            {t("cities.coverageQuestion")}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/agencies")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("cities.checkNow")}
              <ChevronRight className={`h-4 w-4 ${isRTL ? "mr-2 rotate-180" : "ml-2"}`} />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate("/contact")}
              className="text-background hover:bg-background/10 hover:text-background"
            >
              {t("cities.suggestCity")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
