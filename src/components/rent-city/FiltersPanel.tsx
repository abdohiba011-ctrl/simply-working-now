import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PriceRangeFilter } from "@/components/filters/PriceRangeFilter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Banknote,
  Bike as BikeIcon,
  Fuel,
  IdCard,
  Sparkles,
  ChevronDown,
  Check,
  ArrowRight,
  Star,
  X,
} from "lucide-react";

export type Tone = "primary" | "sky" | "amber" | "violet" | "rose" | "indigo" | "teal";

const TONE: Record<
  Tone,
  { bg: string; ring: string; chip: string; icon: string }
> = {
  primary: {
    bg: "bg-primary/[0.06]",
    ring: "ring-primary/25",
    chip: "bg-primary/20",
    icon: "text-foreground",
  },
  sky: {
    bg: "bg-sky-500/[0.07]",
    ring: "ring-sky-500/25",
    chip: "bg-sky-500/15",
    icon: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    bg: "bg-amber-500/[0.08]",
    ring: "ring-amber-500/25",
    chip: "bg-amber-500/15",
    icon: "text-amber-600 dark:text-amber-400",
  },
  violet: {
    bg: "bg-violet-500/[0.07]",
    ring: "ring-violet-500/25",
    chip: "bg-violet-500/15",
    icon: "text-violet-600 dark:text-violet-400",
  },
  rose: {
    bg: "bg-rose-500/[0.07]",
    ring: "ring-rose-500/25",
    chip: "bg-rose-500/15",
    icon: "text-rose-600 dark:text-rose-400",
  },
  indigo: {
    bg: "bg-indigo-500/[0.07]",
    ring: "ring-indigo-500/25",
    chip: "bg-indigo-500/15",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  teal: {
    bg: "bg-teal-500/[0.07]",
    ring: "ring-teal-500/25",
    chip: "bg-teal-500/15",
    icon: "text-teal-600 dark:text-teal-400",
  },
};

const SectionCard = ({
  tone,
  icon: Icon,
  title,
  helper,
  defaultOpen = true,
  children,
}: {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  helper?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const t = TONE[tone];
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded-2xl ring-1 ring-inset", t.bg, t.ring)}>
        <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 text-start">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", t.chip)}>
            <Icon className={cn("h-5 w-5", t.icon)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-foreground leading-tight">{title}</h3>
            {helper && <p className="text-xs text-muted-foreground mt-0.5">{helper}</p>}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium border transition-all duration-200 active:scale-[0.97]",
      active
        ? "bg-foreground text-background border-foreground shadow-sm"
        : "bg-background text-foreground border-border hover:border-foreground/40 hover:-translate-y-px hover:shadow-sm"
    )}
  >
    {children}
  </button>
);

interface Props {
  // data
  neighborhoodOptions: string[];
  popularNeighborhoodSet: Set<string>;
  neighborhoodCounts: Record<string, number>;
  allCityLabel: string;
  pricesForHistogram: number[];
  priceBounds: [number, number];
  filteredCount: number;
  durationOptions: { id: string; label: string }[];
  bikeTypes: { id: string; label: string }[];
  licenseOptions: { id: string; label: string }[];
  featureOptions: { id: string; label: string }[];
  // state
  neighborhood: string;
  setNeighborhood: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  selectedTypes: string[];
  setSelectedTypes: (v: string[]) => void;
  fuel: string;
  setFuel: (v: string) => void;
  licenses: string[];
  setLicenses: (v: string[]) => void;
  features: string[];
  setFeatures: (v: string[]) => void;
  activeFilterCount: number;
  onApply: () => void;
}

