import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { compressImage, validateImageFile, formatFileSize } from "@/lib/imageCompression";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Copy,
  Send,
  Shield,
  ShieldOff,
  RefreshCw,
  Plus,
  Minus,
  User,
  Clock,
  Star,
  IdCard,
  Loader2,
  Pencil,
  Camera,
  Upload,
  X,
  CheckCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ClientData, AccountStatus, KYCStatus, PhoneStatus, RiskLevel } from "./types";
import { formatDateTime, formatRelativeTime, getTrustLabel, mapAccountStatus, mapKYCStatus, mapPhoneStatus, mapRiskLevel } from "./helpers";

interface ClientHeaderSectionProps {
  client: ClientData;
  isRTL: boolean;
  onSendNotification: () => void;
  onBlockUnblock: () => void;
  onVerify: () => void;
  onReverify: () => void;
  onAdjustTrust: () => void;
  updateClientName: (name: string) => Promise<boolean>;
  updateClientAvatar: (file: File | Blob | null) => Promise<boolean>;
  updateIdCardNumber: (idNumber: string) => Promise<boolean>;
}

export const ClientHeaderSection = ({
  client,
  isRTL,
  onSendNotification,
  onBlockUnblock,
  onVerify,
  onReverify,
  onAdjustTrust,
  updateClientName,
  updateClientAvatar,
  updateIdCardNumber,
}: ClientHeaderSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isEditingIdNumber, setIsEditingIdNumber] = useState(false);
  const [editedIdNumber, setEditedIdNumber] = useState("");
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const trustInfo = getTrustLabel(client.trustScore);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsSubmitting(true);
    const success = await updateClientName(editedName.trim());
    setIsSubmitting(false);
    if (success) {
      setIsEditingName(false);
    }
  };

  const handleSaveIdNumber = async () => {
    setIsSubmitting(true);
    const success = await updateIdCardNumber(editedIdNumber.trim());
    setIsSubmitting(false);
    if (success) {
      setIsEditingIdNumber(false);
    }
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setShowAvatarDialog(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropModal(false);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage("Compressing...");
    
    try {
      // Compress the cropped image
      const file = new File([croppedBlob], 'avatar.webp', { type: croppedBlob.type });
      const originalSize = file.size;
      
      const compressedBlob = await compressImage(file, 500, 512, (progress, stage) => {
        const mappedProgress = Math.round(progress * 0.5);
        setUploadProgress(mappedProgress);
        setUploadStage(stage);
      });
      
      console.log(`Compressed from ${formatFileSize(originalSize)} to ${formatFileSize(compressedBlob.size)}`);
      
      setUploadStage("Uploading...");
      setUploadProgress(55);
      
      // Create a File from the compressed blob
      const compressedFile = new File([compressedBlob], 'avatar.webp', { type: 'image/webp' });
      
      setUploadProgress(70);
      
      const success = await updateClientAvatar(compressedFile);
      
      setUploadProgress(100);
      setUploadStage("Complete!");
      
      if (success) {
        toast.success("Profile photo updated");
      }
      
      // Reset after delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStage("");
        setSelectedImageSrc("");
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update photo");
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage("");
    }
  };

  const handleRemoveAvatar = async () => {
    setIsSubmitting(true);
    const success = await updateClientAvatar(null);
    setIsSubmitting(false);
    if (success) {
      setShowAvatarDialog(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar & Basic Info */}
            <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              {/* Avatar with edit overlay */}
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={client.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {(client.name || client.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => setShowAvatarDialog(true)}
                >
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                {/* Editable Name */}
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="h-9 text-xl font-bold w-48"
                        placeholder="Enter name"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveName}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingName(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{client.name || "No Name"}</h1>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditedName(client.name || "");
                          setIsEditingName(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <Badge variant="secondary" className="mt-1">
                    <User className="h-3 w-3 mr-1" />
                    Client
                  </Badge>
                </div>
                {/* Email & Phone & ID Number */}
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{client.email || "No email"}</span>
                    {client.email && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(client.email!, "Email")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="ltr-content">{client.phone || "No phone"}</span>
                    {client.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(client.phone!, "Phone")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {/* ID Number - editable */}
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    {isEditingIdNumber ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editedIdNumber}
                          onChange={(e) => setEditedIdNumber(e.target.value)}
                          className="h-7 w-32 text-sm"
                          placeholder="ID number"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={handleSaveIdNumber}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => setIsEditingIdNumber(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="ltr-content">{client.idCardNumber || "No ID"}</span>
                        {client.idCardNumber && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(client.idCardNumber!, "ID Number")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditedIdNumber(client.idCardNumber || "");
                            setIsEditingIdNumber(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Chips */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Account:</span>
                  <StatusBadge status={mapAccountStatus(client.accountStatus)} size="sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">KYC:</span>
                  <StatusBadge status={mapKYCStatus(client.kycStatus)} size="sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Phone:</span>
                  <StatusBadge status={mapPhoneStatus(client.phoneStatus)} size="sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Risk:</span>
                  <StatusBadge status={mapRiskLevel(client.riskLevel)} size="sm" />
                </div>
              </div>

              {/* Trust Score */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Star className={`h-5 w-5 ${trustInfo.color}`} />
                  <span className="text-2xl font-bold">{client.trustScore}/10</span>
                </div>
                <span className={`text-sm font-medium ${trustInfo.color}`}>
                  {trustInfo.label}
                </span>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined: {formatDateTime(client.joinedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Last active: {client.lastActiveAt ? formatRelativeTime(client.lastActiveAt) : "Never"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onSendNotification}>
              <Send className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
            <Button
              size="sm"
              variant={client.accountStatus === "BLOCKED" ? "default" : "destructive"}
              onClick={onBlockUnblock}
            >
              {client.accountStatus === "BLOCKED" ? (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Unblock User
                </>
              ) : (
                <>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Block User
                </>
              )}
            </Button>
            {client.kycStatus !== "VERIFIED" && (
              <Button size="sm" variant="outline" onClick={onVerify}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify User
              </Button>
            )}
            {client.kycStatus === "VERIFIED" && (
              <Button size="sm" variant="outline" onClick={onReverify}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Request Re-verify
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onAdjustTrust}>
              <Plus className="h-4 w-4 mr-1" />
              <Minus className="h-4 w-4 mr-2" />
              Adjust Trust
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Edit Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Profile Photo</DialogTitle>
            <DialogDescription>
              Upload a new profile photo or remove the existing one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-32 w-32 border-2 border-border">
                  <AvatarImage src={client.avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                    {(client.name || client.email || "U").charAt(0).toUpperCase()}
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
            </div>
            
            <div className="flex flex-col gap-2">
              <label className={`cursor-pointer ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                  <Upload className="h-5 w-5" />
                  <span>Choose a photo</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarFileSelect}
                  disabled={isUploading}
                />
              </label>
              <p className="text-xs text-center text-muted-foreground">
                Image will be cropped and optimized automatically
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {client.avatarUrl && (
              <Button
                variant="outline"
                onClick={handleRemoveAvatar}
                disabled={isSubmitting || isUploading}
                className="text-destructive"
              >
                Remove Photo
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAvatarDialog(false)} disabled={isUploading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        title="Crop Profile Photo"
      />
    </>
  );
};
