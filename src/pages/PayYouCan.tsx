import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Lock, ChevronLeft, RefreshCw } from "lucide-react";
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
 *   holder      — cardholder name to prefill in the embedded form
 *   email       — email to prefill in the embedded form
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

/**
 * After YouCan paints its credit-card form into our div, look for the
 * cardholder-name and email inputs and seed them with the renter's profile
 * info so they don't have to retype what we already know. We dispatch native
 * `input` + `change` events so the SDK's internal state picks the value up.
 *
 * Polls for up to ~1.5 s because the SDK paints the form async.
 */
function prefillCardForm(holder: string, email: string) {
  if (!holder && !email) return () => {};
  const root = document.getElementById("ycpay-form");
  if (!root) return () => {};

  let done = false;
  let cancelled = false;
  const start = Date.now();

  const findInput = (selectors: string[]): HTMLInputElement | null => {
    for (const sel of selectors) {
      const el = root.querySelector<HTMLInputElement>(sel);
      if (el) return el;
    }
    return null;
  };

  const setValue = (input: HTMLInputElement, value: string) => {
    if (!value) return;
    // React-style native setter so SDKs that listen on input events update too.
    const proto = Object.getPrototypeOf(input);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const tick = () => {
    if (cancelled || done) return;
    const nameInput = findInput([
      'input[name="card_holder_name"]',
      'input[name="cardholder"]',
      'input[name="holder_name"]',
      'input[name*="holder" i]',
      'input[autocomplete="cc-name"]',
    ]);
    const emailInput = findInput([
      'input[name="card_holder_email"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[autocomplete="email"]',
    ]);

    if (nameInput && holder) {
      setValue(nameInput, holder);
      nameInput.classList.add("bg-muted/50");
      nameInput.title = "Pre-filled from your Motonita account";
    }
    if (emailInput && email) {
      setValue(emailInput, email);
      emailInput.classList.add("bg-muted/50");
      emailInput.title = "Pre-filled from your Motonita account";
    }

    if ((nameInput || !holder) && (emailInput || !email)) {
      done = true;
      return;
    }
    if (Date.now() - start < 1500) {
      setTimeout(tick, 100);
    }
  };
  tick();

  return () => {
    cancelled = true;
  };
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
  const method = (params.get("method") || "card") as "card" | "cashplus";
  const holder = params.get("holder") || "";
  const email = params.get("email") || "";

  const [status, setStatus] = useState<"loading" | "ready" | "paying" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [initNonce, setInitNonce] = useState(0);
  const ycRef = useRef<any>(null);
  const initStartedRef = useRef(false);
  const payingRef = useRef(false);

  const initForm = useCallback(async () => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    let cancelled = false;

    const cleanupContainer = () => {
      const node = document.getElementById("ycpay-form");
      if (node) node.innerHTML = "";
    };

    try {
      if (!token || !pubKey) {
        setStatus("error");
        setErrorMsg("Missing payment token. Please try again.");
        return;
      }
      // Always start from a clean container — guards against StrictMode
      // double-mount and React Router quick re-navigation duplicating the form.
      cleanupContainer();

      await loadYcPayScript();
      if (cancelled) return;

      const yc = new window.YCPay(pubKey, {
        formContainer: "#ycpay-form",
        errorContainer: "#ycpay-error",
        locale: "en",
        isSandbox,
        token,
        // Honored by some SDK builds; ignored otherwise.
        customer: { name: holder || undefined, email: email || undefined },
      });

      try {
        if (method === "cashplus") {
          if (typeof yc.renderCashPlusForm === "function") {
            yc.renderCashPlusForm("default");
          } else {
            yc.renderAvailableGateways(["cashplus"], "default");
          }
        } else {
          yc.renderCreditCardForm("default");
        }
      } catch (gatewayErr) {
        console.warn("YouCan gateway render fallback", gatewayErr);
        yc.renderAvailableGateways([], "default");
      }

      ycRef.current = yc;
      setStatus("ready");

      if (method === "card") {
        // Fire-and-forget; safe even if no inputs are found.
        prefillCardForm(holder, email);
      }
    } catch (e: any) {
      console.error("YouCan Pay init failed", e);
      setStatus("error");
      setErrorMsg(e?.message || "We couldn't load the payment form.");
    }

    return () => {
      cancelled = true;
    };
  }, [token, pubKey, isSandbox, method, holder, email]);

  useEffect(() => {
    initForm();
    return () => {
      // Tear down so a remount (StrictMode, hot reload, route change) starts
      // from a clean slate — no duplicate cardholder/expiry/CVV blocks.
      initStartedRef.current = false;
      try {
        ycRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ycRef.current = null;
      const node = document.getElementById("ycpay-form");
      if (node) node.innerHTML = "";
    };
    // initNonce lets the Retry button re-run init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pubKey, isSandbox, method, initNonce]);

  const buildStatusUrl = (outcome: "success" | "error", transactionId?: string) => {
    const base = method === "cashplus" ? "/payment-cashplus" : "/payment-status";
    const qs = new URLSearchParams({
      pid,
      next: successPath,
      retry: errorPath,
      outcome,
      title,
    });
    if (transactionId) qs.set("transaction_id", transactionId);
    return `${base}?${qs.toString()}`;
  };

  const handlePay = () => {
    const yc = ycRef.current;
    if (!yc) return;
    // Synchronous double-click guard. setStatus is async, so a fast double
    // click could fire two yc.pay() calls before React repaints "paying".
    if (payingRef.current || status !== "ready") return;
    payingRef.current = true;
    setStatus("paying");
    yc.pay(token)
      .then((response: any) => {
        if (method === "cashplus") {
          toast.success("Voucher generated");
        } else {
          toast.success("Payment submitted");
        }
        const transactionId = getYouCanTransactionId(response);
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
      })
      .finally(() => {
        payingRef.current = false;
      });
  };

  const handleRetryInit = () => {
    setStatus("loading");
    setErrorMsg(null);
    initStartedRef.current = false;
    setInitNonce((n) => n + 1);
  };

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
              {method === "cashplus" ? (
                <>
                  <li className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <span>
                      Confirm to generate your CashPlus voucher. You'll then
                      take it to any CashPlus agent in Morocco to pay {amount} {currency} in cash.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <span>
                      Your booking is held while we wait for CashPlus to confirm your cash payment.
                    </span>
                  </li>
                </>
              ) : (
                <>
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
                  {(holder || email) && (
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>
                        Cardholder name and email are pre-filled from your Motonita account. You only need to enter your card number, expiry date and CVV.
                      </span>
                    </li>
                  )}
                </>
              )}
            </ul>

            <div id="ycpay-error" className="text-sm text-destructive" />
            <div
              id="ycpay-form"
              key={`ycform-${initNonce}`}
              className="min-h-[220px] rounded-lg border border-border p-3 bg-muted/30"
            />

            {status === "loading" && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payment form…
              </div>
            )}

            {status === "error" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive space-y-2">
                <p>{errorMsg}</p>
                <Button size="sm" variant="outline" onClick={handleRetryInit}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Retry
                </Button>
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
                  {method === "cashplus" ? "Generating voucher…" : "Processing…"}
                </>
              ) : method === "cashplus" ? (
                <>Generate CashPlus voucher</>
              ) : (
                <>Pay {amount ? `${amount} ${currency}` : ""}</>
              )}
            </Button>

            {isSandbox && method === "card" && (
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
