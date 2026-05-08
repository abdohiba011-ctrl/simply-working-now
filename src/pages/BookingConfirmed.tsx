import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Info,
  Phone,
  Mail,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
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
const POLL_INTERVAL_CASHPLUS_MS = 5_000;
const POLL_TIMEOUT_MS = 60_000;
// CashPlus must be paid within 10 minutes — same window enforced server-side
// by the auto_cancel_unpaid_bookings cron. After that the bike is released.
const CASHPLUS_PAYMENT_WINDOW_MS = 10 * 60 * 1000;
const POLL_TIMEOUT_CASHPLUS_MS = CASHPLUS_PAYMENT_WINDOW_MS;

type Phase = "waiting" | "confirmed" | "timeout" | "expired";

const BookingConfirmed = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [elapsed, setElapsed] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  // YouCan Pay's actual CashPlus voucher code (e.g. "cp203854361") — this is
  // the only reference Cash Plus agents recognize. Filled from
  // youcanpay_payments.transaction_id once YouCan returns it.
  const [cashplusReference, setCashplusReference] = useState<string | null>(null);
  const [cashplusStartedAt, setCashplusStartedAt] = useState<string | null>(null);
  const [bikeSlug, setBikeSlug] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startedAt = useRef<number>(Date.now());

  const handleMessageAgency = async () => {
    if (!booking?.id || isOpeningChat) return;
    setIsOpeningChat(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        navigate(`/inbox?booking=${booking.id}`);
        return;
      }

      // Only seed the opener if this renter hasn't sent anything on this booking yet.
      const { count } = await supabase
        .from("booking_messages")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", booking.id)
        .eq("sender_id", uid);

      if ((count ?? 0) === 0) {
        const bikeLabel = booking.bike_name || "the bike";
        const pickupLabel = booking.pickup_date
          ? format(new Date(booking.pickup_date), "MMM d")
          : "";
        const returnLabel = booking.return_date
          ? format(new Date(booking.return_date), "MMM d")
          : "";
        const dateRange =
          pickupLabel && returnLabel ? ` for ${pickupLabel} → ${returnLabel}` : "";
        const body =
          `Hi! I just booked ${bikeLabel}${dateRange}. ` +
          `Could you let me know the next steps and where I can pick it up? Thanks!`;

        await supabase.from("booking_messages").insert({
          booking_id: booking.id,
          sender_id: uid,
          sender_role: "renter",
          message_type: "text",
          body,
        });
      }
    } catch (e) {
      console.error("Failed to seed agency opener message", e);
    } finally {
      navigate(`/inbox?booking=${booking.id}`);
    }
  };

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
            .select("name, main_image_url, slug")
            .eq("id", bikeRow.bike_type_id)
            .maybeSingle();
          bikeName = bt?.name ?? null;
          bikeImage = bt?.main_image_url ?? null;
          setBikeSlug((bt as any)?.slug ?? null);
        }
      }
      const { data: latestPayment } = await supabase
        .from("youcanpay_payments")
        .select("amount,status,transaction_id,created_at,method")
        .eq("related_booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const inferredCashplus =
        !data.payment_method &&
        ((latestPayment?.method === "cashplus") ||
          (Number(latestPayment?.amount) === 60 &&
            latestPayment?.status === "pending" &&
            !latestPayment?.transaction_id));

      const row = {
        ...(data as any),
        payment_method: inferredCashplus ? "cashplus" : data.payment_method,
        bike_name: bikeName,
        bike_image: bikeImage,
      };
      setBooking(row);
      setCashplusReference((latestPayment?.transaction_id as string | null) || null);
      setCashplusStartedAt((latestPayment?.created_at as string | null) || null);
      const isCancelled = (data as any).booking_status === "cancelled";
      setPhase(
        row.payment_status === "paid"
          ? "confirmed"
          : isCancelled
          ? "expired"
          : "waiting",
      );
      setLoading(false);
    };
    load();
  }, [bookingId, navigate]);

  const isCashplus = booking?.payment_method === "cashplus";

  // Poll for payment_status (and refresh CashPlus voucher reference)
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
      if (data?.booking_status === "cancelled") {
        setPhase("expired");
        return;
      }
      // Refresh CashPlus voucher reference if YouCan has now returned it.
      if (isCashplus) {
        const { data: pay } = await supabase
          .from("youcanpay_payments")
          .select("transaction_id, created_at")
          .eq("related_booking_id", bookingId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && pay) {
          if (pay.transaction_id) setCashplusReference(pay.transaction_id as string);
          if (pay.created_at) setCashplusStartedAt(pay.created_at as string);
        }
      }
      const e = Date.now() - startedAt.current;
      setElapsed(e);
      if (e >= timeout) {
        setPhase(isCashplus ? "expired" : "timeout");
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

  // 1-second tick for the CashPlus countdown.
  useEffect(() => {
    if (!isCashplus || phase !== "waiting") return;
    const i = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(i);
  }, [isCashplus, phase]);

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

  // Internal short handle (used for support tickets / WhatsApp share — NOT the
  // CashPlus agent reference). The real CashPlus reference is `cashplusReference`
  // (e.g. "cp203854361"), issued by YouCan Pay and the only code Cash Plus
  // agents recognize.
  const shortRef = booking.id.slice(0, 8).toUpperCase();
  const cashplusAmount = 60; // platform fee + confirmation fee, paid upfront in cash
  const voucherCode = cashplusReference; // null until YouCan returns it
  const hasVoucher = !!voucherCode;

  // 10-minute countdown driven by the payment row's created_at (falls back to
  // booking.created_at). After this elapses, the auto_cancel_unpaid_bookings
  // cron releases the bike server-side.
  const startMs = (() => {
    const iso = cashplusStartedAt || (booking as any).created_at;
    return iso ? new Date(iso).getTime() : Date.now();
  })();
  const deadlineMs = startMs + CASHPLUS_PAYMENT_WINDOW_MS;
  const remainingMs = Math.max(0, deadlineMs - now);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);
  const countdownLabel = `${String(remainingMin).padStart(2, "0")}:${String(remainingSec).padStart(2, "0")}`;

  const cashplusShareText = hasVoucher
    ? `Motonita booking — pay ${cashplusAmount} MAD at any Cash Plus agency in Morocco.\n` +
      `Reference: ${voucherCode}\n` +
      `Find an agency: https://www.cashplus.ma/agences`
    : `Motonita booking — pay ${cashplusAmount} MAD at any Cash Plus agency in Morocco.\n` +
      `Find an agency: https://www.cashplus.ma/agences`;

  const handleCopyRef = async () => {
    if (!voucherCode) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(voucherCode);
      } else {
        const ta = document.createElement("textarea");
        ta.value = voucherCode;
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

  // ---------- Cash Plus voucher expired (10-min window elapsed) ----------
  if (isCashplus && phase === "expired") {
    const retryHref = bikeSlug ? `/bike/${bikeSlug}` : "/listings";
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-10 max-w-xl space-y-6">
          <Card className="border-2 border-destructive/40">
            <CardContent className="p-6 text-center space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
                <XCircle className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Time's up — booking released
              </h1>
              <p className="text-sm text-muted-foreground">
                The 10-minute Cash Plus payment window has expired. The bike has
                been released and your booking was cancelled. No charge was
                taken — feel free to book again.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button variant="hero" onClick={() => navigate(retryHref)}>
                  Book again
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Back to home
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground/70 font-mono pt-2 border-t border-border/50">
                Ref: {shortRef}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---------- Dedicated Cash Plus voucher screen ----------
  if (isCashplus && phase === "waiting") {
    const supportPhoneDisplay = "+212 710 564 476";
    const supportPhoneRaw = "+212710564476";
    const supportEmail = "support@motonita.ma";
    const emailSubject = `Cash Plus payment — ${shortRef}`;
    const emailBody =
      `Hi Motonita team,\n\nI've already paid at Cash Plus and would like help confirming my booking.\n\nReference: ${shortRef}\nAmount: ${cashplusAmount} MAD\n\nThanks.`;
    const supportMailto = `mailto:${supportEmail}?subject=${encodeURIComponent(
      emailSubject,
    )}&body=${encodeURIComponent(emailBody)}`;

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
              Your booking is reserved. To confirm it, take the reference below
              to any <span className="font-semibold text-foreground">Cash Plus</span> agency
              in Morocco and pay <span className="font-semibold text-foreground">{cashplusAmount} MAD in cash</span>.
              We'll confirm your bike automatically — you don't need to come back to this page.
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
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1.5 marker:font-semibold marker:text-foreground">
                <li>Walk into any Cash Plus agency (over 2,500 across Morocco).</li>
                <li>
                  Show the reference{" "}
                  <span className="font-mono font-semibold text-foreground">{shortRef}</span>{" "}
                  to the agent and say it's for "Motonita / YouCan Pay".
                </li>
                <li>
                  Pay <span className="font-semibold text-foreground">{cashplusAmount} MAD in cash</span>.
                  Keep your receipt.
                </li>
                <li>
                  Wait for our confirmation — usually{" "}
                  <span className="font-semibold text-foreground">1 to 60 minutes</span>{" "}
                  after the agent processes your payment.
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Important to know */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600" />
                <h3 className="font-semibold text-foreground">Important to know</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    Cash Plus agencies are usually <span className="font-medium text-foreground">closed on Sundays</span>{" "}
                    and may have reduced hours on public holidays. Plan accordingly.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    Your reference is valid for <span className="font-medium text-foreground">72 hours</span>.
                    After that, the booking is automatically cancelled and you'll need to start over.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    We confirm bookings <span className="font-medium text-foreground">automatically</span>.
                    The delay between paying and seeing confirmation depends on Cash Plus's system —
                    usually a few minutes, sometimes up to an hour.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    Once paid, you can safely close this page. We'll email you the moment
                    it's confirmed, and you'll be able to message the agency from your bookings.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Status pill */}
          <div className="flex items-center justify-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground mx-auto w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Waiting for payment at Cash Plus
          </div>

          {/* Support — only relevant after paying */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-foreground" />
                  Already paid? Need help?
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  If you've paid at Cash Plus and nothing happened after 1 hour, contact us.
                  Please <span className="font-medium text-foreground">don't call before paying</span> —
                  it slows us down for users who actually need help.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button variant="outline" asChild className="w-full">
                  <a
                    href={`https://wa.me/212710564476?text=${encodeURIComponent(
                      `Hi, I paid at Cash Plus for booking ${shortRef}.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon className="h-4 w-4 mr-2 text-emerald-600" />
                    WhatsApp
                  </a>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <a href={`tel:${supportPhoneRaw}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    {supportPhoneDisplay}
                  </a>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <a href={supportMailto}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </a>
                </Button>
              </div>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleVerifyNow}
                  disabled={verifying}
                  className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
                >
                  {verifying ? "Checking…" : "Already paid? Check status now"}
                </button>
              </div>
            </CardContent>
          </Card>

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

              <p className="text-[11px] text-muted-foreground text-center">
                The "Message agency" button will appear here automatically once
                Cash Plus confirms your payment.
              </p>
            </CardContent>
          </Card>
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
                  <li>You'll be notified by email, in-app message, or WhatsApp.</li>
                  <li>Coordinate pickup details directly with the agency.</li>
                  <li>Pay the rental balance to the agency at pickup.</li>
                </ol>
              </div>
            )}

            <div className="pt-1">
              <Button
                onClick={handleMessageAgency}
                disabled={isOpeningChat}
                variant="hero"
                size="lg"
                className="w-full h-12 text-base font-semibold"
              >
                {isOpeningChat ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-5 w-5 mr-2" />
                )}
                Message agency
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingConfirmed;
