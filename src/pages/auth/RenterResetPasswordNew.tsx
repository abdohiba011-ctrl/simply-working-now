import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle, Loader2, Check, X } from "lucide-react";

import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase } from "@/integrations/supabase/client";
import { COMMON_PASSWORDS, isResetTokenValid, type AuthError } from "@/lib/mockAuth";
import { cn } from "@/lib/utils";

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

function passwordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "transparent" as const };
  const hasLen = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const isLong = pw.length >= 10;
  if (!hasLen || (!hasUpper && !hasNumber)) {
    return { score: 1, label: "Weak", color: "hsl(var(--destructive))" };
  }
  if (isLong && hasUpper && hasLower && hasNumber && hasSymbol) {
    return { score: 3, label: "Strong", color: "hsl(var(--primary))" };
  }
  return { score: 2, label: "Medium", color: "#f59e0b" };
}

export default function RenterResetPasswordNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isLoading = useAuthStore((s) => s.isLoading);

  const internalToken = params.get("token") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(
    null,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const ok = !!data.session?.user;
      setHasRecoverySession(ok);
      if (!ok && (!internalToken || !isResetTokenValid(internalToken))) {
        toast.error("Your reset link expired. Please request a new one.");
        navigate("/renter/forgot-password", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [internalToken, navigate]);

  const pwValue = form.watch("password");
  const confirmValue = form.watch("confirmPassword");
  const rules = useMemo(() => passwordRules(pwValue ?? ""), [pwValue]);
  const strength = passwordStrength(pwValue ?? "");
  const allRulesOk = rules.every((r) => r.ok);
  const passwordsMatch =
    !!pwValue && !!confirmValue && pwValue === confirmValue;

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      if (hasRecoverySession) {
        const { error } = await supabase.auth.updateUser({
          password: values.password,
        });
        if (error) throw error;
        try {
          await useAuthStore.getState().checkAuth();
        } catch {
          /* ignore */
        }
      } else {
        const setNewPassword = useAuthStore.getState().setNewPassword;
        await setNewPassword(internalToken, values.password);
      }
      toast.success("Password updated!");
      navigate("/auth", { replace: true });
    } catch (err) {
      const e = err as AuthError & { message?: string };
      if (e?.code === "TOKEN_EXPIRED" || e?.code === "INVALID_TOKEN") {
        toast.error("Your reset link expired. Please request a new one.");
        navigate("/renter/forgot-password", { replace: true });
        return;
      }
      setServerError(e?.message ?? "Could not update password");
    }
  };

  const submitDisabled =
    isLoading || !allRulesOk || !passwordsMatch || !form.formState.isValid;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-bold text-foreground">
                    Set new password
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Create a strong password for your Motonita account.
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

                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="pr-10"
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
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.password.message}
                      </p>
                    ) : null}

                    {pwValue ? (
                      <>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full transition-all duration-200"
                              style={{
                                width: `${(strength.score / 3) * 100}%`,
                                backgroundColor: strength.color,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground">
                            {strength.label}
                          </span>
                        </div>
                        <ul className="mt-2 grid grid-cols-2 gap-1">
                          {rules.map((r) => (
                            <li
                              key={r.id}
                              className={cn(
                                "flex items-center gap-1.5 text-xs",
                                r.ok ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {r.ok ? (
                                <Check className="h-3 w-3 text-primary" />
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

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        className="pr-10"
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
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full"
                    disabled={submitDisabled}
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      "Update password"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
