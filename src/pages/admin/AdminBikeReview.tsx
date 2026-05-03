import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Bike as BikeIcon,
  RotateCcw, ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 max-w-6xl">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/bikes/approvals")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to queue
          </Button>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left column */}
            <div className="space-y-4">
              {/* Hero / agency info */}
              <Card className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold">{bike.name}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Submitted {new Date(bike.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusChip status={bike.approval_status} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <Field label="Agency" value={
                    agency ? (
                      <span>
                        {agency.business_name || "—"}{" "}
                        {agency.is_verified && <span className="text-success">✓ Verified</span>}
                      </span>
                    ) : "—"
                  } />
                  <Field label="Contact" value={agency?.phone} />
                  <Field label="City" value={agency?.city} />
                  <Field label="Address" value={agency?.address} />
                </div>
                {bike.approval_status === "rejected" && bike.rejection_reason && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                    <p className="font-semibold text-destructive">Previous rejection reason</p>
                    <p className="mt-1 text-foreground/80 whitespace-pre-wrap">{bike.rejection_reason}</p>
                  </div>
                )}
              </Card>

              <Accordion type="multiple" defaultValue={["s1", "s2", "s3", "s4", "s5"]} className="space-y-3">
                {/* Step 1 — Basic Info */}
                <AccordionItem value="s1" className="rounded-lg border border-border bg-card">
                  <AccordionTrigger className="px-4">📋 Step 1 — Basic Info</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Field label="Name" value={bike.name} />
                      <Field label="Brand" value={bike.brand} />
                      <Field label="Model" value={bike.model} />
                      <Field label="Year" value={bike.year} />
                      <Field label="Color" value={bike.color} />
                      <Field
                        label="Category"
                        value={
                          categoryMeta
                            ? <span>{categoryMeta.icon} {categoryMeta.label}</span>
                            : bike.category
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 2 — Specs */}
                <AccordionItem value="s2" className="rounded-lg border border-border bg-card">
                  <AccordionTrigger className="px-4">⚙️ Step 2 — Specifications</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Field label="Engine" value={bike.engine_cc ? `${bike.engine_cc}cc` : null} />
                      <Field label="Fuel type" value={bike.fuel_type} />
                      <Field label="Transmission" value={bike.transmission} />
                      <Field label="Mileage" value={bike.mileage_km != null ? `${bike.mileage_km.toLocaleString()} km` : null} />
                      <Field label="License required" value={licenseLabel(bike.license_required)} />
                      <Field label="Min age" value={bike.min_age} />
                      <Field label="Min experience" value={bike.min_experience_years != null ? `${bike.min_experience_years} years` : null} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 3 — Included */}
                <AccordionItem value="s3" className="rounded-lg border border-border bg-card">
                  <AccordionTrigger className="px-4">🎁 Step 3 — What's Included</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-3">
                    <Field label="Helmets" value={bike.helmets_count != null ? `${bike.helmets_count} included` : null} />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Features</p>
                      {featureKeys.length === 0 ? (
                        <p className="mt-1 text-sm text-muted-foreground/60">—</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {featureKeys.map((k) => (
                            <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
                              <span>{FEATURE_LABELS[k].icon}</span>
                              {FEATURE_LABELS[k].label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 4 — Photos & Description */}
                <AccordionItem value="s4" className="rounded-lg border border-border bg-card">
                  <AccordionTrigger className="px-4">📸 Step 4 — Photos & Description</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {photos.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border p-6 flex items-center justify-center text-muted-foreground gap-2">
                        <ImageOff className="h-5 w-5" /> No photos uploaded
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {photos.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setLightbox(p.image_url)}
                            className="aspect-square overflow-hidden rounded-md bg-muted border border-border hover:opacity-90"
                          >
                            <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                      <p className={`mt-1 text-sm whitespace-pre-wrap ${empty(bike.description) ? "text-muted-foreground/60" : ""}`}>
                        {empty(bike.description) ? "—" : bike.description}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 5 — Pricing & Policies */}
                <AccordionItem value="s5" className="rounded-lg border border-border bg-card">
                  <AccordionTrigger className="px-4">💰 Step 5 — Pricing & Policies</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Field label="Daily price" value={bike.daily_price != null ? `${bike.daily_price} MAD` : null} />
                      <Field label="Deposit" value={bike.deposit_amount != null ? `${bike.deposit_amount} MAD` : null} />
                      <Field label="Min rental days" value={bike.min_rental_days} />
                      <Field label="Max rental days" value={bike.max_rental_days} />
                      <Field
                        label="Cancellation policy"
                        value={cancellationMeta ? `${cancellationMeta.icon} ${cancellationMeta.title} — ${cancellationMeta.text}` : bike.cancellation_policy}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Right column — sticky action panel */}
            <div className="space-y-4">
              <Card className="p-5 space-y-3 lg:sticky lg:top-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusChip status={bike.approval_status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Photos</span>
                  <span>{photos.length}</span>
                </div>

                {decided && !reReview ? (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-muted-foreground">
                      This bike has already been {bike.approval_status}. Open re-review to change the decision.
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => setReReview(true)}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Re-review
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => setConfirmApprove(true)}
                      disabled={acting}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setRejectOpen(true)}
                      disabled={acting}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Reject with reason
                    </Button>
                  </div>
                )}
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
