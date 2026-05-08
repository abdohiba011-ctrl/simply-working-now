import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Loader2,
  Banknote,
  Copy,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * CashPlus voucher / waiting page.
 *
 * Unlike a card payment (which confirms in seconds), a CashPlus voucher can
 * sit unpaid for hours or days while the renter walks to a CashPlus agent.
 * This page is built for that:
 *   - Big, copyable voucher reference.
 *   - "Awaiting payment" status, not a panicky countdown.
 *   - Background poll every 10s + manual "I've paid — verify now".
 *   - Safe to leave; the row stays in the DB and the webhook flips status to
 *     `paid` whenever CashPlus reports the cash was received.
 *
 * Query params (same shape as PaymentStatus):
 *   pid              — youcanpay_payments.id (required)
 *   transaction_id   — YouCan transaction id when known
 *   next             — path to continue to on success (e.g. /confirmation?…)
 *   retry            — path to retry on failure
 *   outcome          — "success" | "error" hint from PayYouCan
 *   title            — page heading
 */

const POLL_INTERVAL_MS = 10_000;
const PAYMENT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes to pay at CashPlus

type Phase = "awaiting" | "paid" | "failed" | "expired";

export default function PaymentCashPlus() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const pid = params.get("pid") || "";
  const next = params.get("next") || "/";
  const retry = params.get("retry") || "/";
  const outcomeHint = params.get("outcome");
  const transactionId = params.get("transaction_id") || "";
  const title = params.get("title") || "CashPlus voucher";

  const [phase, setPhase] = useState<Phase>(
    outcomeHint === "error" ? "failed" : "awaiting",
  );
  const [verifying, setVerifying] = useState(false);
  const [payment, setPayment] = useState<{
    amount: number | null;
    currency: string;
    transaction_id: string | null;
    status: string | null;
    created_at: string | null;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const deadlineMs = useMemo(() => {
    const startIso = payment?.created_at;
    const start = startIso ? new Date(startIso).getTime() : Date.now();
    return start + PAYMENT_WINDOW_MS;
  }, [payment?.created_at]);

  const remainingMs = Math.max(0, deadlineMs - now);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  const voucherRef = useMemo(
    () => payment?.transaction_id || transactionId || pid,
    [payment, transactionId, pid],
  );

  const handleVerifyNow = async () => {
    if (!pid || verifying) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "youcanpay-verify-payment",
        { body: { payment_id: pid, transaction_id: transactionId || undefined } },
      );
      if (error) throw error;
      const status = (data as any)?.status;
      if (status === "paid") {
        toast.success("CashPlus payment confirmed!");
        setPhase("paid");
      } else if (status === "failed") {
        toast.error("Voucher was cancelled or refused");
        setPhase("failed");
      } else {
        toast.info("Still waiting for CashPlus to confirm your cash payment");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not verify with CashPlus");
    } finally {
      setVerifying(false);
    }
  };

  // Background poll. Stays running as long as the user keeps the tab open;
  // the webhook will flip status to `paid` whenever CashPlus reports it.
  useEffect(() => {
    if (!pid) {
      setPhase("failed");
      return;
    }
    if (phase !== "awaiting") return;

    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      if (cancelled) return;
      const { data } = await supabase
        .from("youcanpay_payments")
        .select("status, transaction_id, amount, currency, created_at")
        .eq("id", pid)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPayment({
          amount: data.amount as number | null,
          currency: (data.currency as string) || "MAD",
          transaction_id: (data.transaction_id as string) || null,
          status: (data.status as string) || null,
          created_at: (data.created_at as string) || null,
        });
      }
      const status = (data?.status || "").toLowerCase();
      if (status === "paid" || status === "succeeded" || status === "completed") {
        setPhase("paid");
        return;
      }
      if (status === "failed" || status === "cancelled" || status === "canceled") {
        setPhase("failed");
        return;
      }
      timer = window.setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [pid, phase]);

  // 1-second tick to drive the countdown + auto-expire after 10 minutes.
  useEffect(() => {
    if (phase !== "awaiting") return;
    const i = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(i);
  }, [phase]);

  useEffect(() => {
    if (phase === "awaiting" && remainingMs <= 0 && payment?.created_at) {
      setPhase("expired");
    }
  }, [phase, remainingMs, payment?.created_at]);

  // Auto-forward shortly after the cash is received.
  useEffect(() => {
    if (phase === "paid") {
      const t = setTimeout(() => navigate(next, { replace: true }), 1500);
      return () => clearTimeout(t);
    }
  }, [phase, next, navigate]);

  const copyVoucher = async () => {
    if (!voucherRef) return;
    try {
      await navigator.clipboard.writeText(voucherRef);
      toast.success("Voucher code copied");
    } catch {
      toast.error("Could not copy. Long-press the code to copy manually.");
    }
  };

  const isAgencyContext = (next || "").startsWith("/agency");
  const amountLabel = payment?.amount
    ? `${payment.amount} ${payment.currency || "MAD"}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {!isAgencyContext && <Header />}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="outline"
          size="sm"
          className="mb-6"
          onClick={() => navigate("/bookings")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          My bookings
        </Button>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {title}
        </h1>

        {phase === "awaiting" && (
          <p className="text-muted-foreground mb-6">
            Take this voucher to any{" "}
            <span className="font-semibold text-foreground">CashPlus</span>{" "}
            agent in Morocco{amountLabel ? ` and pay ${amountLabel}` : ""} in
            cash. We'll confirm your booking the moment they receive it.
          </p>
        )}

        <Card className="border-2 border-primary/30">
          <CardContent className="p-6 space-y-5">
            {phase === "awaiting" && (
              <>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/15">
                    <Banknote className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Status
                    </p>
                    <p className="text-base font-semibold text-foreground flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      Awaiting cash payment at CashPlus
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-5 text-center space-y-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Voucher reference
                  </p>
                  <p
                    className="font-mono text-lg sm:text-xl font-bold text-foreground break-all select-all"
                    aria-label="Voucher code"
                  >
                    {voucherRef}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyVoucher}
                    >
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy code
                    </Button>
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a
                        href="https://www.cashplus.ma/fr/agences"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Find a CashPlus agent
                      </a>
                    </Button>
                  </div>
                </div>

                <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
                  <li>Visit any CashPlus agent (over 2,200 across Morocco).</li>
                  <li>
                    Show the voucher code above and pay{" "}
                    <span className="font-semibold text-foreground">
                      {amountLabel || "the amount due"}
                    </span>{" "}
                    in cash.
                  </li>
                  <li>
                    Come back here — your booking confirms automatically once
                    CashPlus reports the payment.
                  </li>
                </ol>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={handleVerifyNow}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        I've paid — verify now
                      </>
                    )}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/bookings">Save for later</Link>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  It's safe to close this page. Your booking is held while we
                  wait for CashPlus, and you'll find the voucher again under{" "}
                  <Link to="/bookings" className="underline underline-offset-2">
                    My bookings
                  </Link>
                  .
                </p>
              </>
            )}

            {phase === "paid" && (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  CashPlus payment confirmed
                </h2>
                <p className="text-sm text-muted-foreground">
                  Thanks! We're sending you to your booking…
                </p>
                <Button
                  variant="hero"
                  onClick={() => navigate(next, { replace: true })}
                >
                  Continue
                </Button>
              </div>
            )}

            {phase === "failed" && (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
                  <XCircle className="h-7 w-7 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Voucher couldn't be created
                </h2>
                <p className="text-sm text-muted-foreground">
                  No cash was taken from you. You can try again or pay by card
                  instead.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button variant="hero" onClick={() => navigate(retry)}>
                    Try again
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/">Back to home</Link>
                  </Button>
                </div>
              </div>
            )}

            {pid && (
              <p className="text-[10px] text-muted-foreground/70 text-center font-mono pt-2 border-t border-border/50">
                Ref: {pid}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
