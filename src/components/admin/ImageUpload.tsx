import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Star, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { uploadBikeImage, deleteBikeImage, validateImageFile } from '@/lib/imageUpload';
import { cn } from '@/lib/utils';

export interface UploadedImage {
  id: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
}

interface ImageUploadProps {
  bikeTypeId: string;
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  bikeTypeId,
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, [disabled, images, bikeTypeId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;
    const files = Array.from(e.target.files);
    await handleFiles(files);
    e.target.value = ''; // Reset input
  }, [disabled, images, bikeTypeId]);

  const handleFiles = async (files: File[]) => {
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    const newImages: UploadedImage[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      const result = await uploadBikeImage(file, bikeTypeId);
      if (result.success && result.url) {
        newImages.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          url: result.url,
          isPrimary: images.length === 0 && newImages.length === 0,
          displayOrder: images.length + newImages.length
        });
        toast.success(`Uploaded ${file.name}`);
      } else {
        toast.error(`Failed to upload ${file.name}: ${result.error}`);
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }
    setUploading(false);
  };

  const handleRemoveImage = async (imageToRemove: UploadedImage) => {
    const deleted = await deleteBikeImage(imageToRemove.url);
    if (deleted) {
      const updatedImages = images
        .filter(img => img.id !== imageToRemove.id)
        .map((img, index) => ({
          ...img,
          displayOrder: index,
          isPrimary: index === 0 && imageToRemove.isPrimary ? true : img.isPrimary
        }));
      
      // Ensure at least one is primary if there are images
      if (updatedImages.length > 0 && !updatedImages.some(img => img.isPrimary)) {
        updatedImages[0].isPrimary = true;
      }
      
      onImagesChange(updatedImages);
      toast.success('Image removed');
    } else {
      toast.error('Failed to remove image');
    }
  };

  const handleSetPrimary = (image: UploadedImage) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === image.id
    }));
    onImagesChange(updatedImages);
    toast.success('Primary image updated');
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop images here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP (max 5MB each)
            </p>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ position: 'absolute', left: 0, top: 0 }}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={disabled || uploading}
              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
            >
              Select Files
            </Button>
          </>
        )}
      </div>

      {/* Image preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                "relative group rounded-lg overflow-hidden border-2",
                image.isPrimary ? "border-primary" : "border-transparent"
              )}
            >
              <img
                src={image.url}
                alt={`Bike image ${index + 1}`}
                className="w-full aspect-square object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              
              {/* Primary badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.isPrimary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(image)}
                    disabled={disabled}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Set Primary
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemoveImage(image)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && !uploading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>No images uploaded yet. Add at least one image.</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
