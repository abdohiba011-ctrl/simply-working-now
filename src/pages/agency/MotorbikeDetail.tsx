import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ExternalLink,
  Bike as BikeIcon,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { useAgencyBike } from "@/hooks/useAgencyData";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BikeApprovalBadge } from "@/components/agency/BikeApprovalBadge";

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
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          onClick={() => navigate("/agency/motorbikes")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {bike.approval_status === "rejected" && (
          <Card className="border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Your bike was rejected</h3>
                <p className="mt-1 text-sm">
                  {bike.rejection_reason || "No reason provided."}
                </p>
                {bike.rejected_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rejected on {new Date(bike.rejected_at).toLocaleString()}
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(`/agency/motorbikes/${bike.id}/edit`)}
                >
                  Edit and resubmit for review
                </Button>
              </div>
            </div>
          </Card>
        )}

        {bike.approval_status === "pending" && (
          <Card className="border-warning/30 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <h3 className="font-semibold">Awaiting review</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our team will review this bike within 24-48 hours. You'll be notified.
                </p>
              </div>
            </div>
          </Card>
        )}

        {bike.approval_status === "approved" && bike.business_status !== "active" && (
          <Card className="border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div>
                <h3 className="font-semibold">Suspended</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This bike is currently suspended by Motonita admins and is not visible to renters.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{bike.name}</h1>
              <BikeApprovalBadge bike={bike} />
            </div>
            <p className="text-sm text-muted-foreground">
              {bike.engine_cc ? `${bike.engine_cc}cc` : ""} {bike.transmission || ""}{" "}
              {bike.fuel_type || ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => window.open(`/bikes/${bike.id}`, "_blank")}
            >
              <ExternalLink className="h-4 w-4" /> Public view
            </Button>
            <Button onClick={() => navigate(`/agency/motorbikes/${bike.id}/edit`)}>
              Edit
            </Button>
          </div>
        </div>

        {/* Gallery */}
        <Card className="overflow-hidden">
          <div className="aspect-video w-full bg-muted">
            {active ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block h-full w-full"
                aria-label="Open full image"
              >
                <img
                  src={active.image_url}
                  alt={bike.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <BikeIcon className="h-12 w-12" />
                <span className="ml-2 text-sm">No images yet</span>
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t border-border bg-background p-3">
              {gallery.map((g, i) => (
                <button
                  key={g.id ?? g.image_url}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                    activeIndex === i
                      ? "border-primary"
                      : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <img
                    src={g.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Stats — no rating/reviews per request */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Daily price</p>
            <p className="mt-1 text-2xl font-bold">
              {Number(bike.daily_price || 0)}{" "}
              <span className="text-sm font-normal">MAD</span>
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1">
              <Badge variant="outline" className="capitalize">
                {bike.availability_status || "—"}
              </Badge>
            </p>
          </Card>
        </div>

        {bike.description && (
          <Card className="p-5">
            <h3 className="font-semibold">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {bike.description}
            </p>
          </Card>
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
    </AgencyLayout>
  );
};

export default MotorbikeDetail;
