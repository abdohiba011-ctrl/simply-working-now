import { useMemo, useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { agencyTransactions, AgencyTransaction } from "@/data/agencyFinanceMock";
import { ChevronDown, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Transactions = () => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("all");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [active, setActive] = useState<AgencyTransaction | null>(null);

  const filtered = useMemo(() => agencyTransactions.filter((t) => {
    if (type !== "all" && t.type !== type) return false;
    if (method !== "all" && t.method !== method) return false;
    if (status !== "all" && t.status !== status) return false;
    if (min && Math.abs(t.amount) < Number(min)) return false;
    if (max && Math.abs(t.amount) > Number(max)) return false;
    return true;
  }), [type, method, status, min, max]);

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="mt-1 text-sm text-muted-foreground">Full financial ledger across wallet, bookings, subscriptions and more.</p>
          </div>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
        </div>

        <Card className="p-4">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between text-left">
                <span className="text-sm font-medium">Advanced filters</span>
                <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div><Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="topup">Top-up</SelectItem>
                    <SelectItem value="booking_fee">Booking fee</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="youcanpay">YouCan Pay</SelectItem>
                    <SelectItem value="cashplus">Cash Plus</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Min amount</Label><Input type="number" value={min} onChange={(e) => setMin(e.target.value)} /></div>
              <div><Label className="text-xs">Max amount</Label><Input type="number" value={max} onChange={(e) => setMax(e.target.value)} /></div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="overflow-hidden">
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Method</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} onClick={() => setActive(tx)} className="cursor-pointer border-b border-border/60 hover:bg-muted/40">
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(tx.date), "dd MMM yyyy")}</td>
                    <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">{tx.type.replace("_", " ")}</span></td>
                    <td className="px-4 py-3">{tx.description}</td>
                    <td className={cn("px-4 py-3 text-right font-medium tabular-nums", tx.amount >= 0 ? "text-success" : "text-destructive")}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount} MAD
                    </td>
                    <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{tx.method}</td>
                    <td className="px-4 py-3"><Badge variant={tx.status === "completed" ? "secondary" : tx.status === "pending" ? "outline" : "destructive"} className="capitalize">{tx.status}</Badge></td>
                    <td className="px-4 py-3 text-right">{tx.invoiceId ? <span className="text-xs text-primary">{tx.invoiceId}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-[400px]">
          <SheetHeader><SheetTitle>Transaction details</SheetTitle></SheetHeader>
          {active && (
            <div className="mt-6 space-y-4 text-sm">
              <Row label="ID" value={active.id} />
              <Row label="Date" value={format(new Date(active.date), "dd MMM yyyy, HH:mm")} />
              <Row label="Type" value={active.type.replace("_", " ")} />
              <Row label="Description" value={active.description} />
              <Row label="Amount" value={`${active.amount >= 0 ? "+" : ""}${active.amount} MAD`} />
              <Row label="Method" value={active.method} />
              <Row label="Status" value={active.status} />
              <Row label="Running balance" value={`${active.runningBalance} MAD`} />
              {active.invoiceId && <Row label="Invoice" value={active.invoiceId} />}
              <Button className="w-full gap-2" variant="outline"><FileText className="h-4 w-4" /> Download invoice PDF</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AgencyLayout>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium capitalize">{value}</span>
  </div>
);

export default Transactions;
