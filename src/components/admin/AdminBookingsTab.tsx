import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Search, 
  Calendar as CalendarIcon, 
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Building2,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, isThisWeek, isBefore, startOfDay } from "date-fns";
import { resolveBikeImageUrl } from "@/lib/bikeImageResolver";
import { BookingQuickFilters, BookingBulkActions } from "./bookings";

import { AdminTableSkeleton } from "@/components/ui/admin-skeleton";

type AdminStatus = 'new' | 'reviewed' | 'confirmed' | 'rejected';
type SortField = 'created_at' | 'pickup_date' | 'total_price' | 'customer_name';
type SortDirection = 'asc' | 'desc';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  status: string;
  admin_status: string;
  payment_status: string;
  contract_status: string;
  assigned_to_business: string | null;
  created_at: string;
  delivery_method: string;
  bikes?: {
    location: string;
    license_plate: string | null;
    bike_types: {
      name: string;
      main_image_url: string;
    };
  };
}

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-success/10 text-success border-success/20 text-xs">Paid</Badge>;
    case 'partially_paid':
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Partial</Badge>;
    case 'failed':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Failed</Badge>;
    case 'refunded':
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">Refunded</Badge>;
    default:
      return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Unpaid</Badge>;
  }
};

const getContractStatusBadge = (status: string) => {
  switch (status) {
    case 'signed':
      return <Badge className="bg-success/10 text-success border-success/20 text-xs">Signed</Badge>;
    case 'sent':
      return <Badge className="bg-info/10 text-info border-info/20 text-xs">Sent</Badge>;
    case 'generated':
      return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Generated</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Not Generated</Badge>;
  }
};

