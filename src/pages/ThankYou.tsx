import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Mail, Copy } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { toast } from "sonner";
import { playSuccessSound } from "@/lib/soundEffects";
import { useLanguage } from "@/contexts/LanguageContext";

const ThankYou = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "contact";
  const { t } = useLanguage();

  // Play success sound on page load
  useEffect(() => {
    // Small delay to ensure page is rendered
    const soundTimer = setTimeout(() => {
      playSuccessSound();
    }, 300);

    return () => clearTimeout(soundTimer);
  }, []);

  useEffect(() => {
    // Auto-redirect after 15 seconds for verification, 10 seconds for business, 8 seconds for others
    let delay = 8000;
    let redirectPath = "/";

    if (type === "verification") {
      delay = 15000;
      redirectPath = "/booking-history";
    } else if (type === "business") {
      delay = 10000;
      redirectPath = "/";
    } else if (type === "booking") {
      delay = 20000;
      redirectPath = "/booking-history";
    }

    const timer = setTimeout(() => {
      navigate(redirectPath);
    }, delay);

    return () => clearTimeout(timer);
  }, [navigate, type]);

  const getMessage = () => {
    if (type === "verification") {
      return {
        title: t("thankYouPage.verification.title"),
        description: t("thankYouPage.verification.description"),
        details: null,
        verificationInfo: true,
        businessInfo: false
      };
    }
    if (type === "business") {
      return {
        title: t("thankYouPage.business.title"),
        description: t("thankYouPage.business.description"),
        details: t("thankYouPage.business.details"),
        verificationInfo: false,
        businessInfo: true
      };
    }
    if (type === "affiliate") {
      return {
        title: t("thankYouPage.affiliate.title"),
        description: t("thankYouPage.affiliate.description"),
        details: t("thankYouPage.affiliate.details"),
        verificationInfo: false,
        businessInfo: false
      };
    }
    return {
      title: t("thankYouPage.contact.title"),
      description: t("thankYouPage.contact.description"),
      details: t("thankYouPage.contact.details"),
      verificationInfo: false,
      businessInfo: false
    };
  };

  const message = getMessage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="flex justify-center">
            <CheckCircle2 className="w-24 h-24 text-green-500 animate-scale-in" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              {message.title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {message.description}
            </p>
            {message.details && (
              <p className="text-base text-muted-foreground">
                {message.details}
              </p>
            )}
          </div>

          {/* Verification-specific information */}
          {message.verificationInfo && (
            <div className="bg-muted/50 rounded-xl p-6 space-y-4 text-left max-w-lg mx-auto">
              <h3 className="font-semibold text-foreground text-lg">{t("thankYouPage.whatHappensNext")}</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gray-700">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t("thankYouPage.step1Title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("thankYouPage.step1Desc")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gray-700">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t("thankYouPage.step2Title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("thankYouPage.step2Desc")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gray-700">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t("thankYouPage.step3Title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("thankYouPage.step3Desc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{t("thankYouPage.verificationTime")}</span>
              </div>

              <div className="border-t border-border pt-4 mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("thankYouPage.contactSupport")}
                </p>
                <div className="flex flex-col gap-2">
                  <a 
                    href="https://wa.me/212710564476" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
                  >
                    <WhatsAppIcon className="h-5 w-5 text-green-600" />
                    {t("thankYouPage.whatsappContact")}
                  </a>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("support@motonita.ma");
                      toast.success(t("thankYouPage.emailCopied"));
                    }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline text-left"
                  >
                    <Mail className="h-5 w-5 text-blue-600" />
                    {t("thankYouPage.copyEmail")}
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            {type === "verification" ? (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("/booking-history")}
                  className="min-w-[200px]"
                >
                  {t("thankYouPage.goToBookings")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="min-w-[200px]"
                >
                  {t("thankYouPage.backToHome")}
                </Button>
              </>
            ) : type === "business" ? (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("/")}
                  className="min-w-[200px]"
                >
                  {t("thankYouPage.backToHome")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  className="min-w-[200px]"
                >
                  {t("thankYouPage.viewProfile")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("/")}
                  className="min-w-[200px]"
                >
                  {t("thankYouPage.backToHome")}
                </Button>
                {type === "affiliate" ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/affiliate")}
                    className="min-w-[200px]"
                  >
                    {t("thankYouPage.backToAffiliate")}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/contact")}
                    className="min-w-[200px]"
                  >
                    {t("thankYouPage.contactAgain")}
                  </Button>
                )}
              </>
            )}
          </div>

          <p className="text-sm text-muted-foreground pt-4">
            {type === "verification" 
              ? t("thankYouPage.redirectingBookings")
              : t("thankYouPage.redirectingHome")
            }
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ThankYou;
