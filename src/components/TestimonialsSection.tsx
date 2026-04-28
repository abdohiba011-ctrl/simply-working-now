import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { testimonials, type Testimonial, type TestimonialType } from "@/data/testimonials";
import { TestimonialCard } from "@/components/testimonials/TestimonialCard";
import { AudioTestimonialCard } from "@/components/testimonials/AudioTestimonialCard";
import { VideoTestimonialCard } from "@/components/testimonials/VideoTestimonialCard";
import { PortraitTestimonialCard } from "@/components/testimonials/PortraitTestimonialCard";
import { VideoLightbox } from "@/components/testimonials/VideoLightbox";

type FilterKey = "all" | "text" | "audio" | "video";

const matches = (filter: FilterKey, type: TestimonialType) => {
  if (filter === "all") return true;
  if (filter === "text") return type === "text" || type === "portrait";
  return type === filter;
};

export const TestimonialsSection = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [activeVideo, setActiveVideo] = useState<Testimonial | null>(null);

  const visible = useMemo(
    () => testimonials.filter((x) => matches(filter, x.type)),
    [filter]
  );

  const renderCard = (item: Testimonial) => {
    switch (item.type) {
      case "audio":
        return <AudioTestimonialCard key={item.id} testimonial={item} />;
      case "video":
        return (
          <VideoTestimonialCard key={item.id} testimonial={item} onOpen={setActiveVideo} />
        );
      case "portrait":
        return <PortraitTestimonialCard key={item.id} testimonial={item} />;
      case "text":
      default:
        return <TestimonialCard key={item.id} testimonial={item} />;
    }
  };

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="py-14 sm:py-20 bg-gradient-to-b from-background to-secondary/20"
    >
      <div className="container mx-auto px-4">
        <header className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {t("testimonials.trustBadge")}
          </span>
          <h2
            id="testimonials-heading"
            className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground"
          >
            {t("testimonials.title")}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            {t("testimonials.subtitle")}
          </p>
        </header>

        <div className="mt-8 flex justify-center">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <TabsList className="h-11 rounded-full bg-card border border-border p-1 shadow-sm">
              <TabsTrigger value="all" className="rounded-full px-4">{t("testimonials.tabs.all")}</TabsTrigger>
              <TabsTrigger value="text" className="rounded-full px-4">{t("testimonials.tabs.text")}</TabsTrigger>
              <TabsTrigger value="audio" className="rounded-full px-4">{t("testimonials.tabs.audio")}</TabsTrigger>
              <TabsTrigger value="video" className="rounded-full px-4">{t("testimonials.tabs.video")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div
          role="list"
          className="mt-10 columns-1 md:columns-2 lg:columns-3 gap-6 [&>*]:break-inside-avoid"
        >
          {visible.map(renderCard)}
        </div>

        {/* Final CTA */}
        <div className="mt-14 mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 sm:p-10 text-center shadow-sm">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("testimonials.cta.title")}
          </h3>
          <p className="mt-2 text-muted-foreground">{t("testimonials.cta.text")}</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link to="/listings">{t("testimonials.cta.primary")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <Link to="/#how-it-works">{t("testimonials.cta.secondary")}</Link>
            </Button>
          </div>
        </div>
      </div>

      <VideoLightbox testimonial={activeVideo} onClose={() => setActiveVideo(null)} />
    </section>
  );
};
