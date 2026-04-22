import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ChevronRight, Phone, Mail, MapPin, ShieldCheck, Star, Printer, MessageCircle,
  Check, X, AlertTriangle, FileText, Upload, ChevronDown, ChevronUp, ArrowLeft,
} from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StatusChip } from "@/components/shared/StatusChip";
import { findBooking, findBike, findCustomer, AgencyBookingStatus } from "@/data/agencyMockData";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS: { key: AgencyBookingStatus; label: string }[] = [
  { key: "pending", label: "Booked" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "Picked up" },
  { key: "completed", label: "Returned" },
  { key: "completed", label: "Completed" },
];

const stepIndex = (s: AgencyBookingStatus) => {
  if (s === "pending") return 0;
  if (s === "confirmed") return 1;
  if (s === "in_progress") return 2;
  if (s === "completed") return 4;
  return 0;
};

const BookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agency = useAgencyStore();
  const [dangerOpen, setDangerOpen] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [notes, setNotes] = useState("");

  const booking = id ? findBooking(id) : undefined;

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

  const customer = findCustomer(booking.customerId)!;
  const bike = findBike(booking.bikeId)!;
  const currentStep = stepIndex(booking.status);
  const isPending = booking.status === "pending";

  const handleConfirm = () => {
    if (agency.walletBalance < 50) {
      toast.error("Wallet balance too low. Top up first.");
      return;
    }
    agency.setWalletBalance(agency.walletBalance - 50);
    agency.setPendingBookings(Math.max(0, agency.pendingBookings - 1));
    toast.success("Booking confirmed · 50 MAD deducted");
    setConfirmDialog(false);
  };

  const handleCancel = () => {
    if (!cancelReason) return toast.error("Select a reason");
    toast.success("Booking cancelled");
    setCancelDialog(false);
    navigate("/agency/bookings");
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/agency/bookings" className="hover:text-foreground">Bookings</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{booking.ref}</span>
          </nav>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Booking {booking.ref}</h1>
              <StatusChip status={booking.status} size="lg" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="h-4 w-4" /> Message
              </Button>
              {isPending && (
                <Button size="sm" className="gap-2" onClick={() => setConfirmDialog(true)}>
                  <Check className="h-4 w-4" /> Confirm
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => setCancelDialog(true)}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
          {/* Left column 70% */}
          <div className="space-y-6 lg:col-span-7">
            {/* Status timeline */}
            <Card className="rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status</h2>
              <div className="mt-5 flex items-center justify-between">
                {STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center">
                      <div className="relative flex w-full items-center">
                        {i > 0 && (
                          <div className={cn("absolute left-0 right-1/2 h-0.5", done || active ? "bg-primary" : "bg-border")} />
                        )}
                        {i < STEPS.length - 1 && (
                          <div className={cn("absolute left-1/2 right-0 h-0.5", done ? "bg-primary" : "bg-border")} />
                        )}
                        <div
                          className={cn(
                            "relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                            done && "bg-foreground text-background",
                            active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                            !done && !active && "bg-muted text-muted-foreground",
                          )}
                        >
                          {done ? <Check className="h-4 w-4" /> : i + 1}
                        </div>
                      </div>
                      <span className={cn("mt-2 text-xs", (done || active) ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isPending && (
                <div className="mt-6 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <div>
                    <p className="text-sm font-medium">Confirming deducts 50 MAD from your wallet</p>
                    <p className="text-xs text-muted-foreground">Current balance: {agency.walletBalance} MAD</p>
                  </div>
                  <Button onClick={() => setConfirmDialog(true)}>Confirm booking</Button>
                </div>
              )}
            </Card>

            {/* Customer info */}
            <Card className="rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Customer</h2>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <img src={customer.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{customer.name}</h3>
                    {customer.verified && (
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                      <Phone className="h-3.5 w-3.5" /> {customer.phone}
                    </a>
                    <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                      <Mail className="h-3.5 w-3.5" /> {customer.email}
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{customer.totalBookings} bookings</p>
                  {customer.ratingGiven && (
                    <div className="flex items-center justify-end gap-0.5 text-warning">
                      {Array.from({ length: customer.ratingGiven }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-4">
                View full customer profile
              </Button>
            </Card>

            {/* Motorbike info */}
            <Card className="rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Motorbike</h2>
              <div className="mt-4 flex flex-wrap items-start gap-5">
                <img src={bike.thumbnail} alt="" className="h-32 w-32 rounded-lg object-cover" />
                <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Name" value={bike.name} />
                  <Field label="Year" value={bike.year.toString()} />
                  <Field label="Engine" value={`${bike.engineCc} cc`} />
                  <Field label="Odometer" value={`${bike.odometer.toLocaleString()} km`} />
                  <Field label="License plate" value={booking.status !== "pending" ? bike.licensePlate : "•••••"} />
                  <Field label="Daily price" value={`${bike.pricePerDay} MAD`} />
                </div>
              </div>
            </Card>

            {/* Booking details */}
            <Card className="rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Booking details</h2>
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Pickup" value={`${format(parseISO(booking.pickupAt), "MMM d, yyyy 'at' HH:mm")}`} />
                <Field label="Return" value={`${format(parseISO(booking.returnAt), "MMM d, yyyy 'at' HH:mm")}`} />
                <Field label="Total days" value={booking.totalDays.toString()} />
                <Field label="Source" value="Online" />
                <Field
                  label="Pickup location"
                  value={
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> {booking.pickupLocation}
                    </span>
                  }
                />
                <Field
                  label="Return location"
                  value={
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> {booking.returnLocation}
                    </span>
                  }
                />
              </div>
              <div className="mt-5 h-32 overflow-hidden rounded-lg border bg-muted/30">
                <img
                  src="https://maps.googleapis.com/maps/api/staticmap?center=Casablanca&zoom=12&size=600x150&maptype=roadmap&style=feature:all|element:labels|visibility:off"
                  alt="Map preview"
                  className="h-full w-full object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
              <div className="mt-5 rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents required</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" /> National ID or passport
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" /> Driver's licence
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-block h-4 w-4 rounded-full border" /> Deposit receipt
                  </li>
                </ul>
              </div>
            </Card>

            {/* Payment & fees */}
            <Card className="rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment & fees</h2>
              <div className="mt-4 space-y-2 text-sm">
                <Row label={`Rental (${booking.totalDays} days × ${booking.pricePerDay} MAD)`} value={`${booking.totalAmount} MAD`} />
                <Row label="Deposit" value={`${booking.depositAmount} MAD`} />
                <Row label="Payment method" value={booking.paymentMethod.toUpperCase()} />
                <Row label="Payment status" value={<Badge variant="outline" className="capitalize">{booking.paymentStatus}</Badge>} />
                <Row label="Motonita fee" value={`-${booking.motonitaFee} MAD`} muted />
                <div className="my-2 border-t border-border" />
                <Row label="Net to agency" value={<span className="text-base font-bold">{booking.totalAmount - booking.motonitaFee} MAD</span>} />
              </div>
            </Card>

            {/* Notes & attachments */}
            <Card className="rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Notes & attachments</h2>
              <div className="mt-4 space-y-3">
                <Label className="text-xs">Private notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a private note for your team…"
                  rows={3}
                />
                <Button size="sm" variant="outline" onClick={() => { toast.success("Note saved"); }}>
                  Add note
                </Button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["Rental contract", "ID scan", "Licence scan", "Deposit receipt"].map((title) => (
                  <button
                    key={title}
                    onClick={() => toast.info("Upload placeholder")}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Upload className="h-5 w-5" />
                    {title}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column 30% */}
          <div className="space-y-6 lg:col-span-3">
            {/* Message thread preview */}
            <Card className="rounded-xl p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Conversation</h3>
                <Button variant="ghost" size="sm" className="text-xs">Open</Button>
              </div>
              <div className="space-y-3">
                {[
                  { who: customer.name, msg: "Hello! Is the pickup time flexible?", at: "10:42" },
                  { who: agency.name, msg: "Yes, between 9–11am works.", at: "10:45" },
                  { who: customer.name, msg: "Perfect, see you at 10!", at: "10:46" },
                ].map((m, i) => (
                  <div key={i} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span className="font-semibold">{m.who}</span>
                      <span>{m.at}</span>
                    </div>
                    <p className="mt-1">{m.msg}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Activity log */}
            <Card className="rounded-xl p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Activity log</h3>
              <ul className="space-y-3 text-sm">
                {[
                  { txt: "Booking created", at: format(parseISO(booking.createdAt), "MMM d, HH:mm"), actor: customer.name },
                  { txt: "Confirmation pending", at: format(parseISO(booking.createdAt), "MMM d, HH:mm"), actor: "System" },
                ].map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-foreground">{a.txt}</p>
                      <p className="text-xs text-muted-foreground">{a.at} · {a.actor}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Danger zone */}
            <Card className="rounded-xl shadow-sm">
              <button
                onClick={() => setDangerOpen((v) => !v)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
                </div>
                {dangerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {dangerOpen && (
                <div className="space-y-2 border-t border-border p-4">
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setCancelDialog(true)}>
                    Cancel booking
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => toast.info("Report flow placeholder")}>
                    Report customer
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => toast.info("Dispute placeholder")}>
                    Open dispute
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm booking {booking.ref}</DialogTitle>
            <DialogDescription>
              50 MAD will be deducted from your wallet (current balance: {agency.walletBalance} MAD).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Not now</Button>
            <Button onClick={handleConfirm}>Confirm & deduct 50 MAD</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel modal */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking {booking.ref}</DialogTitle>
            <DialogDescription>This will notify the customer and release the bike.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label>Reason</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">Customer request</SelectItem>
                <SelectItem value="bike_unavailable">Bike unavailable</SelectItem>
                <SelectItem value="documents_invalid">Invalid documents</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Keep booking</Button>
            <Button variant="destructive" onClick={handleCancel}>Cancel booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AgencyLayout>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
  </div>
);

const Row = ({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className={cn("text-sm", muted ? "text-muted-foreground" : "text-foreground/80")}>{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

export default BookingDetail;
