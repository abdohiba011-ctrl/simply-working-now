import { format, parseISO } from "date-fns";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Receipt } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAgencyPayments } from "@/hooks/useAgencyData";

const Invoices = () => {
  const { payments, loading } = useAgencyPayments();
  const completed = payments.filter((p) => p.status === "paid");

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Invoices & receipts</h1>

        {loading ? (
          <Card><div className="py-16 text-center text-sm text-muted-foreground">Loading…</div></Card>
        ) : completed.length === 0 ? (
          <Card><EmptyState icon={Receipt} title="No invoices yet" description="Top-up receipts will appear here." /></Card>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="space-y-2 md:hidden">
              {completed.map((p) => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize text-foreground">
                        {p.purpose.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.paid_at ? format(parseISO(p.paid_at), "dd MMM yyyy") : format(parseISO(p.created_at), "dd MMM yyyy")}
                        {" · "}
                        <span className="font-mono">{p.id.slice(0, 8)}</span>
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {Number(p.amount).toLocaleString()} {p.currency}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop: table */}
            <Card className="hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completed.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.paid_at ? format(parseISO(p.paid_at), "dd MMM yyyy") : format(parseISO(p.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="capitalize">{p.purpose.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(p.amount).toLocaleString()} {p.currency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>
    </AgencyLayout>
  );
};

export default Invoices;
