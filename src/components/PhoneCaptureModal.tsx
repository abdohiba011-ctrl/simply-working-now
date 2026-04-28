import { useState } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneInput, isValidMoroccanPhone } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, PartyPopper, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PhoneCaptureModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const PhoneCaptureModal = ({ isOpen, onComplete }: PhoneCaptureModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const validatePhone = (phoneNumber: string): boolean => {
    return isValidMoroccanPhone(phoneNumber);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!phone.trim()) {
      setError(t("phoneCaptureModal.errorEnterPhone"));
      return;
    }

    if (!validatePhone(phone)) {
      setError(t("phoneCaptureModal.errorInvalidPhone"));
      return;
    }

    if (!user) {
      setError(t("phoneCaptureModal.errorLoginFirst"));
      return;
    }

    try {
      setIsLoading(true);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone: phone.trim() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setShowSuccess(true);
      toast.success(t("phoneCaptureModal.phoneSaved"));
      
      // Check for pending booking
      const pendingBooking = localStorage.getItem('pendingBooking');
      
      // Show success for 2 seconds then complete
      setTimeout(() => {
        if (pendingBooking) {
          // Redirect to booking history if there's a pending booking
          navigate('/booking-history');
        }
        onComplete();
      }, 2000);
      
    } catch (err: unknown) {
      console.error('Error saving phone:', err);
      setError(getErrMsg(err) || t("phoneCaptureModal.errorSaveFailed"));
      toast.error(t("phoneCaptureModal.errorSaveFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onComplete}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PartyPopper className="h-16 w-16 text-primary mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("phoneCaptureModal.successTitle")}</h2>
            <p className="text-muted-foreground">{t("phoneCaptureModal.successMessage")}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onComplete}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">{t("phoneCaptureModal.title")}</DialogTitle>
          <DialogDescription className="text-center">
            {t("phoneCaptureModal.description")}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="phone">{t("phoneCaptureModal.phoneLabel")}</Label>
            <PhoneInput
              id="phone"
              value={phone}
              onChange={(value) => {
                setPhone(value);
                setError("");
              }}
            />
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {t("phoneCaptureModal.confirmationNote")}
            </p>
          </div>
          
          <Button 
            type="submit" 
            variant="hero" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("phoneCaptureModal.saving")}
              </>
            ) : (
              t("phoneCaptureModal.continue")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
