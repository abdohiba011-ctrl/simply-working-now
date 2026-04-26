import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const stopRef = useRef(false);

  useEffect(() => {
    if (!pid) {
      setPhase("failed");
      return;
    }
    if (phase !== "processing") return;

    stopRef.current = false;
    const start = Date.now();

    const tick = async () => {
      if (stopRef.current) return;
      const { data } = await supabase
        .from("youcanpay_payments")
        .select("status")
        .eq("id", pid)
        .maybeSingle();

      const status = (data?.status || "").toLowerCase();
      if (status === "paid" || status === "succeeded" || status === "completed") {
        stopRef.current = true;
        setPhase("succeeded");
        return;
      }
      if (status === "failed" || status === "cancelled" || status === "canceled") {
        stopRef.current = true;
        setPhase("failed");
        return;
      }

      const e = Date.now() - start;
      setElapsed(e);
      if (e >= POLL_TIMEOUT_MS) {
        stopRef.current = true;
        setPhase("timeout");
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      stopRef.current = true;
    };
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
                  card was charged, the page will update automatically once we
                  receive confirmation. You can safely refresh later.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    variant="hero"
                    onClick={() => {
                      setElapsed(0);
                      setPhase("processing");
                    }}
                  >
                    Check again
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/">Back to home</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
