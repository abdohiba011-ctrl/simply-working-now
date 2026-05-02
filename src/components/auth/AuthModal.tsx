import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Phone as PhoneIcon,
  User as UserIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAuthModal, consumeAuthResumeState } from "@/contexts/AuthModalContext";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/motonita-mark-light.svg";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+212|00212|0)[67]\d{8}$/;

type View = "login" | "signup" | "forgot" | "forgot-sent";

export function AuthModal() {
  const { isOpen, tab, ctx, closeAuthModal, setTab } = useAuthModal();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);

  const [view, setView] = useState<View>(tab);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Signup state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPwd, setSignupPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");

  // Sync external tab changes (when openAuthModal is called)
  useEffect(() => {
    if (isOpen) {
      setView(tab);
      setError(null);
    }
  }, [isOpen, tab]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSubmitting(false);
      setError(null);
      setPassword("");
      setSignupPwd("");
      setConfirmPwd("");
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeAuthModal]);

  if (!isOpen) return null;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleAfterAuth = (welcomeName?: string) => {
    toast.success(
      welcomeName ? `Welcome${welcomeName ? `, ${welcomeName}` : ""}!` : "Logged in!",
    );
    closeAuthModal();
    const resume = consumeAuthResumeState();
    const target = ctx.returnTo ?? resume?.returnTo;
    if (target) {
      navigate(target);
    }
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(identifier.trim(), password, false, "renter");
      handleAfterAuth(u.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Incorrect email or password";
      setError(msg);
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Please enter your full name");
    if (!EMAIL_REGEX.test(email.trim())) return setError("Enter a valid email");
    if (phone && !PHONE_REGEX.test(phone.replace(/\s+/g, "")))
      return setError("Enter a valid Moroccan phone number");
    if (signupPwd.length < 8) return setError("Password must be at least 8 characters");
    if (!/[A-Z]/.test(signupPwd) || !/\d/.test(signupPwd))
      return setError("Password needs 1 uppercase and 1 number");
    if (signupPwd !== confirmPwd) return setError("Passwords don't match");
    if (!acceptTerms) return setError("You must accept the Terms to continue");

    setSubmitting(true);
    try {
      const u = await signup(
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: signupPwd,
          confirmPassword: confirmPwd,
          acceptTerms: true,
          marketingOptIn: false,
        } as never,
        "renter",
      );
      if (u && (u as { id?: string }).id) {
        handleAfterAuth((u as { name?: string }).name);
      } else {
        toast.success("Check your email to verify your account");
        closeAuthModal();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_REGEX.test(forgotEmail.trim())) return setError("Enter a valid email");
    setSubmitting(true);
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password/new`,
      });
      setView("forgot-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setSubmitting(false);
    }
  };

  const goAgency = (path: "/agency/login" | "/agency/signup") => {
    closeAuthModal();
    navigate(path);
  };

  const passwordStrength = (() => {
    const pw = signupPwd;
    if (!pw) return { score: 0, color: "transparent", label: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (pw.length >= 12 && /[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score: 1, color: "#dc2626", label: "Weak" };
    if (score === 2) return { score: 2, color: "#f59e0b", label: "Medium" };
    return { score: 3, color: "#9FE870", label: "Strong" };
  })();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeAuthModal}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        className={cn(
          "relative bg-white text-[#163300] w-full md:max-w-[440px] md:w-[440px]",
          "h-[100dvh] md:h-auto md:max-h-[90vh] overflow-y-auto",
          "md:rounded-2xl shadow-2xl",
          "animate-in slide-in-from-bottom-4 md:zoom-in-95 fade-in duration-300",
          shake && "animate-[shake_0.4s_ease-in-out]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/5 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 md:p-8 pt-12 md:pt-10">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Motonita" className="h-9 w-auto" />
          </div>

          {/* Context banner */}
          {ctx.bikeName ? (
            <div
              className="mb-4 rounded-md border border-[#163300]/10 bg-[#9FE870]/15 px-3 py-2 text-xs text-[#163300]/80 text-center"
            >
              Log in to book <span className="font-semibold">{ctx.bikeName}</span>
            </div>
          ) : null}

          {/* Tab switcher (login/signup only) */}
          {(view === "login" || view === "signup") && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#163300]/5 mb-5">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setTab("login");
                  setError(null);
                }}
                className={cn(
                  "h-9 rounded-md text-sm font-medium transition-colors",
                  view === "login"
                    ? "bg-white text-[#163300] shadow-sm"
                    : "text-[#163300]/60 hover:text-[#163300]",
                )}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("signup");
                  setTab("signup");
                  setError(null);
                }}
                className={cn(
                  "h-9 rounded-md text-sm font-medium transition-colors",
                  view === "signup"
                    ? "bg-white text-[#163300] shadow-sm"
                    : "text-[#163300]/60 hover:text-[#163300]",
                )}
              >
                Sign up
              </button>
            </div>
          )}

          {/* Error banner */}
          {error ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* LOGIN */}
          {view === "login" && (
            <form onSubmit={onLogin} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="am-id">Email or phone</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#163300]/50" />
                  <Input
                    id="am-id"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    placeholder="you@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-pwd">Password</Label>
                <div className="relative">
                  <Input
                    id="am-pwd"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#163300]/60 hover:text-[#163300]"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setError(null);
                  }}
                  className="text-sm text-[#163300]/70 hover:text-[#163300] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 font-semibold"
                style={{ backgroundColor: "#9FE870", color: "#163300" }}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  "Log in"
                )}
              </Button>

              <p className="text-center text-xs text-[#163300]/60">
                Are you an agency?{" "}
                <button
                  type="button"
                  onClick={() => goAgency("/agency/login")}
                  className="font-medium text-[#163300] hover:underline"
                >
                  Log in to agency dashboard →
                </button>
              </p>
            </form>
          )}

          {/* SIGNUP */}
          {view === "signup" && (
            <form onSubmit={onSignup} className="space-y-3.5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="am-name">Full name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#163300]/50" />
                  <Input
                    id="am-name"
                    autoFocus
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#163300]/50" />
                  <Input
                    id="am-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-phone">Phone (optional)</Label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#163300]/50" />
                  <Input
                    id="am-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+212 6XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-spwd">Password</Label>
                <div className="relative">
                  <Input
                    id="am-spwd"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    value={signupPwd}
                    onChange={(e) => setSignupPwd(e.target.value)}
                    className="pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#163300]/60 hover:text-[#163300]"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signupPwd ? (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full bg-[#163300]/10 transition-colors"
                          style={{
                            backgroundColor:
                              passwordStrength.score >= i ? passwordStrength.color : undefined,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[#163300]/60">
                      {passwordStrength.label} · At least 8 characters, 1 uppercase, 1 number
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#163300]/50">
                    At least 8 characters, 1 uppercase, 1 number
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-cpwd">Confirm password</Label>
                <Input
                  id="am-cpwd"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="h-11"
                />
              </div>
              <label className="flex items-start gap-2 cursor-pointer text-xs text-[#163300]/70">
                <Checkbox
                  checked={acceptTerms}
                  onCheckedChange={(v) => setAcceptTerms(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-medium text-[#163300]"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-medium text-[#163300]"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>
              <Button
                type="submit"
                disabled={submitting || !acceptTerms}
                className="w-full h-11 font-semibold"
                style={{ backgroundColor: "#9FE870", color: "#163300" }}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  "Create account"
                )}
              </Button>
              <p className="text-center text-xs text-[#163300]/60">
                Want to list your bikes?{" "}
                <button
                  type="button"
                  onClick={() => goAgency("/agency/signup")}
                  className="font-medium text-[#163300] hover:underline"
                >
                  Register as agency →
                </button>
              </p>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {view === "forgot" && (
            <form onSubmit={onForgot} className="space-y-4" noValidate>
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError(null);
                }}
                className="inline-flex items-center gap-1 text-sm text-[#163300]/70 hover:text-[#163300]"
              >
                <ArrowLeft className="h-4 w-4" /> Back to login
              </button>
              <div>
                <h2 className="text-xl font-bold">Reset your password</h2>
                <p className="text-sm text-[#163300]/60 mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-femail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#163300]/50" />
                  <Input
                    id="am-femail"
                    type="email"
                    autoFocus
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 font-semibold"
                style={{ backgroundColor: "#9FE870", color: "#163300" }}
              >
                {submitting ? (
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

          {view === "forgot-sent" && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#9FE870]/30 flex items-center justify-center">
                <Mail className="h-6 w-6 text-[#163300]" />
              </div>
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-sm text-[#163300]/70">
                We sent a password reset link to{" "}
                <span className="font-semibold text-[#163300]">{forgotEmail}</span>.
              </p>
              <Button
                type="button"
                onClick={() => {
                  setView("login");
                  setError(null);
                }}
                className="w-full h-11 font-semibold"
                style={{ backgroundColor: "#9FE870", color: "#163300" }}
              >
                Back to login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
