import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Bike,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/useAuthStore";
import { COMMON_PASSWORDS } from "@/lib/mockAuth";
import { cn } from "@/lib/utils";
import { navigateAfterAuth } from "@/lib/routeAfterAuth";
import { checkAccountMethod } from "@/lib/checkAccountMethod";

const PHONE_REGEX = /^(\+212|00212|0)[67]\d{8}$/;

const CITIES = [
  "Casablanca",
  "Marrakech",
  "Rabat",
  "Tangier",
  "Agadir",
  "Fes",
  "Dakhla",
  "Essaouira",
  "Meknes",
  "Oujda",
  "Tetouan",
  "El Jadida",
  "Kenitra",
  "Nador",
  "Ifrane",
  "Chefchaouen",
  "Other",
];

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual owner (1 bike)" },
  { value: "small", label: "Small agency (2-5 bikes)" },
  { value: "established", label: "Established rental business (6+ bikes)" },
  { value: "other", label: "Other" },
];

const NUM_BIKES = ["1", "2-5", "6-10", "10+"];

function formatMoroccanPhone(value: string): string {
  // Strip everything except digits and leading +
  const digits = value.replace(/[^\d+]/g, "");
  if (!digits) return "";
  let core = digits;
  if (core.startsWith("00212")) core = "+212" + core.slice(5);
  else if (core.startsWith("212") && !core.startsWith("+")) core = "+" + core;
  else if (core.startsWith("0")) core = "+212" + core.slice(1);

  if (!core.startsWith("+212")) {
    // Not normalisable yet — return as-is
    return digits.slice(0, 13);
  }
  const rest = core.slice(4); // after +212
  const grouped = [
    rest.slice(0, 1), // 6 or 7
    rest.slice(1, 3),
    rest.slice(3, 5),
    rest.slice(5, 7),
    rest.slice(7, 9),
  ]
    .filter(Boolean)
    .join(" ");
  return `+212 ${grouped}`.trim();
}

function buildSchema(role: "renter" | "agency") {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Please enter your full name")
        .max(100, "Name is too long"),
      email: z.string().email("Enter a valid email").max(255),
      phone: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string(),
      acceptTerms: z.literal(true, {
        errorMap: () => ({ message: "You must accept the terms to continue" }),
      }),
      marketingOptIn: z.boolean().optional(),
      businessName: z.string().optional(),
      businessType: z.string().optional(),
      city: z.string().optional(),
      numBikes: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // password match
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          path: ["confirmPassword"],
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match",
        });
      }

      // password complexity
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
      // can't contain email local-part or name
      const emailLocal = data.email.split("@")[0]?.toLowerCase();
      if (emailLocal && emailLocal.length >= 3 && pw.toLowerCase().includes(emailLocal))
        ctx.addIssue({
          path: ["password"],
          code: z.ZodIssueCode.custom,
          message: "Password can't contain parts of your email",
        });
      if (
        data.name &&
        data.name.trim().length >= 3 &&
        pw.toLowerCase().includes(data.name.trim().toLowerCase().split(" ")[0])
      )
        ctx.addIssue({
          path: ["password"],
          code: z.ZodIssueCode.custom,
          message: "Password can't contain your name",
        });

      // phone — required for agency, optional for renter
      const phone = (data.phone ?? "").replace(/\s+/g, "");
      if (role === "agency" && !phone) {
        ctx.addIssue({
          path: ["phone"],
          code: z.ZodIssueCode.custom,
          message: "Phone is required",
        });
      }
      if (phone && !PHONE_REGEX.test(phone)) {
        ctx.addIssue({
          path: ["phone"],
          code: z.ZodIssueCode.custom,
          message: "Enter a valid Moroccan phone number",
        });
      }

      // business-only fields
      if (role === "agency") {
        if (!data.businessName || data.businessName.trim().length < 2)
          ctx.addIssue({
            path: ["businessName"],
            code: z.ZodIssueCode.custom,
            message: "Business name is required",
          });
        if (!data.businessType)
          ctx.addIssue({
            path: ["businessType"],
            code: z.ZodIssueCode.custom,
            message: "Select a business type",
          });
        if (!data.city)
          ctx.addIssue({
            path: ["city"],
            code: z.ZodIssueCode.custom,
            message: "Select a city",
          });
        if (!data.numBikes)
          ctx.addIssue({
            path: ["numBikes"],
            code: z.ZodIssueCode.custom,
            message: "Select an option",
          });
      }
    });
}

type SignupValues = z.infer<ReturnType<typeof buildSchema>>;

