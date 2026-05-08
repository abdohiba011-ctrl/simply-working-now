import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Bike as BikeIcon,
  MessageCircle,
  Clock,
  Loader2,
  AlertTriangle,
  LifeBuoy,
  Banknote,
  Copy,
  ExternalLink,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookingRow {
  id: string;
  bike_id: string | null;
  pickup_date: string;
  return_date: string;
  total_days: number | null;
  total_price: number | null;
  delivery_method: string | null;
  pickup_location: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  booking_status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  bike_name?: string | null;
  bike_image?: string | null;
}

const POLL_INTERVAL_MS = 2000;
const POLL_INTERVAL_CASHPLUS_MS = 10_000;
const POLL_TIMEOUT_MS = 60_000;
const POLL_TIMEOUT_CASHPLUS_MS = 72 * 60 * 60 * 1000; // effectively no client timeout

type Phase = "waiting" | "confirmed" | "timeout";

const BookingConfirmed = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [elapsed, setElapsed] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const startedAt = useRef<number>(Date.now());

  // Initial load
  useEffect(() => {
    const load = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `id, bike_id, pickup_date, return_date, total_days, total_price,
           delivery_method, pickup_location, customer_name, customer_email,
           customer_phone, booking_status, payment_status, payment_method`,
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Booking not found.");
        navigate("/");
        return;
      }
      let bikeName: string | null = null;
      let bikeImage: string | null = null;
      if (data.bike_id) {
        const { data: bikeRow } = await supabase
          .from("bikes_public" as any)
          .select("bike_type_id")
          .eq("id", data.bike_id)
          .maybeSingle() as any;
        if (bikeRow?.bike_type_id) {
          const { data: bt } = await supabase
            .from("bike_types")
            .select("name, main_image_url")
            .eq("id", bikeRow.bike_type_id)
            .maybeSingle();
          bikeName = bt?.name ?? null;
          bikeImage = bt?.main_image_url ?? null;
        }
      }
      const row = { ...(data as any), bike_name: bikeName, bike_image: bikeImage };
      setBooking(row);
      setPhase(row.payment_status === "paid" ? "confirmed" : "waiting");
      setLoading(false);
    };
    load();
  }, [bookingId, navigate]);

  const isCashplus = booking?.payment_method === "cashplus";

  // Poll for payment_status
  useEffect(() => {
    if (!bookingId || phase !== "waiting") return;
    let cancelled = false;
    let timer: number | undefined;
    const interval = isCashplus ? POLL_INTERVAL_CASHPLUS_MS : POLL_INTERVAL_MS;
    const timeout = isCashplus ? POLL_TIMEOUT_CASHPLUS_MS : POLL_TIMEOUT_MS;

    const tick = async () => {
      if (cancelled) return;
      const { data } = await supabase
        .from("bookings")
        .select("payment_status, booking_status")
        .eq("id", bookingId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.payment_status === "paid") {
        setBooking((prev) =>
          prev ? { ...prev, payment_status: "paid", booking_status: data.booking_status ?? prev.booking_status } : prev,
        );
        setPhase("confirmed");
        toast.success("Payment confirmed!");
        return;
      }
      const e = Date.now() - startedAt.current;
      setElapsed(e);
      if (e >= timeout) {
        setPhase("timeout");
        return;
      }
      timer = window.setTimeout(tick, interval);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [bookingId, phase, isCashplus]);

  const handleVerifyNow = async () => {
    if (!bookingId || verifying) return;
    setVerifying(true);
    try {
      // Find the latest payment for this booking
      const { data: pay } = await supabase
        .from("youcanpay_payments")
        .select("id, transaction_id")
        .eq("related_booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!pay?.id) {
        toast.error("No payment found for this booking yet.");
        return;
      }
      const { data, error } = await supabase.functions.invoke(
        "youcanpay-verify-payment",
        {
          body: {
            payment_id: pay.id,
            transaction_id: pay.transaction_id || undefined,
          },
        },
      );
      if (error) throw error;
      if ((data as any)?.status === "paid") {
        setBooking((prev) => (prev ? { ...prev, payment_status: "paid" } : prev));
        setPhase("confirmed");
        toast.success("Payment confirmed!");
      } else {
        toast.info("Still pending. Try again in a moment.");
        startedAt.current = Date.now();
        setElapsed(0);
        setPhase("waiting");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not verify payment.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-10 max-w-2xl space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!booking) return null;

  // Build a short, human-friendly reference for Cash Plus: 8 hex chars, uppercased.
  const shortRef = booking.id.slice(0, 8).toUpperCase();
  const cashplusAmount = 60; // platform fee + confirmation fee, paid upfront in cash
  const cashplusShareText =
    `Motonita booking — pay ${cashplusAmount} MAD at any Cash Plus agency in Morocco.\n` +
    `Reference: ${shortRef}\n` +
    `Find an agency: https://www.cashplus.ma/agences`;

  const handleCopyRef = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shortRef);
      } else {
        const ta = document.createElement("textarea");
        ta.value = shortRef;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Reference copied");
    } catch {
      toast.error("Could not copy — long-press to copy manually");
    }
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(cashplusShareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ---------- Dedicated Cash Plus voucher screen ----------
  if (isCashplus && phase === "waiting") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
          {/* Hero */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-[#9FE870]/25 mb-4">
              <Banknote className="h-9 w-9 text-[#163300]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Almost done — pay at Cash Plus
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Your booking is held. Walk into any Cash Plus agency in Morocco,
              hand over the reference and {cashplusAmount} MAD in cash, and
              we'll confirm your bike automatically.
            </p>
          </div>

          {/* Reference card */}
          <Card className="border-2 border-[#9FE870]">
            <CardContent className="p-6 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Your reference
                </p>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 border border-border p-4">
                  <span className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-foreground">
                    {shortRef}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyRef}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Amount to pay</p>
                  <p className="font-bold text-foreground text-lg">{cashplusAmount} MAD</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Expires in</p>
                  <p className="font-bold text-foreground text-lg">72 hours</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  className="flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Send to WhatsApp
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <a
                    href="https://www.cashplus.ma/agences"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Find nearest agency
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How to pay */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-foreground">How to pay</h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1.5">
                <li>Go to any Cash Plus agency in Morocco.</li>
                <li>Show the reference <span className="font-mono font-semibold text-foreground">{shortRef}</span> to the agent.</li>
                <li>Pay <span className="font-semibold text-foreground">{cashplusAmount} MAD</span> in cash.</li>
                <li>Your booking confirms automatically — you don't need to come back here.</li>
              </ol>
            </CardContent>
          </Card>

          {/* Status pill */}
          <div className="flex items-center justify-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground mx-auto w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Waiting for payment at Cash Plus
          </div>

          {/* Booking summary (compact) */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {booking.bike_image ? (
                    <img
                      src={booking.bike_image}
                      alt={booking.bike_name ?? "Motorbike"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BikeIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground truncate">
                    {booking.bike_name ?? "Motorbike"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(booking.pickup_date), "MMM d")} →{" "}
                    {format(new Date(booking.return_date), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.delivery_method === "delivery"
                      ? "Delivery"
                      : "Pickup at agency"}{" "}
                    · {booking.pickup_location ?? "—"}
                  </p>
                </div>
              </div>

              <Button asChild variant="hero" size="lg" className="w-full h-12 text-base font-semibold">
                <Link to="/inbox">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Message agency
                </Link>
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                You can safely close this page. We'll email you once Cash Plus
                confirms your payment.
              </p>
            </CardContent>
          </Card>

          {/* Subtle escape hatch */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleVerifyNow}
              disabled={verifying}
              className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
            >
              {verifying ? "Checking…" : "Already paid? Check now"}
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        {/* Header / Status */}
        <div className="text-center mb-8 transition-all duration-500">
          {phase === "confirmed" ? (
            <>
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 mb-4 animate-in fade-in zoom-in duration-500">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Booking confirmed!
              </h1>
              <p className="text-muted-foreground mt-2">
                You paid 60 MAD. Your bike is reserved.
              </p>
            </>
          ) : phase === "waiting" ? (
            <>
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                <Loader2 className="h-9 w-9 text-primary animate-spin" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Confirming your payment…
              </h1>
              <p className="text-muted-foreground mt-2">
                This usually takes a few seconds.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {Math.max(0, Math.ceil((POLL_TIMEOUT_MS - elapsed) / 1000))}s remaining
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/15 mb-4">
                <AlertTriangle className="h-9 w-9 text-amber-600" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Payment is taking longer than expected
              </h1>
              <p className="text-muted-foreground mt-2">
                If your card was charged, verify directly with the payment
                provider.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                <Button
                  variant="hero"
                  onClick={handleVerifyNow}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify payment now"
                  )}
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={`mailto:support@motonita.ma?subject=${encodeURIComponent(
                      `Payment stuck — booking ${booking.id}`,
                    )}`}
                  >
                    <LifeBuoy className="h-4 w-4 mr-2" />
                    Contact support
                  </a>
                </Button>
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Ref: {booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {booking.bike_image ? (
                  <img
                    src={booking.bike_image}
                    alt={booking.bike_name ?? "Motorbike"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BikeIcon className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground truncate">
                  {booking.bike_name ?? "Motorbike"}
                </h2>
                {booking.total_price != null && (
                  <p className="text-sm text-muted-foreground">
                    Trip total: {booking.total_price} MAD
                  </p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Pickup</p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.pickup_date), "EEE, MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Return</p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.return_date), "EEE, MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">
                    {booking.delivery_method === "delivery"
                      ? "Delivery"
                      : "Pickup at agency"}
                  </p>
                  <p className="text-muted-foreground">
                    {booking.pickup_location ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {phase === "confirmed" && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold text-foreground inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  What happens next
                </p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>The agency receives your booking and has 24h to confirm.</li>
                  <li>You'll be notified by email and in-app message.</li>
                  <li>Coordinate pickup details directly with the agency.</li>
                  <li>Pay the rental balance to the agency at pickup.</li>
                </ol>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button asChild variant="hero" size="lg" className="flex-1">
                <Link to="/booking-history">View my bookings</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link to="/inbox">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message agency
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingConfirmed;