export const FiltersPanel = ({
  neighborhoodOptions,
  popularNeighborhoodSet,
  neighborhoodCounts,
  allCityLabel,
  pricesForHistogram,
  priceBounds,
  filteredCount,
  durationOptions,
  bikeTypes,
  licenseOptions,
  featureOptions,
  neighborhood,
  setNeighborhood,
  duration,
  setDuration,
  priceRange,
  setPriceRange,
  selectedTypes,
  setSelectedTypes,
  fuel,
  setFuel,
  licenses,
  setLicenses,
  features,
  setFeatures,
  activeFilterCount,
  onApply,
}: Props) => {
  const [resetKey, setResetKey] = useState(0);

  const toggle = (
    arr: string[],
    val: string,
    set: (v: string[]) => void
  ) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const clearAll = () => {
    setNeighborhood(allCityLabel);
    setDuration("1");
    setPriceRange(priceBounds);
    setSelectedTypes([]);
    setFuel("all");
    setLicenses([]);
    setFeatures([]);
    setResetKey((k) => k + 1);
    toast.success("Filters cleared");
  };

  const fuelOptions = [
    { id: "all", label: "All" },
    { id: "gasoline", label: "Gasoline" },
    { id: "electric", label: "Electric" },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        key={resetKey}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide [&::-webkit-scrollbar]:hidden px-3 pt-2 pb-4 space-y-3 animate-fade-in"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
        }}
      >
        {/* Neighborhood */}
        <SectionCard tone="primary" icon={MapPin} title="Neighborhood" helper="Where to pick up">
          <div className="space-y-1">
            {neighborhoodOptions.map((n) => {
              const isActive = neighborhood === n;
              const isPopular = popularNeighborhoodSet.has(n);
              const count = neighborhoodCounts[n] ?? 0;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNeighborhood(n)}
                  className={cn(
                    "w-full flex items-center gap-2 h-11 px-3 rounded-xl text-sm transition-colors text-start",
                    isActive
                      ? "bg-foreground text-background"
                      : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      isActive
                        ? "border-background bg-background"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
                  </span>
                  <span className={cn("flex-1 truncate", count === 0 && !isActive && "text-muted-foreground")}>
                    {n}
                  </span>
                  {isPopular && (
                    <Star className={cn("h-3.5 w-3.5", isActive ? "fill-background text-background" : "fill-primary text-primary")} />
                  )}
                  <span
                    className={cn(
                      "text-xs tabular-nums px-2 py-0.5 rounded-full",
                      isActive ? "bg-background/15" : "bg-muted/60 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Duration */}
        <SectionCard tone="sky" icon={Clock} title="Rental duration" helper="How long you'll keep it">
          <div className="flex flex-wrap gap-2">
            {durationOptions.map((d) => (
              <Chip key={d.id} active={duration === d.id} onClick={() => setDuration(d.id)}>
                {d.label}
              </Chip>
            ))}
          </div>
        </SectionCard>

        {/* Price */}
        <SectionCard tone="amber" icon={Banknote} title="Price range" helper="Per day · MAD">
          <div className="bg-background rounded-xl border border-border/60 p-3">
            <PriceRangeFilter
              prices={pricesForHistogram}
              value={priceRange}
              onChange={setPriceRange}
              bounds={priceBounds}
              step={10}
              currency="MAD"
            />
          </div>
        </SectionCard>

        {/* Bike type */}
        <SectionCard tone="violet" icon={BikeIcon} title="Bike type" helper="Choose one or several">
          <div className="flex flex-wrap gap-2">
            {bikeTypes.map((bt) => {
              const active = selectedTypes.includes(bt.id);
              return (
                <Chip key={bt.id} active={active} onClick={() => toggle(selectedTypes, bt.id, setSelectedTypes)}>
                  {active && <Check className="h-3.5 w-3.5" />}
                  {bt.label}
                </Chip>
              );
            })}
          </div>
        </SectionCard>

        {/* Fuel */}
        <SectionCard tone="rose" icon={Fuel} title="Engine / Fuel" helper="Powertrain">
          <div className="grid grid-cols-3 gap-2">
            {fuelOptions.map((f) => {
              const active = fuel === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFuel(f.id)}
                  aria-pressed={active}
                  className={cn(
                    "h-11 rounded-xl text-sm font-medium border transition-all active:scale-[0.97]",
                    active
                      ? "bg-foreground text-background border-foreground shadow-sm"
                      : "bg-background text-foreground border-border hover:border-foreground/40"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* License */}
        <SectionCard tone="indigo" icon={IdCard} title="License required" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {licenseOptions.map((l) => {
              const active = licenses.includes(l.id);
              return (
                <Chip key={l.id} active={active} onClick={() => toggle(licenses, l.id, setLicenses)}>
                  {active && <Check className="h-3.5 w-3.5" />}
                  {l.label}
                </Chip>
              );
            })}
          </div>
        </SectionCard>

        {/* Features */}
        <SectionCard tone="teal" icon={Sparkles} title="Features" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {featureOptions.map((f) => {
              const active = features.includes(f.id);
              return (
                <Chip key={f.id} active={active} onClick={() => toggle(features, f.id, setFeatures)}>
                  {active && <Check className="h-3.5 w-3.5" />}
                  {f.label}
                </Chip>
              );
            })}
          </div>
        </SectionCard>

        <div className="h-2" />
      </div>

      {/* Single-row sticky action bar */}
      <div
        className="@container flex items-center gap-2 border-t border-border bg-background/95 backdrop-blur px-4 py-3 shrink-0"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          aria-label="Clear all filters"
          className={cn(
            "h-12 rounded-full gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground active:scale-95 transition-all duration-200",
            "w-12 p-0 justify-center @[260px]:w-auto @[260px]:px-4",
            activeFilterCount === 0 && "opacity-0 pointer-events-none -ml-1"
          )}
        >
          <X className="h-4 w-4 shrink-0" />
          <span className="hidden @[260px]:inline">Clear all</span>
        </Button>

        <Button
          onClick={onApply}
          className="ml-auto h-12 px-5 rounded-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm"
        >
          {activeFilterCount > 0 ? (
            <>
              <span>Apply</span>
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-white text-black text-xs font-bold">
                {activeFilterCount}
              </span>
              <span>{activeFilterCount > 1 ? "filters" : "filter"}</span>
            </>
          ) : (
            <span>{`Show ${filteredCount} bike${filteredCount === 1 ? "" : "s"}`}</span>
          )}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
