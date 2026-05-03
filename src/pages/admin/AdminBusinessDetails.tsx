import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  ChevronLeft,
  Copy,
  Mail,
  Phone,
  ExternalLink,
  ShieldCheck,
  Send,
  Snowflake,
  CheckCircle,
  XCircle,
  Bike,
  Wallet,
  Clock,
  FileText,
  MapPin,
  Pencil,
  Loader2,
  RefreshCw,
  Store,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type SlotKey = "rc" | "ae_card" | "ice_cert" | "id_front" | "id_back";
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
  "Documents are unclear or low quality, please re-upload",
  "Missing required document for verification",
  "Document doesn't match the agency information provided",
  "Documents appear to be expired, please upload current ones",
  "Information mismatch with public records, please verify",
];

const fmt = (d: string | null | undefined, f = "MMM d, yyyy") => {
  if (!d) return "—";
  try { return format(new Date(d), f); } catch { return "—"; }
};

interface Profile {
  id: string;
  user_id: string | null;
  name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  verification_status: string | null;
  is_frozen: boolean | null;
  frozen_reason: string | null;
  created_at: string | null;
  business_type: string | null;
  user_type: string | null;
}

interface AgencyRow {
  id: string;
  business_name: string;
  bio: string | null;
  logo_url: string | null;
  city: string | null;
  primary_neighborhood: string | null;
  address: string | null;
  phone: string | null;
  rc: string | null;
  ice: string | null;
  lat: number | null;
  lng: number | null;
  delivery_offered: boolean | null;
  delivery_fee_mad: number | null;
  delivery_radius_km: number | null;
  is_verified: boolean | null;
  verification_status: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  is_suspended: boolean | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  is_locked: boolean | null;
  subscription_plan: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
}

const businessTypeBadge = (bt: string | null) => {
  if (bt === "rental_shop") return { label: "Rental Shop", icon: Store };
  if (bt === "individual_owner" || bt === "individual") return { label: "Individual Owner", icon: UserIcon };
  return { label: "Business User", icon: Building2 };
};

