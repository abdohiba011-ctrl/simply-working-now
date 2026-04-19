import { useState, useEffect } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, CheckCircle, Phone, CreditCard, Camera, Bike, AlertCircle, Upload } from "lucide-react";
import { ImageCompressingIndicator } from "@/components/ui/bike-skeleton";
import { safeGetItem } from "@/lib/safeStorage";
import { compressImage, validateImageFile } from "@/lib/imageCompression";

interface UnifiedVerificationModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const UnifiedVerificationModal = ({ isOpen, onComplete }: UnifiedVerificationModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "verification" | "success">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  
  // Phone state
  const [phone, setPhone] = useState("");
  
  // ID Verification state
  const [idCardNumber, setIdCardNumber] = useState("");
  const [fullNameOnId, setFullNameOnId] = useState("");
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Check if user is already verified when modal opens
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user || !isOpen) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_verified, verification_status, phone')
        .eq('id', user.id)
        .single();
      
      // If user is already verified AND has phone, close the modal immediately
      if (profile?.is_verified === true && profile?.phone) {
        toast.success(t("unifiedVerificationModal.alreadyVerified"));
        onComplete();
        return;
      }
      
      // User is already verified but needs phone - will skip ID step after phone
      if (profile?.is_verified === true) {
        setIsAlreadyVerified(true);
      } else {
        setIsAlreadyVerified(false);
      }
    };
    
    checkVerificationStatus();
  }, [user, isOpen, onComplete]);

  const validatePhone = (phoneNumber: string): boolean => {
    const moroccoRegex = /^(\+212|0)(6|7)\d{8}$/;
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    return moroccoRegex.test(cleanPhone) || cleanPhone.length >= 10;
  };

  const handlePhoneSubmit = async () => {
    setError("");
    
    if (!phone.trim()) {
      setError(t("unifiedVerificationModal.errorEnterPhone"));
      return;
    }

    if (!validatePhone(phone)) {
      setError(t("unifiedVerificationModal.errorInvalidPhone"));
      return;
    }

    if (!user) {
      setError(t("unifiedVerificationModal.errorLoginFirst"));
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone: phone.trim() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(t("unifiedVerificationModal.phoneSaved"));
      
      // If user is already verified, skip ID verification and complete
      if (isAlreadyVerified) {
        const pendingBooking = safeGetItem<unknown>('pendingBooking', null);
        if (pendingBooking) {
          navigate('/booking-history');
        }
        onComplete();
      } else {
        // User needs to verify ID
        setStep("verification");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? getErrMsg(err) : t("unifiedVerificationModal.errorSavePhone");
      setError(message);
      toast.error(t("unifiedVerificationModal.errorSavePhone"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (type: 'front' | 'back', file: File | null) => {
    if (!file) return;
    
    // Validate file
    const validation = validateImageFile(file, 10); // Allow up to 10MB before compression
    if (!validation.valid) {
      toast.error(validation.error || t("unifiedVerificationModal.invalidFile"));
      return;
    }
    
    try {
      setIsCompressing(true);
      
      // Compress image to ~300KB - check if WebP is supported
      const compressedBlob = await compressImage(file, 300);
      const isWebP = compressedBlob.type === 'image/webp';
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, isWebP ? '.webp' : '.jpg'), { type: compressedBlob.type });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'front') {
          setIdFrontFile(compressedFile);
          setFrontPreview(reader.result as string);
        } else {
          setIdBackFile(compressedFile);
          setBackPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(compressedBlob);
      
      toast.success(t("unifiedVerificationModal.imageCompressed", { size: Math.round(compressedBlob.size / 1024) }));
    } catch (err) {
      console.error('Compression error:', err);
      toast.error(t("unifiedVerificationModal.failedToProcessImage"));
    } finally {
      setIsCompressing(false);
    }
  };

  const uploadImage = async (file: File, type: 'front' | 'back'): Promise<string | null> => {
    if (!user) return null;
    
    // Use WebP extension if file is WebP, otherwise jpg
    const fileExt = file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('id-documents')
      .upload(fileName, file, { upsert: true });
    
    if (error) throw error;
    
    // Return storage path only - private bucket requires signed URLs for access
    return data.path;
  };

  const handleVerificationSubmit = async () => {
    setError("");
    
    if (!idCardNumber.trim() || !fullNameOnId.trim()) {
      setError(t("unifiedVerificationModal.fillAllFields"));
      return;
    }
    
    if (!idFrontFile || !idBackFile) {
      setError(t("unifiedVerificationModal.uploadBothSides"));
      return;
    }
    
    if (!user) {
      setError(t("unifiedVerificationModal.errorLoginFirst"));
      return;
    }

    setIsLoading(true);
    try {
      // Upload images
      const frontUrl = await uploadImage(idFrontFile, 'front');
      const backUrl = await uploadImage(idBackFile, 'back');
      
      // Update profile with verification data - set to pending_review, not verified
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          id_card_number: idCardNumber.trim(),
          full_name_on_id: fullNameOnId.trim(),
          id_front_image_url: frontUrl,
          id_back_image_url: backUrl,
          verification_status: 'pending_review',
          is_verified: false
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(t("unifiedVerificationModal.verificationSubmitted"));
      setStep("success");
      
      // Auto close after 3 seconds
      setTimeout(() => {
        const pendingBooking = safeGetItem<unknown>('pendingBooking', null);
        if (pendingBooking) {
          navigate('/booking-history');
        }
        onComplete();
      }, 3000);
    } catch (err: unknown) {
      setError(getErrMsg(err) || t("unifiedVerificationModal.failedToSubmit"));
      toast.error(t("unifiedVerificationModal.failedToSubmit"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onComplete}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {step === "phone" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                {t("unifiedVerificationModal.addPhoneTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("unifiedVerificationModal.addPhoneDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("unifiedVerificationModal.phoneLabel")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError("");
                  }}
                  placeholder={t("unifiedVerificationModal.phonePlaceholder")}
                  className="text-lg"
                />
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handlePhoneSubmit} 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("phoneCaptureModal.saving")}
                  </>
                ) : (
                  t("unifiedVerificationModal.continueToVerification")
                )}
              </Button>
            </div>
          </>
        )}

        {step === "verification" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {t("unifiedVerificationModal.verifyIdentityTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("unifiedVerificationModal.verifyIdentityDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="idCardNumber">{t("unifiedVerificationModal.idCardNumberLabel")}</Label>
                <Input
                  id="idCardNumber"
                  value={idCardNumber}
                  onChange={(e) => {
                    setIdCardNumber(e.target.value);
                    setError("");
                  }}
                  placeholder={t("unifiedVerificationModal.idCardNumberPlaceholder")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullNameOnId">{t("unifiedVerificationModal.fullNameLabel")}</Label>
                <Input
                  id="fullNameOnId"
                  value={fullNameOnId}
                  onChange={(e) => {
                    setFullNameOnId(e.target.value);
                    setError("");
                  }}
                  placeholder={t("unifiedVerificationModal.fullNamePlaceholder")}
                />
              </div>
              
              {/* Front of ID */}
              <div className="space-y-2">
                <Label>{t("unifiedVerificationModal.frontOfId")}</Label>
                {frontPreview ? (
                  <div className="relative bg-muted rounded-lg p-2">
                    <img 
                      src={frontPreview} 
                      alt="ID Front" 
                      className="w-full h-32 object-contain rounded-lg"
                    />
                    <button
                      onClick={() => { setIdFrontFile(null); setFrontPreview(null); }}
                      className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {isCompressing ? (
                      <ImageCompressingIndicator />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">{t("unifiedVerificationModal.upload")}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                            disabled={isCompressing}
                          />
                        </label>
                        <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">{t("unifiedVerificationModal.takePhoto")}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                            disabled={isCompressing}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Back of ID */}
              <div className="space-y-2">
                <Label>{t("unifiedVerificationModal.backOfId")}</Label>
                {backPreview ? (
                  <div className="relative bg-muted rounded-lg p-2">
                    <img 
                      src={backPreview} 
                      alt="ID Back" 
                      className="w-full h-32 object-contain rounded-lg"
                    />
                    <button
                      onClick={() => { setIdBackFile(null); setBackPreview(null); }}
                      className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {isCompressing ? (
                      <ImageCompressingIndicator />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">{t("unifiedVerificationModal.upload")}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                            disabled={isCompressing}
                          />
                        </label>
                        <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">{t("unifiedVerificationModal.takePhoto")}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                            disabled={isCompressing}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleVerificationSubmit} 
                className="w-full" 
                size="lg"
                disabled={isLoading || isCompressing}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("unifiedVerificationModal.submitting")}
                  </>
                ) : (
                  t("unifiedVerificationModal.submitForVerification")
                )}
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <DialogTitle>{t("unifiedVerificationModal.successTitle")}</DialogTitle>
            <DialogDescription className="text-base">
              {t("unifiedVerificationModal.successDescription")}
            </DialogDescription>
            
            {/* Show pending booking info if exists */}
            {safeGetItem<unknown>('pendingBooking', null) && (
              <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-center gap-2 text-foreground mb-2">
                  <Bike className="h-5 w-5" />
                  <span className="font-semibold">{t("unifiedVerificationModal.pendingBookingTitle")}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("unifiedVerificationModal.pendingBookingDescription")}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