export const AdminBookingsTab = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminStatus | "all">("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [contractStatusFilter, setContractStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [dateType, setDateType] = useState<'created' | 'pickup' | 'return'>('pickup');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [locations, setLocations] = useState<string[]>([]);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, customer_name, customer_email, customer_phone, pickup_date, return_date,
          total_price, status, admin_status, payment_status, contract_status,
          assigned_to_business, created_at, delivery_method,
          bikes(location, license_plate, bike_types(name, main_image_url))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as Booking[]);
      
      // Extract unique locations
      const uniqueLocations = [...new Set(data?.map(b => b.bikes?.location).filter(Boolean))] as string[];
      setLocations(uniqueLocations);
    } catch (error) {
      toast.error('Failed to load bookings');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate counts for quick filters
  const counts = useMemo(() => {
    const today = startOfDay(new Date());
    return {
      new: bookings.filter(b => b.admin_status === 'new').length,
      reviewed: bookings.filter(b => b.admin_status === 'reviewed').length,
      confirmed: bookings.filter(b => b.admin_status === 'confirmed').length,
      rejected: bookings.filter(b => b.admin_status === 'rejected').length,
      unpaid: bookings.filter(b => !b.payment_status || b.payment_status === 'unpaid').length,
      partially_paid: bookings.filter(b => b.payment_status === 'partially_paid').length,
      paid: bookings.filter(b => b.payment_status === 'paid').length,
      failed: bookings.filter(b => b.payment_status === 'failed').length,
      pickupToday: bookings.filter(b => isToday(new Date(b.pickup_date))).length,
      pickupThisWeek: bookings.filter(b => isThisWeek(new Date(b.pickup_date))).length,
      overdueReturn: bookings.filter(b => 
        b.admin_status === 'confirmed' && 
        isBefore(new Date(b.return_date), today)
      ).length,
      unassigned: bookings.filter(b => !b.assigned_to_business && b.admin_status !== 'rejected').length,
    };
  }, [bookings]);

  // Toggle quick filter
  const toggleQuickFilter = (filterId: string) => {
    setQuickFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
    setCurrentPage(1);
  };

  // Filter bookings
  const filteredBookings = useMemo(() => {
    const today = startOfDay(new Date());
    
    return bookings
      .filter(booking => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = 
            booking.customer_name?.toLowerCase().includes(query) ||
            booking.customer_email?.toLowerCase().includes(query) ||
            booking.customer_phone?.includes(query) ||
            booking.id?.toLowerCase().includes(query) ||
            booking.bikes?.bike_types?.name?.toLowerCase().includes(query) ||
            booking.bikes?.license_plate?.toLowerCase().includes(query) ||
            booking.bikes?.location?.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }
        
        // Quick filters
        if (quickFilters.length > 0) {
          let matchesQuickFilter = false;
          
          for (const filter of quickFilters) {
            if (filter.startsWith('admin_')) {
              const status = filter.replace('admin_', '');
              if (booking.admin_status === status) matchesQuickFilter = true;
            }
            if (filter.startsWith('payment_')) {
              const status = filter.replace('payment_', '');
              if ((booking.payment_status || 'unpaid') === status) matchesQuickFilter = true;
            }
            if (filter === 'pickup_today' && isToday(new Date(booking.pickup_date))) {
              matchesQuickFilter = true;
            }
            if (filter === 'pickup_this_week' && isThisWeek(new Date(booking.pickup_date))) {
              matchesQuickFilter = true;
            }
            if (filter === 'overdue_return' && 
                booking.admin_status === 'confirmed' && 
                isBefore(new Date(booking.return_date), today)) {
              matchesQuickFilter = true;
            }
            if (filter === 'unassigned' && !booking.assigned_to_business && booking.admin_status !== 'rejected') {
              matchesQuickFilter = true;
            }
          }
          
          if (!matchesQuickFilter) return false;
        }
        
        // Standard filters
        if (statusFilter !== "all" && booking.admin_status !== statusFilter) return false;
        if (bookingStatusFilter !== "all" && booking.status !== bookingStatusFilter) return false;
        if (paymentStatusFilter !== "all" && (booking.payment_status || 'unpaid') !== paymentStatusFilter) return false;
        if (contractStatusFilter !== "all" && (booking.contract_status || 'not_generated') !== contractStatusFilter) return false;
        if (locationFilter !== "all" && booking.bikes?.location !== locationFilter) return false;
        
        if (assignmentFilter === "assigned" && !booking.assigned_to_business) return false;
        if (assignmentFilter === "unassigned" && booking.assigned_to_business) return false;
        
        // Date filters
        const dateField = dateType === 'created' ? booking.created_at : 
                         dateType === 'return' ? booking.return_date : booking.pickup_date;
        if (dateFrom && new Date(dateField) < dateFrom) return false;
        if (dateTo && new Date(dateField) > dateTo) return false;
        
        return true;
      })
      .sort((a, b) => {
        let aVal: string | number, bVal: string | number;
        switch (sortField) {
          case 'customer_name':
            aVal = a.customer_name?.toLowerCase() || '';
            bVal = b.customer_name?.toLowerCase() || '';
            break;
          case 'pickup_date':
            aVal = new Date(a.pickup_date).getTime();
            bVal = new Date(b.pickup_date).getTime();
            break;
          case 'total_price':
            aVal = a.total_price;
            bVal = b.total_price;
            break;
          default:
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
        }
        if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
  }, [bookings, searchQuery, quickFilters, statusFilter, bookingStatusFilter, paymentStatusFilter, contractStatusFilter, locationFilter, assignmentFilter, dateType, dateFrom, dateTo, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setBookingStatusFilter("all");
    setPaymentStatusFilter("all");
    setContractStatusFilter("all");
    setLocationFilter("all");
    setAssignmentFilter("all");
    setDateType('pickup');
    setDateFrom(undefined);
    setDateTo(undefined);
    setQuickFilters([]);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || bookingStatusFilter !== "all" || 
    paymentStatusFilter !== "all" || contractStatusFilter !== "all" || 
    locationFilter !== "all" || assignmentFilter !== "all" || 
    dateFrom || dateTo || quickFilters.length > 0;

  // Selection handlers
  const toggleBookingSelection = (bookingId: string) => {
    setSelectedBookings(prev => {
      const next = new Set(prev);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  };

  const toggleAllSelection = () => {
    if (selectedBookings.size === paginatedBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(paginatedBookings.map(b => b.id)));
    }
  };

  // Bulk action handlers
  const handleBulkConfirm = () => {
    toast.info('Bulk confirm coming soon');
  };

  const handleBulkReject = () => {
    toast.info('Bulk reject coming soon');
  };

  const handleBulkAssign = () => {
    toast.info('Bulk assign coming soon');
  };

  const handleExportCsv = () => {
    // Export filtered bookings to CSV
    const headers = ['ID', 'Customer', 'Email', 'Phone', 'Bike', 'Location', 'Pickup', 'Return', 'Total', 'Status', 'Payment', 'Contract'];
    const rows = filteredBookings.map(b => [
      b.id,
      b.customer_name,
      b.customer_email,
      b.customer_phone,
      b.bikes?.bike_types?.name || '',
      b.bikes?.location || '',
      format(new Date(b.pickup_date), 'yyyy-MM-dd'),
      format(new Date(b.return_date), 'yyyy-MM-dd'),
      b.total_price,
      b.admin_status,
      b.payment_status || 'unpaid',
      b.contract_status || 'not_generated'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredBookings.length} bookings`);
  };

  const getDuration = (pickup: string, returnDate: string) => {
    const days = Math.ceil((new Date(returnDate).getTime() - new Date(pickup).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days;
  };

  return (
    <div className="space-y-4">
      {/* Stuck payment recovery */}
      <StuckPaymentsCard />

      {/* Quick Filters */}
      <Card>
        <CardContent className="pt-4">
          <BookingQuickFilters
            activeFilters={quickFilters}
            onToggleFilter={toggleQuickFilter}
            counts={counts}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer, bike, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Booking Status */}
            <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Booking Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Status */}
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partially_paid">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Contract Status */}
            <Select value={contractStatusFilter} onValueChange={setContractStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Contract" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="not_generated">Not Generated</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
              </SelectContent>
            </Select>

            {/* Assignment */}
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            {/* Location */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Type */}
            <Select value={dateType} onValueChange={(v) => setDateType(v as 'created' | 'pickup' | 'return')}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pickup Date</SelectItem>
                <SelectItem value="return">Return Date</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal h-9">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM d") : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal h-9">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM d") : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Bookings</CardTitle>
              <CardDescription>{filteredBookings.length} found</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchBookings} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminTableSkeleton />
          ) : paginatedBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No bookings found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={selectedBookings.size === paginatedBookings.length && paginatedBookings.length > 0}
                          onCheckedChange={toggleAllSelection}
                        />
                      </TableHead>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('created_at')}
                      >
                        Booking <SortIcon field="created_at" />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('customer_name')}
                      >
                        Customer <SortIcon field="customer_name" />
                      </TableHead>
                      <TableHead>Bike</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('pickup_date')}
                      >
                        Dates <SortIcon field="pickup_date" />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-foreground text-right"
                        onClick={() => handleSort('total_price')}
                      >
                        Price <SortIcon field="total_price" />
                      </TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBookings.map((booking) => (
                      <TableRow 
                        key={booking.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedBookings.has(booking.id)}
                            onCheckedChange={() => toggleBookingSelection(booking.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <img 
                            src={resolveBikeImageUrl(booking.bikes?.bike_types?.main_image_url)} 
                            alt={booking.bikes?.bike_types?.name || 'Bike'}
                            className="h-10 w-14 rounded object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-xs">{booking.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(booking.created_at), 'MMM d, HH:mm')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{booking.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{booking.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{booking.bikes?.bike_types?.name || 'N/A'}</p>
                            {booking.bikes?.license_plate && (
                              <p className="text-xs text-muted-foreground">{booking.bikes.license_plate}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{booking.bikes?.location || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(booking.pickup_date), 'MMM d')}</p>
                            <p className="text-muted-foreground text-xs">
                              → {format(new Date(booking.return_date), 'MMM d')} ({getDuration(booking.pickup_date, booking.return_date)}d)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{booking.total_price} DH</TableCell>
                        <TableCell>{getPaymentStatusBadge(booking.payment_status || 'unpaid')}</TableCell>
                        <TableCell>{getContractStatusBadge(booking.contract_status || 'not_generated')}</TableCell>
                        <TableCell>
                          {booking.assigned_to_business ? (
                            <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/20">
                              <Building2 className="h-3 w-3 mr-1" />
                              Assigned
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Unassigned</Badge>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge status={booking.admin_status || 'new'} size="sm" /></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows:</span>
                  <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} / {totalPages || 1}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      <BookingBulkActions
        selectedCount={selectedBookings.size}
        onBulkConfirm={handleBulkConfirm}
        onBulkReject={handleBulkReject}
        onBulkAssign={handleBulkAssign}
        onExportCsv={handleExportCsv}
        onClearSelection={() => setSelectedBookings(new Set())}
      />
    </div>
  );
};
