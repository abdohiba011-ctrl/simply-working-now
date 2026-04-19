import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { AdminVerificationsSkeleton } from "@/components/ui/admin-skeleton";
import { 
  Search, User, Eye, ChevronUp, ChevronDown, 
  Filter, CheckCircle, Clock, XCircle, AlertTriangle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PendingUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  id_card_number: string | null;
  full_name_on_id: string | null;
  verification_status: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  phone_verified: boolean | null;
}

type SortField = 'created_at' | 'name' | 'email' | 'verification_status';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending_review' | 'not_started' | 'verified' | 'rejected' | 'blocked';

export const AdminVerificationsTab = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, statusFilter, sortField, sortOrder]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, id_card_number, full_name_on_id, verification_status, is_verified, created_at, phone_verified')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: unknown) {
      toast.error(t('errors.loadFailed'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let result = [...users];

    if (statusFilter !== 'all') {
      result = result.filter(u => u.verification_status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.name?.toLowerCase().includes(query)) ||
        (u.email?.toLowerCase().includes(query)) ||
        (u.phone?.toLowerCase().includes(query)) ||
        (u.id_card_number?.toLowerCase().includes(query))
      );
    }

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      const rawA = a[sortField];
      const rawB = b[sortField];

      if (sortField === 'created_at') {
        aVal = new Date((rawA as string) || 0).getTime();
        bVal = new Date((rawB as string) || 0).getTime();
      } else {
        aVal = (String(rawA ?? '')).toLowerCase();
        bVal = (String(rawB ?? '')).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredUsers(result);
  };

  const getStatusBadge = (status: string | null, isVerified: boolean | null) => {
    if (isVerified) {
      return <StatusBadge status="verified" label={t('admin.verified')} />;
    }
    
    switch (status) {
      case 'pending_review':
        return <StatusBadge status="pending" label={t('admin.pendingReview')} />;
      case 'rejected':
        return <StatusBadge status="rejected" label={t('admin.rejected')} />;
      case 'blocked':
        return <StatusBadge status="blocked" label={t('admin.blocked')} />;
      case 'not_started':
      default:
        return <StatusBadge status="not_started" label={t('admin.notStarted')} />;
    }
  };

  const getPhoneVerifiedBadge = (verified: boolean | null) => {
    if (verified) {
      return <StatusBadge status="verified" label={t('admin.phone')} size="sm" />;
    }
    return <Badge variant="outline" className="text-xs gap-1 border-border text-muted-foreground"><XCircle className="h-3 w-3" />{t('admin.phone')}</Badge>;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const pendingCount = users.filter(u => u.verification_status === 'pending_review').length;

  if (isLoading) {
    return <AdminVerificationsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 ${isRTL ? 'text-right' : ''}`}>
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{users.length}</div>
          <div className="text-sm text-muted-foreground">{t('admin.totalUsers')}</div>
        </Card>
        <Card className="p-4 border-warning/50">
          <div className="text-2xl font-bold text-warning">{pendingCount}</div>
          <div className="text-sm text-muted-foreground">{t('admin.pendingReview')}</div>
        </Card>
        <Card className="p-4 border-success/50">
          <div className="text-2xl font-bold text-success">
            {users.filter(u => u.is_verified).length}
          </div>
          <div className="text-sm text-muted-foreground">{t('admin.verified')}</div>
        </Card>
        <Card className="p-4 border-destructive/50">
          <div className="text-2xl font-bold text-destructive">
            {users.filter(u => u.verification_status === 'rejected').length}
          </div>
          <div className="text-sm text-muted-foreground">{t('admin.rejected')}</div>
        </Card>
        <Card className="p-4 border-border">
          <div className="text-2xl font-bold text-muted-foreground">
            {users.filter(u => u.verification_status === 'not_started' || !u.verification_status).length}
          </div>
          <div className="text-sm text-muted-foreground">{t('admin.notStarted')}</div>
        </Card>
      </div>

      {/* Filters Row */}
      <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={t('admin.searchByNameEmailPhoneId')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={isRTL ? 'pr-10' : 'pl-10'}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className={`w-full md:w-[180px] ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('admin.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
            <SelectItem value="pending_review">
              <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Clock className="h-4 w-4 text-warning" />
                {t('admin.pendingReview')}
              </span>
            </SelectItem>
            <SelectItem value="verified">
              <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CheckCircle className="h-4 w-4 text-success" />
                {t('admin.verified')}
              </span>
            </SelectItem>
            <SelectItem value="rejected">
              <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <XCircle className="h-4 w-4 text-destructive" />
                {t('admin.rejected')}
              </span>
            </SelectItem>
            <SelectItem value="not_started">
              <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                {t('admin.notStarted')}
              </span>
            </SelectItem>
            <SelectItem value="blocked">
              <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <XCircle className="h-4 w-4 text-destructive" />
                {t('admin.blocked')}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sorting Buttons */}
      <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button 
          variant={sortField === 'created_at' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleSort('created_at')}
          className="gap-1"
        >
          {t('admin.date')} <SortIcon field="created_at" />
        </Button>
        <Button 
          variant={sortField === 'name' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleSort('name')}
          className="gap-1"
        >
          {t('admin.name')} <SortIcon field="name" />
        </Button>
        <Button 
          variant={sortField === 'verification_status' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleSort('verification_status')}
          className="gap-1"
        >
          {t('admin.status')} <SortIcon field="verification_status" />
        </Button>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">{t('admin.noUsersFound')}</h2>
            <p className="text-muted-foreground">{t('admin.tryAdjustingFilters')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredUsers.map((user) => (
            <Card 
              key={user.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                user.verification_status === 'pending_review' ? 'border-warning/50 bg-warning/10 dark:bg-warning/10' : ''
              }`}
              onClick={() => navigate(`/admin/verifications/${user.id}`)}
            >
              <CardContent className="p-4">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className={isRTL ? 'text-right' : ''}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <h3 className="font-semibold">{user.name || t('admin.noName')}</h3>
                        {getStatusBadge(user.verification_status, user.is_verified)}
                        {getPhoneVerifiedBadge(user.phone_verified)}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.created_at && new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/verifications/${user.id}`);
                    }}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    {t('admin.viewDetails')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
