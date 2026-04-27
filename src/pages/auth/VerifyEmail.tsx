import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MailCheck, AlertCircle, Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { getResendCooldownMs, type AuthError } from "@/lib/mockAuth";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;

export default function VerifyEmail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerificationCode = useAuthStore((s) => s.resendVerificationCode);
  const setPendingEmail = useAuthStore((s) => s.setPendingEmail);
  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const userInStore = useAuthStore((s) => s.user);

  const queryEmail = params.get("email");
  const email = queryEmail ?? pendingEmail ?? userInStore?.email ?? "";

  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Sync pendingEmail with the URL param
  useEffect(() => {
    if (queryEmail && queryEmail !== pendingEmail) {
      setPendingEmail(queryEmail);
    }
  }, [queryEmail, pendingEmail, setPendingEmail]);

  // Initial focus
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Cooldown ticker
  useEffect(() => {
    const tick = () => setCooldownMs(email ? getResendCooldownMs(email) : 0);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [email]);

  const codeStr = useMemo(() => digits.join(""), [digits]);
  const allFilled = codeStr.length === CODE_LENGTH && digits.every((d) => /^\d$/.test(d));

  const triggerShake = () => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 400);
  };

  const clearDigits = () => {
    setDigits(Array(CODE_LENGTH).fill(""));
    inputsRef.current[0]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "");
    if (!sanitized) {
      // Allow clearing
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    // If user typed/pasted multiple, fan out
    if (sanitized.length > 1) {
      const chars = sanitized.slice(0, CODE_LENGTH - index).split("");
      const next = [...digits];
      chars.forEach((c, i) => {
        next[index + i] = c;
      });
      setDigits(next);
      const lastIdx = Math.min(index + chars.length, CODE_LENGTH - 1);
      inputsRef.current[lastIdx]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = sanitized;
    setDigits(next);
    if (index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    } else if (e.key === "Enter" && allFilled && !submitting) {
      void handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      e.preventDefault();
      setDigits(pasted.split(""));
      inputsRef.current[CODE_LENGTH - 1]?.focus();
    }
  };

  const routeAfterVerify = () => {
    const u = useAuthStore.getState().user;
    if (!u) return;
    const hasRenter = u.roles.renter.active;
    const hasAgency = u.roles.agency.active;
    if (hasAgency && hasRenter) {
      navigate(u.roles.agency.verified ? "/agency/dashboard" : "/agency/verification", {
        replace: true,
      });
    } else if (hasAgency) {
      navigate(u.roles.agency.verified ? "/agency/dashboard" : "/agency/verification", {
        replace: true,
      });
    } else {
      navigate("/rent", { replace: true });
    }
  };

  const handleSubmit = async () => {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyEmail(codeStr, email);
      toast.success(t("mockAuth.email_verified", { defaultValue: "Email verified!" }));
      routeAfterVerify();
    } catch (err) {
      const e = err as AuthError;
      setError(e.message);
      triggerShake();
      clearDigits();
      // After 3 wrong attempts, the mock auto-issued a new code; surface it as a toast
      if (e.code === "INVALID_CODE" && e.attemptsLeft === 0) {
        toast.message(
          t("mockAuth.new_code_sent", { defaultValue: "New code sent to your email" }),
        );
        setCooldownMs(getResendCooldownMs(email));
      } else if (e.code === "CODE_EXPIRED") {
        toast.message(
          t("mockAuth.new_code_sent", { defaultValue: "New code sent to your email" }),
        );
        setCooldownMs(getResendCooldownMs(email));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldownMs > 0) return;
    setError(null);
    try {
      await resendVerificationCode(email);
      toast.success(t("mockAuth.new_code_sent", { defaultValue: "New code sent!" }));
      setCooldownMs(getResendCooldownMs(email));
      clearDigits();
    } catch (err) {
      const e = err as AuthError;
      setError(e.message);
      if (e.retryAfterMs) setCooldownMs(e.retryAfterMs);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(159,232,112,0.18)" }}
          >
            <MailCheck className="h-9 w-9" style={{ color: "#9FE870" }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#163300" }}>
            {t("mockAuth.confirm_your_email", { defaultValue: "Confirm your email" })}
          </h1>
          <p className="text-sm" style={{ color: "rgba(22,51,0,0.7)" }}>
            {t("mockAuth.code_sent_to", {
              defaultValue: "We sent a 6-digit code to",
            })}{" "}
            <span className="font-semibold" style={{ color: "#163300" }}>
              {email || "your email"}
            </span>
            . {t("mockAuth.enter_below_activate", { defaultValue: "Enter it below to activate your account." })}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div
          className={cn(
            "flex justify-center gap-2",
            shaking && "animate-[shake_0.4s_ease-in-out]",
          )}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${i + 1}`}
              className={cn(
                "w-12 h-12 rounded-md border text-center text-xl font-semibold outline-none transition-all",
                "focus:ring-2",
                d ? "bg-[#9FE870]/5" : "bg-white",
              )}
              style={{
                borderColor: d ? "#9FE870" : "rgba(22,51,0,0.15)",
                color: "#163300",
              }}
            />
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!allFilled || submitting}
          className="w-full h-10 rounded-md text-sm font-semibold"
          style={{ backgroundColor: "#9FE870", color: "#163300" }}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("mockAuth.verifying", { defaultValue: "Verifying..." })}
            </span>
          ) : (
            t("mockAuth.verify", { defaultValue: "Verify" })
          )}
        </Button>

        <div className="text-center space-y-2">
          {cooldownMs > 0 ? (
            <p className="text-sm" style={{ color: "rgba(22,51,0,0.55)" }}>
              {t("mockAuth.resend_in", {
                seconds: Math.ceil(cooldownMs / 1000),
                defaultValue: `Resend in ${Math.ceil(cooldownMs / 1000)}s`,
              })}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-sm font-medium underline underline-offset-2 hover:no-underline"
              style={{ color: "#163300" }}
            >
              {t("mockAuth.resend_code", { defaultValue: "Didn't receive it? Resend code" })}
            </button>
          )}
          <div>
            <Link
              to="/signup"
              className="text-xs hover:underline"
              style={{ color: "rgba(22,51,0,0.6)" }}
            >
              {t("mockAuth.change_email", { defaultValue: "Change email address" })}
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
