import { useState, useEffect } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BusinessUser {
  id: string;
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

const businessTypeLabel = (bt: string | null) => {
  if (bt === "rental_shop") return { label: "Rental Shop", icon: Store };
  if (bt === "individual" || bt === "individual_owner") return { label: "Individual Owner", icon: User };
  return { label: "Business", icon: Building2 };
};

export const AdminBusinessClientsTab = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("clients");

  const [businesses, setBusinesses] = useState<BusinessUser[]>([]);
  const [filtered, setFiltered] = useState<BusinessUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
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

  useEffect(() => {
    fetchBusinesses();
    fetchApplications();
  }, []);

  useEffect(() => {
    try {
      let result = businesses;

      if (typeFilter === "shop") {
        result = result.filter((b) => b.business_type === "rental_shop");
      } else if (typeFilter === "individual") {
        result = result.filter(
          (b) => b.business_type === "individual" || b.business_type === "individual_owner" || !b.business_type,
        );
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          (b) =>
            b.name?.toLowerCase().includes(q) ||
            b.email?.toLowerCase().includes(q) ||
            b.phone?.includes(searchQuery),
        );
      }

      setFiltered(result);
    } catch (error) {
      console.error("[AdminBusinessClientsTab] Error filtering:", error);
      setFiltered(businesses);
    }
  }, [searchQuery, typeFilter, businesses]);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "business")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error: unknown) {
      console.error("[AdminBusinessClientsTab] Failed to load:", error);
      toast.error("Failed to load business clients");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplications = async () => {
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
    } finally {
      setIsLoadingApps(false);
    }
  };

  const handleFreeze = async (userId: string, freeze: boolean) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_frozen: freeze,
          frozen_reason: freeze ? "Frozen by admin" : null,
        })
        .eq("id", userId);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: userId,
        title: freeze ? "Account Frozen" : "Account Unfrozen",
        message: freeze
          ? "Your business account has been frozen. Please contact support for assistance."
          : "Your business account has been unfrozen. You can now access all features.",
        type: freeze ? "warning" : "success",
      });

      toast.success(freeze ? "Account frozen" : "Account unfrozen");
      fetchBusinesses();
    } catch (error: unknown) {
      toast.error("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!selected || !notificationTitle || !notificationMessage) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: selected.id,
        title: notificationTitle,
        message: notificationMessage,
        type: "info",
      });
      if (error) throw error;
      toast.success("Notification sent!");
      setShowNotificationDialog(false);
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error: unknown) {
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
        .eq("id", userId);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "agency" });
      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

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
    } catch (error: unknown) {
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
        .eq("id", userId);
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
    } catch (error: unknown) {
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

  const pendingCount = applications.filter(
    (a) => a.status === "unread" || !a.status || a.status === "pending",
  ).length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const frozenCount = businesses.filter((b) => b.is_frozen).length;
  const shopsCount = businesses.filter((b) => b.business_type === "rental_shop").length;
  const individualsCount = businesses.filter(
    (b) => b.business_type === "individual" || b.business_type === "individual_owner" || !b.business_type,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{businesses.length}</p>
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
              Approved Businesses ({businesses.length})
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
                    {filtered.length} business clients found ({shopsCount} shops · {individualsCount} individual owners)
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={typeFilter === "all" ? "default" : "outline"}
                      onClick={() => setTypeFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={typeFilter === "shop" ? "default" : "outline"}
                      onClick={() => setTypeFilter("shop")}
                      className="gap-1"
                    >
                      <Store className="h-3 w-3" />
                      Shops
                    </Button>
                    <Button
                      size="sm"
                      variant={typeFilter === "individual" ? "default" : "outline"}
                      onClick={() => setTypeFilter("individual")}
                      className="gap-1"
                    >
                      <User className="h-3 w-3" />
                      Individuals
                    </Button>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <AdminTableSkeleton />
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No business clients found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((biz) => {
                        const typeInfo = businessTypeLabel(biz.business_type);
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
                              <Badge variant="outline" className="gap-1">
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
                                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/clients/${biz.id}`)}>
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
                                  {biz.is_frozen ? <CheckCircle className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
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
                <div className="text-center py-12 text-muted-foreground">No pending applications</div>
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
                            <Badge variant="outline" className="gap-1">
                              <TypeIcon className="h-3 w-3" />
                              {isShop ? "Rental Shop" : "Individual"}
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
