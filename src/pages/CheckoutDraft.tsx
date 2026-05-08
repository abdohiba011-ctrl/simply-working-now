import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Calendar,
  Bike as BikeIcon,
  ChevronLeft,
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  Banknote,
  ExternalLink,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveTierPrice, getBaseDailyPrice, type BikePricingTier } from "@/lib/pricingTiers";

const PLATFORM_FEE_MAD = 10;
const CONFIRMATION_FEE_MAD = 50;
const UPFRONT_TOTAL_MAD = PLATFORM_FEE_MAD + CONFIRMATION_FEE_MAD;
const SCRIPT_SRC = "https://youcanpay.com/js/ycpay.js";

declare global {
  interface Window {
    YCPay?: any;
  }
}

function loadYcPayScript(): Promise<void> {
  if (window.YCPay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load YouCan Pay script")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load YouCan Pay script"));
    document.head.appendChild(s);
  });
}

interface DraftBooking {
  id: string;
  bike_id: string;
  pickup_date: string;
  return_date: string;
  total_days: number | null;
  total_price: number | null;
  delivery_method: string | null;
  pickup_location: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  booking_status: string;
  bike?: {
    name?: string | null;
    daily_price?: number | null;
    image_url?: string | null;
    city?: string | null;
    bike_type_id?: string | null;
  };
}

