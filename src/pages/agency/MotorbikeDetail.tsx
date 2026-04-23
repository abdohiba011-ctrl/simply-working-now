import { useNavigate, useParams } from "react-router-dom";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ExternalLink, Star } from "lucide-react";
import { useAgencyBike } from "@/hooks/useAgencyData";

const MotorbikeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { bike, loading } = useAgencyBike(id);

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
          <Button className="mt-4" onClick={() => navigate("/agency/motorbikes")}>Back to motorbikes</Button>
        </div>
      </AgencyLayout>
    );
  }

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <button onClick={() => navigate("/agency/motorbikes")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{bike.name}</h1>
            <p className="text-sm text-muted-foreground">{bike.engine_cc ? `${bike.engine_cc}cc` : ""} {bike.transmission || ""} {bike.fuel_type || ""}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1" onClick={() => window.open(`/bikes/${bike.id}`, "_blank")}>
              <ExternalLink className="h-4 w-4" /> Public view
            </Button>
            <Button onClick={() => navigate(`/agency/motorbikes/${bike.id}/edit`)}>Edit</Button>
          </div>
        </div>

        {bike.main_image_url && (
          <Card className="overflow-hidden">
            <div className="aspect-video w-full bg-muted">
              <img src={bike.main_image_url} alt={bike.name} className="h-full w-full object-cover" />
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Daily price</p>
            <p className="mt-1 text-2xl font-bold">{Number(bike.daily_price || 0)} <span className="text-sm font-normal">MAD</span></p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1"><Badge variant="outline" className="capitalize">{bike.availability_status || "—"}</Badge></p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Rating</p>
            <p className="mt-1 inline-flex items-center gap-1 text-2xl font-bold">
              <Star className="h-5 w-5 fill-warning text-warning" /> {Number(bike.rating || 0).toFixed(1)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Reviews</p>
            <p className="mt-1 text-2xl font-bold">{bike.review_count || 0}</p>
          </Card>
        </div>

        {bike.description && (
          <Card className="p-5">
            <h3 className="font-semibold">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{bike.description}</p>
          </Card>
        )}
      </div>
    </AgencyLayout>
  );
};

export default MotorbikeDetail;
