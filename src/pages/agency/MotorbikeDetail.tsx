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
} from "lucide-react";
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

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("bike_types")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setFullBike(data as Record<string, any> | null);
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
        <div className="sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-md sm:border sm:px-3">
          <button
            onClick={() => navigate("/agency/motorbikes")}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold sm:text-lg">{bike.name}</h1>
              <BikeApprovalBadge bike={bike} />
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(`/bikes/${bike.id}`, "_blank")}>
            <ExternalLink className="h-4 w-4" /> View
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>Edit bike</Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setArchiveOpen(true)}
            disabled={busy}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>

        {/* Status banners (compact) */}
        {bike.approval_status === "rejected" && (
          <Card className="border-destructive/40 bg-destructive/10 p-3">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="flex-1 text-sm">
                <span className="font-semibold text-destructive">Rejected: </span>
                {bike.rejection_reason || "No reason provided."}
              </div>
            </div>
          </Card>
        )}
        {bike.approval_status === "pending" && (
          <Card className="border-warning/30 bg-warning/10 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-warning" />
              <span><strong>Awaiting review</strong> — within 24-48h.</span>
            </div>
          </Card>
        )}
        {bike.approval_status === "approved" && bike.business_status !== "active" && (
          <Card className="border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <span><strong>Suspended</strong> by Motonita admins.</span>
            </div>
          </Card>
        )}

        <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
          {/* LEFT */}
          <div className="space-y-3">
            {/* Photo grid */}
            <Card className="p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Photos ({gallery.length})
              </p>
              {gallery.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground gap-2 text-sm">
                  <BikeIcon className="h-4 w-4" /> No images
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gallery.map((g, i) => (
                    <button
                      key={g.id ?? g.image_url}
                      onClick={() => { setActiveIndex(i); setLightboxOpen(true); }}
                      className="overflow-hidden rounded-md border border-border bg-muted hover:opacity-90"
                      style={{ width: 120, height: 120 }}
                    >
                      <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Description */}
            {bike.description && (
              <Card className="p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
                <p className="text-sm whitespace-pre-wrap">{bike.description}</p>
              </Card>
            )}

            {fullBike && (
              <>
                {/* Details grid */}
                <Card className="p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Field label="Brand" value={fullBike.brand} />
                    <Field label="Engine" value={fullBike.engine_cc ? `${fullBike.engine_cc}cc` : null} />
                    <Field label="Model" value={fullBike.model} />
                    <Field label="Fuel" value={fullBike.fuel_type} />
                    <Field label="Year" value={fullBike.year} />
                    <Field label="Transmission" value={fullBike.transmission} />
                    <Field label="Color" value={fullBike.color} />
                    <Field label="Mileage" value={fullBike.mileage_km != null ? `${Number(fullBike.mileage_km).toLocaleString()} km` : null} />
                    <Field
                      label="Category"
                      value={(() => {
                        const c = BIKE_CATEGORIES.find((x) => x.key === fullBike.category);
                        return c ? `${c.icon} ${c.label}` : fullBike.category;
                      })()}
                    />
                    <Field label="License" value={licenseLabel(fullBike.license_required)} />
                    <Field label="Min age" value={fullBike.min_age} />
                    <Field label="Min experience" value={fullBike.min_experience_years != null ? `${fullBike.min_experience_years}y` : null} />
                  </div>
                </Card>

                {/* What's included */}
                <Card className="p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What's Included</p>
                  <div className="flex flex-wrap gap-1.5">
                    {fullBike.helmets_count != null && fullBike.helmets_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                        🪖 {fullBike.helmets_count} helmet{fullBike.helmets_count > 1 ? "s" : ""}
                      </span>
                    )}
                    {(() => {
                      const keys = ((fullBike.features as string[] | null) || []).filter(
                        (f): f is FeatureKey => f in FEATURE_LABELS,
                      );
                      if (keys.length === 0 && !(fullBike.helmets_count > 0))
                        return <span className="text-xs text-muted-foreground">— None specified</span>;
                      return keys.map((k) => (
                        <span key={k} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                          <span>{FEATURE_LABELS[k].icon}</span>
                          {FEATURE_LABELS[k].label}
                        </span>
                      ));
                    })()}
                  </div>
                </Card>

                {/* Policies */}
                <Card className="p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Policies</p>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Deposit</p>
                      <p className="font-medium">{fullBike.deposit_amount != null ? `${fullBike.deposit_amount} MAD` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Min days</p>
                      <p className="font-medium">{fullBike.min_rental_days ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max days</p>
                      <p className="font-medium">{fullBike.max_rental_days ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cancel</p>
                      <p className="font-medium">
                        {(() => {
                          const m = CANCELLATION_OPTIONS.find((c) => c.key === (fullBike.cancellation_policy || "moderate"));
                          return m ? `${m.icon} ${m.title}` : "—";
                        })()}
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-3">
            {/* Price + availability */}
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Daily price</p>
                  <p className="text-xl font-bold">{Number(bike.daily_price || 0)} <span className="text-xs font-normal">MAD</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Available</p>
                  <Switch
                    checked={available}
                    onCheckedChange={toggleAvailability}
                    disabled={busy || bike.approval_status !== "approved"}
                    aria-label="Toggle availability"
                  />
                </div>
              </div>
            </Card>

            {/* Pickup */}
            <Card className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pickup</p>
                {pickup?.usingAgencyFallback && (
                  <Badge variant="outline" className="text-[10px]">Agency loc</Badge>
                )}
              </div>
              {pickup && (pickup.city || pickup.neighborhood || pickup.address) ? (
                <div className="space-y-0.5 text-sm">
                  {pickup.neighborhood && <p>{pickup.neighborhood}</p>}
                  {pickup.city && <p className="text-muted-foreground text-xs">{pickup.city}</p>}
                  {pickup.address && <p className="text-muted-foreground text-xs">{pickup.address}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No pickup location set.</p>
              )}
            </Card>
          </div>
        </div>
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
