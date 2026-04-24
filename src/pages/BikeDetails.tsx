import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, MapPin, Bike, Shield, Calendar as CalendarIcon, User, ChevronLeft, ChevronRight, Clock, ArrowLeft, Zap, Fuel, ThumbsUp, GraduationCap, Building2, Truck, Edit2, Tag, Loader2, Phone, Mail, LogIn, AlertTriangle } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBike, useBikeTypeImages, useBikeReviews } from "@/hooks/useBikes";
import { formatDistanceToNow } from "date-fns";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePricingTiers, getDailyPriceForDuration } from "@/hooks/usePricingTiers";
import { DateRangePicker } from "@/components/DateRangePicker";

// Mock data removed - using database

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
];

const MAX_RENTAL_DAYS = 30;

const BikeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  
  // Fetch bike and detail images from database
  const { data: bike, isLoading: isLoadingBike } = useBike(id || "");
  const { data: detailImages, isLoading: isLoadingImages } = useBikeTypeImages(bike?.bike_type_id || "");
  const { data: bikeReviews } = useBikeReviews(bike?.bike_type_id || "");
  const { data: pricingTiers } = usePricingTiers();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pickupTime, setPickupTime] = useState<string>("");
  const [dropoffTime, setDropoffTime] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("pickup");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [showPromoField, setShowPromoField] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [saveDeliveryAddress, setSaveDeliveryAddress] = useState(false);
  
  // Verification status
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('not_started');
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);
  
  // Check user verification status
  useEffect(() => {
    const checkVerification = async () => {
      if (!user) {
        setIsCheckingVerification(false);
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_verified, verification_status')
          .eq('id', user.id)
          .single();
        
        if (!error && profile) {
          setIsVerified(profile.is_verified || false);
          setVerificationStatus(profile.verification_status || 'not_started');
        }
      } catch (err) {
        console.error('Error checking verification:', err);
      } finally {
        setIsCheckingVerification(false);
      }
    };
    
    checkVerification();
  }, [user]);

  const pickupParam = searchParams.get("pickup");
  const endParam = searchParams.get("end");
  
  // Pre-fill dates from URL params
  useEffect(() => {
    if (pickupParam && endParam) {
      setDateRange({
        from: new Date(pickupParam),
        to: new Date(endParam)
      });
    }
  }, [pickupParam, endParam]);
  
  // Only show main image
  const allImages = useMemo(() => {
    if (!bike?.bike_type) return [];
    return [getBikeImageUrl(bike.bike_type.main_image_url)];
  }, [bike]);

  const days = dateRange?.from && dateRange?.to 
    ? differenceInDays(dateRange.to, dateRange.from)
    : 0;
  
  // Get tiered daily price based on rental duration
  const dailyPrice = getDailyPriceForDuration(pricingTiers, days);
  const deliveryFee = deliveryMethod === "delivery" ? 25 : 0;
  const promoDiscount = appliedPromo === "Motonita25" && days >= 3 ? 25 : 0;
  const totalPrice = (days * dailyPrice) + deliveryFee - promoDiscount;

  // Check if same day and validate times
  const isSameDay = dateRange?.from && dateRange?.to && 
    format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd");

  // Get valid dropoff times based on pickup time (only for same day)
  const getValidDropoffTimes = () => {
    if (!isSameDay || !pickupTime) return timeSlots;
    const pickupIndex = timeSlots.indexOf(pickupTime);
    if (pickupIndex === -1) return timeSlots;
    return timeSlots.slice(pickupIndex + 1); // Only times after pickup
  };

  const validDropoffTimes = getValidDropoffTimes();

  // Reset dropoff time if it becomes invalid
  useEffect(() => {
    if (isSameDay && dropoffTime && pickupTime) {
      const pickupIndex = timeSlots.indexOf(pickupTime);
      const dropoffIndex = timeSlots.indexOf(dropoffTime);
      if (dropoffIndex <= pickupIndex) {
        setDropoffTime("");
      }
    }
  }, [pickupTime, isSameDay, dropoffTime]);

  // Validate date range (max 30 days)
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const daysDiff = differenceInDays(range.to, range.from);
      if (daysDiff > MAX_RENTAL_DAYS) {
        toast.error(t('datePicker.maxDaysError').replace('{{maxDays}}', String(MAX_RENTAL_DAYS)));
        setDateRange({
          from: range.from,
          to: addDays(range.from, MAX_RENTAL_DAYS)
        });
        return;
      }
      if (daysDiff > 14) {
        toast.warning(t('datePicker.longRentalWarning'));
      }
    }
    setDateRange(range);
    if (range?.from && range?.to) {
      setIsEditingDates(false);
    }
  };

  
  if (isLoadingBike || isLoadingImages) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Loading bike details...</p>
        </div>
      </div>
    );
  }
  
  if (!bike || !bike.bike_type) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Bike not found</p>
          <Button onClick={() => navigate('/listings')} className="mt-4">Back to Listings</Button>
        </div>
      </div>
    );
  }
  
  const bikeType = bike.bike_type;

  const handleBookNow = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please select dates");
      return;
    }
    if (!pickupTime || !dropoffTime) {
      toast.error("Please select pickup and drop-off times");
      return;
    }

    const pickup = format(dateRange.from, "yyyy-MM-dd");
    const end = format(dateRange.to, "yyyy-MM-dd");

    // Always use the actual bikes.id (resolved from useBike), not the URL param
    // since the URL may carry a bike_type_id from listings cards.
    const realBikeId = bike?.id;
    const { data: authData } = await supabase.auth.getUser();
    let holdParams = "";
    if (authData?.user && realBikeId) {
      const { data: holdData, error: holdError } = await supabase.rpc("create_bike_hold", {
        _bike_id: realBikeId,
        _pickup: pickup,
        _return: end,
      });
      if (holdError) {
        const msg = holdError.message || "";
        if (msg.includes("BIKE_ALREADY_BOOKED")) {
          toast.error("Sorry, this bike was just booked for those dates. Please pick different dates.");
        } else if (msg.includes("BIKE_HELD_BY_OTHER")) {
          toast.error("Someone else is checking out this bike right now. Try again in a few minutes.");
        } else if (msg.includes("INVALID_DATES")) {
          toast.error("Invalid dates selected.");
        } else {
          toast.error("Could not reserve this bike. Please try again.");
        }
        return;
      }
      const hold = Array.isArray(holdData) ? holdData[0] : holdData;
      if (hold?.hold_id) {
        holdParams = `&holdId=${hold.hold_id}&holdExpiresAt=${encodeURIComponent(hold.expires_at)}`;
      }
    }

    navigate(`/booking-review?bikeId=${realBikeId}&bikeName=${encodeURIComponent(bikeType.name)}&pickup=${pickup}&end=${end}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&deliveryMethod=${deliveryMethod}&location=${encodeURIComponent(bike.location)}&dailyPrice=${dailyPrice}${holdParams}`);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNextImage();
    } else if (isRightSwipe) {
      handlePrevImage();
    }
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      setAppliedPromo("");
      setPromoError("");
      setPromoSuccess("");
      return;
    }

    // Case insensitive comparison
    if (promoCode.toLowerCase() === "motonita25") {
      if (days >= 3) {
        setAppliedPromo("Motonita25");
        setPromoSuccess("Promo code applied successfully!");
        setPromoError("");
      } else {
        setPromoError("You need to select 3 days or more to make this coupon code work");
        setPromoSuccess("");
        setAppliedPromo("");
      }
    } else {
      setPromoError("Invalid code");
      setPromoSuccess("");
      setAppliedPromo("");
    }
  };

  return (
    <>
      {/* Product Structured Data for SEO */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": `${bikeType.name} Rental - Casablanca`,
            "image": allImages,
            "description": bikeType.description || `Rent ${bikeType.name} motorbike in Casablanca, Morocco. Perfect for exploring the city.`,
            "brand": {
              "@type": "Brand",
              "name": "MotoMorocco"
            },
            "offers": {
              "@type": "Offer",
              "url": `https://motomorocco.com/bike/${id}`,
              "priceCurrency": "MAD",
              "price": bikeType.daily_price,
              "priceValidUntil": "2025-12-31",
              "availability": "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": "MotoMorocco"
              }
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": bikeType.rating,
              "reviewCount": "3",
              "bestRating": "5",
              "worstRating": "1"
            }
          })
        }}
      />
      
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />

        <main className="container mx-auto px-3 sm:px-4 py-4 md:py-8 max-w-7xl overflow-hidden">
        {/* Desktop Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-6 hidden md:flex gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('bikeDetails.backToListings')}
        </Button>

        {/* Mobile Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 md:hidden gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('bikeDetails.backToListings')}
        </Button>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            {/* Image Gallery */}
            <div 
              className="relative h-64 sm:h-80 md:h-96 rounded-xl sm:rounded-2xl overflow-hidden group touch-pan-y"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <img
                src={allImages[currentImageIndex]}
                alt={`Rent ${bikeType.name} motorbike in Casablanca - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 select-none"
                draggable={false}
              />
              
              {/* Navigation Arrows - Only show when multiple images */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Image Indicators - Only show when multiple images */}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {allImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        index === currentImageIndex ? "bg-white w-8" : "bg-white/50"
                      )}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Thumbnail Strip - Only show when multiple images */}
            {allImages.length > 1 && (
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide touch-pan-x -mx-3 sm:mx-0 px-3 sm:px-0">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all",
                      index === currentImageIndex ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img
                      src={image}
                      alt={`${bike.bike_type.name} motorbike rental Casablanca - view ${index + 1}`}
                      className="w-full h-full object-cover select-none"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}
          
            {/* Title Section */}
            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0 w-full">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 break-words">Rent {bikeType.name} - Casablanca Motorbike Rental</h1>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Bike className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-foreground" />
                        <span className="truncate max-w-[120px] sm:max-w-none">{bikeType.name}</span>
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-foreground" />
                        <span className="truncate max-w-[120px] sm:max-w-none">Casablanca - {bike.location}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-400 fill-yellow-400" />
                    <span className="text-base sm:text-lg md:text-xl font-bold text-foreground">{Number(bikeType.rating).toFixed(1)}</span>
                    <span className="text-muted-foreground text-xs sm:text-sm">(0)</span>
                  </div>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full mt-2"
                  onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {t('hero.bookNow')}
                </Button>
              </CardContent>
            </Card>

            {/* Booking Section - Desktop & Mobile */}
            <Card id="booking-form" className="border-2 border-primary/20 bg-card shadow-lg relative overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                    {days > 0 ? `Price for ${days} day${days > 1 ? 's' : ''} rental` : 'Starting from'}
                  </span>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                    {days > 0 ? dailyPrice : getDailyPriceForDuration(pricingTiers, 30)} DH<span className="text-base font-normal text-muted-foreground">/day</span>
                  </p>
                  {days >= 3 && (
                    <p className="text-xs text-primary font-medium mt-1">
                      Longer rental = Better rate!
                    </p>
                  )}
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  {/* Date display with edit functionality */}
                  {dateRange?.from && dateRange?.to && !isEditingDates ? (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CalendarIcon className="h-4 w-4 text-foreground" />
                        {t('bikeDetails.rentalPeriod')}
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-h-[48px] px-4 py-3 rounded-lg border-2 border-border bg-muted/30 flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-foreground flex-shrink-0" />
                          <span className="font-medium text-foreground">
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, y")}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setIsEditingDates(true)}
                          className="h-[48px] w-[48px] flex-shrink-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CalendarIcon className="h-4 w-4 text-foreground" />
                        {t('bikeDetails.selectRentalPeriod')}
                      </Label>
                      <DateRangePicker
                        dateRange={dateRange}
                        onDateChange={(range) => {
                          handleDateRangeSelect(range);
                          if (range?.from && range?.to) {
                            setIsEditingDates(false);
                          }
                        }}
                        maxDays={MAX_RENTAL_DAYS}
                        showPriceBreakdown={false}
                        placeholder={t('datePicker.pickDates')}
                        triggerClassName="min-h-[48px]"
                      />
                    </div>
                  )}

                  {/* Always show time pickers if dates are available - in one row */}
                  {dateRange?.from && dateRange?.to && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Clock className="h-4 w-4 text-foreground" />
                            {t('bikeDetails.pickupTime')}
                          </Label>
                          <Select value={pickupTime} onValueChange={setPickupTime}>
                            <SelectTrigger className="w-full min-h-[48px] border-2 bg-background">
                              <SelectValue placeholder={t('bikeDetails.selectTime')} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border shadow-lg max-h-[200px]">
                              {timeSlots.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Clock className="h-4 w-4 text-foreground" />
                            {t('bikeDetails.dropoffTime')}
                          </Label>
                          <Select 
                            value={dropoffTime} 
                            onValueChange={setDropoffTime}
                            disabled={isSameDay && !pickupTime}
                          >
                            <SelectTrigger className={cn(
                              "w-full min-h-[48px] border-2 bg-background",
                              isSameDay && !pickupTime && "opacity-50"
                            )}>
                              <SelectValue placeholder={t('bikeDetails.selectTime')} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border shadow-lg max-h-[200px]">
                              {validDropoffTimes.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Same day warning */}
                      {isSameDay && (
                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-md text-amber-600 dark:text-amber-400 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{t('timeValidation.dropoffAfterPickup')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {days > 0 && (
                    <div className="border-t pt-3 sm:pt-4 space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{Number(bikeType.daily_price).toFixed(0)} DH × {days} days</span>
                          <span>{(days * Number(bikeType.daily_price)).toFixed(0)} DH</span>
                        </div>
                        {deliveryFee > 0 && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Delivery fee</span>
                            <span>+{deliveryFee} DH</span>
                          </div>
                        )}
                        {promoDiscount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Promo (Motonita25)</span>
                            <span>-{promoDiscount} DH</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                        <span className="text-foreground">Total</span>
                        <span className="text-foreground font-bold">{totalPrice.toFixed(0)} DH</span>
                      </div>
                    </div>
                  )}

                  <Button
                    size="lg"
                    variant="hero"
                    className="w-full min-h-[48px] touch-manipulation active:scale-95 transition-transform"
                    onClick={handleBookNow}
                    disabled={!dateRange?.from || !dateRange?.to || !pickupTime || !dropoffTime}
                  >
                    {t('hero.bookNow')}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    You won't be charged yet
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Details */}
            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="border-b pb-3 sm:pb-4 mb-3 sm:mb-4">
                  <h2 className="font-semibold text-base sm:text-lg mb-2 text-foreground">Description</h2>
                  <p className="text-sm sm:text-base text-muted-foreground break-words">{bikeType.description || "High-quality motorbike perfect for exploring Morocco."}</p>
                </div>

                <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
                  <h2 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3 text-foreground">Features</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 text-sm sm:text-base text-foreground bg-secondary/30 p-3 rounded-lg">
                      <Zap className="h-5 w-5 text-foreground flex-shrink-0" />
                      <span className="font-medium">Automatic Transmission</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm sm:text-base text-foreground bg-secondary/30 p-3 rounded-lg">
                      <Fuel className="h-5 w-5 text-foreground flex-shrink-0" />
                      <span className="font-medium">Fuel Efficient</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm sm:text-base text-foreground bg-secondary/30 p-3 rounded-lg">
                      <ThumbsUp className="h-5 w-5 text-foreground flex-shrink-0" />
                      <span className="font-medium">Easy to Ride</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm sm:text-base text-foreground bg-secondary/30 p-3 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-foreground flex-shrink-0" />
                      <span className="font-medium">Perfect for Beginners</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block lg:col-span-1 min-w-0">
            <div className="lg:sticky lg:top-24">
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Bike className="h-5 w-5 text-primary" />
                      <span className="text-muted-foreground">{bikeType.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="text-muted-foreground">{bike.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Star className="h-5 w-5 text-primary fill-primary" />
                      <span className="text-muted-foreground">{Number(bikeType.rating).toFixed(1)} rating</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        </main>

        {/* Sticky mobile booking bar */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border shadow-lg p-3 flex items-center justify-between gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-lg font-bold text-foreground leading-tight">
              {getDailyPriceForDuration(pricingTiers, 30)} DH<span className="text-xs font-normal text-muted-foreground">/day</span>
            </p>
          </div>
          <Button
            variant="hero"
            size="lg"
            className="flex-1 max-w-[220px]"
            onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {t('hero.bookNow')}
          </Button>
        </div>
      </div>
    </>
  );
};

export default BikeDetails;