const AdminBusinessDetails = () => {
  const { id: profileId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agency, setAgency] = useState<AgencyRow | null>(null);

  const [bikes, setBikes] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any | null>(null);
  const [walletTx, setWalletTx] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [docs, setDocs] = useState<{ key: SlotKey; file_name: string; signed_url: string | null }[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [showNotify, setShowNotify] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const fetchAll = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();
      if (profErr) throw profErr;
      if (!prof) { toast.error("Business not found"); setLoading(false); return; }
      setProfile(prof as Profile);

      const userId = (prof as any).user_id as string | null;

      const { data: ag } = await supabase
        .from("agencies")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();
      setAgency((ag as AgencyRow) || null);

      if (userId) {
        const [bikesRes, bookingsRes, walletRes, txRes, subRes, tlRes, filesRes] = await Promise.all([
          supabase.from("bike_types")
            .select("id, name, brand, model, daily_price, approval_status, business_status, main_image_url, created_at, rejection_reason")
            .eq("owner_id", userId)
            .is("archived_at", null)
            .order("created_at", { ascending: false }),
          supabase.from("bookings")
            .select("id, customer_name, customer_email, pickup_date, return_date, total_price, booking_status, payment_status, created_at, status")
            .eq("assigned_to_business", userId)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("agency_wallets").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("agency_wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
          supabase.from("agency_subscriptions").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("client_timeline_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
          supabase.from("client_files").select("*").eq("user_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
        ]);
        setBikes(bikesRes.data || []);
        setBookings(bookingsRes.data || []);
        setWallet(walletRes.data || null);
        setWalletTx(txRes.data || []);
        setSubscription(subRes.data || null);
        setTimeline(tlRes.data || []);
        setFiles((filesRes.data || []).filter((f: any) => !matchSlot(f.file_name || "")));
        // notes are stored in client_timeline_events with event_type='note' typically; fallback to none
        setNotes((tlRes.data || []).filter((e: any) => e.event_type === "note"));

        // verification docs
        loadDocs(userId);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load business details");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  const loadDocs = async (userId: string) => {
    setDocsLoading(true);
    try {
      const { data: rows } = await supabase
        .from("client_files")
        .select("file_name, file_url, file_type, created_at")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      const found: Record<SlotKey, any> = { rc: null, ae_card: null, ice_cert: null, id_front: null, id_back: null };
      for (const f of rows || []) {
        const slot = matchSlot(f.file_name || "");
        if (!slot || found[slot]) continue;
        let url: string | null = null;
        const path = extractBucketPath(f.file_url || "");
        if (path) {
          const { data } = await supabase.storage.from("client-files").createSignedUrl(path, 3600);
          url = data?.signedUrl || null;
        }
        if (!url && f.file_url?.startsWith("http")) url = f.file_url;
        found[slot] = { key: slot, file_name: f.file_name, signed_url: url };
      }
      setDocs(Object.values(found).filter(Boolean) as any);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const copy = async (txt: string | null | undefined, label = "Copied") => {
    if (!txt) return;
    try { await navigator.clipboard.writeText(txt); toast.success(label); } catch { toast.error("Copy failed"); }
  };

  // ---------- Actions ----------
  const saveName = async () => {
    if (!agency || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from("agencies").update({ business_name: nameDraft.trim() }).eq("id", agency.id);
      if (error) throw error;
      toast.success("Business name updated");
      setEditingName(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Failed to update"); }
    finally { setSavingName(false); }
  };

  const sendNotification = async () => {
    if (!profile?.user_id || !notifyTitle.trim() || !notifyMsg.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: profile.user_id,
        title: notifyTitle.trim(),
        message: notifyMsg.trim(),
        type: "info",
      });
      if (error) throw error;
      toast.success("Notification sent");
      setShowNotify(false); setNotifyTitle(""); setNotifyMsg("");
    } catch (e: any) { toast.error(e.message || "Failed to send"); }
    finally { setSubmitting(false); }
  };

  const approveAgency = async () => {
    if (!agency) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("agencies").update({
        is_verified: true,
        verification_status: "approved",
        rejection_reason: null,
        rejected_at: null,
        rejected_by: null,
      }).eq("id", agency.id);
      if (error) throw error;
      if (profile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          title: "Business Approved!",
          message: `Your business "${agency.business_name}" has been approved.`,
          type: "success",
          link: "/agency/verification",
        });
      }
      toast.success("Business approved");
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Failed to approve"); }
    finally { setSubmitting(false); }
  };

  const rejectAgency = async () => {
    if (!agency) return;
    if (rejectReason.trim().length < 20) { toast.error("Please provide at least 20 characters of feedback."); return; }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("agencies").update({
        is_verified: false,
        verification_status: "rejected",
        rejection_reason: rejectReason.trim(),
        rejected_at: new Date().toISOString(),
        rejected_by: u.user?.id ?? null,
      }).eq("id", agency.id);
      if (error) throw error;
      if (profile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          title: "Business Verification Rejected",
          message: `Your business was rejected: ${rejectReason.trim()}`,
          type: "warning",
          link: "/agency/verification",
        });
      }
      toast.success("Business rejected and notified");
      setShowReject(false); setRejectReason("");
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Failed to reject"); }
    finally { setSubmitting(false); }
  };

  const toggleSuspend = async () => {
    if (!agency) return;
    const next = !agency.is_suspended;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("agencies").update({
        is_suspended: next,
        suspended_at: next ? new Date().toISOString() : null,
      }).eq("id", agency.id);
      if (error) throw error;
      toast.success(next ? "Business suspended" : "Business unsuspended");
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const toggleFreeze = async () => {
    if (!profile) return;
    const next = !profile.is_frozen;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("profiles").update({
        is_frozen: next,
        frozen_reason: next ? "Blocked by admin" : null,
      }).eq("id", profile.id);
      if (error) throw error;
      toast.success(next ? "User blocked" : "User unblocked");
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const addNote = async () => {
    if (!profile?.user_id || !noteDraft.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("client_timeline_events").insert({
        user_id: profile.user_id,
        event_type: "note",
        title: "Admin note",
        description: noteDraft.trim(),
      });
      if (error) throw error;
      toast.success("Note added");
      setShowNoteDialog(false); setNoteDraft("");
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const typeInfo = useMemo(() => businessTypeBadge(profile?.business_type || null), [profile]);
  const TypeIcon = typeInfo.icon;
  const displayName = agency?.business_name || profile?.full_name || profile?.name || "Unnamed business";

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Business not found</h1>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/panel?tab=business-clients")}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Back to Business Clients
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/panel?tab=business-clients")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Business Clients
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* HEADER */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={agency?.logo_url || profile.avatar_url || undefined} />
                  <AvatarFallback><Building2 className="h-10 w-10" /></AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="h-8 w-64" />
                      <Button size="sm" onClick={saveName} disabled={savingName}>
                        {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{displayName}</h1>
                      {agency && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setNameDraft(agency.business_name); setEditingName(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <TypeIcon className="h-4 w-4" />
                    <span>{typeInfo.label}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    {profile.email && (
                      <button onClick={() => copy(profile.email)} className="flex items-center gap-1.5 hover:text-foreground text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {profile.email} <Copy className="h-3 w-3" />
                      </button>
                    )}
                    {(agency?.phone || profile.phone) && (
                      <button onClick={() => copy(agency?.phone || profile.phone)} className="flex items-center gap-1.5 hover:text-foreground text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {agency?.phone || profile.phone} <Copy className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={() => copy(profile.id, "Business ID copied")} className="flex items-center gap-1.5 hover:text-foreground text-muted-foreground text-xs">
                      ID: <code className="font-mono">{profile.id.slice(0, 8)}…</code> <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {agency?.is_verified ? (
                    <StatusBadge status="verified" label="Verified" />
                  ) : (
                    <StatusBadge
                      status={agency?.verification_status === "pending" ? "pending" : agency?.verification_status === "rejected" ? "rejected" : "not_started"}
                      label={agency?.verification_status === "pending" ? "Pending review" : agency?.verification_status === "rejected" ? "Rejected" : "Unverified"}
                    />
                  )}
                  <Badge variant="outline" className="capitalize">{(subscription?.plan || agency?.subscription_plan || "free")} plan</Badge>
                  {agency?.is_suspended && <Badge variant="destructive">Suspended</Badge>}
                  {agency?.is_locked && <Badge variant="destructive">Locked</Badge>}
                  {profile.is_frozen && <Badge variant="destructive">Blocked</Badge>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/agency/dashboard" target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Open Agency Dashboard
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNotify(true)}>
                    <Send className="h-4 w-4 mr-1" /> Notify
                  </Button>
                  {agency && !agency.is_verified && (
                    <Button size="sm" onClick={approveAgency} disabled={submitting}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Verify
                    </Button>
                  )}
                  {agency && agency.verification_status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  )}
                  {agency && (
                    <Button size="sm" variant={agency.is_suspended ? "default" : "outline"} onClick={toggleSuspend} disabled={submitting}>
                      <Snowflake className="h-4 w-4 mr-1" /> {agency.is_suspended ? "Unsuspend" : "Suspend"}
                    </Button>
                  )}
                  <Button size="sm" variant={profile.is_frozen ? "default" : "destructive"} onClick={toggleFreeze} disabled={submitting}>
                    {profile.is_frozen ? "Unblock user" : "Block user"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm pt-2 border-t">
                  <div><div className="text-muted-foreground text-xs">Bikes</div><div className="font-semibold">{bikes.length}</div></div>
                  <div><div className="text-muted-foreground text-xs">Bookings</div><div className="font-semibold">{bookings.length}</div></div>
                  <div><div className="text-muted-foreground text-xs">Wallet</div><div className="font-semibold">{wallet ? `${Number(wallet.balance).toFixed(0)} ${wallet.currency}` : "—"}</div></div>
                  <div><div className="text-muted-foreground text-xs">Member since</div><div className="font-semibold">{fmt(profile.created_at)}</div></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABS */}
        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verification"><ShieldCheck className="h-4 w-4 mr-1" />Verification</TabsTrigger>
            <TabsTrigger value="fleet"><Bike className="h-4 w-4 mr-1" />Fleet</TabsTrigger>
            <TabsTrigger value="bookings"><Clock className="h-4 w-4 mr-1" />Bookings</TabsTrigger>
            <TabsTrigger value="wallet"><Wallet className="h-4 w-4 mr-1" />Wallet</TabsTrigger>
            <TabsTrigger value="notes"><FileText className="h-4 w-4 mr-1" />Notes & Files</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Business profile</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Field label="Business name" value={agency?.business_name} />
                <Field label="Owner profile name" value={profile.full_name || profile.name} />
                <Field label="RC" value={agency?.rc} copyable onCopy={() => copy(agency?.rc)} />
                <Field label="ICE" value={agency?.ice} copyable onCopy={() => copy(agency?.ice)} />
                <Field label="City" value={agency?.city} icon={<MapPin className="h-3.5 w-3.5" />} />
                <Field label="Neighborhood" value={agency?.primary_neighborhood} />
                <Field label="Address" value={agency?.address} className="md:col-span-2" />
                <Field label="Coordinates" value={agency?.lat && agency?.lng ? `${agency.lat}, ${agency.lng}` : null} />
                <Field label="Delivery offered" value={agency?.delivery_offered ? "Yes" : "No"} />
                <Field label="Delivery fee (MAD)" value={agency?.delivery_fee_mad?.toString()} />
                <Field label="Delivery radius (km)" value={agency?.delivery_radius_km?.toString()} />
                <Field label="Bio" value={agency?.bio} className="md:col-span-2" />
                <Field label="Subscription plan" value={subscription?.plan || agency?.subscription_plan || "free"} />
                <Field label="Trial ends" value={fmt(agency?.trial_ends_at)} />
                <Field label="Account created" value={fmt(profile.created_at)} />
                <Field label="Suspended reason" value={agency?.suspended_reason} className="md:col-span-2" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification */}
          <TabsContent value="verification" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">Business verification submission</CardTitle>
                  <div className="flex gap-2">
                    {agency && !agency.is_verified && (
                      <Button size="sm" onClick={approveAgency} disabled={submitting}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    )}
                    {agency && agency.verification_status !== "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Badge variant="outline">Status: {agency?.verification_status || "—"}</Badge>
                  {agency?.rejected_at && <Badge variant="destructive">Rejected {fmt(agency.rejected_at)}</Badge>}
                </div>
                {agency?.rejection_reason && (
                  <div className="text-sm border rounded-md p-3 bg-muted/40">
                    <div className="text-xs text-muted-foreground mb-1">Last rejection reason</div>
                    {agency.rejection_reason}
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium mb-2">Documents</div>
                  {docsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {docs.map((d) => (
                        <div key={d.key} className="border rounded-md p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{SLOT_LABEL[d.key]}</div>
                            <div className="text-xs text-muted-foreground truncate">{d.file_name}</div>
                          </div>
                          {d.signed_url ? (
                            <Button size="sm" variant="outline" asChild>
                              <a href={d.signed_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                              </a>
                            </Button>
                          ) : (
                            <Badge variant="outline">Unavailable</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fleet */}
          <TabsContent value="fleet" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Fleet ({bikes.length})</CardTitle></CardHeader>
              <CardContent>
                {bikes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bikes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {bikes.map((b) => (
                      <Link
                        key={b.id}
                        to={`/admin/bikes/${b.id}`}
                        className="flex items-center gap-3 border rounded-md p-3 hover:bg-muted/40 transition"
                      >
                        <div className="h-12 w-16 rounded bg-muted overflow-hidden flex-shrink-0">
                          {b.main_image_url && <img src={b.main_image_url} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{b.name}</div>
                          <div className="text-xs text-muted-foreground">{b.brand} {b.model} · {b.daily_price} MAD/day</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={b.approval_status === "approved" ? "default" : b.approval_status === "rejected" ? "destructive" : "secondary"}>{b.approval_status}</Badge>
                          <Badge variant="outline" className="capitalize">{b.business_status}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Recent bookings ({bookings.length})</CardTitle></CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((bk) => (
                      <Link key={bk.id} to={`/admin/bookings/${bk.id}`} className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/40 transition">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{bk.customer_name || "Unknown renter"}</div>
                          <div className="text-xs text-muted-foreground">{fmt(bk.pickup_date)} → {fmt(bk.return_date)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="capitalize">{bk.booking_status || bk.status}</Badge>
                          <span className="text-xs text-muted-foreground">{Number(bk.total_price || 0).toFixed(0)} MAD</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallet */}
          <TabsContent value="wallet" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Wallet & subscription</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <Field label="Balance" value={wallet ? `${Number(wallet.balance).toFixed(2)} ${wallet.currency}` : "—"} />
                <Field label="Subscription" value={subscription?.plan || agency?.subscription_plan || "free"} />
                <Field label="Subscription status" value={subscription?.status} />
                <Field label="Trial ends" value={fmt(subscription?.trial_ends_at || agency?.trial_ends_at)} />
                <Field label="Period end" value={fmt(subscription?.current_period_end)} />
                <Field label="Locked at" value={fmt(subscription?.locked_at)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Recent transactions</CardTitle></CardHeader>
              <CardContent>
                {walletTx.length === 0 ? <p className="text-sm text-muted-foreground">No transactions.</p> : (
                  <div className="space-y-1.5">
                    {walletTx.map((t) => (
                      <div key={t.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                        <div>
                          <div className="font-medium capitalize">{t.type}</div>
                          <div className="text-xs text-muted-foreground">{t.description || t.method || t.reference} · {fmt(t.created_at, "MMM d, HH:mm")}</div>
                        </div>
                        <div className={`font-semibold ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}>
                          {Number(t.amount) >= 0 ? "+" : ""}{Number(t.amount).toFixed(2)} {t.currency}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes & Files */}
          <TabsContent value="notes" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Admin notes</CardTitle>
                  <Button size="sm" onClick={() => setShowNoteDialog(true)}>Add note</Button>
                </div>
              </CardHeader>
              <CardContent>
                {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : (
                  <div className="space-y-2">
                    {notes.map((n) => (
                      <div key={n.id} className="border rounded-md p-3 text-sm">
                        <div className="text-xs text-muted-foreground mb-1">{fmt(n.created_at, "PP p")}</div>
                        <div>{n.description || n.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Files</CardTitle></CardHeader>
              <CardContent>
                {files.length === 0 ? <p className="text-sm text-muted-foreground">No files uploaded.</p> : (
                  <div className="space-y-1.5">
                    {files.map((f) => (
                      <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-between border rounded-md p-2 text-sm hover:bg-muted/40">
                        <span className="truncate">{f.file_name}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
              <CardContent>
                {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No timeline events.</p> : (
                  <div className="space-y-2">
                    {timeline.map((e) => (
                      <div key={e.id} className="border-l-2 pl-3 py-1.5">
                        <div className="text-xs text-muted-foreground">{fmt(e.created_at, "PP p")}</div>
                        <div className="font-medium text-sm">{e.title}</div>
                        {e.description && <div className="text-sm text-muted-foreground">{e.description}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Notification dialog */}
      <Dialog open={showNotify} onOpenChange={setShowNotify}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send notification</DialogTitle>
            <DialogDescription>Send an in-app notification to this business.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} /></div>
            <div><Label>Message</Label><Textarea rows={4} value={notifyMsg} onChange={(e) => setNotifyMsg(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotify(false)}>Cancel</Button>
            <Button onClick={sendNotification} disabled={submitting || !notifyTitle.trim() || !notifyMsg.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject business</DialogTitle>
            <DialogDescription>Provide at least 20 characters of feedback. The business will be notified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {REJECT_PRESETS.map((p) => (
                <Button key={p} size="sm" variant="outline" onClick={() => setRejectReason(p)}>{p}</Button>
              ))}
            </div>
            <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." />
            <p className="text-xs text-muted-foreground">{rejectReason.length}/20 minimum</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={rejectAgency} disabled={submitting || rejectReason.trim().length < 20}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject & notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add admin note</DialogTitle></DialogHeader>
          <Textarea rows={4} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Internal note..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={submitting || !noteDraft.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const Field = ({ label, value, icon, copyable, onCopy, className }: { label: string; value?: string | null; icon?: React.ReactNode; copyable?: boolean; onCopy?: () => void; className?: string }) => (
  <div className={className}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm flex items-center gap-1.5">
      {icon} <span className="break-words">{value || "—"}</span>
      {copyable && value && (
        <button onClick={onCopy} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
      )}
    </div>
  </div>
);

export default AdminBusinessDetails;
