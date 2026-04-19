import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageLoadingSkeleton } from "@/components/ui/bike-skeleton";

interface ImageViewerProps {
  isOpen: boolean;
  src: string;
  title?: string;
  onClose: () => void;
}

export const ImageViewer = ({ isOpen, src, title, onClose }: ImageViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setScale(1);
      document.body.style.overflow = 'hidden';
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.25, 3));
        if (e.key === '-') setScale(s => Math.max(s - 0.25, 0.5));
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/90" />
      
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 h-12 w-12"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-8 w-8" />
      </Button>
      
      {/* Zoom controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            setScale(s => Math.max(s - 0.25, 0.5));
          }}
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            setScale(s => Math.min(s + 0.25, 3));
          }}
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <span className="text-white text-sm self-center ml-2">
          {Math.round(scale * 100)}%
        </span>
      </div>
      
      {/* Title */}
      {title && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <p className="text-white text-lg font-medium bg-black/50 px-4 py-2 rounded-lg">
            {title}
          </p>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <ImageLoadingSkeleton />
        </div>
      )}
      
      {/* Image container */}
      <div 
        className="relative max-w-[95vw] max-h-[95vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={title || "Image preview"}
          className="rounded-lg transition-transform duration-200"
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            maxWidth: '95vw',
            maxHeight: '95vh',
            objectFit: 'contain'
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};
