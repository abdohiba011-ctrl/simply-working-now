import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, AlertCircle, Loader2, Mail } from "lucide-react";

import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLanguage } from "@/contexts/LanguageContext";
import { getResetRequestLockoutMs, type AuthError } from "@/lib/mockAuth";

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

export default function RenterForgotPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [serverError, setServerError] = useState<string | null>(null);
  const [lockoutMs, setLockoutMs] = useState(0);
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const emailValue = form.watch("email");

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
      setSent(true);
    } catch (err) {
      const e = err as AuthError;
      if (e.code === "RESET_RATE_LIMITED") {
        setServerError(
          `Too many reset requests. Try again in ${
            e.retryAfterMs ? formatRemaining(e.retryAfterMs) : "a while"
          }.`,
        );
        if (e.retryAfterMs) setLockoutMs(e.retryAfterMs);
      } else {
        setServerError(e.message);
      }
    }
  };

  const submitDisabled = isLoading || lockoutMs > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {t("auth.forgotPassword") || "Forgot password"}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {sent
                      ? "We've emailed you a password reset link. Open it from your inbox to set a new password."
                      : "Enter your email and we'll send you a link to reset your password."}
                  </p>
                </div>

                {serverError ? (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                ) : null}

                {sent ? (
                  <div className="space-y-4">
                    <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        Reset link sent to <strong>{emailValue}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Didn't get it? Check your spam folder, or try again in a minute.
                    </p>
                    <Button
                      type="button"
                      variant="hero"
                      className="w-full"
                      onClick={() => setSent(false)}
                    >
                      Send again
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                    noValidate
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
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
                          className="pl-9"
                          {...form.register("email")}
                        />
                      </div>
                      {form.formState.errors.email ? (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.email.message}
                        </p>
                      ) : null}
                      {lockoutLabel ? (
                        <p className="text-xs text-destructive">
                          Try again in {lockoutLabel}
                        </p>
                      ) : null}
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      className="w-full"
                      disabled={submitDisabled || !form.formState.isValid}
                    >
                      {isLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        "Send reset link"
                      )}
                    </Button>
                  </form>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate("/auth")}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
