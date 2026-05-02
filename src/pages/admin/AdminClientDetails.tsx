import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useClientDetails, type NoteCategory } from "@/hooks/useClientDetails";
import { ChevronLeft, ChevronRight, Loader2, Plus, Minus, CalendarPlus, Mail } from "lucide-react";

// Import extracted components
import {
  ClientOverviewTab,
  ClientBookingsTab,
  ClientTrustTab,
  ClientVerificationTab,
  ClientTimelineTab,
  ClientNotesFilesTab,
  ClientHeaderSection,
  type ClientData,
} from "@/components/admin/client-details";
import { CreateBookingDialog } from "@/components/admin/client-details/CreateBookingDialog";
import { SendEmailDialog } from "@/components/admin/client-details/SendEmailDialog";
import { AdminErrorState } from "@/components/admin/AdminErrorState";

// ============= LOADING SKELETON =============
const ClientDetailsSkeleton = () => (
  <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
    <Skeleton className="h-6 w-40" />
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-10 w-32" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Skeleton className="h-10 w-full" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// ============= MAIN COMPONENT =============
const AdminClientDetails = () => {
  const { id: clientId } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();

  const {
    client,
    bookings,
    trustEvents,
    notes,
    timelineEvents,
    files,
    isLoading,
    error,
    refetch,
    sendNotification,
    blockUnblockUser,
    verifyUser,
    requestReverification,
    adjustTrustScore,
    addNote,
    toggleNotePin,
    deleteNote,
    updateClientName,
    updateClientAvatar,
    updateIdCardNumber,
    addFile,
    addFiles,
    deleteFile,
    downloadFile,
    getFilePreviewUrl,
    downloadFilesInBulk,
    deleteFilesInBulk,
    getFileDownloadHistory,
  } = useClientDetails(clientId);

  const [isRetrying, setIsRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showReverifyDialog, setShowReverifyDialog] = useState(false);
  const [showTrustDialog, setShowTrustDialog] = useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showDeleteNoteDialog, setShowDeleteNoteDialog] = useState(false);
  const [showCreateBookingDialog, setShowCreateBookingDialog] = useState(false);
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);

  // Form states
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [verifyReason, setVerifyReason] = useState("");
  const [trustDelta, setTrustDelta] = useState<number>(1);
  const [trustReason, setTrustReason] = useState("");
  const [trustRelatedBooking, setTrustRelatedBooking] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<NoteCategory>("Support");
  const [newNoteText, setNewNoteText] = useState("");
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deleteNoteReason, setDeleteNoteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Files state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ id: string; fileName: string; fileType: string; url: string | null } | null>(null);

  const handleRetry = async () => {
    setIsRetrying(true);
    await refetch();
    setIsRetrying(false);
  };

  // Action handlers
  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    const success = await sendNotification(notificationTitle, notificationMessage);
    setIsSubmitting(false);
    if (success) {
      setShowNotificationDialog(false);
      setNotificationTitle("");
      setNotificationMessage("");
    }
  };

  const handleBlockUnblock = async () => {
    if (actionReason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    setIsSubmitting(true);
    const isBlocking = client?.accountStatus !== "BLOCKED";
    const success = await blockUnblockUser(isBlocking, actionReason);
    setIsSubmitting(false);
    if (success) {
      setShowBlockDialog(false);
      setActionReason("");
    }
  };

  const handleVerify = async () => {
    setIsSubmitting(true);
    const success = await verifyUser(verifyReason);
    setIsSubmitting(false);
    if (success) {
      setShowVerifyDialog(false);
      setVerifyReason("");
    }
  };

  const handleRequestReverify = async () => {
    if (actionReason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    setIsSubmitting(true);
    const success = await requestReverification(actionReason);
    setIsSubmitting(false);
    if (success) {
      setShowReverifyDialog(false);
      setActionReason("");
    }
  };

  const handleAdjustTrust = async () => {
    if (!trustReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setIsSubmitting(true);
    const success = await adjustTrustScore(trustDelta, trustReason, trustRelatedBooking || undefined);
    setIsSubmitting(false);
    if (success) {
      setShowTrustDialog(false);
      setTrustDelta(1);
      setTrustReason("");
      setTrustRelatedBooking("");
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      toast.error("Note text is required");
      return;
    }
    setIsSubmitting(true);
    const success = await addNote(newNoteCategory, newNoteText, newNotePinned);
    setIsSubmitting(false);
    if (success) {
      setShowAddNoteDialog(false);
      setNewNoteCategory("Support");
      setNewNoteText("");
      setNewNotePinned(false);
    }
  };

  const handleDeleteNote = async () => {
    if (deleteNoteReason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    if (!noteToDelete) return;
    setIsSubmitting(true);
    const success = await deleteNote(noteToDelete, deleteNoteReason);
    setIsSubmitting(false);
    if (success) {
      setShowDeleteNoteDialog(false);
      setNoteToDelete(null);
      setDeleteNoteReason("");
    }
  };

  // File handlers
  const validateFiles = (fileList: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB for regular files
    const maxVideoSize = 50 * 1024 * 1024; // 50MB for videos
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp'];
    const videoTypes = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp'];
    
    Array.from(fileList).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isVideo = videoTypes.includes(ext);
      const sizeLimit = isVideo ? maxVideoSize : maxSize;
      
      if (file.size > sizeLimit) {
        toast.error(`${file.name} is too large (max ${isVideo ? '50MB' : '10MB'})`);
      } else if (!allowedTypes.includes(ext)) {
        toast.error(`${file.name} has unsupported type`);
      } else {
        validFiles.push(file);
      }
    });
    
    return validFiles;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const validFiles = validateFiles(fileList);
    if (validFiles.length === 0) return;

    setIsUploadingFile(true);
    if (validFiles.length === 1) {
      await addFile(validFiles[0]);
    } else {
      await addFiles(validFiles);
    }
    setIsUploadingFile(false);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    const validFiles = validateFiles(droppedFiles);
    if (validFiles.length === 0) return;

    setIsUploadingFile(true);
    if (validFiles.length === 1) {
      await addFile(validFiles[0]);
    } else {
      await addFiles(validFiles);
    }
    setIsUploadingFile(false);
  };

  const handlePreviewFile = async (file: { id: string; fileName: string; fileType: string }) => {
    setPreviewFile({ ...file, url: null });
    const url = await getFilePreviewUrl(file.id);
    setPreviewFile({ ...file, url });
  };

  const handleBulkDownload = async (fileIds: string[]) => {
    await downloadFilesInBulk(fileIds);
  };

  const handleBulkDelete = async (fileIds: string[]) => {
    await deleteFilesInBulk(fileIds, "Bulk delete by admin");
  };

  // Loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <ClientDetailsSkeleton />
      </AdminLayout>
    );
  }

  // Error state
  if (error || !client) {
    return (
      <AdminLayout>
        <AdminErrorState
          title={error ? "Couldn't load client" : "Client not found"}
          message={error ? "There was a problem loading this client." : "This client doesn't exist or has been removed."}
          error={error}
          onRetry={handleRetry}
        />
      </AdminLayout>
    );
  }

  // Map client data to the component type
  const clientData: ClientData = {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    avatarUrl: client.avatarUrl,
    joinedAt: client.joinedAt,
    lastActiveAt: client.lastActiveAt,
    accountStatus: client.accountStatus,
    kycStatus: client.kycStatus,
    phoneStatus: client.phoneStatus,
    riskLevel: client.riskLevel,
    trustScore: client.trustScore,
    totalBookings: client.totalBookings,
    completedBookings: client.completedBookings,
    cancelledBookings: client.cancelledBookings,
    noShows: client.noShows,
    totalSpend: client.totalSpend,
    refundsCount: client.refundsCount,
    paymentFailedCount: client.paymentFailedCount,
    avgRentalDuration: client.avgRentalDuration,
    lastBookingAt: client.lastBookingAt,
    frontIdUrl: client.frontIdUrl,
    backIdUrl: client.backIdUrl,
    selfieUrl: client.selfieUrl,
    idCardNumber: client.idCardNumber,
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Back Navigation */}
        <Link
          to="/admin?tab=clients"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isRTL ? <ChevronRight className="h-4 w-4 mr-1" /> : <ChevronLeft className="h-4 w-4 mr-1" />}
          Back to Clients
        </Link>

        {/* Client Header */}
        <ClientHeaderSection
          client={clientData}
          isRTL={isRTL}
          onSendNotification={() => setShowNotificationDialog(true)}
          onBlockUnblock={() => setShowBlockDialog(true)}
          onVerify={() => setShowVerifyDialog(true)}
          onReverify={() => setShowReverifyDialog(true)}
          onAdjustTrust={() => setShowTrustDialog(true)}
          updateClientName={updateClientName}
          updateClientAvatar={updateClientAvatar}
          updateIdCardNumber={updateIdCardNumber}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowSendEmailDialog(true)} className="gap-2">
            <Mail className="h-4 w-4" />
            Send Email
          </Button>
          <Button onClick={() => setShowCreateBookingDialog(true)} className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            Create Booking
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="trust">Trust</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="notes">Notes & Files</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ClientOverviewTab client={clientData} />
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <ClientBookingsTab bookings={bookings} />
          </TabsContent>

          <TabsContent value="trust" className="mt-6">
            <ClientTrustTab client={clientData} trustEvents={trustEvents} />
          </TabsContent>

          <TabsContent value="verification" className="mt-6">
            <ClientVerificationTab client={clientData} />
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <ClientNotesFilesTab
              notes={notes}
              files={files}
              onAddNote={() => setShowAddNoteDialog(true)}
              onTogglePin={toggleNotePin}
              onDeleteNote={(noteId) => {
                setNoteToDelete(noteId);
                setShowDeleteNoteDialog(true);
              }}
              onFileUpload={handleFileUpload}
              onPreviewFile={handlePreviewFile}
              onDownloadFile={downloadFile}
              onDeleteFile={(fileId) => deleteFile(fileId, "Deleted by admin")}
              onViewDownloadHistory={async (fileId, fileName) => {
                const history = await getFileDownloadHistory(fileId);
                // Download history is now managed in the component
              }}
              onBulkDownload={handleBulkDownload}
              onBulkDelete={handleBulkDelete}
              isUploadingFile={isUploadingFile}
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <ClientTimelineTab client={clientData} timelineEvents={timelineEvents} />
          </TabsContent>
        </Tabs>

        {/* ============= DIALOGS ============= */}

        {/* Send Notification Dialog */}
        <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription>Send an in-app notification to this client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Notification title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Notification message"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>Cancel</Button>
              <Button onClick={handleSendNotification} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block/Unblock Dialog */}
        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{client.accountStatus === "BLOCKED" ? "Unblock User" : "Block User"}</DialogTitle>
              <DialogDescription>
                {client.accountStatus === "BLOCKED"
                  ? "This will restore the user's access to the platform."
                  : "This will prevent the user from accessing the platform."}
              </DialogDescription>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">Reason (min 10 characters)</label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Explain the reason for this action..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
              <Button
                variant={client.accountStatus === "BLOCKED" ? "default" : "destructive"}
                onClick={handleBlockUnblock}
                disabled={actionReason.length < 10 || isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {client.accountStatus === "BLOCKED" ? "Unblock" : "Block"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Verify Dialog */}
        <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify User</DialogTitle>
              <DialogDescription>Manually verify this user's identity.</DialogDescription>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                placeholder="Reason for manual verification..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>Cancel</Button>
              <Button onClick={handleVerify} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Re-verification Dialog */}
        <Dialog open={showReverifyDialog} onOpenChange={setShowReverifyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Re-verification</DialogTitle>
              <DialogDescription>Ask the user to re-submit their verification documents.</DialogDescription>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">Reason (min 10 characters)</label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Explain why re-verification is needed..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReverifyDialog(false)}>Cancel</Button>
              <Button onClick={handleRequestReverify} disabled={actionReason.length < 10 || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Request Re-verify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjust Trust Dialog */}
        <Dialog open={showTrustDialog} onOpenChange={setShowTrustDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Trust Score</DialogTitle>
              <DialogDescription>Add or remove trust points from this client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Adjustment</label>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setTrustDelta((d) => Math.max(-10, d - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className={`text-2xl font-bold ${trustDelta > 0 ? "text-success" : trustDelta < 0 ? "text-destructive" : ""}`}>
                    {trustDelta > 0 ? `+${trustDelta}` : trustDelta}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setTrustDelta((d) => Math.min(10, d + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason *</label>
                <Textarea
                  value={trustReason}
                  onChange={(e) => setTrustReason(e.target.value)}
                  placeholder="Why are you adjusting the trust score?"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Related Booking ID (optional)</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  value={trustRelatedBooking}
                  onChange={(e) => setTrustRelatedBooking(e.target.value)}
                  placeholder="Booking ID if applicable"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTrustDialog(false)}>Cancel</Button>
              <Button onClick={handleAdjustTrust} disabled={!trustReason.trim() || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>Add an internal note about this client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={newNoteCategory} onValueChange={(v) => setNewNoteCategory(v as NoteCategory)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Risk">Risk</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                    <SelectItem value="Booking">Booking</SelectItem>
                    <SelectItem value="KYC">KYC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Note</label>
                <Textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Write your note here..."
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pinNote"
                  checked={newNotePinned}
                  onCheckedChange={(c) => setNewNotePinned(!!c)}
                />
                <label htmlFor="pinNote" className="text-sm">Pin this note</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>Cancel</Button>
              <Button onClick={handleAddNote} disabled={!newNoteText.trim() || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Note Dialog */}
        <Dialog open={showDeleteNoteDialog} onOpenChange={setShowDeleteNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Note</DialogTitle>
              <DialogDescription>Are you sure you want to delete this note?</DialogDescription>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">Reason (min 10 characters)</label>
              <Textarea
                value={deleteNoteReason}
                onChange={(e) => setDeleteNoteReason(e.target.value)}
                placeholder="Why are you deleting this note?"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteNoteDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDeleteNote}
                disabled={deleteNoteReason.length < 10 || isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Booking Dialog */}
        <CreateBookingDialog
          isOpen={showCreateBookingDialog}
          onClose={() => setShowCreateBookingDialog(false)}
          clientId={clientId || ""}
          clientName={client.name}
          clientEmail={client.email}
          clientPhone={client.phone}
          onSuccess={refetch}
        />

        {/* Send Email Dialog */}
        <SendEmailDialog
          open={showSendEmailDialog}
          onOpenChange={setShowSendEmailDialog}
          clientEmail={client.email}
          clientName={client.name}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminClientDetails;