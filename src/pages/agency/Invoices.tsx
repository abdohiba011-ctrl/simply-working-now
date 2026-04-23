import { useMemo, useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agencyInvoices } from "@/data/agencyFinanceMock";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Invoices = () => {
  const [year, setYear] = useState("all");
  const [quarter, setQuarter] = useState("all");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => agencyInvoices.filter((inv) => {
    const d = new Date(inv.date);
    if (year !== "all" && d.getFullYear() !== Number(year)) return false;
    if (quarter !== "all") {
      const q = Math.floor(d.getMonth() / 3) + 1;
      if (`Q${q}` !== quarter) return false;
    }
    if (type !== "all" && inv.type !== type) return false;
    return true;
  }), [year, quarter, type]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="mt-1 text-sm text-muted-foreground">All your VAT-compliant invoices in one place.</p>
          </div>
          <Button variant="outline" disabled={selected.size === 0} onClick={() => toast.success(`Bulk export ${selected.size} invoices`)} className="gap-2">
            <Download className="h-4 w-4" /> Bulk export ({selected.size})
          </Button>
        </div>

        <Card className="flex flex-wrap gap-3 p-4">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Quarter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All quarters</SelectItem>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="topup">Top-up</SelectItem>
              <SelectItem value="fees_summary">Fees summary</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={(v) => setSelected(v ? new Set(filtered.map((i) => i.id)) : new Set())} /></th>
                <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                <th className="px-4 py-3 text-right font-medium">VAT (20%)</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-3"><Checkbox checked={selected.has(inv.id)} onCheckedChange={() => toggle(inv.id)} /></td>
                  <td className="px-4 py-3 font-medium">{inv.number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(inv.date), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">{inv.type.replace("_", " ")}</span></td>
                  <td className="px-4 py-3">{inv.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inv.subtotal.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{inv.vat.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{inv.total.toFixed(2)} MAD</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" className="gap-1"><FileText className="h-3.5 w-3.5" /> PDF</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default Invoices;
