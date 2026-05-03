import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Building2,
  MapPin,
  FileText,
  ExternalLink,
  AlertCircle,
  Copy,
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

type SlotKey = "rc" | "ae_card" | "ice_cert" | "id_front" | "id_back";

interface AgencyDoc {
  key: SlotKey;
  file_name: string;
  signed_url: string | null;
  file_type: string | null;
}

interface AgencyDocsState {
  loading: boolean;
  business_type: string | null;
  docs: AgencyDoc[];
}

const SLOT_LABEL: Record<SlotKey, string> = {
  rc: "Registre de Commerce (RC)",
  ae_card: "Auto-entrepreneur card",
  ice_cert: "ICE Certificate",
  id_front: "Owner ID — Front",
  id_back: "Owner ID — Back",
};

const matchSlot = (fileName: string): SlotKey | null => {
  const n = (fileName || "").toLowerCase();
  if (n.startsWith("ae_card")) return "ae_card";
  if (n.startsWith("ice_cert")) return "ice_cert";
  if (n.startsWith("id_front")) return "id_front";
  if (n.startsWith("id_back")) return "id_back";
  if (n.startsWith("rc")) return "rc";
  return null;
};

const extractBucketPath = (fileUrl: string): string | null => {
  if (!fileUrl) return null;
  const m = fileUrl.match(/\/object\/(?:sign|public)\/client-files\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  if (!fileUrl.startsWith("http")) return fileUrl;
  return null;
};

const REJECT_PRESETS = [
  "Documents are unclear or low quality",
  "Missing required document",
  "Document doesn't match agency information",
  "Documents appear to be expired",
  "Information mismatch with public records",
];

const AdminAgencyVerifications = () => {
  const { hasRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingAgency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [docsByAgency, setDocsByAgency] = useState<Record<string, AgencyDocsState>>({});

  const [rejectTarget, setRejectTarget] = useState<PendingAgency | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

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
        .eq("verification_status", "pending")
        .eq("is_verified", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = data || [];
      setPending(list);
      list.forEach((a) => loadDocsFor(a));
    } catch (e) {
      toast.error("Failed to load pending agencies");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocsFor = async (agency: PendingAgency) => {
    setDocsByAgency((prev) => ({
      ...prev,
      [agency.id]: { loading: true, business_type: null, docs: [] },
    }));
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, business_type")
        .eq("id", agency.profile_id)
        .maybeSingle();
      if (!profile?.user_id) {
        setDocsByAgency((prev) => ({
          ...prev,
          [agency.id]: { loading: false, business_type: null, docs: [] },
        }));
        return;
      }
      const { data: files } = await supabase
        .from("client_files")
        .select("file_name, file_url, file_type, created_at")
        .eq("user_id", profile.user_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const found: Record<SlotKey, AgencyDoc | null> = {
        rc: null,
        ae_card: null,
        ice_cert: null,
        id_front: null,
        id_back: null,
      };
      for (const f of files || []) {
        const slot = matchSlot(f.file_name || "");
        if (!slot || found[slot]) continue;
        let signedUrl: string | null = null;
        const path = extractBucketPath(f.file_url || "");
        if (path) {
          const { data: s } = await supabase.storage
            .from("client-files")
            .createSignedUrl(path, 60 * 60);
          signedUrl = s?.signedUrl || null;
        }
        if (!signedUrl && f.file_url?.startsWith("http")) {
          signedUrl = f.file_url;
        }
        found[slot] = {
          key: slot,
          file_name: f.file_name,
          signed_url: signedUrl,
          file_type: f.file_type,
        };
      }
      setDocsByAgency((prev) => ({
        ...prev,
        [agency.id]: {
          loading: false,
          business_type: profile.business_type || null,
          docs: (Object.values(found).filter(Boolean) as AgencyDoc[]),
        },
      }));
    } catch (e) {
      console.error("loadDocsFor failed", e);
      setDocsByAgency((prev) => ({
        ...prev,
        [agency.id]: { loading: false, business_type: null, docs: [] },
      }));
    }
  };

  const notifyOwner = async (
    agency: PendingAgency,
    approved: boolean,
    reason?: string,
  ) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", agency.profile_id)
        .maybeSingle();
      if (!profile?.user_id) return;
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        title: approved ? "Shop Approved!" : "Shop Verification Rejected",
        message: approved
          ? `Your shop "${agency.business_name}" has been approved. Approved motorbikes will now appear publicly.`
          : `Your shop "${agency.business_name}" was rejected${reason ? `: ${reason}` : "."} Please review the feedback and resubmit.`,
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
        .update({
          is_verified: true,
          verification_status: "approved",
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
        })
        .eq("id", agency.id);
      if (error) throw error;
      await notifyOwner(agency, true);
      try {
        await supabase.rpc("log_audit_event", {
          _action: "agency_verification_approved",
          _table_name: "agencies",
          _record_id: agency.id,
          _details: { business_name: agency.business_name },
        });
      } catch { /* non-fatal */ }
      toast.success("Shop approved");
      fetchPending();
    } catch (e) {
      toast.error("Failed to approve shop");
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const openReject = (agency: PendingAgency) => {
    setRejectTarget(agency);
    setRejectReason("");
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 20) {
      toast.error("Please provide at least 20 characters of feedback.");
      return;
    }
    setRejectSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("agencies")
        .update({
          is_verified: false,
          verification_status: "rejected",
          rejection_reason: rejectReason.trim(),
          rejected_at: new Date().toISOString(),
          rejected_by: u.user?.id ?? null,
        })
        .eq("id", rejectTarget.id);
      if (error) throw error;
      await notifyOwner(rejectTarget, false, rejectReason.trim());
      try {
        await supabase.rpc("log_audit_event", {
          _action: "agency_verification_rejected",
          _table_name: "agencies",
          _record_id: rejectTarget.id,
          _details: {
            business_name: rejectTarget.business_name,
            reason: rejectReason.trim(),
          },
        });
      } catch { /* non-fatal */ }
      toast.success("Agency rejected and notified");
      setRejectTarget(null);
      setRejectReason("");
      fetchPending();
    } catch (e) {
      toast.error("Failed to reject agency");
      console.error(e);
    } finally {
      setRejectSubmitting(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
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
              {pending.map((a) => {
                const ds = docsByAgency[a.id];
                const businessType = ds?.business_type;
                const requiredBusinessSlot: SlotKey =
                  businessType === "auto_entrepreneur" ? "ae_card" : "rc";
                const requiredSlots: SlotKey[] = [
                  requiredBusinessSlot,
                  "ice_cert",
                  "id_front",
                  "id_back",
                ];
                const docMap = new Map(
                  (ds?.docs || []).map((d) => [d.key, d] as const),
                );
                const missing = requiredSlots.filter((s) => !docMap.get(s));
                const iceValid = !!a.ice && /^[0-9]{15}$/.test(a.ice);
                const canApprove =
                  missing.length === 0 && iceValid && !ds?.loading;

                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
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
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                              {a.rc && <span>RC: {a.rc}</span>}
                              {a.ice ? (
                                <span className="inline-flex items-center gap-1">
                                  ICE: <span className="font-mono">{a.ice}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyText(a.ice!)}
                                    className="text-muted-foreground hover:text-foreground"
                                    title="Copy ICE"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  {!iceValid && (
                                    <Badge variant="destructive" className="text-[10px] py-0">
                                      invalid
                                    </Badge>
                                  )}
                                </span>
                              ) : (
                                <Badge variant="destructive" className="text-[10px] py-0">
                                  ICE missing
                                </Badge>
                              )}
                              {a.phone && <span>Tel: {a.phone}</span>}
                              {businessType && (
                                <span>
                                  Type:{" "}
                                  {businessType === "auto_entrepreneur"
                                    ? "Auto-entrepreneur"
                                    : "Company"}
                                </span>
                              )}
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
                            onClick={() => openReject(a)}
                            disabled={actionLoading === a.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(a)}
                            disabled={actionLoading === a.id || !canApprove}
                            title={
                              !canApprove
                                ? "Cannot approve: missing documents or invalid ICE"
                                : undefined
                            }
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

                      {/* Documents */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium flex items-center gap-1.5">
                            <FileText className="h-4 w-4" />
                            Submitted Documents
                          </h4>
                          {ds?.loading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : missing.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {missing.length} missing
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-success/10 text-success border-success/30">
                              Complete
                            </Badge>
                          )}
                        </div>
                        {ds?.loading ? (
                          <p className="text-xs text-muted-foreground">
                            Loading documents…
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {requiredSlots.map((slot) => {
                              const d = docMap.get(slot);
                              const isImage =
                                d?.file_type?.startsWith("image/") ?? false;
                              return (
                                <div
                                  key={slot}
                                  className={`flex items-center gap-3 p-2 rounded-md border ${
                                    d
                                      ? "bg-muted/30"
                                      : "bg-destructive/5 border-destructive/30"
                                  }`}
                                >
                                  <div className="h-12 w-12 rounded bg-background border flex items-center justify-center shrink-0 overflow-hidden">
                                    {d && isImage && d.signed_url ? (
                                      <img
                                        src={d.signed_url}
                                        alt={SLOT_LABEL[slot]}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : d ? (
                                      <FileText className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                      <AlertCircle className="h-5 w-5 text-destructive" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium truncate">
                                      {SLOT_LABEL[slot]}
                                    </p>
                                    {d ? (
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        {d.file_name.replace(
                                          /^(rc|ae_card|ice_cert|id_front|id_back)-/,
                                          "",
                                        )}
                                      </p>
                                    ) : (
                                      <p className="text-[11px] text-destructive">
                                        Not submitted
                                      </p>
                                    )}
                                  </div>
                                  {d?.signed_url && (
                                    <a
                                      href={d.signed_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline text-xs flex items-center gap-1 shrink-0"
                                    >
                                      Open
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Reject modal */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o && !rejectSubmitting) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Reject verification — {rejectTarget?.business_name}
            </DialogTitle>
            <DialogDescription>
              The agency will see this reason on their verification page. Be
              specific so they can fix the issue and resubmit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Quick fill
              </Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {REJECT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setRejectReason((cur) => (cur ? cur + "\n" + p : p))
                    }
                    className="text-xs px-2 py-1 rounded-md border border-border bg-muted hover:bg-muted/70"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="reject-reason" className="text-sm font-medium">
                Reason for rejection (the agency will see this) *
              </Label>
              <Textarea
                id="reject-reason"
                rows={5}
                placeholder="Explain what needs fixing so the agency can resubmit successfully…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {rejectReason.trim().length}/20 minimum characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              disabled={rejectSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitReject}
              disabled={
                rejectSubmitting || rejectReason.trim().length < 20
              }
            >
              {rejectSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rejecting…
                </>
              ) : (
                <>Reject and notify agency</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAgencyVerifications;
