import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Phone, AlertCircle, Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  detectIdentifierType,
  getLockoutRemainingMs,
  mockResendVerification,
  type AuthError,
} from "@/lib/mockAuth";
import { cn } from "@/lib/utils";
import {
  navigateAfterAuth,
  queueBecomeBusinessPrompt,
  type LoginContext,
} from "@/lib/routeAfterAuth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { checkAccountMethod, type AccountMethodStatus } from "@/lib/checkAccountMethod";

const PHONE_REGEX = /^(\+212|00212|0)[67]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Required")
    .refine(
      (v) => EMAIL_REGEX.test(v.trim()) || PHONE_REGEX.test(v.replace(/\s+/g, "")),
      { message: "Enter a valid email or Moroccan phone number" },
    ),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginValues = z.infer<typeof loginSchema>;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

interface LoginProps {
  context?: LoginContext;
}

export default function Login({ context = "renter" }: LoginProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const needsVerification = useAuthStore((s) => s.needsVerification);
  const clearError = useAuthStore((s) => s.clearError);

  const [showPassword, setShowPassword] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const [accountHint, setAccountHint] = useState<AccountMethodStatus | null>(null);

  // Restore "Remember me" identifier from previous session
  const rememberedId = (() => {
    try {
      return localStorage.getItem("motonita_remembered_identifier") ?? "";
    } catch {
      return "";
    }
  })();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      identifier: rememberedId,
      password: "",
      rememberMe: !!rememberedId,
    },
  });

  const identifierValue = form.watch("identifier");
  const idType = useMemo(() => detectIdentifierType(identifierValue ?? ""), [identifierValue]);

  // If already authenticated, send them to the right place
  useEffect(() => {
    if (isAuthenticated && user) {
      navigateAfterAuth(navigate, user, context);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Lockout countdown ticker
  useEffect(() => {
    const id = window.setInterval(() => {
      const ident = form.getValues("identifier");
      if (!ident) {
        setLockoutMs(0);
        return;
      }
      setLockoutMs(getLockoutRemainingMs(ident));
    }, 1000);
    return () => window.clearInterval(id);
  }, [form]);

  const onSubmit = async (values: LoginValues) => {
    clearError();
    setAccountHint(null);
    // Persist or clear the remembered identifier
    try {
      if (values.rememberMe) {
        localStorage.setItem("motonita_remembered_identifier", values.identifier.trim());
      } else {
        localStorage.removeItem("motonita_remembered_identifier");
      }
    } catch {
      // ignore storage errors (private mode, etc.)
    }
    try {
      const loggedIn = await login(
        values.identifier,
        values.password,
        values.rememberMe,
        context,
      );
      toast.success(
        t("mockAuth.welcome_toast", {
          name: loggedIn.name,
          defaultValue: `Welcome back, ${loggedIn.name}!`,
        }),
      );

      // Cross-door message: renter-only user logged in via /agency/login
      if (
        context === "agency" &&
        !loggedIn.roles.agency.active &&
        loggedIn.roles.renter.active
      ) {
        queueBecomeBusinessPrompt();
        toast.message(
          t("mockAuth.logged_in_as_renter", {
            defaultValue:
              "You're logged in as a renter. Want to become a business?",
          }),
        );
      }

      navigateAfterAuth(navigate, loggedIn, context);
    } catch (err) {
      const e = err as AuthError;
      if (e.code === "ACCOUNT_LOCKED") {
        setLockoutMs(e.retryAfterMs ?? 0);
      }
      // For invalid-credential failures, ask the backend WHY this failed
      // (no account / OAuth-only / wrong password) so we can show a
      // helpful, specific message instead of the generic one.
      if (e.code === "INVALID_CREDENTIALS" && idType === "email") {
        const ident = values.identifier.trim();
        if (EMAIL_REGEX.test(ident)) {
          const r = await checkAccountMethod(ident);
          if (r.status !== "unknown") setAccountHint(r.status);
        }
      }
      // error message already in store
    }
  };

  const handleResend = async () => {
    setResendingVerification(true);
    try {
      await mockResendVerification(form.getValues("identifier"));
      toast.success(
        t("mockAuth.verification_sent", { defaultValue: "Verification email sent" }),
      );
    } finally {
      setResendingVerification(false);
    }
  };

  const submitDisabled = isLoading || lockoutMs > 0;

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1
            className="text-2xl font-bold tracking-tight"
            className_FOREGROUND
          >
            {context === "agency"
              ? t("mockAuth.welcome_business", {
                  defaultValue: "Welcome back, business partner",
                })
              : t("mockAuth.welcome_back", { defaultValue: "Welcome back" })}
          </h1>
          <p className="text-sm" className_MUTED7>
            {context === "agency"
              ? t("mockAuth.login_continue_business", {
                  defaultValue: "Log in to manage your fleet and bookings",
                })
              : t("mockAuth.login_continue_renter", {
                  defaultValue: "Log in to find your next ride",
                })}
          </p>
        </div>

        {/* Error banner */}
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                {accountHint === "oauth_only" ? (
                  <>
                    <p className="font-semibold">
                      {t("mockAuth.account_uses_google_title", {
                        defaultValue: "This account was created with Google",
                      })}
                    </p>
                    <p className="text-xs">
                      {t("mockAuth.account_uses_google_body", {
                        defaultValue:
                          "There's no password on file. Please use the \"Continue with Google\" button below to sign in.",
                      })}
                    </p>
                  </>
                ) : accountHint === "not_found" ? (
                  <>
                    <p className="font-semibold">
                      {t("mockAuth.no_account_title", {
                        defaultValue: "No account found for this email",
                      })}
                    </p>
                    <p className="text-xs">
                      {t("mockAuth.no_account_body", {
                        defaultValue:
                          "Double-check the spelling or sign up to create a new account.",
                      })}{" "}
                      <Link
                        to={context === "agency" ? "/agency/signup" : "/signup"}
                        className="font-semibold underline underline-offset-2"
                      >
                        {t("mockAuth.signup", { defaultValue: "Sign up" })}
                      </Link>
                    </p>
                  </>
                ) : accountHint === "has_password" ? (
                  <>
                    <p>
                      {t("mockAuth.wrong_password_body", {
                        defaultValue:
                          "Incorrect password. Make sure caps lock is off and try again.",
                      })}
                    </p>
                    <p className="text-xs">
                      <Link
                        to="/forgot-password"
                        className="font-semibold underline underline-offset-2"
                      >
                        {t("mockAuth.forgot_password", { defaultValue: "Forgot password?" })}
                      </Link>
                    </p>
                  </>
                ) : (
                  <p>{typeof error === "string" ? error : error.message}</p>
                )}

                {needsVerification ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendingVerification}
                    className="text-sm font-medium underline underline-offset-2 hover:no-underline disabled:opacity-60"
                  >
                    {resendingVerification
                      ? t("mockAuth.sending", { defaultValue: "Sending..." })
                      : t("mockAuth.resend_verification", {
                          defaultValue: "Resend verification email",
                        })}
                  </button>
                ) : null}

                {lockoutMs > 0 ? (
                  <p className="text-xs">
                    {t("mockAuth.try_again_in", { defaultValue: "Try again in" })}{" "}
                    <span className="font-semibold">{formatRemaining(lockoutMs)}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <GoogleSignInButton />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" className_BORDER />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground" className_MUTED55>
                {t("mockAuth.or", { defaultValue: "or" })}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Identifier */}
          <div className="space-y-1.5">
            <Label htmlFor="identifier" className="text-sm" className_FOREGROUND>
              {t("mockAuth.email_or_phone", { defaultValue: "Email or phone" })}
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                {idType === "phone" ? (
                  <Phone className="h-4 w-4" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
              </span>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="you@example.com or +212 6..."
                className={cn(
                  "h-10 rounded-md pl-9 text-sm",
                  form.formState.errors.identifier && "border-red-300 focus-visible:ring-red-200",
                )}
                {...form.register("identifier")}
              />
            </div>
            {form.formState.errors.identifier ? (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.identifier.message}
              </p>
            ) : null}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm" className_FOREGROUND>
              {t("mockAuth.password", { defaultValue: "Password" })}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={cn(
                  "h-10 rounded-md pr-10 text-sm",
                  form.formState.errors.password && "border-red-300 focus-visible:ring-red-200",
                )}
                {...form.register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={form.watch("rememberMe")}
                onCheckedChange={(v) => form.setValue("rememberMe", Boolean(v))}
              />
              <span className="text-sm" className_FOREGROUND>
                {t("mockAuth.remember_me", { defaultValue: "Remember me for 30 days" })}
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm hover:underline"
              className_FOREGROUND
            >
              {t("mockAuth.forgot_password", { defaultValue: "Forgot password?" })}
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitDisabled || !form.formState.isValid}
            className="w-full h-10 rounded-md text-sm font-semibold"
            style={{ backgroundColor: "#9FE870", color: "#163300" }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("mockAuth.logging_in", { defaultValue: "Logging in..." })}
              </span>
            ) : (
              t("mockAuth.login", { defaultValue: "Log in" })
            )}
          </Button>

          {/* Signup */}
          <p className="text-center text-sm" className_MUTED75>
            {context === "agency"
              ? t("mockAuth.no_business_account", {
                  defaultValue: "Don't have a business account?",
                })
              : t("mockAuth.no_account", { defaultValue: "Don't have an account?" })}{" "}
            <Link
              to={context === "agency" ? "/agency/signup" : "/signup"}
              className="font-medium hover:underline"
              className_FOREGROUND
            >
              {t("mockAuth.signup", { defaultValue: "Sign up" })}
            </Link>
          </p>

          {/* Cross-door link — only on agency login (renters reach agency auth via /agencies) */}
          {context === "agency" ? (
            <p className="text-center text-xs" className_MUTED6>
              {t("mockAuth.are_you_renter", {
                defaultValue: "Are you a renter?",
              })}{" "}
              <Link
                to="/login"
                className="hover:underline font-medium"
                className_FOREGROUND
              >
                {t("mockAuth.login_here", { defaultValue: "Log in here" })}
              </Link>
            </p>
          ) : null}
        </form>
      </div>
    </AuthLayout>
  );
}
