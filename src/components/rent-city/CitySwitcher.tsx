import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Check, Clock, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cityToSlug } from "@/lib/citySlug";
import { cn } from "@/lib/utils";
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

interface CitySwitcherProps {
  currentCitySlug: string;
  currentCityName: string;
  /** Visual size — heading uses inline, compact pill for the coming-soon variant */
  variant?: "heading" | "compact";
}

type CityRow = {
  id: string;
  name: string;
  slug: string | null;
  is_available: boolean;
  is_coming_soon: boolean;
};

export const CitySwitcher = ({
  currentCitySlug,
  currentCityName,
  variant = "heading",
}: CitySwitcherProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  const { data: cityRows = [] } = useQuery({
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

  const { available, comingSoon } = useMemo(() => {
    const available = cityRows
      .filter((c) => c.is_available && !c.is_coming_soon)
      .sort((a, b) => a.name.localeCompare(b.name));
    const comingSoon = cityRows
      .filter((c) => c.is_coming_soon)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { available, comingSoon };
  }, [cityRows]);

  const handleSelect = (city: CityRow) => {
    const newSlug = city.slug || cityToSlug(city.name);
    if (newSlug === currentCitySlug) {
      setOpen(false);
      return;
    }
    // Preserve query params except neighborhood (city-specific)
    const params = new URLSearchParams(searchParams);
    params.delete("neighborhood");
    const qs = params.toString();
    setOpen(false);
    navigate(`/rent/${newSlug}${qs ? `?${qs}` : ""}`);
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
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "border border-border bg-background hover:bg-muted text-sm font-medium",
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
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{currentCityName}</span>
            <ChevronDown
              className={cn(
                variant === "heading"
                  ? "h-5 w-5 md:h-6 md:w-6"
                  : "h-4 w-4",
                "transition-transform",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(92vw,320px)] p-0 bg-popover"
      >
        <Command>
          <CommandInput placeholder="Search city..." />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No city found.</CommandEmpty>

            {available.length > 0 && (
              <CommandGroup heading="Available now">
                {available.map((c) => {
                  const slug = c.slug || cityToSlug(c.name);
                  const isCurrent = slug === currentCitySlug;
                  return (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => handleSelect(c)}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.name}
                      </span>
                      {isCurrent && (
                        <Check className="h-4 w-4 text-[#163300]" />
                      )}
                    </CommandItem>
                  );
                })}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CitySwitcher;
