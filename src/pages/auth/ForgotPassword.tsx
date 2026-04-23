import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, AlertCircle, Loader2, Mail } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getResetRequestLockoutMs,
  type AuthError,
} from "@/lib/mockAuth";
import { navigateAfterAuth } from "@/lib/routeAfterAuth";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

type FormValues = z.infer<typeof schema>;

function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authedUser = useAuthStore((s) => s.user);

  // Already logged in? send them to their dashboard — no point resetting.
  useEffect(() => {
    if (isAuthenticated && authedUser) {
      navigateAfterAuth(navigate, authedUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const [serverError, setServerError] = useState<string | null>(null);
  const [lockoutMs, setLockoutMs] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const emailValue = form.watch("email");

  // Tick the lockout countdown
  useEffect(() => {
    if (!emailValue) {
      setLockoutMs(0);
      return;
    }
    const tick = () => setLockoutMs(getResetRequestLockoutMs(emailValue));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [emailValue]);

  const lockoutLabel = useMemo(
    () => (lockoutMs > 0 ? formatRemaining(lockoutMs) : null),
    [lockoutMs],
  );

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await requestPasswordReset(values.email);
      navigate(
        `/reset-password/verify?email=${encodeURIComponent(values.email)}`,
      );
    } catch (err) {
      const e = err as AuthError;
      if (e.code === "RESET_RATE_LIMITED") {
        setServerError(
          t("mockAuth.too_many_reset_requests", {
            time: e.retryAfterMs ? formatRemaining(e.retryAfterMs) : "",
            defaultValue: `Too many reset requests. Try again in ${
              e.retryAfterMs ? formatRemaining(e.retryAfterMs) : "a while"
            }.`,
          }),
        );
        if (e.retryAfterMs) setLockoutMs(e.retryAfterMs);
      } else {
        setServerError(e.message);
      }
    }
  };

  const submitDisabled = isLoading || lockoutMs > 0;

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#163300" }}
          >
            {t("mockAuth.reset_password", { defaultValue: "Reset your password" })}
          </h1>
          <p className="text-sm" style={{ color: "rgba(22,51,0,0.7)" }}>
            {t("mockAuth.reset_password_sub", {
              defaultValue:
                "Enter your email and we'll send you a code to reset your password.",
            })}
          </p>
        </div>

        {serverError ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm" style={{ color: "#163300" }}>
              {t("mockAuth.email_or_phone", { defaultValue: "Email" }).split(" ")[0]}
            </Label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-10 rounded-md text-sm pl-9"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email ? (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.email.message}
              </p>
            ) : null}
            {lockoutLabel ? (
              <p className="text-xs text-red-600 mt-1">
                {t("mockAuth.try_again_in", { defaultValue: "Try again in" })}{" "}
                {lockoutLabel}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={submitDisabled || !form.formState.isValid}
            className="w-full h-10 rounded-md text-sm font-semibold"
            style={{ backgroundColor: "#9FE870", color: "#163300" }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("mockAuth.sending", { defaultValue: "Sending..." })}
              </span>
            ) : (
              t("mockAuth.send_reset_code", { defaultValue: "Send reset code" })
            )}
          </Button>
        </form>

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
    </AuthLayout>
  );
}
