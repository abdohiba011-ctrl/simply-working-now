import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, AlertCircle, Loader2 } from "lucide-react";

import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/auth/OtpInput";
import { useAuthStore } from "@/stores/useAuthStore";
import { getResetResendCooldownMs, type AuthError } from "@/lib/mockAuth";

const CODE_LENGTH = 6;

export default function RenterResetPasswordVerify() {
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
      navigate("/renter/forgot-password", { replace: true });
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
      navigate(`/renter/reset-password/new?token=${encodeURIComponent(token)}`);
    } catch (err) {
      const e = err as AuthError;
      setError(e.message);
      triggerShake();
      clearDigits();
      if (e.code === "INVALID_CODE" && e.attemptsLeft === 0) {
        toast.message("New code sent!");
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
      toast.success("New code sent!");
      setCooldownMs(getResetResendCooldownMs(email));
      clearDigits();
    } catch (err) {
      const e = err as AuthError;
      setError(e.message);
      if (e.retryAfterMs) setCooldownMs(e.retryAfterMs);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                    <KeyRound className="h-9 w-9 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Enter reset code
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-foreground">
                      {email}
                    </span>
                    . Enter it below to reset your password.
                  </p>
                </div>

                {error ? (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                {expired ? (
                  <div className="text-center">
                    <Button
                      variant="hero"
                      onClick={() => navigate("/renter/forgot-password")}
                    >
                      Request new code
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
                      variant="hero"
                      onClick={() => handleSubmit()}
                      disabled={!allFilled || submitting}
                      className="w-full"
                    >
                      {submitting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying...
                        </span>
                      ) : (
                        "Verify code"
                      )}
                    </Button>

                    <div className="text-center space-y-2">
                      {cooldownMs > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Resend in {Math.ceil(cooldownMs / 1000)}s
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend}
                          className="text-sm font-medium text-primary underline underline-offset-2 hover:no-underline"
                        >
                          Didn't receive it? Resend code
                        </button>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => navigate("/renter/forgot-password")}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Wrong email?
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
