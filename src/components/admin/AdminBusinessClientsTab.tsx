import { useState, useEffect, useCallback } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { AdminTableSkeleton, AdminRentalShopsApplicationsSkeleton } from "@/components/ui/admin-skeleton";
import {
  Loader2,
  Search,
  Eye,
  Send,
  Snowflake,
  CheckCircle,
  Building2,
  Phone,
  Mail,
  XCircle,
  Clock,
  Bike,
  RefreshCw,
  Store,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ApplicationDocumentsPreview } from "@/components/admin/ApplicationDocumentsPreview";

interface BusinessUser {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  verification_status: string | null;
  is_frozen: boolean | null;
  frozen_reason: string | null;
  created_at: string | null;
  business_type: string | null;
}

interface BusinessApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
  parsedData?: {
    partnerType: "individual" | "shop";
    companyRC?: string;
    bikesCount: string;
    userId: string;
  };
}

const formatDate = (dateString: string | null, formatStr: string = "MMM d, yyyy"): string => {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), formatStr);
  } catch {
    return "N/A";
  }
};

type TypeFilter = "all" | "shop" | "individual";
type SortField = "created_at" | "name" | "email";
type SortDir = "asc" | "desc";

// Exact mapping to stored business_type values in profiles
const SHOP_TYPES = ["rental_shop"];
const INDIVIDUAL_TYPES = ["individual_owner", "individual"];

const businessTypeBadge = (bt: string | null) => {
  if (bt && SHOP_TYPES.includes(bt)) {
    return { label: "Rental Shop", icon: Store, variant: "default" as const };
  }
  if (bt && INDIVIDUAL_TYPES.includes(bt)) {
    return { label: "Individual Owner", icon: User, variant: "secondary" as const };
  }
  return { label: "Unspecified", icon: Building2, variant: "outline" as const };
};

const PAGE_SIZE = 20;

