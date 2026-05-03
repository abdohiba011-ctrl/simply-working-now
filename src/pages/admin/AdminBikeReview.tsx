import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2,
  RotateCcw, ImageOff, AlertTriangle, MapPin, Tag, Settings2, Gift, DollarSign, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { StatusChip } from "@/components/shared/StatusChip";
import {
  BIKE_CATEGORIES, FEATURE_LABELS, FeatureKey,
  licenseLabel, CANCELLATION_OPTIONS,
} from "@/lib/bikeFeatures";
import { TIER_MIN_DAYS, TIER_LABELS, tierSavingsPct, type TierMinDays } from "@/lib/pricingTiers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const QUICK_REASONS = [
  "Photos are unclear or low quality",
  "Missing required information in listing",
  "Inaccurate specifications provided",
  "Pricing information seems incorrect",
  "Other (please write a detailed reason)",
];

interface BikeType {
  id: string;
  name: string;
  description: string | null;
  daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  deposit_amount: number | null;
  min_rental_days: number | null;
  max_rental_days: number | null;
  cancellation_policy: string | null;
  helmets_count: number | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  category: string | null;
  mileage_km: number | null;
  engine_cc: number | null;
  transmission: string | null;
  fuel_type: string | null;
  license_required: string | null;
  min_age: number | null;
  min_experience_years: number | null;
  year: number | null;
  features: string[] | null;
  approval_status: string;
  business_status: string;
  main_image_url: string | null;
  owner_id: string | null;
  city_id: string | null;
  neighborhood: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  created_at: string;
}

