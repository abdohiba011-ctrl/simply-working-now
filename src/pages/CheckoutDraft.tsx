import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Banknote,
  MapPin,
  Calendar,
  Bike as BikeIcon,
  ChevronLeft,
  ShieldCheck,
  Lock,
  Info,
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

type PaymentMethod = "card" | "cash";

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
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<DraftBooking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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

        // Fetch bike type info via bike → bike_type.
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
        setName(data.customer_name || "");
        setEmail(data.customer_email || user?.email || "");
        setPhone(data.customer_phone || "");
      } catch (e) {
        console.error(e);
        toast.error("Could not load checkout. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId, navigate, user]);

  const days = booking?.total_days ?? 1;
  const dailyPrice = booking?.bike?.daily_price ?? 0;
  const rentalSubtotal = booking?.total_price ?? days * dailyPrice;
  const dueAtPickup = Math.max(0, rentalSubtotal - CONFIRMATION_FEE_MAD);

  const validateForm = () => {
    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return false;
    }
    if (!email.trim() || !/.+@.+\..+/.test(email)) {
      toast.error("Please enter a valid email.");
      return false;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number.");
      return false;
    }
    return true;
  };

  const persistRenterInfo = async () => {
    const { error } = await supabase
      .from("bookings")
      .update({
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
      })
      .eq("id", bookingId!)
      .eq("booking_status", "draft");
    if (error) throw error;
  };

  const handleCardPay = async () => {
    if (!booking || !validateForm()) return;
    setSubmitting(true);
    try {
      await persistRenterInfo();

      const { data: tokenResp, error: tokenErr } =
        await supabase.functions.invoke("youcanpay-create-token", {
          body: {
            purpose: "booking_payment",
            amount: UPFRONT_TOTAL_MAD,
            currency: "MAD",
            related_booking_id: booking.id,
            customer_email: email.trim(),
            customer_name: name.trim(),
          },
        });

      if (tokenErr || !tokenResp?.token_id || !tokenResp?.public_key) {
        const detail =
          (tokenResp && (tokenResp.error || tokenResp.details?.message)) ||
          tokenErr?.message ||
          "Payment service is unavailable.";
        toast.error(`Payment could not start: ${detail}`);
        setSubmitting(false);
        return;
      }

      const successPath = `/booking/${booking.id}/confirmed`;
      const errorPath = `/checkout/${booking.id}?yc=error`;
      const qs = new URLSearchParams({
        token: tokenResp.token_id,
        pubKey: tokenResp.public_key,
        pid: tokenResp.payment_id,
        amount: String(UPFRONT_TOTAL_MAD),
        currency: "MAD",
        sandbox: tokenResp.is_sandbox ? "1" : "0",
        success: successPath,
        error: errorPath,
        title: "Pay booking fee",
      });
      navigate(`/pay/youcanpay?${qs.toString()}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Could not start payment. Please try again.");
      setSubmitting(false);
    }
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

            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">Your info</h3>
                  <p className="text-sm text-muted-foreground">
                    The agency will use this to contact you about pickup.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="As shown on your ID"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+212 …"
                    />
                  </div>
                </div>
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
                      <span className="font-medium text-foreground inline-flex items-center gap-1.5">
                        Pay now (booking fee)
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
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
                    Payment method
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Booking fee:{" "}
                    <span className="font-semibold text-foreground">
                      {UPFRONT_TOTAL_MAD} MAD
                    </span>
                  </p>
                </div>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="space-y-3"
                >
                  <label
                    htmlFor="pm-card"
                    className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem id="pm-card" value="card" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-foreground" />
                        <span className="font-medium text-foreground">Card</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Visa, Mastercard, CMI. Secured by YouCan Pay.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="pm-cash"
                    className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      paymentMethod === "cash"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem id="pm-cash" value="cash" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-foreground" />
                        <span className="font-medium text-foreground">Cash Plus</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pay at any Cash Plus agent in Morocco.
                      </p>
                    </div>
                  </label>
                </RadioGroup>

                {paymentMethod === "cash" && (
                  <div className="rounded-lg border border-border p-4 text-sm space-y-3">
                    <p className="font-medium text-foreground">
                      How to pay with Cash Plus
                    </p>
                    <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                      <li>Press <span className="font-semibold text-foreground">Continue</span> below to start your payment.</li>
                      <li>You'll receive a Cash Plus reference code on the next screen.</li>
                      <li>Visit any Cash Plus agent and pay <span className="font-semibold text-foreground">{UPFRONT_TOTAL_MAD} MAD</span> using the reference.</li>
                      <li>Your booking confirms automatically once Cash Plus reports the payment (usually within minutes).</li>
                    </ol>
                  </div>
                )}

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handleCardPay}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Starting payment…
                    </>
                  ) : (
                    <>
                      {paymentMethod === "cash" ? "Continue to Cash Plus" : "Pay"} {UPFRONT_TOTAL_MAD} MAD
                    </>
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
