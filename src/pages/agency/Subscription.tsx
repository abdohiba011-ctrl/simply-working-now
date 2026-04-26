import { useEffect, useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgencySubscription } from "@/hooks/useAgencyData";
import { buildYouCanPayUrl } from "@/lib/openHostedPayment";
import { useNavigate } from "react-router-dom";

interface Plan {
  key: "free" | "pro" | "business";
  name: string;
  monthly: number;
  yearly: number;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  { key: "free", name: "Free", monthly: 0, yearly: 0, features: ["Up to 3 motorbikes", "Basic dashboard", "Verified badge"] },
  { key: "pro", name: "Pro", monthly: 99, yearly: 950, popular: true, features: ["Unlimited motorbikes", "Full analytics", "Featured placement", "Priority support"] },
  { key: "business", name: "Business", monthly: 299, yearly: 2870, features: ["Everything in Pro", "Multi-location", "API access", "Dedicated manager"] },
];

const Subscription = () => {
  const { subscription, loading, refresh } = useAgencySubscription();
  const [yearly, setYearly] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const current = subscription?.plan || "free";

  // Auto-refresh after returning from a successful YouCan Pay redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("yc") === "success") {
      toast.success("Payment received — updating your plan…");
      refresh();
      const hash = window.location.hash;
      window.history.replaceState({}, "", window.location.pathname + hash);
      let n = 0;
      const t = setInterval(() => {
        n++;
        refresh();
        if (n >= 5) clearInterval(t);
      }, 3000);
      return () => clearInterval(t);
    }
    if (params.get("yc") === "error") {
      toast.error("Payment was not completed.");
      const hash = window.location.hash;
      window.history.replaceState({}, "", window.location.pathname + hash);
    }
  }, [refresh]);

  const handleSelect = async (plan: Plan) => {
    if (plan.key === current) return;
    if (plan.key === "free") {
      // Downgrade goes through a security-definer RPC that blocks
      // locked / past_due users from escaping their billing state.
      try {
        const { error } = await supabase.rpc("request_plan_downgrade");
        if (error) throw error;
        toast.success("Switched to Free plan");
        refresh();
      } catch (e: any) {
        const msg = e.message || "";
        if (msg.includes("CANNOT_DOWNGRADE_FROM_")) {
          toast.error("Your account is past due or locked — pay the outstanding amount first.");
        } else {
          toast.error(msg || "Failed");
        }
      }
      return;
    }
    setProcessing(plan.key);
    const preOpened = preOpenPaymentWindow();
    try {
      const amount = yearly ? plan.yearly : plan.monthly;
      const { data, error } = await supabase.functions.invoke("youcanpay-create-token", {
        body: {
          purpose: "subscription",
          amount,
          currency: "MAD",
          plan: plan.key,
          yearly,
          success_path: "/agency/finance?yc=success#subscription",
          error_path: "/agency/finance?yc=error#subscription",
        },
      });
      if (error) throw error;
      if (data?.payment_url) {
        const result = openHostedPayment(data.payment_url, preOpened);
        if (!result.ok) {
          toast.error("Your browser blocked the payment window. Please allow popups.");
        } else if (result.method === "new-tab" || result.method === "pre-opened") {
          toast.success("Payment opened in a new tab.");
        }
        return;
      }
      if (preOpened && !preOpened.closed) preOpened.close();
      toast.error("Could not initialize payment");
    } catch (e: any) {
      if (preOpened && !preOpened.closed) preOpened.close();
      toast.error(e.message || "Failed");
    } finally {
      setProcessing(null);
    }
  };

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
                <h2 className="text-2xl font-bold capitalize">{loading ? "…" : current}</h2>
                {current !== "free" && <Badge>Active</Badge>}
              </div>
              {subscription?.current_period_end && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Renews on {format(new Date(subscription.current_period_end), "dd MMM yyyy")}
                </p>
              )}
            </div>
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
                  disabled={isCurrent || processing === p.key}
                  onClick={() => handleSelect(p)}
                >
                  {isCurrent ? "Current plan" : processing === p.key ? "Redirecting…" : p.key === "free" ? "Downgrade" : "Upgrade"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </AgencyLayout>
  );
};

export default Subscription;
