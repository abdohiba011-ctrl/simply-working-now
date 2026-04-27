import { Play, BadgeCheck, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/contexts/LanguageContext";
import type { Testimonial } from "@/data/testimonials";

interface Props {
  testimonial: Testimonial;
  onOpen: (t: Testimonial) => void;
}

const formatDuration = (s?: number) => {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const VideoTestimonialCard = ({ testimonial, onOpen }: Props) => {
  const { language, t } = useLanguage();
  const lang = language as Language;
  const hasVideo = Boolean(testimonial.videoUrl);

  return (
    <article
      className="break-inside-avoid mb-6 group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      role="listitem"
      aria-label={`Video testimonial from ${testimonial.name}, ${testimonial.city}`}
    >
      <button
        type="button"
        onClick={() => hasVideo && onOpen(testimonial)}
        disabled={!hasVideo}
        aria-label={t("testimonials.playVideo")}
        className="block w-full text-start disabled:cursor-not-allowed"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {testimonial.imageUrl && (
            <img
              src={testimonial.imageUrl}
              alt={`${testimonial.name} — Motonita renter in ${testimonial.city}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {formatDuration(testimonial.durationSec)}
          </span>

          {testimonial.verified && (
            <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <BadgeCheck className="h-3 w-3" />
              {t("testimonials.verified")}
            </span>
          )}

          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl transition-transform group-hover:scale-110">
              <Play className="h-7 w-7 ms-1" />
            </span>
          </span>

          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h3 className="text-sm font-semibold">{testimonial.name}</h3>
            <p className="text-[11px] opacity-90">
              {testimonial.city} · {testimonial.rentalType[lang]}
            </p>
            {testimonial.rating && (
              <div className="mt-1 flex items-center gap-0.5" aria-label={`${testimonial.rating} out of 5 stars`}>
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            )}
            {!hasVideo && (
              <p className="mt-2 text-[10px] italic opacity-90">{t("testimonials.videoComingSoon")}</p>
            )}
          </div>
        </div>
      </button>
    </article>
  );
};
