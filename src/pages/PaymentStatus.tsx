import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Clock, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Generic payment status page.
 *
 * After the user completes (or cancels) the embedded YouCan Pay form we
 * land here. We poll our `youcanpay_payments` row for up to ~30s waiting
 * for the webhook to flip the status to `paid` / `failed`. This avoids the
 * common "I paid but the page hasn't updated" UX gap on sandbox & live.
 *
 * Query params:
 *   pid       — youcanpay_payments.id (required)
 *   next      — path to continue to on success
 *   retry     — path to retry payment on failure
 *   outcome   — optional hint from PayYouCan ("success" | "error")
 *   title     — heading copy
 */

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30_000;

type Phase = "processing" | "succeeded" | "failed" | "timeout";

export default function PaymentStatus() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const pid = params.get("pid") || "";
  const next = params.get("next") || "/";
  const retry = params.get("retry") || "/";
  const outcomeHint = params.get("outcome");
  const title = params.get("title") || "Payment";

  const [phase, setPhase] = useState<Phase>(
    outcomeHint === "error" ? "failed" : "processing",
  );
  const [elapsed, setElapsed] = useState(0);
  const [verifying, setVerifying] = useState(false);

  const supportMailto = `mailto:support@motonita.ma?subject=${encodeURIComponent(
    `Payment stuck — ${pid}`,
  )}&body=${encodeURIComponent(
    `Hi Motonita team,\n\nMy payment is stuck.\nPayment ID: ${pid}\n\nThanks.`,
  )}`;

  const handleVerifyNow = async () => {
    if (!pid || verifying) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "youcanpay-verify-payment",
        { body: { payment_id: pid } },
      );
      if (error) throw error;
      const status = (data as any)?.status;
      if (status === "paid") {
        toast.success("Payment confirmed");
        setPhase("succeeded");
      } else if (status === "failed") {
        toast.error("Payment did not go through");
        setPhase("failed");
      } else {
        toast.info("Still pending — try again in a moment");
        setElapsed(0);
        setPhase("processing");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not verify payment");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!pid) {
      setPhase("failed");
      return;
    }
    if (phase !== "processing") return;

    let cancelled = false;
    let timer: number | undefined;
    const start = Date.now();

    const tick = async () => {
      if (cancelled) return;
      const { data } = await supabase
        .from("youcanpay_payments")
        .select("status")
        .eq("id", pid)
        .maybeSingle();
      if (cancelled) return;

      const status = (data?.status || "").toLowerCase();
      if (status === "paid" || status === "succeeded" || status === "completed") {
        setPhase("succeeded");
        return;
      }
      if (status === "failed" || status === "cancelled" || status === "canceled") {
        setPhase("failed");
        return;
      }

      const e = Date.now() - start;
      setElapsed(e);
      if (e >= POLL_TIMEOUT_MS) {
        setPhase("timeout");
        return;
      }
      timer = window.setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
    // We intentionally re-run only when pid changes or phase transitions
    // back to "processing" (e.g. user clicked "Check again").
  }, [pid, phase]);

  // Auto-forward on success after a short beat so the user sees confirmation.
  useEffect(() => {
    if (phase === "succeeded") {
      const t = setTimeout(() => navigate(next, { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, next, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <Card className="border-2">
          <CardContent className="p-8 text-center space-y-5">
            {phase === "processing" && (
              <>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  Confirming your payment…
                </h1>
                <p className="text-sm text-muted-foreground">
                  We're waiting on confirmation from the payment provider. This
                  usually takes a few seconds.
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.ceil((POLL_TIMEOUT_MS - elapsed) / 1000)}s remaining
                </p>
              </>
            )}

            {phase === "succeeded" && (
              <>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {title} successful
                </h1>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to the next step…
                </p>
                <Button variant="hero" onClick={() => navigate(next, { replace: true })}>
                  Continue
                </Button>
              </>
            )}

            {phase === "failed" && (
              <>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
                  <XCircle className="h-7 w-7 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {title} failed
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your card was not charged. You can try again or use a
                  different payment method.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button variant="hero" onClick={() => navigate(retry)}>
                    Try again
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/">Back to home</Link>
                  </Button>
                </div>
              </>
            )}

            {phase === "timeout" && (
              <>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
                  <Clock className="h-7 w-7 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  Still processing
                </h1>
                <p className="text-sm text-muted-foreground">
                  The payment provider is taking longer than usual. If your
                  card was charged, click "Verify payment now" to check
                  directly with YouCan Pay.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    variant="hero"
                    onClick={handleVerifyNow}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      "Verify payment now"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setElapsed(0);
                      setPhase("processing");
                    }}
                    disabled={verifying}
                  >
                    Check again
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={supportMailto}>
                      <LifeBuoy className="h-4 w-4 mr-2" />
                      Contact support
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/">Back to home</Link>
                  </Button>
                </div>
                {pid && (
                  <p className="text-[10px] text-muted-foreground/70 pt-2 font-mono">
                    Ref: {pid}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
