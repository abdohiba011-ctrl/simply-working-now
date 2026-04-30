import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ChevronRight, Phone, Mail, MapPin, Check, X, ArrowLeft, Printer } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/shared/StatusChip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Booking {
  id: string;
  status: string | null;
  booking_status: string | null;
  payment_status: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_date: string;
  return_date: string;
  pickup_time: string | null;
  return_time: string | null;
  pickup_location: string | null;
  return_location: string | null;
  total_price: number | null;
  total_days: number | null;
  amount_paid: number | null;
  bike_id: string | null;
  notes: string | null;
  created_at: string;
  amount_due_at_pickup_mad: number | null;
  deposit_amount_mad: number | null;
  platform_fee_paid_amount_mad: number | null;
  confirmation_fee_paid_amount_mad: number | null;
}

const safeDate = (s: string) => {
  try { return format(parseISO(s), "MMM d, yyyy"); } catch { return s; }
};

const BookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from("bookings").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setBooking(data as Booking | null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <AgencyLayout>
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      </AgencyLayout>
    );
  }

  if (!booking) {
    return (
      <AgencyLayout>
        <div className="mx-auto max-w-3xl py-20 text-center">
          <h2 className="text-xl font-semibold">Booking not found</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/agency/bookings")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to bookings
          </Button>
        </div>
      </AgencyLayout>
    );
  }

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("confirm_booking", { _booking_id: booking.id });
    setBusy(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("NOT_PENDING")) {
        return toast.error("Booking is no longer pending.");
      }
      if (msg.includes("NOT_ASSIGNED_TO_YOU")) {
        return toast.error("This booking is not assigned to your agency.");
      }
      return toast.error(msg);
    }
    toast.success("Booking confirmed — renter prepaid the confirmation fee, no wallet charge.");
    setBooking({ ...booking, status: "confirmed", booking_status: "confirmed" });
  };

  const decline = async () => {
    if (!cancelReason.trim()) return toast.error("Please add a reason");
    setBusy(true);
    const { error } = await supabase.rpc("decline_booking", {
      _booking_id: booking.id,
      _reason: cancelReason,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Booking declined — renter received 50 MAD Motonita Credit.");
    setCancelOpen(false);
    navigate("/agency/bookings");
  };

  const lateCancel = async () => {
    if (!cancelReason.trim()) return toast.error("Please add a reason");
    setBusy(true);
    const { error } = await supabase.rpc("last_minute_cancel_by_agency", {
      _booking_id: booking.id,
      _reason: cancelReason,
    });
    setBusy(false);
    if (error) {
      if ((error.message || "").includes("NOT_LAST_MINUTE")) {
        return toast.error("Use Decline — pickup is more than 24h away.");
      }
      return toast.error(error.message);
    }
    toast.error("Late cancellation — 50 MAD penalty deducted; renter refunded as credit.");
    setCancelOpen(false);
    navigate("/agency/bookings");
  };

  const reportNoShow = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("report_no_show", { _booking_id: booking.id });
    setBusy(false);
    if (error) {
      if ((error.message || "").includes("PICKUP_NOT_PAST")) {
        return toast.error("You can only report no-show after the pickup date.");
      }
      return toast.error(error.message);
    }
    toast.success("No-show reported. Renter's account flagged.");
    setBooking({ ...booking, status: "no_show", booking_status: "no_show" });
  };

  const cancel = async () => {
    if (!cancelReason.trim()) return toast.error("Please add a reason");
    setBusy(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        booking_status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancelReason,
      })
      .eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    setCancelOpen(false);
    navigate("/agency/bookings");
  };

  const status = (booking.booking_status || booking.status || "").toLowerCase();
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const hoursToPickup = (new Date(booking.pickup_date).getTime() - Date.now()) / 3.6e6;
  const isLastMinute = isConfirmed && hoursToPickup < 24;
  const pickupPast = new Date(booking.pickup_date).getTime() < Date.now();
  const [cancelMode, setCancelMode] = useState<"decline" | "late">("decline");

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/agency/bookings" className="hover:text-foreground">Bookings</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">#{booking.id.slice(0, 8)}</span>
          </nav>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Booking #{booking.id.slice(0, 8)}</h1>
              <StatusChip status={booking.booking_status || booking.status || "pending"} size="lg" />
            </div>
            <div className="flex flex-wrap gap-2">
              {isPending && (
                <>
                  <Button size="sm" className="gap-2" onClick={confirm} disabled={busy}>
                    <Check className="h-4 w-4" /> Confirm
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => { setCancelMode("decline"); setCancelOpen(true); }}>
                    <X className="h-4 w-4" /> Decline
                  </Button>
                </>
              )}
              {isConfirmed && isLastMinute && (
                <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => { setCancelMode("late"); setCancelOpen(true); }}>
                  <X className="h-4 w-4" /> Cancel (50 MAD penalty)
                </Button>
              )}
              {isConfirmed && pickupPast && (
                <Button variant="outline" size="sm" className="gap-2" onClick={reportNoShow} disabled={busy}>
                  Report no-show
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Customer</h2>
          <div className="mt-3">
            <p className="text-lg font-semibold">{booking.customer_name || "—"}</p>
            <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {booking.customer_phone && (
                <a href={`tel:${booking.customer_phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" /> {booking.customer_phone}
                </a>
              )}
              {booking.customer_email && (
                <a href={`mailto:${booking.customer_email}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" /> {booking.customer_email}
                </a>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Booking details</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="font-medium">{safeDate(booking.pickup_date)} {booking.pickup_time || ""}</p>
              {booking.pickup_location && (
                <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {booking.pickup_location}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Return</p>
              <p className="font-medium">{safeDate(booking.return_date)} {booking.return_time || ""}</p>
              {booking.return_location && (
                <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {booking.return_location}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total days</p>
              <p className="font-medium">{booking.total_days ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment status</p>
              <Badge variant="outline" className="mt-1 capitalize">{booking.payment_status || "—"}</Badge>
            </div>
          </div>
          {booking.notes && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p>
              <p className="mt-1">{booking.notes}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Rental total (listed)</span><span className="font-medium">{Number(booking.total_price || 0).toLocaleString()} MAD</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Renter prepaid Motonita</span><span className="font-medium">{Number((booking.platform_fee_paid_amount_mad || 0) + (booking.confirmation_fee_paid_amount_mad || 0)).toLocaleString()} MAD</span></div>
            <div className="my-2 border-t" />
            <div className="flex justify-between"><span>You collect at pickup</span><span className="text-base font-bold">{Number(booking.amount_due_at_pickup_mad || 0).toLocaleString()} MAD</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">+ Refundable deposit</span><span className="font-medium">{Number(booking.deposit_amount_mad || 0).toLocaleString()} MAD</span></div>
            <p className="text-xs text-muted-foreground pt-2">Renter already paid Motonita the 50 MAD confirmation fee — collect rental minus 50, plus deposit.</p>
          </div>
        </Card>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cancelMode === "late" ? "Last-minute cancellation" : "Decline booking"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {cancelMode === "late"
              ? "Pickup is less than 24h away. A 50 MAD penalty will be deducted from your wallet, and the renter will receive 50 MAD as Motonita Credit. Two such incidents in 30 days suspend your agency."
              : "The renter will receive 50 MAD as Motonita Credit. The 10 MAD platform fee is not refunded."}
          </p>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason…"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>Back</Button>
            <Button variant="destructive" onClick={cancelMode === "late" ? lateCancel : decline} disabled={busy}>
              {cancelMode === "late" ? "Confirm late cancel" : "Confirm decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AgencyLayout>
  );
};

export default BookingDetail;
