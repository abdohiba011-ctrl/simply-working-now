import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Check, X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
  title?: string;
}

const CropperComponent = Cropper as any;

export const ImageCropModal = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
  title
}: ImageCropModalProps) => {
  const { t, isRTL } = useLanguage();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropCompleteCallback = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (): Promise<Blob | null> => {
    if (!croppedAreaPixels) return null;

    return new Promise((resolve) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(null);
          return;
        }

        // Set canvas size to the cropped area
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // Draw the cropped image
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        // Check WebP support
        const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const outputFormat = supportsWebP ? 'image/webp' : 'image/jpeg';

        canvas.toBlob(
          (blob) => resolve(blob),
          outputFormat,
          0.9
        );
      };
      image.onerror = () => resolve(null);
    });
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const croppedBlob = await createCroppedImage();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
        onClose();
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {title || t('imageCrop.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-64 md:h-80 bg-muted rounded-lg overflow-hidden">
          <CropperComponent
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            cropShape="rect"
            showGrid={true}
          />
        </div>

        <div className="space-y-4 py-4">
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={(values) => setZoom(values[0])}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-center'}`}>
            {t('imageCrop.instruction')}
          </p>
        </div>

        <DialogFooter className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            <X className="h-4 w-4 mr-2" />
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? t('common.processing') : t('imageCrop.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
