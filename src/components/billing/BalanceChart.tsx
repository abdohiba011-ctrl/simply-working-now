import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenterWalletTransaction } from "@/hooks/useRenterWallet";

type Range = "7d" | "30d" | "90d" | "all";

interface BalanceChartProps {
  transactions: RenterWalletTransaction[];
  currentBalance: number;
  currency: string;
}

const RANGE_DAYS: Record<Range, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

export function BalanceChart({ transactions, currentBalance, currency }: BalanceChartProps) {
  const [range, setRange] = useState<Range>("30d");

  const series = useMemo(() => {
    if (!transactions.length) return [];
    const ascending = [...transactions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const points = ascending.map((t) => ({
      ts: new Date(t.created_at).getTime(),
      balance: t.balance_after != null ? Number(t.balance_after) : 0,
    }));
    // Append current balance at "now" so the line reaches today
    points.push({ ts: Date.now(), balance: currentBalance });

    const days = RANGE_DAYS[range];
    if (days != null) {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const inRange = points.filter((p) => p.ts >= cutoff);
      // Prepend the last balance before cutoff so the line starts at the right level
      const before = points.filter((p) => p.ts < cutoff).slice(-1);
      return [...before.map((p) => ({ ...p, ts: cutoff })), ...inRange];
    }
    return points;
  }, [transactions, currentBalance, range]);

  const data = series.map((p) => ({
    date: new Date(p.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    balance: p.balance,
  }));

  const ranges: Range[] = ["7d", "30d", "90d", "all"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Balance over time</h3>
          <p className="text-xs text-muted-foreground">Tracks your credits as transactions happen.</p>
        </div>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => setRange(r)}
            >
              {r === "all" ? "All" : r.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center">
          <Wallet className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Top up to start tracking your balance</p>
        </div>
      ) : (
        <div className={cn("h-[180px] w-full md:h-[240px]")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value.toFixed(2)} ${currency}`, "Balance"]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#balanceFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
