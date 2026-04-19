import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

export const PrivacyPolicyPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const hasAccepted = localStorage.getItem("motonitaPrivacyAccepted");
    if (!hasAccepted) {
      // Show popup after 1 second
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("motonitaPrivacyAccepted", "true");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 z-50 flex justify-center animate-slide-up">
      <Card className="max-w-md w-full p-6 shadow-2xl border-2 border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{t('privacy.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('privacy.message')}
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close privacy policy popup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleAccept}
            className="flex-1"
          >
            {t('privacy.accept')}
          </Button>
          <Button
            onClick={handleDecline}
            variant="outline"
            className="flex-1"
          >
            {t('privacy.decline')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
