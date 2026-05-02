import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { MapPin, Building2, Calendar as CalendarIcon, Bike, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cityToSlug } from "@/lib/citySlug";
import { supabase } from "@/integrations/supabase/client";

import casablancaImg from "@/assets/city-casablanca.avif";
import marrakechImg from "@/assets/city-marrakesh.avif";
import rabatImg from "@/assets/city-rabat.avif";
import tangierImg from "@/assets/city-tangier.avif";
import agadirImg from "@/assets/city-agadir.avif";
import fesImg from "@/assets/city-fes.avif";
import dakhlaImg from "@/assets/city-dakhla.jpg";
import essaouiraImg from "@/assets/city-essaouira.avif";

type RotatingCity =
  | "Casablanca"
  | "Marrakech"
  | "Rabat"
  | "Tangier"
  | "Agadir"
  | "Fes"
  | "Dakhla"
  | "Essaouira";

const rotatingCities: RotatingCity[] = [
  "Casablanca",
  "Marrakech",
  "Rabat",
  "Tangier",
  "Agadir",
  "Fes",
  "Dakhla",
  "Essaouira",
];

const cityImages: Record<RotatingCity, string> = {
  Casablanca: casablancaImg,
  Marrakech: marrakechImg,
  Rabat: rabatImg,
  Tangier: tangierImg,
  Agadir: agadirImg,
  Fes: fesImg,
  Dakhla: dakhlaImg,
  Essaouira: essaouiraImg,
};

const allCities = [
  "Casablanca",
  "Marrakech",
  "Rabat",
  "Tangier",
  "Agadir",
  "Fes",
  "Dakhla",
  "Essaouira",
  "Meknes",
  "Oujda",
  "Tetouan",
  "El Jadida",
  "Kenitra",
  "Nador",
  "Ifrane",
  "Chefchaouen",
];

const ALL_NEIGHBORHOODS = "all";

