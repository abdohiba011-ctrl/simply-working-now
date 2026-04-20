import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Info,
  ChevronRight,
  ArrowLeft,
  Clock,
  MapPin,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DESIGN RATIONALE
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Warning is AMBER (not red): red signals failure/danger; amber signals
 *    "pay attention, important info." Red here would feel hostile to a user
 *    who hasn't done anything wrong yet.
 *  • Required checkbox: prevents misunderstanding-driven chargebacks. The
 *    user must perform a deliberate action to acknowledge the no-refund rule.
 *  • Fee uses a TABLE LAYOUT (label … dotted leaders … amount): mirrors a
 *    receipt — a familiar, trusted financial pattern. Total uses the largest
 *    number on the page so it's the visual anchor.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BOOKING_FEE = 10;

const formatCurrency = (amount: number, locale: string) => {
  const formatted = new Intl.NumberFormat(
    locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  ).format(amount);
  return `${formatted} DH`;
};

const BookingFee = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isRtl = language === "ar";
  const [acknowledged, setAcknowledged] = useState(false);

  const totalFormatted = useMemo(
    () => formatCurrency(BOOKING_FEE, language),
    [language],
  );

  // Mock booking summary — in production, comes from previous step's state
  const booking = {
    fixerName: "Hassan El Amrani",
    fixerAvatar: "https://i.pravatar.cc/128?img=12",
    service: t("bookingFee.mock.service"),
    location: t("bookingFee.mock.location"),
    eta: t("bookingFee.mock.eta"),
  };

  const checkItems = [
    "bookingFee.checklist.location",
    "bookingFee.checklist.service",
    "bookingFee.checklist.specialty",
    "bookingFee.checklist.eta",
    "bookingFee.checklist.phone",
  ];

  const noRefundCases = [
    "bookingFee.cases.cancellation",
    "bookingFee.cases.noShow",
    "bookingFee.cases.changedMind",
    "bookingFee.cases.wrongService",
  ];

  const faqs = [
    { q: "bookingFee.faq.q1", a: "bookingFee.faq.a1" },
    { q: "bookingFee.faq.q2", a: "bookingFee.faq.a2" },
    { q: "bookingFee.faq.q3", a: "bookingFee.faq.a3" },
    { q: "bookingFee.faq.q4", a: "bookingFee.faq.a4" },
    { q: "bookingFee.faq.q5", a: "bookingFee.faq.a5" },
  ];

  const handleConfirm = () => {
    if (!acknowledged) return;
    // Navigate to payment step
    navigate("/checkout");
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Header />

      <main className="flex-1 pb-32 md:pb-12">
        <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl">
          {/* Breadcrumb */}
          <nav
            aria-label="breadcrumb"
            className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4"
          >
            <Link to="/" className="hover:text-foreground transition-colors">
              {t("bookingFee.breadcrumb.home")}
            </Link>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")}
              aria-hidden="true"
            />
            <Link to="/fixers" className="hover:text-foreground transition-colors">
              {t("bookingFee.breadcrumb.bookFixer")}
            </Link>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")}
              aria-hidden="true"
            />
            <span className="text-foreground font-medium">
              {t("bookingFee.breadcrumb.feeTerms")}
            </span>
          </nav>

          {/* Title */}
          <header className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
                {t("bookingFee.title")}
              </h1>
              <Badge variant="secondary" className="text-xs font-medium">
                {t("bookingFee.step")}
              </Badge>
            </div>
            <p className="text-muted-foreground">{t("bookingFee.subtitle")}</p>

            {/* Progress steps */}
            <ol className="flex items-center gap-2 mt-4 text-xs">
              <ProgressDot label={t("bookingFee.steps.select")} state="done" />
              <ProgressLine state="done" />
              <ProgressDot label={t("bookingFee.steps.review")} state="active" />
              <ProgressLine state="todo" />
              <ProgressDot label={t("bookingFee.steps.pay")} state="todo" />
            </ol>
          </header>

          {/* Booking summary mini-card */}
          <Card className="rounded-2xl border-border/60 mb-6">
            <CardContent className="p-4 md:p-5 flex items-center gap-4">
              <img
                src={booking.fixerAvatar}
                alt={booking.fixerName}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {booking.fixerName}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                    {booking.service}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {booking.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {booking.eta}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee breakdown — most prominent element */}
          <Card className="rounded-2xl border-2 border-primary/30 shadow-sm mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 mb-3">
                  <ShieldCheck
                    className="h-6 w-6 text-primary"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-lg md:text-xl font-semibold text-foreground">
                  {t("bookingFee.breakdown.title")}
                </h2>
              </div>

              {/* Receipt-style rows */}
              <dl className="space-y-3 text-base">
                <FeeRow
                  label={t("bookingFee.breakdown.bookingFee")}
                  value={totalFormatted}
                />
                <FeeRow
                  label={t("bookingFee.breakdown.repairCost")}
                  value={t("bookingFee.breakdown.paidDirectly")}
                  muted
                />
                <FeeRow
                  label={t("bookingFee.breakdown.platformService")}
                  value={t("bookingFee.breakdown.included")}
                  muted
                />
              </dl>

              <div className="border-t border-border my-5" />

              <div className="flex items-baseline justify-between">
                <dt className="font-semibold text-foreground">
                  {t("bookingFee.breakdown.totalDueNow")}
                </dt>
                <dd className="text-3xl md:text-5xl font-bold text-primary tabular-nums">
                  {totalFormatted}
                </dd>
              </div>

              <p className="text-sm text-muted-foreground mt-4 text-center max-w-md mx-auto">
                {t("bookingFee.breakdown.microcopy")}
              </p>
            </CardContent>
          </Card>

          {/* No-refund notice — amber, sticky-visible on desktop */}
          <div
            role="alert"
            className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 border ltr:border-l-4 rtl:border-r-4 ltr:border-l-amber-500 rtl:border-r-amber-500 p-5 md:p-6 mb-6"
          >
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle
                className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                  {t("bookingFee.noRefund.title")}
                </h3>
                <p className="text-sm text-amber-900/90 dark:text-amber-100/90 mt-1 leading-relaxed">
                  {t("bookingFee.noRefund.body")}
                </p>
              </div>
            </div>

            <ul className="space-y-2 mt-4 ltr:pl-9 rtl:pr-9">
              {noRefundCases.map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100"
                >
                  <XCircle
                    className="h-4 w-4 text-red-500 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>

            {/* Exception block */}
            <div className="mt-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4 flex gap-3">
              <Info
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-sm text-emerald-900 dark:text-emerald-100">
                <span className="font-semibold">
                  {t("bookingFee.noRefund.exceptionLabel")}
                </span>{" "}
                {t("bookingFee.noRefund.exception")}
              </p>
            </div>
          </div>

          {/* Read carefully checklist */}
          <Card className="rounded-2xl border-border/60 mb-6">
            <CardContent className="p-5 md:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {t("bookingFee.checklist.title")}
              </h3>
              <ul className="space-y-3">
                {checkItems.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <CheckCircle2
                      className="h-5 w-5 text-primary shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-5 ltr:border-l-2 rtl:border-r-2 border-amber-500/60 ltr:pl-3 rtl:pr-3 italic">
                {t("bookingFee.checklist.note")}
              </p>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="rounded-2xl border-border/60 mb-6">
            <CardContent className="p-5 md:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {t("bookingFee.faq.title")}
              </h3>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, idx) => (
                  <AccordionItem key={faq.q} value={`item-${idx}`}>
                    <AccordionTrigger className="text-start text-sm font-medium hover:no-underline">
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

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <AcknowledgmentBlock
              acknowledged={acknowledged}
              onToggle={setAcknowledged}
              total={totalFormatted}
              onConfirm={handleConfirm}
              onBack={() => navigate(-1)}
            />
          </div>
        </div>
      </main>

      {/* Mobile sticky footer */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <AcknowledgmentBlock
          acknowledged={acknowledged}
          onToggle={setAcknowledged}
          total={totalFormatted}
          onConfirm={handleConfirm}
          onBack={() => navigate(-1)}
          compact
        />
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────── */

const FeeRow = ({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) => (
  <div className="flex items-baseline gap-3">
    <dt className="text-foreground">{label}</dt>
    <span
      className="flex-1 border-b border-dotted border-border/70 translate-y-[-4px]"
      aria-hidden="true"
    />
    <dd
      className={cn(
        "tabular-nums font-medium",
        muted ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {value}
    </dd>
  </div>
);

const ProgressDot = ({
  label,
  state,
}: {
  label: string;
  state: "done" | "active" | "todo";
}) => (
  <li className="flex items-center gap-1.5">
    <span
      className={cn(
        "h-2 w-2 rounded-full",
        state === "done" && "bg-primary",
        state === "active" && "bg-primary ring-4 ring-primary/20",
        state === "todo" && "bg-muted-foreground/30",
      )}
      aria-hidden="true"
    />
    <span
      className={cn(
        state === "active" || state === "done"
          ? "text-foreground font-medium"
          : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  </li>
);

const ProgressLine = ({ state }: { state: "done" | "todo" }) => (
  <li
    className={cn(
      "flex-1 h-px max-w-12",
      state === "done" ? "bg-primary" : "bg-border",
    )}
    aria-hidden="true"
  />
);

const AcknowledgmentBlock = ({
  acknowledged,
  onToggle,
  total,
  onConfirm,
  onBack,
  compact = false,
}: {
  acknowledged: boolean;
  onToggle: (v: boolean) => void;
  total: string;
  onConfirm: () => void;
  onBack: () => void;
  compact?: boolean;
}) => {
  const { t } = useLanguage();
  return (
    <div className={cn(!compact && "rounded-2xl border border-border/60 bg-card p-5 md:p-6")}>
      <label
        htmlFor="ack"
        className="flex items-start gap-3 cursor-pointer mb-4 group"
      >
        <Checkbox
          id="ack"
          checked={acknowledged}
          onCheckedChange={(v) => onToggle(v === true)}
          className="mt-0.5 min-h-[20px] min-w-[20px]"
        />
        <span className="text-sm text-foreground leading-snug select-none">
          {t("bookingFee.ack.label")}
        </span>
      </label>

      <div className={cn("flex gap-3", compact ? "flex-col" : "flex-col sm:flex-row")}>
        <Button
          size="lg"
          disabled={!acknowledged}
          onClick={onConfirm}
          className="flex-1 min-h-[48px] font-semibold"
        >
          {t("bookingFee.cta.confirm")} {total}
        </Button>
        {!compact && (
          <Button
            size="lg"
            variant="outline"
            onClick={onBack}
            className="min-h-[48px] gap-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("bookingFee.cta.back")}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        {t("bookingFee.cta.terms")}
      </p>
    </div>
  );
};

export default BookingFee;
