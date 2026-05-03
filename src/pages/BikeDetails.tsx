import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Bike,
  Shield,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  Fuel,
  Truck,
  Edit2,
  AlertTriangle,
  Cog,
  Gauge,
  IdCard,
  User,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  MessageCircle,
  BadgeCheck,
  ChevronDown,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBike, useBikeTypeImages } from "@/hooks/useBikes";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePricingTiers, getDailyPriceForDuration } from "@/hooks/usePricingTiers";
import { DateRangePicker } from "@/components/DateRangePicker";
import { BookingDatePicker } from "@/components/BookingDatePicker";
import { checkBikeAvailability, type Availability } from "@/lib/availability";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { FEATURE_LABELS, FeatureKey, licenseLabel, cancellationText } from "@/lib/bikeFeatures";

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const SITE_URL = "https://motonita.ma";

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
];

const BikeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: bike, isLoading: isLoadingBike } = useBike(id || "");
  const { data: detailImages, isLoading: isLoadingImages } = useBikeTypeImages(bike?.bike_type_id || "");
  const { data: pricingTiers } = usePricingTiers();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pickupTime, setPickupTime] = useState<string>("08:00");
  const [dropoffTime, setDropoffTime] = useState<string>("08:00");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("pickup");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const pickupParam = searchParams.get("from") || searchParams.get("pickup") || searchParams.get("start");
  const endParam = searchParams.get("to") || searchParams.get("end");
  const datesLocked = !!(pickupParam && endParam);

  useEffect(() => {
    if (pickupParam && endParam) {
      setDateRange({ from: new Date(pickupParam), to: new Date(endParam) });
    }
  }, [pickupParam, endParam]);

  // Booked date ranges for the calendar (from confirmed/pending bookings).
  const [bookedRanges, setBookedRanges] = useState<{ from: Date; to: Date }[]>([]);
  const realBikeIdForDates = bike?.id;
  useEffect(() => {
    if (!realBikeIdForDates) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_booked_date_ranges", {
        _bike_id: realBikeIdForDates,
      });
      if (cancelled || error || !data) return;
      setBookedRanges(
        (data as any[]).map((r) => ({
          from: new Date(r.pickup_date),
          to: new Date(r.return_date),
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [realBikeIdForDates]);

  // Availability check (stub for now)
  const [availability, setAvailability] = useState<Availability>("idle");
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) {
      setAvailability("idle");
      return;
    }
    let cancelled = false;
    setAvailability("loading");
    checkBikeAvailability(id || "", dateRange.from, dateRange.to).then((ok) => {
      if (!cancelled) setAvailability(ok ? "available" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [id, dateRange?.from, dateRange?.to]);

  // Push date changes to URL so they persist when sharing the link.
  const updateDatesInUrl = (r: DateRange | undefined) => {
    const params = new URLSearchParams(window.location.search);
    if (r?.from && r?.to) {
      params.set("from", format(r.from, "yyyy-MM-dd"));
      params.set("to", format(r.to, "yyyy-MM-dd"));
    } else {
      params.delete("from");
      params.delete("to");
    }
    navigate({ search: params.toString() }, { replace: true });
  };

  // Resolve real city + agency from DB (no hardcoded Casablanca / Casa Moto Rent).
  const [resolvedCity, setResolvedCity] = useState<string | null>(null);
  const [resolvedNeighborhood, setResolvedNeighborhood] = useState<string | null>(null);
  const [resolvedAgency, setResolvedAgency] = useState<{
    name: string | null;
    verified: boolean;
    deliveryOffered: boolean;
    deliveryFee: number;
  }>({ name: null, verified: false, deliveryOffered: false, deliveryFee: 0 });

  useEffect(() => {
    const bt: any = bike?.bike_type;
    if (!bt) return;
    let cancelled = false;
    (async () => {
      let cityName: string | null = null;
      if (bt.city_id) {
        const { data: city } = await supabase
          .from("service_cities").select("name").eq("id", bt.city_id).maybeSingle();
        cityName = city?.name ?? null;
      }
      let agencyName: string | null = null;
      let agencyVerified = false;
      let agencyCity: string | null = null;
      let agencyNeighborhood: string | null = null;
      let deliveryOffered = false;
      let deliveryFee = 0;
      if (bt.owner_id) {
        const { data: prof } = await supabase
          .from("profiles").select("id").eq("user_id", bt.owner_id).maybeSingle();
        if (prof?.id) {
          const { data: ag } = await (supabase as any)
            .from("agencies_public")
            .select("business_name, is_verified, city, primary_neighborhood, delivery_offered, delivery_fee_mad")
            .eq("profile_id", prof.id).maybeSingle();
          agencyName = (ag as any)?.business_name ?? null;
          agencyVerified = !!(ag as any)?.is_verified;
          agencyCity = (ag as any)?.city ?? null;
          agencyNeighborhood = (ag as any)?.primary_neighborhood ?? null;
          deliveryOffered = !!(ag as any)?.delivery_offered;
          deliveryFee = Number((ag as any)?.delivery_fee_mad) || 0;
        }
      }
      if (cancelled) return;
      setResolvedCity(cityName || agencyCity);
      setResolvedNeighborhood(bt.neighborhood || agencyNeighborhood || bike?.location || null);
      setResolvedAgency({ name: agencyName, verified: agencyVerified, deliveryOffered, deliveryFee });
    })();
    return () => { cancelled = true; };
  }, [bike?.bike_type, bike?.location]);

  // If URL is a UUID but the bike has a slug, redirect to the slug URL.
  // This preserves old links and gives a single canonical URL.
  const bikeSlug = (bike?.bike_type as any)?.slug as string | undefined;
  useEffect(() => {
    if (id && isUuid(id) && bikeSlug && bikeSlug !== id) {
      const search = window.location.search || "";
      navigate(`/bike/${bikeSlug}${search}`, { replace: true });
    }
  }, [id, bikeSlug, navigate]);

  const allImages = useMemo(() => {
    if (!bike?.bike_type) return [];
    const main = getBikeImageUrl(bike.bike_type.main_image_url);
    const rawMain = bike.bike_type.main_image_url || null;
    const extras = (detailImages || [])
      .map((d: any) => d.image_url as string | null)
      .filter((u): u is string => !!u && u !== main && u !== rawMain);
    return main ? [main, ...extras] : extras;
  }, [bike, detailImages]);

  const days = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from)
    : 0;

  const baseDailyPrice = bike?.bike_type ? Number(bike.bike_type.daily_price) : 0;
  const tieredDailyPrice = getDailyPriceForDuration(pricingTiers, days || 1);
  const dailyPrice = days > 0 ? tieredDailyPrice : baseDailyPrice;
  const subtotal = days * dailyPrice;
  const baselineSubtotal = days * baseDailyPrice;
  const tierDiscount = Math.max(0, baselineSubtotal - subtotal);
  const agencyDeliveryFee = resolvedAgency.deliveryFee;
  const deliveryFee = deliveryMethod === "delivery" ? agencyDeliveryFee : 0;
  const PLATFORM_FEE = 10;
  const CONFIRMATION_FEE = 50;
  const upfrontTotal = PLATFORM_FEE + CONFIRMATION_FEE;
  const rentalDueAtPickup = Math.max(0, Math.round(subtotal) - CONFIRMATION_FEE) + deliveryFee;
  const deposit = (bike?.bike_type as any)?.deposit_amount ? Number((bike?.bike_type as any).deposit_amount) : 0;
  const pickupTotal = rentalDueAtPickup + (deposit || 0);
  const tripTotal = upfrontTotal + rentalDueAtPickup;

  const minRentalDays = Math.max(1, Number((bike?.bike_type as any)?.min_rental_days) || 1);
  const maxRentalDays = Math.max(minRentalDays, Number((bike?.bike_type as any)?.max_rental_days) || 30);

  const isSameDay = dateRange?.from && dateRange?.to &&
    format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd");

  const getValidDropoffTimes = () => {
    if (!isSameDay || !pickupTime) return timeSlots;
    const idx = timeSlots.indexOf(pickupTime);
    if (idx === -1) return timeSlots;
    return timeSlots.slice(idx + 1);
  };
  const validDropoffTimes = getValidDropoffTimes();

  useEffect(() => {
    if (isSameDay && dropoffTime && pickupTime) {
      const pi = timeSlots.indexOf(pickupTime);
      const di = timeSlots.indexOf(dropoffTime);
      if (di <= pi) setDropoffTime("");
    }
  }, [pickupTime, isSameDay, dropoffTime]);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const diff = differenceInDays(range.to, range.from);
      if (diff > maxRentalDays) {
        toast.error(t('datePicker.maxDaysError').replace('{{maxDays}}', String(maxRentalDays)));
        setDateRange({ from: range.from, to: addDays(range.from, maxRentalDays) });
        return;
      }
      if (diff > 0 && diff < minRentalDays) {
        toast.error(`Minimum rental is ${minRentalDays} day${minRentalDays > 1 ? "s" : ""}`);
        setDateRange({ from: range.from, to: addDays(range.from, minRentalDays) });
        return;
      }
    }
    setDateRange(range);
    if (range?.from && range?.to) setIsEditingDates(false);
  };

  // SEO meta — must run unconditionally before early returns
  const seoSlug = bikeSlug || (id && !isUuid(id) ? id : "");
  const seoCity = resolvedCity || bike?.location || "Morocco";
  const seoAgency = resolvedAgency.name || "a verified agency";
  const seoTitle = bike?.bike_type
    ? `${(bike.bike_type as any).name} — Rent in ${seoCity} | Motonita`
    : "Motorbike rental | Motonita";
  const seoDescription = bike?.bike_type
    ? `Rent the ${(bike.bike_type as any).name} from ${seoAgency} in ${seoCity}. Daily price ${Math.round(Number((bike.bike_type as any).daily_price) || 0)} MAD. Booked in 60 seconds, flat 10 MAD booking fee.`
    : "Rent verified motorbikes and scooters across Morocco with flat fees and no commission on rental price.";
  const canonicalUrl = seoSlug ? `${SITE_URL}/bike/${seoSlug}` : undefined;
  useDocumentHead({
    title: seoTitle,
    description: seoDescription,
    canonical: canonicalUrl,
    meta: canonicalUrl
      ? [
          { property: "og:url", content: canonicalUrl },
          { property: "og:type", content: "product" },
          ...(bike?.bike_type && (bike.bike_type as any).main_image_url
            ? [{ property: "og:image", content: (bike.bike_type as any).main_image_url as string }]
            : []),
        ]
      : [],
  });

  if (isLoadingBike || isLoadingImages) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Loading bike details...</p>
        </div>
      </div>
    );
  }

  if (!bike || !bike.bike_type) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Bike not found</p>
          <Button onClick={() => navigate('/listings')} className="mt-4">Back to Listings</Button>
        </div>
      </div>
    );
  }

  const bikeType: any = bike.bike_type;
  const cityName = resolvedCity || bike.location || "Morocco";
  const neighborhood = resolvedNeighborhood || bike.location || cityName;
  const agencyName = resolvedAgency.name || "your local agency";
  const agencyVerified = resolvedAgency.verified;

  const handleBookNow = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please select dates");
      return;
    }
    if (!pickupTime || !dropoffTime) {
      toast.error("Please select pickup and drop-off times");
      return;
    }

    const pickup = format(dateRange.from, "yyyy-MM-dd");
    const end = format(dateRange.to, "yyyy-MM-dd");
    const realBikeId = bike?.id;
    const { data: authData } = await supabase.auth.getUser();

    // If not authenticated, send to login first. Draft is created after they return.
    if (!authData?.user) {
      const returnUrl = `/bike/${id}?from=${pickup}&to=${end}&autobook=1`;
      navigate(`/auth?mode=login&returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!realBikeId) return;

    const { data: bookingId, error: draftErr } = await supabase.rpc(
      "create_draft_booking",
      {
        _bike_id: realBikeId,
        _pickup_date: pickup,
        _return_date: end,
        _delivery_method: deliveryMethod,
        _pickup_location: deliveryMethod === "delivery" ? deliveryAddress || null : (bike.location || null),
      },
    );

    if (draftErr || !bookingId) {
      const msg = draftErr?.message || "";
      if (msg.includes("BIKE_ALREADY_BOOKED") || msg.includes("CONFLICT")) {
        toast.error("Sorry, this bike was just booked for those dates. Please pick different dates.");
      } else if (msg.includes("INVALID_DATES")) {
        toast.error("Invalid dates selected.");
      } else {
        toast.error("Could not start checkout. Please try again.");
      }
      return;
    }

    navigate(`/checkout/${bookingId}`);
  };

  const specs = [
    bikeType.engine_cc ? { icon: Cog, label: "Engine", value: `${bikeType.engine_cc}cc` } : null,
    bikeType.fuel_type ? { icon: Fuel, label: "Fuel", value: cap(bikeType.fuel_type) } : null,
    bikeType.transmission ? { icon: Zap, label: "Transmission", value: cap(bikeType.transmission) } : null,
    bikeType.year ? { icon: CalendarIcon, label: "Year", value: String(bikeType.year) } : null,
    bikeType.mileage_km != null ? { icon: Gauge, label: "Mileage", value: `${Number(bikeType.mileage_km).toLocaleString()} km` } : null,
    bikeType.license_required ? { icon: IdCard, label: "License", value: licenseLabel(bikeType.license_required) || bikeType.license_required } : null,
    bikeType.min_age ? { icon: User, label: "Min age", value: `${bikeType.min_age} years` } : null,
    deposit > 0 ? { icon: Wallet, label: "Deposit", value: `${deposit} MAD` } : null,
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  const featureKeys = ((bikeType.features || []) as string[]).filter((k) => k in FEATURE_LABELS) as FeatureKey[];
  const helmetsCount = Number(bikeType.helmets_count) || 0;
  const hasIncludedSection = helmetsCount > 0 || featureKeys.length > 0;

  const description = (bikeType.description || "").trim();

  const BookingCard = (
    <Card className="border border-border/60 shadow-lg rounded-xl overflow-hidden">
      <CardContent className="p-6 space-y-5">
        {/* Price */}
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-foreground leading-none">{Math.round(baseDailyPrice)}</span>
            <span className="text-base font-semibold text-foreground">MAD</span>
          </div>
          <span className="text-sm text-muted-foreground pb-1">/day</span>
        </div>
        {/* Tiered pricing badges removed in Phase 1 — Phase 2 will add real per-bike tiers */}

        <div className="border-t border-border/60" />

        {/* Editable dates */}
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Pickup & Return</Label>
          <BookingDatePicker
            value={dateRange}
            onChange={(r) => {
              handleDateRangeSelect(r);
              updateDatesInUrl(r);
            }}
            triggerClassName="group hover:border-[#9FE870] hover:shadow-sm transition-all"
            placeholder="Pick dates"
            disabledRanges={bookedRanges}
          />
          {dateRange?.from && dateRange?.to && (
            <p className="text-xs text-muted-foreground">
              {days} day{days !== 1 ? "s" : ""}
            </p>
          )}

          {/* Availability badge */}
          {availability === "loading" && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 animate-pulse" />
              Checking availability...
            </div>
          )}
          {availability === "available" && (
            <div className="flex items-start gap-2 rounded-md px-3 py-2.5 text-xs" style={{ backgroundColor: "rgba(159,232,112,0.15)", color: "#163300" }}>
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#163300]" />
              <div>
                <div className="font-semibold">Available for these dates</div>
                <div className="opacity-70">Confirm in 60 seconds</div>
              </div>
            </div>
          )}
          {availability === "unavailable" && (
            <div className="flex items-start gap-2 rounded-md px-3 py-2.5 text-xs" style={{ backgroundColor: "rgba(255,193,7,0.12)", color: "#7a4a00" }}>
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-semibold">Not available for these dates</div>
                <div className="opacity-90">
                  <button type="button" onClick={() => updateDatesInUrl(undefined)} className="underline">Try different dates</button>
                  {" "}or{" "}
                  <Link to={`/rent/${cityName.toLowerCase()}`} className="underline">browse similar</Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Times */}
        {dateRange?.from && dateRange?.to && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pickup time
              </Label>
              <Select value={pickupTime} onValueChange={setPickupTime}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="--:--" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Return time
              </Label>
              <Select value={dropoffTime} onValueChange={setDropoffTime} disabled={isSameDay && !pickupTime}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="--:--" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {validDropoffTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isSameDay && (
              <div className="col-span-2 flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t('timeValidation.dropoffAfterPickup')}</span>
              </div>
            )}
          </div>
        )}

        {/* Delivery */}
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Delivery method</Label>
          <button
            type="button"
            onClick={() => setDeliveryMethod("pickup")}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-md border-2 text-left transition-all",
              deliveryMethod === "pickup"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            )}
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Pickup at shop</p>
              <p className="text-xs text-muted-foreground">{neighborhood}, {cityName}</p>
            </div>
            <span className="text-xs font-medium text-foreground">Free</span>
          </button>
          {resolvedAgency.deliveryOffered && (
            <button
              type="button"
              onClick={() => setDeliveryMethod("delivery")}
              className={cn(
                "w-full flex flex-col p-3 rounded-md border-2 text-left transition-all",
                deliveryMethod === "delivery"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="text-sm font-semibold text-foreground">Home delivery</p>
                  <p className="text-xs text-muted-foreground">Delivered to your address</p>
                </div>
                <span className="text-xs font-medium text-foreground">
                  {agencyDeliveryFee > 0 ? `+${agencyDeliveryFee} MAD` : "Free"}
                </span>
              </div>
              {deliveryMethod === "delivery" && (
                <div className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
                  <Input
                    placeholder="Enter delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              )}
            </button>
          )}
        </div>

        {/* Cost breakdown — three-tier */}
        {days > 0 && (
          <div className="space-y-3 pt-3 border-t border-border/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Price summary</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Rental ({Math.round(dailyPrice)} × {days} day{days !== 1 ? "s" : ""})</span>
                <span>{Math.round(baselineSubtotal).toLocaleString()} MAD</span>
              </div>
              {tierDiscount > 0 && (
                <div className="flex justify-between text-sm text-primary">
                  <span>Duration discount</span>
                  <span>−{Math.round(tierDiscount).toLocaleString()} MAD</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery</span>
                <span>{deliveryFee > 0 ? `+${deliveryFee} MAD` : "Free"}</span>
              </div>
            </div>

            <div className="border-t border-border/60 pt-3 flex justify-between text-base font-bold text-foreground">
              <span>Total trip cost</span>
              <span>{tripTotal.toLocaleString()} MAD</span>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="inline-flex items-center gap-1 text-foreground font-medium">
                  Pay now (booking fee)
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="Booking fee info" className="inline-flex">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                        The {upfrontTotal} MAD booking fee covers platform service and confirms your reservation with the agency. Non-refundable. The rental amount can be cancelled up to 2 days before pickup.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="font-semibold text-foreground">{upfrontTotal} MAD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pay at shop</span>
                <span className="text-muted-foreground">{rentalDueAtPickup.toLocaleString()} MAD</span>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <Button
          variant="hero"
          size="lg"
          className="w-full h-12 font-bold"
          onClick={handleBookNow}
          disabled={
            !dateRange?.from || !dateRange?.to || !pickupTime || !dropoffTime ||
            availability === "loading" || availability === "unavailable"
          }
        >
          {!dateRange?.from || !dateRange?.to
            ? "Select dates to book"
            : availability === "loading"
              ? "Checking..."
              : availability === "unavailable"
                ? "Not available for these dates"
                : "Go to checkout"}
        </Button>

        {days > 0 && availability !== "unavailable" && (
          <p className="text-[11px] text-center text-foreground/70">⚡ Confirm in 60 seconds</p>
        )}

        {/* Trust signals — three only */}
        <div className="flex flex-col gap-1.5 pt-2 text-xs text-foreground/80">
          <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Verified agency</span>
          <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Secure payment</span>
          <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Free cancellation up to 2 days</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="min-h-screen bg-background overflow-x-hidden pb-[130px] md:pb-0">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 py-6 max-w-[1200px]">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <ol className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              <li className="opacity-40">/</li>
              <li><Link to="/listings" className="hover:text-foreground">Rent</Link></li>
              <li className="opacity-40">/</li>
              <li><Link to={`/rent/${cityName.toLowerCase()}`} className="hover:text-foreground">{cityName}</Link></li>
              <li className="opacity-40">/</li>
              <li className="hover:text-foreground">{neighborhood}</li>
              <li className="opacity-40">/</li>
              <li className="font-semibold text-foreground truncate max-w-[200px]">{bikeType.name}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] gap-8 lg:gap-12">
            {/* LEFT — content */}
            <div className="space-y-10 min-w-0">
              {/* Image gallery */}
              <section>
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-muted">
                  <img
                    src={allImages[currentImageIndex]}
                    alt={`${bikeType.name} — ${bikeType.color || ''}`.trim()}
                    className="w-full h-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                    draggable={false}
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(i => i === 0 ? allImages.length - 1 : i - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow-md"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(i => i === allImages.length - 1 ? 0 : i + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow-md"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {allImages.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={cn(
                          "flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all",
                          idx === currentImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" draggable={false} />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Title + trust row */}
              <section>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {bikeType.name}{bikeType.year && !String(bikeType.name).includes(String(bikeType.year)) ? ` (${bikeType.year})` : ""}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {neighborhood}, {cityName}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4 text-primary" /> Verified agency
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Bike className="h-4 w-4" /> Hosted by {agencyName}
                  </span>
                </div>
              </section>

              {/* Quick specs */}
              <section>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {specs.map((s) => (
                    <div key={s.label} className="bg-card border border-border/60 rounded-lg p-4">
                      <s.icon className="h-5 w-5 text-foreground mb-2" />
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{s.label}</p>
                      <p className="text-base font-semibold text-foreground mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Booking card on mobile inline */}
              <div className="lg:hidden">{BookingCard}</div>

              {/* Description */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-3">About this bike</h2>
                <div className="space-y-3 text-base leading-relaxed text-foreground/80">
                  {description.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>

              {/* Features */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-3">What's included</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {features.map((f) => (
                    <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card">
                      <f.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-base font-medium text-foreground">{f.label}</p>
                        {f.detail && <p className="text-sm text-muted-foreground">{f.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Requirements */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-3">Before you book</h2>
                <div className="text-base leading-relaxed text-foreground/80 space-y-3">
                  <p>To rent this bike, you must have:</p>
                  <ul className="space-y-1.5 pl-1">
                    <li>— A valid driver's license ({bikeType.license_required || "Permis A1"} or higher)</li>
                    <li>— Your national ID or passport at pickup</li>
                    <li>— Minimum age {bikeType.min_age || 18}</li>
                    <li>— At least {bikeType.min_experience_years || 1} year of riding experience</li>
                  </ul>
                  <p>
                    At pickup, the agency collects a refundable {deposit || 1200} MAD deposit
                    (card hold or cash). The deposit is fully refunded when the bike is returned undamaged.
                  </p>
                </div>
              </section>

              {/* Pickup location */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-3">Pickup location</h2>
                <div className="rounded-lg overflow-hidden border border-border/60 bg-muted aspect-[16/8] flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-10 w-10 text-primary mx-auto mb-1" />
                    <p className="text-sm font-medium text-foreground">{neighborhood}, {cityName}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-foreground/80">
                  <p><span className="font-medium text-foreground">Area:</span> {neighborhood}, {cityName}</p>
                  <p className="text-muted-foreground">Exact address shared after booking confirmation.</p>
                  <p className="text-muted-foreground">Free delivery within {neighborhood} · Other zones: +25 MAD</p>
                </div>
              </section>
            </div>

            {/* RIGHT — sticky booking card (desktop only) */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">{BookingCard}</div>
            </aside>
          </div>
        </main>

        {/* Mobile sticky bottom bar (mobile only; tablet+ stacks BookingCard below) */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border shadow-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <p className="text-sm font-bold text-foreground leading-tight">
              {Math.round(baseDailyPrice)} MAD<span className="text-[11px] font-normal text-muted-foreground">/day</span>
              {availability === "available" && (
                <span className="ml-2 text-[11px] font-medium text-[#163300]">· ✓ Available</span>
              )}
              {availability === "unavailable" && (
                <span className="ml-2 text-[11px] font-medium text-amber-700">· ⚠ Unavailable</span>
              )}
            </p>
            {days > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {format(dateRange!.from!, "MMM d")} → {format(dateRange!.to!, "MMM d")} · {tripTotal.toLocaleString()} MAD total
              </p>
            )}
          </div>
          <Button
            variant="hero"
            size="lg"
            className="w-full font-bold"
            onClick={handleBookNow}
            disabled={
              !dateRange?.from || !dateRange?.to || !pickupTime || !dropoffTime ||
              availability === "loading" || availability === "unavailable"
            }
          >
            {!dateRange?.from || !dateRange?.to
              ? "Select dates to book"
              : availability === "unavailable"
                ? "Not available"
                : "Go to checkout"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default BikeDetails;
