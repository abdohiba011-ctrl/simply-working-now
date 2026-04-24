import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Camera, User, Mail, Phone, MapPin, Save, Loader2, CheckCircle, Shield, Clock, Upload, ImageIcon, Trash2, Plus, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profileSchema, imageFileSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { compressImage, validateImageFile, formatFileSize } from "@/lib/imageCompression";
import { SavedLocationsCard } from "@/components/SavedLocationsCard";
import { ProfileSkeleton } from "@/components/ui/loading-skeleton";


interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar_url: string;
  is_verified: boolean;
  verification_status: string;
  id_card_number: string | null;
  full_name_on_id: string | null;
  id_front_image_url: string | null;
  id_back_image_url: string | null;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: user?.email || "",
    phone: "",
    address: "",
    avatar_url: "",
    is_verified: false,
    verification_status: "not_started",
    id_card_number: null,
    full_name_on_id: null,
    id_front_image_url: null,
    id_back_image_url: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  
  // Image crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch profile data on mount
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setIsFetchingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          address: data.address || '',
          avatar_url: data.avatar_url || '',
          is_verified: data.is_verified || false,
          verification_status: data.verification_status || 'not_started',
          id_card_number: data.id_card_number,
          full_name_on_id: data.full_name_on_id,
          id_front_image_url: data.id_front_image_url,
          id_back_image_url: data.id_back_image_url,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('errors.generic'));
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file
    const validation = validateImageFile(file, 15);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    // Create object URL for crop modal
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setShowCropModal(true);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage(t('profileUpload.compressing'));
    
    try {
      // Compress the cropped image
      const file = new File([croppedBlob], 'avatar.webp', { type: croppedBlob.type });
      const originalSize = file.size;
      
      const compressedBlob = await compressImage(file, 500, 512, (progress, stage) => {
        // Map compression progress (0-85%) to upload progress (0-50%)
        const mappedProgress = Math.round(progress * 0.5);
        setUploadProgress(mappedProgress);
        setUploadStage(stage);
      });
      
      const compressedSize = compressedBlob.size;
      console.log(`Compressed from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)}`);
      
      setUploadStage(t('profileUpload.uploading'));
      setUploadProgress(55);
      
      // Upload to Supabase Storage
      const timestamp = Date.now();
      const filePath = `${user.id}/avatar-${timestamp}.webp`;
      
      // Delete existing avatars
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }
      
      setUploadProgress(70);
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, { upsert: true });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      setUploadProgress(85);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const urlWithCacheBust = `${publicUrl}?t=${timestamp}`;
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', user.id);
      
      if (updateError) {
        throw new Error(`Profile update failed: ${updateError.message}`);
      }
      
      setUploadProgress(100);
      setUploadStage(t('profileUpload.uploadComplete'));
      
      // Update local state
      setProfile(prev => ({ ...prev, avatar_url: urlWithCacheBust }));
      
      toast.success(t('success.profileUpdated'));
      
      // Reset after delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStage("");
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage("");
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      // Validate profile data
      const validatedData = profileSchema.parse({
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        address: profile.address || ''
      });

      setIsLoading(true);

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone || null,
          address: validatedData.address || null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(t('success.profileUpdated'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Error updating profile:', error);
        toast.error(t('errors.generic'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t('profile.title')}</h1>
              {profile.is_verified && <VerifiedBadge size="lg" />}
            </div>
          </div>
          
          {isFetchingProfile ? (
            <ProfileSkeleton />
          ) : (
            <div className="space-y-6">

              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('profilePage.profileInfo')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveChanges} className="space-y-6">
                    {/* Profile Image */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-32 w-32">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                            {profile.name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Upload Progress Overlay */}
                        {isUploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <span className="text-xs font-medium text-foreground">{uploadProgress}%</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {isUploading && (
                        <div className="w-full max-w-xs space-y-2">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-center text-muted-foreground">{uploadStage}</p>
                        </div>
                      )}
                  
                      <Label htmlFor="profile-image" className={`cursor-pointer ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                          <Camera className="h-4 w-4" />
                          {t('profilePage.changePhoto')}
                        </div>
                        <Input
                          id="profile-image"
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                      </Label>
                    </div>

                    {/* Image Crop Modal */}
                    <ImageCropModal
                      isOpen={showCropModal}
                      onClose={() => {
                        setShowCropModal(false);
                        setSelectedImageSrc("");
                      }}
                      imageSrc={selectedImageSrc}
                      onCropComplete={handleCropComplete}
                      aspectRatio={1}
                      title={t('imageCrop.title')}
                    />

                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <User className="h-4 w-4 text-foreground" />
                        {t('profile.fullName')}
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('profile.fullName')}
                        required
                        className={isRTL ? 'text-right' : ''}
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Mail className="h-4 w-4 text-foreground" />
                        {t('profile.email')}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        placeholder={t('profile.email')}
                        required
                        className={isRTL ? 'text-right' : ''}
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Phone className="h-4 w-4 text-foreground" />
                        {t('profile.phone')}
                      </Label>
                      <PhoneInput
                        id="phone"
                        value={profile.phone}
                        onChange={(value) => setProfile(prev => ({ ...prev, phone: value }))}
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label htmlFor="address" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <MapPin className="h-4 w-4 text-foreground" />
                        {t('profile.address')}
                      </Label>
                      <Input
                        id="address"
                        type="text"
                        value={profile.address}
                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                        placeholder={t('profile.address')}
                        className={isRTL ? 'text-right' : ''}
                      />
                    </div>

                    {/* Save Button */}
                    <div className={`flex pt-4 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <Button 
                        type="submit" 
                        variant="hero" 
                        size="lg" 
                        className="gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('profile.saving')}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            {t('profile.saveChanges')}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Verification Status Card */}
              <Card className={profile.is_verified 
                ? "border-primary/30 bg-primary/5" 
                : profile.verification_status === 'pending_review'
                  ? "border-yellow-500/30 bg-yellow-500/5"
                  : "border-muted"
              }>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {profile.is_verified ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-primary" />
                        {t('profilePage.accountVerified')}
                        <Badge className="ml-2 bg-primary text-primary-foreground">{t('profile.verified')}</Badge>
                      </>
                    ) : profile.verification_status === 'pending_review' ? (
                      <>
                        <Clock className="h-5 w-5 text-yellow-600" />
                        {t('profilePage.verificationPending')}
                        <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600">{t('profilePage.underReview')}</Badge>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        {t('profilePage.idVerificationRequired')}
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.is_verified ? (
                    <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                      {t('profilePage.identityVerified')}
                    </p>
                  ) : profile.verification_status === 'pending_review' ? (
                    <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                      {t('profilePage.documentsReviewing')}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                        {t('profilePage.completeVerification')}
                      </p>
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => navigate('/verification')}
                      >
                        <Shield className="h-4 w-4" />
                        {t('profilePage.goToVerification')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Saved Locations Card */}
              <SavedLocationsCard userId={user?.id} isRTL={isRTL} t={t} />
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('profilePage.bookingHistory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm text-muted-foreground mb-4 ${isRTL ? 'text-right' : ''}`}>
                      {t('profilePage.viewPastBookings')}
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/booking-history')}
                      className="w-full"
                    >
                      {t('profilePage.viewHistory')}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('notifications.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm text-muted-foreground mb-4 ${isRTL ? 'text-right' : ''}`}>
                      {t('profilePage.checkNotifications')}
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/notifications')}
                      className="w-full"
                    >
                      {t('profilePage.viewNotifications')}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm text-muted-foreground mb-4 ${isRTL ? 'text-right' : ''}`}>
                      {t('profilePage.manageSettings')}
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/settings')}
                      className="w-full"
                    >
                      {t('profilePage.goToSettings')}
                    </Button>
                  </CardContent>
                </Card>
              </div>

            </div>
          )}
        </div>
      </main>
      
    </div>
  );
};

export default Profile;
