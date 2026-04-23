import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Bike as BikeIcon } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAgencyBikes } from "@/hooks/useAgencyData";

const Motorbikes = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { bikes, loading } = useAgencyBikes();

  const filtered = useMemo(() => {
    if (!search) return bikes;
    const q = search.toLowerCase();
    return bikes.filter((b) => b.name.toLowerCase().includes(q));
  }, [bikes, search]);

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Motorbikes</h1>
            <p className="text-sm text-muted-foreground">{bikes.length} in your fleet</p>
          </div>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => navigate("/agency/motorbikes/new")}>
              <Plus className="mr-2 h-4 w-4" /> Add motorbike
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={BikeIcon}
              title={bikes.length === 0 ? "No motorbikes yet" : "No matches"}
              description={bikes.length === 0 ? "Add your first motorbike to start receiving bookings." : "Try a different search."}
              action={
                bikes.length === 0
                  ? { label: "Add motorbike", onClick: () => navigate("/agency/motorbikes/new") }
                  : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((bike) => (
              <Card
                key={bike.id}
                onClick={() => navigate(`/agency/motorbikes/${bike.id}`)}
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
              >
                <div className="aspect-[4/3] bg-muted">
                  {bike.main_image_url ? (
                    <img src={bike.main_image_url} alt={bike.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <BikeIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{bike.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {bike.engine_cc ? `${bike.engine_cc}cc` : ""} {bike.transmission || ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{Number(bike.daily_price || 0)} MAD/day</span>
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] capitalize">
                      {bike.availability_status || "available"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AgencyLayout>
  );
};

export default Motorbikes;
