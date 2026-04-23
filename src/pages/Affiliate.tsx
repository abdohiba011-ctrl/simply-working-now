import { useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Link as LinkIcon, Send, Gift, Wallet, Zap, ShieldCheck, Calendar, Check, X } from "lucide-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthStore } from "@/stores/useAuthStore";

// Brand tokens — kept inline (HSL) so the page stays self-contained even if
// `tailwind.config.ts` doesn't yet expose forest/lime semantic tokens.
const LIME_BG = "hsl(96 73% 67%)"; // #9FE870
const FOREST = "hsl(89 100% 10%)"; // #163300

const Affiliate = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const referralRef = useRef<HTMLDivElement | null>(null);

  // Set <html lang> per current language (also handled by LanguageContext,
  // but we keep this here as a defensive override for SEO crawlers).
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const faqItems = useMemo(
    () => [
      { q: t("referPage.faq_q1"), a: t("referPage.faq_a1") },
      { q: t("referPage.faq_q2"), a: t("referPage.faq_a2") },
      { q: t("referPage.faq_q3"), a: t("referPage.faq_a3") },
      { q: t("referPage.faq_q4"), a: t("referPage.faq_a4") },
      { q: t("referPage.faq_q5"), a: t("referPage.faq_a5") },
      { q: t("referPage.faq_q6"), a: t("referPage.faq_a6") },
      { q: t("referPage.faq_q7"), a: t("referPage.faq_a7") },
      { q: t("referPage.faq_q8"), a: t("referPage.faq_a8") },
    ],
    [t],
  );

  const faqJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    }),
    [faqItems],
  );

  const handleGetLink = () => {
    if (!isAuthenticated) {
      navigate("/signup?redirect=/affiliate");
      return;
    }
    if (referralRef.current) {
      referralRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    toast({ description: t("referPage.toast_placeholder") });
  };

  const steps = [
    { num: "1", Icon: LinkIcon, title: t("referPage.step1_title"), desc: t("referPage.step1_desc") },
    { num: "2", Icon: Send, title: t("referPage.step2_title"), desc: t("referPage.step2_desc") },
    { num: "3", Icon: Gift, title: t("referPage.step3_title"), desc: t("referPage.step3_desc") },
  ];

  const benefits = [
    { Icon: Wallet, title: t("referPage.b1_title"), desc: t("referPage.b1_desc") },
    { Icon: Zap, title: t("referPage.b2_title"), desc: t("referPage.b2_desc") },
    { Icon: ShieldCheck, title: t("referPage.b3_title"), desc: t("referPage.b3_desc") },
    { Icon: Calendar, title: t("referPage.b4_title"), desc: t("referPage.b4_desc") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{t("referPage.meta_title")}</title>
        <meta name="description" content={t("referPage.meta_desc")} />
        <html lang={language} />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* ============ SECTION 1 — HERO ============ */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-[900px] text-center">
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: LIME_BG, color: FOREST }}
              >
                {t("referPage.pill")}
              </span>

              <h1
                className="mt-6 text-3xl md:text-5xl font-bold leading-tight"
                style={{ color: FOREST }}
              >
                {t("referPage.h1")}
              </h1>

              <p className="mx-auto mt-5 max-w-[600px] text-base md:text-lg text-muted-foreground">
                {t("referPage.subhead")}
              </p>

              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleGetLink}
                  className="h-11 rounded-md px-6 text-base font-semibold shadow-sm transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: LIME_BG, color: FOREST }}
                >
                  {t("referPage.cta_primary")}
                </button>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {t("referPage.cta_caption")}
              </p>
            </div>
          </div>
        </section>

        {/* ============ SECTION 2 — HOW IT WORKS ============ */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl font-bold" style={{ color: FOREST }}>
                {t("referPage.how_title")}
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                {t("referPage.how_sub")}
              </p>
            </div>

            <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-3">
              {steps.map(({ num, Icon, title, desc }) => (
                <div
                  key={num}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold"
                      style={{ backgroundColor: LIME_BG, color: FOREST }}
                    >
                      {num}
                    </span>
                    <Icon className="h-6 w-6" style={{ color: FOREST }} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: FOREST }}>
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ SECTION 3 — BENEFITS ============ */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl font-bold" style={{ color: FOREST }}>
                {t("referPage.benefits_title")}
              </h2>
            </div>

            <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-2">
              {benefits.map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${LIME_BG}` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: FOREST }} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: FOREST }}>
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ SECTION 4 — CREDIT EXPLAINER ============ */}
        <section className="py-12 md:py-16" style={{ backgroundColor: FOREST }}>
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold text-white">
              {t("referPage.credits_title")}
            </h2>

            <div className="mx-auto mt-10 grid max-w-[1100px] gap-10 md:grid-cols-2 md:items-center">
              {/* Left — explainer text */}
              <div className="text-white/90 space-y-5">
                <p className="text-base leading-relaxed">{t("referPage.credits_intro")}</p>

                <div>
                  <p className="font-semibold text-white">{t("referPage.credits_are")}</p>
                  <ul className="mt-2 space-y-2">
                    {[
                      t("referPage.credits_are_1"),
                      t("referPage.credits_are_2"),
                      t("referPage.credits_are_3"),
                      t("referPage.credits_are_4"),
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm">
                        <Check
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isRTL ? "ml-1" : "mr-1"}`}
                          style={{ color: LIME_BG }}
                          aria-hidden
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-white">{t("referPage.credits_arent")}</p>
                  <ul className="mt-2 space-y-2">
                    {[
                      t("referPage.credits_arent_1"),
                      t("referPage.credits_arent_2"),
                      t("referPage.credits_arent_3"),
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm">
                        <X
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isRTL ? "ml-1" : "mr-1"} text-white/60`}
                          aria-hidden
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right — credit balance card */}
              <div className="flex justify-center">
                <div
                  className="w-full max-w-sm rounded-2xl p-8 shadow-xl"
                  style={{ backgroundColor: LIME_BG, color: FOREST }}
                  role="img"
                  aria-label="Sample credit balance card"
                >
                  <p className="text-sm font-medium opacity-80">
                    {t("referPage.credit_card_label")}
                  </p>
                  <p className="mt-2 text-5xl font-bold tracking-tight">80 MAD</p>
                  <p className="mt-2 text-sm opacity-80">{t("referPage.credit_card_sub")}</p>
                  <p className="mt-6 text-xs opacity-70">{t("referPage.credit_card_expiry")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SECTION 5 — FAQ ============ */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-[800px]">
              <h2
                className="text-center text-3xl font-bold mb-8"
                style={{ color: FOREST }}
              >
                {t("referPage.faq_title")}
              </h2>

              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((it, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-start text-base font-semibold">
                      {it.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {it.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Anchor for the (future) referral code section */}
        <div ref={referralRef} aria-hidden />

        {/* ============ SECTION 6 — FINAL CTA ============ */}
        <section className="py-12 md:py-20" style={{ backgroundColor: LIME_BG }}>
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold" style={{ color: FOREST }}>
              {t("referPage.cta_title")}
            </h2>
            <p className="mx-auto mt-4 max-w-[600px] text-lg" style={{ color: FOREST, opacity: 0.8 }}>
              {t("referPage.cta_sub")}
            </p>

            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleGetLink}
                className="h-11 rounded-md px-8 font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: FOREST }}
              >
                {t("referPage.cta_primary")}
              </Button>
            </div>

            <p className="mt-4 text-sm" style={{ color: FOREST, opacity: 0.7 }}>
              {t("referPage.cta_help")}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Affiliate;
