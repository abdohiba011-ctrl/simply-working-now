import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, MapPin, Mail, FileText, Download, Loader2, Clock, PlayCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeRemoveItem } from "@/lib/safeStorage";
import { BookingChat } from "@/components/BookingChat";

const Confirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, isRTL } = useLanguage();
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  const bookingId = searchParams.get("bookingId");
  const bikeName = searchParams.get("bikeName") || t("confirmationPage.motorbike");
  const pickup = searchParams.get("pickup");
  const end = searchParams.get("end");
  const total = searchParams.get("total");
  const paymentMethod = searchParams.get("payment") || "card";

  useEffect(() => {
    // Clear pending booking from localStorage on confirmation page load
    safeRemoveItem("pendingBooking");

    if (bookingId) {
      generateContract();
    }

    // Check current user's verification status to maybe show a "review pending" banner.
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('verification_status, is_verified')
        .eq('id', auth.user.id)
        .single();
      if (prof) {
        setVerificationStatus(prof.is_verified ? 'verified' : (prof.verification_status || null));
      }
    })();
  }, [bookingId]);

  const generateContract = async () => {
    if (!bookingId) return;

    setIsGeneratingContract(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { bookingId },
      });

      if (error) throw error;

      if (data?.contractHtml) {
        setContractHtml(data.contractHtml);
      }
    } catch (error) {
      console.error("Error generating contract:", error);
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const downloadContract = () => {
    if (!contractHtml) {
      toast.error(t("confirmationPage.contractNotReady"));
      return;
    }

    // Create blob and download
    const blob = new Blob([contractHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contract-${bookingId?.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t("confirmationPage.contractDownloaded"));
  };

  const openContractInNewTab = () => {
    if (!contractHtml) {
      toast.error(t("confirmationPage.contractNotReady"));
      return;
    }

    const blob = new Blob([contractHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <Header />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-border">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-foreground" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground" data-testid="confirmation-title">
                {t("confirmationPage.title")}
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-4">
                {t("confirmationPage.subtitle")}
              </p>

              {bookingId && (
                <p className="text-sm text-muted-foreground mb-8">
                  {t("confirmationPage.bookingId")}: <span className="font-mono font-semibold text-foreground" data-testid="booking-id">{bookingId.slice(0, 8)}</span>
                </p>
              )}

              {/* Booking Summary - First */}
              <div className={`bg-muted/30 rounded-lg p-6 mb-6 space-y-4 ${isRTL ? "text-right" : "text-left"}`}>
                <h2 className="font-semibold text-lg text-foreground">{t("confirmationPage.bookingSummary")}</h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("confirmationPage.motorbike")}</p>
                    <p className="font-semibold text-foreground" data-testid="bike-name">{bikeName}</p>
                  </div>

                  {pickup && end && (
                    <div>
                      <p className="text-muted-foreground">{t("confirmationPage.rentalPeriod")}</p>
                      <p className="font-semibold text-foreground" data-testid="rental-period">
                        {format(new Date(pickup), "MMM dd, yyyy")} - {format(new Date(end), "MMM dd, yyyy")}
                      </p>
                    </div>
                  )}

                  {total && (
                    <div>
                      <p className="text-muted-foreground">{t("confirmationPage.totalPrice")}</p>
                      <p className="font-semibold text-foreground text-lg" data-testid="total-price">{total} DH</p>
                    </div>
                  )}

                  <div>
                    <p className="text-muted-foreground">{t("confirmationPage.paymentMethod")}</p>
                    <p className="font-semibold text-foreground" data-testid="payment-method">
                      {paymentMethod === "cash" ? t("confirmationPage.cashOnDelivery") : t("confirmationPage.cardPayment")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Agency contact callout */}
              <div className={`rounded-lg p-6 mb-6 bg-primary/10 border border-primary/30 ${isRTL ? "text-right" : "text-left"}`}>
                <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-semibold text-foreground mb-1">The agency will contact you in 5–10 minutes</h2>
                    <p className="text-sm text-muted-foreground">
                      Use the chat below to talk with the owner, share photos, and coordinate your pickup.
                      Keep all conversation on Motonita — sharing phone numbers or moving off-platform is not allowed.
                    </p>
                  </div>
                </div>
              </div>

              {/* In-platform chat */}
              {bookingId && (
                <div className="mb-6">
                  <BookingChat bookingId={bookingId} viewerRole="renter" title="Chat with the agency" />
                </div>
              )}

              {/* What's Next */}
              <div className={`bg-muted/30 rounded-lg p-6 mb-6 ${isRTL ? "text-right" : "text-left"}`}>
                <h2 className="font-semibold text-lg mb-4 text-foreground">{t("confirmationPage.whatsNext")}</h2>
                <div className="space-y-4">
                  <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div>
                      <p className={`font-medium text-foreground flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <Mail className="h-4 w-4" />
                        {t("confirmationPage.checkEmail")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("confirmationPage.checkEmailDesc")}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div>
                      <p className={`font-medium text-foreground flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <Calendar className="h-4 w-4" />
                        {t("confirmationPage.pickupInstructions")}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("confirmationPage.pickupDesc")}</p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div>
                      <p className={`font-medium text-foreground flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <MapPin className="h-4 w-4" />
                        {t("confirmationPage.meetingPoint")}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("confirmationPage.meetingPointDesc")}</p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <div>
                      <p className={`font-medium text-foreground flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <FileText className="h-4 w-4" />
                        {t("confirmationPage.signContract")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("confirmationPage.signContractDesc")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* YouTube Video - Third */}
              <div className="bg-muted/30 rounded-lg p-6 mb-6">
                <h2 className={`font-semibold text-lg mb-4 text-foreground flex items-center gap-2 ${isRTL ? "flex-row-reverse text-right" : "text-left"}`}>
                  <PlayCircle className="h-5 w-5" />
                  {t("confirmationPage.watchVideo")}
                </h2>
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/6XOVDQj68lk"
                    title="Motonita.ma Rental Process"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  {t("confirmationPage.videoDesc")}
                </p>
              </div>

              {/* Contract Download Section - Last */}
              <div className="bg-muted/50 border border-border rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <FileText className="h-6 w-6 text-foreground" />
                  <h2 className="font-semibold text-lg text-foreground">{t("confirmationPage.rentalContract")}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("confirmationPage.downloadContractDesc")}
                </p>
                {isGeneratingContract && (
                  <p className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("confirmationPage.generatingContract")}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={openContractInNewTab}
                    disabled={isGeneratingContract || !contractHtml}
                    className="gap-2"
                    data-testid="view-contract-btn"
                  >
                    {isGeneratingContract ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {t("confirmationPage.viewContract")}
                  </Button>
                  <Button
                    onClick={downloadContract}
                    disabled={isGeneratingContract || !contractHtml}
                    className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                    data-testid="download-contract-btn"
                  >
                    {isGeneratingContract ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {t("confirmationPage.downloadContract")}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  size="lg" 
                  variant="hero" 
                  onClick={() => navigate("/booking-history")} 
                  className="w-full"
                  data-testid="view-bookings-btn"
                >
                  {t("confirmationPage.viewMyBookings")}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate("/listings")} 
                  className="w-full"
                  data-testid="browse-more-btn"
                >
                  {t("confirmationPage.browseMoreBikes")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;