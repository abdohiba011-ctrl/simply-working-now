import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BusinessLayout } from "@/components/layouts/BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { BusinessBookingsSkeleton } from "@/components/ui/admin-skeleton";

interface Booking {
  id: string;
  bike_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  status: string;
  created_at: string;
  bike_types?: {
    name: string;
  };
}

const BusinessBookings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated) {
        navigate("/auth");
        return;
      }

      const isBusiness = hasRole('business');
      if (!isBusiness) {
        navigate("/");
        return;
      }

      fetchBookings();
    };

    checkAccess();
  }, [isAuthenticated, hasRole, navigate]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = bookings.filter(booking => 
        booking.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBookings(filtered);
    } else {
      setFilteredBookings(bookings);
    }
  }, [searchQuery, bookings]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      // Business users only see bookings assigned to them by admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          bikes(
            bike_types(name)
          )
        `)
        .eq('assigned_to_business', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedBookings = (data || []).map(b => ({
        ...b,
        bike_types: b.bikes?.bike_types
      }));
      
      setBookings(formattedBookings);
      setFilteredBookings(formattedBookings);
    } catch (error) {
      toast.error(t("businessBookings.loadError"));
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <BusinessLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("businessBookings.title")}
                </CardTitle>
                <CardDescription>
                  {filteredBookings.length} {t("businessBookings.bookingsFound")}
                </CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl-flip" />
                <Input
                  placeholder={t("businessBookings.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rtl:pl-3 rtl:pr-9 ltr-input"
                  dir="ltr"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <BusinessBookingsSkeleton />
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t("businessBookings.noBookingsFound")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("businessBookings.bookingId")}</TableHead>
                      <TableHead>{t("businessBookings.customer")}</TableHead>
                      <TableHead>{t("businessBookings.motorbike")}</TableHead>
                      <TableHead>{t("businessBookings.dates")}</TableHead>
                      <TableHead>{t("businessBookings.price")}</TableHead>
                      <TableHead>{t("businessBookings.status")}</TableHead>
                      <TableHead className="text-right">{t("businessBookings.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">
                          {booking.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.customer_name}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{booking.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{booking.bike_types?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(booking.pickup_date), 'MMM d')}</p>
                            <p className="text-muted-foreground">{t("businessBookings.to")} {format(new Date(booking.return_date), 'MMM d')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{booking.total_price} DH</TableCell>
                        <TableCell><StatusBadge status={booking.status || 'pending'} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/business-dashboard/booking/${booking.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t("businessBookings.view")}
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
    </BusinessLayout>
  );
};

export default BusinessBookings;
