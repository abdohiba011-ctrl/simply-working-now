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
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

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
          navigate(`/booking/${data.id}/confirmed`);
          return;
        }

        let bikeInfo: DraftBooking["bike"] = undefined;
        if (data.bike_id) {
          const { data: bikeRow } = await supabase
            .from("bikes")
            .select("location, bike_type_id")
            .eq("id", data.bike_id)
            .maybeSingle();
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

  const days = booking?.total_days ?? 1;
  const dailyPrice = booking?.bike?.daily_price ?? 0;
  const rentalSubtotal = booking?.total_price ?? days * dailyPrice;
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
    ycRef.current
      .pay(token)
      .then((response: any) => {
        toast.success("Payment submitted");
        const transactionId =
          response?.transaction_id ||
          response?.transactionId ||
          response?.transaction?.id ||
          response?.id;
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
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Review and pay
            </h1>
            <p className="text-sm text-muted-foreground">
              Confirm your reservation, then complete the booking fee.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
                    <h2 className="text-lg font-semibold text-foreground truncate">
                      {booking.bike?.name ?? "Motorbike"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
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

            <Card>
              <CardContent className="p-5 space-y-4">
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
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">Your info</h3>
                  <p className="text-sm text-muted-foreground">
                    {showEditor
                      ? "Please complete your details before paying."
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

            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-foreground">Price breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {dailyPrice} MAD × {days} {days === 1 ? "day" : "days"}
                    </span>
                    <span>{rentalSubtotal} MAD</span>
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

          <div className="lg:col-span-2">
            <Card className="lg:sticky lg:top-24">
              <CardContent className="p-5 space-y-5">
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
                    className="min-h-[180px] rounded-lg border border-border p-3 bg-muted/30"
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

                <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
                  <Checkbox
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(!!v)}
                    className="mt-0.5"
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms
                    </Link>{" "}
                    &{" "}
                    <Link to="/terms#cancellation" className="text-primary hover:underline">
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
                  disabled={ycStatus !== "ready" || !agreed}
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
