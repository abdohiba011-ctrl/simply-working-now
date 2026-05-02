import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageViewer } from "@/components/ui/image-viewer";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Loader2, 
  Search, 
  Eye, 
  Send, 
  Snowflake, 
  CheckCircle, 
  XCircle,
  Phone,
  Mail,
  User,
  Calendar,
  ShieldCheck,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X
} from "lucide-react";
import { format } from "date-fns";
import { AdminTableSkeleton } from "@/components/ui/admin-skeleton";

interface ClientUser {
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
  id_card_number: string | null;
  full_name_on_id: string | null;
  first_name_on_id: string | null;
  family_name_on_id: string | null;
  id_front_image_url: string | null;
  id_back_image_url: string | null;
  selfie_with_id_url: string | null;
  created_at: string | null;
  address: string | null;
}

export const AdminClientsTab = () => {
  const { t, isRTL } = useLanguage();
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [selfieImageUrl, setSelfieImageUrl] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<'created_at' | 'name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Image viewer state
  const [imageViewer, setImageViewer] = useState<{ isOpen: boolean; src: string; title: string }>({
    isOpen: false,
    src: '',
    title: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    let result = [...clients];
    
    if (searchQuery) {
      result = result.filter(client => 
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(client => {
        switch (statusFilter) {
          case 'verified':
            return client.is_verified === true;
          case 'pending':
            return client.verification_status === 'pending_review';
          case 'rejected':
            return client.verification_status === 'rejected';
          case 'not_started':
            return !client.is_verified && client.verification_status !== 'pending_review' && client.verification_status !== 'rejected';
          case 'frozen':
            return client.is_frozen === true;
          default:
            return true;
        }
      });
    }
    
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'created_at') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredClients(result);
  }, [searchQuery, clients, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    if (selectedClient && showDetailsDialog) {
      loadSignedUrls(selectedClient);
    }
  }, [selectedClient, showDetailsDialog]);

  const extractStoragePath = (url: string): string | null => {
    try {
      const match = url.match(/id-documents\/(.+?)(\?|$)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const loadSignedUrls = async (client: ClientUser) => {
    setFrontImageUrl(null);
    setBackImageUrl(null);
    setSelfieImageUrl(null);

    if (client.id_front_image_url) {
      const frontPath = extractStoragePath(client.id_front_image_url);
      if (frontPath) {
        const { data: signedData } = await supabase.storage
          .from('id-documents')
          .createSignedUrl(frontPath, 3600);
        setFrontImageUrl(signedData?.signedUrl || client.id_front_image_url);
      } else {
        setFrontImageUrl(client.id_front_image_url);
      }
    }

    if (client.id_back_image_url) {
      const backPath = extractStoragePath(client.id_back_image_url);
      if (backPath) {
        const { data: signedData } = await supabase.storage
          .from('id-documents')
          .createSignedUrl(backPath, 3600);
        setBackImageUrl(signedData?.signedUrl || client.id_back_image_url);
      } else {
        setBackImageUrl(client.id_back_image_url);
      }
    }

    if (client.selfie_with_id_url) {
      const selfiePath = extractStoragePath(client.selfie_with_id_url);
      if (selfiePath) {
        const { data: signedData } = await supabase.storage
          .from('id-documents')
          .createSignedUrl(selfiePath, 3600);
        setSelfieImageUrl(signedData?.signedUrl || client.selfie_with_id_url);
      } else {
        setSelfieImageUrl(client.selfie_with_id_url);
      }
    }
  };

  const toggleSort = (field: 'created_at' | 'name') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const openImageViewer = (src: string, title: string) => {
    setImageViewer({ isOpen: true, src, title });
  };

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or('user_type.is.null,user_type.eq.client')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error: unknown) {
      toast.error(t('errors.loadFailed'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeze = async (profileId: string, freeze: boolean) => {
    setActionLoading(true);
    try {
      // Look up the auth user_id for this profile so notifications reach the
      // real account (profile.id is the row PK, not the auth UID).
      const target = clients.find((c) => c.id === profileId);
      const authUserId = target?.user_id ?? null;

      const { error } = await supabase
        .from('profiles')
        .update({
          is_frozen: freeze,
          frozen_reason: freeze ? 'Frozen by admin' : null
        })
        .eq('id', profileId);

      if (error) throw error;

      if (authUserId) {
        await supabase.from('notifications').insert({
          user_id: authUserId,
          title: freeze ? 'Account Frozen' : 'Account Unfrozen',
          message: freeze
            ? 'Your account has been frozen. Please contact support for assistance.'
            : 'Your account has been unfrozen. You can now access all features.',
          type: freeze ? 'warning' : 'success'
        });
      }

      // Audit (best-effort)
      await supabase.rpc('log_audit_event', {
        _action: freeze ? 'renter_frozen' : 'renter_unfrozen',
        _table_name: 'profiles',
        _record_id: profileId,
        _details: { auth_user_id: authUserId, frozen: freeze },
      });

      toast.success(freeze ? t('admin.frozen') : t('admin.unblock'));
      fetchClients();
    } catch (error: unknown) {
      console.error('[AdminClientsTab] freeze failed', error);
      toast.error(t('errors.updateFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!selectedClient || !notificationTitle || !notificationMessage) return;
    if (!selectedClient.user_id) {
      toast.error('Cannot send: missing user reference');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: selectedClient.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'info'
      });

      if (error) throw error;

      await supabase.rpc('log_audit_event', {
        _action: 'admin_notification_sent',
        _table_name: 'notifications',
        _record_id: selectedClient.user_id,
        _details: { title: notificationTitle, recipient_profile_id: selectedClient.id },
      });

      toast.success(t('success.notificationSent'));
      setShowNotificationDialog(false);
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error: unknown) {
      console.error('[AdminClientsTab] send notification failed', error);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <User className="h-5 w-5" />
                {t('admin.clients')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredClients.length} {t('admin.clientsFound')}
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={t('admin.searchByNameEmailPhone')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
          
          <div className={`flex flex-wrap items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('admin.filterByStatus')} />
                </SelectTrigger>
                <SelectContent className="bg-background border">
                  <SelectItem value="all">{t('admin.allStatus')}</SelectItem>
                  <SelectItem value="verified">{t('admin.verified')}</SelectItem>
                  <SelectItem value="pending">{t('admin.pendingReview')}</SelectItem>
                  <SelectItem value="rejected">{t('admin.rejected')}</SelectItem>
                  <SelectItem value="not_started">{t('admin.notStarted')}</SelectItem>
                  <SelectItem value="frozen">{t('admin.frozen')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSort('created_at')}
                className="gap-1"
              >
                {t('admin.date')}
                {sortField === 'created_at' ? (
                  sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSort('name')}
                className="gap-1"
              >
                {t('admin.name')}
                {sortField === 'name' ? (
                  sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            {(statusFilter !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
                className="gap-1 text-muted-foreground"
              >
                <X className="h-3 w-3" />
                {t('admin.clearFilters')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AdminTableSkeleton />
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('admin.noClientsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : ''}>{t('admin.user')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : ''}>{t('admin.contact')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : ''}>{t('admin.status')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : ''}>{t('admin.joined')}</TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className={client.is_frozen ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={client.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            {getInitials(client.name, client.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="font-medium">{client.name || t('admin.noName')}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`text-sm ${isRTL ? 'text-right' : ''}`}>
                        <p className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          <Phone className="h-3 w-3" />
                          {client.phone || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex flex-col gap-1 ${isRTL ? 'items-end' : ''}`}>
                        {client.is_verified ? (
                          <StatusBadge status="verified" label={t('admin.verified')} />
                        ) : client.verification_status === 'pending_review' ? (
                          <StatusBadge status="pending" label={t('admin.pending')} />
                        ) : client.verification_status === 'rejected' ? (
                          <StatusBadge status="rejected" label={t('admin.rejected')} />
                        ) : (
                          <StatusBadge status="not_started" label={t('admin.notStarted')} />
                        )}
                        {client.is_frozen && (
                          <StatusBadge status="frozen" label={t('admin.frozen')} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm text-muted-foreground ${isRTL ? 'text-right block' : ''}`}>
                        {client.created_at ? format(new Date(client.created_at), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className={isRTL ? 'text-left' : 'text-right'}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedClient(client); setShowDetailsDialog(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedClient(client); setShowNotificationDialog(true); }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={client.is_frozen ? "default" : "destructive"}
                          onClick={() => handleFreeze(client.id, !client.is_frozen)}
                          disabled={actionLoading}
                        >
                          {client.is_frozen ? (
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>{t('admin.clientDetails')}</DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6">
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div 
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => selectedClient.avatar_url && openImageViewer(selectedClient.avatar_url, t('admin.profilePhoto'))}
                >
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedClient.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-2xl">
                      {getInitials(selectedClient.name, selectedClient.email)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                  <h3 className={`text-xl font-semibold flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    {selectedClient.name || t('admin.noName')}
                    {selectedClient.is_verified && (
                      <ShieldCheck className="h-5 w-5 text-foreground" />
                    )}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {selectedClient.email}
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedClient.email || '')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </p>
                    <p className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selectedClient.phone || 'N/A'}
                      {selectedClient.phone && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedClient.phone || '')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </p>
                    <p className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {t('admin.joined')}: {selectedClient.created_at ? format(new Date(selectedClient.created_at), 'PPP') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {selectedClient.is_verified ? (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t('admin.verified')}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {selectedClient.verification_status === 'pending_review' ? t('admin.pendingReview') : t('admin.notVerified')}
                  </Badge>
                )}
                {selectedClient.is_frozen && (
                  <Badge variant="destructive" className="gap-1">
                    <Snowflake className="h-3 w-3" />
                    {t('admin.frozen')}
                  </Badge>
                )}
              </div>

              {(selectedClient.verification_status === 'pending_review' || selectedClient.is_verified) && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-semibold">{t('admin.idInformation')}</h4>
                  <div className={`grid grid-cols-2 gap-4 text-sm ${isRTL ? 'text-right' : ''}`}>
                    <div>
                      <p className="text-muted-foreground">{t('admin.idNumber')}</p>
                      <p className="font-medium">{selectedClient.id_card_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('admin.nameOnId')}</p>
                      <p className="font-medium">
                        {selectedClient.first_name_on_id && selectedClient.family_name_on_id 
                          ? `${selectedClient.first_name_on_id} ${selectedClient.family_name_on_id}`
                          : selectedClient.full_name_on_id || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm font-medium mb-2 ${isRTL ? 'text-right' : ''}`}>{t('admin.frontOfId')}</p>
                      {frontImageUrl ? (
                        <img 
                          src={frontImageUrl} 
                          alt={t('admin.idFront')} 
                          className="w-full rounded-lg border cursor-pointer hover:opacity-80 transition-opacity object-contain bg-muted"
                          onClick={() => openImageViewer(frontImageUrl, t('admin.frontOfId'))}
                        />
                      ) : selectedClient.id_front_image_url ? (
                        <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">{t('admin.noImage')}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium mb-2 ${isRTL ? 'text-right' : ''}`}>{t('admin.backOfId')}</p>
                      {backImageUrl ? (
                        <img 
                          src={backImageUrl} 
                          alt={t('admin.idBack')} 
                          className="w-full rounded-lg border cursor-pointer hover:opacity-80 transition-opacity object-contain bg-muted"
                          onClick={() => openImageViewer(backImageUrl, t('admin.backOfId'))}
                        />
                      ) : selectedClient.id_back_image_url ? (
                        <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">{t('admin.noImage')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedClient.selfie_with_id_url && (
                    <div>
                      <p className={`text-sm font-medium mb-2 ${isRTL ? 'text-right' : ''}`}>{t('admin.selfieWithId')}</p>
                      {selfieImageUrl ? (
                        <img 
                          src={selfieImageUrl} 
                          alt={t('admin.selfieWithId')} 
                          className="max-w-[200px] rounded-lg border cursor-pointer hover:opacity-80 transition-opacity object-contain bg-muted"
                          onClick={() => openImageViewer(selfieImageUrl, t('admin.selfieWithId'))}
                        />
                      ) : (
                        <div className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={`flex gap-2 pt-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => { setShowDetailsDialog(false); setShowNotificationDialog(true); }}
                >
                  <Send className="h-4 w-4" />
                  {t('admin.sendNotification')}
                </Button>
                <Button
                  variant={selectedClient.is_frozen ? "default" : "destructive"}
                  className="gap-2"
                  onClick={() => { handleFreeze(selectedClient.id, !selectedClient.is_frozen); setShowDetailsDialog(false); }}
                >
                  {selectedClient.is_frozen ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {t('admin.unfreezeAccount')}
                    </>
                  ) : (
                    <>
                      <Snowflake className="h-4 w-4" />
                      {t('admin.freezeAccount')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <DialogTitle>{t('admin.sendNotification')}</DialogTitle>
            <DialogDescription>
              {t('admin.sendNotificationTo')} {selectedClient?.name || selectedClient?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('admin.notificationTitle')}</label>
              <Input
                placeholder={t('admin.notificationTitlePlaceholder')}
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('admin.notificationMessage')}</label>
              <Textarea
                placeholder={t('admin.notificationMessagePlaceholder')}
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              {t('admin.cancel')}
            </Button>
            <Button 
              onClick={handleSendNotification}
              disabled={!notificationTitle || !notificationMessage || actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t('admin.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
