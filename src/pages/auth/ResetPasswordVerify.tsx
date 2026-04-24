import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound, AlertCircle, Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/auth/OtpInput";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getResetResendCooldownMs,
  type AuthError,
} from "@/lib/mockAuth";

const CODE_LENGTH = 6;

export default function ResetPasswordVerify() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const verifyResetCode = useAuthStore((s) => s.verifyResetCode);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(() =>
    Array(CODE_LENGTH).fill(""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    const tick = () => setCooldownMs(email ? getResetResendCooldownMs(email) : 0);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [email]);

  const codeStr = useMemo(() => digits.join(""), [digits]);
  const allFilled =
    codeStr.length === CODE_LENGTH && digits.every((d) => /^\d$/.test(d));

  const triggerShake = () => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 400);
  };

  const clearDigits = () => setDigits(Array(CODE_LENGTH).fill(""));

  const handleSubmit = async (codeOverride?: string) => {
    const code = codeOverride ?? codeStr;
    if (code.length !== CODE_LENGTH || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await verifyResetCode(email, code);
      navigate(`/reset-password/new?token=${encodeURIComponent(token)}`);
    } catch (err) {
      const e = err as AuthError;
      setError(e.message);
      triggerShake();
      clearDigits();
      if (e.code === "INVALID_CODE" && e.attemptsLeft === 0) {
        toast.message(
          t("mockAuth.new_code_sent", { defaultValue: "New code sent!" }),
        );
        setCooldownMs(getResetResendCooldownMs(email));
      } else if (e.code === "CODE_EXPIRED") {
        setExpired(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldownMs > 0) return;
    setError(null);
    setExpired(false);
    try {
      await requestPasswordReset(email);
      toast.success(
        t("mockAuth.new_code_sent", { defaultValue: "New code sent!" }),
      );
      setCooldownMs(getResetResendCooldownMs(email));
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
            <KeyRound className="h-9 w-9" style={{ color: "#9FE870" }} />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#163300" }}
          >
            {t("mockAuth.enter_reset_code", { defaultValue: "Enter reset code" })}
          </h1>
          <p className="text-sm" style={{ color: "rgba(22,51,0,0.7)" }}>
            {t("mockAuth.reset_code_sent", {
              defaultValue: "We sent a 6-digit code to",
            })}{" "}
            <span className="font-semibold" style={{ color: "#163300" }}>
              {email}
            </span>
            .{" "}
            {t("mockAuth.enter_below", {
              defaultValue: "Enter it below to reset your password.",
            })}
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

        {expired ? (
          <div className="text-center">
            <Button
              onClick={() => navigate("/forgot-password")}
              className="h-10 rounded-md text-sm font-semibold"
              style={{ backgroundColor: "#9FE870", color: "#163300" }}
            >
              {t("mockAuth.request_new_code", { defaultValue: "Request new code" })}
            </Button>
          </div>
        ) : (
          <>
            <OtpInput
              value={digits}
              onChange={setDigits}
              onComplete={(code) => handleSubmit(code)}
              shaking={shaking}
            />

            <Button
              onClick={() => handleSubmit()}
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
                t("mockAuth.verify_code", { defaultValue: "Verify code" })
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
                  {t("mockAuth.resend_code", {
                    defaultValue: "Didn't receive it? Resend code",
                  })}
                </button>
              )}
              <div>
                <Link
                  to="/forgot-password"
                  className="text-xs hover:underline"
                  style={{ color: "rgba(22,51,0,0.6)" }}
                >
                  {t("mockAuth.wrong_email", { defaultValue: "Wrong email?" })}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
