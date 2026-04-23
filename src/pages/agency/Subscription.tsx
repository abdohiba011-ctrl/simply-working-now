import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Download, Sparkles } from "lucide-react";
import { agencyInvoices } from "@/data/agencyFinanceMock";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Plan {
  key: "free" | "pro" | "business";
  name: string;
  monthly: number;
  yearly: number;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  { key: "free", name: "Free", monthly: 0, yearly: 0, features: ["Up to 3 bikes", "Basic dashboard", "Verified badge", "50 MAD per confirmed booking"] },
  { key: "pro", name: "Pro", monthly: 99, yearly: 950, popular: true, features: ["Unlimited bikes", "Full analytics", "Featured placement", "Priority support", "50 MAD per confirmed booking"] },
  { key: "business", name: "Business", monthly: 299, yearly: 2870, features: ["Everything in Pro", "Multi-location", "API access", "Dedicated manager", "Custom listing branding", "50 MAD per confirmed booking"] },
];

const Subscription = () => {
  const agency = useAgencyStore();
  const [yearly, setYearly] = useState(false);
  const current = agency.plan;

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a plan that fits your fleet size and growth.</p>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-transparent p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-2xl font-bold capitalize">{current}</h2>
                {current !== "free" && <Badge>Active</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {current === "free" ? "No billing cycle" : `Renews on ${format(addDays(new Date(), 18), "dd MMM yyyy")}`}
              </p>
            </div>
            <Button variant="outline">Manage plan</Button>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-3">
          <span className={cn("text-sm", !yearly && "font-semibold")}>Monthly</span>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <span className={cn("text-sm", yearly && "font-semibold")}>Yearly</span>
          <Badge variant="secondary" className="bg-success/15 text-success">Save 20%</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const price = yearly ? Math.round(p.yearly / 12) : p.monthly;
            const isCurrent = p.key === current;
            return (
              <Card key={p.key} className={cn("relative flex flex-col p-6", p.popular && "border-primary shadow-lg")}>
                {p.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2"><Sparkles className="mr-1 h-3 w-3" /> Popular</Badge>}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">MAD/month</span>
                  {yearly && p.yearly > 0 && <p className="text-xs text-muted-foreground">Billed {p.yearly} MAD/year</p>}
                </div>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => { agency.setAgency({ plan: p.key }); toast.success(`Switched to ${p.name}`); }}
                >
                  {isCurrent ? "Current plan" : p.key === "free" ? "Downgrade" : "Upgrade"}
                </Button>
              </Card>
            );
          })}
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Billing history</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Invoice</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {agencyInvoices.filter((i) => i.type === "subscription").map((inv) => (
                <tr key={inv.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{inv.number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(inv.date), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">{inv.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inv.total.toFixed(2)} MAD</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" className="gap-1"><Download className="h-3.5 w-3.5" /> PDF</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default Subscription;
