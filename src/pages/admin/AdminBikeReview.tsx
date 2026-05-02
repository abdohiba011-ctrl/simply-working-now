import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Bike as BikeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { StatusChip } from "@/components/shared/StatusChip";

const QUICK_REASONS = [
  "Photos are unclear or low quality",
  "Bike specs don't match the photos",
  "Description is incomplete or misleading",
  "Required information missing",
  "Pricing seems unrealistic",
];

interface BikeType {
  id: string;
  name: string;
  description: string | null;
  daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  engine_cc: number | null;
  transmission: string | null;
  fuel_type: string | null;
  license_required: string | null;
  min_age: number | null;
  year: number | null;
  features: string[] | null;
  approval_status: string;
  business_status: string;
  main_image_url: string | null;
  owner_id: string | null;
  city_id: string | null;
  neighborhood: string | null;
  created_at: string;
}

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

  useEffect(() => {
    if (!id || !isAuthenticated || !isAdmin) return;
    (async () => {
      setLoading(true);
      const [{ data: bt }, { data: imgs }] = await Promise.all([
        supabase.from("bike_types").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("bike_type_images")
          .select("id, image_url")
          .eq("bike_type_id", id)
          .order("display_order"),
      ]);
      setBike(bt as BikeType | null);
      setPhotos((imgs as { id: string; image_url: string }[]) || []);

      if (bt?.owner_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, phone")
          .eq("user_id", bt.owner_id)
          .maybeSingle();
        if (prof?.id) {
          const { data: ag } = await supabase
            .from("agencies")
            .select("business_name, city, primary_neighborhood, address, is_verified, phone")
            .eq("profile_id", prof.id)
            .maybeSingle();
          setAgency(ag as typeof agency);
        }
      }
      setLoading(false);
    })();
  }, [id, isAuthenticated, isAdmin]);

  const handleApprove = async () => {
    if (!id) return;
    setActing(true);
    const { error } = await supabase.rpc("approve_bike_type" as never, { p_bike_type_id: id } as never);
    setActing(false);
    setConfirmApprove(false);
    if (error) {
      toast.error(error.message || "Failed to approve");
      return;
    }
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
      p_bike_type_id: id,
      p_reason: reason.trim(),
    } as never);
    setActing(false);
    setRejectOpen(false);
    if (error) {
      toast.error(error.message || "Failed to reject");
      return;
    }
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 max-w-7xl">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/bikes/approvals")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to queue
          </Button>

          <div className="mt-4 grid gap-6 lg:grid-cols-[3fr_2fr]">
            {/* Left: gallery + details */}
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  {bike.main_image_url ? (
                    <img src={bike.main_image_url} alt={bike.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <BikeIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 p-3">
                    {photos.map((p) => (
                      <div key={p.id} className="aspect-square overflow-hidden rounded-md bg-muted">
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold">{bike.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {bike.year ? `${bike.year} · ` : ""}
                    {bike.engine_cc ? `${bike.engine_cc}cc · ` : ""}
                    {bike.transmission || "—"} · {bike.fuel_type || "—"}
                  </p>
                </div>

                {bike.description && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Description</h3>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{bike.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Daily</p>
                    <p className="font-semibold">{bike.daily_price ?? "—"} MAD</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weekly</p>
                    <p className="font-semibold">{bike.weekly_price ?? "—"} MAD</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="font-semibold">{bike.monthly_price ?? "—"} MAD</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">License</p>
                    <p>{bike.license_required || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Min age</p>
                    <p>{bike.min_age ?? "—"}</p>
                  </div>
                </div>

                {bike.features && bike.features.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Features</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {bike.features.map((f) => (
                        <span key={f} className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold mb-3">Agency</h3>
                {agency ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {agency.business_name || "—"}{" "}
                      {agency.is_verified && <span className="text-success">✓ Verified</span>}
                    </p>
                    <p className="text-muted-foreground">
                      {agency.city || "—"}
                      {agency.primary_neighborhood ? ` · ${agency.primary_neighborhood}` : ""}
                    </p>
                    {agency.address && <p className="text-muted-foreground">{agency.address}</p>}
                    {agency.phone && <p className="text-muted-foreground">{agency.phone}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No agency profile linked.</p>
                )}
              </Card>
            </div>

            {/* Right: action panel */}
            <div className="space-y-4">
              <Card className="p-5 space-y-3 sticky top-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusChip status={bike.approval_status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{new Date(bike.created_at).toLocaleDateString()}</span>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => setConfirmApprove(true)}
                    disabled={acting || bike.approval_status === "approved"}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setRejectOpen(true)}
                    disabled={acting || bike.approval_status === "rejected"}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject with reason
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />

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
                onClick={() => setReason(q)}
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
          <p className="text-xs text-muted-foreground">
            {reason.trim().length}/20 chars min
          </p>

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
