import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Home, Store, CreditCard, Wallet, Bike, CheckCircle2, Edit2, Shield, Phone, AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safeStorage";
import { useLanguage } from "@/contexts/LanguageContext";

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
}

const BookingReview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t, isRTL } = useLanguage();
  
  // Try to restore from localStorage if URL params are empty
  const savedBooking = safeGetItem<PendingBooking | null>('pendingBooking', null);
  
  const bikeId = searchParams.get("bikeId") || savedBooking?.bikeId || "";
  const bikeName = searchParams.get("bikeName") || savedBooking?.bikeName || "Motorbike";
  const pickup = searchParams.get("pickup") || savedBooking?.pickup || "";
  const end = searchParams.get("end") || savedBooking?.end || "";
  const pickupTime = searchParams.get("pickupTime") || savedBooking?.pickupTime || "09:00";
  const dropoffTime = searchParams.get("dropoffTime") || savedBooking?.dropoffTime || "18:00";
  const deliveryMethod = searchParams.get("deliveryMethod") || savedBooking?.deliveryMethod || "pickup";
  const location = searchParams.get("location") || savedBooking?.location || "Casablanca";
  // Robust daily-price parsing — never NaN, never 0 from a missing field.
  const parseDailyPrice = (): number => {
    const raw = searchParams.get("dailyPrice");
    const fromUrl = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(fromUrl) && fromUrl > 0) return Math.round(fromUrl);
    const fromSaved = Number(savedBooking?.dailyPrice);
    if (Number.isFinite(fromSaved) && fromSaved > 0) return Math.round(fromSaved);
    return 99;
  };
  const dailyPrice = parseDailyPrice();

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Calculate days and total
  const days = pickup && end 
    ? Math.ceil((new Date(end).getTime() - new Date(pickup).getTime()) / (1000 * 60 * 60 * 24))
    : 1;
  const deliveryFee = deliveryMethod === "delivery" ? 25 : 0;
  const subtotal = days * dailyPrice;
  const total = subtotal + deliveryFee;


  const [isProcessing, setIsProcessing] = useState(false);

  const handleContinue = async () => {
    setIsProcessing(true);

    if (!isAuthenticated) {
      const pendingBooking: PendingBooking = {
        bikeId: bikeId || "",
        bikeName,
        pickup: pickup || "",
        end: end || "",
        pickupTime,
        dropoffTime,
        deliveryMethod,
        location,
        dailyPrice,
      };
      safeSetItem('pendingBooking', pendingBooking);

      const returnUrl = `/booking-review?${searchParams.toString()}`;
      navigate(`/auth?mode=login&returnUrl=${encodeURIComponent(returnUrl)}`);
      setIsProcessing(false);
      return;
    }

    // Authenticated path: always (re)create a fresh hold so users who
    // navigate back to this page after the original hold expired can
    // still continue without seeing "reservation expired" on checkout.
    if (!bikeId || !pickup || !end) {
      toast.error("Missing booking details. Please re-pick your bike and dates.");
      setIsProcessing(false);
      return;
    }

    try {
      const { data: holdRows, error: holdErr } = await supabase.rpc('create_bike_hold', {
        _bike_id: bikeId,
        _pickup: pickup,
        _return: end,
      });

      if (holdErr) {
        const msg = (holdErr.message || "").toUpperCase();
        if (msg.includes("BIKE_ALREADY_BOOKED")) {
          toast.error("This bike is no longer available for those dates.");
        } else if (msg.includes("BIKE_HELD_BY_OTHER")) {
          toast.error("Someone else is currently checking out this bike. Try again in a few minutes.");
        } else if (msg.includes("INVALID_DATES")) {
          toast.error("Please pick valid pickup and return dates.");
        } else if (msg.includes("AUTH_REQUIRED")) {
          toast.error("Please sign in again to continue.");
          navigate('/auth?mode=login');
        } else {
          toast.error(holdErr.message || "Could not reserve this bike. Please try again.");
        }
        setIsProcessing(false);
        return;
      }

      const newHoldId = Array.isArray(holdRows) && holdRows[0]?.hold_id
        ? holdRows[0].hold_id
        : null;

      if (!newHoldId) {
        toast.error("Could not reserve this bike. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Always card payment for the 10 MAD platform fee.
      const params = new URLSearchParams(searchParams.toString());
      params.set('holdId', newHoldId);
      params.set('total', String(total));
      setIsProcessing(false);
      navigate(`/checkout?${params.toString()}`);
    } catch (err) {
      console.error('[BookingReview] hold creation failed:', err);
      toast.error("Could not reserve this bike. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => {
              const bikeDetailsUrl = `/bike/${bikeId}?pickup=${pickup}&end=${end}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&deliveryMethod=${deliveryMethod}&location=${encodeURIComponent(location)}`;
              navigate(bikeDetailsUrl);
            }} 
            size="icon" 
            className="flex-shrink-0"
            title={t('bookingReviewPage.editDetails')}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('booking.reviewBooking')}</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">

          {/* Bike Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bike className="h-6 w-6 text-gray-900 dark:text-gray-100" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{bikeName}</h2>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {dailyPrice} DH {t('hero.perDay')}
              </div>
            </CardContent>
          </Card>

          {/* Rental Period */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                {t('booking.rentalPeriod')}
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('bookingReviewPage.pickupDateTime')}</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    {pickup && format(new Date(pickup), "MMM dd, yyyy")}
                  </div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    {pickupTime}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('bookingReviewPage.dropoffDateTime')}</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    {end && format(new Date(end), "MMM dd, yyyy")}
                  </div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    {dropoffTime}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">{t('bookingReviewPage.totalDuration')}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{days} {days === 1 ? t('bookingHistoryPage.day') : t('booking.days')}</div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Method */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                {t('bikeDetails.deliveryMethod')}
              </h3>
              
              <div className="space-y-2">
                {deliveryMethod === "pickup" ? (
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <Store className="h-5 w-5 mt-0.5 text-gray-700 dark:text-gray-300" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{t('bookingReviewPage.pickupFromShop')}</div>
                      <div className="text-sm text-muted-foreground">{location}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <Home className="h-5 w-5 mt-0.5 text-gray-700 dark:text-gray-300" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{t('bikeDetails.homeDelivery')}</div>
                      <div className="text-sm text-muted-foreground">{location} - 25 DH {t('booking.deliveryFee').toLowerCase()}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Platform Fee Notice */}
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Motonita booking fee</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                You'll pay a flat <strong className="text-foreground">10 MAD</strong> platform fee now by card.
                This confirms your booking and unlocks chat with the agency.
              </p>
              <p className="text-sm text-muted-foreground">
                The rental price and any deposit are paid <strong className="text-foreground">directly to the agency at pickup</strong> — not to Motonita.
              </p>
              <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  The 10 MAD fee is non-refundable once paid. Please review everything below before continuing.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Price Summary */}
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-foreground">{t('bookingReviewPage.priceSummary')}</h3>

              <div className="space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>{dailyPrice} DH × {days} {days === 1 ? t('bookingHistoryPage.day') : t('booking.days')}</span>
                  <span>{subtotal} DH</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('booking.deliveryFee')}</span>
                    <span>{deliveryFee} DH</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Rental total (paid to agency at pickup)</span>
                  <span>{total} DH</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-foreground">Pay now (Motonita fee)</span>
                  <span className="text-primary">10 DH</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <Button
            size="lg"
            variant="hero"
            className="w-full"
            onClick={handleContinue}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('booking.processing')}
              </>
            ) : (
              <>Continue to payment — 10 MAD</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingReview;
