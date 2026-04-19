import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, MapPin, Calendar, Bike, Loader2, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePricingTiers, getDailyPriceForDuration } from "@/hooks/usePricingTiers";

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
  const dailyPriceParam = parseInt(searchParams.get("dailyPrice") || "99");
  const totalParam = searchParams.get("total");
  
  const { data: pricingTiers } = usePricingTiers();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  // Pre-fill form with user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData(prev => ({
            ...prev,
            fullName: data.name || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
          }));
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
  
  // Use tiered pricing - recalculate based on days
  const dailyPrice = getDailyPriceForDuration(pricingTiers, days);
  const subtotal = days * dailyPrice;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = totalParam ? parseInt(totalParam) : subtotal + serviceFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !bikeId || !pickup || !end) {
      toast.error(t('checkoutPage.missingInfo'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert booking into database
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          bike_id: bikeId,
          customer_name: formData.fullName,
          customer_email: formData.email,
          customer_phone: formData.phone,
          pickup_date: pickup,
          return_date: end,
          total_price: total,
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t('success.bookingConfirmed'));
      navigate(`/confirmation?bookingId=${data.id}&bikeName=${encodeURIComponent(bikeName)}&pickup=${pickup}&end=${end}&total=${total}`);
    } catch (error: unknown) {
      console.error("Error creating booking:", error);
      toast.error(t('checkoutPage.bookingFailed'));
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('checkoutPage.title')}</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">{t('checkoutPage.personalInfo')}</h2>
                    {isLoadingProfile && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('checkoutPage.prefillNote')}
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t('profile.fullName')}</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        placeholder={t('profile.fullName')}
                        required
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('profile.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('profile.phone')}</Label>
                        <PhoneInput
                          id="phone"
                          value={formData.phone}
                          onChange={(value) => setFormData({...formData, phone: value})}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <CreditCard className="h-5 w-5" />
                    {t('checkoutPage.paymentInfo')}
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">{t('checkoutPage.cardNumber')}</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">{t('checkoutPage.expiryDate')}</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={formData.expiry}
                          onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={formData.cvv}
                          onChange={(e) => setFormData({...formData, cvv: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" variant="hero" className="w-full" disabled={isSubmitting || isLoadingProfile}>
                {isSubmitting ? t('booking.processing') : isLoadingProfile ? t('common.loading') : t('checkoutPage.completeBooking')}
              </Button>
            </form>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">{t('checkoutPage.bookingSummary')}</h2>

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
                      <Calendar className={`h-4 w-4 mt-0.5 flex-shrink-0`} />
                      <div>
                        <p className="font-medium text-foreground">{t('booking.rentalPeriod')}</p>
                        {pickup && end && (
                          <p>{format(new Date(pickup), "MMM dd")} - {format(new Date(end), "MMM dd, yyyy")}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className={`h-4 w-4 mt-0.5 flex-shrink-0`} />
                      <div>
                        <p className="font-medium text-foreground">{t('booking.pickupLocation')}</p>
                        <p>{location}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{dailyPrice} DH × {days} {t('booking.days')}</span>
                      <span>{subtotal} DH</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t('checkoutPage.serviceFee')}</span>
                      <span>{serviceFee} DH</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold pt-2">
                      <span className="text-foreground">{t('booking.total')}</span>
                      <span className="text-foreground">{total} DH</span>
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
