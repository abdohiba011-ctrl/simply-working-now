import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";

import { AgencyAuthLayout } from "@/components/auth/AgencyAuthLayout";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { type AuthError } from "@/lib/mockAuth";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;

export default function ResetPasswordVerify() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const verifyResetCode = useAuthStore((s) => s.verifyResetCode);

  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
    else inputsRef.current[0]?.focus();
  }, [email, navigate]);

  const codeStr = useMemo(() => digits.join(""), [digits]);
  const allFilled = codeStr.length === CODE_LENGTH && digits.every((d) => /^\d$/.test(d));

  const clearDigits = () => {
    setDigits(Array(CODE_LENGTH).fill(""));
    inputsRef.current[0]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "");
    if (!sanitized) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    if (sanitized.length > 1) {
      const chars = sanitized.slice(0, CODE_LENGTH - index).split("");
      const next = [...digits];
      chars.forEach((c, i) => {
        next[index + i] = c;
      });
      setDigits(next);
      inputsRef.current[Math.min(index + chars.length, CODE_LENGTH - 1)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = sanitized;
    setDigits(next);
    if (index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus();
    else if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
    else if (e.key === "Enter" && allFilled && !submitting) void handleSubmit();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      e.preventDefault();
      setDigits(pasted.split(""));
      inputsRef.current[CODE_LENGTH - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!allFilled || submitting || !email) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await verifyResetCode(email, codeStr);
      navigate(`/reset-password/new?token=${encodeURIComponent(token)}`, { replace: true });
    } catch (err) {
      const e = err as AuthError;
      setError(e.message);
      setShaking(true);
      window.setTimeout(() => setShaking(false), 400);
      clearDigits();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgencyAuthLayout>
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(159,232,112,0.18)" }}>
            <MailCheck className="h-9 w-9" style={{ color: "#9FE870" }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#163300" }}>
            {t("mockAuth.enter_reset_code", { defaultValue: "Enter reset code" })}
          </h1>
          <p className="text-sm" style={{ color: "rgba(22,51,0,0.7)" }}>
            {t("mockAuth.reset_code_sent", { defaultValue: "We sent a 6-digit reset code to" })} <span className="font-semibold" style={{ color: "#163300" }}>{email}</span>.
          </p>
        </div>

        {error ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className={cn("flex justify-center gap-2", shaking && "animate-[shake_0.4s_ease-in-out]")}> 
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${i + 1}`}
              className={cn("w-12 h-12 rounded-md border text-center text-xl font-semibold outline-none transition-all", "focus:ring-2", d ? "bg-[#9FE870]/5" : "bg-white")}
              style={{ borderColor: d ? "#9FE870" : "rgba(22,51,0,0.15)", color: "#163300" }}
            />
          ))}
        </div>

        <Button onClick={handleSubmit} disabled={!allFilled || submitting} className="w-full h-10 rounded-md text-sm font-semibold" style={{ backgroundColor: "#9FE870", color: "#163300" }}>
          {submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("mockAuth.verifying", { defaultValue: "Verifying..." })}</span> : t("mockAuth.verify_code", { defaultValue: "Verify code" })}
        </Button>

        <div className="text-center">
          <Link to="/forgot-password" className="text-sm font-medium hover:underline" style={{ color: "#163300" }}>
            {t("mockAuth.wrong_email", { defaultValue: "Wrong email?" })}
          </Link>
        </div>
      </div>
    </AgencyAuthLayout>
  );
}