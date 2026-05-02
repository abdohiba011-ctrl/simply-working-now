import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Lock, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

/**
 * Embedded YouCan Pay checkout.
 *
 * YouCan Pay does NOT expose a hosted-redirect URL on its public API.
 * The official integration is to load `ycpay.js`, mount the credit-card
 * form into a div, and call `ycPay.pay(tokenId)` from a button click.
 *
 * Query params:
 *   token       — token_id from youcanpay-create-token
 *   pubKey      — public key (sandbox: pub_sandbox_xxx)
 *   pid         — our internal payment id
 *   amount      — display only
 *   currency    — display only
 *   sandbox     — "1" to use sandbox mode
 *   success     — path to navigate to on success (relative)
 *   error       — path to navigate to on error (relative)
 *   title       — heading shown above the form
 */

declare global {
  interface Window {
    YCPay?: any;
  }
}

const SCRIPT_SRC = "https://youcanpay.com/js/ycpay.js";

function loadYcPayScript(): Promise<void> {
  if (window.YCPay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load YouCan Pay script")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load YouCan Pay script"));
    document.head.appendChild(s);
  });
}

export default function PayYouCan() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token") || "";
  const pubKey = params.get("pubKey") || "";
  const pid = params.get("pid") || "";
  const amount = params.get("amount") || "";
  const currency = params.get("currency") || "MAD";
  const isSandbox = params.get("sandbox") === "1";
  const successPath = params.get("success") || "/";
  const errorPath = params.get("error") || "/";
  const title = params.get("title") || "Complete payment";

  const [status, setStatus] = useState<"loading" | "ready" | "paying" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ycRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !pubKey) {
        setStatus("error");
        setErrorMsg("Missing payment token. Please try again.");
        return;
      }
      try {
        await loadYcPayScript();
        if (cancelled) return;
        const yc = new window.YCPay(pubKey, {
          formContainer: "#ycpay-form",
          errorContainer: "#ycpay-error",
          locale: "en",
          isSandbox,
          token,
        });
        // Render both card and CashPlus when available; renderAvailableGateways
        // falls back gracefully if only one gateway is enabled on the account.
        try {
          yc.renderAvailableGateways([], "default");
        } catch {
          yc.renderCreditCardForm("default");
        }
        ycRef.current = yc;
        setStatus("ready");
      } catch (e: any) {
        console.error("YouCan Pay init failed", e);
        setStatus("error");
        setErrorMsg(e?.message || "Could not load the payment form.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, pubKey, isSandbox]);

  const buildStatusUrl = (outcome: "success" | "error", transactionId?: string) => {
    const qs = new URLSearchParams({
      pid,
      next: successPath,
      retry: errorPath,
      outcome,
      title,
    });
    if (transactionId) qs.set("transaction_id", transactionId);
    return `/payment-status?${qs.toString()}`;
  };

  const handlePay = () => {
    const yc = ycRef.current;
    if (!yc) return;
    setStatus("paying");
    yc.pay(token)
      .then((response: any) => {
        toast.success("Payment submitted");
        const transactionId = getYouCanTransactionId(response);
        // Don't trust the client outcome — let PaymentStatus poll the webhook.
        navigate(buildStatusUrl("success", transactionId), { replace: true });
      })
      .catch((err: any) => {
        console.error("YouCan Pay error", err);
        const message =
          typeof err === "string"
            ? err
            : err?.message || "Payment failed. Please try again.";
        toast.error(message);
        navigate(buildStatusUrl("error"), { replace: true });
      });
  };

  // Hide the renter Header when this payment was initiated from the agency
  // dashboard (success path lives under /agency/...). This keeps agencies
  // visually inside the agency context during top-up.
  const isAgencyContext = (successPath || "").startsWith("/agency");

  return (
    <div className="min-h-screen bg-background">
      {!isAgencyContext && <Header />}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="outline"
          size="sm"
          className="mb-6"
          onClick={() => navigate(appendPid(errorPath, pid), { replace: true })}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {title}
        </h1>
        {amount && (
          <p className="text-muted-foreground mb-6">
            Amount due:{" "}
            <span className="font-semibold text-foreground">
              {amount} {currency}
            </span>
            {isSandbox && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
                Test mode
              </span>
            )}
          </p>
        )}

        <Card className="border-2 border-primary/30">
          <CardContent className="p-6 space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                <span>
                  Card details are entered directly into YouCan Pay's secure
                  form — Motonita never sees them.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                <span>
                  Payments are processed via 3D Secure where required.
                </span>
              </li>
            </ul>

            <div id="ycpay-error" className="text-sm text-destructive" />
            <div
              id="ycpay-form"
              className="min-h-[220px] rounded-lg border border-border p-3 bg-muted/30"
            />

            {status === "loading" && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payment form…
              </div>
            )}

            {status === "error" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              disabled={status !== "ready"}
              onClick={handlePay}
            >
              {status === "paying" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing…
                </>
              ) : (
                <>Pay {amount ? `${amount} ${currency}` : ""}</>
              )}
            </Button>

            {isSandbox && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium">
                  Sandbox test cards
                </summary>
                <div className="mt-2 space-y-1 font-mono">
                  <div>4242 4242 4242 4242 — CVV 112 — 10/24 — Success</div>
                  <div>4000 0000 0000 3220 — CVV 112 — 10/24 — 3DS success</div>
                  <div>4000 0084 0000 1629 — CVV 112 — 10/24 — Rejected</div>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function appendPid(path: string, pid: string): string {
  if (!pid) return path;
  if (path.includes("pid=")) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}pid=${encodeURIComponent(pid)}`;
}

function getYouCanTransactionId(response: any): string | undefined {
  const candidate =
    response?.transaction_id ||
    response?.transactionId ||
    response?.transaction?.id ||
    response?.id;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : undefined;
}
