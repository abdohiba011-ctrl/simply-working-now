import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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

// Morocco map bounding box
const MAP_BOUNDS = { minLng: -17.5, maxLng: -0.5, minLat: 21.0, maxLat: 36.5 };
const VIEW_W = 600;
const VIEW_H = 720;

const project = (lat: number, lng: number) => {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * VIEW_W;
  const y = VIEW_H - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * VIEW_H;
  return { x, y };
};

export const CitiesAvailableSection = () => {
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

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

  // Default highlight: Casablanca if present
  const activePoint =
    points.find((p) => p.key === hoveredCity) ||
    points.find((p) => p.key === "casablanca") ||
    points[0];

  return (
    <section className="bg-foreground text-background py-20" aria-labelledby="cities-available-heading">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 id="cities-available-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {t("cities.availableTitle") || "We reach you everywhere!"}
          </h2>
          <p className="text-background/70 text-base md:text-lg">
            {t("cities.availableSubtitle") ||
              "Available across Morocco's major cities — from Casablanca to Rabat, Marrakech and beyond."}
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Map of Morocco showing available cities"
          >
            {/* Simplified Morocco silhouette */}
            <path
              d="
                M 380 80
                L 430 110
                L 470 150
                L 495 200
                L 510 260
                L 500 310
                L 475 350
                L 450 380
                L 410 410
                L 380 450
                L 360 500
                L 350 560
                L 330 610
                L 290 650
                L 240 680
                L 180 690
                L 130 670
                L 90 630
                L 70 580
                L 80 520
                L 100 470
                L 130 430
                L 160 400
                L 180 370
                L 200 340
                L 215 300
                L 230 260
                L 245 220
                L 265 180
                L 290 140
                L 325 105
                Z
              "
              fill="hsl(var(--background) / 0.18)"
              stroke="hsl(var(--background) / 0.35)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* City dots */}
            {points.map((p) => {
              const isActive = activePoint?.key === p.key;
              return (
                <g
                  key={p.id}
                  onMouseEnter={() => setHoveredCity(p.key)}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={() => navigate(`/rent/${cityToSlug(p.key)}`)}
                  className="cursor-pointer"
                >
                  {isActive && (
                    <circle cx={p.x} cy={p.y} r="14" fill="hsl(var(--primary) / 0.25)">
                      <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 7 : 5}
                    fill={isActive ? "hsl(var(--primary))" : "hsl(var(--background))"}
                    stroke="hsl(var(--foreground))"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

            {/* Active city tooltip */}
            {activePoint && (
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={activePoint.x - 70}
                  y={activePoint.y - 50}
                  width="140"
                  height="32"
                  rx="16"
                  fill="hsl(var(--background))"
                />
                <text
                  x={activePoint.x}
                  y={activePoint.y - 30}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="14"
                  fontWeight="600"
                >
                  {activePoint.label}
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="text-center mt-12">
          <h3 className="text-xl md:text-2xl font-semibold mb-5">
            {t("cities.coverageQuestion") || "Do we cover your city?"}
          </h3>
          <Button
            size="lg"
            onClick={() => navigate("/agencies")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("cities.checkNow") || "Check now"}
            <ChevronRight className={`h-4 w-4 ${isRTL ? "mr-2 rotate-180" : "ml-2"}`} />
          </Button>
        </div>
      </div>
    </section>
  );
};
