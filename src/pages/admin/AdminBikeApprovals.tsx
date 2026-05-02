import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Bike,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PendingBike {
  id: string;
  bike_type_id: string;
  location: string | null;
  agency_id: string | null;
  approval_status: string;
  created_at: string;
  bike_type?: { name: string | null; main_image_url: string | null };
  agency?: { business_name: string | null; is_verified: boolean | null };
}

interface PendingType {
  id: string;
  name: string;
  daily_price: number | null;
  main_image_url: string | null;
  approval_status: string | null;
  owner_id: string | null;
  created_at: string;
}

const AdminBikeApprovals = () => {
  const { hasRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [bikes, setBikes] = useState<PendingBike[]>([]);
  const [types, setTypes] = useState<PendingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (isAuthenticated && isAdmin) fetchPending();
  }, [isAuthenticated, isAdmin]);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const [{ data: bikesData, error: bErr }, { data: typesData, error: tErr }] =
        await Promise.all([
          supabase
            .from("bikes" as never)
            .select(
              "id,bike_type_id,location,agency_id,approval_status,created_at,bike_type:bike_types(name,main_image_url),agency:agencies(business_name,is_verified)" as never
            )
            .eq("approval_status" as never, "pending")
            .order("created_at" as never, { ascending: false }),
          supabase
            .from("bike_types")
            .select(
              "id,name,daily_price,main_image_url,approval_status,owner_id,created_at"
            )
            .eq("approval_status", "pending")
            .order("created_at", { ascending: false }),
        ]);
      if (bErr) throw bErr;
      if (tErr) throw tErr;
      setBikes((bikesData as unknown as PendingBike[]) || []);
      setTypes((typesData as PendingType[]) || []);
    } catch (e) {
      toast.error("Failed to load pending motorbikes");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBike = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from("bikes" as never)
        .update({ approval_status: status } as never)
        .eq("id" as never, id);
      if (error) throw error;
      toast.success(`Motorbike ${status}`);
      fetchPending();
    } catch (e) {
      toast.error(`Failed to ${status} motorbike`);
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };


  // Access control is handled exclusively by ProtectedRoute requireRole="admin".
  // Do NOT add in-page navigate("/") or navigate("/auth") guards here — they
  // race with role hydration and bounce admins off the page on refresh.
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16 container mx-auto px-4 text-center">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Loading admin session…</h1>
          <p className="text-sm text-muted-foreground mt-2">
            If this persists, try refreshing the page.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const totalPending = bikes.length + types.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bike className="h-8 w-8 text-primary" />
                Motorbike Approvals
              </h1>
              <p className="text-muted-foreground mt-1">
                Approve listings before they appear publicly. Even verified
                shops require per-bike approval.
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {totalPending} Pending
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : totalPending === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold">All Caught Up!</h2>
                <p className="text-muted-foreground">
                  No motorbikes waiting for approval.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {types.length > 0 && (
                <section>
                  <h2 className="font-semibold mb-3">Listings (catalog)</h2>
                  <div className="grid gap-3">
                    {types.map((t) => (
                      <Card
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/admin/bikes/${t.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/admin/bikes/${t.id}`);
                          }
                        }}
                        className="cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          {t.main_image_url ? (
                            <img
                              src={t.main_image_url}
                              alt={t.name}
                              className="h-16 w-24 object-cover rounded-md"
                            />
                          ) : (
                            <div className="h-16 w-24 bg-muted rounded-md flex items-center justify-center">
                              <Bike className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{t.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t.daily_price ? `${t.daily_price} MAD/day` : "—"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/bikes/${t.id}`);
                            }}
                          >
                            Review
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {bikes.length > 0 && (
                <section>
                  <h2 className="font-semibold mb-3">Fleet units</h2>
                  <div className="grid gap-3">
                    {bikes.map((b) => (
                      <Card key={b.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                          {b.bike_type?.main_image_url ? (
                            <img
                              src={b.bike_type.main_image_url}
                              alt={b.bike_type?.name || "Bike"}
                              className="h-16 w-24 object-cover rounded-md"
                            />
                          ) : (
                            <div className="h-16 w-24 bg-muted rounded-md flex items-center justify-center">
                              <Bike className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {b.bike_type?.name || "Motorbike"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {b.agency?.business_name || "—"}
                              {b.location ? ` · ${b.location}` : ""}
                            </p>
                            {b.agency && !b.agency.is_verified && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-xs"
                              >
                                Shop not yet verified
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateBike(b.id, "rejected")}
                              disabled={actionLoading === b.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateBike(b.id, "approved")}
                              disabled={actionLoading === b.id}
                            >
                              {actionLoading === b.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminBikeApprovals;
