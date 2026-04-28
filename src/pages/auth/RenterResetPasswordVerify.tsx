import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2, MailCheck } from "lucide-react";

import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { type AuthError } from "@/lib/mockAuth";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;

export default function RenterResetPasswordVerify() {
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
    if (!email) navigate("/renter/forgot-password", { replace: true });
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
      navigate(`/renter/reset-password/new?token=${encodeURIComponent(token)}`, { replace: true });
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
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                    <MailCheck className="h-9 w-9 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">Enter reset code</h1>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit reset code to <span className="font-semibold text-foreground">{email}</span>.
                  </p>
                </div>

                {error ? (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
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
                      className="h-12 w-12 rounded-md border border-input bg-background text-center text-xl font-semibold text-foreground outline-none transition-all focus:ring-2 focus:ring-ring"
                    />
                  ))}
                </div>

                <Button onClick={handleSubmit} disabled={!allFilled || submitting} variant="hero" className="w-full">
                  {submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verifying...</span> : "Verify code"}
                </Button>

                <button type="button" onClick={() => navigate("/renter/forgot-password")} className="mx-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" /> Wrong email?
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}