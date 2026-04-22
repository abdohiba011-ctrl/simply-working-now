import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, addDays, startOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  agencyBikes, agencyBookings, agencyCustomers, manualBookings,
  AgencyBooking, AgencyBike,
} from "@/data/agencyMockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewMode = "week" | "month" | "3months";

const VIEW_DAYS: Record<ViewMode, number> = { week: 7, month: 30, "3months": 90 };

const statusColor = (status: AgencyBooking["status"], blocked = false) => {
  if (blocked) return "bg-muted-foreground/30 text-foreground";
  switch (status) {
    case "confirmed": return "bg-primary/80 text-primary-foreground";
    case "in_progress": return "bg-blue-500/80 text-white";
    case "pending": return "bg-warning/80 text-white";
    case "completed": return "bg-success/80 text-white";
    case "cancelled": return "bg-destructive/30 text-destructive line-through";
    default: return "bg-muted text-foreground";
  }
};

const Calendar = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("week");
  const [start, setStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bikeFilter, setBikeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [bookings, setBookings] = useState<AgencyBooking[]>([...agencyBookings, ...manualBookings]);

  // Drag selection
  const [drag, setDrag] = useState<{ bikeId: string; startIdx: number; endIdx: number } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createInit, setCreateInit] = useState<{ bikeId: string; from: Date; to: Date } | null>(null);

  const days = VIEW_DAYS[view];
  const daysList = useMemo(() => eachDayOfInterval({ start, end: addDays(start, days - 1) }), [start, days]);

  const bikes = useMemo(() => {
    return agencyBikes.filter((b) => {
      if (bikeFilter !== "all" && b.id !== bikeFilter) return false;
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
      return true;
    });
  }, [bikeFilter, categoryFilter]);

  const navStep = days;
  const move = (dir: -1 | 1) => setStart((s) => addDays(s, navStep * dir));

  const colWidthPx = view === "week" ? 110 : view === "month" ? 44 : 24;

  // Build per-bike booking spans
  const spansFor = (bikeId: string) =>
    bookings.filter((b) => b.bikeId === bikeId).map((b) => {
      const startD = parseISO(b.pickupAt);
      const endD = parseISO(b.returnAt);
      const startIdx = daysList.findIndex((d) => isSameDay(d, startD));
      let endIdx = daysList.findIndex((d) => isSameDay(d, endD));
      if (startIdx === -1 && endIdx === -1) {
        if (endD < daysList[0] || startD > daysList[daysList.length - 1]) return null;
      }
      const from = startIdx === -1 ? 0 : startIdx;
      const to = endIdx === -1 ? daysList.length - 1 : endIdx;
      if (to < 0 || from >= daysList.length) return null;
      return { booking: b, from, to: Math.max(from, to) };
    }).filter(Boolean) as { booking: AgencyBooking; from: number; to: number }[];

  const onCellMouseDown = (bikeId: string, idx: number) => {
    setDrag({ bikeId, startIdx: idx, endIdx: idx });
  };
  const onCellMouseEnter = (bikeId: string, idx: number) => {
    if (drag && drag.bikeId === bikeId) setDrag({ ...drag, endIdx: idx });
  };
  const onMouseUp = () => {
    if (drag) {
      const lo = Math.min(drag.startIdx, drag.endIdx);
      const hi = Math.max(drag.startIdx, drag.endIdx);
      setCreateInit({ bikeId: drag.bikeId, from: daysList[lo], to: daysList[hi] });
      setShowCreate(true);
      setDrag(null);
    }
  };

  const handleCreateManual = (data: {
    customerName: string; phone: string; bikeId: string; from: Date; to: Date;
    price: number; notes: string; paid: boolean;
  }) => {
    const totalDays = Math.max(1, Math.round((+data.to - +data.from) / 86_400_000) + 1);
    const newBk: AgencyBooking = {
      id: `manual-${Date.now()}`,
      ref: `#M${(bookings.filter((b) => b.manual).length + 100).toString().slice(-3)}`,
      customerId: "c1", // mock
      bikeId: data.bikeId,
      status: "confirmed",
      pickupAt: data.from.toISOString(),
      returnAt: data.to.toISOString(),
      pickupLocation: "Walk-in",
      returnLocation: "Walk-in",
      totalDays,
      pricePerDay: Math.round(data.price / totalDays),
      totalAmount: data.price,
      depositAmount: 0,
      motonitaFee: 0,
      paymentMethod: "cash",
      paymentStatus: data.paid ? "paid" : "unpaid",
      createdAt: new Date().toISOString(),
      notes: data.notes,
      manual: true,
    };
    setBookings((b) => [...b, newBk]);
    setShowCreate(false);
    toast.success(`Manual booking created for ${data.customerName}`);
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-[1600px]" onMouseUp={onMouseUp}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight inline-flex items-center gap-2"><CalIcon className="h-7 w-7 text-primary" /> Calendar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Unified availability across your fleet — drag to create a manual booking.</p>
          </div>
          <Button className="gap-1" onClick={() => { setCreateInit({ bikeId: bikes[0]?.id || "", from: new Date(), to: addDays(new Date(), 1) }); setShowCreate(true); }}>
            <Plus className="h-4 w-4" /> Add manual booking
          </Button>
        </div>

        {/* Controls */}
        <Card className="mt-6 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border bg-card p-0.5">
              {(["week", "month", "3months"] as ViewMode[]).map((v) => (
                <Button key={v} size="sm" variant={view === v ? "secondary" : "ghost"} onClick={() => setView(v)} className="capitalize">
                  {v === "3months" ? "3 Months" : v}
                </Button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1">
              <Button size="icon" variant="outline" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setStart(view === "week" ? startOfWeek(new Date(), { weekStartsOn: 1 }) : new Date())}>Today</Button>
              <Button size="icon" variant="outline" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
              <span className="ml-2 text-sm font-medium">{format(daysList[0], "MMM d")} – {format(daysList[daysList.length - 1], "MMM d, yyyy")}</span>
            </div>
            <div className="ml-auto flex gap-2">
              <Select value={bikeFilter} onValueChange={setBikeFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All bikes</SelectItem>
                  {agencyBikes.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="sport">Sport</SelectItem>
                  <SelectItem value="cruiser">Cruiser</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                  <SelectItem value="touring">Touring</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary/80" /> Confirmed</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-500/80" /> In progress</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning/80" /> Pending</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted-foreground/40" /> Blocked</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-destructive/40" /> Cancelled</span>
          </div>
        </Card>

        {/* Gantt */}
        <Card className="mt-4 overflow-hidden">
          <div className="overflow-auto">
            <div className="inline-block min-w-full">
              {/* Header row */}
              <div className="sticky top-0 z-20 flex bg-card/95 backdrop-blur border-b">
                <div className="sticky left-0 z-10 w-[220px] shrink-0 border-r bg-card px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                  Motorbike
                </div>
                <div className="flex">
                  {daysList.map((d, i) => {
                    const today = isSameDay(d, new Date());
                    return (
                      <div key={i} style={{ width: colWidthPx }} className={cn("shrink-0 border-r px-1 py-2 text-center text-[10px]", today && "bg-primary/10 text-primary font-semibold")}>
                        <div className="font-medium">{format(d, view === "week" ? "EEE" : "d")}</div>
                        {view === "week" && <div className="text-muted-foreground">{format(d, "MMM d")}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rows */}
              {bikes.map((bike) => {
                const spans = spansFor(bike.id);
                const isDragging = drag?.bikeId === bike.id;
                return (
                  <div key={bike.id} className="relative flex border-b last:border-b-0 hover:bg-muted/30">
                    <div className="sticky left-0 z-10 flex w-[220px] shrink-0 items-center gap-2 border-r bg-card px-3 py-2.5">
                      <img src={bike.thumbnail} alt="" className="h-9 w-9 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{bike.name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{bike.category} · {bike.engineCc}cc</p>
                      </div>
                    </div>
                    <div className="relative flex">
                      {daysList.map((d, i) => {
                        const today = isSameDay(d, new Date());
                        const inDrag = isDragging && i >= Math.min(drag!.startIdx, drag!.endIdx) && i <= Math.max(drag!.startIdx, drag!.endIdx);
                        return (
                          <div
                            key={i}
                            style={{ width: colWidthPx }}
                            onMouseDown={() => onCellMouseDown(bike.id, i)}
                            onMouseEnter={() => onCellMouseEnter(bike.id, i)}
                            className={cn("shrink-0 cursor-pointer border-r border-border/60", today && "bg-primary/5", inDrag && "bg-primary/20")}
                            style2={{ height: 56 }}
                          >
                            <div style={{ height: 56 }} />
                          </div>
                        );
                      })}
                      {/* booking spans overlay */}
                      <div className="pointer-events-none absolute inset-0">
                        {spans.map(({ booking, from, to }) => {
                          const left = from * colWidthPx + 2;
                          const width = (to - from + 1) * colWidthPx - 4;
                          const cust = agencyCustomers.find((c) => c.id === booking.customerId);
                          return (
                            <button
                              key={booking.id}
                              onClick={() => navigate(`/agency/bookings/${booking.id}`)}
                              style={{ left, width, top: 6 }}
                              className={cn("pointer-events-auto absolute z-10 truncate rounded px-2 py-1 text-left text-[11px] font-medium shadow-sm hover:opacity-90", statusColor(booking.status))}
                            >
                              {booking.manual && <span className="mr-1 rounded bg-black/20 px-1 text-[9px] uppercase">M</span>}
                              {cust?.name?.split(" ")[0] || booking.ref} · {booking.ref}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {bikes.length === 0 && (
                <div className="p-12 text-center text-sm text-muted-foreground">No bikes match the selected filters.</div>
              )}
            </div>
          </div>
        </Card>

        <p className="mt-3 text-xs text-muted-foreground">Tip: drag across cells in a row to create a manual booking for that bike.</p>
      </div>

      {/* Create manual booking modal */}
      <ManualBookingDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        initial={createInit}
        bikes={bikes.length ? bikes : agencyBikes}
        onSubmit={handleCreateManual}
      />
    </AgencyLayout>
  );
};

interface ManualDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: { bikeId: string; from: Date; to: Date } | null;
  bikes: AgencyBike[];
  onSubmit: (data: { customerName: string; phone: string; bikeId: string; from: Date; to: Date; price: number; notes: string; paid: boolean }) => void;
}

const ManualBookingDialog = ({ open, onOpenChange, initial, bikes, onSubmit }: ManualDialogProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bikeId, setBikeId] = useState(initial?.bikeId || bikes[0]?.id || "");
  const [from, setFrom] = useState(initial?.from ? format(initial.from, "yyyy-MM-dd") : "");
  const [to, setTo] = useState(initial?.to ? format(initial.to, "yyyy-MM-dd") : "");
  const [price, setPrice] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState(true);

  // sync when initial changes
  const lastInit = useRef<typeof initial>(null);
  if (open && initial && initial !== lastInit.current) {
    lastInit.current = initial;
    setBikeId(initial.bikeId);
    setFrom(format(initial.from, "yyyy-MM-dd"));
    setTo(format(initial.to, "yyyy-MM-dd"));
    const bike = bikes.find((b) => b.id === initial.bikeId);
    const days = Math.max(1, Math.round((+initial.to - +initial.from) / 86_400_000) + 1);
    if (bike) setPrice(bike.pricePerDay * days);
  }

  const submit = () => {
    if (!name.trim() || !phone.trim() || !bikeId || !from || !to) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSubmit({
      customerName: name.trim(), phone: phone.trim(), bikeId,
      from: new Date(from), to: new Date(to), price, notes, paid,
    });
    setName(""); setPhone(""); setNotes(""); setPrice(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add manual booking</DialogTitle>
          <DialogDescription>For walk-ins or off-platform rentals tracked in your records.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Customer name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Bike</Label>
            <Select value={bikeId} onValueChange={setBikeId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{bikes.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price agreed (MAD)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-1" />
            </div>
            <div className="flex items-end justify-between">
              <Label className="mb-2">Marked as paid</Label>
              <Switch checked={paid} onCheckedChange={setPaid} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
          <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            Manual bookings don't charge the 50 MAD confirmation fee. They're tracked only for your records.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Create booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Calendar;
