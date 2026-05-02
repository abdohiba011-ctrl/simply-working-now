import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageViewer } from "@/components/ui/image-viewer";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  ChevronLeft, 
  ChevronRight,
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Snowflake, 
  Send, 
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  User,
  MapPin,
  CreditCard,
  StickyNote,
  Plus,
  Trash2
} from "lucide-react";
import { AdminUserDetailsSkeleton } from "@/components/ui/admin-skeleton";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserProfile {
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
  first_name_on_id: string | null;
  family_name_on_id: string | null;
  id_front_image_url: string | null;
  id_back_image_url: string | null;
  selfie_with_id_url: string | null;
  created_at: string | null;
  address: string | null;
  user_type: string | null;
  phone_verified: boolean | null;
  rejection_reason: string | null;
}

interface UserNote {
  id: string;
  note_title: string;
  note_description: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

const UserDetails = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [selfieImageUrl, setSelfieImageUrl] = useState<string | null>(null);
  
  // Image viewer
  const [imageViewer, setImageViewer] = useState<{ isOpen: boolean; src: string; title: string }>({
    isOpen: false,
    src: '',
    title: ''
  });
  
  const openImageViewer = (src: string, title: string) => {
    setImageViewer({ isOpen: true, src, title });
  };
  
  // Notification dialog
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  
  // Block dialog
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  
  // Re-verification dialog
  const [showReverifyDialog, setShowReverifyDialog] = useState(false);
  const [reverifyReason, setReverifyReason] = useState("");
  
