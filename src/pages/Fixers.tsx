import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wrench,
  MapPin,
  Star,
  Phone,
  Search,
  AlertTriangle,
  BadgeCheck,
  Clock,
  LayoutGrid,
  Map as MapIcon,
  Zap,
  Activity,
  WrenchIcon,
  Frown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DESIGN RATIONALE (top-3 UX decisions)
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. EMERGENCY CTA AT THE TOP — Stranded riders are panicked. We surface a
 *     single high-contrast "Auto-match nearest fixer" action above the fold so
 *     users don't have to think. The grid below is for users who want choice.
 *  2. DECISION-CRITICAL DATA ON THE CARD — Distance, ETA, response-time
 *     (color-coded), open-now status (pulsing dot) and price tier are all
 *     visible without a click. This collapses 6+ taps into a single scan.
 *  3. CALM, NOT FLASHY — No gradients-on-everything, no glassmorphism.
 *     Generous whitespace, slate typography, lime accent reserved for trust
 *     signals and primary CTAs. A stressed user needs clarity, not theatre.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Specialty =
  | "engine"
  | "tires"
  | "brakes"
  | "electrical"
  | "general"
  | "roadside";

type ResponseSpeed = "fast" | "medium" | "slow";
type OpenStatus = "open" | "closed" | "opens-soon";
type PriceTier = 1 | 2 | 3;

interface Fixer {
  id: string;
  name: string;
  avatar: string;
  specialty: Specialty;
  neighborhood: string;
  city: string;
  phone: string;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  rideMinutes: number;
  responseMinutes: number;
  openStatus: OpenStatus;
  opensAt?: string;
  priceTier: PriceTier;
  jobsCompleted: number;
  lastActiveMinutesAgo: number;
  coordinates: { lat: number; lng: number };
}

// Mock data — Moroccan mechanics across Casablanca & Rabat
const FIXERS: Fixer[] = [
  {
    id: "1",
    name: "Hassan El Amrani",
    avatar: "https://i.pravatar.cc/128?img=12",
    specialty: "engine",
    neighborhood: "Maarif",
    city: "Casablanca",
    phone: "+212600111222",
    rating: 4.9,
    reviewCount: 243,
    distanceKm: 1.4,
    rideMinutes: 5,
    responseMinutes: 12,
    openStatus: "open",
    priceTier: 2,
    jobsCompleted: 412,
    lastActiveMinutesAgo: 2,
    coordinates: { lat: 33.5892, lng: -7.6326 },
  },
  {
    id: "2",
    name: "Atelier Karim",
    avatar: "https://i.pravatar.cc/128?img=33",
    specialty: "tires",
    neighborhood: "Ain Diab",
    city: "Casablanca",
    phone: "+212600333444",
    rating: 4.8,
    reviewCount: 187,
    distanceKm: 2.3,
    rideMinutes: 8,
    responseMinutes: 18,
    openStatus: "open",
    priceTier: 1,
    jobsCompleted: 298,
    lastActiveMinutesAgo: 5,
    coordinates: { lat: 33.5979, lng: -7.6826 },
  },
  {
    id: "3",
    name: "Moto Fix Anfa",
    avatar: "https://i.pravatar.cc/128?img=68",
    specialty: "electrical",
    neighborhood: "Anfa",
    city: "Casablanca",
    phone: "+212600555666",
    rating: 4.9,
    reviewCount: 312,
    distanceKm: 3.1,
    rideMinutes: 11,
    responseMinutes: 25,
    openStatus: "open",
    priceTier: 2,
    jobsCompleted: 521,
    lastActiveMinutesAgo: 1,
    coordinates: { lat: 33.5854, lng: -7.6512 },
  },
  {
    id: "4",
    name: "Rapid Repair Bouskoura",
    avatar: "https://i.pravatar.cc/128?img=51",
    specialty: "brakes",
    neighborhood: "Bouskoura",
    city: "Casablanca",
    phone: "+212600777888",
    rating: 4.7,
    reviewCount: 94,
    distanceKm: 8.7,
    rideMinutes: 22,
    responseMinutes: 38,
    openStatus: "opens-soon",
    opensAt: "09:00",
    priceTier: 1,
    jobsCompleted: 156,
    lastActiveMinutesAgo: 45,
    coordinates: { lat: 33.4642, lng: -7.6502 },
  },
  {
    id: "5",
    name: "Pro Mécano Agdal",
    avatar: "https://i.pravatar.cc/128?img=14",
    specialty: "general",
    neighborhood: "Agdal",
    city: "Rabat",
    phone: "+212600999000",
    rating: 4.8,
    reviewCount: 201,
    distanceKm: 4.2,
    rideMinutes: 14,
    responseMinutes: 32,
    openStatus: "open",
    priceTier: 3,
    jobsCompleted: 367,
    lastActiveMinutesAgo: 8,
    coordinates: { lat: 33.9942, lng: -6.8498 },
  },
  {
    id: "6",
    name: "Speed Fix Hay Riad",
    avatar: "https://i.pravatar.cc/128?img=60",
    specialty: "roadside",
    neighborhood: "Hay Riad",
    city: "Rabat",
    phone: "+212600121314",
    rating: 4.9,
    reviewCount: 178,
    distanceKm: 5.6,
    rideMinutes: 17,
    responseMinutes: 48,
    openStatus: "closed",
    priceTier: 2,
    jobsCompleted: 289,
    lastActiveMinutesAgo: 120,
    coordinates: { lat: 33.9628, lng: -6.8503 },
  },
];

