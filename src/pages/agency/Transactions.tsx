import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { Receipt, Search } from "lucide-react";
import { useAgencyWalletTransactions } from "@/hooks/useAgencyData";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "topup", "fee", "refund", "withdrawal"];

const Transactions = () => {
  const { transactions, loading } = useAgencyWalletTransactions(200);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let r = transactions;
    if (filter !== "all") r = r.filter((t) => t.type === filter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((t) =>
        (t.description || "").toLowerCase().includes(q) ||
        (t.reference || "").toLowerCase().includes(q),
      );
    }
    return r;
  }, [transactions, filter, search]);

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
              {f}
            </Button>
          ))}
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions" description="Your wallet activity will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance after</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const positive = Number(t.amount) > 0;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(parseISO(t.created_at), "dd MMM yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="capitalize">{t.type}</TableCell>
                      <TableCell>{t.description || t.reference || "—"}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-medium", positive ? "text-success" : "text-destructive")}>
                        {positive ? "+" : ""}{Number(t.amount).toLocaleString()} {t.currency}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {t.balance_after !== null ? `${Number(t.balance_after).toLocaleString()} ${t.currency}` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default Transactions;
