import { useMemo, useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
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

  // Build histogram buckets. The last bucket is open-ended (>= last edge).
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

  // sqrt scaling so outliers don't flatten the chart
  const heights = buckets.map((c) =>
    c === 0 ? 0.06 : Math.max(0.08, Math.sqrt(c / maxCount)),
  );

  // Inputs (allow free typing, commit on blur/Enter)
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

  const formatVal = (v: number, isMax: boolean) =>
    `${v}${isMax && isMaxAtCap ? "+" : ""} ${currency}`;

  return (
    <div className="space-y-4">
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}

      <div className="relative pt-2">
        {/* Histogram */}
        <div className="flex h-14 items-end gap-px px-1">
          {heights.map((h, i) => {
            const bucketStart = min + (span * i) / bucketCount;
            const bucketEnd = min + (span * (i + 1)) / bucketCount;
            const inRange = bucketEnd > value[0] && bucketStart < value[1];
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-sm transition-colors",
                  inRange ? "bg-primary" : "bg-muted",
                )}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>

        {/* Slider sits just below the histogram */}
        <div className="relative px-1 pt-6">
          {/* Floating handle labels — make it visually obvious there are TWO handles */}
          <div className="pointer-events-none absolute inset-x-1 -top-1 h-6">
            <div
              className="absolute whitespace-nowrap rounded-md bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5 shadow-sm"
              style={{
                left: `${minPct}%`,
                // Pin to left edge near 0%, center otherwise
                transform: minPct < 15 ? "translateX(0)" : "translateX(-50%)",
              }}
            >
              Min · {formatVal(value[0], false)}
            </div>
            <div
              className="absolute whitespace-nowrap rounded-md bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5 shadow-sm"
              style={{
                left: `${maxPct}%`,
                // Pin to right edge near 100%, center otherwise
                transform: maxPct > 85 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              Max · {formatVal(value[1], true)}
            </div>
          </div>
          <Slider
            min={min}
            max={max}
            step={step}
            value={value}
            onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
          />
        </div>
      </div>

      {/* Min / Max inputs */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">
            Minimum
          </span>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <input
              inputMode="numeric"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => commit(minInput, maxInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-full bg-transparent text-sm font-medium outline-none"
            />
            <span className="text-xs text-muted-foreground">{currency}</span>
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">
            Maximum
          </span>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <input
              inputMode="numeric"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => commit(minInput, maxInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-full bg-transparent text-sm font-medium outline-none"
            />
            <span className="text-xs text-muted-foreground">
              {isMaxAtCap ? `+ ${currency}` : currency}
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}
