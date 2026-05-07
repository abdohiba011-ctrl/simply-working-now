import { useMemo, useState, useEffect } from "react";
import Slider from "@mui/material/Slider";
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
  const heights = buckets.map((c) =>
    c === 0 ? 0 : Math.max(0.12, Math.sqrt(c / maxCount)),
  );

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

  const formatTip = (v: number) =>
    v >= max ? `${v}+ ${currency}` : `${v} ${currency}`;

  return (
    <div className="space-y-5">
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}

      <div className="relative">
        {/* MUI dual-thumb slider */}
        <div className="px-1 pt-2 pb-1 py-0">
          <Slider
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(_, v) => {
              const arr = v as number[];
              onChange([arr[0], arr[1]] as [number, number]);
            }}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => formatTip(v as number)}
            disableSwap
            getAriaLabel={(i) => (i === 0 ? "Minimum price" : "Maximum price")}
            sx={{
              color: "hsl(var(--primary))",
              height: 6,
              padding: "14px 0",
              "& .MuiSlider-rail": {
                opacity: 1,
                backgroundColor: "hsl(var(--muted))",
              },
              "& .MuiSlider-track": {
                border: "none",
                backgroundColor: "hsl(var(--primary))",
              },
              "& .MuiSlider-thumb": {
                height: 20,
                width: 20,
                backgroundColor: "hsl(var(--background))",
                border: "2px solid hsl(var(--primary))",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                "&:hover, &.Mui-focusVisible": {
                  boxShadow: "0 0 0 6px hsl(var(--primary) / 0.15)",
                },
                "&.Mui-active": {
                  boxShadow: "0 0 0 10px hsl(var(--primary) / 0.2)",
                },
              },
              "& .MuiSlider-valueLabel": {
                backgroundColor: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                fontSize: 11,
                fontWeight: 500,
                padding: "2px 6px",
                borderRadius: 4,
                top: -2,
                "&::before": { display: "none" },
              },
            }}
          />
        </div>
      </div>

      {/* Min / Max inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Minimum</span>
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
          <span className="mb-1 block text-xs text-muted-foreground">Maximum</span>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2">
            <input
              inputMode="numeric"
              value={isMaxAtCap ? `${maxInput}+` : maxInput}
              onChange={(e) =>
                setMaxInput(e.target.value.replace(/[^\d]/g, ""))
              }
              onBlur={() => commit(minInput, maxInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-full min-w-0 bg-transparent text-sm font-medium outline-none"
            />
            <span className="shrink-0 text-xs text-muted-foreground">{currency}</span>
          </div>
        </label>
      </div>
    </div>
  );
}
