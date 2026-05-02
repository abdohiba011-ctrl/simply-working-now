import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ImageIcon, ShieldAlert, MapPin, Info } from "lucide-react";
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
  Record<"name" | "dailyPrice" | "engineCc" | "photos", string>
>;

interface AgencyLocation {
  city: string | null;
  city_id: string | null;
  neighborhood: string | null;
  address: string | null;
}

const MotorbikeWizard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id && id !== "new";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  // For "new" we auto-create a draft row so photos can be uploaded immediately.
  const [bikeId, setBikeId] = useState<string | null>(editing ? id || null : null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [currentStatus, setCurrentStatus] = useState<string>("draft");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dailyPrice, setDailyPrice] = useState<string>("");
  const [engineCc, setEngineCc] = useState<string>("");
  const [transmission, setTransmission] = useState("automatic");
  const [fuelType, setFuelType] = useState("petrol");

  const [agencyLoc, setAgencyLoc] = useState<AgencyLocation>({
    city: null,
    city_id: null,
    neighborhood: null,
    address: null,
  });

  const [errors, setErrors] = useState<FieldErrors>({});

  const [verifState, setVerifState] = useState<
    "loading" | "verified" | "unverified"
  >("loading");

  // Boot: fetch user, agency profile (location), then either load existing
  // bike (edit) or auto-create a draft row (new).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const uid = data.user?.id ?? null;
      setOwnerId(uid);
      if (!uid) {
        setVerifState("unverified");
        setLoading(false);
        return;
      }

      // Resolve agency profile + location
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, business_city, business_address")
        .eq("user_id", uid)
        .maybeSingle();

      let agencyCity: string | null = profile?.business_city ?? null;
      let agencyAddress: string | null = profile?.business_address ?? null;
      let agencyNeighborhood: string | null = null;
      let isVerified = false;

      if (profile?.id) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("is_verified,city,primary_neighborhood,address")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (agency) {
          isVerified = !!agency.is_verified;
          agencyCity = agency.city || agencyCity;
          agencyNeighborhood = agency.primary_neighborhood ?? null;
          agencyAddress = agency.address || agencyAddress;
        }
      }

      // Lookup service_cities by name → UUID
      let cityId: string | null = null;
      if (agencyCity) {
        const { data: cityRow } = await supabase
          .from("service_cities")
          .select("id")
          .ilike("name", agencyCity)
          .maybeSingle();
        cityId = cityRow?.id ?? null;
      }

      if (cancelled) return;
      setAgencyLoc({
        city: agencyCity,
        city_id: cityId,
        neighborhood: agencyNeighborhood,
        address: agencyAddress,
      });
      setVerifState(isVerified ? "verified" : "unverified");

      if (editing && id) {
        const { data: bt } = await supabase
          .from("bike_types")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (bt) {
          setName(bt.name || "");
          setDescription(bt.description || "");
          setDailyPrice(bt.daily_price != null ? String(bt.daily_price) : "");
          setEngineCc(bt.engine_cc != null ? String(bt.engine_cc) : "");
          setTransmission(bt.transmission || "automatic");
          setFuelType(bt.fuel_type || "petrol");
          setMainImageUrl(bt.main_image_url || null);
          setCurrentStatus(bt.approval_status || "draft");
        }
        // photo count
        const { count } = await supabase
          .from("bike_type_images")
          .select("id", { count: "exact", head: true })
          .eq("bike_type_id", id);
        setPhotoCount(count || 0);
        setLoading(false);
      } else if (isVerified) {
        // Auto-create a draft row so photos can be uploaded immediately
        const { data: created, error } = await supabase
          .from("bike_types")
          .insert({
            name: "Untitled draft",
            owner_id: uid,
            daily_price: 0,
            approval_status: "draft",
            business_status: "inactive",
            is_approved: false,
            city_id: cityId,
            neighborhood: agencyNeighborhood,
          })
          .select()
          .single();
        if (error) {
          console.error("[MotorbikeWizard] Could not create draft:", error);
          toast.error("Could not start a new draft. Please try again.");
        } else {
          setBikeId(created.id);
          setCurrentStatus("draft");
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editing]);

  // Refresh photo count + main image whenever the manager reports a change
  const refreshPhotos = async () => {
    if (!bikeId) return;
    const [{ data: bt }, { count }] = await Promise.all([
      supabase
        .from("bike_types")
        .select("main_image_url")
        .eq("id", bikeId)
        .maybeSingle(),
      supabase
        .from("bike_type_images")
        .select("id", { count: "exact", head: true })
        .eq("bike_type_id", bikeId),
    ]);
    if (bt) setMainImageUrl(bt.main_image_url || null);
    setPhotoCount(count || 0);
  };

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!name.trim() || name.trim() === "Untitled draft")
      e.name = "Name is required";
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
    if (photoCount < 1) {
      e.photos = "Add at least one photo";
    }
    return e;
  };

  // Submit for review (or save edits in edit mode)
  const handleSubmit = async () => {
    if (verifState !== "verified") {
      toast.error("Verify your shop before saving motorbikes");
      return;
    }
    if (!bikeId) {
      toast.error("Draft not ready yet — please retry in a moment.");
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
      const isDraftFirstSubmit = !editing && currentStatus === "draft";

      const payload: {
        name: string;
        description: string | null;
        daily_price: number;
        engine_cc: number;
        transmission: string;
        fuel_type: string;
        city_id?: string | null;
        neighborhood?: string | null;
        approval_status?: string;
        business_status?: string;
        is_approved?: boolean;
      } = {
        name: name.trim(),
        description: description.trim() || null,
        daily_price: Number(dailyPrice),
        engine_cc: Number(engineCc),
        transmission,
        fuel_type: fuelType,
      };
      if (isDraftFirstSubmit) {
        payload.city_id = agencyLoc.city_id;
        payload.neighborhood = agencyLoc.neighborhood;
        payload.approval_status = "pending";
        payload.business_status = "inactive";
        payload.is_approved = false;
      }

      const { error: updErr } = await supabase
        .from("bike_types")
        .update(payload)
        .eq("id", bikeId);
      if (updErr) throw updErr;

      // On first submit, also create a matching `bikes` (physical unit) row.
      if (isDraftFirstSubmit) {
        // Resolve agency_id (FK on bikes table)
        let agencyId: string | null = null;
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", ownerId!)
          .maybeSingle();
        if (prof?.id) {
          const { data: ag } = await supabase
            .from("agencies")
            .select("id")
            .eq("profile_id", prof.id)
            .maybeSingle();
          agencyId = ag?.id ?? null;
        }

        const { error: bikeErr } = await supabase
          .from("bikes")
          .insert({
            bike_type_id: bikeId,
            owner_id: ownerId!,
            agency_id: agencyId,
            location: agencyLoc.address || agencyLoc.city || null,
            available: true,
            // approval_status default 'pending' on bikes table
          });
        if (bikeErr) {
          console.error("[MotorbikeWizard] bikes row insert failed:", bikeErr);
          throw new Error(
            `Could not create the inventory record for this motorbike: ${bikeErr.message}`,
          );
        }
      }

      toast.success(
        editing
          ? "Changes saved" +
              (currentStatus === "approved" ? " — bike resubmitted for review" : "")
          : "Submitted for review. We'll notify you within 24-48 hours."
      );
      navigate("/agency/motorbikes");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save motorbike";
      console.error("[MotorbikeWizard] Save failed:", e);
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

  const submitDisabled = saving || verifState !== "verified" || !bikeId;
  const submitLabel = editing
    ? currentStatus === "approved"
      ? "Save & resubmit for review"
      : "Save"
    : "Submit for review";

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
              <p className="font-semibold text-sm">Verify your shop to save motorbikes</p>
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

        {/* Inherited location notice */}
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
              <Link to="/agency/agency-center#profile" className="underline">
                Update agency profile
              </Link>{" "}
              to change.
            </p>
          </div>
        </Card>

        {/* Photos first so users can start uploading immediately */}
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Photos</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {photoCount} uploaded {photoCount === 0 && "· at least 1 required"}
            </span>
          </div>
          {bikeId && ownerId ? (
            <MotorbikeImageManager
              bikeTypeId={bikeId}
              ownerId={ownerId}
              initialMainImageUrl={mainImageUrl}
              onChange={refreshPhotos}
            />
          ) : (
            <p className="rounded-md border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              {verifState === "verified"
                ? "Preparing draft…"
                : "Verify your shop first to upload photos."}
            </p>
          )}
          {errors.photos && (
            <p className="text-sm text-destructive">{errors.photos}</p>
          )}
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Details</h2>

          <div className="grid gap-2">
            <Label htmlFor="mb-name">Name *</Label>
            <Input
              id="mb-name"
              value={name === "Untitled draft" ? "" : name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="Yamaha MT-07"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
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
              />
              {errors.dailyPrice && (
                <p className="text-sm text-destructive">{errors.dailyPrice}</p>
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
              />
              {errors.engineCc && (
                <p className="text-sm text-destructive">{errors.engineCc}</p>
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

          {editing && currentStatus === "approved" && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>
                This bike is currently live. Editing the name, description,
                engine, fuel, transmission, license, min age, or main photo
                will return it to <b>Pending review</b>. Price and availability
                changes do not require re-review.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate("/agency/motorbikes")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitDisabled}
              title={
                verifState !== "verified"
                  ? "Verify your shop to enable saving"
                  : undefined
              }
            >
              {saving ? "Saving…" : submitLabel}
            </Button>
          </div>
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default MotorbikeWizard;
