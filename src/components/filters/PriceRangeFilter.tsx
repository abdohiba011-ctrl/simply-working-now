import { useState, useEffect } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

interface PriceRangeFilterProps {
  prices?: number[];
  value: [number, number];
  onChange: (v: [number, number]) => void;
  bounds: [number, number];
  step?: number;
  bucketCount?: number;
  currency?: string;
  subtitle?: string;
}

export function PriceRangeFilter({
  value,
  onChange,
  bounds,
  step = 10,
  currency = "MAD",
  subtitle = "Per day · MAD",
}: PriceRangeFilterProps) {
  const [min, max] = bounds;

  const [minInput, setMinInput] = useState(String(value[0]));
  const [maxInput, setMaxInput] = useState(String(value[1]));
  useEffect(() => setMinInput(String(value[0])), [value]);
  useEffect(() => setMaxInput(String(value[1])), [value]);

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

  return (
    <div className="space-y-5">
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}

      <div className="px-1 pt-2 pb-1">
        <SliderPrimitive.Root
          className="relative flex w-full touch-none select-none items-center"
          value={value}
          min={min}
          max={max}
          step={step}
          minStepsBetweenThumbs={1}
          onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label="Minimum price"
            className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          />
          <SliderPrimitive.Thumb
            aria-label="Maximum price"
            className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          />
        </SliderPrimitive.Root>
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
