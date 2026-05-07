import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookingDatePicker } from "@/components/BookingDatePicker";
import {
  MapPin as MapPinIcon,
  Calendar,
  SlidersHorizontal,
  X,
  Check,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

type SortOption = "recommended" | "price-asc" | "price-desc" | "rating";

interface Neighborhood {
  id: string;
  name: string;
}

interface Props {
  trigger: React.ReactNode;
  t: (k: string) => string;
  neighborhoods: Neighborhood[];
  selectedTab: string;
  handleTabChange: (id: string) => void;
  dateRange: DateRange | undefined;
  handleDateChange: (r: DateRange | undefined) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  resultCount?: number;
}

const SectionCard = ({
  tone,
  icon: Icon,
  title,
  helper,
  children,
}: {
  tone: "primary" | "sky" | "violet";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  helper: string;
  children: React.ReactNode;
}) => {
  const toneMap = {
    primary: {
      bg: "bg-primary/[0.06]",
      ring: "ring-primary/20",
      chip: "bg-primary/15 text-primary-foreground/90",
      icon: "text-foreground",
    },
    sky: {
      bg: "bg-sky-500/[0.07]",
      ring: "ring-sky-500/20",
      chip: "bg-sky-500/15",
      icon: "text-sky-600 dark:text-sky-400",
    },
    violet: {
      bg: "bg-violet-500/[0.07]",
      ring: "ring-violet-500/20",
      chip: "bg-violet-500/15",
      icon: "text-violet-600 dark:text-violet-400",
    },
  }[tone];

  return (
    <div
      className={cn(
        "rounded-2xl p-5 ring-1 ring-inset",
        toneMap.bg,
        toneMap.ring
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            toneMap.chip
          )}
        >
          <Icon className={cn("h-5 w-5", toneMap.icon)} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground leading-tight">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{helper}</p>
        </div>
      </div>
      {children}
    </div>
  );
};

export const FilterSheet = ({
  trigger,
  t,
  neighborhoods,
  selectedTab,
  handleTabChange,
  dateRange,
  handleDateChange,
  sortBy,
  setSortBy,
  resultCount,
}: Props) => {
  const [resetKey, setResetKey] = useState(0);

  const isLocationActive =
    !!selectedTab && selectedTab !== neighborhoods[0]?.id;
  const isDateActive = !!dateRange?.from && !!dateRange?.to;
  const isSortActive = sortBy !== "recommended";
  const activeCount =
    Number(isLocationActive) + Number(isDateActive) + Number(isSortActive);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "recommended", label: t("listings.sortRecommended") },
    { value: "price-asc", label: t("listings.sortPriceLow") },
    { value: "price-desc", label: t("listings.sortPriceHigh") },
    { value: "rating", label: t("listings.sortRating") },
  ];

  const handleClearAll = () => {
    setSelectedTabSafe();
    handleDateChange(undefined);
    setSortBy("recommended");
    setResetKey((k) => k + 1);
    toast.success(t("listings.cleared") || "Filters cleared");
  };

  const setSelectedTabSafe = () => {
    if (neighborhoods[0]) handleTabChange(neighborhoods[0].id);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[88dvh] rounded-t-[28px] p-0 border-t-0 bg-background transition-transform duration-300 ease-out [&>button]:hidden"
      >
        <div className="flex flex-col h-full">
          {/* Grab handle (mobile feel, harmless on desktop) */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <span className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 shrink-0">
            <SheetTitle className="text-lg font-semibold">
              {t("listings.filtersTitle")}
            </SheetTitle>
            <SheetClose className="rounded-full h-9 w-9 inline-flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors">
              <X className="h-4.5 w-4.5" />
            </SheetClose>
          </div>

          {/* Scroll body */}
          <div
            key={resetKey}
            className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide [&::-webkit-scrollbar]:hidden px-5 pt-2 pb-6 space-y-4 animate-fade-in"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
            }}
          >
            {/* Where */}
            {neighborhoods.length > 0 && (
              <SectionCard
                tone="primary"
                icon={MapPinIcon}
                title={t("home.where")}
                helper={t("listings.whereHelper") || "Choose a neighborhood"}
              >
                <div className="flex flex-wrap gap-2.5">
                  {neighborhoods.map((n) => {
                    const active = selectedTab === n.id;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleTabChange(n.id)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-2 h-11 px-5 rounded-full text-[15px] font-medium border transition-all duration-200 active:scale-[0.98]",
                          active
                            ? "bg-foreground text-background border-foreground shadow-sm"
                            : "bg-background text-foreground border-border hover:border-foreground/40 hover:-translate-y-px hover:shadow-sm"
                        )}
                      >
                        <MapPinIcon className="h-3.5 w-3.5 opacity-70" />
                        {n.name}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* When */}
            <SectionCard
              tone="sky"
              icon={Calendar}
              title={t("home.when")}
              helper={t("listings.whenHelper") || "Pick rental dates"}
            >
              <div className="bg-background rounded-xl border border-border p-1">
                <BookingDatePicker
                  value={dateRange}
                  onChange={handleDateChange}
                />
              </div>
            </SectionCard>

            {/* Sort */}
            <SectionCard
              tone="violet"
              icon={SlidersHorizontal}
              title={t("listings.sortBy")}
              helper={t("listings.sortHelper") || "How to order results"}
            >
              <div className="grid grid-cols-1 gap-2">
                {sortOptions.map((opt) => {
                  const active = sortBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center justify-between h-14 px-5 rounded-2xl border text-[15px] font-medium transition-all active:scale-[0.99]",
                        active
                          ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/30"
                          : "bg-background border-border text-foreground/80 hover:border-foreground/30 hover:bg-muted/40"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            active
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {active && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                          )}
                        </span>
                        {opt.label}
                      </span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <div className="h-2" />
          </div>

          {/* Single-row action bar */}
          <div
            className="flex items-center gap-3 border-t border-border bg-background/95 backdrop-blur px-5 py-3 shrink-0"
            style={{
              paddingBottom:
                "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div
              className={cn(
                "flex items-center gap-2 transition-all duration-200",
                activeCount === 0 && "opacity-0 pointer-events-none -ml-1"
              )}
            >
              <span className="h-8 inline-flex items-center px-3 rounded-full bg-muted text-foreground text-xs font-semibold">
                {activeCount} {t("listings.active") || "active"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-9 rounded-full text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
              >
                {t("listings.clearAll") || "Clear all"}
              </Button>
            </div>

            <SheetClose asChild>
              <Button
                className="ml-auto h-12 px-6 rounded-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm"
              >
                {typeof resultCount === "number"
                  ? `${t("listings.showResults") || "Show"} ${resultCount} ${t("listings.results") || "results"}`
                  : t("listings.applyFilters") || "Show results"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
