import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCityBikes, CityBikeType } from "@/hooks/useCityBikes";
import { Star, MapPin, Filter, Bike, Fuel, Settings, Loader2, ShieldCheck } from "lucide-react";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { cn } from "@/lib/utils";

const CASA_NEIGHBORHOODS = [
  "Anfa", "Maârif", "Bouskoura", "Sidi Maârouf", "Aïn Diab",
  "Gauthier", "Bourgogne", "Hay Hassani", "Sidi Bernoussi", "Ain Sebaa",
];

const CATEGORIES = ["Scooter", "Sport", "Naked", "Adventure", "Cruiser", "Touring"];
const LICENSES = [
  { value: "none", label: "No license required" },
  { value: "A1", label: "A1 (125cc+)" },
  { value: "A2", label: "A2 (mid power)" },
  { value: "A", label: "A (full)" },
];
const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest rated" },
];

interface FilterState {
  neighborhoods: string[];
  categories: string[];
  licenses: string[];
  priceRange: [number, number];
  minRating: number;
}

const defaultFilters: FilterState = {
  neighborhoods: [],
  categories: [],
  licenses: [],
  priceRange: [0, 1000],
  minRating: 0,
};

function BikeCard({ bike }: { bike: CityBikeType }) {
  return (
    <Link
      to={`/bike/${bike.bike_id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={getBikeImageUrl(bike.main_image_url)}
          alt={`${bike.name} for rent in Casablanca`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {bike.category && (
          <Badge className="absolute left-3 top-3 bg-background/90 text-foreground backdrop-blur">
            {bike.category}
          </Badge>
        )}
        {(bike.rating ?? 0) >= 4.5 && (
          <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground">
            Top rated
          </Badge>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight tracking-tight">{bike.name}</h3>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{Number(bike.rating ?? 0).toFixed(1)}</span>
            <span className="text-muted-foreground">({bike.review_count ?? 0})</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {bike.engine_cc && (
            <span className="flex items-center gap-1"><Bike className="h-3 w-3" />{bike.engine_cc}cc</span>
          )}
          {bike.transmission && (
            <span className="flex items-center gap-1"><Settings className="h-3 w-3" />{bike.transmission}</span>
          )}
          {bike.fuel_type && (
            <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />{bike.fuel_type}</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{bike.bike_location || bike.neighborhood || "Casablanca"}</span>
        </div>
        <div className="flex items-end justify-between border-t pt-3">
          <div>
            <div className="text-lg font-bold tracking-tight">{Number(bike.daily_price ?? 0)} MAD<span className="text-xs font-normal text-muted-foreground">/day</span></div>
            {bike.deposit_amount ? (
              <div className="text-[11px] text-muted-foreground">Deposit: {Number(bike.deposit_amount)} MAD</div>
            ) : null}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-primary">
            <ShieldCheck className="h-3 w-3" /> Verified agency
          </div>
        </div>
      </div>
    </Link>
  );
}

function FiltersPanel({
  filters,
  setFilters,
  resultCount,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  resultCount: number;
}) {
  const toggle = <K extends keyof FilterState>(key: K, value: string) => {
    const arr = filters[key] as unknown as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    setFilters({ ...filters, [key]: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Filters</h2>
        <button
          onClick={() => setFilters(defaultFilters)}
          className="text-xs font-medium text-primary hover:underline"
        >
          Reset all
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Price (MAD/day)</h3>
        <Slider
          min={0}
          max={1000}
          step={50}
          value={filters.priceRange}
          onValueChange={(v) => setFilters({ ...filters, priceRange: [v[0], v[1]] as [number, number] })}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{filters.priceRange[0]} MAD</span>
          <span>{filters.priceRange[1]} MAD</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Neighborhood</h3>
        <div className="space-y-2">
          {CASA_NEIGHBORHOODS.map((n) => (
            <label key={n} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={filters.neighborhoods.includes(n)}
                onCheckedChange={() => toggle("neighborhoods", n)}
              />
              <span>{n}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={filters.categories.includes(c)}
                onCheckedChange={() => toggle("categories", c)}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">License required</h3>
        <div className="space-y-2">
          {LICENSES.map((l) => (
            <label key={l.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={filters.licenses.includes(l.value)}
                onCheckedChange={() => toggle("licenses", l.value)}
              />
              <span>{l.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Minimum rating</h3>
        <div className="flex gap-1">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setFilters({ ...filters, minRating: r })}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs transition",
                filters.minRating === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted",
              )}
            >
              {r === 0 ? "Any" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 p-3 text-center text-xs text-muted-foreground">
        {resultCount} bike{resultCount === 1 ? "" : "s"} match
      </div>
    </div>
  );
}

const titleCase = (s: string) =>
  s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function CityListings() {
  const { city = "casablanca" } = useParams();
  const navigate = useNavigate();
  const cityLabel = titleCase(city);
  const { data: bikes = [], isLoading } = useCityBikes(cityLabel);

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState("recommended");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = [...bikes];
    if (filters.neighborhoods.length) {
      list = list.filter((b) =>
        filters.neighborhoods.some((n) =>
          (b.neighborhood || "").toLowerCase().includes(n.toLowerCase()) ||
          (b.bike_location || "").toLowerCase().includes(n.toLowerCase()),
        ),
      );
    }
    if (filters.categories.length) {
      list = list.filter((b) => b.category && filters.categories.includes(b.category));
    }
    if (filters.licenses.length) {
      list = list.filter((b) => b.license_required && filters.licenses.includes(b.license_required));
    }
    list = list.filter((b) => {
      const p = Number(b.daily_price ?? 0);
      return p >= filters.priceRange[0] && p <= filters.priceRange[1];
    });
    if (filters.minRating > 0) {
      list = list.filter((b) => Number(b.rating ?? 0) >= filters.minRating);
    }
    if (sort === "price_asc") list.sort((a, b) => Number(a.daily_price ?? 0) - Number(b.daily_price ?? 0));
    else if (sort === "price_desc") list.sort((a, b) => Number(b.daily_price ?? 0) - Number(a.daily_price ?? 0));
    else if (sort === "rating") list.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
    return list;
  }, [bikes, filters, sort]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Motorbike rental in {cityLabel}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} bikes from verified agencies · Flat fees, no commission`}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-border bg-card p-5">
              <FiltersPanel filters={filters} setFilters={setFilters} resultCount={filtered.length} />
            </div>
          </aside>

          <section>
            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                    <Filter className="h-4 w-4" /> Filters
                    {(filters.neighborhoods.length + filters.categories.length + filters.licenses.length) > 0 && (
                      <Badge className="h-5 min-w-5 px-1.5">
                        {filters.neighborhoods.length + filters.categories.length + filters.licenses.length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto sm:w-[340px]">
                  <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                  <div className="mt-6">
                    <FiltersPanel filters={filters} setFilters={setFilters} resultCount={filtered.length} />
                  </div>
                  <Button className="mt-6 w-full" onClick={() => setMobileFiltersOpen(false)}>
                    Show {filtered.length} results
                  </Button>
                </SheetContent>
              </Sheet>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <h3 className="font-semibold">No bikes match your filters</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Try resetting filters or expanding the price range.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilters(defaultFilters)}>
                    Reset filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((b) => (
                  <BikeCard key={b.id} bike={b} />
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
