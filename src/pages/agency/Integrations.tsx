import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { Calendar, MessageSquare, FileSpreadsheet, Webhook, Zap, Lock, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Integration {
  key: string;
  name: string;
  description: string;
  icon: typeof Calendar;
  requires: "free" | "pro" | "business";
  connected?: boolean;
  hasApiKey?: boolean;
}

const list: Integration[] = [
  { key: "gcal", name: "Google Calendar sync", description: "Mirror your bookings into a Google Calendar.", icon: Calendar, requires: "pro" },
  { key: "wa", name: "WhatsApp Business API", description: "Send booking updates via official WhatsApp Business.", icon: MessageSquare, requires: "business" },
  { key: "qb", name: "QuickBooks", description: "Export invoices to QuickBooks Online.", icon: FileSpreadsheet, requires: "business" },
  { key: "xero", name: "Xero", description: "Push transactions to Xero accounting.", icon: FileSpreadsheet, requires: "business" },
  { key: "wave", name: "Wave Accounting", description: "Sync transactions with Wave.", icon: FileSpreadsheet, requires: "business" },
  { key: "api", name: "Webhooks & API", description: "Build custom integrations with our REST API.", icon: Webhook, requires: "business", hasApiKey: true },
  { key: "zapier", name: "Zapier", description: "Connect Motonita to 5000+ apps via Zapier.", icon: Zap, requires: "pro" },
];

const tierOk = (cur: string, req: string) => {
  const order = { free: 0, pro: 1, business: 2 } as const;
  return order[cur as keyof typeof order] >= order[req as keyof typeof order];
};

const Integrations = () => {
  const plan = useAgencyStore((s) => s.plan);

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Connect Motonita to the tools you already use.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {list.map((it) => {
            const allowed = tierOk(plan, it.requires);
            const Icon = it.icon;
            return (
              <Card key={it.key} className={cn("p-5", !allowed && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{it.name}</h3>
                      {!allowed && <Badge variant="outline" className="capitalize">{it.requires}+</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {it.hasApiKey && allowed ? (
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText("mk_live_xxxxxxxxxxxx"); toast.success("API key copied"); }} className="gap-2">
                      <Copy className="h-3.5 w-3.5" /> Generate API key
                    </Button>
                  ) : allowed ? (
                    <Button size="sm" onClick={() => toast.success(`${it.name} connected`)}>Connect</Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="gap-2"><Lock className="h-3.5 w-3.5" /> Upgrade required</Button>
                  )}
                  {it.hasApiKey && allowed && <a href="#" className="text-xs text-primary hover:underline">Read docs →</a>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AgencyLayout>
  );
};

export default Integrations;
