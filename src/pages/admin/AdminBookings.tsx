import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Eye, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminBookingsSkeleton } from "@/components/ui/admin-skeleton";

type AdminStatus = 'new' | 'reviewed' | 'confirmed' | 'rejected' | 'all';

interface Booking {
  id: string;
  bike_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  status: string;
  admin_status: string;
  admin_notes: string | null;
  assigned_to_business: string | null;
  assigned_at: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  delivery_method: string;
  delivery_location: string | null;
  contract_url: string | null;
  signed_contract_url: string | null;
  bikes?: {
    location: string;
    bike_types: {
      name: string;
      main_image_url: string;
    };
  };
}

interface BookingCounts {
  new: number;
  reviewed: number;
  confirmed: number;
  rejected: number;
}

const AdminBookings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminStatus>("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [counts, setCounts] = useState<BookingCounts>({ new: 0, reviewed: 0, confirmed: 0, rejected: 0 });

  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated) {
        navigate("/auth");
        return;
      }
      const isAdmin = hasRole('admin');
      if (!isAdmin) {
        navigate("/");
        return;
      }
      fetchBookings();
    };
    checkAccess();
  }, [isAuthenticated, hasRole, navigate]);

  useEffect(() => {
    let filtered = bookings;

    if (statusFilter !== "all") {
      filtered = filtered.filter(b => b.admin_status === statusFilter);
    }

    if (bookingStatusFilter !== "all") {
      filtered = filtered.filter(b => {
        const bs = (b as unknown as { booking_status?: string }).booking_status || b.status;
        return bs === bookingStatusFilter;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.customer_name?.toLowerCase().includes(query) ||
        booking.customer_email?.toLowerCase().includes(query) ||
        booking.customer_phone?.includes(query) ||
        booking.id.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  }, [searchQuery, statusFilter, bookingStatusFilter, bookings]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          bikes(
            location,
            bike_types(name, main_image_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const bookingsData = (data || []) as Booking[];
      setBookings(bookingsData);
      setFilteredBookings(bookingsData);
      
      // Calculate counts
      setCounts({
        new: bookingsData.filter(b => b.admin_status === 'new').length,
        reviewed: bookingsData.filter(b => b.admin_status === 'reviewed').length,
        confirmed: bookingsData.filter(b => b.admin_status === 'confirmed').length,
        rejected: bookingsData.filter(b => b.admin_status === 'rejected').length,
      });
    } catch (error) {
      toast.error("Failed to load bookings");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAdminStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-info/10 text-info border-info/20"><Clock className="h-3 w-3 mr-1" />New</Badge>;
      case 'reviewed':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><AlertCircle className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'confirmed':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return <Badge variant="outline" className="text-success">Active</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-warning">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-muted-foreground">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statusCards = [
    { key: 'new' as AdminStatus, label: 'New', count: counts.new, icon: Clock, color: 'text-info', bg: 'bg-info/10 dark:bg-info/10' },
    { key: 'reviewed' as AdminStatus, label: 'Reviewed', count: counts.reviewed, icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10 dark:bg-warning/10' },
    { key: 'confirmed' as AdminStatus, label: 'Confirmed', count: counts.confirmed, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10 dark:bg-success/10' },
    { key: 'rejected' as AdminStatus, label: 'Rejected', count: counts.rejected, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Bookings Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review and manage all customer bookings
            </p>
          </div>
          <Button variant="outline" onClick={fetchBookings} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statusCards.map((card) => (
            <Card
              key={card.key}
              className={`cursor-pointer transition-all hover:shadow-md ${card.bg} ${statusFilter === card.key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(statusFilter === card.key ? 'all' : card.key)}
            >
              <CardContent className="pt-4 text-center">
                <card.icon className={`h-6 w-6 mx-auto mb-2 ${card.color}`} />
                <p className={`text-2xl font-bold ${card.color}`}>{card.count}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Clear Filter Button */}
        {statusFilter !== "all" && (
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
              Clear filter: {statusFilter}
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>
                  {filteredBookings.length} bookings found
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, ID..."
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
              <AdminBookingsSkeleton />
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No bookings found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Motorbike</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          {booking.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{booking.customer_email}</p>
                            <p className="text-xs text-muted-foreground">{booking.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {booking.bikes?.bike_types?.main_image_url && (
                              <img 
                                src={booking.bikes.bike_types.main_image_url} 
                                alt={booking.bikes.bike_types.name}
                                className="h-8 w-8 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">{booking.bikes?.bike_types?.name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{booking.bikes?.location || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(booking.pickup_date), 'MMM d, yyyy')}</p>
                            <p className="text-muted-foreground">to {format(new Date(booking.return_date), 'MMM d, yyyy')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{booking.total_price} DH</TableCell>
                        <TableCell>{getBookingStatusBadge(booking.status || 'pending')}</TableCell>
                        <TableCell>{getAdminStatusBadge(booking.admin_status || 'new')}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/bookings/${booking.id}`)}
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
    </AdminLayout>
  );
};

export default AdminBookings;