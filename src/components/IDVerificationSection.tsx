import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Upload, CheckCircle, Loader2, Camera, AlertCircle, X, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage, validateImageFile } from "@/lib/imageCompression";

interface IDVerificationSectionProps {
  profile: {
    name: string;
    is_verified: boolean;
    verification_status: string;
    id_card_number: string | null;
    full_name_on_id: string | null;
    id_front_image_url: string | null;
    id_back_image_url: string | null;
  };
  onUpdate: () => void;
}

export const IDVerificationSection = ({ profile, onUpdate }: IDVerificationSectionProps) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [idCardNumber, setIdCardNumber] = useState(profile.id_card_number || "");
  const [fullNameOnId, setFullNameOnId] = useState(profile.full_name_on_id || profile.name || "");
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(profile.id_front_image_url);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(profile.id_back_image_url);

  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = async (side: 'front' | 'back', file: File | null) => {
    if (!file) return;
    
    // Validate file
    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      return;
    }

    try {
      setIsCompressing(true);
      
      // Compress image to WebP format
      const compressedBlob = await compressImage(file, 300);
      const isWebP = compressedBlob.type === 'image/webp';
      const compressedFile = new File(
        [compressedBlob], 
        file.name.replace(/\.[^.]+$/, isWebP ? '.webp' : '.jpg'), 
        { type: compressedBlob.type }
      );

      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === 'front') {
          setIdFrontFile(compressedFile);
          setIdFrontPreview(reader.result as string);
        } else {
          setIdBackFile(compressedFile);
          setIdBackPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(compressedBlob);
      
      toast.success(`Image compressed to ${Math.round(compressedBlob.size / 1024)}KB`);
    } catch (err) {
      console.error('Compression error:', err);
      toast.error("Failed to process image");
    } finally {
      setIsCompressing(false);
    }
  };

  const uploadImage = async (file: File, side: 'front' | 'back'): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    
    // Use WebP extension if file is WebP, otherwise jpg
    const fileExt = file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${side}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('id-documents')
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Return storage path only - private bucket requires signed URLs for access
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate
    if (!idCardNumber || idCardNumber.length < 4) {
      toast.error("Please enter a valid ID card number");
      return;
    }
    
    if (!fullNameOnId) {
      toast.error("Please enter your full name as it appears on your ID");
      return;
    }

    if (!idFrontFile && !profile.id_front_image_url) {
      toast.error("Please upload the front of your ID card");
      return;
    }

    if (!idBackFile && !profile.id_back_image_url) {
      toast.error("Please upload the back of your ID card");
      return;
    }

    try {
      setIsLoading(true);

      let frontUrl = profile.id_front_image_url;
      let backUrl = profile.id_back_image_url;

      // Upload front image if new
      if (idFrontFile) {
        frontUrl = await uploadImage(idFrontFile, 'front');
      }

      // Upload back image if new
      if (idBackFile) {
        backUrl = await uploadImage(idBackFile, 'back');
      }

      // Update profile - always set to pending_review, admin will verify later
      const { error } = await supabase
        .from('profiles')
        .update({
          id_card_number: idCardNumber,
          full_name_on_id: fullNameOnId,
          id_front_image_url: frontUrl,
          id_back_image_url: backUrl,
          verification_status: 'pending_review',
          is_verified: false // Always false - admin will verify
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Verification submitted! We'll review your documents shortly.");
      
      onUpdate();
      setIsExpanded(false);
      
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error("Failed to submit verification");
    } finally {
      setIsLoading(false);
    }
  };

  if (profile.is_verified) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Account Verified
            <Badge className="ml-2 bg-primary text-primary-foreground">Verified</Badge>
          </CardTitle>
          <CardDescription>
            Your identity has been verified. You can now rent motorbikes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (profile.verification_status === 'pending_review') {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Verification Pending
            <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600">Under Review</Badge>
          </CardTitle>
          <CardDescription>
            Your documents are being reviewed. This usually takes 24-48 hours.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          ID Verification
        </CardTitle>
        <CardDescription>
          Verify your identity to rent motorbikes. We need your Moroccan ID (CIN) details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isExpanded ? (
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full gap-2"
          >
            <Shield className="h-4 w-4" />
            Start Verification
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name on ID */}
            <div className="space-y-2">
              <Label htmlFor="full-name-id">Full Name (as on ID card) *</Label>
              <Input
                id="full-name-id"
                value={fullNameOnId}
                onChange={(e) => setFullNameOnId(e.target.value)}
                placeholder="Enter your full name as it appears on your ID"
                required
              />
              <p className="text-xs text-muted-foreground">
                Must match the name in your profile: <strong>{profile.name}</strong>
              </p>
            </div>

            {/* ID Card Number */}
            <div className="space-y-2">
              <Label htmlFor="id-number">ID Card Number (CIN) *</Label>
              <Input
                id="id-number"
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value.toUpperCase())}
                placeholder="e.g., BK123456"
                required
                className="uppercase"
              />
            </div>

            {/* ID Card Images */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Front */}
              <div className="space-y-2">
                <Label>Front of ID Card *</Label>
                <div className="relative border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors">
                  {idFrontPreview ? (
                    <div className="relative bg-muted rounded p-2">
                      <img src={idFrontPreview} alt="ID Front" className="w-full h-32 object-contain rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => {
                          setIdFrontFile(null);
                          setIdFrontPreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col items-center justify-center h-20 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                          />
                        </label>
                        <label className="flex flex-col items-center justify-center h-20 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Take Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Back */}
              <div className="space-y-2">
                <Label>Back of ID Card *</Label>
                <div className="relative border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors">
                  {idBackPreview ? (
                    <div className="relative bg-muted rounded p-2">
                      <img src={idBackPreview} alt="ID Back" className="w-full h-32 object-contain rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => {
                          setIdBackFile(null);
                          setIdBackPreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col items-center justify-center h-20 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                          />
                        </label>
                        <label className="flex flex-col items-center justify-center h-20 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Take Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpanded(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="hero"
                disabled={isLoading}
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit Verification
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