export const AdminBusinessClientsTab = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("clients");

  // Server-side data state
  const [businesses, setBusinesses] = useState<BusinessUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [shopsCount, setShopsCount] = useState(0);
  const [individualsCount, setIndividualsCount] = useState(0);
  const [frozenCount, setFrozenCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const [selected, setSelected] = useState<BusinessUser | null>(null);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<BusinessApplication | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Debounce search input -> searchQuery
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to first page when filter/sort changes
  useEffect(() => {
    setPage(0);
  }, [typeFilter, sortField, sortDir]);

  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select(
          "id,user_id,name,full_name,email,phone,avatar_url,is_verified,verification_status,is_frozen,frozen_reason,created_at,business_type",
          { count: "exact" },
        )
        .eq("user_type", "business");

      if (typeFilter === "shop") {
        query = query.in("business_type", SHOP_TYPES);
      } else if (typeFilter === "individual") {
        query = query.in("business_type", INDIVIDUAL_TYPES);
      }

      if (searchQuery) {
        const escaped = searchQuery.replace(/[%,()]/g, " ");
        query = query.or(
          `name.ilike.%${escaped}%,full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
        );
      }

      query = query.order(sortField, { ascending: sortDir === "asc" });

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const rows: BusinessUser[] = (data || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name || p.full_name,
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatar_url,
        is_verified: p.is_verified,
        verification_status: p.verification_status,
        is_frozen: p.is_frozen,
        frozen_reason: p.frozen_reason,
        created_at: p.created_at,
        business_type: p.business_type,
      }));
      setBusinesses(rows);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("[AdminBusinessClientsTab] Failed to load:", error);
      toast.error("Failed to load business clients");
      setBusinesses([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, searchQuery, sortField, sortDir, page]);

  // Fetch aggregate counts (independent of pagination)
  const fetchAggregates = useCallback(async () => {
    try {
      const [shopsRes, indivRes, frozenRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_type", "business")
          .in("business_type", SHOP_TYPES),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_type", "business")
          .in("business_type", INDIVIDUAL_TYPES),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_type", "business")
          .eq("is_frozen", true),
      ]);
      setShopsCount(shopsRes.count || 0);
      setIndividualsCount(indivRes.count || 0);
      setFrozenCount(frozenRes.count || 0);
    } catch (error) {
      console.error("[AdminBusinessClientsTab] Aggregates failed:", error);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setIsLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .eq("type", "business_application")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsed: BusinessApplication[] = [];
      for (const app of data || []) {
        try {
          let parsedData = null;
          if (app.message) {
            try {
              parsedData = JSON.parse(app.message);
            } catch {
              continue;
            }
          }
          if (parsedData?.userId) {
            parsed.push({ ...app, parsedData });
          }
        } catch (itemError) {
          console.warn("[AdminBusinessClientsTab] Error processing application:", app.id, itemError);
        }
      }
      setApplications(parsed);
    } catch (error) {
      console.error("[AdminBusinessClientsTab] Failed to load applications:", error);
      toast.error("Failed to load applications");
      setApplications([]);
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    fetchAggregates();
    fetchApplications();
  }, [fetchAggregates, fetchApplications]);

  const handleFreeze = async (profileId: string, freeze: boolean) => {
    setActionLoading(true);
    try {
      const target = businesses.find((b) => b.id === profileId);
      const { error } = await supabase
        .from("profiles")
        .update({
          is_frozen: freeze,
          frozen_reason: freeze ? "Frozen by admin" : null,
        })
        .eq("id", profileId);

      if (error) throw error;

      if (target?.user_id) {
        await supabase.from("notifications").insert({
          user_id: target.user_id,
          title: freeze ? "Account Frozen" : "Account Unfrozen",
          message: freeze
            ? "Your business account has been frozen. Please contact support for assistance."
            : "Your business account has been unfrozen. You can now access all features.",
          type: freeze ? "warning" : "success",
        });
      }

      await supabase.rpc("log_audit_event", {
        _action: freeze ? "business_frozen" : "business_unfrozen",
        _table_name: "profiles",
        _record_id: profileId,
        _details: { auth_user_id: target?.user_id ?? null, frozen: freeze },
      });

      toast.success(freeze ? "Account frozen" : "Account unfrozen");
      fetchBusinesses();
      fetchAggregates();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!selected || !notificationTitle || !notificationMessage) return;
    if (!selected.user_id) {
      toast.error("Cannot send: missing user reference");
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: selected.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: "info",
      });
      if (error) throw error;
      await supabase.rpc("log_audit_event", {
        _action: "admin_notification_sent",
        _table_name: "notifications",
        _record_id: selected.user_id,
        _details: { title: notificationTitle, recipient_profile_id: selected.id, recipient_kind: "business" },
      });
      toast.success("Notification sent!");
      setShowNotificationDialog(false);
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send notification");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApplication?.parsedData) return;
    setIsSaving(true);
    try {
      const { userId, partnerType } = selectedApplication.parsedData;
      const business_type = partnerType === "shop" ? "rental_shop" : "individual_owner";

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ user_type: "business", business_type })
        .eq("user_id", userId);
      if (profileError) throw profileError;

      // Check for existing agency role first instead of relying on duplicate-error text
      const { data: existingRole, error: roleCheckError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "agency")
        .maybeSingle();
      if (roleCheckError) throw roleCheckError;

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "agency" });
        if (roleError) throw roleError;
      }

      const { error: statusError } = await supabase
        .from("contact_messages")
        .update({ status: "approved" })
        .eq("id", selectedApplication.id);
      if (statusError) throw statusError;

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Business Application Approved!",
        message:
          "Congratulations! Your business application has been approved. You can now access the Business Dashboard.",
        type: "success",
        action_url: "/business-dashboard",
      });

      toast.success("Application approved successfully");
      setShowApproveDialog(false);
      setSelectedApplication(null);
      fetchApplications();
      fetchBusinesses();
      fetchAggregates();
    } catch (error) {
      toast.error(getErrMsg(error) || "Failed to approve application");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication?.parsedData || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setIsSaving(true);
    try {
      const { userId } = selectedApplication.parsedData;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ user_type: "client", business_type: null })
        .eq("user_id", userId);
      if (profileError) throw profileError;

      const { error: statusError } = await supabase
        .from("contact_messages")
        .update({ status: "rejected" })
        .eq("id", selectedApplication.id);
      if (statusError) throw statusError;

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Business Application Update",
        message: `Your business application was not approved. Reason: ${rejectReason}. Please contact us if you have questions.`,
        type: "warning",
        action_url: "/contact",
      });

      toast.success("Application rejected");
      setShowRejectDialog(false);
      setSelectedApplication(null);
      setRejectReason("");
      fetchApplications();
    } catch (error) {
      toast.error(getErrMsg(error) || "Failed to reject application");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "B";
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "created_at" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const pendingCount = applications.filter(
    (a) => a.status === "unread" || !a.status || a.status === "pending",
  ).length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const fromRow = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const toRow = Math.min(totalCount, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Total Businesses</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/10 dark:bg-warning/10">
          <CardContent className="pt-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Pending Applications</p>
          </CardContent>
        </Card>
        <Card className="bg-success/10 dark:bg-success/10">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold text-success">{approvedCount}</p>
            <p className="text-sm text-muted-foreground">Recently Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5">
          <CardContent className="pt-4 text-center">
            <Snowflake className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{frozenCount}</p>
            <p className="text-sm text-muted-foreground">Frozen</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="clients" className="gap-2">
              <Building2 className="h-4 w-4" />
              Approved Businesses ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending Applications ({pendingCount})
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            onClick={() => {
              fetchBusinesses();
              fetchAggregates();
              fetchApplications();
            }}
            disabled={isLoading || isLoadingApps}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isLoadingApps ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Clients
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalCount} business clients
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, phone..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <AdminTableSkeleton />
              ) : businesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="font-medium">No business clients found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || typeFilter !== "all"
                      ? "Try adjusting your search or filters."
                      : "Approved businesses will appear here."}
                  </p>
                  {(searchQuery || typeFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setSearchInput("");
                        setTypeFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <button
                              className="flex items-center hover:text-foreground"
                              onClick={() => toggleSort("name")}
                            >
                              Business <SortIcon field="name" />
                            </button>
                          </TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>
                            <button
                              className="flex items-center hover:text-foreground"
                              onClick={() => toggleSort("email")}
                            >
                              Contact <SortIcon field="email" />
                            </button>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                            <button
                              className="flex items-center hover:text-foreground"
                              onClick={() => toggleSort("created_at")}
                            >
                              Joined <SortIcon field="created_at" />
                            </button>
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {businesses.map((biz) => {
                          const typeInfo = businessTypeBadge(biz.business_type);
                          const TypeIcon = typeInfo.icon;
                          return (
                            <TableRow key={biz.id} className={biz.is_frozen ? "bg-destructive/5" : ""}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={biz.avatar_url || undefined} />
                                    <AvatarFallback className="bg-primary/10">
                                      {getInitials(biz.name, biz.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{biz.name || "No name"}</p>
                                    <p className="text-xs text-muted-foreground">{biz.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={typeInfo.variant} className="gap-1">
                                  <TypeIcon className="h-3 w-3" />
                                  {typeInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {biz.phone || "N/A"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {biz.is_verified ? (
                                    <StatusBadge status="verified" label="Verified" />
                                  ) : (
                                    <StatusBadge
                                      status={biz.verification_status === "pending_review" ? "pending" : "not_started"}
                                      label={biz.verification_status === "pending_review" ? "Pending" : "Unverified"}
                                    />
                                  )}
                                  {biz.is_frozen && <StatusBadge status="frozen" label="Frozen" />}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">{formatDate(biz.created_at)}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/admin/clients/${biz.id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelected(biz);
                                      setShowNotificationDialog(true);
                                    }}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={biz.is_frozen ? "default" : "destructive"}
                                    onClick={() => handleFreeze(biz.id, !biz.is_frozen)}
                                    disabled={actionLoading}
                                  >
                                    {biz.is_frozen ? (
                                      <CheckCircle className="h-4 w-4" />
                                    ) : (
                                      <Snowflake className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                    <p className="text-sm text-muted-foreground">
                      Showing {fromRow}–{toRow} of {totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1 || isLoading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Applications
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and approve/reject business partner applications (shops & individual owners)
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingApps ? (
                <AdminRentalShopsApplicationsSkeleton />
              ) : applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="font-medium">No applications yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    New business partner applications will show up here for review.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Company RC</TableHead>
                      <TableHead>Bikes</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => {
                      const isShop = app.parsedData?.partnerType === "shop";
                      const TypeIcon = isShop ? Store : User;
                      return (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {app.name}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {app.email}
                              </div>
                              {app.phone && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {app.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isShop ? "default" : "secondary"} className="gap-1">
                              <TypeIcon className="h-3 w-3" />
                              {isShop ? "Rental Shop" : "Individual Owner"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{app.parsedData?.companyRC || "N/A"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Bike className="h-4 w-4 text-muted-foreground" />
                              {app.parsedData?.bikesCount || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(app.created_at)}</TableCell>
                          <TableCell className="text-center">
                            <StatusBadge
                              status={
                                app.status === "approved"
                                  ? "verified"
                                  : app.status === "rejected"
                                    ? "rejected"
                                    : "pending"
                              }
                              label={
                                app.status === "approved"
                                  ? "Approved"
                                  : app.status === "rejected"
                                    ? "Rejected"
                                    : "Pending"
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {(app.status === "unread" || !app.status || app.status === "pending") && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-success border-success hover:bg-success/10"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setShowApproveDialog(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive border-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setShowRejectDialog(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>Send a notification to {selected?.name || selected?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Your message..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={actionLoading || !notificationTitle || !notificationMessage}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Business Application</DialogTitle>
            <DialogDescription>
              This will grant business partner access to {selectedApplication?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p>
              <strong>Name:</strong> {selectedApplication?.name}
            </p>
            <p>
              <strong>Email:</strong> {selectedApplication?.email}
            </p>
            <p>
              <strong>Type:</strong>{" "}
              {selectedApplication?.parsedData?.partnerType === "shop" ? "Rental Shop" : "Individual Owner"}
            </p>
            <p>
              <strong>Bikes Count:</strong> {selectedApplication?.parsedData?.bikesCount}
            </p>
            {selectedApplication?.parsedData?.companyRC && (
              <p>
                <strong>Company RC:</strong> {selectedApplication.parsedData.companyRC}
              </p>
            )}
            {selectedApplication?.parsedData?.partnerType === "individual" && (
              <ApplicationDocumentsPreview applicationId={selectedApplication.id} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isSaving} className="bg-success hover:bg-success/90">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Business Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be sent to the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Rejection Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={isSaving || !rejectReason.trim()} variant="destructive">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <XCircle className="h-4 w-4 mr-1" />
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
