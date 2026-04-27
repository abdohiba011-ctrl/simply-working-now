import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface StuckPayment {
  id: string;
  purpose: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  user_id: string | null;
  customer_email: string | null;
}

/**
 * Admin recovery widget — lists YouCan Pay payments still in `pending` more
 * than 10 minutes after creation. Lets an admin force-verify them against
 * YouCan's API (same idempotent edge function the user-facing page uses).
 */
export const StuckPaymentsCard = () => {
  const [payments, setPayments] = useState<StuckPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data, error } = await supabase
      .from("youcanpay_payments")
      .select("id,purpose,amount,currency,status,created_at,user_id,customer_email")
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Load stuck payments error", error);
      toast.error("Could not load stuck payments");
    }
    setPayments((data as StuckPayment[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const { data, error } = await supabase.functions.invoke(
        "youcanpay-verify-payment",
        { body: { payment_id: id } },
      );
      if (error) throw error;
      const status = (data as any)?.status;
      if (status === "paid") {
        toast.success("Payment confirmed and credited");
      } else if (status === "failed") {
        toast.error("Payment was not successful at the provider");
      } else {
        toast.info("Provider still reports pending");
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Stuck Payments
              {payments.length > 0 && (
                <Badge variant="secondary">{payments.length}</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              YouCan Pay payments still pending after 10 minutes. Verify
              against the provider to credit or fail them.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading…
          </div>
        ) : payments.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            No stuck payments. All clear.
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">
                      {p.amount} {p.currency}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {p.purpose.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {p.customer_email || p.user_id || "—"} ·{" "}
                    {format(new Date(p.created_at), "MMM d, HH:mm")}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate">
                    {p.id}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerify(p.id)}
                  disabled={verifyingId === p.id}
                >
                  {verifyingId === p.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Verifying
                    </>
                  ) : (
                    "Verify now"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