// Color tokens kept consistent with brand: lime primary, semantic colors via tailwind
const SPECIALTY_STYLES: Record<Specialty, string> = {
  engine: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  tires: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  brakes: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  electrical: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  general: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  roadside: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
};

const responseSpeed = (mins: number): ResponseSpeed => {
  if (mins < 20) return "fast";
  if (mins <= 40) return "medium";
  return "slow";
};

const Fixers = () => {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isRtl = language === "ar";

  const [view, setView] = useState<"grid" | "map">("grid");
  const [specialty, setSpecialty] = useState<Specialty | "all">("all");
  const [sortBy, setSortBy] = useState<"nearest" | "fastest" | "rating" | "price">(
    "nearest",
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Skeleton on first paint — perceived performance for a service users open in panic
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(id);
  }, []);

  const specialtyOptions: { key: Specialty | "all"; label: string }[] = [
    { key: "all", label: t("fixers.filters.all") },
    { key: "engine", label: t("fixers.engineRepair") },
    { key: "tires", label: t("fixers.tirePuncture") },
    { key: "brakes", label: t("fixers.brakesGears") },
    { key: "electrical", label: t("fixers.electricalBattery") },
    { key: "general", label: t("fixers.generalMaintenance") },
    { key: "roadside", label: t("fixers.roadsideAssistance") },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = FIXERS.filter((f) => {
      const matchesSpec = specialty === "all" || f.specialty === specialty;
      const matchesSearch =
        !q ||
        f.neighborhood.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q);
      return matchesSpec && matchesSearch;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "fastest":
          return a.responseMinutes - b.responseMinutes;
        case "rating":
          return b.rating - a.rating;
        case "price":
          return a.priceTier - b.priceTier;
        case "nearest":
        default:
          return a.distanceKm - b.distanceKm;
      }
    });
    return list;
  }, [specialty, search, sortBy]);

  const nearestOpen = filtered.find((f) => f.openStatus === "open") ?? filtered[0];

  const handleAutoMatch = () => {
    if (nearestOpen) {
      window.location.href = `tel:${nearestOpen.phone}`;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <Header />

      <main className="flex-1">
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-10 md:py-14">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 mb-4">
                <Wrench className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight mb-3">
                {t("fixers.title")}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                {t("fixers.subtitle")}
              </p>
            </div>

            {/* Emergency CTA — designed to be impossible to miss for stressed users */}
            <div className="max-w-3xl mx-auto mt-8">
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 md:p-5 flex flex-col md:flex-row items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex-1 text-center md:text-start">
                  <p className="font-semibold text-foreground">
                    {t("fixers.emergency.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("fixers.emergency.subtitle")}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleAutoMatch}
                  className="w-full md:w-auto min-h-[44px] gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {t("fixers.emergency.cta")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── STICKY FILTER BAR ───────────────────────────────────────────── */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-3 space-y-3">
            {/* Row 1: search + sort + view toggle */}
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("fixers.searchPlaceholder")}
                  className="ps-9 min-h-[44px]"
                  aria-label={t("fixers.searchPlaceholder")}
                />
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="min-h-[44px] md:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="nearest">{t("fixers.sort.nearest")}</SelectItem>
                    <SelectItem value="fastest">{t("fixers.sort.fastest")}</SelectItem>
                    <SelectItem value="rating">{t("fixers.sort.rating")}</SelectItem>
                    <SelectItem value="price">{t("fixers.sort.price")}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="inline-flex rounded-lg border bg-card p-1" role="tablist" aria-label="View toggle">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 min-h-[36px] text-sm font-medium transition-colors",
                      view === "grid"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={view === "grid"}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("fixers.view.grid")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("map")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 min-h-[36px] text-sm font-medium transition-colors",
                      view === "map"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={view === "map"}
                  >
                    <MapIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("fixers.view.map")}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: specialty pills — horizontally scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {specialtyOptions.map((opt) => {
                const active = specialty === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSpecialty(opt.key)}
                    className={cn(
                      "shrink-0 rounded-full px-4 min-h-[36px] text-sm font-medium border transition-all",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
                    )}
                    aria-pressed={active}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RESULTS ─────────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <>
                  <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                  {t("fixers.resultsCount")}
                </>
              )}
            </p>
          </div>

          {loading ? (
            <FixerGridSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState onReset={() => { setSpecialty("all"); setSearch(""); }} />
          ) : view === "grid" ? (
            <div className="relative">
              <div
                className={cn(
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-all",
                  !isAuthenticated && "blur-md pointer-events-none select-none",
                )}
                aria-hidden={!isAuthenticated}
              >
                {filtered.map((f) => (
                  <FixerCard key={f.id} fixer={f} />
                ))}
              </div>

              {!isAuthenticated && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="max-w-md w-full rounded-2xl border bg-card/95 backdrop-blur-sm shadow-xl p-6 md:p-8 text-center space-y-4">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 mx-auto">
                      <Lock className="h-7 w-7 text-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-semibold text-foreground">
                        {t("fixers.loginRequired.title")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("fixers.loginRequired.subtitle")}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                      <Button asChild size="lg" className="min-h-[44px]">
                        <Link to={`/auth?returnUrl=${encodeURIComponent("/fixers")}`}>
                          {t("fixers.loginRequired.login")}
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="min-h-[44px]">
                        <Link to={`/auth?returnUrl=${encodeURIComponent("/fixers")}`}>
                          {t("fixers.loginRequired.signup")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <FixerMap fixers={filtered} />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CARD                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

const FixerCard = ({ fixer }: { fixer: Fixer }) => {
  const { t } = useLanguage();
  const speed = responseSpeed(fixer.responseMinutes);

  // Response-time color: green/amber/red maps directly to user expectation.
  // We avoid the brand lime here so it doesn't compete with the primary CTA.
  const responseStyles: Record<ResponseSpeed, string> = {
    fast: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    slow: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };

  return (
    <Card className="group rounded-2xl border-border/60 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-foreground/20">
      <CardContent className="p-5 space-y-4">
        {/* Header: avatar + name + verified */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <img
              src={fixer.avatar}
              alt={fixer.name}
              className="h-16 w-16 rounded-full object-cover bg-muted"
              loading="lazy"
              onError={(e) => {
                // Fallback to wrench icon if avatar fails — never show broken image
                (e.currentTarget as HTMLImageElement).style.display = "none";
                const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "flex";
              }}
            />
            <div
              className="hidden h-16 w-16 rounded-full bg-primary/15 items-center justify-center"
              aria-hidden
            >
              <WrenchIcon className="h-7 w-7 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{fixer.name}</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label={t("fixers.verifiedTooltip")}>
                      <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {t("fixers.verifiedTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{fixer.rating}</span>
              <span className="text-muted-foreground">
                ({fixer.reviewCount} {t("fixers.reviews")})
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {fixer.jobsCompleted} {t("fixers.jobsCompleted")}
            </p>
          </div>
        </div>

        {/* Specialty + Price */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              SPECIALTY_STYLES[fixer.specialty],
            )}
          >
            {t(`fixers.${
              fixer.specialty === "engine" ? "engineRepair" :
              fixer.specialty === "tires" ? "tirePuncture" :
              fixer.specialty === "brakes" ? "brakesGears" :
              fixer.specialty === "electrical" ? "electricalBattery" :
              fixer.specialty === "general" ? "generalMaintenance" :
              "roadsideAssistance"
            }`)}
          </span>
          <PriceIndicator tier={fixer.priceTier} />
        </div>

        {/* Status row: open + response */}
        <div className="flex flex-wrap gap-2">
          <OpenStatusPill status={fixer.openStatus} opensAt={fixer.opensAt} />
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              responseStyles[speed],
            )}
          >
            <Activity className="h-3 w-3" />
            ~{fixer.responseMinutes} {t("fixers.minutes")}
          </span>
        </div>

        {/* Distance + last active */}
        <div className="space-y-1 text-sm">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${fixer.coordinates.lat},${fixer.coordinates.lng}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              {fixer.distanceKm} {t("fixers.kmAway")} · {fixer.rideMinutes}{" "}
              {t("fixers.minRide")} · {fixer.neighborhood}, {fixer.city}
            </span>
          </a>
          <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {t("fixers.lastActive")} {fixer.lastActiveMinutesAgo} {t("fixers.minAgo")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            asChild
            className="flex-1 min-h-[44px] font-semibold"
            disabled={fixer.openStatus === "closed"}
          >
            <Link to="/booking-fee">{t("fixers.requestRepair")}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            aria-label={`${t("fixers.call")} ${fixer.name}`}
          >
            <a href={`tel:${fixer.phone}`}>
              <Phone className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SUPPORTING COMPONENTS                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

const OpenStatusPill = ({ status, opensAt }: { status: OpenStatus; opensAt?: string }) => {
  const { t } = useLanguage();
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {t("fixers.status.open")}
      </span>
    );
  }
  if (status === "opens-soon") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
        <Clock className="h-3 w-3" />
        {t("fixers.status.opensAt")} {opensAt}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      {t("fixers.status.closed")}
    </span>
  );
};

const PriceIndicator = ({ tier }: { tier: PriceTier }) => {
  return (
    <div className="flex items-center gap-0.5 text-sm" aria-label={`Price tier ${tier} of 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "font-semibold transition-colors",
            i <= tier ? "text-foreground" : "text-muted-foreground/30",
          )}
        >
          MAD
        </span>
      ))}
    </div>
  );
};

const FixerGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="rounded-2xl">
        <CardContent className="p-5 space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-md" />
            <Skeleton className="h-11 w-11 rounded-md" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const EmptyState = ({ onReset }: { onReset: () => void }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <Frown className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {t("fixers.empty.title")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {t("fixers.empty.subtitle")}
      </p>
      <Button variant="outline" onClick={onReset}>
        {t("fixers.empty.reset")}
      </Button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  MAP VIEW                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

const FixerMap = ({ fixers }: { fixers: Fixer[] }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center: [number, number] = fixers.length
      ? [fixers[0].coordinates.lat, fixers[0].coordinates.lng]
      : [33.5731, -7.5898];

    const map = L.map(mapRef.current).setView(center, 11);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    fixers.forEach((f) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:hsl(var(--primary));color:hsl(var(--primary-foreground));width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-weight:600;font-size:11px;">🔧</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([f.coordinates.lat, f.coordinates.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:inherit;min-width:180px;">
            <strong>${f.name}</strong><br/>
            ⭐ ${f.rating} · ${f.distanceKm} km<br/>
            <a href="tel:${f.phone}" style="color:hsl(var(--primary));font-weight:600;">📞 ${f.phone}</a>
          </div>`,
        );
    });

    if (fixers.length > 1) {
      const bounds = L.latLngBounds(
        fixers.map((f) => [f.coordinates.lat, f.coordinates.lng] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [fixers]);

  return (
    <div
      ref={mapRef}
      className="h-[600px] w-full rounded-2xl border overflow-hidden"
      role="region"
      aria-label="Map of fixers"
    />
  );
};

export default Fixers;
