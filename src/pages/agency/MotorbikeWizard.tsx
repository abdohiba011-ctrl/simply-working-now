import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ImageIcon, ShieldAlert } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MotorbikeImageManager } from "@/components/agency/MotorbikeImageManager";
import { AgencyVerificationBanner } from "@/components/agency/AgencyVerificationBanner";

type FieldErrors = Partial<
  Record<"name" | "dailyPrice" | "engineCc", string>
>;

// Lightweight Sentry-style logger shim. Replace with real Sentry binding when wired up.
const captureException = (err: unknown, ctx?: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w?.Sentry?.captureException) {
    w.Sentry.captureException(err, { extra: ctx });
  }
};

const MotorbikeWizard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id && id !== "new";
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [bikeId, setBikeId] = useState<string | null>(editing ? id || null : null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Empty by default — agency must enter a real value, never accidentally submit a placeholder.
  const [dailyPrice, setDailyPrice] = useState<string>("");
  const [engineCc, setEngineCc] = useState<string>("");
  const [transmission, setTransmission] = useState("automatic");
  const [fuelType, setFuelType] = useState("petrol");

  const [errors, setErrors] = useState<FieldErrors>({});

  // Verification gate — Save is disabled until the agency is verified.
  const [verifState, setVerifState] = useState<
    "loading" | "verified" | "unverified"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const uid = data.user?.id ?? null;
      setOwnerId(uid);
      if (!uid) {
        setVerifState("unverified");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (!profile?.id) {
        setVerifState("unverified");
        return;
      }
      const { data: agency } = await supabase
        .from("agencies")
        .select("is_verified,verification_status")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (cancelled) return;
      setVerifState(agency?.is_verified ? "verified" : "unverified");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    supabase
      .from("bike_types")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setName(data.name || "");
          setDescription(data.description || "");
          setDailyPrice(data.daily_price != null ? String(data.daily_price) : "");
          setEngineCc(data.engine_cc != null ? String(data.engine_cc) : "");
          setTransmission(data.transmission || "automatic");
          setFuelType(data.fuel_type || "petrol");
          setMainImageUrl(data.main_image_url || null);
        }
        setLoading(false);
      });
  }, [id, editing]);

  const refreshMainImage = async () => {
    if (!bikeId) return;
    const { data } = await supabase
      .from("bike_types")
      .select("main_image_url")
      .eq("id", bikeId)
      .maybeSingle();
    if (data) setMainImageUrl(data.main_image_url || null);
  };

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = "Name is required";
    const price = Number(dailyPrice);
    if (dailyPrice === "" || Number.isNaN(price)) {
      e.dailyPrice = "Daily price is required";
    } else if (price <= 0) {
      e.dailyPrice = "Daily price must be greater than 0";
    }
    const cc = Number(engineCc);
    if (engineCc === "" || Number.isNaN(cc)) {
      e.engineCc = "Engine size is required";
    } else if (cc <= 0) {
      e.engineCc = "Engine size must be greater than 0";
    }
    return e;
  };

  const handleSave = async () => {
    if (verifState !== "verified") {
      toast.error("Verify your shop before saving motorbikes");
      return;
    }
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("You are signed out — please sign in again.");

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        daily_price: Number(dailyPrice),
        engine_cc: Number(engineCc),
        transmission,
        fuel_type: fuelType,
        owner_id: u.user.id,
        ...(editing ? {} : { approval_status: "pending", is_approved: false }),
      };

      if (editing && id) {
        const { error } = await supabase
          .from("bike_types")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        toast.success("Motorbike saved");
        navigate("/agency/motorbikes");
      } else {
        const { data, error } = await supabase
          .from("bike_types")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        toast.success("Motorbike saved");
        setBikeId(data.id);
        navigate("/agency/motorbikes");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to save motorbike";
      // Surface to dev tools and to error tracker so silent failures are visible.
      console.error("[MotorbikeWizard] Save failed:", e);
      captureException(e, { area: "MotorbikeWizard.save", editing, id });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <AgencyLayout>
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      </AgencyLayout>
    );

  const saveDisabled = saving || verifState !== "verified";

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/agency/motorbikes")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {editing ? "Edit motorbike" : "Add motorbike"}
        </h1>

        <AgencyVerificationBanner />

        {verifState === "unverified" && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive"
          >
            <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                Verify your shop to save motorbikes
              </p>
              <p className="text-sm mt-0.5">
                Saving is disabled until your shop is verified by Motonita admins.
              </p>
            </div>
            <Link
              to="/agency/verification"
              className="text-sm font-semibold underline whitespace-nowrap self-center"
            >
              Open verification
            </Link>
          </div>
        )}

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Details</h2>

          <div className="grid gap-2">
            <Label htmlFor="mb-name">Name *</Label>
            <Input
              id="mb-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="Yamaha MT-07"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "mb-name-err" : undefined}
            />
            {errors.name && (
              <p id="mb-name-err" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mb-desc">Description</Label>
            <Textarea
              id="mb-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="mb-price">Daily price (MAD) *</Label>
              <Input
                id="mb-price"
                type="number"
                min={0}
                placeholder="e.g. 300"
                value={dailyPrice}
                onChange={(e) => {
                  setDailyPrice(e.target.value);
                  if (errors.dailyPrice)
                    setErrors((p) => ({ ...p, dailyPrice: undefined }));
                }}
                aria-invalid={!!errors.dailyPrice}
                aria-describedby={errors.dailyPrice ? "mb-price-err" : undefined}
              />
              {errors.dailyPrice && (
                <p id="mb-price-err" className="text-sm text-destructive">
                  {errors.dailyPrice}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mb-cc">Engine (cc) *</Label>
              <Input
                id="mb-cc"
                type="number"
                min={0}
                placeholder="e.g. 125"
                value={engineCc}
                onChange={(e) => {
                  setEngineCc(e.target.value);
                  if (errors.engineCc)
                    setErrors((p) => ({ ...p, engineCc: undefined }));
                }}
                aria-invalid={!!errors.engineCc}
                aria-describedby={errors.engineCc ? "mb-cc-err" : undefined}
              />
              {errors.engineCc && (
                <p id="mb-cc-err" className="text-sm text-destructive">
                  {errors.engineCc}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Transmission</Label>
              <Select value={transmission} onValueChange={setTransmission}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="semi">Semi-auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Fuel</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate("/agency/motorbikes")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveDisabled}
              title={
                verifState !== "verified"
                  ? "Verify your shop to enable saving"
                  : undefined
              }
            >
              {saving ? "Saving…" : "Save details"}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Images</h2>
          </div>
          {bikeId && ownerId ? (
            <MotorbikeImageManager
              bikeTypeId={bikeId}
              ownerId={ownerId}
              initialMainImageUrl={mainImageUrl}
              onChange={refreshMainImage}
            />
          ) : (
            <p className="rounded-md border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              Save the motorbike details first — once it&apos;s created, you&apos;ll be able to
              upload, replace, reorder and delete images here.
            </p>
          )}
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default MotorbikeWizard;
