import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, MailCheck, AlertCircle, Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getResetResendCooldownMs,
  type AuthError,
} from "@/lib/mockAuth";

/**
 * "Check your email" screen.
 *
 * Default Supabase password-reset emails contain a magic link, NOT a
 * 6-digit code. Clicking that link lands the user on
 * `/reset-password/new` with a recovery session already established.
 *
 * This page simply confirms the email was sent and offers a Resend button
 * (with a cooldown to avoid spam).
 */
export default function ResetPasswordVerify() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const email = params.get("email") ?? "";

  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);

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

  const handleResend = async () => {
    if (cooldownMs > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      await requestPasswordReset(email);
      toast.success(
        t("mockAuth.email_resent", { defaultValue: "Email sent again — check your inbox." }),
      );
      setCooldownMs(getResetResendCooldownMs(email));
    } catch (err) {
      const e = err as AuthError;
      setError(e.message);
      if (e.retryAfterMs) setCooldownMs(e.retryAfterMs);
    } finally {
      setResending(false);
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
            <MailCheck className="h-9 w-9" style={{ color: "#163300" }} />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#163300" }}
          >
            {t("mockAuth.check_your_email", { defaultValue: "Check your email" })}
          </h1>
          <p className="text-sm" style={{ color: "rgba(22,51,0,0.7)" }}>
            {t("mockAuth.reset_link_sent", {
              defaultValue: "We sent a password reset link to",
            })}{" "}
            <span className="font-semibold" style={{ color: "#163300" }}>
              {email}
            </span>
            .{" "}
            {t("mockAuth.click_link_to_reset", {
              defaultValue:
                "Click the link in the email to set a new password. It may take a minute to arrive — don't forget to check your spam folder.",
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

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={cooldownMs > 0 || resending}
            className="w-full h-10 rounded-md text-sm font-semibold"
            style={{ backgroundColor: "#9FE870", color: "#163300" }}
          >
            {resending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("mockAuth.sending", { defaultValue: "Sending..." })}
              </span>
            ) : cooldownMs > 0 ? (
              t("mockAuth.resend_in", {
                seconds: Math.ceil(cooldownMs / 1000),
                defaultValue: `Resend in ${Math.ceil(cooldownMs / 1000)}s`,
              })
            ) : (
              t("mockAuth.resend_email", { defaultValue: "Resend email" })
            )}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              style={{ color: "#163300" }}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("mockAuth.back_to_login", { defaultValue: "Back to login" })}
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
