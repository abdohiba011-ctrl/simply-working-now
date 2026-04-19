import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Search, User, Bike, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  status: string;
  bike: {
    id: string;
    location: string;
    bike_type: {
      name: string;
    };
  };
}

const AllBookings = () => {
  const { t, language } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          bike:bikes (
            id,
            location,
            bike_type:bike_types (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: unknown) {
      console.error("Error fetching bookings:", error);
      toast.error(t("allBookings.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending": return "bg-yellow-500 text-black";
      case "completed": return "bg-green-500 text-white";
      case "confirmed": 
      case "upcoming": return "bg-blue-500 text-white";
      case "in_progress": 
      case "cancelled": 
      case "canceled": return "bg-red-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const query = searchQuery.toLowerCase();
    return (
      booking.customer_name.toLowerCase().includes(query) ||
      booking.customer_email.toLowerCase().includes(query) ||
      booking.bike?.bike_type?.name.toLowerCase().includes(query) ||
      booking.bike?.location.toLowerCase().includes(query)
    );
  });

  const getLocaleCode = () => {
    switch (language) {
      case 'ar': return 'ar-MA';
      case 'fr': return 'fr-FR';
      default: return 'en-US';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">{t("allBookings.loadingBookings")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t("allBookings.title")}</h1>
          <p className="text-muted-foreground">
            {t("allBookings.subtitle")} • {t("allBookings.total")}: {bookings.length}
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rtl-flip" />
                <Input 
                  placeholder={t("allBookings.searchPlaceholder")} 
                  className="pl-10 rtl:pl-3 rtl:pr-10 ltr-input"
                  dir="ltr"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bike className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("allBookings.noBookingsFound")}</h2>
              <p className="text-muted-foreground">
                {searchQuery ? t("allBookings.tryAdjustingSearch") : t("allBookings.noBookingsYet")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                        <h3 className="text-xl font-bold text-foreground">
                          {booking.bike?.bike_type?.name || t("allBookings.unknownBike")}
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{booking.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate ltr-input" dir="ltr">{booking.customer_email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span dir="ltr">{booking.customer_phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span>{booking.bike?.location || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>
                            {new Date(booking.pickup_date).toLocaleDateString(getLocaleCode())} - {new Date(booking.return_date).toLocaleDateString(getLocaleCode())}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Bike className="h-4 w-4 flex-shrink-0" />
                          <span className="font-semibold text-foreground">{booking.total_price} DH</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:min-w-[140px]">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(booking.customer_phone);
                          toast.success(t("allBookings.phoneCopied"));
                        }}
                      >
                        {t("allBookings.copyPhone")}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          window.location.href = `mailto:${booking.customer_email}`;
                        }}
                      >
                        {t("allBookings.emailCustomer")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AllBookings;
