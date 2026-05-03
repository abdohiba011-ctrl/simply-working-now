import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Filter as FilterIcon,
  Heart,
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

import { slugToDisplayName, slugToCityNameVariants, cityToSlug } from "@/lib/citySlug";

type CityRow = {
  id: string;
  name: string;
  is_available: boolean | null;
  is_coming_soon: boolean | null;
  image_url: string | null;
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
      const variants = slugToCityNameVariants(citySlug);
      if (variants.length === 0) return null;
      const { data, error } = await supabase
        .from("service_cities")
        .select("id, name, is_available, is_coming_soon, image_url, description")
        .in("name", variants)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as CityRow | null) ?? null;
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
    Number(searchParams.get("minPrice")) || 50,
    Number(searchParams.get("maxPrice")) || 1000,
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
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sync filters → URL (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (neighborhood !== allCityLabel) params.set("neighborhood", neighborhood);
      if (duration !== "1") params.set("duration", duration);
      if (priceRange[0] !== 50) params.set("minPrice", String(priceRange[0]));
      if (priceRange[1] !== 1000) params.set("maxPrice", String(priceRange[1]));
      if (selectedTypes.length) params.set("types", selectedTypes.join(","));
      if (fuel !== "all") params.set("fuel", fuel);
      if (licenses.length) params.set("licenses", licenses.join(","));
      if (features.length) params.set("features", features.join(","));
      if (sortBy !== "price_asc") params.set("sort", sortBy);
      setSearchParams(params, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhood, duration, priceRange, selectedTypes, fuel, licenses, features, sortBy]);

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

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("favorite_bikes");
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  // ─── Fetch bikes for the resolved city ──────────────────────────────
  // Only runs once we have a city.id. Skipped for unknown / not-found
  // cities so we never leak other cities' inventory.
  const { data: bikes = [], isLoading: bikesLoading } = useQuery({
    queryKey: ["rent-city-bikes", cityRow?.id],
    enabled: !!cityRow?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_types")
        .select(
          "id,slug,name,category,fuel_type,daily_price,weekly_price,monthly_price,rating,review_count,main_image_url,neighborhood,features,license_required,year,engine_cc,city_id,bikes!inner(id,available,approval_status,archived_at)"
        )
        .eq("is_approved", true)
        .eq("approval_status", "approved")
        .eq("business_status", "active")
        .is("archived_at", null)
        .eq("city_id", cityRow!.id)
        .eq("bikes.available", true)
        .eq("bikes.approval_status", "approved")
        .is("bikes.archived_at", null);

      if (error) throw error;
      // Deduplicate (inner join may yield multiple rows per bike_type when there
      // are several available units) and drop the joined `bikes` array from the row.
      const seen = new Set<string>();
      const unique: BikeRow[] = [];
      for (const row of (data || []) as Array<BikeRow & { bikes?: unknown }>) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        const { bikes: _bikes, ...rest } = row as Record<string, unknown>;
        unique.push(rest as BikeRow);
      }
      return unique;
    },
  });

  const isLoading = cityLoading || bikesLoading;

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

  const activeFilterCount =
    (neighborhood !== allCityLabel ? 1 : 0) +
    (duration !== "1" ? 1 : 0) +
    (priceRange[0] !== 50 || priceRange[1] !== 1000 ? 1 : 0) +
    selectedTypes.length +
    (fuel !== "all" ? 1 : 0) +
    licenses.length +
    features.length;

  const toggleFavorite = (id: string, name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast(`Removed ${name} from favorites`);
      } else {
        next.add(id);
        toast.success(`Saved ${name} to favorites`);
      }
      try {
        localStorage.setItem("favorite_bikes", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const clearAll = () => {
    setNeighborhood(allCityLabel);
    setDuration("1");
    setPriceRange([50, 1000]);
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
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-3 [scrollbar-width:thin]">
        <Accordion
          type="multiple"
          defaultValue={[
            "neighborhood",
            "duration",
            "price",
            "type",
          ]}
          className="space-y-1"
        >
        <AccordionItem value="neighborhood" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">
            Neighborhood
          </AccordionTrigger>
          <AccordionContent>
            <RadioGroup value={neighborhood} onValueChange={setNeighborhood} className="space-y-2">
              {neighborhoodOptions.map((n) => {
                const isPopular = popularNeighborhoodSet.has(n);
                return (
                  <div key={n} className="flex items-center gap-2">
                    <RadioGroupItem value={n} id={`n-${n}`} />
                    <Label
                      htmlFor={`n-${n}`}
                      className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                    >
                      {n}
                      {isPopular && (
                        <Star
                          className="h-3 w-3 fill-primary text-primary"
                          aria-label="Popular"
                        />
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="duration" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">
            Rental duration
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    duration === d.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">
            Price (per day)
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-xs font-medium">
                <span>{priceRange[0]} MAD</span>
                <span>{priceRange[1]} MAD</span>
              </div>
              <Slider
                min={50}
                max={1000}
                step={10}
                value={priceRange}
                onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="type" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">Bike type</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {BIKE_TYPES.map((bt) => (
                <div key={bt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`bt-${bt.id}`}
                    checked={selectedTypes.includes(bt.id)}
                    onCheckedChange={() => toggle(selectedTypes, bt.id, setSelectedTypes)}
                  />
                  <Label htmlFor={`bt-${bt.id}`} className="text-sm font-normal cursor-pointer">
                    {bt.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fuel" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">Engine / Fuel</AccordionTrigger>
          <AccordionContent>
            <RadioGroup value={fuel} onValueChange={setFuel} className="space-y-2">
              {[
                { id: "all", label: "All" },
                { id: "gasoline", label: "Gasoline" },
                { id: "electric", label: "Electric" },
              ].map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <RadioGroupItem value={f.id} id={`f-${f.id}`} />
                  <Label htmlFor={`f-${f.id}`} className="text-sm font-normal cursor-pointer">
                    {f.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="license" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">License required</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {LICENSE_OPTIONS.map((l) => (
                <div key={l.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`l-${l.id}`}
                    checked={licenses.includes(l.id)}
                    onCheckedChange={() => toggle(licenses, l.id, setLicenses)}
                  />
                  <Label htmlFor={`l-${l.id}`} className="text-sm font-normal cursor-pointer">
                    {l.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="features" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">Features</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {FEATURE_OPTIONS.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`feat-${f.id}`}
                    checked={features.includes(f.id)}
                    onCheckedChange={() => toggle(features, f.id, setFeatures)}
                  />
                  <Label htmlFor={`feat-${f.id}`} className="text-sm font-normal cursor-pointer">
                    {f.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        </Accordion>
      </div>

      <div className="border-t border-border pt-4 mt-3 space-y-3 bg-background shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={clearAll}
            className="text-sm font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"
          >
            Clear all
          </button>
          <span className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "bike" : "bikes"}
          </span>
        </div>
        <Button
          variant="hero"
          className="w-full"
          onClick={() => setDrawerOpen(false)}
        >
          {activeFilterCount > 0
            ? `Apply ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""}`
            : "Apply filters"}
        </Button>
      </div>
    </div>
  );

  // ─── FIX 4: Coming Soon / unknown city gating ───
  // - city resolved + is_coming_soon → show waitlist page
  // - city resolved + not available + not coming soon → 404 (homepage)
  // - city not found in DB at all → 404 (homepage)
  if (!cityLoading && !cityRow) {
    return <Navigate to="/" replace />;
  }
  if (!cityLoading && cityRow && cityRow.is_available === false) {
    if (cityRow.is_coming_soon) {
      return <RentCityComingSoon city={cityRow} />;
    }
    return <Navigate to="/" replace />;
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
              <SheetContent side="left" className="w-[320px] flex flex-col">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex-1 min-h-0">{filterPanel}</div>
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
            <div className="sticky top-24 h-[calc(100vh-7rem)] flex flex-col bg-card border border-border rounded-xl p-4 shadow-sm overflow-hidden">
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
                    favorite={favorites.has(b.id)}
                    onToggleFavorite={() => toggleFavorite(b.id, b.name)}
                    onOpen={() => navigate(`/bike/${b.slug || b.id}`)}
                    totalDays={totalDays}
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

function BikeCard({
  bike,
  favorite,
  onToggleFavorite,
  onOpen,
  totalDays,
}: {
  bike: BikeRow;
  favorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  totalDays: number;
}) {
  const price = Number(bike.daily_price) || 0;
  const weekly = Number(bike.weekly_price) || 0;
  const monthly = Number(bike.monthly_price) || 0;
  const effective =
    totalDays >= 30 && monthly > 0
      ? monthly
      : totalDays >= 7 && weekly > 0
        ? weekly
        : price;

  return (
    <article
      onClick={onOpen}
      className="group cursor-pointer bg-card border border-border rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring"
    >
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {bike.main_image_url ? (
          <img
            src={bike.main_image_url}
            alt={`${bike.name}${bike.year ? ` ${bike.year}` : ""}`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}

        <Badge
          aria-label="Available"
          className="absolute top-3 left-3 bg-primary text-primary-foreground border-0 shadow-sm"
        >
          Available
        </Badge>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={favorite ? "Remove from favorites" : "Save to favorites"}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              favorite ? "fill-destructive text-destructive" : "text-foreground"
            )}
          />
        </button>

        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="hero" size="sm" className="h-7 px-3 text-xs rounded-md">
            View details
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground leading-tight line-clamp-1">
          {bike.name}
        </h3>
        <div className="text-xs text-muted-foreground capitalize">
          {[bike.category, bike.fuel_type, bike.engine_cc ? `${bike.engine_cc}cc` : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 mr-1" />
          {bike.neighborhood || "—"}
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <span className="text-2xl font-bold text-foreground">{effective}</span>
            <span className="text-sm text-muted-foreground ml-1">MAD/day</span>
            {effective !== price && (
              <div className="text-[11px] text-muted-foreground line-through">{price} MAD/day</div>
            )}
          </div>
          {bike.rating ? (
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3.5 h-3.5 fill-primary text-primary" />
              <span className="font-semibold text-foreground">
                {Number(bike.rating).toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({bike.review_count || 0})
              </span>
            </div>
          ) : null}
        </div>

        <div className="text-[11px] text-muted-foreground pt-1 border-t border-border">
          by Casa Moto Rent · ✓ Verified
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Coming Soon page (FIX 4) — shown when admin marks a city as
// is_available=false AND is_coming_soon=true. Captures emails into
// city_waitlist for marketing follow-up when the city goes live.
// ─────────────────────────────────────────────────────────────────────
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
