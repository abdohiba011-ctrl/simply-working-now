import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle, Loader2, Check, X } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { COMMON_PASSWORDS, isResetTokenValid, type AuthError } from "@/lib/mockAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        code: z.ZodIssueCode.custom,
        message: "Passwords don't match",
      });
    }
    const pw = data.password;
    if (!/[A-Z]/.test(pw))
      ctx.addIssue({
        path: ["password"],
        code: z.ZodIssueCode.custom,
        message: "Must include 1 uppercase letter",
      });
    if (!/[a-z]/.test(pw))
      ctx.addIssue({
        path: ["password"],
        code: z.ZodIssueCode.custom,
        message: "Must include 1 lowercase letter",
      });
    if (!/\d/.test(pw))
      ctx.addIssue({
        path: ["password"],
        code: z.ZodIssueCode.custom,
        message: "Must include 1 number",
      });
    if (COMMON_PASSWORDS.has(pw.toLowerCase()))
      ctx.addIssue({
        path: ["password"],
        code: z.ZodIssueCode.custom,
        message: "This password is too common",
      });
  });

type FormValues = z.infer<typeof schema>;

function passwordRules(pw: string) {
  return [
    { id: "length", label: "8+ characters", ok: pw.length >= 8 },
    { id: "upper", label: "1 uppercase", ok: /[A-Z]/.test(pw) },
    { id: "lower", label: "1 lowercase", ok: /[a-z]/.test(pw) },
    { id: "number", label: "1 number", ok: /\d/.test(pw) },
  ];
}

function passwordStrength(pw: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
  color: string;
} {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  const hasLen = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const isLong = pw.length >= 10;
  if (!hasLen || (!hasUpper && !hasNumber)) {
    return { score: 1, label: "Weak", color: "#dc2626" };
  }
  if (isLong && hasUpper && hasLower && hasNumber && hasSymbol) {
    return { score: 3, label: "Strong", color: "#9FE870" };
  }
  return { score: 2, label: "Medium", color: "#f59e0b" };
}

export default function ResetPasswordNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setNewPassword = useAuthStore((s) => s.setNewPassword);
  const isLoading = useAuthStore((s) => s.isLoading);

  const token = params.get("token") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Detect Supabase recovery session (from email link hash) OR a valid OTP-issued token
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1) Email-link flow: Supabase puts tokens in the URL hash.
      const hash = window.location.hash || "";
      if (hash.includes("access_token") || hash.includes("type=recovery")) {
        // supabase-js auto-detects the session from the hash on load.
        // Give it a tick, then check.
        await new Promise((r) => setTimeout(r, 50));
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          // Clean the hash from the URL bar
          window.history.replaceState(null, "", window.location.pathname);
          setHasRecoverySession(true);
          setIsReady(true);
          return;
        }
      }

      // 2) OTP-code flow: verifyResetCode already created a session and gave us a token.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session && token && isResetTokenValid(token)) {
        if (!cancelled) {
          setHasRecoverySession(true);
          setIsReady(true);
        }
        return;
      }

      // Nothing valid → bounce back.
      if (!cancelled) {
        toast.error(
          t("mockAuth.reset_link_expired", {
            defaultValue: "Your reset link expired. Please request a new one.",
          }),
        );
        navigate("/forgot-password", { replace: true });
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, t]);

  const pwValue = form.watch("password");
  const confirmValue = form.watch("confirmPassword");
  const rules = useMemo(() => passwordRules(pwValue ?? ""), [pwValue]);
  const strength = passwordStrength(pwValue ?? "");
  const allRulesOk = rules.every((r) => r.ok);
  const passwordsMatch =
    !!pwValue && !!confirmValue && pwValue === confirmValue;

  const routeAfterReset = () => {
    const u = useAuthStore.getState().user;
    if (!u) return navigate("/login", { replace: true });
    const hasRenter = u.roles.renter.active;
    const hasAgency = u.roles.agency.active;
    if (hasAgency) {
      navigate(
        u.roles.agency.verified ? "/agency/dashboard" : "/agency/verification",
        { replace: true },
      );
    } else if (hasRenter) {
      navigate("/rent", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      // We have a recovery session (either from email link or OTP verify).
      // Use Supabase directly so we don't depend on a custom token.
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) {
        if (/session|jwt|expired|invalid/i.test(error.message)) {
          toast.error(
            t("mockAuth.reset_link_expired", {
              defaultValue: "Your reset link expired. Please request a new one.",
            }),
          );
          navigate("/forgot-password", { replace: true });
          return;
        }
        setServerError(error.message);
        return;
      }
      toast.success(
        t("mockAuth.password_updated", { defaultValue: "Password updated!" }),
      );
      routeAfterReset();
    } catch (err) {
      const e = err as AuthError;
      setServerError(e.message ?? "Something went wrong");
    }
  };

  const submitDisabled =
    isLoading || !isReady || !hasRecoverySession || !allRulesOk || !passwordsMatch || !form.formState.isValid;

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#163300" }}
          >
            {t("mockAuth.set_new_password", { defaultValue: "Set new password" })}
          </h1>
          <p className="text-sm" style={{ color: "rgba(22,51,0,0.7)" }}>
            {t("mockAuth.set_new_password_sub", {
              defaultValue: "Create a strong password for your Motonita account.",
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
          {/* New password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-sm"
              style={{ color: "#163300" }}
            >
              {t("mockAuth.new_password", { defaultValue: "New password" })}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="h-10 rounded-md pr-10 text-sm"
                {...form.register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.password.message}
              </p>
            ) : null}

            {pwValue ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#163300]/10 overflow-hidden">
                    <div
                      className="h-full transition-all duration-200"
                      style={{
                        width: `${(strength.score / 3) * 100}%`,
                        backgroundColor: strength.color,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color:
                        strength.color === "#9FE870" ? "#163300" : strength.color,
                    }}
                  >
                    {strength.label}
                  </span>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-1">
                  {rules.map((r) => (
                    <li
                      key={r.id}
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        r.ok ? "" : "text-muted-foreground",
                      )}
                      style={{ color: r.ok ? "#163300" : undefined }}
                    >
                      {r.ok ? (
                        <Check className="h-3 w-3" style={{ color: "#9FE870" }} />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span>{r.label}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {/* Confirm */}
          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-sm"
              style={{ color: "#163300" }}
            >
              {t("mockAuth.confirm_new_password", {
                defaultValue: "Confirm new password",
              })}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                className="h-10 rounded-md pr-10 text-sm"
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                aria-label={showConfirm ? "Hide password" : "Show password"}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.confirmPassword ? (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={submitDisabled}
            className="w-full h-10 rounded-md text-sm font-semibold"
            style={{ backgroundColor: "#9FE870", color: "#163300" }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("mockAuth.updating", { defaultValue: "Updating..." })}
              </span>
            ) : (
              t("mockAuth.update_password", { defaultValue: "Update password" })
            )}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
