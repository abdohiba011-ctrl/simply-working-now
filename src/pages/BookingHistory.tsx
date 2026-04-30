import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BookingCardSkeleton } from "@/components/ui/bike-skeleton";
import { ChevronLeft, Calendar, MapPin, Bike, Clock, Package, Truck, CheckCircle, Shield, Phone, AlertTriangle, ArrowRight, Mail, RotateCcw, Timer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { safeGetItem, safeRemoveItem } from "@/lib/safeStorage";

// Countdown Timer Component
const CountdownTimer = ({ pickupDate }: { pickupDate: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, isExpired: false });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const target = new Date(pickupDate);
      
      if (target <= now) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, isExpired: true });
        return;
      }
      
      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;
      
      setTimeLeft({ days, hours, minutes, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [pickupDate]);

  if (timeLeft.isExpired) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 p-2 rounded border border-yellow-500/30">
      <Timer className="h-4 w-4 animate-pulse" />
      <span className="font-medium">
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m until pickup
      </span>
    </div>
  );
};

interface PendingBooking {
  bikeId: string;
  bikeName: string;
  pickup: string;
  end: string;
  pickupTime: string;
  dropoffTime: string;
  deliveryMethod: string;
  location: string;
  dailyPrice: number;
  selectedPayment?: "cash" | "card";
}

interface Booking {
  id: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  status: string;
  bike_id: string;
  customer_name: string;
  customer_phone: string;
  bikes: {
    location: string;
    bike_type: {
      name: string;
      main_image_url: string;
      daily_price: number;
    };
  };
}

const BookingHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('not_started');
  const [profileChecked, setProfileChecked] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);

  // Check for pending booking in localStorage
  useEffect(() => {
    const saved = safeGetItem<PendingBooking | null>('pendingBooking', null);
    setPendingBooking(saved);
  }, []);

  useEffect(() => {
    if (user) {
      checkProfileAndFetchBookings();
    }
  }, [user]);

  // Real-time subscription for booking updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('booking-history-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Refetch to get the full booking with bike info
            checkProfileAndFetchBookings();
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev => prev.map(b => 
              b.id === payload.new.id ? { ...b, ...payload.new } as Booking : b
            ));
          } else if (payload.eventType === 'DELETE') {
            setBookings(prev => prev.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkProfileAndFetchBookings = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setLoadError(false);
      setLoadingTimeout(false);
      
      // Set timeout for slow loading
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
      
      // First check profile status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_verified, phone, verification_status')
        .eq('user_id', user.id)
        .single();

      if (!profileError && profile) {
        setIsVerified(profile.is_verified || false);
        setHasPhone(!!profile.phone && profile.phone.trim().length > 0);
        setVerificationStatus(profile.verification_status || 'not_started');
      }
      setProfileChecked(true);

      // Now fetch bookings
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          pickup_date,
          return_date,
          total_price,
          status,
          bike_id,
          customer_name,
          customer_phone,
          bikes!inner (
            id,
            location,
            bike_type:bike_types!inner (
              id,
              name,
              main_image_url,
              daily_price
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      clearTimeout(timeoutId);

      if (error) throw error;
      
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoadError(true);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };


  const getDeliveryStatus = (status: string) => {
    // Mock delivery tracking info - in production this would come from database
    const statuses = {
      pending: { icon: Package, text: "Preparing for delivery", eta: "Delivery tomorrow" },
      confirmed: { icon: CheckCircle, text: "Confirmed - Ready for pickup", eta: "Pick up at scheduled time" },
      in_transit: { icon: Truck, text: "On the way to you", eta: "Arrives in 20-30 minutes" },
      upcoming: { icon: Calendar, text: "Scheduled for delivery", eta: "Will be delivered on pickup date" },
    };
    
    return statuses[status.toLowerCase()] || statuses.pending;
  };

  const isPastBooking = (returnDate: string) => {
    return new Date(returnDate) < new Date();
  };

  const upcomingBookings = bookings.filter(b => !isPastBooking(b.return_date));
  const pastBookings = bookings.filter(b => isPastBooking(b.return_date));

  const BookingCard = ({ booking, isPast }: { booking: Booking; isPast: boolean }) => {
    const deliveryInfo = getDeliveryStatus(booking.status);
    const DeliveryIcon = deliveryInfo.icon;
    const days = Math.ceil((new Date(booking.return_date).getTime() - new Date(booking.pickup_date).getTime()) / (1000 * 60 * 60 * 24));

    return (
      <Card 
        className={`${isPast ? 'opacity-80 hover:opacity-100' : 'hover:shadow-lg'} transition-all cursor-pointer border-2 hover:border-foreground/20 group`}
        onClick={() => navigate(`/booking/${booking.id}`)}
      >
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <img
                src={getBikeImageUrl(booking.bikes.bike_type.main_image_url)}
                alt={booking.bikes.bike_type.name}
                className="w-full sm:w-32 h-32 object-cover rounded-lg"
              />
              <StatusBadge status={booking.status} className="absolute top-2 right-2" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-foreground transition-colors">
                  {booking.bikes.bike_type.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Booking ID: {booking.id.slice(0, 8)}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-foreground" />
                  <span>Casablanca - {booking.bikes.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-foreground" />
                  <span>
                    {format(new Date(booking.pickup_date), "MMM dd, yyyy")} - {format(new Date(booking.return_date), "MMM dd, yyyy")}
                  </span>
                  <span className="text-xs">({days} {days === 1 ? 'day' : 'days'})</span>
                </div>
                
                {/* Status-based display */}
                {!isPast && booking.status?.toLowerCase() === 'pending' && (
                  <CountdownTimer pickupDate={booking.pickup_date} />
                )}
                
                {!isPast && booking.status?.toLowerCase() !== 'pending' && (
                  <div className="flex items-center gap-2 text-sm bg-muted/50 text-foreground p-2 rounded border border-border">
                    <DeliveryIcon className="h-4 w-4 text-foreground" />
                    <div>
                      <span className="font-medium">{deliveryInfo.text}</span>
                      <span className="text-xs ml-2 text-muted-foreground">• {deliveryInfo.eta}</span>
                    </div>
                  </div>
                )}
                
                {/* Show Book Again if pickup date has passed */}
                {isPast && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/');
                    }}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Book Again
                  </Button>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <span className="text-lg font-bold text-foreground">
                    {booking.total_price} DH
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({booking.bikes.bike_type.daily_price} DH/day)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/booking/${booking.id}`);
                  }}
                  className="gap-2"
                >
                  View Details
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">My Bookings</h1>
          </div>

          {isLoading ? (
            <div className="space-y-4" data-testid="bookings-loading">
              {[1, 2, 3].map((i) => (
                <BookingCardSkeleton key={i} />
              ))}
              {loadingTimeout && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="mb-2">Still loading... This is taking longer than expected.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkProfileAndFetchBookings}
                    data-testid="retry-loading-btn"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
          ) : loadError ? (
            <div className="text-center py-8" data-testid="bookings-error">
              <p className="text-muted-foreground mb-4">Failed to load bookings. Please try again.</p>
              <Button 
                variant="outline" 
                onClick={checkProfileAndFetchBookings}
                data-testid="retry-error-btn"
              >
                Retry
              </Button>
            </div>
          ) : profileChecked && verificationStatus === 'pending_review' ? (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative h-12 w-12">
                    <div className="h-12 w-12 rounded-full border-4 border-yellow-500/30 border-t-yellow-500 animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Verification Pending</h2>
                  <p className="text-muted-foreground max-w-md">
                    Your documents are being reviewed. We'll notify you within 24-48 hours.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://wa.me/212710564476', '_blank')}
                      className="gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.href = 'mailto:contact@motonita.ma'}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={() => navigate('/')}>
                    Return to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : profileChecked && (!isVerified || !hasPhone) ? (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-yellow-600" />
                  <h2 className="text-xl font-bold text-foreground">Complete Your Profile First</h2>
                  <p className="text-muted-foreground max-w-md">
                    You need to complete your profile before you can view or make bookings.
                  </p>
                  <div className="space-y-2 text-left w-full max-w-xs">
                    {!isVerified && (
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                        <Shield className="h-4 w-4" />
                        <span>Verify your ID</span>
                      </div>
                    )}
                    {!hasPhone && (
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                        <Phone className="h-4 w-4" />
                        <span>Add your phone number</span>
                      </div>
                    )}
                  </div>
                  <Button variant="hero" onClick={() => navigate('/verification')}>
                    Go to Verification
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pending Booking Card */}
              {pendingBooking && (
                <Card className="border-2 border-foreground/50 bg-gradient-to-r from-muted/50 to-background mb-6 animate-pulse-slow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="p-3 bg-foreground/10 rounded-full">
                        <Bike className="h-8 w-8 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-foreground">Pending Booking</h3>
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/50">
                            Resume
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {pendingBooking.bikeName} • {pendingBooking.location}
                        </p>
                        {pendingBooking.pickup && pendingBooking.end && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(pendingBooking.pickup), "MMM dd")} - {format(new Date(pendingBooking.end), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            safeRemoveItem('pendingBooking');
                            setPendingBooking(null);
                          }}
                        >
                          Discard
                        </Button>
                        <Button 
                          variant="hero" 
                          size="sm"
                          onClick={() => navigate('/booking-review')}
                          className="gap-2"
                        >
                          Complete Booking
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {bookings.length === 0 ? (
                <EmptyState
                  icon={Bike}
                  title="No Bookings Yet"
                  description="You haven't made any motorbike rentals yet. Browse our selection and book your first ride today!"
                  actionLabel="Browse Motorbikes"
                  onAction={() => navigate('/listings?location=Maarif')}
                />
              ) : (
            <div className="space-y-8">
              {/* Upcoming Bookings - Enhanced */}
              {upcomingBookings.length > 0 && (
                <div className="animate-slide-up">
                  <div className="bg-gradient-to-r from-background via-muted/30 to-background p-6 rounded-lg mb-6 border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                          <Clock className="h-7 w-7 text-foreground" />
                          Upcoming Bookings
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Your next adventures are waiting • {upcomingBookings.length} {upcomingBookings.length === 1 ? 'booking' : 'bookings'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-lg px-4 py-2 bg-foreground text-background">
                        {upcomingBookings.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {upcomingBookings.map((booking, index) => (
                      <div key={booking.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                        <BookingCard booking={booking} isPast={false} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Bookings */}
              {pastBookings.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-muted-foreground" />
                    Past Bookings
                    <Badge variant="outline" className="ml-2">{pastBookings.length}</Badge>
                  </h2>
                  <div className="space-y-4">
                    {pastBookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} isPast={true} />
                    ))}
                  </div>
                </div>
              )}
            </div>
              )}
            </>
          )}

        </div>
      </main>
      
    </div>
  );
};

export default BookingHistory;
