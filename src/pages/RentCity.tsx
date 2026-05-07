import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Filter as FilterIcon,
  // (Heart icon was removed — favorites button lives inside BikeCard now)
  MapPin,
  Pencil,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  Star,
  X,
  Search,
} from "lucide-react";
import { format, parseISO, isValid as isValidDate } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BookingDatePicker } from "@/components/BookingDatePicker";
import { BikeCard } from "@/components/BikeCard";
import { useFavoriteIds } from "@/lib/favorites";
import { PriceRangeFilter } from "@/components/filters/PriceRangeFilter";
import { FiltersPanel } from "@/components/rent-city/FiltersPanel";

// Neighborhoods are loaded live from `service_locations` per city — no hardcoded list.
// This means whenever an admin adds/edits/disables a neighborhood, the renter
// filter sidebar reflects the change immediately on next page load.
type NeighborhoodRow = {
  id: string;
  name: string;
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
};

const BIKE_TYPES = [
  { id: "scooter", label: "Scooter (50-125cc)" },
  { id: "sport", label: "Sport bike" },
  { id: "adventure", label: "Adventure / Touring" },
  { id: "cruiser", label: "Cruiser" },
  { id: "electric", label: "Electric" },
  { id: "classic", label: "Classic / Vintage" },
  { id: "commuter", label: "Standard / Commuter" },
];

const FEATURE_OPTIONS = [
  { id: "helmet", label: "Helmet included", match: /helmet/i },
  { id: "delivery", label: "Delivery available", match: /delivery/i },
  { id: "insurance", label: "Insurance included", match: /insurance/i },
  { id: "gps", label: "GPS included", match: /gps/i },
];

const LICENSE_OPTIONS = [
  { id: "B", label: "No motorcycle license (50cc)" },
  { id: "A1", label: "Permis A1 (125cc)" },
  { id: "A", label: "Permis A (>125cc)" },
];

const DURATION_OPTIONS = [
  { id: "1", label: "1 day", days: 1 },
  { id: "3", label: "2-3 days", days: 3 },
  { id: "7", label: "Weekly", days: 7 },
  { id: "14", label: "2 weeks", days: 14 },
  { id: "30", label: "1 month", days: 30 },
];

type BikeRow = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  fuel_type: string | null;
  daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  rating: number | null;
  review_count: number | null;
  main_image_url: string | null;
  neighborhood: string | null;
  features: string[] | null;
  license_required: string | null;
  year: number | null;
  engine_cc: number | null;
  city_id: string | null;
};

import { slugToDisplayName, cityToSlug, slugToCityNameVariants } from "@/lib/citySlug";

type CityRow = {
  id: string;
  name: string;
  is_available: boolean | null;
  is_coming_soon: boolean | null;
  image_url: string | null;
  image_focal_x: number | null;
  image_focal_y: number | null;
  description: string | null;
};

