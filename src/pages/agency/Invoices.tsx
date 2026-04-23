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
        <Card className="overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : completed.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices yet" description="Paid subscription invoices and top-up receipts will appear here." />
          ) : (
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
          )}
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default Invoices;
