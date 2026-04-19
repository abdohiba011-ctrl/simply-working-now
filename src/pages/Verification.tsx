import { useState, useEffect, useRef } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { compressImage, validateImageFile, formatFileSize } from "@/lib/imageCompression";
import { safeGetItem } from "@/lib/safeStorage";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import idVerificationGuide from "@/assets/id-verification-guide.png";
import { 
  Upload, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Phone,
  User,
  CreditCard,
  Shield,
  FileText,
  UserCircle,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { VerificationSkeleton } from "@/components/ui/bike-skeleton";

interface UploadState {
  file: File | null;
  preview: string | null;
  progress: number;
  status: 'idle' | 'compressing' | 'uploading' | 'success' | 'error';
  error: string | null;
  statusMessage: string;
  originalSize: number;
  compressedSize: number;
}

const initialUploadState: UploadState = {
  file: null,
  preview: null,
  progress: 0,
  status: 'idle',
  error: null,
  statusMessage: '',
  originalSize: 0,
  compressedSize: 0
};

const Verification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Form state
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  
  // Upload states
  const [frontId, setFrontId] = useState<UploadState>(initialUploadState);
  const [backId, setBackId] = useState<UploadState>(initialUploadState);
  const [selfieWithId, setSelfieWithId] = useState<UploadState>(initialUploadState);
  
  // Storage URLs for uploaded images (replacing window globals)
  const [uploadedUrls, setUploadedUrls] = useState<{
    front: string | null;
    back: string | null;
    selfie: string | null;
  }>({ front: null, back: null, selfie: null });
  
  // General state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('not_started');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs for file inputs
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const frontCameraRef = useRef<HTMLInputElement>(null);
  const backCameraRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const selfieCameraRef = useRef<HTMLInputElement>(null);

  // Check existing verification status and auto-fill names from profile
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_verified, verification_status, phone, first_name_on_id, family_name_on_id, id_card_number, name, rejection_reason')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        // Store rejection reason if exists
        if (profile.rejection_reason) {
          setRejectionReason(profile.rejection_reason);
        }
        if (profile.is_verified) {
          setIsAlreadyVerified(true);
          toast.success("Your account is already verified!");
          navigate('/');
          return;
        }
        setVerificationStatus(profile.verification_status || 'not_started');
        if (profile.phone) setPhone(profile.phone);
        if (profile.first_name_on_id) setFirstName(profile.first_name_on_id);
        if (profile.family_name_on_id) setFamilyName(profile.family_name_on_id);
        if (profile.id_card_number) setIdNumber(profile.id_card_number);
        
        // Auto-fill first/family name from profile name if not already set
        if (!profile.first_name_on_id && !profile.family_name_on_id && profile.name) {
          const nameParts = profile.name.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            setFirstName(nameParts[0]);
            setFamilyName(nameParts.slice(1).join(' '));
          } else if (nameParts.length === 1) {
            setFirstName(nameParts[0]);
          }
        }
      }
      setIsLoading(false);
    };
    
    checkStatus();
  }, [user, navigate]);

  const validatePhone = (phoneNumber: string): boolean => {
    // Accept any reasonable phone number (6-20 digits)
    const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '');
    return cleanPhone.length >= 6 && cleanPhone.length <= 20;
  };

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setUploadState: React.Dispatch<React.SetStateAction<UploadState>>,
    side: 'front' | 'back' | 'selfie'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const originalSize = file.size;

    // Validate file
    const validation = validateImageFile(file, 15);
    if (!validation.valid) {
      setUploadState(prev => ({ 
        ...prev, 
        error: validation.error || 'Invalid file', 
        status: 'error',
        statusMessage: validation.error || 'Invalid file'
      }));
      toast.error(validation.error);
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadState(prev => ({ 
        ...prev, 
        file, 
        preview: event.target?.result as string,
        status: 'compressing',
        progress: 0,
        error: null,
        statusMessage: 'Preparing your image...',
        originalSize
      }));
    };
    reader.readAsDataURL(file);

    try {
      // Compress with progress callback
      const compressedBlob = await compressImage(
        file, 
        500, // Target 500KB for ID documents
        1920,
        (progress, stage) => {
          // Map compression progress to 0-40%
          const mappedProgress = Math.round(progress * 0.4);
          setUploadState(prev => ({ 
            ...prev, 
            progress: mappedProgress,
            statusMessage: stage
          }));
        }
      );
      
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
      
      setUploadState(prev => ({ 
        ...prev, 
        progress: 45,
        status: 'uploading',
        statusMessage: 'Uploading to secure storage...',
        compressedSize: compressedBlob.size
      }));
      
      // Upload to Supabase
      const fileName = `${user?.id}/${side}-${Date.now()}.webp`;
      
      // Smooth progress animation during upload
      let currentProgress = 45;
      const progressInterval = setInterval(() => {
        setUploadState(prev => {
          if (prev.progress < 85) {
            currentProgress = prev.progress + 2;
            return { 
              ...prev, 
              progress: currentProgress,
              statusMessage: currentProgress < 70 ? 'Uploading to secure storage...' : 'Verifying upload...'
            };
          }
          return prev;
        });
      }, 150);

      const { data, error } = await supabase.storage
        .from('id-documents')
        .upload(fileName, compressedFile, { upsert: true });

      clearInterval(progressInterval);

      if (error) throw error;

      // Store storage path only - private bucket requires signed URLs for access
      setUploadedUrls(prev => ({
        ...prev,
        [side]: fileName
      }));

      // Show success
      setUploadState(prev => ({ 
        ...prev, 
        progress: 100, 
        status: 'success',
        statusMessage: `Complete! Reduced from ${formatFileSize(originalSize)} to ${formatFileSize(compressedBlob.size)}`
      }));
      
      toast.success(`${side === 'front' ? 'Front ID' : side === 'back' ? 'Back ID' : 'Selfie'} uploaded successfully!`);
    } catch (err: unknown) {
      setUploadState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: getErrMsg(err) || 'Upload failed. Please try again.',
        progress: 0,
        statusMessage: 'Upload failed'
      }));
      toast.error(`Failed to upload: ${getErrMsg(err)}`);
    }
  };

  const resetUpload = (
    side: 'front' | 'back' | 'selfie',
    setUploadState: React.Dispatch<React.SetStateAction<UploadState>>,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    setUploadState(initialUploadState);
    setUploadedUrls(prev => ({
      ...prev,
      [side]: null
    }));
    inputRef.current?.click();
  };

  const isFormValid = () => {
    return (
      validatePhone(phone) &&
      firstName.trim().length >= 2 &&
      familyName.trim().length >= 2 &&
      idNumber.trim().length >= 4 &&
      frontId.status === 'success' &&
      backId.status === 'success' &&
      privacyAccepted
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error("Please complete all fields and upload both ID images");
      return;
    }

    setIsSubmitting(true);

    try {
      const frontUrl = uploadedUrls.front || frontId.preview;
      const backUrl = uploadedUrls.back || backId.preview;
      const selfieUrl = uploadedUrls.selfie || selfieWithId.preview;

      const { error } = await supabase
        .from('profiles')
        .update({
          phone: phone.replace(/\s/g, ''),
          phone_verified: true,
          first_name_on_id: firstName.trim(),
          family_name_on_id: familyName.trim(),
          id_card_number: idNumber.trim(),
          id_front_image_url: frontUrl,
          id_back_image_url: backUrl,
          selfie_with_id_url: selfieUrl || null,
          verification_status: 'pending_review',
        })
        .eq('id', user?.id);

      if (error) throw error;

      // Navigate to thank you page for verification
      navigate('/thank-you?type=verification');
    } catch (err: unknown) {
      toast.error(getErrMsg(err) || "Failed to submit verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUploadBox = (
    side: 'front' | 'back' | 'selfie',
    uploadState: UploadState,
    setUploadState: React.Dispatch<React.SetStateAction<UploadState>>,
    inputRef: React.RefObject<HTMLInputElement>,
    cameraRef: React.RefObject<HTMLInputElement>,
    label: string,
    isOptional: boolean = false
  ) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-foreground font-medium">{label}</Label>
          {isOptional && (
            <Badge variant="outline" className="text-xs">Optional</Badge>
          )}
        </div>
        
        {uploadState.status === 'idle' && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-6 w-6" />
              <span className="text-xs">Upload from device</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="h-6 w-6" />
              <span className="text-xs">Take a picture</span>
            </Button>
          </div>
        )}

        {(uploadState.status === 'compressing' || uploadState.status === 'uploading') && (
          <div className="border rounded-lg p-4 space-y-3">
            {uploadState.preview && (
              <img 
                src={uploadState.preview} 
                alt={label} 
                className="w-full h-32 object-contain bg-muted rounded"
              />
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {uploadState.statusMessage}
                </span>
                <span className="font-medium">{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} className="h-2" />
              {uploadState.originalSize > 0 && uploadState.status === 'compressing' && (
                <p className="text-xs text-muted-foreground">
                  Original size: {formatFileSize(uploadState.originalSize)}
                </p>
              )}
            </div>
          </div>
        )}

        {uploadState.status === 'success' && (
          <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4 space-y-3">
            <img 
              src={uploadState.preview || ''} 
              alt={label} 
              className="w-full h-32 object-contain bg-muted rounded"
            />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Uploaded successfully</span>
                </div>
                {uploadState.compressedSize > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadState.originalSize)} → {formatFileSize(uploadState.compressedSize)}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => resetUpload(side, setUploadState, inputRef)}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Replace
              </Button>
            </div>
          </div>
        )}

        {uploadState.status === 'error' && (
          <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{uploadState.error}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => resetUpload(side, setUploadState, inputRef)}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageSelect(e, setUploadState, side)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleImageSelect(e, setUploadState, side)}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-lg mx-auto px-4 py-8">
          <VerificationSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (verificationStatus === 'pending_review') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-lg mx-auto px-4 py-12">
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
              </div>
              <CardTitle className="text-amber-900 dark:text-amber-100">Verification Pending</CardTitle>
              <CardDescription className="text-amber-800 dark:text-amber-200">
                Your documents are being reviewed. We'll notify you within 24-48 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                If 24 hours pass without an update, feel free to contact us:
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline" 
                  className="min-h-[44px] gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                  onClick={() => window.open('https://wa.me/212710564476', '_blank')}
                >
                  <Phone className="h-5 w-5" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="min-h-[44px] gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                  onClick={() => window.location.href = 'mailto:contact@motori.ma'}
                >
                  <FileText className="h-5 w-5" />
                  Email
                </Button>
              </div>
              <Button 
                onClick={() => navigate('/')} 
                variant="hero"
                className="mt-4 min-h-[44px]"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-lg mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Verify Your Account</CardTitle>
            <CardDescription>
              Complete verification to rent motorbikes. This helps keep our community safe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Re-verification Reason Banner */}
            {rejectionReason && (
              <Alert className="mb-6 bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Re-verification Required:</strong> {rejectionReason}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+212 6XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={!validatePhone(phone) && phone.length > 0 ? 'border-destructive' : ''}
                />
                {!validatePhone(phone) && phone.length > 0 && (
                  <p className="text-xs text-destructive">Enter a valid Moroccan phone number</p>
                )}
              </div>

              {/* First Name on ID */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  First Name (as on ID)
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              {/* Family Name on ID */}
              <div className="space-y-2">
                <Label htmlFor="familyName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Family Name (as on ID)
                </Label>
                <Input
                  id="familyName"
                  type="text"
                  placeholder="Enter your family name"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </div>

              {/* ID Card Number */}
              <div className="space-y-2">
                <Label htmlFor="idNumber" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  ID Card Number (CIN)
                </Label>
                <Input
                  id="idNumber"
                  type="text"
                  placeholder="Enter your CIN number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>

              {/* ID Card Images */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  ID Card Photos
                </h3>
                {renderUploadBox('front', frontId, setFrontId, frontInputRef, frontCameraRef, 'Front of ID Card')}
                {renderUploadBox('back', backId, setBackId, backInputRef, backCameraRef, 'Back of ID Card')}
              </div>

              {/* Selfie with ID Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  <h3 className="font-medium text-foreground">Selfie with ID Card</h3>
                </div>
                
              {/* Verification Guide Image - Full width with padding */}
                <div className="flex justify-center px-2">
                  <img 
                    src={idVerificationGuide} 
                    alt="How to take a selfie with your ID card" 
                    className="w-full max-w-[320px] sm:max-w-[360px] rounded-lg border border-border"
                  />
                </div>
                
                {/* Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-300 relative overflow-hidden">
                    {/* Animated illustration */}
                    <div className="relative animate-pulse">
                      <div className="w-10 h-12 bg-gray-400 rounded-full" /> {/* Head */}
                      <div className="absolute -right-3 bottom-0 w-8 h-5 bg-gray-500 rounded-sm transform rotate-12 border border-gray-600">
                        <div className="w-full h-1 bg-gray-600 mt-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 text-[8px] text-gray-500 text-center font-medium">
                      Face + ID visible
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-foreground font-medium">
                      Hold your ID card next to your face
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full" />
                        Both your face and ID must be clearly visible
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full" />
                        Good lighting, no glare on the ID
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full" />
                        This helps us verify faster
                      </li>
                    </ul>
                  </div>
                </div>
                
                {renderUploadBox(
                  'selfie', 
                  selfieWithId, 
                  setSelfieWithId, 
                  selfieInputRef, 
                  selfieCameraRef, 
                  'Upload Selfie with ID',
                  false
                )}
              </div>

              {/* Privacy Policy */}
              <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
                <Checkbox
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="privacy"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I accept the Privacy Policy
                  </label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you agree to our{" "}
                    <Link to="/privacy-policy" className="text-gray-700 hover:text-gray-900 underline" target="_blank">
                      Privacy Policy
                    </Link>
                    {" "}and{" "}
                    <Link to="/terms" className="text-gray-700 hover:text-gray-900 underline" target="_blank">
                      Terms & Conditions
                    </Link>
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={!isFormValid() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Verification"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Verification;
