import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookingDatePicker } from "@/components/BookingDatePicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  MapPin as MapPinIcon,
  Calendar,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

type SortOption = "recommended" | "price-asc" | "price-desc" | "rating";

interface Neighborhood {
  id: string;
  name: string;
}

interface Props {
  isRTL: boolean;
  t: (k: string) => string;
  navigate: (to: string) => void;
  neighborhoods: Neighborhood[];
  selectedTab: string;
  handleTabChange: (id: string) => void;
  dateRange: DateRange | undefined;
  handleDateChange: (r: DateRange | undefined) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  onClearAll: () => void;
}

export const DesktopFilterBar = ({
  isRTL,
  t,
  navigate,
  neighborhoods,
  selectedTab,
  handleTabChange,
  dateRange,
  handleDateChange,
  sortBy,
  setSortBy,
  onClearAll,
}: Props) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = railRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [neighborhoods.length]);

  const scrollBy = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  const selectedNeighborhood = neighborhoods.find((n) => n.id === selectedTab);
  const dateLabel =
    dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
      : t("listings.anyDates") || "Any dates";

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "recommended", label: t("listings.sortRecommended") },
    { value: "price-asc", label: t("listings.sortPriceLow") },
    { value: "price-desc", label: t("listings.sortPriceHigh") },
    { value: "rating", label: t("listings.sortRating") },
  ];
  const sortLabel =
    sortOptions.find((o) => o.value === sortBy)?.label || t("listings.sortBy");

  const isLocationActive =
    !!selectedTab && selectedTab !== neighborhoods[0]?.id;
  const isDateActive = !!dateRange?.from && !!dateRange?.to;
  const isSortActive = sortBy !== "recommended";
  const activeCount =
    Number(isLocationActive) + Number(isDateActive) + Number(isSortActive);

  const chipBase =
    "group inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-medium transition-all duration-200 select-none";
  const chipInactive =
    "bg-background border-border text-foreground hover:bg-muted hover:border-foreground/30 hover:-translate-y-px hover:shadow-sm";
  const chipActive =
    "bg-primary/10 border-primary text-foreground shadow-sm";

  return (
    <div className="hidden lg:block px-[16px]">
      {/* Toolbar card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-3">
        {/* Top row: back + filter chips + clear */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2 h-10 bg-muted text-foreground hover:bg-primary hover:text-primary-foreground rounded-full"
          >
            <ArrowLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
            <span>{t("listings.backToHomepage")}</span>
          </Button>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Location chip (informational summary) */}
            <div
              className={cn(
                chipBase,
                isLocationActive ? chipActive : chipInactive,
                "cursor-default"
              )}
              aria-label={t("listings.location")}
            >
              <MapPinIcon className="h-4 w-4 opacity-70" />
              <span className="text-muted-foreground">{t("listings.location")}</span>
              <span className="font-semibold text-foreground">
                {selectedNeighborhood?.name || "—"}
              </span>
            </div>

            {/* Dates chip → Popover with BookingDatePicker */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(chipBase, isDateActive ? chipActive : chipInactive)}
                  aria-label={t("listings.dates") || "Dates"}
                >
                  <Calendar className="h-4 w-4 opacity-70" />
                  <span className="text-muted-foreground">{t("listings.dates") || "Dates"}</span>
                  <span className="font-semibold text-foreground">{dateLabel}</span>
                  {isDateActive && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDateChange(undefined);
                      }}
                      className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                      aria-label="Clear dates"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="p-3 w-auto rounded-xl border-border shadow-lg bg-popover"
              >
                <BookingDatePicker
                  value={dateRange}
                  onChange={handleDateChange}
                />
              </PopoverContent>
            </Popover>

            {/* Sort chip → Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(chipBase, isSortActive ? chipActive : chipInactive)}
                  aria-label={t("listings.sortBy")}
                >
                  <SlidersHorizontal className="h-4 w-4 opacity-70" />
                  <span className="text-muted-foreground">{t("listings.sortBy")}</span>
                  <span className="font-semibold text-foreground">{sortLabel}</span>
                  <ChevronDown className="h-4 w-4 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="p-2 w-[280px] rounded-xl border-border shadow-lg bg-popover"
              >
                <div className="grid gap-1">
                  {sortOptions.map((opt) => {
                    const active = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-start",
                          active
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-muted text-foreground/80"
                        )}
                        aria-pressed={active}
                      >
                        <span>{opt.label}</span>
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right: active count + clear all */}
          <div className="flex items-center gap-2 shrink-0">
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="h-6 rounded-full bg-primary/15 text-foreground border-0 px-2.5 text-xs font-semibold"
              >
                {activeCount} {t("listings.active") || "active"}
              </Badge>
            )}
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {t("listings.clearAll") || "Clear all"}
              </Button>
            )}
          </div>
        </div>

        {/* Divider */}
        {neighborhoods.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60">
            {/* Pill rail with hidden scrollbar + edge fades + chevrons */}
            <div className="relative group">
              {/* Edge fades */}
              <div
                className={cn(
                  "pointer-events-none absolute top-0 bottom-0 w-12 z-10 transition-opacity",
                  isRTL ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r",
                  "from-card to-transparent",
                  canScrollLeft ? "opacity-100" : "opacity-0"
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute top-0 bottom-0 w-12 z-10 transition-opacity",
                  isRTL ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l",
                  "from-card to-transparent",
                  canScrollRight ? "opacity-100" : "opacity-0"
                )}
              />

              {/* Chevrons */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollBy(isRTL ? 1 : -1)}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted",
                    isRTL ? "right-1" : "left-1"
                  )}
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollBy(isRTL ? -1 : 1)}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted",
                    isRTL ? "left-1" : "right-1"
                  )}
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              <div
                ref={railRef}
                className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
              >
                {neighborhoods.map((n) => {
                  const active = selectedTab === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleTabChange(n.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium border transition-all duration-200",
                        active
                          ? "bg-foreground text-background border-foreground shadow-sm"
                          : "bg-muted/40 text-foreground border-transparent hover:bg-muted hover:border-border hover:-translate-y-px hover:shadow-sm"
                      )}
                    >
                      <MapPinIcon className="h-3.5 w-3.5" />
                      {n.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
