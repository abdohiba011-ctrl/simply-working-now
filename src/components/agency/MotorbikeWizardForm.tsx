import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ImageIcon, ShieldAlert, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MotorbikeImageManager } from "@/components/agency/MotorbikeImageManager";
import { AgencyVerificationBanner } from "@/components/agency/AgencyVerificationBanner";
import {
  BIKE_BRANDS, BIKE_CATEGORIES, LICENSE_OPTIONS, CANCELLATION_OPTIONS,
  FEATURE_ORDER, FEATURE_LABELS, FeatureKey,
} from "@/lib/bikeFeatures";
import { cn } from "@/lib/utils";
import { TIER_MIN_DAYS, TIER_LABELS, type BikePricingTier, type TierMinDays, tierSavingsPct } from "@/lib/pricingTiers";

type StepKey = "info" | "specs" | "included" | "photos" | "pricing";
const STEPS: { key: StepKey; label: string }[] = [
  { key: "info",     label: "Info" },
  { key: "specs",    label: "Specs" },
  { key: "included", label: "Included" },
  { key: "photos",   label: "Photos" },
  { key: "pricing",  label: "Pricing" },
];

interface AgencyLocation {
  city: string | null;
  city_id: string | null;
  neighborhood: string | null;
  address: string | null;
}

const CURRENT_YEAR = new Date().getFullYear();

export interface MotorbikeWizardFormProps {
  /** Existing bike id for edit; omit / "new" for create. */
  bikeId?: string;
  /** Called when the user clicks the top back / save & exit. */
  onExit: () => void;
  /** Called after a successful submit (new id passed back). */
  onSaved: (id: string) => void;
  /** Show the inner top "Back / Save & exit" row. Default true. */
  showHeader?: boolean;
}

