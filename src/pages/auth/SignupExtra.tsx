import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Building2, ArrowLeft, ShieldCheck, FileText, Eye, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { MockProtectedRoute } from "@/components/auth/MockProtectedRoute";
import { useServiceCities } from "@/hooks/useServiceCities";
import { useMemo } from "react";
import enLocale from "@/locales/en.json";
import frLocale from "@/locales/fr.json";
import arLocale from "@/locales/ar.json";

const locales = { en: enLocale, fr: frLocale, ar: arLocale } as Record<string, any>;
function useT() {
  const lang = useLanguageStore((s) => s.language);
  return (key: string): string => {
    const dict = locales[lang]?.mockAuth ?? locales.en.mockAuth;
    return dict?.[key] ?? key;
  };
}

const PHONE_REGEX = /^(\+212|00212|0)[67]\d{8}$/;

const schema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.string().min(1, "Pick a business type"),
  city: z.string().min(1, "Pick a city"),
  neighborhood: z.string().optional(),
  numBikes: z.string().min(1, "Select number of motorbikes"),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || PHONE_REGEX.test(v.replace(/\s+/g, "")),
      "Enter a valid Moroccan phone",
    ),
});

type FormValues = z.infer<typeof schema>;

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

function SignupExtraInner() {
  const t = useT();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const activateAgencyRole = useAuthStore((s) => s.activateAgencyRole);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      businessName: "",
      businessType: "",
      city: "",
      neighborhood: "",
      numBikes: "",
      phone: user?.phone ?? "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      await activateAgencyRole({
        businessName: data.businessName,
        businessType: data.businessType,
        city: data.city,
        neighborhood: data.neighborhood || undefined,
        numBikes: data.numBikes,
        phone: data.phone || undefined,
      });
      toast.success(t("business_profile_created"));
      navigate("/agency/verification");
    } catch (e) {
      toast.error((e as Error).message || "Could not create profile");
    } finally {
      setSubmitting(false);
    }
  };

  const businessType = watch("businessType");
  const city = watch("city");
  const neighborhood = watch("neighborhood");
  const numBikes = watch("numBikes");

  const { cities: dbCities, locations: dbLocations } = useServiceCities();
  const cityList = useMemo(() => {
    const names = new Set<string>();
    const out: string[] = [];
    for (const c of dbCities) {
      if (!names.has(c.name)) {
        names.add(c.name);
        out.push(c.name);
      }
    }
    for (const c of CITIES) {
      if (!names.has(c)) {
        names.add(c);
        out.push(c);
      }
    }
    return out;
  }, [dbCities]);
  const neighborhoodOptions = useMemo(() => {
    if (!city) return [] as string[];
    const matched = dbCities.find(
      (c) => c.name.toLowerCase() === city.toLowerCase(),
    );
    if (!matched) return [];
    return dbLocations
      .filter((l) => l.city_id === matched.id)
      .map((l) => l.name);
  }, [city, dbCities, dbLocations]);

  const steps = [
    { icon: Building2, label: t("setup_step_1"), active: true },
    { icon: FileText, label: t("setup_step_2") },
    { icon: Eye, label: t("setup_step_3") },
    { icon: Bike, label: t("setup_step_4") },
  ];

  const phoneRequired = !user?.phone;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-[1fr_320px]">
        {/* Left: form */}
        <div className="max-w-[520px]">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </button>

          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#163300" }}>
            {t("create_business_profile")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("signup_extra_sub")}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="businessName">{t("business_name")}</Label>
              <Input
                id="businessName"
                placeholder="Casa Moto Rent"
                className="h-10"
                {...register("businessName")}
              />
              {errors.businessName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            <div>
              <Label>{t("business_type")}</Label>
              <Select
                value={businessType}
                onValueChange={(v) => setValue("businessType", v, { shouldValidate: true })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t("select_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual owner (1 bike)</SelectItem>
                  <SelectItem value="small">Small agency (2-5 bikes)</SelectItem>
                  <SelectItem value="established">
                    Established rental business (6+ bikes)
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.businessType && (
                <p className="mt-1 text-xs text-red-600">{errors.businessType.message}</p>
              )}
            </div>

            <div>
              <Label>{t("city")}</Label>
              <Select
                value={city}
                onValueChange={(v) => setValue("city", v, { shouldValidate: true })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t("select_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && (
                <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>
              )}
            </div>

            <div>
              <Label>{t("num_bikes")}</Label>
              <Select
                value={numBikes}
                onValueChange={(v) => setValue("numBikes", v, { shouldValidate: true })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t("select_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2-5">2-5</SelectItem>
                  <SelectItem value="6-10">6-10</SelectItem>
                  <SelectItem value="10+">10+</SelectItem>
                </SelectContent>
              </Select>
              {errors.numBikes && (
                <p className="mt-1 text-xs text-red-600">{errors.numBikes.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">
                {t("phone")}{" "}
                <span className="text-xs text-muted-foreground">
                  {phoneRequired ? t("required") : t("optional")}
                </span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+212 6..."
                className="h-10"
                {...register("phone", {
                  required: phoneRequired ? "Phone is required" : false,
                })}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting || !isValid}
              className="h-10 w-full"
              style={{ backgroundColor: "#9FE870", color: "#163300" }}
            >
              {submitting ? t("creating_account") : t("create_business_profile")}
            </Button>
          </form>
        </div>

        {/* Right: info panel */}
        <aside className="hidden md:block">
          <div
            className="rounded-xl border border-border p-5"
            style={{ backgroundColor: "rgba(159,232,112,0.06)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" style={{ color: "#163300" }} />
              <h3 className="text-sm font-semibold" style={{ color: "#163300" }}>
                {t("what_happens_next")}
              </h3>
            </div>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={
                      s.active
                        ? { backgroundColor: "#163300", color: "#fff" }
                        : { backgroundColor: "rgba(22,51,0,0.08)", color: "#163300" }
                    }
                  >
                    {i + 1}
                  </div>
                  <div className="text-sm text-foreground/80">{s.label}</div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function SignupExtra() {
  return (
    <MockProtectedRoute>
      <SignupExtraInner />
    </MockProtectedRoute>
  );
}
