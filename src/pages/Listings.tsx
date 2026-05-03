import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BikeTypeSkeleton } from "@/components/ui/bike-skeleton";
import { BookingDatePicker } from "@/components/BookingDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Bike,
  Star,
  MapPin as MapPinIcon,
  ArrowLeft,
  Heart,
  SlidersHorizontal,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBikeTypes, useBikes } from "@/hooks/useBikes";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Neighborhood {
  id: string;
  name: string;
}

// No fallback neighborhoods — neighborhoods are loaded per selected city from the database
// to avoid mixing one city's neighborhoods (e.g. Casablanca) into another (e.g. Marrakesh).
const fallbackNeighborhoods: Neighborhood[] = [];

const bikeQuantities: Record<string, number> = {
  "Sanya R1000": 12,
  "Becane 33": 8,
  "Cappuccino S": 15,
  "SYM Orbit II 50cc": 7,
  SH: 11,
};

type SortOption = "recommended" | "price-asc" | "price-desc" | "rating";
const FAVORITES_KEY = "motonita_favorites";

const Listings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(fallbackNeighborhoods);
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { t, isRTL } = useLanguage();
  const { data: bikeTypes, isLoading: isLoadingTypes } = useBikeTypes();
  const { data: bikes, isLoading: isLoadingBikes } = useBikes();

  const location = searchParams.get("location") || "";
  const pickupDate = searchParams.get("from") || searchParams.get("pickup") || "";
  const endDate = searchParams.get("to") || searchParams.get("end") || "";
  const cityName = searchParams.get("city") || "";
  const cityId = searchParams.get("cityId") || "";

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFavorite = useCallback(
    (id: string, name: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          toast.success(t("listings.removedFromFavorites"));
        } else {
          next.add(id);
          toast.success(`${name} • ${t("listings.addedToFavorites")}`);
        }
        try {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [t]
  );

  // Fetch service locations (neighborhoods) ONLY for the selected city
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Resolve the city id: either passed via ?cityId, or look it up from ?city name
        let resolvedCityId = cityId;
        if (!resolvedCityId && cityName) {
          const { data: cityRow } = await supabase
            .from("service_cities")
            .select("id")
            .ilike("name", cityName)
            .maybeSingle();
          resolvedCityId = cityRow?.id || "";
        }

        // Without a city we cannot show neighborhoods (avoid mixing all cities together)
        if (!resolvedCityId) {
          setNeighborhoods([]);
          return;
        }

        const { data, error } = await supabase
          .from("service_locations")
          .select("id, name, city_id, service_cities!inner(is_available)")
          .eq("is_active", true)
          .eq("city_id", resolvedCityId)
          .order("display_order", { ascending: true })
          .order("name");

        if (error) throw error;

        type LocRow = {
          id: string;
          name: string;
          service_cities?: { is_available?: boolean } | null;
        };
        const availableLocations = ((data as LocRow[]) || []).filter(
          (loc) => loc.service_cities?.is_available === true
        );
        const mapped = availableLocations.map((loc) => ({ id: loc.id, name: loc.name }));
        setNeighborhoods(mapped);
        if (mapped.length > 0 && !location) setSelectedTab(mapped[0].id);
      } catch (e) {
        console.error("Failed to fetch locations:", e);
      }
    };
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId, cityName]);

  useEffect(() => {
    if (pickupDate && endDate) {
      setDateRange({ from: new Date(pickupDate), to: new Date(endDate) });
    }
  }, [pickupDate, endDate]);

  useEffect(() => {
    if (location) {
      const n = neighborhoods.find((x) => x.name === location);
      if (n) setSelectedTab(n.id);
    }
  }, [location, neighborhoods]);

  const currentNeighborhood =
    neighborhoods.find((n) => n.id === selectedTab)?.name || neighborhoods[0]?.name || "";

  const motorbikes = useMemo(() => {
    if (!bikes || !bikeTypes) return [];
    return bikes
      .filter((bike) => bike.location === currentNeighborhood)
      .map((bike) => {
        const bikeType = bike.bike_type || bikeTypes.find((t) => t.id === bike.bike_type_id);
        if (!bikeType) return null;
        return {
          id: bike.id,
          name: bikeType?.name || "Unknown",
          type: bikeType?.name || "Unknown",
          location: bike.location,
          price: Number(bikeType?.daily_price || 0),
          rating: Number(bikeType?.rating || 5),
          image: getBikeImageUrl(bikeType?.main_image_url || "sanya-main"),
          features: Array.isArray(bikeType?.features) ? bikeType.features : [],
          quantity: bikeQuantities[bikeType?.name] || 10,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);
  }, [bikes, bikeTypes, currentNeighborhood]);

  // Group bikes by type
  const groupedBikes = useMemo(() => {
    const groups: Record<string, typeof motorbikes> = {};
    motorbikes.forEach((bike) => {
      if (!groups[bike.type]) groups[bike.type] = [];
      groups[bike.type].push(bike);
    });
    return groups;
  }, [motorbikes]);

  // Sort the grouped bikes
  const sortedGroups = useMemo(() => {
    const entries = Object.entries(groupedBikes).map(([type, list]) => ({
      type,
      first: list[0],
      list,
    }));
    switch (sortBy) {
      case "price-asc":
        entries.sort((a, b) => (a.first?.price || 0) - (b.first?.price || 0));
        break;
      case "price-desc":
        entries.sort((a, b) => (b.first?.price || 0) - (a.first?.price || 0));
        break;
      case "rating":
        entries.sort((a, b) => (b.first?.rating || 0) - (a.first?.rating || 0));
        break;
      default:
        break;
    }
    return entries;
  }, [groupedBikes, sortBy]);

  const handleBikeSelect = (bikeId: string) => {
    const dates =
      dateRange?.from && dateRange?.to
        ? `?from=${format(dateRange.from, "yyyy-MM-dd")}&to=${format(dateRange.to, "yyyy-MM-dd")}`
        : "";
    navigate(`/bike/${bikeId}${dates}`);
  };

  const handleTabChange = (tabId: string) => {
    setSelectedTab(tabId);
    const n = neighborhoods.find((x) => x.id === tabId);
    if (n) {
      const params = new URLSearchParams(searchParams);
      params.set("location", n.name);
      setSearchParams(params);
    }
  };

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    const params = new URLSearchParams(searchParams);
    if (range?.from && range?.to) {
      params.set("from", format(range.from, "yyyy-MM-dd"));
      params.set("to", format(range.to, "yyyy-MM-dd"));
      params.delete("pickup");
      params.delete("end");
    } else if (!range) {
      params.delete("from");
      params.delete("to");
      params.delete("pickup");
      params.delete("end");
    }
    setSearchParams(params);
  };

  const isLoading = isLoadingTypes || isLoadingBikes;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3">
          {/* Back + title row */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2 bg-muted text-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <ArrowLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
              <span className="hidden sm:inline">{t("listings.backToHomepage")}</span>
            </Button>
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              <span>{t("listings.filtersTitle")}</span>
            </div>
          </div>

          {/* Location pills - horizontal scroll */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {neighborhoods.map((n) => (
              <button
                key={n.id}
                onClick={() => handleTabChange(n.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                  selectedTab === n.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:border-foreground/40"
                )}
              >
                <MapPinIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                {n.name}
              </button>
            ))}
          </div>

          {/* Date + sort row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex-1 sm:max-w-md">
              <BookingDatePicker
                value={dateRange}
                onChange={handleDateChange}
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t("listings.sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">{t("listings.sortRecommended")}</SelectItem>
                <SelectItem value="price-asc">{t("listings.sortPriceLow")}</SelectItem>
                <SelectItem value="price-desc">{t("listings.sortPriceHigh")}</SelectItem>
                <SelectItem value="rating">{t("listings.sortRating")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="container mx-auto px-4 pt-6 pb-2">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            {currentNeighborhood || t("listings.title")}
          </h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {t("listings.resultsCount").replace(
                "{count}",
                String(motorbikes.reduce((acc, b) => acc + b.quantity, 0))
              )}
            </p>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <BikeTypeSkeleton key={i} />
              ))}
            </div>
          ) : sortedGroups.length === 0 ? (
            <EmptyState
              icon={Bike}
              title={t("listings.noMotorbikesTitle")}
              description={t("listings.noMotorbikesDesc").replace(
                "{location}",
                currentNeighborhood
              )}
              actionLabel={t("listings.tryAnotherNeighborhood")}
              onAction={() => {
                const idx = neighborhoods.findIndex((n) => n.id === selectedTab);
                const next = (idx + 1) % neighborhoods.length;
                handleTabChange(neighborhoods[next].id);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
              {sortedGroups.map(({ type, first, list }, idx) => {
                const quantity = first?.quantity || 0;
                const isFav = first ? favorites.has(first.id) : false;
                return (
                  <Card
                    key={type}
                    className="group cursor-pointer border border-border bg-card hover:shadow-lg transition-all duration-300 overflow-hidden rounded-2xl animate-fade-in"
                    style={{ animationDelay: `${idx * 60}ms` }}
                    onClick={() => first && handleBikeSelect(first.id)}
                  >
                    <CardContent className="p-0">
                      {/* Image */}
                      <div className="relative aspect-square bg-muted/30 overflow-hidden">
                        <img
                          src={first?.image}
                          alt={type}
                          className="w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Favorite button */}
                        <button
                          aria-label={isFav ? t("listings.saved") : t("listings.save")}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (first) toggleFavorite(first.id, type);
                          }}
                          className={cn(
                            "absolute top-3 rounded-full p-2 backdrop-blur-md transition-all",
                            isRTL ? "left-3" : "right-3",
                            isFav
                              ? "bg-primary/90 text-primary-foreground"
                              : "bg-background/80 text-foreground hover:bg-background"
                          )}
                        >
                          <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
                        </button>

                        {/* Quantity */}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "absolute bottom-3 text-xs font-semibold bg-background/90 backdrop-blur-sm text-foreground border-0",
                            isRTL ? "right-3" : "left-3"
                          )}
                        >
                          {quantity} {t("listings.available")}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-1">
                            {type}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {first?.rating?.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPinIcon className="h-3 w-3" />
                          <span className="line-clamp-1">{currentNeighborhood}</span>
                        </div>

                        <div className="pt-2">
                          <span className="text-xs text-muted-foreground">
                            {t("listings.from")}{" "}
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {first?.price} DH
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("listings.perDay")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Listings;
