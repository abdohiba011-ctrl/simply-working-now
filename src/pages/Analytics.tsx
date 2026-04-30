import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Eye, DollarSign, Calendar, Bike } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingData {
  id: string;
  total_price: number;
  status: string;
  pickup_date: string;
  created_at: string;
  bikes: {
    location: string;
    bike_types: {
      name: string;
    };
  };
}

interface BikePerformance {
  name: string;
  bookings: number;
  revenue: number;
}

interface LocationPerformance {
  city: string;
  bookings: number;
  revenue: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, hasRole } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [previousBookings, setPreviousBookings] = useState<BookingData[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    const isBusiness = hasRole('business');
    if (!isBusiness) {
      navigate("/");
      return;
    }

    fetchAnalyticsData();
  }, [isAuthenticated, hasRole, navigate, user]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());
      const previousMonthStart = startOfMonth(subDays(currentMonthStart, 1));
      const previousMonthEnd = endOfMonth(subDays(currentMonthStart, 1));

      // Fetch current month bookings
      const { data: currentData, error: currentError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_price,
          status,
          pickup_date,
          created_at,
          bikes!inner(
            location,
            bike_types!inner(name)
          )
        `)
        .eq('assigned_to_business', user.id)
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      if (currentError) throw currentError;

      // Fetch previous month bookings for comparison
      const { data: previousData, error: previousError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_price,
          status,
          pickup_date,
          created_at,
          bikes!inner(
            location,
            bike_types!inner(name)
          )
        `)
        .eq('assigned_to_business', user.id)
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());

      if (previousError) throw previousError;

      setBookings((currentData as BookingData[]) || []);
      setPreviousBookings((previousData as BookingData[]) || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics
  const totalBookings = bookings.length;
  const previousTotalBookings = previousBookings.length;
  const bookingsGrowth = previousTotalBookings > 0 
    ? ((totalBookings - previousTotalBookings) / previousTotalBookings * 100).toFixed(1)
    : totalBookings > 0 ? '100' : '0';

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const previousRevenue = previousBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const revenueGrowth = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
    : totalRevenue > 0 ? '100' : '0';

  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const previousCompleted = previousBookings.filter(b => b.status === 'completed').length;
  const completedGrowth = previousCompleted > 0 
    ? ((completedBookings - previousCompleted) / previousCompleted * 100).toFixed(1)
    : completedBookings > 0 ? '100' : '0';

  const conversionRate = totalBookings > 0 
    ? ((completedBookings / totalBookings) * 100).toFixed(1) 
    : '0';
  const previousConversionRate = previousTotalBookings > 0 
    ? ((previousCompleted / previousTotalBookings) * 100).toFixed(1) 
    : '0';
  const conversionGrowth = (parseFloat(conversionRate) - parseFloat(previousConversionRate)).toFixed(1);

  // Calculate top performing bikes
  const bikePerformance: BikePerformance[] = Object.values(
    bookings.reduce((acc: Record<string, BikePerformance>, booking) => {
      const bikeName = booking.bikes?.bike_types?.name || 'Unknown';
      if (!acc[bikeName]) {
        acc[bikeName] = { name: bikeName, bookings: 0, revenue: 0 };
      }
      acc[bikeName].bookings += 1;
      acc[bikeName].revenue += booking.total_price || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.bookings - a.bookings).slice(0, 5);

  // Calculate performance by location
  const locationPerformance: LocationPerformance[] = Object.values(
    bookings.reduce((acc: Record<string, LocationPerformance>, booking) => {
      const location = booking.bikes?.location || 'Unknown';
      if (!acc[location]) {
        acc[location] = { city: location, bookings: 0, revenue: 0 };
      }
      acc[location].bookings += 1;
      acc[location].revenue += booking.total_price || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.revenue - a.revenue);

  const GrowthIndicator = ({ value }: { value: string }) => {
    const numValue = parseFloat(value);
    const isPositive = numValue >= 0;
    return (
      <p className={`text-xs flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3 rtl-flip" /> : <TrendingDown className="h-3 w-3 rtl-flip" />}
        {isPositive ? '+' : ''}{value}% {t("analytics.fromLastMonth")}
      </p>
    );
  };

  const currentMonth = format(new Date(), 'MMMM yyyy');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t("analytics.title")}</h1>
          <p className="text-muted-foreground">
            {t("analytics.subtitle").replace('{{month}}', currentMonth)}
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("analytics.totalBookings")}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <GrowthIndicator value={bookingsGrowth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("analytics.revenue")}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} DH</div>
              <GrowthIndicator value={revenueGrowth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("analytics.completed")}</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedBookings}</div>
              <GrowthIndicator value={completedGrowth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("analytics.completionRate")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground rtl-flip" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <GrowthIndicator value={conversionGrowth} />
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Bikes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("analytics.topPerformingBikes")}</CardTitle>
          </CardHeader>
          <CardContent>
            {bikePerformance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bike className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("analytics.noBookingData")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bikePerformance.map((bike, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Bike className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{bike.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {bike.bookings} {t("analytics.bookings")} • {bike.revenue.toLocaleString()} DH {t("analytics.revenueLabel")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Performance */}
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.performanceByLocation")}</CardTitle>
          </CardHeader>
          <CardContent>
            {locationPerformance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("analytics.noLocationData")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locationPerformance.map((location, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-lg mb-2">{location.city}</h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          {t("analytics.bookings")}: <span className="font-semibold text-foreground">{location.bookings}</span>
                        </p>
                        <p className="text-muted-foreground">
                          {t("analytics.revenue")}: <span className="font-semibold text-primary">{location.revenue.toLocaleString()} DH</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Analytics;
