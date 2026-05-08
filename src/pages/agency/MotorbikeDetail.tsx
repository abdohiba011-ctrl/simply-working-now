import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ExternalLink,
  XCircle,
  Clock,
  AlertTriangle,
  Archive,
  MoreVertical,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgencyBike } from "@/hooks/useAgencyData";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { BikeApprovalBadge } from "@/components/agency/BikeApprovalBadge";
import { toast } from "sonner";
import { MotorbikeWizardDialog } from "@/components/agency/MotorbikeWizardDialog";
import { BikeDetailCard, type BikeDetailAgency, type BikeDetailPickup } from "@/components/bike/BikeDetailCard";


interface GalleryImage {
  id?: string;
  image_url: string;
  display_order: number;
}

interface PickupLocation {
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  usingAgencyFallback: boolean;
}

const MotorbikeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { bike, loading } = useAgencyBike(id);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pickup, setPickup] = useState<PickupLocation | null>(null);
  const [available, setAvailable] = useState<boolean>(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [fullBike, setFullBike] = useState<Record<string, any> | null>(null);
  const [tiers, setTiers] = useState<{ min_days: number; daily_price_mad: number }[]>([]);
  const [agencyInfo, setAgencyInfo] = useState<BikeDetailAgency | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("bike_types")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setFullBike(data as Record<string, any> | null);

      const { data: tierRows } = await supabase
        .from("bike_pricing_tiers")
        .select("min_days, daily_price_mad")
        .eq("bike_type_id", id)
        .order("min_days", { ascending: true });
      setTiers((tierRows as any[]) || []);

      const ownerId = (data as any)?.owner_id;
      if (ownerId) {
        const { data: prof } = await supabase
          .from("profiles").select("id").eq("user_id", ownerId).maybeSingle();
        if (prof?.id) {
          const { data: ag } = await supabase
            .from("agencies")
            .select("business_name, city, address, is_verified, phone, working_hours")
            .eq("profile_id", prof.id).maybeSingle();
          setAgencyInfo(ag as BikeDetailAgency | null);
        }
      }
    })();
  }, [id, refreshTick]);

  useEffect(() => {
    setAvailable((bike?.availability_status ?? "available") === "available");
  }, [bike?.availability_status]);

  const toggleAvailability = async (next: boolean) => {
    if (!id) return;
    setBusy(true);
    const prev = available;
    setAvailable(next);
    const { error } = await supabase.rpc(
      "set_bike_type_availability" as never,
      { p_bike_type_id: id, p_available: next } as never,
    );
    setBusy(false);
    if (error) {
      setAvailable(prev);
      toast.error(error.message || "Could not update availability");
      return;
    }
    toast.success(next ? "Bike is now available" : "Bike taken off the market");
  };

  const archiveBike = async () => {
    if (!id) return;
    setBusy(true);
    const { error } = await supabase.rpc(
      "archive_bike_type" as never,
      { p_bike_type_id: id } as never,
    );
    setBusy(false);
    setArchiveOpen(false);
    if (error) {
      toast.error(error.message || "Could not archive bike");
      return;
    }
    toast.success("Bike archived. It is no longer visible to renters.");
    navigate("/agency/motorbikes");
  };


  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("bike_type_images")
        .select("id, image_url, display_order")
        .eq("bike_type_id", id)
        .order("display_order", { ascending: true });
      const items: GalleryImage[] = (data || []).map((d) => ({
        id: d.id,
        image_url: d.image_url,
        display_order: d.display_order ?? 0,
      }));
      // Always lead with primary main_image_url if present
      if (bike?.main_image_url) {
        const idx = items.findIndex((i) => i.image_url === bike.main_image_url);
        if (idx > 0) {
          const [primary] = items.splice(idx, 1);
          items.unshift(primary);
        } else if (idx === -1) {
          items.unshift({
            image_url: bike.main_image_url,
            display_order: -1,
          });
        }
      }
      setGallery(items);
      setActiveIndex(0);
    })();
  }, [id, bike?.main_image_url]);

  // Resolve pickup location: bike-specific fields first, then fall back to
  // the owning agency's onboarding location.
  useEffect(() => {
    if (!bike) {
      setPickup(null);
      return;
    }
    (async () => {
      let cityName: string | null = null;
      const bikeCityId = (bike as any).city_id as string | null | undefined;
      if (bikeCityId) {
        const { data: cityRow } = await supabase
          .from("service_cities")
          .select("name")
          .eq("id", bikeCityId)
          .maybeSingle();
        cityName = cityRow?.name ?? null;
      }

      const bikeNeighborhood = (bike as any).neighborhood as string | null | undefined;
      const ownerId = (bike as any).owner_id as string | null | undefined;

      // Pull agency fallbacks
      let agencyCity: string | null = null;
      let agencyNeighborhood: string | null = null;
      let agencyAddress: string | null = null;
      if (ownerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", ownerId)
          .maybeSingle();
        if (profile?.id) {
          const { data: agency } = await supabase
            .from("agencies")
            .select("city, primary_neighborhood, address")
            .eq("profile_id", profile.id)
            .maybeSingle();
          agencyCity = agency?.city ?? null;
          agencyNeighborhood = agency?.primary_neighborhood ?? null;
          agencyAddress = agency?.address ?? null;
        }
      }

      const hasBikeLocation = !!(cityName || bikeNeighborhood);
      setPickup({
        city: cityName || agencyCity,
        neighborhood: bikeNeighborhood || agencyNeighborhood,
        address: hasBikeLocation ? null : agencyAddress,
        usingAgencyFallback: !hasBikeLocation && !!(agencyCity || agencyNeighborhood || agencyAddress),
      });
    })();
  }, [bike]);

  if (loading) {
    return (
      <AgencyLayout>
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      </AgencyLayout>
    );
  }

  if (!bike) {
    return (
      <AgencyLayout>
        <div className="mx-auto max-w-3xl py-16 text-center">
          <h1 className="text-2xl font-bold">Motorbike not found</h1>
          <Button className="mt-4" onClick={() => navigate("/agency/motorbikes")}>
            Back to motorbikes
          </Button>
        </div>
      </AgencyLayout>
    );
  }

  const active = gallery[activeIndex];

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl space-y-3">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 flex items-center gap-1.5 border-b border-border bg-background/95 h-10 backdrop-blur sm:mx-0 sm:gap-2 sm:rounded-md sm:border sm:px-3 my-0 py-[28px] px-[8px]">
          <button
            onClick={() => navigate("/agency/motorbikes")}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold sm:text-base">{bike.name}</h1>
              <span className="hidden sm:inline-flex"><BikeApprovalBadge bike={bike} /></span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              <span className="sm:hidden">Live</span>
              <span className="hidden sm:inline">Available</span>
            </span>
            <Switch
              checked={available}
              onCheckedChange={toggleAvailability}
              disabled={busy || bike.approval_status !== "approved"}
              aria-label="Toggle availability"
            />
          </div>
          {/* Desktop: Preview + Edit + Archive inline */}
          <Button variant="outline" size="sm" className="hidden gap-1 sm:inline-flex" onClick={() => window.open(`/bikes/${bike.id}`, "_blank")}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>Edit</Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 sm:inline-flex"
            onClick={() => setArchiveOpen(true)}
            disabled={busy}
          >
            <Archive className="h-4 w-4" />
          </Button>
          {/* Mobile: 3-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 px-2 sm:hidden" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => window.open(`/bikes/${bike.id}`, "_blank")}>
                <Eye className="mr-2 h-4 w-4" /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setArchiveOpen(true)}
                disabled={busy}
              >
                <Archive className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status banners (compact) */}
        {bike.approval_status === "rejected" && (
          <Card className="border-destructive/40 bg-destructive/10 p-2">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="flex-1 text-xs">
                <span className="font-semibold text-destructive">Rejected: </span>
                {bike.rejection_reason || "No reason provided."}
              </div>
            </div>
          </Card>
        )}
        {bike.approval_status === "pending" && (
          <Card className="border-warning/30 bg-warning/10 p-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-warning" />
              <span><strong>Awaiting review</strong> — within 24-48h.</span>
            </div>
          </Card>
        )}
        {bike.approval_status === "approved" && bike.business_status !== "active" && (
          <Card className="border-amber-500/30 bg-amber-500/10 p-2 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <span><strong>Suspended</strong> by Motonita admins.</span>
            </div>
          </Card>
        )}

        {fullBike && (
          <BikeDetailCard
            bike={fullBike as any}
            photos={gallery.map((g) => ({ id: g.id, image_url: g.image_url }))}
            tiers={tiers}
            agency={agencyInfo}
            pickup={pickup as BikeDetailPickup | null}
            mode="agency"
          />
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none">
          {active && (
            <img
              src={active.image_url}
              alt={bike.name}
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive "{bike.name}"?</DialogTitle>
            <DialogDescription>
              This bike will be hidden from renters and search results
              immediately. Your booking history is preserved. You can ask
              support to restore it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={archiveBike} disabled={busy}>
              {busy ? "Archiving…" : "Archive bike"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MotorbikeWizardDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        bikeId={bike.id}
        onSaved={() => setRefreshTick((t) => t + 1)}
      />
    </AgencyLayout>
  );
};

export default MotorbikeDetail;