const empty = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-0.5 text-sm ${empty(value) ? "text-muted-foreground/60" : "font-medium"}`}>
      {empty(value) ? "—" : value}
    </p>
  </div>
);

const AdminBikeReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [bike, setBike] = useState<BikeType | null>(null);
  const [photos, setPhotos] = useState<{ id: string; image_url: string }[]>([]);
  const [agency, setAgency] = useState<{ business_name: string | null; city: string | null; primary_neighborhood: string | null; address: string | null; is_verified: boolean | null; phone: string | null } | null>(null);
  const [bikeCityName, setBikeCityName] = useState<string | null>(null);
  const [tiers, setTiers] = useState<{ min_days: number; daily_price_mad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [reason, setReason] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [reReview, setReReview] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: bt }, { data: imgs }] = await Promise.all([
      supabase.from("bike_types").select("*").eq("id", id).maybeSingle(),
      supabase.from("bike_type_images").select("id, image_url").eq("bike_type_id", id).order("display_order"),
    ]);
    setBike(bt as BikeType | null);
    setPhotos((imgs as { id: string; image_url: string }[]) || []);

    if (bt?.owner_id) {
      const { data: prof } = await supabase
        .from("profiles").select("id, phone").eq("user_id", bt.owner_id).maybeSingle();
      if (prof?.id) {
        const { data: ag } = await supabase
          .from("agencies")
          .select("business_name, city, primary_neighborhood, address, is_verified, phone")
          .eq("profile_id", prof.id).maybeSingle();
        setAgency(ag as typeof agency);
      }
    }
    if (bt?.city_id) {
      const { data: c } = await supabase
        .from("service_cities").select("name").eq("id", bt.city_id).maybeSingle();
      setBikeCityName(c?.name ?? null);
    } else {
      setBikeCityName(null);
    }
    const { data: tierRows } = await supabase
      .from("bike_pricing_tiers")
      .select("min_days, daily_price_mad")
      .eq("bike_type_id", id)
      .order("min_days", { ascending: true });
    setTiers((tierRows as any[]) || []);

    setLoading(false);
  };

  useEffect(() => {
    if (!id || !isAuthenticated || !isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated, isAdmin]);

  const handleApprove = async () => {
    if (!id) return;
    setActing(true);
    const { error } = await supabase.rpc("approve_bike_type" as never, { p_bike_type_id: id } as never);
    setActing(false);
    setConfirmApprove(false);
    if (error) { toast.error(error.message || "Failed to approve"); return; }
    toast.success("Bike approved and now live on Motonita");
    navigate("/admin/bikes/approvals");
  };

  const handleReject = async () => {
    if (!id) return;
    if (reason.trim().length < 20) {
      toast.error("Reason must be at least 20 characters");
      return;
    }
    setActing(true);
    const { error } = await supabase.rpc("reject_bike_type" as never, {
      p_bike_type_id: id, p_reason: reason.trim(),
    } as never);
    setActing(false);
    setRejectOpen(false);
    if (error) { toast.error(error.message || "Failed to reject"); return; }
    toast.success("Bike rejected and agency notified");
    navigate("/admin/bikes/approvals");
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!bike) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Bike not found</h1>
          <Button className="mt-4" onClick={() => navigate("/admin/bikes/approvals")}>
            Back to queue
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const categoryMeta = BIKE_CATEGORIES.find((c) => c.key === bike.category);
  const cancellationMeta = CANCELLATION_OPTIONS.find(
    (c) => c.key === (bike.cancellation_policy || "moderate"),
  );
  const featureKeys = (bike.features || []).filter(
    (f): f is FeatureKey => f in FEATURE_LABELS,
  );
  const decided = bike.approval_status === "approved" || bike.approval_status === "rejected";
  const actionsDisabled = decided && !reReview;

  const tierMap = new Map<number, number>(
    tiers.map((t) => [Number(t.min_days), Number(t.daily_price_mad)]),
  );
  const baseRate = tierMap.get(1) ?? 0;
  const warnings: string[] = [];
  if ((bike.deposit_amount ?? 0) === 0) warnings.push("Deposit = 0 MAD");
  if (photos.length < 4) warnings.push(`Only ${photos.length} photo${photos.length === 1 ? "" : "s"} (recommend 4+)`);
  if (baseRate > 500) warnings.push("Base rate > 500 MAD/day — verify");
  if (tiers.some((t) => Number(t.min_days) > 1 && baseRate > 0 && Number(t.daily_price_mad) > baseRate))
    warnings.push("A higher-duration tier costs more than base rate");
  if (baseRate > 0 && tiers.length <= 1) warnings.push("Only base tier set — no volume discounts");

  const SectionTitle = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/bikes/approvals")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold sm:text-lg">
                {bike.name} {bike.year ? <span className="text-muted-foreground font-normal">({bike.year})</span> : null}
              </h1>
            </div>
            <StatusChip status={bike.approval_status} />
            {decided && !reReview ? (
              <Button variant="outline" size="sm" onClick={() => setReReview(true)}>
                <RotateCcw className="mr-1 h-4 w-4" /> Re-review
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={() => setConfirmApprove(true)} disabled={acting}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setRejectOpen(true)}
                  disabled={acting}
                >
                  <XCircle className="mr-1 h-4 w-4" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="container mx-auto max-w-6xl px-4 py-4 space-y-3">
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.map((w) => (
                <div key={w} className="flex items-center gap-2 rounded-md bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1.5 text-xs text-yellow-800 dark:text-yellow-300">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {bike.approval_status === "rejected" && bike.rejection_reason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <p className="font-semibold text-destructive">Previous rejection reason</p>
              <p className="mt-1 text-foreground/80 whitespace-pre-wrap">{bike.rejection_reason}</p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            {/* LEFT (60%) */}
            <div className="space-y-4">
              {/* Photos */}
              <Card className="p-4">
                <SectionTitle icon={ImageOff}>Photos ({photos.length})</SectionTitle>
                {photos.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                    <ImageOff className="h-4 w-4" /> No photos uploaded
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLightbox(p.image_url)}
                        className="overflow-hidden rounded-md bg-muted border border-border hover:opacity-90"
                        style={{ width: 120, height: 120 }}
                      >
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* Description */}
              {!empty(bike.description) && (
                <Card className="p-4">
                  <SectionTitle icon={Tag}>Description</SectionTitle>
                  <p className={`text-sm whitespace-pre-wrap ${(bike.description?.length ?? 0) > 200 ? "line-clamp-4" : ""}`}>
                    {bike.description}
                  </p>
                </Card>
              )}

              {/* Details grid */}
              <Card className="p-4">
                <SectionTitle icon={Settings2}>Details</SectionTitle>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <Field label="Brand" value={bike.brand} />
                  <Field label="Engine" value={bike.engine_cc ? `${bike.engine_cc}cc` : null} />
                  <Field label="Model" value={bike.model} />
                  <Field label="Fuel" value={bike.fuel_type} />
                  <Field label="Year" value={bike.year} />
                  <Field label="Transmission" value={bike.transmission} />
                  <Field label="Color" value={bike.color} />
                  <Field label="Mileage" value={bike.mileage_km != null ? `${bike.mileage_km.toLocaleString()} km` : null} />
                  <Field
                    label="Category"
                    value={categoryMeta ? <span>{categoryMeta.icon} {categoryMeta.label}</span> : bike.category}
                  />
                  <Field label="License" value={licenseLabel(bike.license_required)} />
                  <Field label="Min age" value={bike.min_age} />
                  <Field label="Min experience" value={bike.min_experience_years != null ? `${bike.min_experience_years}y` : null} />
                </div>
              </Card>

              {/* Included */}
              <Card className="p-4">
                <SectionTitle icon={Gift}>What's Included</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {(bike.helmets_count ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                      🪖 {bike.helmets_count} helmet{(bike.helmets_count ?? 0) > 1 ? "s" : ""}
                    </span>
                  )}
                  {featureKeys.map((k) => (
                    <span key={k} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                      <span>{FEATURE_LABELS[k].icon}</span>
                      {FEATURE_LABELS[k].label}
                    </span>
                  ))}
                  {featureKeys.length === 0 && (bike.helmets_count ?? 0) === 0 && (
                    <span className="text-xs text-muted-foreground">— None specified</span>
                  )}
                </div>
              </Card>

              {/* Policies */}
              <Card className="p-4">
                <SectionTitle icon={DollarSign}>Policies</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Deposit</p>
                    <p className="font-medium">{bike.deposit_amount != null ? `${bike.deposit_amount} MAD` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Min days</p>
                    <p className="font-medium">{bike.min_rental_days ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max days</p>
                    <p className="font-medium">{bike.max_rental_days ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cancel</p>
                    <p className="font-medium">{cancellationMeta ? `${cancellationMeta.icon} ${cancellationMeta.title}` : "—"}</p>
                  </div>
                </div>
              </Card>

              {/* Location */}
              <Card className="p-4">
                <SectionTitle icon={MapPin}>Location</SectionTitle>
                <p className="text-sm">
                  {[bikeCityName, bike.neighborhood].filter(Boolean).join(" · ") || "—"}
                </p>
              </Card>
            </div>

            {/* RIGHT (40%) */}
            <div className="space-y-4">
              {/* Agency Info */}
              <Card className="p-4">
                <SectionTitle icon={Building2}>Agency</SectionTitle>
                {agency ? (
                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium">
                      {agency.business_name || "—"}{" "}
                      {agency.is_verified && <span className="text-success text-xs">✓ Verified</span>}
                    </p>
                    {agency.phone && <p className="text-muted-foreground text-xs">📞 {agency.phone}</p>}
                    {agency.city && <p className="text-muted-foreground text-xs">📍 {agency.city}</p>}
                    {agency.address && <p className="text-muted-foreground text-xs">{agency.address}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Submitted {new Date(bike.created_at).toLocaleDateString()}
                </p>
              </Card>

              {/* Pricing tiers */}
              <Card className="p-4">
                <SectionTitle icon={DollarSign}>Pricing Tiers</SectionTitle>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-xs">Duration</TableHead>
                        <TableHead className="h-8 text-xs">Rate</TableHead>
                        <TableHead className="h-8 text-xs">Save</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {TIER_MIN_DAYS.map((md) => {
                        const rate = tierMap.get(md);
                        const set = rate != null;
                        const pct = set && md > 1 ? tierSavingsPct(baseRate, rate!) : 0;
                        return (
                          <TableRow key={md}>
                            <TableCell className="py-1.5 text-xs font-medium">{TIER_LABELS[md as TierMinDays]}</TableCell>
                            <TableCell className={`py-1.5 text-xs ${set ? "" : "text-muted-foreground/60"}`}>
                              {set ? `${rate} MAD` : "—"}
                            </TableCell>
                            <TableCell className={`py-1.5 text-xs ${pct > 0 ? "text-primary font-semibold" : "text-muted-foreground/60"}`}>
                              {md === 1 ? "—" : pct > 0 ? `${pct}%` : set ? "0%" : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
          {lightbox && <img src={lightbox} alt="" className="w-full h-auto" />}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject "{bike.name}"</DialogTitle>
            <DialogDescription>
              The agency will see this reason and can edit and resubmit.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setReason(q.startsWith("Other") ? "" : q)}
                className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs hover:bg-muted/70"
              >
                {q}
              </button>
            ))}
          </div>

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Reason for rejection (minimum 20 characters)"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground">{reason.trim().length}/20 chars min</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={acting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={acting || reason.trim().length < 20}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject and notify agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve confirm */}
      <Dialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve and publish "{bike.name}"?</DialogTitle>
            <DialogDescription>
              This bike will become visible on public listings immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApprove(false)} disabled={acting}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBikeReview;
