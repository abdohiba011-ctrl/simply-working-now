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
  Lock,
  MessageCircle,
  BadgeCheck,
  ChevronDown,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBike, useBikeTypeImages } from "@/hooks/useBikes";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePricingTiers, getDailyPriceForDuration } from "@/hooks/usePricingTiers";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useDocumentHead } from "@/hooks/useDocumentHead";

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const SITE_URL = "https://motonita.ma";

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
];

const MAX_RENTAL_DAYS = 30;

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

  const pickupParam = searchParams.get("pickup");
  const endParam = searchParams.get("end");

  useEffect(() => {
    if (pickupParam && endParam) {
      setDateRange({ from: new Date(pickupParam), to: new Date(endParam) });
    }
  }, [pickupParam, endParam]);

  // Resolve real city + agency from DB (no hardcoded Casablanca / Casa Moto Rent).
  const [resolvedCity, setResolvedCity] = useState<string | null>(null);
  const [resolvedNeighborhood, setResolvedNeighborhood] = useState<string | null>(null);
  const [resolvedAgency, setResolvedAgency] = useState<{
    name: string | null;
    verified: boolean;
  }>({ name: null, verified: false });

  useEffect(() => {
    const bt: any = bike?.bike_type;
    if (!bt) return;
    let cancelled = false;
    (async () => {
      // City
      let cityName: string | null = null;
      if (bt.city_id) {
        const { data: city } = await supabase
          .from("service_cities")
          .select("name")
          .eq("id", bt.city_id)
          .maybeSingle();
        cityName = city?.name ?? null;
      }
      // Agency from owner_id → profiles → agencies
      let agencyName: string | null = null;
      let agencyVerified = false;
      let agencyCity: string | null = null;
      let agencyNeighborhood: string | null = null;
      if (bt.owner_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", bt.owner_id)
          .maybeSingle();
        if (prof?.id) {
          const { data: ag } = await (supabase as any)
            .from("agencies_public")
            .select("business_name, is_verified, city, primary_neighborhood")
            .eq("profile_id", prof.id)
            .maybeSingle();
          agencyName = (ag as any)?.business_name ?? null;
          agencyVerified = !!(ag as any)?.is_verified;
          agencyCity = (ag as any)?.city ?? null;
          agencyNeighborhood = (ag as any)?.primary_neighborhood ?? null;
        }
      }
      if (cancelled) return;
      setResolvedCity(cityName || agencyCity);
      setResolvedNeighborhood(bt.neighborhood || agencyNeighborhood || bike?.location || null);
      setResolvedAgency({ name: agencyName, verified: agencyVerified });
    })();
    return () => {
      cancelled = true;
    };
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
  const deliveryFee = deliveryMethod === "delivery" ? 25 : 0;
  const PLATFORM_FEE = 10;        // non-refundable, always Motonita's
  const CONFIRMATION_FEE = 50;    // prepaid by renter, credited back to Motonita on confirm
  const upfrontTotal = PLATFORM_FEE + CONFIRMATION_FEE; // 60 MAD
  // Renter pays agency at pickup the rental MINUS the prepaid 50 MAD confirmation fee.
  const rentalDueAtPickup = Math.max(0, Math.round(subtotal) - CONFIRMATION_FEE) + deliveryFee;
  const deposit = (bike?.bike_type as any)?.deposit_amount ? Number((bike?.bike_type as any).deposit_amount) : 0;
  const pickupTotal = rentalDueAtPickup + (deposit || 0);
  const tripTotal = upfrontTotal + rentalDueAtPickup; // excl. refundable deposit

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
      if (diff > MAX_RENTAL_DAYS) {
        toast.error(t('datePicker.maxDaysError').replace('{{maxDays}}', String(MAX_RENTAL_DAYS)));
        setDateRange({ from: range.from, to: addDays(range.from, MAX_RENTAL_DAYS) });
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

    // If not authenticated, send to login first. Hold is created after they return.
    if (!authData?.user) {
      const reviewUrl = `/booking-review?bikeId=${realBikeId}&bikeName=${encodeURIComponent(bikeType.name)}&pickup=${pickup}&end=${end}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&deliveryMethod=${deliveryMethod}&location=${encodeURIComponent(bike.location || '')}&dailyPrice=${dailyPrice}`;
      navigate(`/auth?mode=login&returnUrl=${encodeURIComponent(reviewUrl)}`);
      return;
    }

    let holdParams = "";
    if (authData?.user && realBikeId) {
      const { data: holdData, error: holdError } = await supabase.rpc("create_bike_hold", {
        _bike_id: realBikeId,
        _pickup: pickup,
        _return: end,
      });
      if (holdError) {
        const msg = holdError.message || "";
        if (msg.includes("BIKE_ALREADY_BOOKED")) {
          toast.error("Sorry, this bike was just booked for those dates. Please pick different dates.");
        } else if (msg.includes("BIKE_HELD_BY_OTHER")) {
          toast.error("Someone else is checking out this bike right now. Try again in a few minutes.");
        } else if (msg.includes("INVALID_DATES")) {
          toast.error("Invalid dates selected.");
        } else {
          toast.error("Could not reserve this bike. Please try again.");
        }
        return;
      }
      const hold = Array.isArray(holdData) ? holdData[0] : holdData;
      if (hold?.hold_id) {
        holdParams = `&holdId=${hold.hold_id}&holdExpiresAt=${encodeURIComponent(hold.expires_at)}`;
      }
    }

    navigate(`/booking-review?bikeId=${realBikeId}&bikeName=${encodeURIComponent(bikeType.name)}&pickup=${pickup}&end=${end}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&deliveryMethod=${deliveryMethod}&location=${encodeURIComponent(bike.location)}&dailyPrice=${dailyPrice}${holdParams}`);
  };

  const specs = [
    { icon: Cog, label: "Engine", value: bikeType.engine_cc ? `${bikeType.engine_cc}cc` : "—" },
    { icon: Fuel, label: "Fuel", value: bikeType.fuel_type || "Gasoline" },
    { icon: Zap, label: "Transmission", value: bikeType.transmission || "Manual" },
    { icon: CalendarIcon, label: "Year", value: bikeType.year ? String(bikeType.year) : "—" },
    { icon: Gauge, label: "Mileage", value: bikeType.mileage_km ? `${Number(bikeType.mileage_km).toLocaleString()} km` : "—" },
    { icon: IdCard, label: "License", value: bikeType.license_required || "Permis A1" },
    { icon: User, label: "Min age", value: `${bikeType.min_age || 18} years` },
    { icon: Wallet, label: "Deposit", value: `${deposit || 1200} MAD` },
  ];

  const features = [
    { icon: Shield, label: "Helmet included", detail: "Full-face helmet provided at pickup" },
    { icon: BadgeCheck, label: "Basic insurance", detail: "Third-party coverage included" },
    { icon: MessageCircle, label: "24/7 roadside support", detail: "Reach the agency anytime during your rental" },
    { icon: Truck, label: `Free delivery in ${neighborhood}`, detail: `Outside ${neighborhood}: +25 MAD` },
  ];

  const description = bikeType.description ||
    `Reliable ${bikeType.name} maintained by ${agencyName}. Comfortable ride, easy handling, perfect for exploring ${cityName} and surrounding areas.`;

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
        <div className="space-y-1">
          <p className="text-xs text-foreground/70 font-medium">Save 10% on weekly rentals</p>
          <p className="text-xs text-foreground/70 font-medium">Save 25% on monthly rentals</p>
        </div>

        <div className="border-t border-border/60" />

        {/* Dates */}
        {dateRange?.from && dateRange?.to && !isEditingDates ? (
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Rental dates</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-11 px-3 rounded-md border border-border bg-muted/30 flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarIcon className="h-4 w-4 text-foreground/70" />
                {format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d, yyyy")}
              </div>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setIsEditingDates(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{days} day{days !== 1 ? "s" : ""}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Pickup & Return</Label>
            <DateRangePicker
              dateRange={dateRange}
              onDateChange={handleDateRangeSelect}
              maxDays={MAX_RENTAL_DAYS}
              showPriceBreakdown={false}
              placeholder={t('datePicker.pickDates')}
              triggerClassName="min-h-[44px]"
            />
          </div>
        )}

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
              <span className="text-xs font-medium text-foreground">+25 MAD</span>
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
        </div>

        {/* Cost breakdown */}
        {days > 0 && (
          <div className="space-y-2 pt-3 border-t border-border/60">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{Math.round(dailyPrice)} MAD × {days} day{days !== 1 ? "s" : ""}</span>
              <span>{Math.round(subtotal)} MAD</span>
            </div>
            {tierDiscount > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>Duration discount</span>
                <span>−{Math.round(tierDiscount)} MAD</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery fee</span>
                <span>+{deliveryFee} MAD</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Refundable deposit</span>
              <span>{(deposit || 0).toLocaleString()} MAD</span>
            </div>

            <div className="border-t border-border/60 pt-3 mt-2 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pay now via YouCan Pay</p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Platform fee</span>
                <span>{PLATFORM_FEE} MAD</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Confirmation fee</span>
                <span>{CONFIRMATION_FEE} MAD</span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-1">
                <span>Total now</span>
                <span>{upfrontTotal} MAD</span>
              </div>
            </div>

            <div className="border-t border-border/60 pt-3 mt-2 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pay agency at pickup</p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Rental ({Math.round(subtotal).toLocaleString()} − {CONFIRMATION_FEE} prepaid)</span>
                <span>{rentalDueAtPickup.toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Refundable deposit</span>
                <span>{(deposit || 0).toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-1">
                <span>Total at pickup</span>
                <span>{pickupTotal.toLocaleString()} MAD</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              Total trip cost: <strong className="text-foreground">{tripTotal.toLocaleString()} MAD</strong>{" "}
              (deposit refunded when bike is returned undamaged)
            </p>
          </div>
        )}

        {/* CTA */}
        <Button
          variant="hero"
          size="lg"
          className="w-full h-12 font-bold"
          onClick={handleBookNow}
          disabled={!dateRange?.from || !dateRange?.to || !pickupTime || !dropoffTime}
        >
          Book Now — Pay {upfrontTotal} MAD
        </Button>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          You'll pay {upfrontTotal} MAD now via YouCan Pay ({PLATFORM_FEE} MAD platform fee + {CONFIRMATION_FEE} MAD confirmation fee).
          Pay {pickupTotal.toLocaleString()} MAD to the agency at pickup.
        </p>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" /> Verified agency</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Secure payment</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> Chat after booking</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="min-h-screen bg-background overflow-x-hidden pb-24 lg:pb-0">
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

        {/* Mobile sticky bottom bar */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border shadow-lg p-3 flex items-center justify-between gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-tight">
              {Math.round(baseDailyPrice)} MAD<span className="text-xs font-normal text-muted-foreground">/day</span>
            </p>
          </div>
          <Button
            variant="hero"
            size="lg"
            className="flex-1 max-w-[220px] font-bold"
            onClick={handleBookNow}
            disabled={!dateRange?.from || !dateRange?.to || !pickupTime || !dropoffTime}
          >
            Book Now
          </Button>
        </div>
      </div>
    </>
  );
};

export default BikeDetails;
