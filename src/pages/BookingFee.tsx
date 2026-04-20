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
  Calendar,
  MapPin,
  Bike,
  Star,
  BadgeCheck,
  Fuel,
  Clock,
  HardHat,
  Ban,
  Pencil,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DESIGN RATIONALE
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Bike hero card first: the user must instantly recognize what they're
 *    renting — photo + model + agency + verified badge.
 *  • Two-total layout in price breakdown (pay NOW vs pay AT PICKUP) prevents
 *    sticker shock and matches Turo / Booking.com mental models.
 *  • Amber (not red) warning for the no-refund clause: red signals failure;
 *    amber signals "important info, pay attention" — calmer and trust-building.
 *  • Required acknowledgment checkbox: deliberate action eliminates the
 *    "I didn't read" chargeback excuse.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const RESERVATION_FEE = 10;
const DAILY_RATE = 250;
const RENTAL_DAYS = 3;
const DEPOSIT = 1500;
const RENTAL_SUBTOTAL = DAILY_RATE * RENTAL_DAYS;

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

  const reservationFmt = useMemo(() => formatCurrency(RESERVATION_FEE, language), [language]);
  const dailyRateFmt = useMemo(() => formatCurrency(DAILY_RATE, language), [language]);
  const subtotalFmt = useMemo(() => formatCurrency(RENTAL_SUBTOTAL, language), [language]);
  const depositFmt = useMemo(() => formatCurrency(DEPOSIT, language), [language]);

  // Mock booking — in production, comes from previous step state
  const bike = {
    name: "Yamaha MT-07 (2023)",
    image:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&auto=format&fit=crop&q=70",
    engine: "689cc",
    transmission: t("bookingFee.bike.manual"),
    type: t("bookingFee.bike.sport"),
    licenseRequired: "A",
    agencyName: "Ana Agency Rentals",
    agencyLocation: t("bookingFee.bike.agencyLocation"),
    rating: 4.8,
    reviewCount: 213,
  };

  const rental = {
    pickupDate: t("bookingFee.rental.pickupDateValue"),
    returnDate: t("bookingFee.rental.returnDateValue"),
    duration: t("bookingFee.rental.durationValue"),
    pickupLocation: bike.agencyLocation,
    returnLocation: t("bookingFee.rental.sameAsPickup"),
  };

  const noRefundCases = [
    "bookingFee.cases.cancellation",
    "bookingFee.cases.noShow",
    "bookingFee.cases.wrongDates",
    "bookingFee.cases.changedMind",
  ];

  const pickupRequirements = [
    "bookingFee.pickup.license",
    "bookingFee.pickup.idPassport",
    "bookingFee.pickup.deposit",
    "bookingFee.pickup.confirmation",
  ];

  const verifyChecklist = [
    "bookingFee.verify.bike",
    "bookingFee.verify.dates",
    "bookingFee.verify.location",
    "bookingFee.verify.license",
    "bookingFee.verify.phone",
  ];

  const policyHighlights: { icon: typeof ShieldCheck; key: string }[] = [
    { icon: ShieldCheck, key: "bookingFee.policy.insurance" },
    { icon: Fuel, key: "bookingFee.policy.fuel" },
    { icon: MapPin, key: "bookingFee.policy.geo" },
    { icon: Clock, key: "bookingFee.policy.late" },
    { icon: HardHat, key: "bookingFee.policy.helmet" },
    { icon: Ban, key: "bookingFee.policy.offroad" },
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
            <Link to="/listings" className="hover:text-foreground transition-colors">
              {t("bookingFee.breadcrumb.browse")}
            </Link>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")}
              aria-hidden="true"
            />
            <span className="text-foreground font-medium">
              {t("bookingFee.breadcrumb.details")}
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

            <ol className="flex items-center gap-2 mt-4 text-xs">
              <ProgressDot label={t("bookingFee.steps.choose")} state="done" />
              <ProgressLine state="done" />
              <ProgressDot label={t("bookingFee.steps.review")} state="active" />
              <ProgressLine state="todo" />
              <ProgressDot label={t("bookingFee.steps.pay")} state="todo" />
            </ol>
          </header>

          {/* BIKE SUMMARY CARD */}
          <Card className="rounded-2xl border-border/60 mb-6 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative aspect-video md:aspect-auto md:min-h-[260px] bg-muted">
                  <img
                    src={bike.image}
                    alt={bike.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-5 md:p-6 space-y-3">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      {bike.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="font-normal">
                        {bike.engine}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        {bike.transmission}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        {bike.type}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        {t("bookingFee.bike.licenseLabel")} {bike.licenseRequired}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {bike.agencyName}
                      </span>
                      <BadgeCheck
                        className="h-4 w-4 text-primary"
                        aria-label={t("bookingFee.bike.verifiedAgency")}
                      />
                      <span className="text-xs text-primary font-medium">
                        {t("bookingFee.bike.verifiedAgency")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                      <span className="font-medium text-foreground">
                        {bike.rating.toFixed(1)}
                      </span>
                      <span>
                        ({bike.reviewCount} {t("bookingFee.bike.reviews")})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {bike.agencyLocation}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RENTAL DETAILS */}
          <Card className="rounded-2xl border-border/60 mb-6">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
                  {t("bookingFee.rental.title")}
                </h3>
                <Link
                  to="/listings"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("bookingFee.rental.edit")}
                </Link>
              </div>

              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <RentalRow label={t("bookingFee.rental.pickup")} value={rental.pickupDate} />
                <RentalRow label={t("bookingFee.rental.return")} value={rental.returnDate} />
                <RentalRow label={t("bookingFee.rental.duration")} value={rental.duration} />
                <RentalRow label={t("bookingFee.rental.dailyRate")} value={`${dailyRateFmt}/${t("bookingFee.rental.day")}`} />
                <RentalRow label={t("bookingFee.rental.pickupLocation")} value={rental.pickupLocation} />
                <RentalRow label={t("bookingFee.rental.returnLocation")} value={rental.returnLocation} />
              </dl>
            </CardContent>
          </Card>

          {/* PRICE BREAKDOWN */}
          <Card className="rounded-2xl border-2 border-primary/30 shadow-sm mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 mb-3">
                  <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold text-foreground">
                  {t("bookingFee.breakdown.title")}
                </h2>
              </div>

              <dl className="space-y-3 text-base">
                <FeeRow
                  label={`${t("bookingFee.breakdown.dailyRate")} × ${RENTAL_DAYS} ${t("bookingFee.rental.days")}`}
                  value={subtotalFmt}
                />
                <FeeRow
                  label={t("bookingFee.breakdown.insurance")}
                  value={t("bookingFee.breakdown.included")}
                  muted
                />
                <FeeRow
                  label={t("bookingFee.breakdown.deposit")}
                  value={depositFmt}
                  muted
                />
                <FeeRow
                  label={t("bookingFee.breakdown.reservationFee")}
                  value={reservationFmt}
                />
              </dl>

              <div className="border-t border-border my-5" />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    {t("bookingFee.breakdown.payAtPickup")}
                  </p>
                  <p className="text-xl font-bold text-foreground tabular-nums mt-1">
                    {subtotalFmt}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    + {depositFmt} {t("bookingFee.breakdown.depositNote")}
                  </p>
                </div>
                <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
                  <p className="text-xs text-primary uppercase tracking-wide font-semibold">
                    {t("bookingFee.breakdown.payNow")}
                  </p>
                  <p className="text-3xl md:text-4xl font-bold text-primary tabular-nums mt-1">
                    {reservationFmt}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4 text-center max-w-xl mx-auto">
                {t("bookingFee.breakdown.microcopy")}
              </p>
            </CardContent>
          </Card>

          {/* NO-REFUND NOTICE */}
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
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>

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

          {/* PICKUP REQUIREMENTS */}
          <Card className="rounded-2xl border-border/60 mb-6">
            <CardContent className="p-5 md:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {t("bookingFee.pickup.title")}
              </h3>
              <ul className="space-y-3">
                {pickupRequirements.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <CheckCircle2
                      className="h-5 w-5 text-primary shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 flex gap-2.5">
                <AlertTriangle
                  className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-xs text-amber-900 dark:text-amber-100">
                  {t("bookingFee.pickup.note")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* POLICY HIGHLIGHTS */}
          <Card className="rounded-2xl border-border/60 mb-6">
            <CardContent className="p-5 md:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {t("bookingFee.policy.title")}
              </h3>
              <ul className="grid sm:grid-cols-2 gap-3">
                {policyHighlights.map(({ icon: Icon, key }) => (
                  <li
                    key={key}
                    className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3"
                  >
                    <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-sm text-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* DOUBLE-CHECK BEFORE CONFIRM */}
          <Card className="rounded-2xl border-border/60 mb-6">
            <CardContent className="p-5 md:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {t("bookingFee.verify.title")}
              </h3>
              <ul className="space-y-3">
                {verifyChecklist.map((key) => (
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
                {t("bookingFee.verify.note")}
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
              total={reservationFmt}
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
          total={reservationFmt}
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

/* ──────────────────────────────────────────── */

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

const RentalRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
      {label}
    </dt>
    <dd className="text-foreground font-medium mt-0.5">{value}</dd>
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
