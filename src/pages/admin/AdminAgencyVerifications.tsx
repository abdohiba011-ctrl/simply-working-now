import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Building2,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PendingAgency {
  id: string;
  business_name: string;
  city: string | null;
  primary_neighborhood: string | null;
  rc: string | null;
  ice: string | null;
  phone: string | null;
  bio: string | null;
  logo_url: string | null;
  verification_status: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  profile_id: string;
}

const AdminAgencyVerifications = () => {
  const { hasRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingAgency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchPending();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .in("verification_status", ["pending_review", "pending"])
        .eq("is_verified", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPending(data || []);
    } catch (e) {
      toast.error("Failed to load pending agencies");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const notifyOwner = async (agency: PendingAgency, approved: boolean) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", agency.profile_id)
        .maybeSingle();
      if (!profile?.user_id) return;
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        title: approved ? "Shop Verified!" : "Shop Verification Rejected",
        message: approved
          ? `Your shop "${agency.business_name}" has been verified. Approved motorbikes will now appear publicly.`
          : `Your shop "${agency.business_name}" was not approved. Please review your documents and resubmit.`,
        type: approved ? "success" : "warning",
        link: "/agency/verification",
        action_url: "/agency/verification",
      });
    } catch (e) {
      console.error("notifyOwner failed", e);
    }
  };

  const handleApprove = async (agency: PendingAgency) => {
    setActionLoading(agency.id);
    try {
      const { error } = await supabase
        .from("agencies")
        .update({ is_verified: true, verification_status: "verified" })
        .eq("id", agency.id);
      if (error) throw error;
      await notifyOwner(agency, true);
      toast.success("Shop verified");
      fetchPending();
    } catch (e) {
      toast.error("Failed to verify shop");
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (agency: PendingAgency) => {
    setActionLoading(agency.id);
    try {
      const { error } = await supabase
        .from("agencies")
        .update({ is_verified: false, verification_status: "rejected" })
        .eq("id", agency.id);
      if (error) throw error;
      await notifyOwner(agency, false);
      toast.success("Shop rejected");
      fetchPending();
    } catch (e) {
      toast.error("Failed to reject shop");
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold">Please log in</h1>
          <Button className="mt-4" onClick={() => navigate("/auth")}>
            Log In
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16 container mx-auto px-4 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-primary" />
                Agency Shop Verifications
              </h1>
              <p className="text-muted-foreground mt-1">
                Review rental shop submissions before their motorbikes can be
                published.
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {pending.length} Pending
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold">All Caught Up!</h2>
                <p className="text-muted-foreground">
                  No pending shop verifications.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pending.map((a) => (
                <Card key={a.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">
                            {a.business_name}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {a.city || "—"}
                            {a.primary_neighborhood
                              ? ` · ${a.primary_neighborhood}`
                              : ""}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                            {a.rc && <span>RC: {a.rc}</span>}
                            {a.ice && <span>ICE: {a.ice}</span>}
                            {a.phone && <span>Tel: {a.phone}</span>}
                          </div>
                          {a.bio && (
                            <p className="text-sm mt-2 line-clamp-2">{a.bio}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(a)}
                          disabled={actionLoading === a.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(a)}
                          disabled={actionLoading === a.id}
                        >
                          {actionLoading === a.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAgencyVerifications;
