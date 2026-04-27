import { Star, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/contexts/LanguageContext";
import type { Testimonial } from "@/data/testimonials";

interface Props { testimonial: Testimonial; }

export const PortraitTestimonialCard = ({ testimonial }: Props) => {
  const { language, t } = useLanguage();
  const lang = language as Language;
  const review = testimonial.review?.[lang];

  return (
    <article
      className="break-inside-avoid mb-6 group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      role="listitem"
      aria-label={`Photo testimonial from ${testimonial.name}, ${testimonial.city}`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {testimonial.imageUrl && (
          <img
            src={testimonial.imageUrl}
            alt={`${testimonial.name}, Motonita renter in ${testimonial.city}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {testimonial.verified && (
          <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <BadgeCheck className="h-3 w-3" />
            {t("testimonials.verified")}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="text-start">
              <h3 className="text-base font-semibold">{testimonial.name}</h3>
              <p className="text-xs opacity-90">
                {testimonial.city} · {testimonial.rentalType[lang]}
              </p>
            </div>
            {testimonial.rating && (
              <div className="flex items-center gap-0.5" aria-label={`${testimonial.rating} out of 5 stars`}>
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            )}
          </div>
          {review && (
            <p className="mt-2 text-sm leading-snug opacity-95 line-clamp-3">"{review}"</p>
          )}
        </div>
      </div>
    </article>
  );
};
