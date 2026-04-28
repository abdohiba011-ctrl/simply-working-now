import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";

import { AgencyAuthLayout } from "@/components/auth/AgencyAuthLayout";
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

// Neighborhoods by city (per project knowledge). Cities not listed fall back to free text.
const NEIGHBORHOODS: Record<string, string[]> = {
  Casablanca: [
    "Anfa",
    "Maârif",
    "Derb Sultan",
    "Sidi Maârouf",
    "Aïn Diab",
    "Gauthier",
    "Bourgogne",
    "Hay Hassani",
    "Sidi Bernoussi",
    "Ain Sebaa",
  ],
  Marrakech: ["Guéliz", "Médina", "Hivernage", "Palmeraie", "Daoudiate", "Agdal"],
  Rabat: ["Agdal", "Hassan", "Souissi", "Médina", "Hay Riad"],
  Tangier: ["Malabata", "Centre-Ville", "Marshan", "Iberia", "Playa"],
  Agadir: ["Centre-Ville", "Founty", "Talborjt"],
  Fes: ["Médina (Fes el-Bali)", "Ville Nouvelle", "Fes el-Jdid", "Aïn Chkef"],
};

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual owner (1 bike)" },
  { value: "small", label: "Small agency (2-5 bikes)" },
  { value: "established", label: "Established rental business (6+ bikes)" },
  { value: "other", label: "Other" },
];

function formatMoroccanPhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  if (!digits) return "";
  let core = digits;
  if (core.startsWith("00212")) core = "+212" + core.slice(5);
  else if (core.startsWith("212") && !core.startsWith("+")) core = "+" + core;
  else if (core.startsWith("0")) core = "+212" + core.slice(1);

  if (!core.startsWith("+212")) return digits.slice(0, 13);
  const rest = core.slice(4);
  const grouped = [
    rest.slice(0, 1),
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
      phone: z.string().trim().optional().or(z.literal("")),
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string(),
      acceptTerms: z.literal(true, {
        errorMap: () => ({ message: "You must accept the terms to continue" }),
      }),
      marketingOptIn: z.boolean().optional(),
      businessName: z.string().optional(),
      businessType: z.string().optional(),
      city: z.string().optional(),
      neighborhood: z.string().optional(),
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
        if (!data.neighborhood || data.neighborhood.trim().length < 2)
          ctx.addIssue({
            path: ["neighborhood"],
            code: z.ZodIssueCode.custom,
            message: "Select or enter a neighborhood",
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

  const role: "renter" | "agency" = defaultRole ?? "renter";
  const isAgencyFlow = role === "agency";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (isAuthenticated && authedUser) {
      navigateAfterAuth(navigate, authedUser, defaultRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const schema = useMemo(() => buildSchema(role), [role]);

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
      neighborhood: "",
    },
  });

  const pwValue = form.watch("password");
  const rules = passwordRules(pwValue ?? "");
  const strength = passwordStrength(pwValue ?? "");
  const cityValue = form.watch("city");
  const neighborhoodOptions = cityValue ? NEIGHBORHOODS[cityValue] ?? [] : [];

  const handleNext = async () => {
    const ok = await form.trigger([
      "name",
      "email",
      "phone",
      "password",
      "confirmPassword",
    ]);
    if (ok) setStep(2);
  };

  const onSubmit = async (values: SignupValues) => {
    setServerError(null);

    const existing = await checkAccountMethod(values.email);
    if (existing.status === "has_password") {
      setServerError(
        t("mockAuth.signup_email_taken", {
          defaultValue:
            "An account with this email already exists. Try logging in instead.",
        }),
      );
      if (isAgencyFlow) setStep(1);
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
          numBikes: undefined,
          marketingOptIn: values.marketingOptIn,
        },
        role,
      );
      toast.success(
        t("mockAuth.account_created", {
          defaultValue: "Account created! Check your email for the 6-character verification code.",
        }),
      );
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      const e = err as Error;
      setServerError(e.message);
    }
  };

  // ---------------- AGENCY (split-screen wizard) ----------------
  if (isAgencyFlow) {
    return (
      <AgencyAuthLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(159,232,112,0.2)", color: "#163300" }}
            >
              <Building2 className="h-3 w-3" />
              {t("mockAuth.agency_pill", { defaultValue: "For rental agencies" })}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("mockAuth.create_agency_account", {
                defaultValue: "Create your agency account",
              })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === 1
                ? t("agencyAuth.step1_subtitle", {
                    defaultValue: "Step 1 of 2 — Your account details",
                  })
                : t("agencyAuth.step2_subtitle", {
                    defaultValue: "Step 2 of 2 — Your business",
                  })}
            </p>
          </div>

          {/* Stepper */}
          <Stepper step={step} />

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
            {step === 1 ? (
              <div className="space-y-4 animate-in fade-in duration-200">
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

                <Field
                  id="email"
                  label={t("agencyAuth.email", { defaultValue: "Email" })}
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

                <Field
                  id="phone"
                  label={t("mockAuth.phone", { defaultValue: "Phone" })}
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

                <PasswordField
                  id="password"
                  label={t("mockAuth.password", { defaultValue: "Password" })}
                  error={form.formState.errors.password?.message}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  register={form.register("password")}
                />
                {pwValue ? (
                  <StrengthMeter strength={strength} rules={rules} />
                ) : null}

                <PasswordField
                  id="confirmPassword"
                  label={t("mockAuth.confirm_password", {
                    defaultValue: "Confirm password",
                  })}
                  error={form.formState.errors.confirmPassword?.message}
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  register={form.register("confirmPassword")}
                />

                <Button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-10 rounded-md text-sm font-semibold mt-2"
                  style={{ backgroundColor: "#9FE870", color: "#163300" }}
                >
                  {t("agencyAuth.next", { defaultValue: "Continue" })}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Field
                  id="businessName"
                  label={t("agencyAuth.brand_name", {
                    defaultValue: "Business / brand name",
                  })}
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
                  label={t("mockAuth.business_type", {
                    defaultValue: "Business type",
                  })}
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
                      onValueChange={(v) => {
                        form.setValue("city", v, { shouldValidate: true });
                        form.setValue("neighborhood", "", { shouldValidate: false });
                      }}
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
                    id="neighborhood"
                    label={t("agencyAuth.neighborhood", {
                      defaultValue: "Neighborhood",
                    })}
                    error={form.formState.errors.neighborhood?.message}
                  >
                    {neighborhoodOptions.length > 0 ? (
                      <Select
                        value={form.watch("neighborhood")}
                        onValueChange={(v) =>
                          form.setValue("neighborhood", v, { shouldValidate: true })
                        }
                      >
                        <SelectTrigger
                          id="neighborhood"
                          className="h-10 rounded-md text-sm"
                        >
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {neighborhoodOptions.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="neighborhood"
                        placeholder={
                          cityValue
                            ? "e.g. Centre-Ville"
                            : "Pick a city first"
                        }
                        disabled={!cityValue}
                        className="h-10 rounded-md text-sm"
                        {...form.register("neighborhood")}
                      />
                    )}
                  </Field>
                </div>

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
                      {t("mockAuth.agree_terms_prefix", {
                        defaultValue: "I agree to Motonita's",
                      })}{" "}
                      <a href="/terms" target="_blank" rel="noreferrer" className="underline text-foreground">
                        {t("mockAuth.terms_of_service", { defaultValue: "Terms of Service" })}
                      </a>{" "}
                      {t("mockAuth.and", { defaultValue: "and" })}{" "}
                      <a href="/privacy-policy" target="_blank" rel="noreferrer" className="underline text-foreground">
                        {t("mockAuth.privacy_policy", { defaultValue: "Privacy Policy" })}
                      </a>
                    </span>
                  </label>
                  {form.formState.errors.acceptTerms ? (
                    <p className="text-xs text-red-600 ms-6">
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

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-10 rounded-md text-sm font-semibold gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t("agencyAuth.back", { defaultValue: "Back" })}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-10 rounded-md text-sm font-semibold"
                    style={{ backgroundColor: "#9FE870", color: "#163300" }}
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("mockAuth.creating_account", {
                          defaultValue: "Creating account...",
                        })}
                      </span>
                    ) : (
                      t("mockAuth.create_account_btn", {
                        defaultValue: "Create account",
                      })
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("mockAuth.already_account", {
              defaultValue: "Already have an account?",
            })}{" "}
            <Link
              to="/agency/login"
              className="font-medium hover:underline text-foreground"
            >
              {t("mockAuth.login", { defaultValue: "Log in" })}
            </Link>
          </p>
        </div>
      </AgencyAuthLayout>
    );
  }

  // ---------------- RENTER (single page) ----------------
  return (
    <AgencyAuthLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("mockAuth.create_account", { defaultValue: "Create your account" })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("mockAuth.join_motonita", {
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

          <Field
            id="email"
            label={t("agencyAuth.email", { defaultValue: "Email" })}
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

          <Field
            id="phone"
            label={
              <>
                {t("mockAuth.phone", { defaultValue: "Phone" })}{" "}
                <span className="text-xs font-normal text-muted-foreground/80">
                  {t("mockAuth.optional", { defaultValue: "(optional)" })}
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

          <PasswordField
            id="password"
            label={t("mockAuth.password", { defaultValue: "Password" })}
            error={form.formState.errors.password?.message}
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            register={form.register("password")}
          />
          {pwValue ? <StrengthMeter strength={strength} rules={rules} /> : null}

          <PasswordField
            id="confirmPassword"
            label={t("mockAuth.confirm_password", { defaultValue: "Confirm password" })}
            error={form.formState.errors.confirmPassword?.message}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            register={form.register("confirmPassword")}
          />

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
                <a href="/terms" target="_blank" rel="noreferrer" className="underline text-foreground">
                  {t("mockAuth.terms_of_service", { defaultValue: "Terms of Service" })}
                </a>{" "}
                {t("mockAuth.and", { defaultValue: "and" })}{" "}
                <a href="/privacy-policy" target="_blank" rel="noreferrer" className="underline text-foreground">
                  {t("mockAuth.privacy_policy", { defaultValue: "Privacy Policy" })}
                </a>
              </span>
            </label>
            {form.formState.errors.acceptTerms ? (
              <p className="text-xs text-red-600 ms-6">
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
                {t("mockAuth.send_updates", { defaultValue: "Send me product updates and tips" })}
              </span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
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

        <p className="text-center text-sm text-muted-foreground">
          {t("mockAuth.already_account", { defaultValue: "Already have an account?" })}{" "}
          <Link to="/login" className="font-medium hover:underline text-foreground">
            {t("mockAuth.login", { defaultValue: "Log in" })}
          </Link>
        </p>
      </div>
    </AgencyAuthLayout>
  );
}

// ============== Subcomponents ==============

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      <StepDot n={1} active={step === 1} done={step > 1} label="Account" />
      <div className="flex-1 h-px bg-border" />
      <StepDot n={2} active={step === 2} done={false} label="Business" />
    </div>
  );
}

function StepDot({
  n,
  active,
  done,
  label,
}: {
  n: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border",
          active && "border-transparent text-[#163300]",
          done && "border-transparent text-[#163300]",
          !active && !done && "border-border text-muted-foreground bg-background",
        )}
        style={
          active || done
            ? { backgroundColor: "#9FE870" }
            : undefined
        }
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </span>
      <span
        className={cn(
          "text-xs font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function PasswordField({
  id,
  label,
  error,
  show,
  onToggle,
  register,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  show: boolean;
  onToggle: () => void;
  register: ReturnType<ReturnType<typeof useForm<SignupValues>>["register"]>;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          className="h-10 rounded-md pe-10 text-sm"
          {...register}
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={onToggle}
          className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

function StrengthMeter({
  strength,
  rules,
}: {
  strength: { score: 0 | 1 | 2 | 3; label: string; color: string };
  rules: { id: string; label: string; ok: boolean }[];
}) {
  return (
    <div>
      <div className="mt-1 flex items-center gap-2">
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
    </div>
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