export const HeroSection = memo(() => {
  const navigate = useNavigate();
  const [cityIndex, setCityIndex] = useState(0);
  const [pillVisible, setPillVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [city, setCity] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>(ALL_NEIGHBORHOODS);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Cities loaded from DB so the dropdown reflects real availability.
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [comingSoonCities, setComingSoonCities] = useState<string[]>([]);
  const [cityIdByName, setCityIdByName] = useState<Record<string, string>>({});
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("service_cities")
        .select("id, name, is_available, is_coming_soon")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled || !data) return;
      const avail: string[] = [];
      const soon: string[] = [];
      const idMap: Record<string, string> = {};
      for (const row of data) {
        idMap[row.name] = row.id;
        if (row.is_coming_soon) soon.push(row.name);
        else if (row.is_available) avail.push(row.name);
      }
      setAvailableCities(avail);
      setComingSoonCities(soon);
      setCityIdByName(idMap);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load neighborhoods live from service_locations whenever the selected city changes.
  useEffect(() => {
    let cancelled = false;
    if (!city) {
      setNeighborhoods([]);
      return;
    }
    const cityId = cityIdByName[city];
    if (!cityId) {
      setNeighborhoods([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("service_locations")
        .select("name, is_popular, display_order")
        .eq("city_id", cityId)
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      setNeighborhoods((data ?? []).map((r) => r.name));
    })();
    return () => {
      cancelled = true;
    };
  }, [city, cityIdByName]);

  // Preload images on mount
  useEffect(() => {
    rotatingCities.forEach((c) => {
      const img = new Image();
      img.src = cityImages[c];
    });
  }, []);

  // Reduced motion detection
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // City rotation — only the text changes, the pill stays visible
  useEffect(() => {
    if (reducedMotion || paused) return;
    const interval = setInterval(() => {
      setCityIndex((prev) => (prev + 1) % rotatingCities.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [reducedMotion, paused]);

  const activeCity = reducedMotion ? rotatingCities[0] : rotatingCities[cityIndex];

  const neighborhoodOptions = useMemo(() => {
    if (!city) return [];
    return neighborhoodsByCity[city] || [];
  }, [city]);

  const handleCityChange = useCallback((value: string) => {
    setCity(value);
    setNeighborhood(ALL_NEIGHBORHOODS);
  }, []);

  const handleSearch = useCallback(() => {
    if (!city) return;
    const params = new URLSearchParams();
    if (neighborhood && neighborhood !== ALL_NEIGHBORHOODS) {
      params.set("neighborhood", neighborhood);
    }
    if (dateRange?.from) params.set("start", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange?.to) params.set("end", format(dateRange.to, "yyyy-MM-dd"));
    const slug = cityToSlug(city);
    const qs = params.toString();
    navigate(`/rent/${slug}${qs ? `?${qs}` : ""}`);
  }, [city, neighborhood, dateRange, navigate]);

  const dateLabel =
    dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, "MMM d")} → ${format(dateRange.to, "MMM d")}`
      : dateRange?.from
        ? `${format(dateRange.from, "MMM d")} → ...`
        : "Pick-up → Return";

  return (
    <section
      className="relative w-full min-h-screen md:min-h-[90vh] flex items-center justify-center overflow-hidden"
      aria-label="Find a motorbike in Morocco"
    >
      {/* Background images — one per city, cross-fade in sync with the pill */}
      <div className="absolute inset-0" role="presentation" aria-hidden="true">
        {rotatingCities.map((c, i) => (
          <img
            key={c}
            src={cityImages[c]}
            alt=""
            role="presentation"
            fetchPriority={i === 0 ? "high" : "low"}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
              i === cityIndex ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {/* Dark gradient overlay for readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24 flex flex-col items-center">
        {/* H1 */}
        <h1 className="text-white font-extrabold text-center tracking-tight text-4xl md:text-6xl max-w-[1100px] leading-[1.1]">
          Rent a Motorbike or Scooter Anywhere in Morocco
        </h1>

        {/* Rotating city pill */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-white">
          <span
            aria-live="polite"
            aria-atomic="true"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            tabIndex={0}
            className="inline-block rounded-xl px-6 py-2 text-xl md:text-3xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{ backgroundColor: "#9FE870", color: "#163300" }}
          >
            {activeCity}
          </span>
        </div>

        {/* Explainer */}
        <p className="mt-8 max-w-[600px] text-center text-white/90 text-lg leading-relaxed whitespace-pre-line">
          Find trusted motorbike and scooter rentals in less than 60 seconds{"\n"}
          Rent with Ease, Anywhere in Morocco
        </p>

        {/* Search card */}
        <div
          className="mt-10 w-full max-w-[900px] mx-4 rounded-2xl shadow-2xl backdrop-blur-sm p-6 md:p-8"
          style={{ backgroundColor: "rgba(255,255,255,0.98)", color: "#163300" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* City */}
            <div className="space-y-2">
              <label
                htmlFor="hero-city"
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "#163300" }}
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                City
              </label>
              <Select value={city} onValueChange={handleCityChange}>
                <SelectTrigger
                  id="hero-city"
                  className="h-12 w-full border-2 bg-white"
                  aria-label="Select a city"
                >
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[320px]">
                  {[...(availableCities.length ? availableCities : allCities)]
                    .sort((a, b) => a.localeCompare(b))
                    .map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center justify-between gap-3 w-full">
                          <span>{c}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#9FE870]/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#163300]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#163300]" />
                            Available
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  {[...comingSoonCities]
                    .sort((a, b) => a.localeCompare(b))
                    .map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                        disabled
                        className="opacity-60"
                      >
                        <span className="flex items-center justify-between gap-3 w-full">
                          <span>{c}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Clock className="h-3 w-3" /> Soon
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Neighborhood */}
            <div className="space-y-2">
              <label
                htmlFor="hero-neighborhood"
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "#163300" }}
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Neighborhood
              </label>
              <Select
                value={neighborhood}
                onValueChange={setNeighborhood}
                disabled={!city}
              >
                <SelectTrigger
                  id="hero-neighborhood"
                  className="h-12 w-full border-2 bg-white disabled:opacity-60"
                  aria-label="Select a neighborhood"
                >
                  <SelectValue
                    placeholder={city ? "All neighborhoods" : "Select city first"}
                  />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[300px]">
                  <SelectItem value={ALL_NEIGHBORHOODS}>All neighborhoods</SelectItem>
                  {neighborhoodOptions.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <label
                htmlFor="hero-dates"
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "#163300" }}
              >
                <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                Dates
              </label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="hero-dates"
                    type="button"
                    className={cn(
                      "h-12 w-full rounded-md border-2 bg-white px-3 text-left text-sm flex items-center justify-between gap-2",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      !dateRange?.from && "text-muted-foreground",
                    )}
                    aria-label="Pick rental dates"
                  >
                    <span className="truncate">{dateLabel}</span>
                    <CalendarIcon className="h-4 w-4 opacity-60 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-white z-50"
                  align="start"
                >
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Search button */}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleSearch}
              disabled={!city}
              aria-label="Find available motorbikes and scooters"
              className={cn(
                "w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl py-4 px-8 text-lg font-bold shadow-md",
                "transition-all duration-200 hover:scale-105 hover:shadow-xl",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
              )}
              style={{ backgroundColor: "#9FE870", color: "#163300" }}
            >
              <Bike className="h-5 w-5" aria-hidden="true" />
              Find Available Bikes
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";
