import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Search, 
  Eye, 
  Phone,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Snowflake,
  Filter,
  ChevronDown,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AdminTableSkeleton } from "@/components/ui/admin-skeleton";

interface ClientUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  verification_status: string | null;
  is_frozen: boolean | null;
  created_at: string | null;
}

interface AdminUnifiedClientsTabProps {
  statusFilter?: "all" | "pending" | "verified" | "not_verified" | "blocked";
  onDataChanged?: () => void;
}

export const AdminUnifiedClientsTab = ({ statusFilter = "all", onDataChanged }: AdminUnifiedClientsTabProps) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localStatusFilter, setLocalStatusFilter] = useState<string>(statusFilter);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    notStarted: 0,
    blocked: 0
  });

  useEffect(() => {
    fetchClients();
  }, []);

  // Sync prop -> local filter when parent stat cards change selection
  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    let filtered = clients;
    
    const activeFilter = localStatusFilter || statusFilter;
    if (activeFilter !== "all") {
      filtered = clients.filter(client => {
        switch (activeFilter) {
          case "pending":
            return client.verification_status === 'pending_review';
          case "verified":
            return client.is_verified === true;
          case "not_verified":
            return !client.is_verified
              && client.verification_status !== 'pending_review'
              && client.verification_status !== 'rejected';
          case "blocked":
            return client.is_frozen === true;
          default:
            return true;
        }
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(client => 
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery)
      );
    }
    
    setFilteredClients(filtered);
  }, [searchQuery, clients, statusFilter, localStatusFilter]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, avatar_url, is_verified, verification_status, is_frozen, created_at, user_type')
        .or('user_type.is.null,user_type.eq.client,user_type.eq.renter')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const clientsData = data || [];
      setClients(clientsData);
      setFilteredClients(clientsData);

      // Calculate stats from the SAME dataset that drives the table,
      // guaranteeing badge counts always match what's rendered.
      const nextStats = {
        total: clientsData.length,
        verified: clientsData.filter(c => c.is_verified).length,
        pending: clientsData.filter(c => c.verification_status === 'pending_review').length,
        notStarted: clientsData.filter(c => !c.is_verified && c.verification_status !== 'pending_review' && c.verification_status !== 'rejected').length,
        blocked: clientsData.filter(c => c.is_frozen).length,
      };
      setStats(nextStats);

      // Debug: surface any drift between badge counts and what filters resolve to
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[AdminClients] fetched', {
          rows: clientsData.length,
          stats: nextStats,
          sampleStatuses: clientsData.slice(0, 5).map(c => ({
            id: c.id,
            is_verified: c.is_verified,
            verification_status: c.verification_status,
            is_frozen: c.is_frozen,
          })),
        });
      }
    } catch (error: unknown) {
      toast.error("Failed to load clients");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };

  const getVerificationStatus = (client: ClientUser): string => {
    if (client.is_verified) return 'verified';
    if (client.verification_status === 'pending_review') return 'pending';
    if (client.verification_status === 'rejected') return 'rejected';
    return 'not_started';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const clearFilters = () => {
    setLocalStatusFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = localStatusFilter !== "all" || searchQuery.length > 0;

  return (
    <div className="space-y-6">
      {/* Compact Stats Row - Badge Style */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={localStatusFilter === "all" ? "default" : "outline"} 
          className="cursor-pointer px-3 py-1.5 text-sm"
          onClick={() => setLocalStatusFilter("all")}
        >
          <User className="h-3 w-3 mr-1.5" />
          All {stats.total}
        </Badge>
        <Badge 
          variant={localStatusFilter === "verified" ? "default" : "outline"}
          className={cn(
            "cursor-pointer px-3 py-1.5 text-sm",
            localStatusFilter !== "verified" && "bg-success/10 text-success border-success/30 hover:bg-success/20 dark:bg-success/10 dark:text-success dark:border-success/40"
          )}
          onClick={() => setLocalStatusFilter("verified")}
        >
          <CheckCircle className="h-3 w-3 mr-1.5" />
          Verified {stats.verified}
        </Badge>
        <Badge 
          variant={localStatusFilter === "pending" ? "default" : "outline"}
          className={cn(
            "cursor-pointer px-3 py-1.5 text-sm",
            localStatusFilter !== "pending" && "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 dark:bg-warning/10 dark:text-warning dark:border-warning/40"
          )}
          onClick={() => setLocalStatusFilter("pending")}
        >
          <Clock className="h-3 w-3 mr-1.5" />
          Pending {stats.pending}
        </Badge>
        <Badge 
          variant={localStatusFilter === "not_verified" ? "default" : "outline"}
          className={cn(
            "cursor-pointer px-3 py-1.5 text-sm",
            localStatusFilter !== "not_verified" && "bg-muted/50 text-foreground border-border hover:bg-muted dark:bg-muted dark:text-muted-foreground dark:border-border"
          )}
          onClick={() => setLocalStatusFilter("not_verified")}
        >
          <AlertCircle className="h-3 w-3 mr-1.5" />
          Not Started {stats.notStarted}
        </Badge>
        <Badge 
          variant={localStatusFilter === "blocked" ? "default" : "outline"}
          className={cn(
            "cursor-pointer px-3 py-1.5 text-sm",
            localStatusFilter !== "blocked" && "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 dark:bg-destructive/10 dark:text-destructive dark:border-destructive/40"
          )}
          onClick={() => setLocalStatusFilter("blocked")}
        >
          <Snowflake className="h-3 w-3 mr-1.5" />
          Blocked {stats.blocked}
        </Badge>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                All Clients
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click on a user to view full details
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Collapsible Filters */}
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        !
                      </Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              
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
          
          {/* Collapsible Filter Content */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Select value={localStatusFilter} onValueChange={setLocalStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="not_verified">Not Started</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminTableSkeleton />
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No clients found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow 
                      key={client.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${client.is_frozen ? "bg-destructive/5" : ""}`}
                      onClick={() => navigate(`/admin/clients/${client.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={client.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-primary/10">
                              {getInitials(client.name, client.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium">{client.name || 'No name'}</p>
                              {client.is_verified && <VerifiedBadge size="sm" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {client.phone || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={getVerificationStatus(client)} size="sm" />
                      </TableCell>
                      <TableCell>
                        {client.is_frozen && (
                          <StatusBadge status="frozen" label="Blocked" size="sm" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(client.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/clients/${client.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
