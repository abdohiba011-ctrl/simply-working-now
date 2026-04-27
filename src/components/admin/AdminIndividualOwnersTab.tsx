import { useState, useEffect } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IndividualOwnerApplicationsSkeleton } from "@/components/ui/bike-skeleton";
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
  Calendar,
  ShieldCheck,
  Copy,
  XCircle,
  Clock,
  Bike,
  RefreshCw,
  User,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { AdminTableSkeleton } from "@/components/ui/admin-skeleton";

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
  id_card_number: string | null;
  full_name_on_id: string | null;
  id_front_image_url: string | null;
  id_back_image_url: string | null;
  created_at: string | null;
  address: string | null;
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
    partnerType: 'individual' | 'shop';
    autoEntrepreneurNumber?: string;
    bikesCount: string;
    userId: string;
  };
}

const formatDate = (dateString: string | null, formatStr: string = 'MMM d, yyyy'): string => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), formatStr);
  } catch {
    return 'N/A';
  }
};

export const AdminIndividualOwnersTab = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("owners");
  const [hasError, setHasError] = useState(false);
  
  // Owners state
  const [owners, setOwners] = useState<BusinessUser[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<BusinessUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<BusinessUser | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Applications state
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<BusinessApplication | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchOwners();
    fetchApplications();
  }, []);

  useEffect(() => {
    try {
      if (searchQuery) {
        const filtered = owners.filter(owner => 
          owner.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          owner.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          owner.phone?.includes(searchQuery)
        );
        setFilteredOwners(filtered);
      } else {
        setFilteredOwners(owners);
      }
    } catch (error) {
      console.error('[AdminIndividualOwnersTab] Error filtering owners:', error);
      setFilteredOwners(owners);
    }
  }, [searchQuery, owners]);

  const fetchOwners = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'business')
        .or('business_type.eq.individual,business_type.eq.individual_owner,business_type.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOwners(data || []);
      setFilteredOwners(data || []);
    } catch (error: unknown) {
      console.error('[AdminIndividualOwnersTab] Failed to load owners:', error);
      toast.error("Failed to load individual owners");
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplications = async () => {
    setIsLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('type', 'business_application')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse and filter only individual applications - with defensive error handling
      const parsedApplications: BusinessApplication[] = [];
      
      for (const app of (data || [])) {
        try {
          let parsedData = null;
          if (app.message) {
            try {
              parsedData = JSON.parse(app.message);
            } catch (parseError) {
              console.warn('[AdminIndividualOwnersTab] Failed to parse application message:', app.id, parseError);
              continue; // Skip this application if parsing fails
            }
          }
          
          // Only include if partnerType is individual and has userId
          if (parsedData?.partnerType === 'individual' && parsedData?.userId) {
            parsedApplications.push({ ...app, parsedData });
          }
        } catch (itemError) {
          console.warn('[AdminIndividualOwnersTab] Error processing application:', app.id, itemError);
        }
      }
      
      setApplications(parsedApplications);
    } catch (error) {
      console.error('[AdminIndividualOwnersTab] Failed to load applications:', error);
      toast.error("Failed to load applications");
    } finally {
      setIsLoadingApps(false);
    }
  };

  const handleFreeze = async (userId: string, freeze: boolean) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_frozen: freeze,
          frozen_reason: freeze ? 'Frozen by admin' : null
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: userId,
        title: freeze ? 'Account Frozen' : 'Account Unfrozen',
        message: freeze 
          ? 'Your business account has been frozen. Please contact support for assistance.'
          : 'Your business account has been unfrozen. You can now access all features.',
        type: freeze ? 'warning' : 'success'
      });

      toast.success(freeze ? "Owner frozen" : "Owner unfrozen");
      fetchOwners();
    } catch (error: unknown) {
      toast.error("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!selectedOwner || !notificationTitle || !notificationMessage) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: selectedOwner.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'info'
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
    if (!selectedApplication || !selectedApplication.parsedData) return;
    
    setIsSaving(true);
    try {
      const { userId } = selectedApplication.parsedData;
      
      // Update profile to business
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: 'business',
          business_type: 'individual_owner'
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Add business role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'business' });

      if (roleError && !roleError.message.includes('duplicate')) throw roleError;

      // Update application status
      const { error: statusError } = await supabase
        .from('contact_messages')
        .update({ status: 'approved' })
        .eq('id', selectedApplication.id);

      if (statusError) throw statusError;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Business Application Approved!',
        message: 'Congratulations! Your business partner application has been approved. You can now access the Business Dashboard.',
        type: 'success',
        action_url: '/business-dashboard'
      });

      toast.success("Application approved successfully");
      setShowApproveDialog(false);
      setSelectedApplication(null);
      fetchApplications();
      fetchOwners();
    } catch (error: unknown) {
      toast.error(getErrMsg(error) || "Failed to approve application");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication || !selectedApplication.parsedData || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    
    setIsSaving(true);
    try {
      const { userId } = selectedApplication.parsedData;
      
      // Update profile back to client
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: 'client',
          business_type: null
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update application status
      const { error: statusError } = await supabase
        .from('contact_messages')
        .update({ status: 'rejected' })
        .eq('id', selectedApplication.id);

      if (statusError) throw statusError;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Business Application Update',
        message: `Your business partner application was not approved. Reason: ${rejectReason}. Please contact us if you have questions.`,
        type: 'warning',
        action_url: '/contact'
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };

  const pendingCount = applications.filter(a => a.status === 'unread' || !a.status || a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const frozenCount = owners.filter(o => o.is_frozen).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{owners.length}</p>
            <p className="text-sm text-muted-foreground">Total Owners</p>
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
            <TabsTrigger value="owners" className="gap-2">
              <Building2 className="h-4 w-4" />
              Approved Owners ({owners.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending Applications ({pendingCount})
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" onClick={() => { fetchOwners(); fetchApplications(); }} disabled={isLoading || isLoadingApps}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isLoadingApps) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Approved Owners Tab */}
        <TabsContent value="owners">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Individual Owners
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredOwners.length} individual owners found
                  </p>
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
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <AdminTableSkeleton />
              ) : filteredOwners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No individual owners found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Owner</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOwners.map((owner) => (
                        <TableRow key={owner.id} className={owner.is_frozen ? "bg-destructive/5" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={owner.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10">
                                  {getInitials(owner.name, owner.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{owner.name || 'No name'}</p>
                                <p className="text-xs text-muted-foreground">{owner.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {owner.phone || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {owner.is_verified ? (
                                <StatusBadge status="verified" label="Verified" />
                              ) : (
                                <StatusBadge 
                                  status={owner.verification_status === 'pending_review' ? 'pending' : 'not_started'} 
                                  label={owner.verification_status === 'pending_review' ? 'Pending' : 'Unverified'} 
                                />
                              )}
                              {owner.is_frozen && (
                                <StatusBadge status="frozen" label="Frozen" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(owner.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/admin/clients/${owner.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedOwner(owner); setShowNotificationDialog(true); }}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={owner.is_frozen ? "default" : "destructive"}
                                onClick={() => handleFreeze(owner.id, !owner.is_frozen)}
                                disabled={actionLoading}
                              >
                                {owner.is_frozen ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <Snowflake className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Individual Owner Applications
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and approve/reject individual owner applications
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingApps ? (
                <IndividualOwnerApplicationsSkeleton />
              ) : applications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No pending applications
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Bikes</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
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
                          <div className="flex items-center gap-1">
                            <Bike className="h-4 w-4 text-muted-foreground" />
                            {app.parsedData?.bikesCount || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(app.created_at)}</TableCell>
                        <TableCell className="text-center">
                          <StatusBadge 
                            status={app.status === 'approved' ? 'verified' : app.status === 'rejected' ? 'rejected' : 'pending'} 
                            label={app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Pending'}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {(app.status === 'unread' || !app.status || app.status === 'pending') && (
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a notification to {selectedOwner?.name || selectedOwner?.email}
            </DialogDescription>
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
            <Button onClick={handleSendNotification} disabled={actionLoading || !notificationTitle || !notificationMessage}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Business Application</DialogTitle>
            <DialogDescription>
              This will grant business partner access to {selectedApplication?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p><strong>Name:</strong> {selectedApplication?.name}</p>
            <p><strong>Email:</strong> {selectedApplication?.email}</p>
            <p><strong>Type:</strong> Individual Owner</p>
            <p><strong>Bikes Count:</strong> {selectedApplication?.parsedData?.bikesCount}</p>
            {selectedApplication?.parsedData?.autoEntrepreneurNumber && (
              <p><strong>Auto Entrepreneur #:</strong> {selectedApplication.parsedData.autoEntrepreneurNumber}</p>
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

      {/* Reject Dialog */}
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
            <Button 
              onClick={handleReject} 
              disabled={isSaving || !rejectReason.trim()} 
              variant="destructive"
            >
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
