import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Bike, MapPin, Loader2, Download, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
const AreaChartComponent = AreaChart as any;
const AreaComponent = Area as any;
const XAxisComponent = XAxis as any;
const YAxisComponent = YAxis as any;
const CartesianGridComponent = CartesianGrid as any;
const BarChartComponent = BarChart as any;
const BarComponent = Bar as any;
const PieChartComponent = PieChart as any;
const PieComponent = Pie as any;
const ResponsiveContainerComponent = ResponsiveContainer as any;
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { AdminStatsSkeleton } from "@/components/ui/admin-skeleton";

type TimeRange = "7d" | "30d" | "90d" | "12m" | "custom";

interface BookingData {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  pickup_date: string;
  bike_id: string;
}

interface BikeWithType {
  id: string;
  location: string;
  bike_type: {
    name: string;
  } | null;
}

interface PeriodMetrics {
  bookings: number;
  revenue: number;
  completed: number;
}

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [previousBookings, setPreviousBookings] = useState<BookingData[]>([]);
  const [bikes, setBikes] = useState<BikeWithType[]>([]);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, [timeRange, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    if (timeRange === "custom" && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
      startDate = subDays(now, daysBack);
    }

    return { startDate, endDate };
  };

  const getPreviousDateRange = () => {
    const { startDate, endDate } = getDateRange();
    const periodLength = differenceInDays(endDate, startDate);
    return {
      prevStart: subDays(startDate, periodLength + 1),
      prevEnd: subDays(startDate, 1)
    };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRange();
      const { prevStart, prevEnd } = getPreviousDateRange();

      const [bookingsRes, prevBookingsRes, bikesRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, created_at, total_price, status, pickup_date, bike_id")
          .gte("created_at", format(startDate, "yyyy-MM-dd"))
          .lte("created_at", format(endDate, "yyyy-MM-dd")),
        supabase
          .from("bookings")
          .select("id, created_at, total_price, status, pickup_date, bike_id")
          .gte("created_at", format(prevStart, "yyyy-MM-dd"))
          .lte("created_at", format(prevEnd, "yyyy-MM-dd")),
        supabase
          .from("bikes")
          .select("id, location, bike_type:bike_types(name)")
      ]);

      if (bookingsRes.error) throw new Error(bookingsRes.error.message);
      if (prevBookingsRes.error) throw new Error(prevBookingsRes.error.message);
      if (bikesRes.error) throw new Error(bikesRes.error.message);

      setBookings(bookingsRes.data || []);
      setPreviousBookings(prevBookingsRes.data || []);
      setBikes(bikesRes.data as BikeWithType[] || []);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics for current and previous periods with null safety
  const calculateMetrics = (data: BookingData[] | null | undefined): PeriodMetrics => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { bookings: 0, revenue: 0, completed: 0 };
    }
    return {
      bookings: data.length,
      revenue: data.reduce((sum, b) => sum + (b.total_price || 0), 0),
      completed: data.filter(b => b.status === "completed").length
    };
  };

  const currentMetrics = calculateMetrics(bookings);
  const previousMetrics = calculateMetrics(previousBookings);

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const bookingsGrowth = calculateGrowth(currentMetrics.bookings, previousMetrics.bookings);
  const revenueGrowth = calculateGrowth(currentMetrics.revenue, previousMetrics.revenue);
  const completedGrowth = calculateGrowth(currentMetrics.completed, previousMetrics.completed);
  const conversionRate = currentMetrics.bookings > 0 
    ? ((currentMetrics.completed / currentMetrics.bookings) * 100) 
    : 0;
  const prevConversionRate = previousMetrics.bookings > 0 
    ? ((previousMetrics.completed / previousMetrics.bookings) * 100) 
    : 0;
  const conversionGrowth = calculateGrowth(conversionRate, prevConversionRate);

  // Growth indicator component
  const GrowthIndicator = ({ value }: { value: number }) => {
    if (Math.abs(value) < 0.1) {
      return (
        <span className="flex items-center text-xs text-muted-foreground">
          <Minus className="h-3 w-3 mr-1" />
          No change
        </span>
      );
    }
    const isPositive = value > 0;
    return (
      <span className={cn(
        "flex items-center text-xs font-medium",
        isPositive ? "text-success" : "text-destructive"
      )}>
        {isPositive ? (
          <ArrowUpRight className="h-3 w-3 mr-1" />
        ) : (
          <ArrowDownRight className="h-3 w-3 mr-1" />
        )}
        {Math.abs(value).toFixed(1)}% vs previous
      </span>
    );
  };

  // Booking trends data with null safety
  const getBookingTrends = () => {
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) return [];
    
    const { startDate, endDate } = getDateRange();
    const daysInPeriod = differenceInDays(endDate, startDate);
    
    if (daysInPeriod > 90) {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      
      return months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthBookings = bookings.filter(b => {
          const date = new Date(b.created_at);
          return date >= monthStart && date <= monthEnd;
        });
        
        return {
          date: format(month, "MMM yyyy"),
          bookings: monthBookings.length,
          revenue: monthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)
        };
      });
    }
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayBookings = bookings.filter(b => 
        format(new Date(b.created_at), "yyyy-MM-dd") === dayStr
      );
      
      return {
        date: format(day, daysInPeriod <= 7 ? "EEE" : "MMM d"),
        bookings: dayBookings.length,
        revenue: dayBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)
      };
    });
  };

  // Popular bikes data with null safety
  const getPopularBikes = () => {
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) return [];
    
    const bikeBookings: Record<string, { name: string; count: number; revenue: number }> = {};
    
    bookings.forEach(booking => {
      const bike = bikes.find(b => b.id === booking.bike_id);
      const bikeName = bike?.bike_type?.name || "Unknown";
      
      if (!bikeBookings[booking.bike_id]) {
        bikeBookings[booking.bike_id] = { name: bikeName, count: 0, revenue: 0 };
      }
      bikeBookings[booking.bike_id].count++;
      bikeBookings[booking.bike_id].revenue += booking.total_price || 0;
    });
    
    return Object.values(bikeBookings)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Location data with null safety
  const getLocationData = () => {
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) return [];
    
    const locationBookings: Record<string, { name: string; count: number; revenue: number }> = {};
    
    bookings.forEach(booking => {
      const bike = bikes.find(b => b.id === booking.bike_id);
      const location = bike?.location || "Unknown";
      
      if (!locationBookings[location]) {
        locationBookings[location] = { name: location, count: 0, revenue: 0 };
      }
      locationBookings[location].count++;
      locationBookings[location].revenue += booking.total_price || 0;
    });
    
    return Object.values(locationBookings)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  // Export functions
  const exportToCSV = () => {
    const trends = getBookingTrends();
    const headers = ["Date", "Bookings", "Revenue (DH)"];
    const rows = trends.map(d => [d.date, d.bookings, d.revenue]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    window.print();
  };

  const bookingTrends = getBookingTrends();
  const popularBikes = getPopularBikes();
  const locationData = getLocationData();

  const chartConfig = {
    bookings: { label: "Bookings", color: "hsl(var(--primary))" },
    revenue: { label: "Revenue", color: "hsl(var(--accent))" },
  };

  const pieColors = [
    "hsl(var(--primary))",
    "hsl(96 73% 55%)",
    "hsl(96 73% 45%)",
    "hsl(96 73% 35%)",
    "hsl(220 9% 46%)",
    "hsl(220 13% 65%)"
  ];

  const presetButtons: { label: string; value: TimeRange }[] = [
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "90D", value: "90d" },
    { label: "12M", value: "12m" },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <AdminStatsSkeleton />
          <div className="grid lg:grid-cols-2 gap-6">
            <Card><CardContent className="h-80" /></Card>
            <Card><CardContent className="h-80" /></Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={fetchData} variant="outline">
            Try Again
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const { startDate, endDate } = getDateRange();

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 print:px-0">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
              </p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="print:hidden">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  Export as PDF (Print)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Time Range Controls */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {presetButtons.map((preset) => (
              <Button
                key={preset.value}
                variant={timeRange === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
            
            <div className="flex items-center gap-2 ml-2">
              <Popover open={showStartPicker} onOpenChange={setShowStartPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant={timeRange === "custom" ? "default" : "outline"}
                    size="sm"
                    className="min-w-[120px]"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {customStartDate ? format(customStartDate, "MMM d") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => {
                      setCustomStartDate(date);
                      setTimeRange("custom");
                      setShowStartPicker(false);
                    }}
                    disabled={(date) => date > new Date() || (customEndDate && date > customEndDate)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-muted-foreground">to</span>
              
              <Popover open={showEndPicker} onOpenChange={setShowEndPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant={timeRange === "custom" ? "default" : "outline"}
                    size="sm"
                    className="min-w-[120px]"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {customEndDate ? format(customEndDate, "MMM d") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => {
                      setCustomEndDate(date);
                      setTimeRange("custom");
                      setShowEndPicker(false);
                    }}
                    disabled={(date) => date > new Date() || (customStartDate && date < customStartDate)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Stats Cards with Growth Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.bookings}</div>
              <GrowthIndicator value={bookingsGrowth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.revenue.toLocaleString()} DH</div>
              <GrowthIndicator value={revenueGrowth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.completed}</div>
              <GrowthIndicator value={completedGrowth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Bike className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
              <GrowthIndicator value={conversionGrowth} />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Booking Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Booking Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChartComponent data={bookingTrends}>
                  <CartesianGridComponent strokeDasharray="3 3" className="stroke-border" />
                  <XAxisComponent 
                    dataKey="date" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxisComponent 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <AreaComponent
                    type="monotone"
                    dataKey="bookings"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.3)"
                    strokeWidth={2}
                  />
                </AreaChartComponent>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Revenue Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChartComponent data={bookingTrends}>
                  <CartesianGridComponent strokeDasharray="3 3" className="stroke-border" />
                  <XAxisComponent 
                    dataKey="date" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxisComponent 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <BarComponent
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChartComponent>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Bikes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="h-5 w-5" />
                Top Performing Bikes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {popularBikes.length > 0 ? (
                <div className="space-y-4">
                  {popularBikes.map((bike, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: pieColors[index] || pieColors[0] }}
                        />
                        <div>
                          <p className="font-medium text-foreground">{bike.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {bike.count} bookings • {bike.revenue.toLocaleString()} DH
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No booking data available</p>
              )}
            </CardContent>
          </Card>

          {/* Performance by Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Performance by Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-1/2 h-[200px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <PieChartComponent>
                        <PieComponent
                          data={locationData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                        >
                          {locationData.map((_, index) => (
                            <Cell key={index} fill={pieColors[index] || pieColors[0]} />
                          ))}
                        </PieComponent>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      </PieChartComponent>
                    </ChartContainer>
                  </div>
                  <div className="w-1/2 space-y-2">
                    {locationData.map((loc, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: pieColors[index] || pieColors[0] }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{loc.name}</p>
                          <p className="text-xs text-muted-foreground">{loc.count} bookings</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No location data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
