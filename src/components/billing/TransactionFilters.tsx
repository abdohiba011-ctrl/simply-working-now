import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, Search, X } from "lucide-react";
import {
  type BillingFilterState,
  DEFAULT_FILTERS,
  activeFilterCount,
  type TxStatus,
  type TxType,
} from "@/lib/billingFilters";

interface TransactionFiltersProps {
  filters: BillingFilterState;
  onChange: (next: BillingFilterState) => void;
}

const TYPE_OPTIONS: { value: TxType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "topup", label: "Top-ups" },
  { value: "fee", label: "Fees" },
  { value: "refund", label: "Refunds" },
];

export function TransactionFilters({ filters, onChange }: TransactionFiltersProps) {
  const set = <K extends keyof BillingFilterState>(key: K, value: BillingFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const count = activeFilterCount(filters);
  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={filters.type === opt.value ? "default" : "outline"}
            onClick={() => set("type", opt.value)}
          >
            {opt.label}
          </Button>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {count}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[320px] space-y-3 p-4">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(v) => set("status", v as TxStatus)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  className="mt-1 h-9"
                  value={filters.from}
                  onChange={(e) => set("from", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  className="mt-1 h-9"
                  value={filters.to}
                  onChange={(e) => set("to", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Min amount (MAD)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="mt-1 h-9"
                  value={filters.min}
                  onChange={(e) => set("min", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Max amount (MAD)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="mt-1 h-9"
                  value={filters.max}
                  onChange={(e) => set("max", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between pt-1">
              <Button size="sm" variant="ghost" onClick={reset} disabled={count === 0}>
                <X className="mr-1 h-3.5 w-3.5" /> Clear all
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search description or reference…"
            className="pl-8"
          />
        </div>
      </div>

      {count > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Active filters:</span>
          {filters.status !== "all" && (
            <Badge variant="outline">Status: {filters.status}</Badge>
          )}
          {filters.from && <Badge variant="outline">From: {filters.from}</Badge>}
          {filters.to && <Badge variant="outline">To: {filters.to}</Badge>}
          {filters.min && <Badge variant="outline">Min: {filters.min}</Badge>}
          {filters.max && <Badge variant="outline">Max: {filters.max}</Badge>}
          {filters.q && <Badge variant="outline">Search: "{filters.q}"</Badge>}
        </div>
      )}
    </div>
  );
}
