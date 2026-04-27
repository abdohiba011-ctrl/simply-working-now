import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Testimonial } from "@/data/testimonials";

interface Props {
  testimonial: Testimonial | null;
  onClose: () => void;
}

export const VideoLightbox = ({ testimonial, onClose }: Props) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const open = Boolean(testimonial);

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl border-0 bg-black p-0 sm:rounded-2xl overflow-hidden">
        <DialogTitle className="sr-only">
          {testimonial ? `Video testimonial from ${testimonial.name}` : t("testimonials.playVideo")}
        </DialogTitle>
        {testimonial?.videoUrl ? (
          <video
            ref={videoRef}
            src={testimonial.videoUrl}
            poster={testimonial.imageUrl}
            controls
            autoPlay
            playsInline
            className="h-auto w-full"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-black text-sm text-white/70">
            {t("testimonials.videoComingSoon")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
