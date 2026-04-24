import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, MapPin, Calendar, Bike, Loader2, ChevronLeft, Lock, ShieldCheck, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { openHostedPayment, preOpenPaymentWindow } from "@/lib/openHostedPayment";

const PLATFORM_FEE_MAD = 10;

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();

  const bikeId = searchParams.get("bikeId");
  const bikeName = searchParams.get("bikeName") || "Motorbike";
  const pickup = searchParams.get("pickup");
  const end = searchParams.get("end");
  const location = searchParams.get("location") || "Casablanca";
  const dailyPrice = parseInt(searchParams.get("dailyPrice") || "99");
  const deliveryMethod = searchParams.get("deliveryMethod") || "pickup";
  const holdId = searchParams.get("holdId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<{ name: string; email: string; phone: string; is_verified: boolean } | null>(null);
  // Pending payment state — drives the "open in new tab" fallback UI and polling.
  const [pendingPayment, setPendingPayment] = useState<{
    paymentUrl: string;
    paymentId: string;
    bookingId: string;
    needsVerification: string;
  } | null>(null);
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('name, email, phone, is_verified')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile({
            name: data.name || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            is_verified: !!data.is_verified,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchUserProfile();
  }, [user]);

  const days = pickup && end
    ? Math.ceil((new Date(end).getTime() - new Date(pickup).getTime()) / (1000 * 60 * 60 * 24))
    : 1;
  const rentalSubtotal = days * dailyPrice;

  // Poll for payment completion when we have a pending payment.
  useEffect(() => {
    if (!pendingPayment) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('youcanpay_payments')
        .select('status')
        .eq('id', pendingPayment.paymentId)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.status === 'paid' || data.status === 'completed' || data.status === 'success') {
        clearInterval(interval);
        toast.success("Payment confirmed!");
        navigate(`/thank-you?type=booking&bookingId=${pendingPayment.bookingId}&needsVerification=${pendingPayment.needsVerification}`);
      } else if (data.status === 'failed' || data.status === 'canceled') {
        clearInterval(interval);
        toast.error("Payment was not completed. Please try again.");
        setPendingPayment(null);
        setPaymentWindow(null);
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingPayment, navigate]);

  const handlePay = async () => {
    if (!user || !bikeId || !pickup || !end) {
      toast.error(t('checkoutPage.missingInfo'));
      return;
    }
    if (!holdId) {
      toast.error("Your reservation expired. Please reselect dates.");
      navigate(`/bike/${bikeId}`);
      return;
    }
    if (!profile?.name) {
      toast.error("Please complete your profile name before paying.");
      navigate('/profile');
      return;
    }

    setIsSubmitting(true);
    // Pre-open a blank tab synchronously from the click so popup blockers
    // don't kick in later when we have the payment URL.
    const preOpened = preOpenPaymentWindow();
    try {
      // 1. Promote hold → real (pending) booking
      const { data: bookingId, error: bookingErr } = await supabase.rpc('promote_hold_to_booking', {
        _hold_id: holdId,
        _customer_name: profile.name,
        _customer_email: profile.email,
        _customer_phone: profile.phone || null,
        _delivery_method: deliveryMethod,
        _pickup_location: location || null,
      });

      if (bookingErr) {
        if ((bookingErr.message || "").includes("HOLD_EXPIRED")) {
          toast.error("Your 5-minute reservation expired. Please start over.");
          navigate(`/bike/${bikeId}`);
        } else {
          throw bookingErr;
        }
        setIsSubmitting(false);
        return;
      }

      const needsVerification = profile.is_verified ? '0' : '1';

      // 2. Create YouCanPay token for the 10 MAD platform fee.
      const { data: tokenResp, error: tokenErr } = await supabase.functions.invoke(
        'youcanpay-create-token',
        {
          body: {
            purpose: 'booking_payment',
            amount: PLATFORM_FEE_MAD,
            currency: 'MAD',
            related_booking_id: bookingId,
            customer_email: profile.email,
            customer_name: profile.name,
            success_path: `/thank-you?type=booking&bookingId=${bookingId}&needsVerification=${needsVerification}`,
            error_path: `/checkout?${searchParams.toString()}&yc=error`,
          },
        },
      );

      if (tokenErr || !tokenResp?.payment_url) {
        console.error('Token error:', tokenErr, tokenResp);
        toast.error("Could not start payment. Please try again.");
        if (preOpened && !preOpened.closed) preOpened.close();
        setIsSubmitting(false);
        return;
      }

      // 3. Open YouCanPay hosted page (iframe-safe).
      const result = openHostedPayment(tokenResp.payment_url, preOpened);

      // Always store pending payment so we can show the fallback button + poll.
      setPendingPayment({
        paymentUrl: tokenResp.payment_url,
        paymentId: tokenResp.payment_id,
        bookingId,
        needsVerification,
      });
      if (result.ok && (result.method === "new-tab" || result.method === "pre-opened")) {
        setPaymentWindow(preOpened || null);
        toast.success("Payment opened in a new tab. Complete it there to continue.");
      } else if (!result.ok) {
        toast.error("Popup blocked. Use the button below to open the payment page.");
      }
      setIsSubmitting(false);
    } catch (error: unknown) {
      console.error("Error initiating payment:", error);
      toast.error(t('checkoutPage.bookingFailed'));
      if (preOpened && !preOpened.closed) preOpened.close();
      setIsSubmitting(false);
    }
  };

  const handleOpenPaymentManually = () => {
    if (!pendingPayment) return;
    const win = window.open(pendingPayment.paymentUrl, "_blank", "noopener,noreferrer");
    if (win) {
      setPaymentWindow(win);
      toast.success("Payment opened in a new tab.");
    } else {
      toast.error("Your browser is still blocking popups. Please allow them for this site.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate(-1)} size="icon" className="flex-shrink-0">
            <ChevronLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Pay booking fee</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-primary/30">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Pay with card</h2>
                    <p className="text-sm text-muted-foreground">Secure payment via YouCan Pay</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Amount due now</span>
                    <span className="text-3xl font-bold text-foreground">{PLATFORM_FEE_MAD} MAD</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Flat Motonita booking fee. Card payment only — cash is not accepted for the platform fee.
                  </p>
                </div>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <span>You'll be redirected to YouCan Pay's secure page to enter your card.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <span>The agency is notified instantly and will contact you within 24 hours to confirm pickup.</span>
                  </li>
                </ul>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handlePay}
                  disabled={isSubmitting || isLoadingProfile}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Redirecting to payment…
                    </>
                  ) : (
                    <>Pay {PLATFORM_FEE_MAD} MAD with card</>
                  )}
                </Button>

                {pendingPayment && (
                  <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Loader2 className="h-4 w-4 mt-1 animate-spin text-primary flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-foreground">Waiting for payment…</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          Complete the payment in the YouCan Pay tab. We'll continue automatically when it's done.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleOpenPaymentManually}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open payment in new tab
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  By paying, you agree the 10 MAD fee is non-refundable.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">Booking summary</h2>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Bike className="h-16 w-16 text-foreground" />
                    <div>
                      <h3 className="font-semibold text-foreground">{bikeName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dailyPrice} DH {t('hero.perDay')}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{t('booking.rentalPeriod')}</p>
                        {pickup && end && (
                          <p>{format(new Date(pickup), "MMM dd")} - {format(new Date(end), "MMM dd, yyyy")}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{t('booking.pickupLocation')}</p>
                        <p>{location}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Rental ({days} {days === 1 ? 'day' : 'days'})</span>
                      <span>{rentalSubtotal} DH</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Paid directly to the agency at pickup.
                    </p>
                    <Separator />
                    <div className="flex justify-between text-base font-bold pt-2">
                      <span className="text-foreground">Pay now</span>
                      <span className="text-primary">{PLATFORM_FEE_MAD} DH</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
