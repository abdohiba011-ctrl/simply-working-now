import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminFleetSkeleton } from "@/components/ui/admin-skeleton";
import { DangerConfirmDialog } from "@/components/admin/DangerConfirmDialog";
import {
  Bike as BikeIcon,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolveBikeImageUrl } from "@/lib/bikeImageResolver";
import { cn } from "@/lib/utils";

interface BikeType {
  id: string;
  name: string;
  daily_price: number;
  main_image_url: string;
  is_original: boolean;
  approval_status: string;
  business_status: string;
  owner_id: string | null;
  created_at: string;
}

interface BikeInventory {
  id: string;
  bike_type_id: string;
  quantity: number;
  available_quantity: number;
}

interface OwnerInfo {
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  email: string | null;
  business_logo_url: string | null;
  is_verified: boolean | null;
}

interface AgencyGroup {
  ownerId: string; // "platform" for Motonita-owned
  ownerName: string;
  ownerEmail: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  isPlatform: boolean;
  bikes: BikeType[];
}

const PLATFORM_KEY = "platform";

export const AdminFleetTab = () => {
  const navigate = useNavigate();
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [inventory, setInventory] = useState<BikeInventory[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [openAgencies, setOpenAgencies] = useState<Record<string, boolean>>({});

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingBikeId, setRejectingBikeId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [typesRes, invRes] = await Promise.all([
        supabase.from("bike_types").select("id,name,daily_price,main_image_url,is_original,approval_status,business_status,owner_id,created_at").order("created_at", { ascending: false }),
        supabase.from("bike_inventory").select("id,bike_type_id,quantity,available_quantity"),
      ]);
      if (typesRes.error) throw typesRes.error;
      if (invRes.error) throw invRes.error;

      const types = (typesRes.data || []) as BikeType[];
      setBikeTypes(types);
      setInventory((invRes.data || []) as BikeInventory[]);

      // Fetch owner profiles for all unique owner_ids
      const ownerIds = Array.from(new Set(types.map((t) => t.owner_id).filter(Boolean))) as string[];
      if (ownerIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,business_name,full_name,email,business_logo_url,is_verified")
          .in("user_id", ownerIds);
        const map: Record<string, OwnerInfo> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = p as OwnerInfo;
        });
        setOwners(map);
      } else {
        setOwners({});
      }
    } catch (error) {
      toast.error("Failed to load bikes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const groups = useMemo<AgencyGroup[]>(() => {
    const visible = bikeTypes.filter((b) =>
      showDeleted ? true : b.business_status !== "admin_deleted"
    );

    const map = new Map<string, AgencyGroup>();
    for (const b of visible) {
      const isPlatform = !b.owner_id || b.is_original === true;
      const key = isPlatform ? PLATFORM_KEY : b.owner_id!;
      if (!map.has(key)) {
        const owner = b.owner_id ? owners[b.owner_id] : undefined;
        map.set(key, {
          ownerId: key,
          ownerName: isPlatform
            ? "Motonita (platform)"
            : owner?.business_name || owner?.full_name || owner?.email || "Unknown agency",
          ownerEmail: isPlatform ? null : owner?.email || null,
          logoUrl: isPlatform ? null : owner?.business_logo_url || null,
          isVerified: isPlatform ? true : Boolean(owner?.is_verified),
          isPlatform,
          bikes: [],
        });
      }
      map.get(key)!.bikes.push(b);
    }

    let arr = Array.from(map.values());

    // Search
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      arr = arr
        .map((g) => ({
          ...g,
          bikes: g.bikes.filter((b) => b.name.toLowerCase().includes(s)),
        }))
        .filter((g) => g.ownerName.toLowerCase().includes(s) || g.bikes.length > 0);
    }
    // Status filter
    if (statusFilter !== "all") {
      arr = arr
        .map((g) => ({ ...g, bikes: g.bikes.filter((b) => b.approval_status === statusFilter) }))
        .filter((g) => g.bikes.length > 0);
    }
    // Agency filter
    if (agencyFilter !== "all") {
      arr = arr.filter((g) => g.ownerId === agencyFilter);
    }

    return arr.sort((a, b) => {
      // Platform last
      if (a.isPlatform !== b.isPlatform) return a.isPlatform ? 1 : -1;
      return a.ownerName.localeCompare(b.ownerName);
    });
  }, [bikeTypes, owners, searchQuery, statusFilter, agencyFilter, showDeleted]);

  const totals = useMemo(() => {
    const all = bikeTypes.filter((b) => b.business_status !== "admin_deleted");
    return {
      total: all.length,
      pending: all.filter((b) => b.approval_status === "pending").length,
      approved: all.filter((b) => b.approval_status === "approved").length,
      rejected: all.filter((b) => b.approval_status === "rejected").length,
      agencies: new Set(
        all.filter((b) => b.owner_id && !b.is_original).map((b) => b.owner_id)
      ).size,
    };
  }, [bikeTypes]);

  const inventoryFor = (bikeTypeId: string) =>
    inventory.filter((i) => i.bike_type_id === bikeTypeId);
  const totalQty = (id: string) =>
    inventoryFor(id).reduce((s, i) => s + (i.quantity || 0), 0);
  const availQty = (id: string) =>
    inventoryFor(id).reduce((s, i) => s + (i.available_quantity || 0), 0);

  const isOpen = (key: string) => {
    if (key in openAgencies) return openAgencies[key];
    // Auto-open agencies with pending bikes
    const g = groups.find((gr) => gr.ownerId === key);
    return g ? g.bikes.some((b) => b.approval_status === "pending") : false;
  };
  const toggle = (key: string) =>
    setOpenAgencies((prev) => ({ ...prev, [key]: !isOpen(key) }));

  const handleApprove = async (bikeId: string) => {
    try {
      const { error } = await supabase
        .from("bike_types")
        .update({ is_approved: true, approval_status: "approved" })
        .eq("id", bikeId);
      if (error) throw error;
      toast.success("Bike approved");
      fetchData();
    } catch {
      toast.error("Failed to approve bike");
    }
  };

  const openReject = (id: string) => {
    setRejectingBikeId(id);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!rejectingBikeId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("bike_types")
        .update({ is_approved: false, approval_status: "rejected" })
        .eq("id", rejectingBikeId);
      if (error) throw error;
      toast.success("Bike rejected");
      setShowRejectDialog(false);
      fetchData();
    } catch {
      toast.error("Failed to reject bike");
    } finally {
      setIsSaving(false);
    }
  };

  const [softDeleteId, setSoftDeleteId] = useState<string | null>(null);
  const [hardDeleteId, setHardDeleteId] = useState<string | null>(null);

  const performSoftDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bike_types")
        .update({ business_status: "admin_deleted" })
        .eq("id", id);
      if (error) throw error;
      toast.success("Bike removed");
      fetchData();
    } catch {
      toast.error("Failed to delete bike");
    }
  };

  const performHardDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("bike_types").delete().eq("id", id);
      if (error) throw error;
      toast.success("Bike deleted permanently");
      fetchData();
    } catch {
      toast.error("Failed to delete bike");
    }
  };

  const statusBadge = (status: string) => {
    if (status === "approved")
      return <Badge className="bg-success/10 text-success border-success/20 text-xs">Approved</Badge>;
    if (status === "rejected")
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Rejected</Badge>;
    return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Pending</Badge>;
  };

  if (isLoading) return <AdminFleetSkeleton />;

  const agencyOptions = Array.from(
    new Set(bikeTypes.filter((b) => b.business_status !== "admin_deleted").map((b) => (b.owner_id && !b.is_original ? b.owner_id : PLATFORM_KEY)))
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="px-3 py-1.5 text-sm bg-primary/5 text-primary border-primary/20">
          <BikeIcon className="h-3.5 w-3.5 mr-1.5" />
          Total: {totals.total}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm bg-warning/10 text-warning border-warning/30">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Pending: {totals.pending}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm bg-success/10 text-success border-success/30">
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Approved: {totals.approved}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm bg-destructive/10 text-destructive border-destructive/30">
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Rejected: {totals.rejected}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm bg-info/10 text-info border-info/30">
          <Building2 className="h-3.5 w-3.5 mr-1.5" />
          Agencies: {totals.agencies}
        </Badge>
      </div>

      {/* Pending banner */}
      {totals.pending > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium">{totals.pending} bike{totals.pending > 1 ? "s" : ""} awaiting your review</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusFilter("pending")}
            >
              Filter to pending
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bike or agency…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All agencies" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agencies</SelectItem>
              {agencyOptions.map((id) => {
                const isPlatform = id === PLATFORM_KEY;
                const o = isPlatform ? null : owners[id];
                const label = isPlatform
                  ? "Motonita (platform)"
                  : o?.business_name || o?.full_name || o?.email || id.slice(0, 8);
                return (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            variant={showDeleted ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDeleted((v) => !v)}
          >
            {showDeleted ? "Hide deleted" : "Show deleted"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate("/admin/fleet/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add bike type
          </Button>
        </div>
      </div>

      {/* Agency groups */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No bikes match your filters.
            </CardContent>
          </Card>
        ) : (
          groups.map((g) => {
            const open = isOpen(g.ownerId);
            const pendingCount = g.bikes.filter((b) => b.approval_status === "pending").length;
            const approvedCount = g.bikes.filter((b) => b.approval_status === "approved").length;
            const rejectedCount = g.bikes.filter((b) => b.approval_status === "rejected").length;
            return (
              <Card key={g.ownerId} className="overflow-hidden">
                <Collapsible open={open} onOpenChange={() => toggle(g.ownerId)}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full text-left p-4 flex flex-wrap items-center gap-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {g.logoUrl ? (
                          <img
                            src={g.logoUrl}
                            alt=""
                            className="h-9 w-9 rounded-md object-cover bg-muted"
                            onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">{g.ownerName}</span>
                            {g.isVerified && (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {g.isPlatform && (
                              <Badge variant="outline" className="text-xs">Platform</Badge>
                            )}
                          </div>
                          {g.ownerEmail && (
                            <p className="text-xs text-muted-foreground truncate">{g.ownerEmail}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <Badge variant="outline">{g.bikes.length} bikes</Badge>
                        {pendingCount > 0 && (
                          <Badge className="bg-warning/10 text-warning border-warning/20">{pendingCount} pending</Badge>
                        )}
                        {approvedCount > 0 && (
                          <Badge className="bg-success/10 text-success border-success/20">{approvedCount} approved</Badge>
                        )}
                        {rejectedCount > 0 && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">{rejectedCount} rejected</Badge>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/20 p-3 space-y-2">
                      {g.bikes.map((bike) => (
                        <div
                          key={bike.id}
                          className={cn(
                            "flex flex-wrap items-center gap-3 p-3 rounded-md bg-background border",
                            bike.business_status === "admin_deleted" && "opacity-60"
                          )}
                        >
                          <img
                            src={resolveBikeImageUrl(bike.main_image_url)}
                            alt={bike.name}
                            loading="lazy"
                            className="h-12 w-16 rounded object-cover bg-muted"
                            onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                          />
                          <div className="flex-1 min-w-[160px]">
                            <p className="font-medium text-sm truncate">{bike.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {bike.daily_price} DH/day · Inventory {availQty(bike.id)}/{totalQty(bike.id)}
                            </p>
                          </div>
                          {statusBadge(bike.approval_status)}
                          <div className="flex gap-1.5">
                            {bike.approval_status === "pending" && (
                              <>
                                <Button size="sm" onClick={() => handleApprove(bike.id)}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openReject(bike.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/admin/fleet/${bike.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!g.isPlatform ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSoftDeleteId(bike.id)}
                                title="Soft delete"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setHardDeleteId(bike.id)}
                                title="Permanently delete"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject bike submission</DialogTitle>
            <DialogDescription>
              The owner will be notified. Provide a clear reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection reason</Label>
              <Textarea
                placeholder="e.g., Image quality is too low, missing specifications…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DangerConfirmDialog
        open={!!softDeleteId}
        onOpenChange={(o) => !o && setSoftDeleteId(null)}
        title="Remove this bike?"
        description="The bike will be hidden from the public site. The agency can re-submit it later."
        confirmLabel="Remove bike"
        onConfirm={async () => { if (softDeleteId) await performSoftDelete(softDeleteId); }}
      />

      <DangerConfirmDialog
        open={!!hardDeleteId}
        onOpenChange={(o) => !o && setHardDeleteId(null)}
        title="Permanently delete bike type?"
        description="This cannot be undone. All references to this bike type will be lost."
        confirmLabel="Delete permanently"
        withReason
        requireReason
        reasonLabel="Why are you deleting this?"
        onConfirm={async () => { if (hardDeleteId) await performHardDelete(hardDeleteId); }}
      />
    </div>
  );
};