export default function RentCity() {
  const { city = "casablanca" } = useParams();
  const citySlug = cityToSlug(city);
  const cityName = slugToDisplayName(citySlug);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const allCityLabel = `All ${cityName}`;

  // ─── Resolve the city row first ─────────────────────────────────────
  // Drives gating (Coming Soon vs available vs 404) and is the parent
  // for the neighborhoods + bikes queries.
  const { data: cityRow, isLoading: cityLoading } = useQuery({
    queryKey: ["rent-city-row", citySlug],
    queryFn: async () => {
      // DB-driven: look up the city by its canonical slug. New cities admins
      // add are immediately reachable without code changes.
      const { data, error } = await supabase
        .from("service_cities")
        .select("id, name, is_available, is_coming_soon, image_url, image_focal_x, image_focal_y, description, slug")
        .eq("slug", citySlug)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as CityRow;

      // Fallback: legacy or external links may pass the city name (or a variant).
      // Try matching against any known name spelling so /rent/marrakesh still works
      // even if the canonical slug is "marrakech".
      const variants = slugToCityNameVariants(citySlug);
      if (variants.length > 0) {
        const { data: byName } = await supabase
          .from("service_cities")
          .select("id, name, is_available, is_coming_soon, image_url, image_focal_x, image_focal_y, description, slug")
          .in("name", variants)
          .maybeSingle();
        if (byName) return byName as unknown as CityRow;
      }
      return null;
    },
  });

  // ─── Live neighborhoods from service_locations ──────────────────────
  // Sorted by is_popular DESC then display_order so the renter filter
  // mirrors the admin's curation. No more hardcoded list.
  const { data: neighborhoodRows = [] } = useQuery({
    queryKey: ["rent-city-neighborhoods", cityRow?.id],
    enabled: !!cityRow?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_locations")
        .select("id, name, is_active, is_popular, display_order")
        .eq("city_id", cityRow!.id)
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as NeighborhoodRow[];
    },
  });

  const neighborhoodOptions = useMemo<string[]>(
    () => [allCityLabel, ...neighborhoodRows.map((n) => n.name)],
    [allCityLabel, neighborhoodRows],
  );
  const popularNeighborhoodSet = useMemo(
    () => new Set(neighborhoodRows.filter((n) => n.is_popular).map((n) => n.name)),
    [neighborhoodRows],
  );


  // Initial neighborhood from URL — accept any name; will be reset later
  // if it doesn't belong to this city (after neighborhoods load).
  const [neighborhood, setNeighborhood] = useState<string>(() => {
    const fromUrl = searchParams.get("neighborhood");
    return fromUrl || allCityLabel;
  });
  const [duration, setDuration] = useState<string>(
    searchParams.get("duration") || "1"
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(searchParams.get("minPrice")) || 0,
    Number(searchParams.get("maxPrice")) || 0,
  ]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    searchParams.get("types")?.split(",").filter(Boolean) || []
  );
  const [fuel, setFuel] = useState<string>(searchParams.get("fuel") || "all");
  const [licenses, setLicenses] = useState<string[]>(
    searchParams.get("licenses")?.split(",").filter(Boolean) || []
  );
  const [features, setFeatures] = useState<string[]>(
    searchParams.get("features")?.split(",").filter(Boolean) || []
  );
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get("sort") || "price_asc"
  );
  // favorites are loaded from DB via useFavoriteIds (see below)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Read selected dates from URL (from/to). Backwards-compat with start/end & pickup.
  const fromParam = searchParams.get("from") || searchParams.get("start") || searchParams.get("pickup");
  const toParam = searchParams.get("to") || searchParams.get("end");
  const fromDate = fromParam ? parseISO(fromParam) : null;
  const toDate = toParam ? parseISO(toParam) : null;
  const hasDates = !!(fromDate && isValidDate(fromDate) && toDate && isValidDate(toDate));
  const datesQS = hasDates ? `?from=${fromParam}&to=${toParam}` : "";

  // Sync filters → URL (debounced). Preserves from/to date params so the
  // selected booking dates persist across navigation.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (neighborhood !== allCityLabel) params.set("neighborhood", neighborhood);
      if (duration !== "1") params.set("duration", duration);
      if (priceRange[0] !== priceBounds[0]) params.set("minPrice", String(priceRange[0]));
      if (priceRange[1] !== priceBounds[1]) params.set("maxPrice", String(priceRange[1]));
      if (selectedTypes.length) params.set("types", selectedTypes.join(","));
      if (fuel !== "all") params.set("fuel", fuel);
      if (licenses.length) params.set("licenses", licenses.join(","));
      if (features.length) params.set("features", features.join(","));
      if (sortBy !== "price_asc") params.set("sort", sortBy);
      if (fromParam) params.set("from", fromParam);
      if (toParam) params.set("to", toParam);
      setSearchParams(params, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhood, duration, priceRange, selectedTypes, fuel, licenses, features, sortBy, fromParam, toParam]);

  // Reset neighborhood when city changes OR when the live neighborhood list
  // finishes loading and doesn't include the current selection (avoids
  // carrying over a Casablanca neighborhood to Marrakesh, etc.).
  useEffect(() => {
    if (neighborhoodRows.length === 0) return;
    if (
      neighborhood !== allCityLabel &&
      !neighborhoodOptions.includes(neighborhood)
    ) {
      setNeighborhood(allCityLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, neighborhoodRows]);

  // DB-backed favorites
  const { data: favoriteIds = new Set<string>() } = useFavoriteIds();

  // ─── Fetch bikes for the resolved city ──────────────────────────────
  // Only runs once we have a city.id. Skipped for unknown / not-found
  // cities so we never leak other cities' inventory.
  const { data: bikes = [], isLoading: bikesLoading } = useQuery({
    queryKey: ["rent-city-bikes", cityRow?.id],
    enabled: !!cityRow?.id,
    queryFn: async () => {
      // NOTE: anon role has no SELECT on `bikes` (forced through bikes_public view).
      // The previous `bikes!inner(...)` embed silently returned 0 rows for logged-out
      // visitors. We now query bike_types directly (its approval flags already gate
      // visibility) and filter availability via a separate bikes_public lookup.
      const { data, error } = await supabase
        .from("bike_types")
        .select(
          "id,slug,name,category,fuel_type,daily_price,weekly_price,monthly_price,rating,review_count,main_image_url,neighborhood,features,license_required,year,engine_cc,city_id"
        )
        .eq("is_approved", true)
        .eq("approval_status", "approved")
        .eq("business_status", "active")
        .is("archived_at", null)
        .eq("city_id", cityRow!.id);

      if (error) throw error;
      const types = (data || []) as BikeRow[];
      if (types.length === 0) return [];

      // Keep only bike_types that have at least one available physical unit.
      const { data: units } = await (supabase as any)
        .from("bikes_public")
        .select("bike_type_id, available")
        .in("bike_type_id", types.map((t) => t.id))
        .eq("available", true);
      const withUnits = new Set(((units || []) as Array<{ bike_type_id: string }>).map((u) => u.bike_type_id));
      return types.filter((t) => withUnits.has(t.id));
    },
  });

  const isLoading = cityLoading || bikesLoading;

  // Real available-bike counts per neighborhood for the current city.
  // `bikes` is already filtered by the same public visibility rules used in
  // listings (approved + active + verified agency + has available unit + correct
  // city). So counts derived from it always match what the user will see.
  const neighborhoodCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { [allCityLabel]: bikes.length };
    for (const n of neighborhoodRows) counts[n.name] = 0;
    for (const b of bikes) {
      const key = b.neighborhood || "";
      if (key && key in counts) counts[key] += 1;
    }
    return counts;
  }, [bikes, neighborhoodRows, allCityLabel]);


  // Derive actual price bounds from the bikes available in this city
  const priceBounds = useMemo<[number, number]>(() => {
    if (!bikes.length) return [50, 1000];
    const prices = bikes.map((b) => Number(b.daily_price) || 0).filter((p) => p > 0);
    if (!prices.length) return [50, 1000];
    const min = Math.floor(Math.min(...prices) / 10) * 10;
    const max = Math.ceil(Math.max(...prices) / 10) * 10;
    return [min, Math.max(max, min + 10)];
  }, [bikes]);

  // Initialize priceRange to bounds once they're known (if user hasn't set it via URL)
  useEffect(() => {
    if (priceRange[0] === 0 && priceRange[1] === 0) {
      setPriceRange(priceBounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceBounds]);

  const filtered = useMemo(() => {
    let list = bikes.filter((b) => {
      // Neighborhood
      if (neighborhood !== allCityLabel && b.neighborhood !== neighborhood) return false;
      // Price
      const price = Number(b.daily_price) || 0;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      // Types
      if (selectedTypes.length && !selectedTypes.includes((b.category || "").toLowerCase()))
        return false;
      // Fuel
      if (fuel !== "all") {
        const isElectric = (b.fuel_type || "").toLowerCase().includes("electric");
        if (fuel === "electric" && !isElectric) return false;
        if (fuel === "gasoline" && isElectric) return false;
      }
      // License
      if (licenses.length && !licenses.includes(b.license_required || "")) return false;
      // Features
      if (features.length) {
        const featStr = (b.features || []).join(" ");
        const allMatch = features.every((fid) => {
          const opt = FEATURE_OPTIONS.find((f) => f.id === fid);
          return opt ? opt.match.test(featStr) : true;
        });
        if (!allMatch) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      const pa = Number(a.daily_price) || 0;
      const pb = Number(b.daily_price) || 0;
      switch (sortBy) {
        case "price_desc":
          return pb - pa;
        case "rating":
          return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        case "newest":
          return (b.year || 0) - (a.year || 0);
        case "price_asc":
        default:
          return pa - pb;
      }
    });

    return list;
  }, [bikes, neighborhood, priceRange, selectedTypes, fuel, licenses, features, sortBy]);

  // Prices for histogram: apply every filter EXCEPT price (Airbnb behavior — bars don't collapse as you drag)
  const pricesForHistogram = useMemo(() => {
    return bikes
      .filter((b) => {
        if (neighborhood !== allCityLabel && b.neighborhood !== neighborhood) return false;
        if (selectedTypes.length && !selectedTypes.includes((b.category || "").toLowerCase())) return false;
        if (fuel !== "all") {
          const isElectric = (b.fuel_type || "").toLowerCase().includes("electric");
          if (fuel === "electric" && !isElectric) return false;
          if (fuel === "gasoline" && isElectric) return false;
        }
        if (licenses.length && !licenses.includes(b.license_required || "")) return false;
        if (features.length) {
          const featStr = (b.features || []).join(" ");
          const allMatch = features.every((fid) => {
            const opt = FEATURE_OPTIONS.find((f) => f.id === fid);
            return opt ? opt.match.test(featStr) : true;
          });
          if (!allMatch) return false;
        }
        return true;
      })
      .map((b) => Number(b.daily_price) || 0);
  }, [bikes, neighborhood, selectedTypes, fuel, licenses, features, allCityLabel]);

  const activeFilterCount =
    (neighborhood !== allCityLabel ? 1 : 0) +
    (duration !== "1" ? 1 : 0) +
    (priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1] ? 1 : 0) +
    selectedTypes.length +
    (fuel !== "all" ? 1 : 0) +
    licenses.length +
    features.length;


  const clearAll = () => {
    setNeighborhood(allCityLabel);
    setDuration("1");
    setPriceRange(priceBounds);
    setSelectedTypes([]);
    setFuel("all");
    setLicenses([]);
    setFeatures([]);
  };

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const totalDays = DURATION_OPTIONS.find((d) => d.id === duration)?.days ?? 1;

  const filterPanel = (
    <FiltersPanel
      neighborhoodOptions={neighborhoodOptions}
      popularNeighborhoodSet={popularNeighborhoodSet}
      neighborhoodCounts={neighborhoodCounts}
      allCityLabel={allCityLabel}
      pricesForHistogram={pricesForHistogram}
      priceBounds={priceBounds}
      filteredCount={filtered.length}
      durationOptions={DURATION_OPTIONS}
      bikeTypes={BIKE_TYPES}
      licenseOptions={LICENSE_OPTIONS}
      featureOptions={FEATURE_OPTIONS}
      neighborhood={neighborhood}
      setNeighborhood={setNeighborhood}
      duration={duration}
      setDuration={setDuration}
      priceRange={priceRange}
      setPriceRange={setPriceRange}
      selectedTypes={selectedTypes}
      setSelectedTypes={setSelectedTypes}
      fuel={fuel}
      setFuel={setFuel}
      licenses={licenses}
      setLicenses={setLicenses}
      features={features}
      setFeatures={setFeatures}
      activeFilterCount={activeFilterCount}
      onApply={() => setDrawerOpen(false)}
    />
  );

  // ─── City gating ───
  // - city resolved + is_coming_soon → waitlist page
  // - city resolved + not available + not coming soon → 404 (hidden)
  // - city not found in DB at all → 404
  if (!cityLoading && !cityRow) {
    return <CityNotFound slug={citySlug} />;
  }
  if (!cityLoading && cityRow && cityRow.is_available === false) {
    if (cityRow.is_coming_soon) {
      return <RentCityComingSoon city={cityRow} />;
    }
    return <CityNotFound slug={citySlug} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3"
        >
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/rent" className="hover:text-foreground">Rent</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{cityName}</span>
        </nav>

        {/* Editable dates pill: city portion → home, dates portion → opens picker inline */}
        <div className="mb-4 inline-flex items-stretch rounded-full border border-[#163300]/15 bg-card overflow-hidden hover:border-[#9FE870] transition-colors">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground hover:bg-muted/50"
            aria-label="Edit city / neighborhood"
          >
            <MapPin className="w-3.5 h-3.5 text-foreground/70" />
            <span className="font-medium">{cityName}{neighborhood !== allCityLabel ? `, ${neighborhood}` : ""}</span>
          </button>
          <div className="w-px bg-[#163300]/15" />
          <BookingDatePicker
            value={hasDates ? { from: fromDate!, to: toDate! } : undefined}
            onChange={(r) => {
              const next = new URLSearchParams(searchParams);
              if (r?.from && r?.to) {
                next.set("from", format(r.from, "yyyy-MM-dd"));
                next.set("to", format(r.to, "yyyy-MM-dd"));
              } else {
                next.delete("from");
                next.delete("to");
              }
              setSearchParams(next, { replace: true });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            triggerClassName="!h-auto !rounded-none !border-0 !bg-transparent !px-3 !py-1.5 !w-auto !text-sm hover:bg-muted/50"
            placeholder="Pick dates"
          />
        </div>

        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Motorbike Rental in {cityName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bikes.length} verified bike{bikes.length !== 1 ? "s" : ""} across {neighborhoodRows.length} neighborhood{neighborhoodRows.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile filter trigger */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <FilterIcon className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="h-[88dvh] rounded-t-[28px] p-0 border-t-0 bg-background flex flex-col [&>button]:hidden"
              >
                <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                  <span className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
                </div>
                <SheetHeader className="px-5 py-2 shrink-0">
                  <SheetTitle className="text-lg font-semibold text-start">Filters</SheetTitle>
                </SheetHeader>
                <div className="flex-1 min-h-0">{filterPanel}</div>
              </SheetContent>
            </Sheet>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">Lowest price</SelectItem>
                <SelectItem value="price_desc">Highest price</SelectItem>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-[280px] shrink-0">
            <div className="sticky top-24 h-[calc(100vh-7rem)] flex flex-col bg-card border border-border rounded-xl p-4 shadow-sm overflow-hidden px-0 py-0">
              {filterPanel}
            </div>
          </aside>

          {/* Grid */}
          <section className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground mb-3">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              of {bikes.length} bikes
              {neighborhood !== allCityLabel && (
                <> in <span className="font-semibold text-foreground">{neighborhood}</span></>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                    <Skeleton className="aspect-[16/9] w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-6 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : bikes.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MapPin className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  No bikes available in {cityName} yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We're working on bringing verified agencies to this city. Check back soon.
                </p>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Browse other cities
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No bikes match your filters</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try expanding your date range or removing some filters.
                </p>
                <Button variant="outline" onClick={clearAll}>
                  <X className="w-4 h-4 mr-1" /> Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((b) => (
                  <BikeCard
                    key={b.id}
                    bike={b}
                    isFavorited={favoriteIds.has(b.id)}
                    totalDays={totalDays}
                    datesQS={datesQS}
                    cityName={cityName}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// BikeCard moved to src/components/BikeCard.tsx
// Coming Soon page (FIX 4) — shown when admin marks a city as
// is_available=false AND is_coming_soon=true. Captures emails into
// city_waitlist for marketing follow-up when the city goes live.
// ─────────────────────────────────────────────────────────────────────
function CityNotFound({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const label = slugToDisplayName(slug);
  useEffect(() => {
    document.title = `City not found · Motonita`;
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-20 flex flex-col items-center text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">City not found</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          We don&apos;t operate in <span className="font-medium">{label}</span> yet,
          but we&apos;re expanding fast across Morocco.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button onClick={() => navigate("/")}>Back to home</Button>
          <Button variant="outline" onClick={() => navigate("/#cities")}>
            See available cities
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function RentCityComingSoon({ city }: { city: CityRow }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("city_waitlist" as never)
        .insert({
          city_id: city.id,
          city_name: city.name,
          email: trimmed,
        } as never);
      if (error && !String(error.message || "").includes("duplicate")) throw error;
      setDone(true);
      toast.success("You're on the list — we'll email you when we launch.");
    } catch {
      toast.error("Could not save your email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {city.image_url && (
            <div className="aspect-[16/7] bg-muted overflow-hidden">
              <img
                src={city.image_url}
                alt={city.name}
                className="w-full h-full object-cover"
                style={{ objectPosition: `${(city.image_focal_x ?? 0.5) * 100}% ${(city.image_focal_y ?? 0.5) * 100}%` }}
              />
            </div>
          )}
          <div className="p-6 md:p-10">
            <Badge className="mb-3 bg-warning/10 text-warning border-warning/30">
              Coming Soon
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Motorbike rental in {city.name} — Coming Soon
            </h1>
            <p className="text-muted-foreground mt-3">
              We're expanding to {city.name} soon. Sign up to be the first to
              know when verified agencies are live.
            </p>

            {done ? (
              <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                Thanks — we've added you to the {city.name} waitlist.
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-11 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button type="submit" disabled={submitting} className="h-11">
                  {submitting ? "Saving..." : "Notify me"}
                </Button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-border">
              <Link
                to="/rent/casablanca"
                className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                Browse bikes in Casablanca instead <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
