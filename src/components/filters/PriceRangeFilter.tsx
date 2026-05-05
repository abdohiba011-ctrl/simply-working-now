import { useMemo, useState, useEffect, useRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface PriceRangeFilterProps {
  prices: number[];
  value: [number, number];
  onChange: (v: [number, number]) => void;
  bounds: [number, number];
  step?: number;
  bucketCount?: number;
  currency?: string;
  subtitle?: string;
}

export function PriceRangeFilter({
  prices,
  value,
  onChange,
  bounds,
  step = 10,
  bucketCount = 28,
  currency = "MAD",
  subtitle = "Per day · MAD",
}: PriceRangeFilterProps) {
  const [min, max] = bounds;
  const span = Math.max(1, max - min);

  // Histogram buckets — last bucket is open-ended.
  const buckets = useMemo(() => {
    const counts = new Array(bucketCount).fill(0);
    for (const p of prices) {
      if (!p || p < min) continue;
      const idx = Math.min(
        bucketCount - 1,
        Math.floor(((p - min) / span) * bucketCount),
      );
      counts[idx] += 1;
    }
    return counts;
  }, [prices, bucketCount, min, span]);

  const maxCount = Math.max(1, ...buckets);
  // sqrt scaling so a single outlier doesn't flatten the chart
  const heights = buckets.map((c) =>
    c === 0 ? 0 : Math.max(0.12, Math.sqrt(c / maxCount)),
  );

  // Inputs (free typing, commit on blur/Enter)
  const [minInput, setMinInput] = useState(String(value[0]));
  const [maxInput, setMaxInput] = useState(String(value[1]));
  useEffect(() => setMinInput(String(value[0])), [value[0]]);
  useEffect(() => setMaxInput(String(value[1])), [value[1]]);

  const commit = (rawMin: string, rawMax: string) => {
    let mn = parseInt(rawMin, 10);
    let mx = parseInt(rawMax, 10);
    if (isNaN(mn)) mn = value[0];
    if (isNaN(mx)) mx = value[1];
    mn = Math.max(min, Math.min(max, Math.round(mn / step) * step));
    mx = Math.max(min, Math.min(max, Math.round(mx / step) * step));
    if (mn > mx) [mn, mx] = [mx, mn];
    onChange([mn, mx]);
  };

  const isMaxAtCap = value[1] >= max;
  const minPct = ((value[0] - min) / span) * 100;
  const maxPct = ((value[1] - min) / span) * 100;

  // Tooltip only while dragging
  const [dragging, setDragging] = useState<null | "min" | "max" | "both">(null);
  const stopDrag = () => setDragging(null);
  useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(null);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging]);

  const showMinTip = dragging === "min" || dragging === "both";
  const showMaxTip = dragging === "max" || dragging === "both";

  const formatMax = (v: number) =>
    `${v}${isMaxAtCap ? "+" : ""} ${currency}`;
  const formatMin = (v: number) => `${v} ${currency}`;

  return (
    <div className="space-y-5">
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}

      <div className="relative">
        {/* Histogram — subtle, no longer overlapping the slider */}
        <div className="flex h-12 items-end gap-px px-1">
          {heights.map((h, i) => {
            const bucketStart = min + (span * i) / bucketCount;
            const bucketEnd = min + (span * (i + 1)) / bucketCount;
            const inRange = bucketEnd > value[0] && bucketStart < value[1];
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-[1px] transition-colors",
                  // Empty buckets: nothing (no dotted-line illusion)
                  h === 0
                    ? "bg-transparent"
                    : inRange
                      ? "bg-primary/55"
                      : "bg-muted-foreground/20",
                )}
                style={{ height: h === 0 ? 0 : `${h * 100}%` }}
              />
            );
          })}
        </div>

        {/* Slider — true dual-thumb. Extra top padding leaves room for tooltips. */}
        <div className="relative px-1 pt-7 pb-1">
          {/* Tooltips above thumbs, only while dragging */}
          <div className="pointer-events-none absolute inset-x-1 top-0 h-6">
            {showMinTip && (
              <div
                className="absolute -top-0.5 whitespace-nowrap rounded bg-foreground text-background text-[10px] font-medium px-1.5 py-0.5 shadow-sm"
                style={{
                  left: `${minPct}%`,
                  transform:
                    minPct < 8
                      ? "translateX(0)"
                      : minPct > 92
                        ? "translateX(-100%)"
                        : "translateX(-50%)",
                }}
              >
                {formatMin(value[0])}
              </div>
            )}
            {showMaxTip && (
              <div
                className="absolute -top-0.5 whitespace-nowrap rounded bg-foreground text-background text-[10px] font-medium px-1.5 py-0.5 shadow-sm"
                style={{
                  left: `${maxPct}%`,
                  transform:
                    maxPct > 92
                      ? "translateX(-100%)"
                      : maxPct < 8
                        ? "translateX(0)"
                        : "translateX(-50%)",
                }}
              >
                {formatMax(value[1])}
              </div>
            )}
          </div>

          <SliderPrimitive.Root
            min={min}
            max={max}
            step={step}
            value={value}
            minStepsBetweenThumbs={1}
            onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
            className="relative flex w-full touch-none select-none items-center"
          >
            {/* Track: light gray base */}
            <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
              {/* Range: green only between the two handles */}
              <SliderPrimitive.Range className="absolute h-full bg-primary" />
            </SliderPrimitive.Track>

            {/* Two visible thumbs */}
            <SliderPrimitive.Thumb
              aria-label="Minimum price"
              onPointerDown={() => setDragging("min")}
              onKeyDown={() => setDragging("min")}
              onBlur={stopDrag}
              className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <SliderPrimitive.Thumb
              aria-label="Maximum price"
              onPointerDown={() => setDragging("max")}
              onKeyDown={() => setDragging("max")}
              onBlur={stopDrag}
              className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </SliderPrimitive.Root>
        </div>
      </div>

      {/* Min / Max inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">
            Minimum
          </span>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2">
            <input
              inputMode="numeric"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => commit(minInput, maxInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-full min-w-0 bg-transparent text-sm font-medium outline-none"
            />
            <span className="shrink-0 text-xs text-muted-foreground">{currency}</span>
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">
            Maximum
          </span>
          <div className="flex items-baseline gap-1.5 rounded-full border border-border bg-background px-3 py-2">
            <div className="flex flex-1 items-baseline min-w-0">
              <input
                inputMode="numeric"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value.replace(/[^\d]/g, ""))}
                onBlur={() => commit(minInput, maxInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-full min-w-0 bg-transparent text-sm font-medium outline-none"
              />
              {isMaxAtCap && (
                <span className="text-sm font-medium text-foreground leading-none">+</span>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{currency}</span>
          </div>
        </label>
      </div>
    </div>
  );
}