function passwordRules(pw: string) {
  return [
    { id: "length", label: "8+ characters", ok: pw.length >= 8 },
    { id: "upper", label: "1 uppercase", ok: /[A-Z]/.test(pw) },
    { id: "lower", label: "1 lowercase", ok: /[a-z]/.test(pw) },
    { id: "number", label: "1 number", ok: /\d/.test(pw) },
  ];
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
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

interface SignupProps {
  defaultRole?: "renter" | "agency";
}

export default function Signup({ defaultRole }: SignupProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authedUser = useAuthStore((s) => s.user);

  const [role, setRole] = useState<"renter" | "agency" | null>(
    defaultRole ?? "renter",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Already logged in? send them to their dashboard.
  useEffect(() => {
    if (isAuthenticated && authedUser) {
      navigateAfterAuth(navigate, authedUser, defaultRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const schema = useMemo(() => buildSchema(role ?? "renter"), [role]);

  const form = useForm<SignupValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: undefined as unknown as true,
      marketingOptIn: false,
      businessName: "",
      businessType: "",
      city: "",
      numBikes: "",
    },
  });

  // Re-run validation when the role changes
  useEffect(() => {
    if (role) form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const pwValue = form.watch("password");
  const rules = passwordRules(pwValue ?? "");
  const strength = passwordStrength(pwValue ?? "");

  const onSubmit = async (values: SignupValues) => {
    if (!role) return;
    setServerError(null);

    // Pre-flight: refuse to create a duplicate account for the same email.
    // This catches the common typo case (e.g. you already have an account
    // with that email but added/removed a letter by mistake).
    const existing = await checkAccountMethod(values.email);
    if (existing.status === "has_password") {
      setServerError(
        t("mockAuth.signup_email_taken", {
          defaultValue:
            "An account with this email already exists. Try logging in instead.",
        }),
      );
      return;
    }

    try {
      await signup(
        {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          password: values.password,
          businessName: values.businessName,
          businessType: values.businessType,
          city: values.city,
          numBikes: values.numBikes,
          marketingOptIn: values.marketingOptIn,
        },
        role,
      );
      toast.success(
        t("mockAuth.account_created", {
          defaultValue: "Account created! Check your email to verify.",
        }),
      );
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      const e = err as Error;
      setServerError(e.message);
    }
  };

  const isAgencyFlow = defaultRole === "agency";

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          {isAgencyFlow ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(159,232,112,0.2)", color: "#163300" }}
            >
              <Building2 className="h-3 w-3" />
              {t("mockAuth.agency_pill", { defaultValue: "For rental agencies" })}
            </span>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isAgencyFlow
              ? t("mockAuth.create_agency_account", { defaultValue: "Create your agency account" })
              : t("mockAuth.create_account", { defaultValue: "Create your account" })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAgencyFlow
              ? t("mockAuth.agency_subtitle", {
                  defaultValue:
                    "List your motorbikes and start earning. Includes a 30-day free Pro trial — no card required.",
                })
              : t("mockAuth.join_motonita", {
                  defaultValue: "Join Morocco's peer-to-peer motorbike marketplace",
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

        {/* Agency flow shows a small renter cross-link; renter flow shows nothing (no toggle) */}
        {isAgencyFlow ? (
          <p className="text-xs text-muted-foreground">
            {t("mockAuth.not_business_prefix", { defaultValue: "Just want to rent a bike?" })}{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="font-semibold underline underline-offset-2 hover:opacity-80 text-foreground"
            >
              {t("mockAuth.not_business_link", { defaultValue: "Sign up as a renter instead" })}
            </button>
          </p>
        ) : null}

        {/* Step 2 — form (fade in) */}
        {role ? (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 animate-in fade-in duration-200"
            noValidate
          >
            {/* Full name */}
            <Field
              id="name"
              label={t("mockAuth.full_name", { defaultValue: "Full name" })}
              error={form.formState.errors.name?.message}
            >
              <Input
                id="name"
                autoComplete="name"
                className="h-10 rounded-md text-sm"
                {...form.register("name")}
              />
            </Field>

            {/* Email */}
            <Field
              id="email"
              label={t("mockAuth.email_or_phone", { defaultValue: "Email" }).split(" ")[0]}
              error={form.formState.errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="h-10 rounded-md text-sm"
                {...form.register("email")}
              />
            </Field>

            {/* Phone */}
            <Field
              id="phone"
              label={
                <>
                  {t("mockAuth.phone", { defaultValue: "Phone" })}{" "}
                  <span className="text-xs font-normal text-muted-foreground/80">
                    {role === "agency"
                      ? t("mockAuth.required", { defaultValue: "(required)" })
                      : t("mockAuth.optional", { defaultValue: "(optional)" })}
                  </span>
                </>
              }
              error={form.formState.errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+212 6..."
                className="h-10 rounded-md text-sm"
                value={form.watch("phone")}
                onChange={(e) =>
                  form.setValue("phone", formatMoroccanPhone(e.target.value), {
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
                onBlur={() => form.trigger("phone")}
              />
            </Field>

            {/* Password */}
            <Field
              id="password"
              label={t("mockAuth.password", { defaultValue: "Password" })}
              error={form.formState.errors.password?.message}
            >
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwValue ? (
                <>
                  {/* Strength bar */}
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
                    <span
                      className="text-xs font-medium text-foreground"
                      style={
                        strength.color === "#9FE870" || strength.color === "transparent"
                          ? undefined
                          : { color: strength.color }
                      }
                    >
                      {strength.label}
                    </span>
                  </div>

                  {/* Rules */}
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
            </Field>

            {/* Confirm password */}
            <Field
              id="confirmPassword"
              label={t("mockAuth.confirm_password", { defaultValue: "Confirm password" })}
              error={form.formState.errors.confirmPassword?.message}
            >
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
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {/* Business-only fields */}
            {role === "agency" ? (
              <div className="space-y-4 pt-2 border-t border-border">
                <Field
                  id="businessName"
                  label={t("mockAuth.business_name", { defaultValue: "Business name" })}
                  error={form.formState.errors.businessName?.message}
                >
                  <Input
                    id="businessName"
                    placeholder="Casa Moto Rent"
                    className="h-10 rounded-md text-sm"
                    {...form.register("businessName")}
                  />
                </Field>

                <Field
                  id="businessType"
                  label={t("mockAuth.business_type", { defaultValue: "Business type" })}
                  error={form.formState.errors.businessType?.message}
                >
                  <Select
                    value={form.watch("businessType")}
                    onValueChange={(v) =>
                      form.setValue("businessType", v, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="businessType" className="h-10 rounded-md text-sm">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    id="city"
                    label={t("mockAuth.city", { defaultValue: "City" })}
                    error={form.formState.errors.city?.message}
                  >
                    <Select
                      value={form.watch("city")}
                      onValueChange={(v) => form.setValue("city", v, { shouldValidate: true })}
                    >
                      <SelectTrigger id="city" className="h-10 rounded-md text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CITIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field
                    id="numBikes"
                    label={t("mockAuth.num_bikes_short", { defaultValue: "Motorbikes" })}
                    error={form.formState.errors.numBikes?.message}
                  >
                    <Select
                      value={form.watch("numBikes")}
                      onValueChange={(v) =>
                        form.setValue("numBikes", v, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger id="numBikes" className="h-10 rounded-md text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {NUM_BIKES.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            ) : null}

            {/* Terms */}
            <div className="space-y-2 pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  className="mt-0.5"
                  checked={!!form.watch("acceptTerms")}
                  onCheckedChange={(v) =>
                    form.setValue("acceptTerms", (v ? true : undefined) as true, {
                      shouldValidate: true,
                    })
                  }
                />
                <span className="text-sm text-foreground">
                  {t("mockAuth.agree_terms_prefix", { defaultValue: "I agree to Motonita's" })}{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-foreground"
                  >
                    {t("mockAuth.terms_of_service", { defaultValue: "Terms of Service" })}
                  </a>{" "}
                  {t("mockAuth.and", { defaultValue: "and" })}{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-foreground"
                  >
                    {t("mockAuth.privacy_policy", { defaultValue: "Privacy Policy" })}
                  </a>
                </span>
              </label>
              {form.formState.errors.acceptTerms ? (
                <p className="text-xs text-red-600 ml-6">
                  {form.formState.errors.acceptTerms.message}
                </p>
              ) : null}

              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  className="mt-0.5"
                  checked={!!form.watch("marketingOptIn")}
                  onCheckedChange={(v) => form.setValue("marketingOptIn", Boolean(v))}
                />
                <span className="text-sm text-muted-foreground">
                  {t("mockAuth.send_updates", {
                    defaultValue: "Send me product updates and tips",
                  })}
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="w-full h-10 rounded-md text-sm font-semibold"
              style={{ backgroundColor: "#9FE870", color: "#163300" }}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("mockAuth.creating_account", { defaultValue: "Creating account..." })}
                </span>
              ) : (
                t("mockAuth.create_account_btn", { defaultValue: "Create account" })
              )}
            </Button>
          </form>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          {t("mockAuth.already_account", { defaultValue: "Already have an account?" })}{" "}
          <Link
            to="/login"
            className="font-medium hover:underline text-foreground"
          >
            {t("mockAuth.login", { defaultValue: "Log in" })}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function RoleCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "h-32 rounded-lg border-2 p-4 text-left transition-all flex flex-col gap-2",
        selected
          ? "bg-[#9FE870]/10 border-[#9FE870]"
          : "bg-card hover:bg-muted border-border",
      )}
    >
      {icon}
      <div>
        <div className="text-base font-semibold text-foreground">
          {title}
        </div>
        <div className="text-xs text-muted-foreground">
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}
