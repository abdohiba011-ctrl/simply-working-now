import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, HandCoins, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentSelection = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | null>(null);
  const [showError, setShowError] = useState(false);
  const paymentCardRef = useRef<HTMLDivElement>(null);

  const bikeId = searchParams.get("bikeId");
  const pickup = searchParams.get("pickup");
  const end = searchParams.get("end");
  const pickupTime = searchParams.get("pickupTime");
  const dropoffTime = searchParams.get("dropoffTime");

  const handleContinue = () => {
    if (!paymentMethod) {
      setShowError(true);
      // Scroll to payment card and highlight
      paymentCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error(t("paymentSelection.selectPaymentError"));
      return;
    }
    
    setShowError(false);
    if (paymentMethod === "card") {
      // Navigate to card payment form
      navigate(`/checkout?bikeId=${bikeId}&pickup=${pickup}&end=${end}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&payment=card`);
    } else {
      // Cash on delivery: route through booking-review which performs the actual DB insert
      navigate(`/booking-review?bikeId=${bikeId}&pickup=${pickup}&end=${end}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&payment=cash`);
    }
  };

  // Clear error when payment method selected
  useEffect(() => {
    if (paymentMethod) setShowError(false);
  }, [paymentMethod]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4 rtl-flip" />
          {t("paymentSelection.back")}
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">{t("paymentSelection.title")}</h1>
            <p className="text-muted-foreground">{t("paymentSelection.subtitle")}</p>
          </div>

          <Card 
            ref={paymentCardRef}
            className={`border-2 transition-all duration-300 ${showError ? "border-destructive ring-2 ring-destructive/20 animate-pulse" : ""}`}
          >
            <CardContent className="p-6">
              {showError && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p className="text-sm font-medium text-destructive">{t("paymentSelection.selectPaymentError")}</p>
                </div>
              )}
              <RadioGroup value={paymentMethod || ""} onValueChange={(value) => setPaymentMethod(value as "card" | "cash")}>
                <div className="space-y-4">
                  {/* Cash on Delivery Option */}
                  <div 
                    className={`relative flex items-start space-x-4 border-2 rounded-xl p-5 cursor-pointer transition-all ${
                      paymentMethod === "cash" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50 hover:shadow-sm"
                    }`}
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <RadioGroupItem value="cash" id="cash" className="mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="cash" className="cursor-pointer flex items-center gap-3 mb-2">
                        <HandCoins className="h-6 w-6 text-primary flex-shrink-0" />
                        <span className="text-lg font-semibold text-foreground">{t("paymentSelection.cashOnDelivery")}</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t("paymentSelection.cashDescription")}
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-green-500"></span>
                          {t("paymentSelection.cashBenefit1")}
                        </p>
                        <p className="text-xs font-medium text-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-green-500"></span>
                          {t("paymentSelection.cashBenefit2")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pay by Card Option */}
                  <div 
                    className={`relative flex items-start space-x-4 border-2 rounded-xl p-5 cursor-pointer transition-all ${
                      paymentMethod === "card" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50 hover:shadow-sm"
                    }`}
                    onClick={() => setPaymentMethod("card")}
                  >
                    <RadioGroupItem value="card" id="card" className="mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="card" className="cursor-pointer flex items-center gap-3 mb-2">
                        <CreditCard className="h-6 w-6 text-primary flex-shrink-0" />
                        <span className="text-lg font-semibold text-foreground">{t("paymentSelection.payByCard")}</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t("paymentSelection.cardDescription")}
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-green-500"></span>
                          {t("paymentSelection.cardBenefit1")}
                        </p>
                        <p className="text-xs font-medium text-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-green-500"></span>
                          {t("paymentSelection.cardBenefit2")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              {/* Deposit Information */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm font-medium text-foreground mb-1">{t("paymentSelection.depositNote")}</p>
                <p className="text-xs text-muted-foreground">{t("paymentSelection.depositExplanation")}</p>
              </div>

              <Button
                size="lg"
                variant="hero"
                className="w-full mt-6"
                onClick={handleContinue}
                data-testid="payment-continue-btn"
              >
                {t("paymentSelection.continue")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelection;