export const MotorbikeWizardForm = ({
  bikeId: bikeIdProp,
  onExit,
  onSaved,
  showHeader = true,
}: MotorbikeWizardFormProps) => {
  const editing = !!bikeIdProp && bikeIdProp !== "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [bikeId, setBikeId] = useState<string | null>(editing ? bikeIdProp || null : null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [initialPhotoIds, setInitialPhotoIds] = useState<string[]>([]);
  const [initialMainImageUrl, setInitialMainImageUrl] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>("draft");
  const [stepIdx, setStepIdx] = useState(0);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [color, setColor] = useState("");
  const [category, setCategory] = useState("");

  const [engineCc, setEngineCc] = useState<string>("");
  const [fuelType, setFuelType] = useState("petrol");
  const [transmission, setTransmission] = useState("automatic");
  const [mileageKm, setMileageKm] = useState<string>("");
  const [licenseRequired, setLicenseRequired] = useState("A1");
  const [minAge, setMinAge] = useState<string>("18");
  const [minExperience, setMinExperience] = useState<string>("0");

  const [helmetIncluded, setHelmetIncluded] = useState(true);
  const [helmetsCount, setHelmetsCount] = useState<string>("1");
  const [features, setFeatures] = useState<Set<FeatureKey>>(new Set(["helmet"]));

  const [description, setDescription] = useState("");

  // Tiered pricing: tierPrices[min_days] = string ("" = not set). 1+ is required.
  const [tierPrices, setTierPrices] = useState<Record<TierMinDays, string>>({
    1: "", 3: "", 7: "", 15: "", 30: "",
  });
  const [depositAmount, setDepositAmount] = useState<string>("1500");
  const [minRentalDays, setMinRentalDays] = useState<string>("1");
  const [maxRentalDays, setMaxRentalDays] = useState<string>("30");
  const [cancellationPolicy, setCancellationPolicy] = useState<string>("moderate");

  const [agencyLoc, setAgencyLoc] = useState<AgencyLocation>({
    city: null, city_id: null, neighborhood: null, address: null,
  });
  const [verifState, setVerifState] = useState<"loading" | "verified" | "unverified">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const uid = data.user?.id ?? null;
      setOwnerId(uid);
      if (!uid) { setVerifState("unverified"); setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, business_city, business_address")
        .eq("user_id", uid).maybeSingle();

      let agencyCity: string | null = profile?.business_city ?? null;
      let agencyAddress: string | null = profile?.business_address ?? null;
      let agencyNeighborhood: string | null = null;
      let isVerified = false;

      if (profile?.id) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("is_verified,city,primary_neighborhood,address")
          .eq("profile_id", profile.id).maybeSingle();
        if (agency) {
          isVerified = !!agency.is_verified;
          agencyCity = agency.city || agencyCity;
          agencyNeighborhood = agency.primary_neighborhood ?? null;
          agencyAddress = agency.address || agencyAddress;
        }
      }

      let cityId: string | null = null;
      if (agencyCity) {
        const { data: cityRow } = await supabase
          .from("service_cities").select("id").ilike("name", agencyCity).maybeSingle();
        cityId = cityRow?.id ?? null;
      }

      if (cancelled) return;
      setAgencyLoc({ city: agencyCity, city_id: cityId, neighborhood: agencyNeighborhood, address: agencyAddress });
      setVerifState(isVerified ? "verified" : "unverified");

      if (editing && bikeIdProp) {
        const { data: bt } = await supabase.from("bike_types").select("*").eq("id", bikeIdProp).maybeSingle();
        if (bt) {
          const b: any = bt;
          setName(b.name === "Untitled draft" ? "" : (b.name || ""));
          setBrand(b.brand || "");
          setModel(b.model || "");
          setYear(b.year != null ? String(b.year) : "");
          setColor(b.color || "");
          setCategory(b.category || "");
          setEngineCc(b.engine_cc != null ? String(b.engine_cc) : "");
          setFuelType(b.fuel_type || "petrol");
          setTransmission(b.transmission || "automatic");
          setMileageKm(b.mileage_km != null ? String(b.mileage_km) : "");
          setLicenseRequired(b.license_required || "A1");
          setMinAge(String(b.min_age ?? 18));
          setMinExperience(String(b.min_experience_years ?? 0));
          setHelmetsCount(String(b.helmets_count ?? 1));
          setHelmetIncluded((b.helmets_count ?? 0) > 0);
          const feats: FeatureKey[] = (b.features || []).filter((f: string) =>
            (FEATURE_ORDER as string[]).includes(f)) as FeatureKey[];
          setFeatures(new Set(feats));
          setDescription(b.description || "");
          // dailyPrice replaced by tier table — load below
          const initialBase = b.daily_price != null ? String(b.daily_price) : "";
          setDepositAmount(String(b.deposit_amount ?? 1500));
          setMinRentalDays(String(b.min_rental_days ?? 1));
          setMaxRentalDays(String(b.max_rental_days ?? 30));
          setCancellationPolicy(b.cancellation_policy || "moderate");
          setMainImageUrl(b.main_image_url || null);
          setInitialMainImageUrl(b.main_image_url || null);
          setCurrentStatus(b.approval_status || "draft");
        }
        const { data: imgRows } = await supabase
          .from("bike_type_images").select("id").eq("bike_type_id", bikeIdProp);
        const ids = (imgRows || []).map((r: { id: string }) => r.id);
        setInitialPhotoIds(ids);
        setPhotoCount(ids.length);
        setLoading(false);
      } else if (isVerified) {
        const { data: created, error } = await supabase
          .from("bike_types")
          .insert({
            name: "Untitled draft", owner_id: uid, daily_price: 0,
            approval_status: "draft", business_status: "inactive", is_approved: false,
            city_id: cityId, neighborhood: agencyNeighborhood,
          }).select().single();
        if (error) { toast.error("Could not start a new draft."); }
        else { setBikeId(created.id); setCurrentStatus("draft"); }
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bikeIdProp, editing]);

  const refreshPhotos = async () => {
    if (!bikeId) return;
    const [{ data: bt }, { count }] = await Promise.all([
      supabase.from("bike_types").select("main_image_url").eq("id", bikeId).maybeSingle(),
      supabase.from("bike_type_images").select("id", { count: "exact", head: true }).eq("bike_type_id", bikeId),
    ]);
    if (bt) setMainImageUrl(bt.main_image_url || null);
    setPhotoCount(count || 0);
  };

  const persistDraft = async (): Promise<boolean> => {
    if (!bikeId) return false;
    const yr = Number(year);
    const cc = Number(engineCc);
    const mk = Number(mileageKm);
    const dp = Number(dailyPrice);
    const dep = Number(depositAmount);
    const minR = Number(minRentalDays);
    const maxR = Number(maxRentalDays);

    const featuresArr = Array.from(features);
    if (helmetIncluded && !featuresArr.includes("helmet")) featuresArr.push("helmet");
    if (!helmetIncluded) {
      const i = featuresArr.indexOf("helmet"); if (i >= 0) featuresArr.splice(i, 1);
    }

    const payload = {
      name: name.trim() || "Untitled draft",
      brand: brand || null,
      model: model || null,
      year: Number.isFinite(yr) && yr > 0 ? yr : null,
      color: color || null,
      category: category || null,
      engine_cc: Number.isFinite(cc) && cc > 0 ? cc : null,
      fuel_type: fuelType,
      transmission,
      mileage_km: Number.isFinite(mk) && mk >= 0 ? mk : null,
      license_required: licenseRequired,
      min_age: Number(minAge) || 18,
      min_experience_years: Number(minExperience) || 0,
      helmets_count: helmetIncluded ? Math.max(1, Number(helmetsCount) || 1) : 0,
      features: featuresArr,
      description: description.trim() || null,
      daily_price: Number.isFinite(dp) && dp > 0 ? dp : 0,
      deposit_amount: Number.isFinite(dep) && dep >= 0 ? dep : 0,
      min_rental_days: Number.isFinite(minR) && minR > 0 ? minR : 1,
      max_rental_days: Number.isFinite(maxR) && maxR > 0 ? maxR : 30,
      cancellation_policy: cancellationPolicy,
    };
    const { error } = await supabase.from("bike_types").update(payload).eq("id", bikeId);
    if (error) { toast.error("Could not save draft: " + error.message); return false; }
    return true;
  };

  const stepErrors = (idx: number): string[] => {
    const errs: string[] = [];
    if (idx === 0) {
      if (!name.trim()) errs.push("Bike name is required");
      if (!brand) errs.push("Brand is required");
      if (!model.trim()) errs.push("Model is required");
      const y = Number(year);
      if (!y || y < 2005 || y > CURRENT_YEAR) errs.push(`Year must be between 2005 and ${CURRENT_YEAR}`);
      if (!color.trim()) errs.push("Color is required");
      if (!category) errs.push("Category is required");
    } else if (idx === 1) {
      const cc = Number(engineCc);
      if (!cc || cc <= 0) errs.push("Engine size is required");
      if (!fuelType) errs.push("Fuel type is required");
      if (!transmission) errs.push("Transmission is required");
      if (mileageKm === "" || Number(mileageKm) < 0) errs.push("Mileage is required");
      if (!licenseRequired) errs.push("License requirement is required");
    } else if (idx === 3) {
      if (photoCount < 1) errs.push("At least one photo is required");
      const d = description.trim();
      if (d.length < 50) errs.push("Description must be at least 50 characters");
      if (d.length > 1000) errs.push("Description must be 1000 characters or fewer");
    } else if (idx === 4) {
      if (!dailyPrice || Number(dailyPrice) <= 0) errs.push("Daily price is required");
      if (depositAmount === "" || Number(depositAmount) < 0) errs.push("Deposit amount is required");
      const minR = Number(minRentalDays), maxR = Number(maxRentalDays);
      if (!minR || minR < 1) errs.push("Min rental days must be at least 1");
      if (!maxR || maxR < minR) errs.push("Max rental days must be ≥ min");
    }
    return errs;
  };

  const goNext = async () => {
    const errs = stepErrors(stepIdx);
    if (errs.length) { toast.error(errs[0]); return; }
    if (verifState !== "verified") { toast.error("Verify your shop to save"); return; }
    setSaving(true);
    const ok = await persistDraft();
    setSaving(false);
    if (!ok) return;
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  const saveAndExit = async () => {
    if (!bikeId) { onExit(); return; }
    setSaving(true);
    await persistDraft();
    setSaving(false);
    toast.success("Draft saved");
    onExit();
  };

  const handleSubmit = async () => {
    for (let i = 0; i < STEPS.length; i++) {
      const errs = stepErrors(i);
      if (errs.length) {
        setStepIdx(i);
        toast.error(errs[0]);
        return;
      }
    }
    if (!bikeId) return;
    setSaving(true);
    try {
      const isDraftFirstSubmit = !editing && currentStatus === "draft";

      // Fetch previous DB values BEFORE persisting so diffs are accurate
      let prev: any = null;
      let prevImageIds: string[] = [];
      if (editing && (currentStatus === "approved" || currentStatus === "rejected")) {
        const [{ data: prevRow }, { data: imgRows }] = await Promise.all([
          supabase
            .from("bike_types")
            .select("description,brand,model,year,category,engine_cc,fuel_type,transmission,license_required,main_image_url")
            .eq("id", bikeId).maybeSingle(),
          supabase.from("bike_type_images").select("id").eq("bike_type_id", bikeId),
        ]);
        prev = prevRow;
        prevImageIds = ((imgRows as { id: string }[] | null) || []).map((r) => r.id);
      }

      const ok = await persistDraft();
      if (!ok) { setSaving(false); return; }

      let triggerChanged = false;
      let photosChanged = false;
      if (editing && (currentStatus === "approved" || currentStatus === "rejected")) {
        if (prev) {
          const yr = Number(year);
          const cc = Number(engineCc);
          triggerChanged =
            (prev.description || "") !== (description.trim() || "") ||
            (prev.brand || "") !== (brand || "") ||
            (prev.model || "") !== (model || "") ||
            (prev.year ?? -1) !== (Number.isFinite(yr) && yr > 0 ? yr : -1) ||
            (prev.category || "") !== (category || "") ||
            (prev.engine_cc ?? -1) !== (Number.isFinite(cc) && cc > 0 ? cc : -1) ||
            (prev.fuel_type || "") !== (fuelType || "") ||
            (prev.transmission || "") !== (transmission || "") ||
            (prev.license_required || "") !== (licenseRequired || "");
        }
        const { data: nowImgRows } = await supabase.from("bike_type_images").select("id").eq("bike_type_id", bikeId);
        const currentIds = ((nowImgRows as { id: string }[] | null) || []).map((r) => r.id).sort();
        const baselineIds = [...prevImageIds].sort();
        const idsDiffer =
          currentIds.length !== baselineIds.length ||
          currentIds.some((v, i) => v !== baselineIds[i]);
        const mainChanged = (prev?.main_image_url || "") !== (initialMainImageUrl || "");
        photosChanged = idsDiffer || mainChanged;
      }


      if (isDraftFirstSubmit) {
        const { error: updErr } = await supabase
          .from("bike_types")
          .update({
            city_id: agencyLoc.city_id,
            neighborhood: agencyLoc.neighborhood,
            approval_status: "pending",
            business_status: "inactive",
            is_approved: false,
          }).eq("id", bikeId);
        if (updErr) throw updErr;

        let agencyId: string | null = null;
        const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", ownerId!).maybeSingle();
        if (prof?.id) {
          const { data: ag } = await supabase.from("agencies").select("id").eq("profile_id", prof.id).maybeSingle();
          agencyId = ag?.id ?? null;
        }
        const { error: bikeErr } = await supabase.from("bikes").insert({
          bike_type_id: bikeId, owner_id: ownerId!, agency_id: agencyId,
          location: agencyLoc.address || agencyLoc.city || null, available: true,
        });
        if (bikeErr) throw bikeErr;
      }

      if (!editing) {
        toast.success("Submitted for review. We'll notify you within 24-48 hours.");
      } else if (photosChanged && !triggerChanged) {
        toast.message("Bike submitted for review", {
          description: "Photo changes require admin approval, so this bike is currently hidden from search.",
        });
      } else if (triggerChanged) {
        toast.message("Bike submitted for review", {
          description: "Changes to photos/specs require admin approval. Currently hidden from search.",
        });
      } else {
        toast.success("Bike updated. Changes are live.");
      }
      onSaved(bikeId);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save motorbike";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (k: FeatureKey) => {
    setFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const isLast = stepIdx === STEPS.length - 1;
  const submitLabel = editing ? "Update bike" : "Submit for review";

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-1">
        <div className="mx-auto max-w-3xl space-y-4 pb-6 py-[12px] px-[16px]">
          {showHeader && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={onExit}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <button onClick={saveAndExit} className="text-sm font-medium text-foreground/70 hover:text-foreground underline-offset-2 hover:underline">
                Save & exit
              </button>
            </div>
          )}
          <h2 className="text-2xl font-bold tracking-tight">{editing ? "Edit motorbike" : "Add motorbike"}</h2>

          <AgencyVerificationBanner />

          {verifState === "unverified" && (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
              <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Verify your shop to save motorbikes</p>
                <p className="text-sm mt-0.5">Saving is disabled until your shop is verified.</p>
              </div>
              <Link to="/agency/verification" className="text-sm font-semibold underline self-center">Open verification</Link>
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <div key={s.key} className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => i < stepIdx && setStepIdx(i)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      active && "bg-[#9FE870] text-[#163300]",
                      done && "bg-[#163300] text-white",
                      !active && !done && "bg-muted text-muted-foreground"
                    )}
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/30 text-[10px]">
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
                </div>
              );
            })}
          </div>

          <Card className="flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Pickup location</p>
              <p className="text-muted-foreground">
                {agencyLoc.city || "—"}
                {agencyLoc.neighborhood ? ` · ${agencyLoc.neighborhood}` : ""}
                {agencyLoc.address ? ` · ${agencyLoc.address}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                📍 Set by your agency profile.{" "}
                <Link to="/agency/agency-center#profile" className="underline">Update agency profile</Link>{" "}to change.
              </p>
            </div>
          </Card>

          {stepIdx === 0 && (
            <Card className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Basic info</h3>
              <div className="grid gap-2">
                <Label>Bike name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='e.g. "Honda PCX 160 — Black Edition"' />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Brand *</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      {BIKE_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Model *</Label>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. PCX 160" />
                </div>
                <div className="grid gap-2">
                  <Label>Year *</Label>
                  <Input type="number" min={2005} max={CURRENT_YEAR} value={year} onChange={(e) => setYear(e.target.value)} placeholder={String(CURRENT_YEAR)} />
                </div>
                <div className="grid gap-2">
                  <Label>Color *</Label>
                  <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Black" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Category *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {BIKE_CATEGORIES.map((c) => (
                    <button
                      key={c.key} type="button" onClick={() => setCategory(c.key)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm transition",
                        category === c.key ? "border-[#9FE870] bg-[#9FE870]/10" : "border-border hover:border-primary/40"
                      )}
                    >
                      <span className="text-2xl">{c.icon}</span>
                      <span className="font-medium">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {stepIdx === 1 && (
            <Card className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Specifications</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Engine (cc) *</Label>
                  <Input type="number" min={0} value={engineCc} onChange={(e) => setEngineCc(e.target.value)} placeholder="e.g. 125" />
                </div>
                <div className="grid gap-2">
                  <Label>Fuel *</Label>
                  <Select value={fuelType} onValueChange={setFuelType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol">⛽ Petrol</SelectItem>
                      <SelectItem value="electric">⚡ Electric</SelectItem>
                      <SelectItem value="hybrid">🔋 Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Transmission *</Label>
                  <Select value={transmission} onValueChange={setTransmission}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="semi">Semi-automatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Mileage (km) *</Label>
                  <Input type="number" min={0} value={mileageKm} onChange={(e) => setMileageKm(e.target.value)} placeholder="e.g. 8400" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>License required *</Label>
                <Select value={licenseRequired} onValueChange={setLicenseRequired}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LICENSE_OPTIONS.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Minimum age</Label>
                  <Input type="number" min={16} value={minAge} onChange={(e) => setMinAge(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Minimum experience (years)</Label>
                  <Input type="number" min={0} value={minExperience} onChange={(e) => setMinExperience(e.target.value)} />
                </div>
              </div>
            </Card>
          )}

          {stepIdx === 2 && (
            <Card className="space-y-5 p-6">
              <h3 className="text-lg font-semibold">What's included</h3>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Helmet(s) included</p>
                  <p className="text-xs text-muted-foreground">Provided to renter at pickup</p>
                </div>
                <Switch checked={helmetIncluded} onCheckedChange={setHelmetIncluded} />
              </div>
              {helmetIncluded && (
                <div className="grid gap-2">
                  <Label>How many helmets?</Label>
                  <Input type="number" min={1} max={4} value={helmetsCount} onChange={(e) => setHelmetsCount(e.target.value)} className="max-w-[120px]" />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Other items</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEATURE_ORDER.filter((f) => f !== "helmet").map((k) => {
                    const meta = FEATURE_LABELS[k];
                    const checked = features.has(k);
                    return (
                      <label key={k} className={cn(
                        "flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition",
                        checked ? "border-[#9FE870] bg-[#9FE870]/10" : "border-border hover:border-primary/40"
                      )}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleFeature(k)} />
                        <span className="text-lg">{meta.icon}</span>
                        <span className="text-sm font-medium">{meta.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {stepIdx === 3 && (
            <>
              <Card className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Photos</h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {photoCount} uploaded {photoCount === 0 && "· at least 1 required"}
                  </span>
                </div>
                {bikeId && ownerId ? (
                  <MotorbikeImageManager bikeTypeId={bikeId} ownerId={ownerId} initialMainImageUrl={mainImageUrl} onChange={refreshPhotos} />
                ) : (
                  <p className="rounded-md border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">Preparing draft…</p>
                )}
              </Card>
              <Card className="space-y-4 p-6">
                <h3 className="text-lg font-semibold">Description</h3>
                <Textarea
                  rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000}
                  placeholder="Describe your bike's condition, special features, recent maintenance, what makes it great to rent..."
                />
                <p className="text-xs text-muted-foreground">{description.trim().length}/1000 (min 50)</p>
              </Card>
            </>
          )}

          {stepIdx === 4 && (
            <Card className="space-y-5 p-6">
              <h3 className="text-lg font-semibold">Pricing & policies</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Daily price (MAD) *</Label>
                  <Input type="number" min={0} value={dailyPrice} onChange={(e) => setDailyPrice(e.target.value)} placeholder="e.g. 300" />
                </div>
                <div className="grid gap-2">
                  <Label>Deposit (MAD) *</Label>
                  <Input type="number" min={0} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Refundable deposit collected at pickup</p>
                </div>
                <div className="grid gap-2">
                  <Label>Min rental days</Label>
                  <Input type="number" min={1} value={minRentalDays} onChange={(e) => setMinRentalDays(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Max rental days</Label>
                  <Input type="number" min={1} value={maxRentalDays} onChange={(e) => setMaxRentalDays(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Cancellation policy</Label>
                <RadioGroup value={cancellationPolicy} onValueChange={setCancellationPolicy} className="space-y-2">
                  {CANCELLATION_OPTIONS.map((o) => (
                    <label key={o.key} className={cn(
                      "flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition",
                      cancellationPolicy === o.key ? "border-[#9FE870] bg-[#9FE870]/10" : "border-border hover:border-primary/40"
                    )}>
                      <RadioGroupItem value={o.key} className="mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{o.icon} {o.title}</p>
                        <p className="text-xs text-muted-foreground">{o.text}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky footer nav (works inside both modal and page layouts) */}
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur p-3">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-3">
          <Button variant="outline" onClick={goBack} disabled={stepIdx === 0 || saving}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
          <span className="text-xs text-muted-foreground">Step {stepIdx + 1} of {STEPS.length}</span>
          {isLast ? (
            <Button onClick={handleSubmit} disabled={saving || verifState !== "verified"}>
              {saving ? "Saving…" : submitLabel}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={saving || verifState !== "verified"}>
              {saving ? "Saving…" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotorbikeWizardForm;
