import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Info,
  Lock,
  Handshake,
  ShieldCheck,
  Coins,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Coffee,
  Bike,
  LifeBuoy,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DESIGN RATIONALE
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Purely educational page — no CTAs, no checkboxes, no payment actions.
 *    The reader should leave informed, not pressured.
 *  • Amber (not red) for the non-refundable section: red triggers a "danger"
 *    response; amber says "important, please read" — calmer and trust-building.
 *  • 3-card layout for "what the fee covers": three is the magic number for
 *    scannability — fewer feels thin, more feels overwhelming.
 *  • The "10 DH" numeral is the visual anchor in the hero — bold and large
 *    so the reader anchors on the actual amount immediately.
 *  • Soft footer links (browse / contact) instead of a primary CTA — this
 *    page is a destination, not a funnel step.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BookingFeeInfo = () => {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";

  const covers = [
    { icon: Lock, key: "bookingFeeInfo.covers.reserve" },
    { icon: Handshake, key: "bookingFeeInfo.covers.confirm" },
    { icon: ShieldCheck, key: "bookingFeeInfo.covers.protect" },
  ];

  const isNot = [
    "bookingFeeInfo.isNot.partOfRental",
    "bookingFeeInfo.isNot.deposit",
    "bookingFeeInfo.isNot.hidden",
    "bookingFeeInfo.isNot.profit",
  ];

  const refundCases = [
    "bookingFeeInfo.refundCases.agencyCancels",
    "bookingFeeInfo.refundCases.unavailable",
    "bookingFeeInfo.refundCases.notWorking",
  ];

  const breakdown = [
    {
      label: "bookingFeeInfo.breakdown.bookingFee",
      value: "10 DH",
      sub: "bookingFeeInfo.breakdown.paidOnline",
      accent: true,
    },
    {
      label: "bookingFeeInfo.breakdown.dailyRental",
      value: "≈ 250 DH/day",
      sub: "bookingFeeInfo.breakdown.atPickup",
    },
    {
      label: "bookingFeeInfo.breakdown.deposit",
      value: "≈ 1,500 DH",
      sub: "bookingFeeInfo.breakdown.refundable",
    },
  ];

  const faqs = Array.from({ length: 6 }, (_, i) => ({
    q: `bookingFeeInfo.faq.q${i + 1}`,
    a: `bookingFeeInfo.faq.a${i + 1}`,
  }));

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Breadcrumb */}
          <nav
            aria-label="breadcrumb"
            className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6"
          >
            <Link to="/" className="hover:text-foreground transition-colors">
              {t("bookingFeeInfo.breadcrumb.home")}
            </Link>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              {t("bookingFeeInfo.breadcrumb.help")}
            </span>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")}
              aria-hidden="true"
            />
            <span className="text-foreground font-medium">
              {t("bookingFeeInfo.breadcrumb.fee")}
            </span>
          </nav>

          {/* Header */}
          <header className="mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 mb-4">
              <Info className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                {t("bookingFeeInfo.tag")}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              {t("bookingFeeInfo.title")}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-3 max-w-2xl">
              {t("bookingFeeInfo.subtitle")}
            </p>
          </header>

          {/* HERO — visual anchor */}
          <section className="mb-12 md:mb-16">
            <div className="rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-background border border-border/60 p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" aria-hidden="true" />
                  <div className="relative inline-flex h-28 w-28 md:h-32 md:w-32 items-center justify-center rounded-full bg-primary/15 border-4 border-primary/30">
                    <div className="flex flex-col items-center">
                      <Coins className="h-7 w-7 text-primary mb-0.5" aria-hidden="true" />
                      <span className="text-2xl md:text-3xl font-bold text-primary tabular-nums leading-none">
                        10
                      </span>
                      <span className="text-xs font-semibold text-primary/80 mt-0.5">
                        DH
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl md:text-2xl font-semibold text-foreground max-w-2xl mx-auto leading-snug">
                {t("bookingFeeInfo.hero.headline")}
              </p>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto">
                {t("bookingFeeInfo.hero.support")}
              </p>
            </div>
          </section>

          {/* WHAT IT COVERS — 3 cards */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              {t("bookingFeeInfo.covers.title")}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {covers.map(({ icon: Icon, key }) => (
                <Card key={key} className="rounded-2xl border-border/60">
                  <CardContent className="p-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                      <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {t(`${key}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`${key}.body`)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* WHAT IT IS NOT */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              {t("bookingFeeInfo.isNot.title")}
            </h2>
            <Card className="rounded-2xl border-border/60 bg-muted/30">
              <CardContent className="p-6 md:p-8">
                <ul className="space-y-3">
                  {isNot.map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <XCircle
                        className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="text-sm md:text-base text-foreground">
                        {t(key)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* IS IT REFUNDABLE — amber, not red */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              {t("bookingFeeInfo.refund.title")}
            </h2>

            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-6 md:p-8 mb-4">
              <p className="text-lg md:text-xl font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {t("bookingFeeInfo.refund.statement")}
              </p>
              <p className="text-sm md:text-base text-amber-900/90 dark:text-amber-100/90 leading-relaxed">
                {t("bookingFeeInfo.refund.explanation")}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-6 md:p-8">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3">
                {t("bookingFeeInfo.refund.whenTitle")}
              </h3>
              <ul className="space-y-2.5">
                {refundCases.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <CheckCircle2
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-sm md:text-base text-emerald-900 dark:text-emerald-100">
                      {t(key)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* WHY 10 DH */}
          <section className="mb-12 md:mb-16">
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  {t("bookingFeeInfo.why.title")}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed mb-4">
                  {t("bookingFeeInfo.why.body")}
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3 text-sm text-foreground">
                  <Coffee className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  <span>{t("bookingFeeInfo.why.comparison")}</span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* HOW IT FITS */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              {t("bookingFeeInfo.fits.title")}
            </h2>
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-6 md:p-8">
                <ul className="space-y-3">
                  {breakdown.map((row) => (
                    <li
                      key={row.label}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-xl border p-4",
                        row.accent
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-muted/20",
                      )}
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {t(row.label)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t(row.sub)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "tabular-nums font-bold whitespace-nowrap",
                          row.accent ? "text-primary text-xl" : "text-foreground",
                        )}
                      >
                        {row.value}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground mt-5 text-center italic">
                  {t("bookingFeeInfo.fits.note")}
                </p>
              </CardContent>
            </Card>
          </section>

          {/* FAQ */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              {t("bookingFeeInfo.faq.title")}
            </h2>
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-2 md:p-4">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, idx) => (
                    <AccordionItem key={faq.q} value={`item-${idx}`} className="px-4">
                      <AccordionTrigger className="text-start text-sm md:text-base font-medium hover:no-underline">
                        {t(faq.q)}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {t(faq.a)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* SOFT FOOTER — links, not CTAs */}
          <section className="mb-8">
            <div className="grid sm:grid-cols-2 gap-4">
              <Link
                to="/listings"
                className="group rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <Bike className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {t("bookingFeeInfo.footerLinks.browse")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("bookingFeeInfo.footerLinks.browseSub")}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors",
                      isRtl && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </div>
              </Link>

              <Link
                to="/contact"
                className="group rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <LifeBuoy className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {t("bookingFeeInfo.footerLinks.support")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("bookingFeeInfo.footerLinks.supportSub")}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors",
                      isRtl && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingFeeInfo;