  // Notes
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteDescription, setNewNoteDescription] = useState("");
  const [showDeleteNoteDialog, setShowDeleteNoteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchNotes();
    }
  }, [userId]);

  const fetchNotes = async () => {
    if (!userId) return;
    try {
      const { data: notesData, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator names
      if (notesData && notesData.length > 0) {
        const creatorIds = [...new Set(notesData.map(n => n.created_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', creatorIds);

        const notesWithCreators = notesData.map(note => ({
          ...note,
          creator_name: profiles?.find(p => p.user_id === note.created_by)?.name || 
                        profiles?.find(p => p.user_id === note.created_by)?.email || 
                        'Unknown'
        }));
        setNotes(notesWithCreators);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!userId || !newNoteTitle.trim() || !newNoteDescription.trim()) {
      toast.error(t('errors.fillAllFields'));
      return;
    }

    setActionLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_notes').insert({
        user_id: userId,
        note: newNoteTitle.trim(),
        note_title: newNoteTitle.trim(),
        note_description: newNoteDescription.trim(),
        created_by: currentUser.id
      });

      if (error) throw error;

      toast.success(t('success.noteAdded'));
      setShowAddNoteDialog(false);
      setNewNoteTitle("");
      setNewNoteDescription("");
      fetchNotes();
    } catch (error) {
      toast.error(t('errors.addNoteFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setShowDeleteNoteDialog(true);
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('user_notes')
        .delete()
        .eq('id', noteToDelete);

      if (error) throw error;

      toast.success(t('admin.noteDeleted') || 'Note deleted successfully');
      setShowDeleteNoteDialog(false);
      setNoteToDelete(null);
      fetchNotes();
    } catch (error) {
      toast.error(t('errors.deleteNoteFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const extractStoragePath = (url: string): string | null => {
    if (!url) return null;
    
    try {
      // If it's already just a path (not a full URL)
      if (!url.includes('://') && !url.startsWith('http')) {
        return url;
      }
      
      // Try multiple patterns for Supabase storage URLs
      const patterns = [
        /id-documents\/(.+?)(\?|$)/,           // Standard format
        /storage\/v1\/object\/public\/id-documents\/(.+?)(\?|$)/, // Full public path
        /storage\/v1\/object\/sign\/id-documents\/(.+?)(\?|$)/,   // Signed path
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return decodeURIComponent(match[1]);
      }
      
      // If it's a direct file path stored in DB
      if (url.includes('/') && !url.includes('://')) {
        return url;
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const loadSignedUrls = async (userData: UserProfile) => {
    if (userData.id_front_image_url) {
      const frontPath = extractStoragePath(userData.id_front_image_url);
      if (frontPath) {
        const { data: signedData } = await supabase.storage
          .from('id-documents')
          .createSignedUrl(frontPath, 3600);
        setFrontImageUrl(signedData?.signedUrl || userData.id_front_image_url);
      } else {
        setFrontImageUrl(userData.id_front_image_url);
      }
    }

    if (userData.id_back_image_url) {
      const backPath = extractStoragePath(userData.id_back_image_url);
      if (backPath) {
        const { data: signedData } = await supabase.storage
          .from('id-documents')
          .createSignedUrl(backPath, 3600);
        setBackImageUrl(signedData?.signedUrl || userData.id_back_image_url);
      } else {
        setBackImageUrl(userData.id_back_image_url);
      }
    }

    if (userData.selfie_with_id_url) {
      const selfiePath = extractStoragePath(userData.selfie_with_id_url);
      if (selfiePath) {
        const { data: signedData } = await supabase.storage
          .from('id-documents')
          .createSignedUrl(selfiePath, 3600);
        setSelfieImageUrl(signedData?.signedUrl || userData.selfie_with_id_url);
      } else {
        setSelfieImageUrl(userData.selfie_with_id_url);
      }
    }
  };

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      // The :id route param is an auth uid (from booking.user_id, etc.),
      // not a profiles.id. Join via profiles.user_id.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setUser(data);
      if (data) {
        loadSignedUrls(data);
      }
    } catch (error: unknown) {
      toast.error(t('errors.loadFailed'));
      // Do NOT redirect — show inline empty/error state instead.
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true, 
          verification_status: 'verified' 
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Account Verified',
        message: 'Your account has been verified. You can now rent motorbikes.',
        type: 'success'
      });

      toast.success(t('success.userVerified'));
      fetchUser();
    } catch (error) {
      toast.error(t('errors.verificationFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          verification_status: 'rejected' 
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Verification Rejected',
        message: 'Your verification was rejected. Please re-upload your documents.',
        type: 'warning'
      });

      toast.success(t('success.verificationRejected'));
      fetchUser();
    } catch (error) {
      toast.error(t('errors.rejectionFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!user || !blockReason.trim()) {
      toast.error(t('errors.provideBlockReason'));
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_frozen: true,
          frozen_reason: blockReason
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Account Blocked',
        message: `Your account has been blocked. Reason: ${blockReason}`,
        type: 'error'
      });

      toast.success(t('success.userBlocked'));
      setShowBlockDialog(false);
      setBlockReason("");
      fetchUser();
    } catch (error) {
      toast.error(t('errors.blockFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_frozen: false,
          frozen_reason: null
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Account Unblocked',
        message: 'Your account has been unblocked. You can now access all features.',
        type: 'success'
      });

      toast.success(t('success.userUnblocked'));
      fetchUser();
    } catch (error) {
      toast.error(t('errors.unblockFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReverification = async () => {
    if (!user || !reverifyReason.trim()) {
      toast.error(t('errors.provideReverifyReason'));
      return;
    }
    setActionLoading(true);
    try {
      // Reset verification status to not_started so user can re-submit
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          verification_status: 'not_started',
          rejection_reason: reverifyReason.trim(),
          // Clear previous ID documents so user can upload new ones
          id_front_image_url: null,
          id_back_image_url: null,
          selfie_with_id_url: null
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Re-verification Required',
        message: reverifyReason.trim(),
        type: 'warning',
        action_url: '/verification'
      });

      toast.success(t('success.reverificationRequested'));
      setShowReverifyDialog(false);
      setReverifyReason("");
      fetchUser();
    } catch (error) {
      toast.error(t('errors.reverificationFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!user || !notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error(t('errors.fillAllFields'));
      return;
    }

    setActionLoading(true);
    try {
      let actionUrl: string | null = null;
      const lowerMessage = notificationMessage.toLowerCase();
      const lowerTitle = notificationTitle.toLowerCase();
      
      if (lowerMessage.includes('phone') || lowerTitle.includes('phone')) {
        actionUrl = '/profile#phone';
      } else if (lowerMessage.includes('verif') || lowerTitle.includes('verif')) {
        actionUrl = '/profile#verification';
      } else if (lowerMessage.includes('document') || lowerTitle.includes('document')) {
        actionUrl = '/profile#verification';
      }

      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'admin',
        action_url: actionUrl
      });

      if (error) throw error;

      toast.success(t('success.notificationSent'));
      setShowNotificationDialog(false);
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      toast.error(t('errors.notificationFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('success.copied'));
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminUserDetailsSkeleton />
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <AdminErrorState
          title={t('admin.userNotFound')}
          message="This user doesn't exist or has been removed."
          onRetry={fetchUser}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className={`mb-6 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          onClick={() => navigate("/admin/panel")}
        >
          <BackIcon className="h-4 w-4" />
          {t('admin.backToAdminPanel')}
        </Button>

        {/* User Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className={`flex flex-col md:flex-row gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
              <Avatar 
                className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => user.avatar_url && openImageViewer(user.avatar_url, t('admin.profilePhoto'))}
              >
                <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-3xl">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>

              <div className={`flex-1 space-y-4 ${isRTL ? 'text-right' : ''}`}>
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                  <div>
                    <h1 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      {user.name || t('admin.noName')}
                      {user.is_verified && <VerifiedBadge size="md" />}
                    </h1>
                    <p className="text-muted-foreground">{user.user_type || 'client'}</p>
                  </div>
                  
                  <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {user.is_verified ? (
                      <Badge className="bg-success/100 text-white">{t('admin.verified')}</Badge>
                    ) : user.verification_status === 'pending_review' ? (
                      <Badge className="bg-warning/100 text-black">{t('admin.pendingReview')}</Badge>
                    ) : user.verification_status === 'rejected' ? (
                      <Badge className="bg-destructive/100 text-white">{t('admin.rejected')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('admin.notStarted')}</Badge>
                    )}
                    {user.is_frozen && (
                      <Badge variant="destructive" className="gap-1">
                        <Snowflake className="h-3 w-3" />
                        {t('admin.blocked')}
                      </Badge>
                    )}
                    {user.phone_verified && (
                      <Badge variant="outline" className="gap-1">
                        <Phone className="h-3 w-3" />
                        {t('admin.phoneVerified')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className={`grid md:grid-cols-3 gap-4 text-sm ${isRTL ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.email}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(user.email || '')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone || 'N/A'}</span>
                    {user.phone && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(user.phone || '')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{t('admin.joined')}: {user.created_at ? format(new Date(user.created_at), 'PPP') : 'N/A'}</span>
                  </div>
                </div>

                {user.address && (
                  <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{user.address}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('admin.actions')}</CardTitle>
            <CardDescription>{t('admin.manageAccount')}</CardDescription>
          </CardHeader>
          <CardContent className={`flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Send Notification - Blue (Wise) */}
            <Button
              onClick={() => setShowNotificationDialog(true)}
              className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white"
            >
              <Send className="h-4 w-4" />
              {t('admin.sendNotification')}
            </Button>

            {user.verification_status === 'pending_review' && !user.is_verified && (
              <>
                {/* Verify User - Green (Wise) */}
                <Button
                  onClick={handleVerify}
                  disabled={actionLoading}
                  className="gap-2 bg-[#1ea94a] hover:bg-[#17883b] text-white"
                >
                  <CheckCircle className="h-4 w-4" />
                  {t('admin.verifyUser')}
                </Button>
                {/* Reject - Red (Wise) */}
                <Button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="gap-2 bg-[#e94b3c] hover:bg-[#c93d30] text-white"
                >
                  <XCircle className="h-4 w-4" />
                  {t('admin.rejectVerification')}
                </Button>
              </>
            )}

            {user.is_frozen ? (
              /* Unblock - Green */
              <Button
                onClick={handleUnblock}
                disabled={actionLoading}
                className="gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white"
              >
                <CheckCircle className="h-4 w-4" />
                {t('admin.unblockUser')}
              </Button>
            ) : (
              /* Block - Orange/Coral */
              <Button
                onClick={() => setShowBlockDialog(true)}
                disabled={actionLoading}
                className="gap-2 bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
              >
                <Snowflake className="h-4 w-4" />
                {t('admin.blockUser')}
              </Button>
            )}

            {user.is_verified && (
              /* Request Re-verification - Amber */
              <Button
                onClick={() => setShowReverifyDialog(true)}
                disabled={actionLoading}
                className="gap-2 bg-[#f59e0b] hover:bg-[#d97706] text-white"
              >
                <AlertTriangle className="h-4 w-4" />
                {t('admin.requestReverification')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Blocked Reason */}
        {user.is_frozen && user.frozen_reason && (
          <Card className="mb-6 border-destructive">
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 text-destructive ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <AlertTriangle className="h-5 w-5" />
                {t('admin.blockReason')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={isRTL ? 'text-right' : ''}>{user.frozen_reason}</p>
            </CardContent>
          </Card>
        )}

        {/* ID Verification Documents */}
        {(user.verification_status === 'pending_review' || user.is_verified || user.id_front_image_url) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <CreditCard className="h-5 w-5" />
                {t('admin.idVerificationDocuments')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`grid md:grid-cols-3 gap-4 text-sm ${isRTL ? 'text-right' : ''}`}>
                <div>
                  <p className="text-muted-foreground">{t('admin.idNumber')}</p>
                  <p className="font-medium">{user.id_card_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('admin.firstNameOnId')}</p>
                  <p className="font-medium">{user.first_name_on_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('admin.familyNameOnId')}</p>
                  <p className="font-medium">{user.family_name_on_id || 'N/A'}</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className={`text-sm font-medium mb-2 ${isRTL ? 'text-right' : ''}`}>{t('admin.frontOfId')}</p>
                  {frontImageUrl ? (
                    <img 
                      src={frontImageUrl} 
                      alt={t('admin.idFront')} 
                      className="w-full rounded-lg border object-contain max-h-64 bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openImageViewer(frontImageUrl, t('admin.frontOfId'))}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                      {t('admin.noImageUploaded')}
                    </div>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium mb-2 ${isRTL ? 'text-right' : ''}`}>{t('admin.backOfId')}</p>
                  {backImageUrl ? (
                    <img 
                      src={backImageUrl} 
                      alt={t('admin.idBack')} 
                      className="w-full rounded-lg border object-contain max-h-64 bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openImageViewer(backImageUrl, t('admin.backOfId'))}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                      {t('admin.noImageUploaded')}
                    </div>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium mb-2 ${isRTL ? 'text-right' : ''}`}>{t('admin.selfieWithId')}</p>
                  {selfieImageUrl ? (
                    <img 
                      src={selfieImageUrl} 
                      alt={t('admin.selfieWithId')} 
                      className="w-full rounded-lg border object-contain max-h-64 bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openImageViewer(selfieImageUrl, t('admin.selfieWithId'))}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                      {t('admin.noSelfieUploaded')}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Notes Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <StickyNote className="h-5 w-5" />
                {t('admin.notes') || 'Notes'}
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowAddNoteDialog(true)}
                className="gap-1 bg-[#9333ea] hover:bg-[#7c3aed] text-white"
              >
                <Plus className="h-4 w-4" />
                {t('admin.addNote') || 'Add Note'}
              </Button>
            </div>
            <CardDescription>{t('admin.notesDescription') || 'Internal notes about this user'}</CardDescription>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('admin.noNotes') || 'No notes yet. Add a note to keep track of important information.'}
              </p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-4 bg-muted/30">
                    <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-1 space-y-1">
                        <h4 className={`font-medium text-foreground ${isRTL ? 'text-right' : ''}`}>
                          {note.note_title}
                        </h4>
                        <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>
                          {note.note_description}
                        </p>
                        <div className={`flex items-center gap-2 text-xs text-muted-foreground pt-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          <User className="h-3 w-3" />
                          <span>{note.creator_name}</span>
                          <span>•</span>
                          <span>{note.created_at ? format(new Date(note.created_at), 'PPP p') : ''}</span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => confirmDeleteNote(note.id)}
                        disabled={actionLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Viewer */}
        <ImageViewer
          isOpen={imageViewer.isOpen}
          src={imageViewer.src}
          title={imageViewer.title}
          onClose={() => setImageViewer({ isOpen: false, src: '', title: '' })}
        />

        {/* Notification Dialog */}
        <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.sendNotification')} {user.name || user.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.notificationTitle')}</label>
                <Input
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder={t('admin.notificationTitlePlaceholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.notificationMessage')}</label>
                <Textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder={t('admin.notificationMessagePlaceholder')}
                  rows={4}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
            <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
                {t('admin.cancel')}
              </Button>
              <Button onClick={handleSendNotification} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('admin.send')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block Dialog */}
        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.blockDialogTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                {t('admin.blockDialogDescription')}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.reasonForBlocking')}</label>
                <Textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={t('admin.blockReasonPlaceholder')}
                  rows={3}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
            <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                {t('admin.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleBlock} disabled={actionLoading || !blockReason.trim()}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('admin.blockUser')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Re-verification Dialog */}
        <Dialog open={showReverifyDialog} onOpenChange={setShowReverifyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.reverifyDialogTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                {t('admin.reverifyDialogDescription')}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.reasonForReverification') || 'Reason for Re-verification'} *</label>
                <Textarea
                  value={reverifyReason}
                  onChange={(e) => setReverifyReason(e.target.value)}
                  placeholder={t('admin.reverifyReasonPlaceholder') || 'Explain why re-verification is needed...'}
                  rows={3}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
            <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <Button variant="outline" onClick={() => setShowReverifyDialog(false)}>
                {t('admin.cancel')}
              </Button>
              <Button 
                onClick={handleRequestReverification} 
                disabled={actionLoading || !reverifyReason.trim()} 
                className="bg-[#f59e0b] hover:bg-[#d97706] text-white"
              >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('admin.requestReverification')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNote') || 'Add Note'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.noteTitle') || 'Note Title'}</label>
                <Input
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder={t('admin.noteTitlePlaceholder') || 'Enter note title...'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.noteDescription') || 'Note Description'}</label>
                <Textarea
                  value={newNoteDescription}
                  onChange={(e) => setNewNoteDescription(e.target.value)}
                  placeholder={t('admin.noteDescriptionPlaceholder') || 'Enter note description...'}
                  rows={4}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
            <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>
                {t('admin.cancel')}
              </Button>
              <Button 
                onClick={handleAddNote} 
                disabled={actionLoading || !newNoteTitle.trim() || !newNoteDescription.trim()}
                className="bg-[#9333ea] hover:bg-[#7c3aed] text-white"
              >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('admin.saveNote') || 'Save Note'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Note Confirmation Dialog */}
        <Dialog open={showDeleteNoteDialog} onOpenChange={setShowDeleteNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.deleteNote') || 'Delete Note'}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                {t('admin.deleteNoteConfirm') || 'Are you sure you want to delete this note?'}
              </p>
              <p className={`text-sm text-muted-foreground mt-2 ${isRTL ? 'text-right' : ''}`}>
                {t('admin.deleteNoteDescription') || 'This action cannot be undone. The note will be permanently deleted.'}
              </p>
            </div>
            <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <Button variant="outline" onClick={() => {
                setShowDeleteNoteDialog(false);
                setNoteToDelete(null);
              }}>
                {t('admin.cancel')}
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteNote} 
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('admin.deleteNote') || 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default UserDetails;
