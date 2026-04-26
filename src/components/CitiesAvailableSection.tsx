import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cityToSlug } from "@/lib/citySlug";
import { MOROCCO_REGIONS, MOROCCO_VIEWBOX } from "@/data/moroccoRegions";

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
// SimpleMaps Morocco SVG is in a 1000x1000 viewBox, already projected.
// We derive a linear lat/lng -> SVG transform from two known region centroids
// in the source SVG (Tangier-Tetouan at (-5.83, 35.76) -> (692.1, 98.1) and
// Dakhla at (-15.96, 23.68) -> (212.6, 835)) so our city dots land inside
// the correct region without re-projecting the country shape.
const VIEW_W = MOROCCO_VIEWBOX.w;
const VIEW_H = MOROCCO_VIEWBOX.h;

const project = (lat: number, lng: number) => {
  const x = 968.1 + 47.34 * lng;
  const y = 2279.5 - 61.0 * lat;
  return { x, y };
};

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

  // Region paths come pre-projected from the SimpleMaps source — just render them.
  const regionPaths = MOROCCO_REGIONS;


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
            {/* Regions — uniform fill, no color highlight */}
            <g>
              {regionPaths.map((r) => (
                <path
                  key={r.id}
                  d={r.d}
                  fill="hsl(var(--background) / 0.18)"
                  stroke="hsl(var(--background) / 0.45)"
                  strokeWidth="1.4"
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
                    <circle cx={p.x} cy={p.y} r="22" fill="hsl(var(--primary) / 0.30)">
                      <animate attributeName="r" values="16;32;16" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 11 : 8}
                    fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--background))"}
                    stroke={isSelected ? "hsl(var(--background))" : "hsl(var(--foreground))"}
                    strokeWidth="2"
                  />
                  {/* Larger invisible hit-area for mobile */}
                  <circle cx={p.x} cy={p.y} r="28" fill="transparent" />
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
                  const padX = 20;
                  const iconW = 22;
                  const gap = 10;
                  // approximate text width (avg ~10.5px per char at fontSize 20)
                  const textW = Math.max(80, activePoint.label.length * 10.5);
                  const w = padX * 2 + textW + (selectedCity === activePoint.key ? gap + iconW : 0);
                  const h = 48;
                  const x = activePoint.x - w / 2;
                  const y = activePoint.y - 72;
                  return (
                    <>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx={h / 2}
                        fill="hsl(var(--background))"
                        filter="drop-shadow(0 6px 16px hsl(var(--foreground) / 0.45))"
                      />
                      <text
                        x={x + padX + textW / 2}
                        y={y + h / 2 + 7}
                        textAnchor="middle"
                        fill="hsl(var(--foreground))"
                        fontSize="20"
                        fontWeight="600"
                      >
                        {activePoint.label}
                      </text>
                      {selectedCity === activePoint.key && (
                        <g transform={`translate(${x + padX + textW + gap}, ${y + h / 2 - 11}) ${isRTL ? "rotate(180 11 11)" : ""}`}>
                          {/* ChevronRight glyph */}
                          <path
                            d="M7 4 L15 11 L7 18"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                      {/* Little notch */}
                      <path
                        d={`M ${activePoint.x - 9} ${y + h} L ${activePoint.x} ${y + h + 10} L ${activePoint.x + 9} ${y + h} Z`}
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
          <p className="mt-3 text-center text-[10px] text-background/40">
            Map © SimpleMaps
          </p>
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
