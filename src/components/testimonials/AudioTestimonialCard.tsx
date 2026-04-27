import { useEffect, useRef, useState } from "react";
import { Play, Pause, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/contexts/LanguageContext";
import type { Testimonial } from "@/data/testimonials";

interface Props { testimonial: Testimonial; }

// Module-level singleton so only one audio plays at a time
let activeAudio: HTMLAudioElement | null = null;

const formatDuration = (s?: number) => {
  if (!s) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const BARS = 28;

export const AudioTestimonialCard = ({ testimonial }: Props) => {
  const { language, t } = useLanguage();
  const lang = language as Language;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const hasAudio = Boolean(testimonial.audioUrl);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (activeAudio === audioRef.current) activeAudio = null;
      }
    };
  }, []);

  const toggle = () => {
    if (!hasAudio) return;
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      if (activeAudio === el) activeAudio = null;
    } else {
      if (activeAudio && activeAudio !== el) activeAudio.pause();
      el.play().then(() => {
        activeAudio = el;
        setPlaying(true);
      }).catch(() => setPlaying(false));
    }
  };

  return (
    <article
      className="break-inside-avoid mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      role="listitem"
      aria-label={`Audio testimonial from ${testimonial.name}, ${testimonial.city}`}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={!hasAudio}
          aria-label={playing ? t("testimonials.pauseAudio") : t("testimonials.playAudio")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ms-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-[3px] h-9" aria-hidden="true">
            {Array.from({ length: BARS }).map((_, i) => {
              // Stable pseudo-random heights based on index
              const h = 20 + ((i * 37) % 70);
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-full ${playing ? "bg-orange-500" : "bg-muted-foreground/30"} ${playing ? "animate-pulse" : ""}`}
                  style={{ height: `${h}%`, animationDelay: `${i * 30}ms` }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formatDuration(testimonial.durationSec)}</span>
            {!hasAudio && <span className="italic">{t("testimonials.audioComingSoon")}</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {testimonial.avatarUrl && (
            <img
              src={testimonial.avatarUrl}
              alt={`${testimonial.name}, Motonita renter from ${testimonial.city}`}
              loading="lazy"
              decoding="async"
              className="h-9 w-9 rounded-full object-cover"
            />
          )}
          <div className="text-start min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{testimonial.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {testimonial.city} · {testimonial.rentalType[lang]}
            </p>
          </div>
        </div>
        {testimonial.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <BadgeCheck className="h-3 w-3" />
            {t("testimonials.verified")}
          </span>
        )}
      </div>

      {hasAudio && (
        <audio
          ref={audioRef}
          src={testimonial.audioUrl}
          preload="none"
          onEnded={() => setPlaying(false)}
        />
      )}
    </article>
  );
};
