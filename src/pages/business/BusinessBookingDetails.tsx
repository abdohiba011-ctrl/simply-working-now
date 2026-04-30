import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BusinessLayout } from "@/components/layouts/BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Bike,
  Download,
  Copy,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingDetails {
  id: string;
  bike_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  status: string;
  contract_url: string | null;
  created_at: string;
  bikes?: {
    license_plate: string | null;
    location: string;
    bike_types?: {
      name: string;
      daily_price: number;
    };
  };
}

const BusinessBookingDetails = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();
  const { t } = useLanguage();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);

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

      if (bookingId) {
        fetchBooking();
      }
    };

    checkAccess();
  }, [isAuthenticated, hasRole, navigate, bookingId]);

  const fetchBooking = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          bikes(
            license_plate,
            location,
            bike_types(name, daily_price)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error) {
      toast.error(t("businessBookingDetails.loadError"));
      navigate("/business-dashboard/bookings");
    } finally {
      setIsLoading(false);
    }
  };


  const handleDownloadContract = async () => {
    if (booking?.contract_url) {
      window.open(booking.contract_url, '_blank');
      return;
    }
    
    // Generate contract if not available
    setIsGeneratingContract(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract', {
        body: { bookingId: booking?.id }
      });
      
      if (error) throw error;
      
      if (data?.contractUrl) {
        window.open(data.contractUrl, '_blank');
        // Refresh booking to get updated contract_url
        fetchBooking();
        toast.success(t("businessBookingDetails.contractGenerated"));
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast.error(t("businessBookingDetails.contractError"));
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("businessBookingDetails.copied"));
  };


  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </BusinessLayout>
    );
  }

  if (!booking) {
    return (
      <BusinessLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">{t("businessBookingDetails.notFound")}</p>
          <Button className="mt-4" onClick={() => navigate("/business-dashboard/bookings")}>
            {t("businessBookingDetails.backToBookings")}
          </Button>
        </div>
      </BusinessLayout>
    );
  }

  const days = Math.ceil(
    (new Date(booking.return_date).getTime() - new Date(booking.pickup_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <BusinessLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate("/business-dashboard/bookings")}
        >
          <ChevronLeft className="h-4 w-4 rtl-flip" />
          {t("businessBookingDetails.backToBookings")}
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t("businessBookingDetails.title")}</h1>
            <p className="text-sm text-muted-foreground font-mono">{booking.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status || 'pending'} />
            <Button 
              onClick={handleDownloadContract} 
              disabled={isGeneratingContract}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isGeneratingContract ? t("businessBookingDetails.generating") : (booking?.contract_url ? t("businessBookingDetails.downloadContract") : t("businessBookingDetails.generateContract"))}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {t("businessBookingDetails.customerInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.customer_name}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span dir="ltr">{booking.customer_phone}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(booking.customer_phone)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" dir="ltr">{booking.customer_email}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(booking.customer_email)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Motorbike Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bike className="h-5 w-5" />
                {t("businessBookingDetails.motorbikeDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("businessBookingDetails.model")}</p>
                <p className="font-medium">{booking.bikes?.bike_types?.name || 'N/A'}</p>
              </div>
              
              {booking.bikes?.license_plate && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("businessBookingDetails.licensePlate")}</p>
                  <p className="font-medium">{booking.bikes.license_plate}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{booking.bikes?.location || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Booking Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                {t("businessBookingDetails.rentalPeriod")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("businessBookingDetails.pickupDate")}</p>
                  <p className="font-medium">{format(new Date(booking.pickup_date), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("businessBookingDetails.returnDate")}</p>
                  <p className="font-medium">{format(new Date(booking.return_date), 'PPP')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{days} {days > 1 ? t("businessBookingDetails.daysRental") : t("businessBookingDetails.dayRental")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("businessBookingDetails.pricing")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("businessBookingDetails.dailyRate")}</span>
                <span>{booking.bikes?.bike_types?.daily_price || 0} DH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("businessBookingDetails.duration")}</span>
                <span>{days} {t("businessBookingDetails.days")}</span>
              </div>
              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>{t("businessBookingDetails.total")}</span>
                <span className="text-foreground">{booking.total_price} DH</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessBookingDetails;