const CheckoutDraft = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<DraftBooking | null>(null);

  // Profile-derived info
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editing, setEditing] = useState(false);

  // Payment state
  const [agreed, setAgreed] = useState(false);
  const [ycStatus, setYcStatus] = useState<"idle" | "loading" | "ready" | "paying" | "error">("idle");
  const [ycError, setYcError] = useState<string | null>(null);
  const [cashplusActive, setCashplusActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const ycRef = useRef<any>(null);
  const tokenRef = useRef<{ token: string; pid: string } | null>(null);

  // ---------- Load booking + profile ----------
  useEffect(() => {
    const load = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `id, bike_id, pickup_date, return_date, total_days, total_price,
             delivery_method, pickup_location, customer_name, customer_email,
             customer_phone, booking_status, user_id`,
          )
          .eq("id", bookingId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error("Booking not found.");
          navigate("/");
          return;
        }
        if (data.booking_status !== "draft") {
          const pm = (data as any).payment_method;
          const q = pm === "card" || pm === "cashplus" ? `?payment=${pm}` : "";
          navigate(`/booking/${data.id}/confirmed${q}`);
          return;
        }

        let bikeInfo: DraftBooking["bike"] = undefined;
        if (data.bike_id) {
          const { data: bikeRow } = await supabase
            .from("bikes_public" as any)
            .select("location, bike_type_id")
            .eq("id", data.bike_id)
            .maybeSingle() as any;
          if (bikeRow?.bike_type_id) {
            const { data: bt } = await supabase
              .from("bike_types")
              .select("name, daily_price, main_image_url")
              .eq("id", bikeRow.bike_type_id)
              .maybeSingle();
            bikeInfo = {
              name: bt?.name,
              daily_price: bt?.daily_price,
              image_url: bt?.main_image_url,
              city: bikeRow.location,
              bike_type_id: bikeRow.bike_type_id,
            };
          }
        }

        setBooking({ ...(data as any), bike: bikeInfo });

        // Load profile (read-only confirmation source of truth).
        let pName = data.customer_name || "";
        let pEmail = data.customer_email || user?.email || "";
        let pPhone = data.customer_phone || "";
        if (user?.id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("user_id", user.id)
            .maybeSingle();
          if (prof) {
            pName = prof.full_name || pName;
            pEmail = prof.email || pEmail;
            pPhone = prof.phone || pPhone;
          }
        }
        setProfileName(pName);
        setProfileEmail(pEmail);
        setProfilePhone(pPhone);
        setEditName(pName);
        setEditPhone(pPhone);
      } catch (e) {
        console.error(e);
        toast.error("Could not load checkout. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId, navigate, user]);

  // Determine if we need editable fallback because profile is missing data.
  const needsName = !profileName.trim();
  const needsPhone = !profilePhone.trim();
  const mustEdit = needsName || needsPhone;
  const showEditor = editing || mustEdit;

  // ---------- Init YouCan Pay form once booking is loaded ----------
  useEffect(() => {
    if (!booking) return;
    let cancelled = false;
    (async () => {
      setYcStatus("loading");
      setYcError(null);
      try {
        const { data: tokenResp, error: tokenErr } =
          await supabase.functions.invoke("youcanpay-create-token", {
            body: {
              purpose: "booking_payment",
              amount: UPFRONT_TOTAL_MAD,
              currency: "MAD",
              related_booking_id: booking.id,
              customer_email: profileEmail,
              customer_name: profileName,
            },
          });
        if (cancelled) return;
        if (tokenErr || !tokenResp?.token_id || !tokenResp?.public_key) {
          const detail =
            (tokenResp && (tokenResp.error || tokenResp.details?.message)) ||
            tokenErr?.message ||
            "Payment service is unavailable.";
          throw new Error(detail);
        }
        tokenRef.current = { token: tokenResp.token_id, pid: tokenResp.payment_id };

        await loadYcPayScript();
        if (cancelled) return;

        const yc = new window.YCPay(tokenResp.public_key, {
          formContainer: "#ycpay-form",
          errorContainer: "#ycpay-error",
          locale: "en",
          isSandbox: !!tokenResp.is_sandbox,
          token: tokenResp.token_id,
        });
        try {
          yc.renderAvailableGateways([], "default");
        } catch {
          yc.renderCreditCardForm("default");
        }
        ycRef.current = yc;
        setYcStatus("ready");
      } catch (e: any) {
        console.error("YouCan Pay init failed", e);
        setYcStatus("error");
        setYcError(e?.message || "Could not load the payment form.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  // ---------- Detect Cash Plus selection by observing the YouCan Pay form DOM ----------
  useEffect(() => {
    if (ycStatus !== "ready" && ycStatus !== "paying") return;
    const target = document.getElementById("ycpay-form");
    if (!target) return;

    const detect = () => {
      const text = (target.innerText || "").toLowerCase();
      // YouCan Pay shows "cashplus" / "cash plus" / "agence" / French instructions
      if (
        text.includes("cashplus") ||
        text.includes("cash plus") ||
        text.includes("agence cashplus") ||
        text.includes("nearest cashplus")
      ) {
        if (!cashplusActive) {
          setCashplusActive(true);
          // Persist to draft so cleanup respects 72h TTL
          if (booking?.id) {
            supabase
              .from("bookings")
              .update({ payment_method: "cashplus" })
              .eq("id", booking.id)
              .eq("booking_status", "draft")
              .then(({ error }) => {
                if (error) console.warn("mark cashplus failed", error);
              });
          }
        }
      }
    };

    detect();
    const obs = new MutationObserver(detect);
    obs.observe(target, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [ycStatus, booking?.id, cashplusActive]);

  const handleVerifyCashplus = async () => {
    if (!booking?.id || verifying) return;
    setVerifying(true);
    try {
      const { data: pay } = await supabase
        .from("youcanpay_payments")
        .select("id, transaction_id")
        .eq("related_booking_id", booking.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!pay?.id) {
        toast.error("No payment record found yet. Please try again in a moment.");
        return;
      }
      const { data, error } = await supabase.functions.invoke(
        "youcanpay-verify-payment",
        {
          body: { payment_id: pay.id, transaction_id: pay.transaction_id || undefined },
        },
      );
      if (error) throw error;
      if ((data as any)?.status === "paid") {
        toast.success("Payment received!");
        navigate(`/booking/${booking.id}/confirmed`);
      } else {
        toast.info("Payment not received yet. Please try again after paying at Cash Plus.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not verify payment.");
    } finally {
      setVerifying(false);
    }
  };

  // Fetch pricing tiers for this bike type
  const [tiers, setTiers] = useState<BikePricingTier[]>([]);
  useEffect(() => {
    const btId = booking?.bike?.bike_type_id;
    if (!btId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bike_pricing_tiers")
        .select("min_days, daily_price_mad")
        .eq("bike_type_id", btId)
        .order("min_days", { ascending: true });
      if (!cancelled && data) setTiers(data as BikePricingTier[]);
    })();
    return () => { cancelled = true; };
  }, [booking?.bike?.bike_type_id]);

  const days = booking?.total_days ?? 1;
  const fallbackBase = booking?.bike?.daily_price ?? 0;
  const baseDailyPrice = getBaseDailyPrice(tiers) || fallbackBase;
  const { dailyPrice: resolvedDaily } = resolveTierPrice(tiers, days);
  const dailyPrice = tiers.length > 0 ? resolvedDaily : fallbackBase;
  // Prefer the booking.total_price (already tier-aware via create_draft_booking RPC).
  const computedSubtotal = Math.round(dailyPrice * days);
  const rentalSubtotal = booking?.total_price ?? computedSubtotal;
  const baselineSubtotal = Math.round(baseDailyPrice * days);
  const volumeDiscount = Math.max(0, baselineSubtotal - rentalSubtotal);
  const dueAtPickup = Math.max(0, rentalSubtotal - CONFIRMATION_FEE_MAD);

  const [savingInfo, setSavingInfo] = useState(false);

  const handleSaveInfo = async () => {
    const nm = editName.trim();
    const ph = editPhone.trim();
    if (!nm) {
      toast.error("Please enter your full name.");
      return false;
    }
    if (!ph) {
      toast.error("Please enter your phone number.");
      return false;
    }
    setSavingInfo(true);
    try {
      if (user?.id) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ full_name: nm, phone: ph })
          .eq("user_id", user.id);
        if (pErr) {
          console.error(pErr);
          toast.error("Could not save your info. Please try again.");
          return false;
        }
      }
      await supabase
        .from("bookings")
        .update({
          customer_name: nm,
          customer_email: profileEmail,
          customer_phone: ph,
        })
        .eq("id", bookingId!)
        .eq("booking_status", "draft");
      setProfileName(nm);
      setProfilePhone(ph);
      setEditing(false);
      toast.success("Details saved");
      return true;
    } finally {
      setSavingInfo(false);
    }
  };

  const handlePay = async () => {
    if (!booking || !ycRef.current || !tokenRef.current) return;
    if (!agreed) {
      toast.error("Please accept the Terms & Cancellation policy.");
      return;
    }
    if (!profileName.trim() || !profilePhone.trim()) {
      toast.error("Please save your name and phone before paying.");
      return;
    }
    // Make sure booking has the latest renter info.
    await supabase
      .from("bookings")
      .update({
        customer_name: profileName,
        customer_email: profileEmail,
        customer_phone: profilePhone,
      })
      .eq("id", bookingId!)
      .eq("booking_status", "draft");

    setYcStatus("paying");
    const { token, pid } = tokenRef.current;
    let usingCashplus = cashplusActive;

    // If user picked Cash Plus inside the YouCan widget, lock that on the
    // booking server-side BEFORE redirecting so the confirmation page knows
    // to use the 72h poll + voucher UI instead of the 60s card flow.
    if (usingCashplus) {
      await supabase
        .from("bookings")
        .update({ payment_method: "cashplus" })
        .eq("id", booking.id)
        .eq("booking_status", "draft");
    }

    ycRef.current
      .pay(token)
      .then(async (response: any) => {
        const transactionId =
          response?.transaction_id ||
          response?.transactionId ||
          response?.transaction?.id ||
          response?.id;

        // Cash Plus voucher creation resolves without an online transaction id.
        // The gateway UI can be rendered inside its own DOM, so our visual
        // detector is not always reliable on all devices/browsers.
        if (!transactionId) {
          usingCashplus = true;
          await supabase
            .from("bookings")
            .update({ payment_method: "cashplus" })
            .eq("id", booking.id)
            .eq("booking_status", "draft");
        }

        toast.success(usingCashplus ? "Cash Plus voucher created" : "Payment submitted");

        // Cash Plus = no online charge yet; the user must walk to an agency.
        // Skip the 60s /payment-status polling page (built for cards) and
        // jump straight to the confirmation page which has the proper
        // voucher UI + 72h background poll.
        if (usingCashplus) {
          navigate(`/booking/${booking.id}/confirmed`, { replace: true });
          return;
        }

        const qs = new URLSearchParams({
          pid,
          next: `/booking/${booking.id}/confirmed`,
          retry: `/checkout/${booking.id}`,
          outcome: "success",
          title: "Pay booking fee",
        });
        if (transactionId) qs.set("transaction_id", String(transactionId));
        navigate(`/payment-status?${qs.toString()}`, { replace: true });
      })
      .catch((err: any) => {
        console.error("YouCan Pay error", err);
        const message =
          typeof err === "string"
            ? err
            : err?.message || "Payment failed. Please try again.";
        toast.error(message);
        setYcStatus("ready");
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 py-6 max-w-6xl min-w-0">
        <div className="flex items-center gap-3 mb-6 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
              Review and pay
            </h1>
            <p className="text-sm text-muted-foreground">
              Confirm your reservation, then complete the booking fee.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 min-w-0">
          <div className="lg:col-span-3 space-y-6 min-w-0">
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex gap-3 sm:gap-4 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {booking.bike?.image_url ? (
                      <img
                        src={booking.bike.image_url}
                        alt={booking.bike.name ?? "Motorbike"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BikeIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                      {booking.bike?.name ?? "Motorbike"}
                    </h2>
                    <p className="text-sm text-muted-foreground truncate">
                      {dailyPrice} MAD / day · {booking.bike?.city ?? "Morocco"}
                    </p>
                    <Link
                      to={`/bike/${booking.bike_id}`}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View listing
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4 min-w-0">
                <h3 className="font-semibold text-foreground">Trip details</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Pickup</p>
                      <p className="text-muted-foreground">
                        {format(new Date(booking.pickup_date), "EEE, MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Return</p>
                      <p className="text-muted-foreground">
                        {format(new Date(booking.return_date), "EEE, MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        {booking.delivery_method === "delivery"
                          ? "Delivery"
                          : "Pickup at agency"}
                      </p>
                      <p className="text-muted-foreground">
                        {booking.pickup_location ?? booking.bike?.city ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your info — read-only confirmation, with editable fallback when missing */}
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4 min-w-0">
                <div>
                  <h3 className="font-semibold text-foreground inline-flex items-center gap-2">
                    Your info
                    {!showEditor && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {showEditor
                      ? mustEdit
                        ? "Please complete your details before paying."
                        : "Update your details, then save."
                      : "Please confirm your details."}
                  </p>
                </div>

                {showEditor ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="As shown on your ID"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <p className="text-sm text-foreground">{profileEmail}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+212 …"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveInfo}
                        disabled={savingInfo}
                      >
                        {savingInfo ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Saving…
                          </>
                        ) : (
                          "Save info"
                        )}
                      </Button>
                      {!mustEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(false);
                            setEditName(profileName);
                            setEditPhone(profilePhone);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Full name</span>
                      <span className="font-medium text-foreground text-right">{profileName}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium text-foreground text-right break-all">{profileEmail}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium text-foreground text-right">{profilePhone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit details
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-3 min-w-0">
                <h3 className="font-semibold text-foreground">Price breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      Rental ({Math.round(dailyPrice)} MAD × {days} {days === 1 ? "day" : "days"})
                    </span>
                    <span>{baselineSubtotal} MAD</span>
                  </div>
                  {volumeDiscount > 0 && (
                    <div className="flex justify-between" style={{ color: "#22C55E" }}>
                      <span>Volume discount</span>
                      <span>-{volumeDiscount} MAD</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span>Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span className="text-foreground">Total trip cost</span>
                    <span className="text-foreground">{rentalSubtotal} MAD</span>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 mt-2 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Pay now (booking fee)</span>
                      <span className="font-semibold text-foreground">
                        {UPFRONT_TOTAL_MAD} MAD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Pay at shop (rental balance)</span>
                      <span>{dueAtPickup} MAD</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 min-w-0">
            <Card className="lg:sticky lg:top-24 min-w-0 overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-5 min-w-0">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Booking fee:{" "}
                    <span className="text-foreground">{UPFRONT_TOTAL_MAD} MAD</span>
                  </h2>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform fee</span>
                      <span>{PLATFORM_FEE_MAD} MAD</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Confirmation fee</span>
                      <span>{CONFIRMATION_FEE_MAD} MAD</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div id="ycpay-error" className="text-sm text-destructive mb-2" />
                  <div
                    id="ycpay-form"
                    className="ycpay-mount min-h-[180px] w-full max-w-full min-w-0 overflow-x-auto rounded-lg border border-border p-3 bg-muted/30"
                  />
                  {ycStatus === "loading" && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading payment form…
                    </div>
                  )}
                  {ycStatus === "error" && (
                    <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      {ycError}
                    </div>
                  )}
                </div>

                {cashplusActive && (
                  <div className="rounded-lg border-2 border-[#9FE870] bg-[#9FE870]/10 p-4 space-y-3 max-w-full overflow-hidden min-w-0">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-[#163300]" />
                      <h4 className="font-semibold text-foreground">Pay with Cash Plus</h4>
                    </div>
                    <ol className="list-decimal list-inside text-sm text-foreground/90 space-y-1">
                      <li>Note the payment code shown above.</li>
                      <li>Visit any Cash Plus agent in Morocco.</li>
                      <li>Give them the code + {UPFRONT_TOTAL_MAD} MAD.</li>
                      <li>Your booking confirms automatically.</li>
                    </ol>
                    <a
                      href="https://www.cashplus.ma/agences"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Find nearest Cash Plus agent
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Code valid for 48 hours
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleVerifyCashplus}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying…
                        </>
                      ) : (
                        "I've paid — verify now"
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground border-t border-border pt-2">
                      Booking ref: <span className="font-mono">#{booking.id.slice(0, 8).toUpperCase()}</span>
                      <br />
                      You can close this page. Your booking will confirm automatically after payment.
                    </p>
                  </div>
                )}

                <label className="flex items-start gap-3 cursor-pointer rounded-lg border-2 border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/30">
                  <Checkbox
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(!!v)}
                    className="peer shrink-0 rounded-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 h-5 w-5 border-2 border-[#163300] bg-white data-[state=checked]:bg-[#9FE870] data-[state=checked]:border-[#163300] data-[state=checked]:text-[#163300]"
                  />
                  <span className="text-sm font-medium text-foreground leading-snug">
                    I agree to the{" "}
                    <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline font-semibold">
                      Terms
                    </Link>{" "}
                    &{" "}
                    <Link to="/terms#cancellation" className="text-blue-600 hover:text-blue-700 underline font-semibold">
                      Cancellation policy
                    </Link>
                    .
                  </span>
                </label>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handlePay}
                  disabled={ycStatus !== "ready" || !agreed || mustEdit || editing}
                >
                  {ycStatus === "paying" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing…
                    </>
                  ) : (
                    <>Pay {UPFRONT_TOTAL_MAD} MAD</>
                  )}
                </Button>

                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Lock className="h-3.5 w-3.5 mt-0.5" />
                    <span>Secured by YouCan Pay. We never store your card.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 mt-0.5" />
                    <span>Free cancellation up to 24h before pickup.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutDraft;
