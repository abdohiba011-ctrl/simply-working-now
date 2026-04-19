import { useState, useEffect } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Briefcase, 
  User,
  Building2,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Bike,
  Eye,
  Calendar,
  FileText,
  Hash
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminTableSkeleton } from "@/components/ui/admin-skeleton";

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
    companyRC?: string;
    bikesCount: string;
    userId: string;
  };
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return 'N/A';
  }
};

export const AdminBusinessApplicationsTab = () => {
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<BusinessApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('type', 'business_application')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse the JSON message field for each application
      const parsedApplications = (data || []).map(app => {
        let parsedData;
        try {
          parsedData = JSON.parse(app.message);
        } catch {
          parsedData = null;
        }
        return { ...app, parsedData };
      });
      
      setApplications(parsedApplications);
    } catch (error) {
      toast.error("Failed to load applications");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApplication || !selectedApplication.parsedData) return;
    
    setIsSaving(true);
    try {
      const { userId, partnerType } = selectedApplication.parsedData;
      const businessType = partnerType === 'individual' ? 'individual_owner' : 'rental_shop';
      
      // Update profile to business
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: 'business',
          business_type: businessType
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

      // Send email notification
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: 'business_approved',
            recipientEmail: selectedApplication.email,
            recipientName: selectedApplication.name,
            data: {
              partnerType: businessType,
              businessName: selectedApplication.name
            }
          }
        });
        console.log('Approval email sent successfully');
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast.success("Application approved successfully");
      setShowApproveDialog(false);
      setSelectedApplication(null);
      fetchApplications();
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

      // Send email notification
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: 'business_rejected',
            recipientEmail: selectedApplication.email,
            recipientName: selectedApplication.name,
            data: {
              rejectionReason: rejectReason
            }
          }
        });
        console.log('Rejection email sent successfully');
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Don't fail the whole operation if email fails
      }

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

  const getStatusType = (status: string): string => {
    switch (status) {
      case 'approved': return 'verified';
      case 'rejected': return 'rejected';
      default: return 'pending';
    }
  };

  const pendingCount = applications.filter(a => a.status === 'unread' || !a.status || a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Briefcase className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{applications.length}</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/10 dark:bg-warning/10">
          <CardContent className="pt-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-success/10 dark:bg-success/10">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold text-success">{approvedCount}</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5">
          <CardContent className="pt-4 text-center">
            <XCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchApplications} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Business Partner Applications</CardTitle>
          <CardDescription>
            Review and approve/reject business partner applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminTableSkeleton />
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No business applications yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Type</TableHead>
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
                      <div className="flex items-center gap-2">
                        {app.parsedData?.partnerType === 'individual' ? (
                          <>
                            <User className="h-4 w-4 text-primary" />
                            <span>Individual Owner</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 text-primary" />
                            <span>Rental Shop</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Bike className="h-4 w-4 text-muted-foreground" />
                        {app.parsedData?.bikesCount || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(app.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge 
                        status={getStatusType(app.status || 'unread')} 
                        label={app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Pending'}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApplication(app);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
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
            <p><strong>Type:</strong> {selectedApplication?.parsedData?.partnerType === 'individual' ? 'Individual Owner' : 'Rental Shop'}</p>
            <p><strong>Bikes Count:</strong> {selectedApplication?.parsedData?.bikesCount}</p>
            {selectedApplication?.parsedData?.autoEntrepreneurNumber && (
              <p><strong>Auto Entrepreneur #:</strong> {selectedApplication.parsedData.autoEntrepreneurNumber}</p>
            )}
            {selectedApplication?.parsedData?.companyRC && (
              <p><strong>Company RC:</strong> {selectedApplication.parsedData.companyRC}</p>
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
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Rejecting application from: <strong>{selectedApplication?.name}</strong></p>
            </div>
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectReason("");
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSaving || !rejectReason.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <XCircle className="h-4 w-4 mr-1" />
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Application Details
            </DialogTitle>
            <DialogDescription>
              Full information about this business partner application
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6 py-4">
              {/* Applicant Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Applicant Information</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedApplication.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedApplication.email}</p>
                    </div>
                  </div>
                  {selectedApplication.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedApplication.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Applied On</p>
                      <p className="font-medium">{format(new Date(selectedApplication.created_at), 'PPP p')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Business Information</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedApplication.parsedData?.partnerType === 'individual' ? (
                      <User className="h-4 w-4 text-primary" />
                    ) : (
                      <Building2 className="h-4 w-4 text-primary" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Partner Type</p>
                      <p className="font-medium">
                        {selectedApplication.parsedData?.partnerType === 'individual' ? 'Individual Owner' : 'Rental Shop'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedApplication.parsedData?.autoEntrepreneurNumber && (
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Auto Entrepreneur Number</p>
                        <p className="font-medium font-mono bg-background px-2 py-1 rounded">
                          {selectedApplication.parsedData.autoEntrepreneurNumber}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedApplication.parsedData?.companyRC && (
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Company RC Number</p>
                        <p className="font-medium font-mono bg-background px-2 py-1 rounded">
                          {selectedApplication.parsedData.companyRC}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Bike className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Number of Bikes</p>
                      <p className="font-medium">{selectedApplication.parsedData?.bikesCount || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <StatusBadge 
                  status={getStatusType(selectedApplication.status || 'unread')} 
                  label={selectedApplication.status === 'approved' ? 'Approved' : selectedApplication.status === 'rejected' ? 'Rejected' : 'Pending'}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            {selectedApplication && (selectedApplication.status === 'unread' || !selectedApplication.status || selectedApplication.status === 'pending') && (
              <>
                <Button 
                  className="bg-success hover:bg-success/90"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setShowApproveDialog(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setShowRejectDialog(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};