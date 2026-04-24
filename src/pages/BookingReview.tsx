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
  selectedPayment?: "cash" | "card";
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
  const dailyPrice = parseInt(searchParams.get("dailyPrice") || String(savedBooking?.dailyPrice) || "99");

  const [promoApplied, setPromoApplied] = useState(false);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check verification and phone status
  useEffect(() => {
    if (isAuthenticated && user) {
      checkProfileStatus();
    } else {
      setIsCheckingProfile(false);
    }
  }, [isAuthenticated, user]);

  const checkProfileStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified, phone')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setIsVerified(data.is_verified || false);
        setHasPhone(!!data.phone && data.phone.trim().length > 0);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setIsCheckingProfile(false);
    }
  };

  // Calculate days and total
  const days = pickup && end 
    ? Math.ceil((new Date(end).getTime() - new Date(pickup).getTime()) / (1000 * 60 * 60 * 24))
    : 1;
  const deliveryFee = deliveryMethod === "delivery" ? 25 : 0;
  const promoDiscount = promoApplied ? 25 : 0;
  const subtotal = days * dailyPrice;
  const total = subtotal + deliveryFee - promoDiscount;


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

    if (!isVerified) {
      toast.error(t('bookingReviewPage.verifyIdError'));
      setIsProcessing(false);
      navigate('/verification');
      return;
    }

    if (!hasPhone) {
      toast.error(t('bookingReviewPage.addPhoneError'));
      setIsProcessing(false);
      navigate('/verification');
      return;
    }

    // Always card payment for the 10 MAD platform fee.
    setIsProcessing(false);
    navigate(`/checkout?${searchParams.toString()}&total=${total}`);
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
          {/* Skeleton Loading State */}
          {isAuthenticated && isCheckingProfile && (
            <Card className="border-muted">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          )}

          {/* Verification / Phone Warning */}
          {isAuthenticated && !isCheckingProfile && (!isVerified || !hasPhone) && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">{t('bookingReviewPage.actionRequired')}</span>
                </div>
                {!isVerified && (
                  <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <Shield className="h-4 w-4" />
                    <span>{t('bookingReviewPage.needVerifyId')}</span>
                  </div>
                )}
                {!hasPhone && (
                  <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <Phone className="h-4 w-4" />
                    <span>{t('bookingReviewPage.needAddPhone')}</span>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/verification')}
                  className="w-full"
                >
                  {t('bookingReviewPage.goToVerification')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Auto-applied promo message */}
          {promoSuccessMsg && (
            <Card className="border-green-600 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium">{promoSuccessMsg}</span>
                </div>
              </CardContent>
            </Card>
          )}

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
                {promoApplied && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>{t('bookingReviewPage.promoDiscount')}</span>
                    <span>-{promoDiscount} DH</span>
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
            disabled={isCheckingProfile || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('booking.processing')}
              </>
            ) : isCheckingProfile ? (
              <>
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('common.loading')}
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
