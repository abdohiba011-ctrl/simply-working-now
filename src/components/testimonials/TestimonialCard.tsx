import { Star, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/contexts/LanguageContext";
import type { Testimonial } from "@/data/testimonials";

interface Props { testimonial: Testimonial; }

export const TestimonialCard = ({ testimonial }: Props) => {
  const { language, t, isRTL } = useLanguage();
  const lang = language as Language;
  const review = testimonial.review?.[lang] ?? "";
  const rentalType = testimonial.rentalType[lang];
  const trip = testimonial.tripDetail?.[lang];
  const arrow = isRTL ? "←" : "→";

  return (
    <article
      className="break-inside-avoid mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
      role="listitem"
      aria-label={`Testimonial from ${testimonial.name}, ${testimonial.city}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {testimonial.avatarUrl && (
            <img
              src={testimonial.avatarUrl}
              alt={`${testimonial.name}, Motonita renter from ${testimonial.city}`}
              loading="lazy"
              decoding="async"
              className="h-11 w-11 rounded-full object-cover ring-2 ring-background"
            />
          )}
          <div className="text-start">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{testimonial.name}</h3>
            <p className="text-xs text-muted-foreground">{testimonial.city}</p>
          </div>
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
        <p className="mt-4 text-sm leading-relaxed text-foreground/80 text-start">
          {review}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
          {rentalType}
        </span>
        {trip && (
          <span className="text-[11px] text-muted-foreground">
            {trip.includes("→") ? trip.replace("→", arrow) : trip}
          </span>
        )}
        {testimonial.verified && (
          <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <BadgeCheck className="h-3 w-3" />
            {t("testimonials.verified")}
          </span>
        )}
      </div>
    </article>
  );
};
