import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Check, Clock, MapPin, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cityToSlug, slugToCityNameVariants } from "@/lib/citySlug";
import { cn } from "@/lib/utils";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";

interface CitySwitcherProps {
  currentCitySlug: string;
  currentCityName: string;
  variant?: "heading" | "compact";
}

type CityRow = {
  id: string;
  name: string;
  slug: string | null;
  is_available: boolean;
  is_coming_soon: boolean;
};

const RECENT_KEY = "motonita:recent-cities";
const RECENT_MAX = 3;

function getRecentSlugs(): string[] {
  return safeGetItem<string[]>(RECENT_KEY, []);
}

function pushRecentSlug(slug: string) {
  const current = getRecentSlugs().filter((s) => s !== slug);
  current.unshift(slug);
  safeSetItem(RECENT_KEY, current.slice(0, RECENT_MAX));
}

export const CitySwitcher = ({
  currentCitySlug,
  currentCityName,
  variant = "heading",
}: CitySwitcherProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: cityRows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["service-cities-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_cities")
        .select("id, name, slug, is_available, is_coming_soon")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CityRow[];
    },
  });

  const recentSlugs = useMemo(() => getRecentSlugs(), [open]);

  const { available, comingSoon, recent } = useMemo(() => {
    const available = cityRows
      .filter((c) => c.is_available && !c.is_coming_soon)
      .sort((a, b) => a.name.localeCompare(b.name));
    const comingSoon = cityRows
      .filter((c) => c.is_coming_soon)
      .sort((a, b) => a.name.localeCompare(b.name));

    const bySlug = new Map<string, CityRow>();
    for (const c of available) {
      bySlug.set(c.slug || cityToSlug(c.name), c);
    }
    const recent = recentSlugs
      .map((s) => bySlug.get(s))
      .filter((c): c is CityRow => !!c && (c.slug || cityToSlug(c.name)) !== currentCitySlug);

    return { available, comingSoon, recent };
  }, [cityRows, recentSlugs, currentCitySlug]);

  // Warm the React Query cache for the destination city so RentCity renders
  // its hero/listings instantly after navigation.
  const prefetchCity = useCallback(
    (city: CityRow) => {
      const slug = city.slug || cityToSlug(city.name);
      queryClient.prefetchQuery({
        queryKey: ["rent-city-row", slug],
        staleTime: 60_000,
        queryFn: async () => {
          const { data } = await supabase
            .from("service_cities")
            .select(
              "id, name, is_available, is_coming_soon, image_url, image_focal_x, image_focal_y, description, slug",
            )
            .eq("slug", slug)
            .maybeSingle();
          if (data) return data;
          const variants = slugToCityNameVariants(slug);
          if (variants.length > 0) {
            const { data: byName } = await supabase
              .from("service_cities")
              .select(
                "id, name, is_available, is_coming_soon, image_url, image_focal_x, image_focal_y, description, slug",
              )
              .in("name", variants)
              .maybeSingle();
            return byName ?? null;
          }
          return null;
        },
      });
    },
    [queryClient],
  );

  const handleSelect = (city: CityRow) => {
    const newSlug = city.slug || cityToSlug(city.name);
    if (newSlug === currentCitySlug) {
      setOpen(false);
      return;
    }
    pushRecentSlug(newSlug);
    const params = new URLSearchParams(searchParams);
    params.delete("neighborhood");
    const qs = params.toString();
    setOpen(false);
    navigate(`/rent/${newSlug}${qs ? `?${qs}` : ""}`);
  };

  const renderItem = (c: CityRow) => {
    const slug = c.slug || cityToSlug(c.name);
    const isCurrent = slug === currentCitySlug;
    return (
      <CommandItem
        key={c.id}
        value={c.name}
        onSelect={() => handleSelect(c)}
        onMouseEnter={() => prefetchCity(c)}
        onFocus={() => prefetchCity(c)}
        className="flex items-center justify-between gap-3"
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {c.name}
        </span>
        {isCurrent && <Check className="h-4 w-4 text-[#163300]" />}
      </CommandItem>
    );
  };

  const triggerClasses =
    variant === "heading"
      ? cn(
          "inline-flex items-center gap-1 align-baseline",
          "border-b-2 border-[#9FE870] hover:border-b-4 hover:bg-[#9FE870]/10",
          "rounded-sm px-1 -mx-1 transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9FE870] focus-visible:ring-offset-2",
        )
      : cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground",
          "hover:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Change city. Current city: ${currentCityName}`}
        >
          <span className={triggerClasses}>
            {variant === "compact" && (
              <MapPin className="h-3.5 w-3.5 text-foreground/70" aria-hidden="true" />
            )}
            <span>{currentCityName}</span>
            {variant === "heading" && (
              <ChevronDown
                className={cn(
                  "h-5 w-5 md:h-6 md:w-6 transition-transform",
                  open && "rotate-180",
                )}
                aria-hidden="true"
              />
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,320px)] p-0 bg-popover">
        <Command
          // Prefetch as the user types/highlights — feels instant on Enter.
          onValueChange={(value) => {
            const match =
              available.find((c) => c.name.toLowerCase() === value.toLowerCase()) ||
              available.find((c) => c.name.toLowerCase().startsWith(value.toLowerCase()));
            if (match) prefetchCity(match);
          }}
        >
          <CommandInput placeholder="Search city..." />
          <CommandList className="max-h-[340px] [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
            {isLoading ? (
              <div className="p-2 space-y-2" role="status" aria-label="Loading cities">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <Skeleton className="h-3.5 w-3.5 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="p-4 text-center text-sm">
                <AlertCircle className="h-5 w-5 mx-auto mb-2 text-destructive" />
                <p className="text-foreground font-medium">Couldn't load cities</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-[#9FE870] text-[#163300] text-xs font-semibold hover:bg-[#9FE870]/90"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <CommandEmpty>No city found.</CommandEmpty>



                {available.length > 0 && (
                  <CommandGroup heading="Available now">
                    {available.map((c) => renderItem(c))}
                  </CommandGroup>
                )}

                {comingSoon.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Coming soon">
                      {comingSoon.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          disabled
                          className="flex items-center justify-between gap-3 opacity-60"
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Clock className="h-3 w-3" /> Soon
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CitySwitcher;
