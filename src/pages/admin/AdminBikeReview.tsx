import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { StatusChip } from "@/components/shared/StatusChip";
import { BikeDetailCard, type BikeDetailAgency, type BikeDetailPickup } from "@/components/bike/BikeDetailCard";

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


const AdminBikeReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [bike, setBike] = useState<BikeType | null>(null);
  const [photos, setPhotos] = useState<{ id: string; image_url: string }[]>([]);
  const [agency, setAgency] = useState<{ business_name: string | null; city: string | null; primary_neighborhood: string | null; address: string | null; is_verified: boolean | null; phone: string | null; working_hours: unknown | null } | null>(null);
  const [bikeCityName, setBikeCityName] = useState<string | null>(null);
  const [tiers, setTiers] = useState<{ min_days: number; daily_price_mad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [reason, setReason] = useState("");
  
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
          .select("business_name, city, primary_neighborhood, address, is_verified, phone, working_hours")
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
      <AdminLayout>
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Bike not found</h1>
          <Button className="mt-4" onClick={() => navigate("/admin/bikes/approvals")}>
            Back to queue
          </Button>
        </main>
      </AdminLayout>
    );
  }

  const decided = bike.approval_status === "approved" || bike.approval_status === "rejected";

  const pickup: BikeDetailPickup = {
    city: bikeCityName,
    neighborhood: bike.neighborhood,
    address: null,
    usingAgencyFallback: false,
  };

  return (
    <AdminLayout>
      <main className="flex-1">
        {/* Sticky header */}
        <div className="sticky top-14 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="container mx-auto max-w-6xl px-4 h-10 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/bikes/approvals")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold sm:text-base">
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

        <div className="container mx-auto max-w-6xl px-4 py-3">
          <BikeDetailCard
            bike={bike as any}
            photos={photos}
            tiers={tiers}
            agency={agency as BikeDetailAgency | null}
            pickup={pickup}
            mode="admin"
          />
        </div>
      </main>

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
    </AdminLayout>
  );
};

export default AdminBikeReview;
