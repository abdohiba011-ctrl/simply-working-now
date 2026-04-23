import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import {
  ChevronLeft, Star, ExternalLink, Eye, EyeOff, Wrench, Check,
  TrendingUp, Calendar as CalIcon,
} from "lucide-react";
import { LineChart, Line, XAxis as XAxisR, YAxis as YAxisR, Tooltip as TooltipR, ResponsiveContainer, CartesianGrid } from "recharts";
const XAxis = XAxisR as any;
const YAxis = YAxisR as any;
const Tooltip = TooltipR as any;
const RLine = Line as any;
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  agencyBikes, agencyBookings, agencyCustomers, bikeRevenueByMonth,
  AgencyBike, BikeStatus,
} from "@/data/agencyMockData";
import { StatusChip } from "@/components/shared/StatusChip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_LABEL: Record<BikeStatus, string> = {
  available: "Available", rented: "Rented", maintenance: "Maintenance", hidden: "Hidden",
};

const MotorbikeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [bike, setBike] = useState<AgencyBike | undefined>(() => agencyBikes.find((b) => b.id === id));
  const [photoIdx, setPhotoIdx] = useState(0);
  const [calMonth, setCalMonth] = useState(new Date());

  if (!bike) {
    return (
      <AgencyLayout>
        <div className="mx-auto max-w-3xl py-16 text-center">
          <h1 className="text-2xl font-bold">Motorbike not found</h1>
          <Button className="mt-4" onClick={() => navigate("/agency/motorbikes")}>Back to motorbikes</Button>
        </div>
      </AgencyLayout>
    );
  }

  const bookings = agencyBookings.filter((b) => b.bikeId === bike.id);
  const completed = bookings.filter((b) => b.status === "completed");
  const totalRevenue = completed.reduce((sum, b) => sum + b.totalAmount, 0);
  const occupancyDays = bookings.filter((b) => ["confirmed", "in_progress", "completed"].includes(b.status)).reduce((sum, b) => sum + b.totalDays, 0);
  const occupancyPct = Math.min(100, Math.round((occupancyDays / 30) * 100));

  const revenueData = bikeRevenueByMonth(bike.id);

  const topCustomers = useMemo(() => {
    const grouped = new Map<string, { customerId: string; bookings: number; revenue: number }>();
    bookings.forEach((b) => {
      const cur = grouped.get(b.customerId) || { customerId: b.customerId, bookings: 0, revenue: 0 };
      cur.bookings += 1;
      cur.revenue += b.totalAmount;
      grouped.set(b.customerId, cur);
    });
    return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [bookings]);

  const setStatus = (s: BikeStatus) => {
    setBike((b) => (b ? { ...b, status: s } : b));
    toast.success(`Marked as ${STATUS_LABEL[s]}`);
  };

  // Calendar
  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dayBookings = (d: Date) => bookings.filter((b) => {
    const start = parseISO(b.pickupAt); const end = parseISO(b.returnAt);
    return d >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && d <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
  });

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl">
        <button onClick={() => navigate("/agency/motorbikes")} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to motorbikes
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{bike.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{bike.brand} · {bike.model} · {bike.year} · {bike.engineCc}cc</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1" onClick={() => window.open("/listings", "_blank")}>
              <ExternalLink className="h-4 w-4" /> Public view
            </Button>
            <Button onClick={() => navigate(`/agency/motorbikes/${bike.id}/edit`)}>Edit</Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 space-y-5">
            {/* Carousel */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                <img src={bike.photos[photoIdx]} alt={bike.name} className="h-full w-full object-cover" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {bike.photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)} className={cn("h-2 w-2 rounded-full transition-all", i === photoIdx ? "bg-white w-6" : "bg-white/50")} />
                  ))}
                </div>
              </div>
            </Card>

            {/* Quick status toggle */}
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current status</p>
                  <p className="mt-0.5 font-semibold">{STATUS_LABEL[bike.status]}</p>
                </div>
                <div className="inline-flex rounded-lg border bg-background p-0.5">
                  {(["available", "maintenance", "hidden"] as BikeStatus[]).map((s) => (
                    <Button key={s} size="sm" variant={bike.status === s ? "secondary" : "ghost"} onClick={() => setStatus(s)} className="gap-1.5 text-xs">
                      {s === "available" && <Check className="h-3.5 w-3.5" />}
                      {s === "maintenance" && <Wrench className="h-3.5 w-3.5" />}
                      {s === "hidden" && <EyeOff className="h-3.5 w-3.5" />}
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Total bookings</p>
                <p className="mt-1 text-2xl font-bold">{bookings.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Revenue (all time)</p>
                <p className="mt-1 text-2xl font-bold">{totalRevenue.toLocaleString()} <span className="text-sm font-normal">MAD</span></p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Avg rating</p>
                <p className="mt-1 inline-flex items-center gap-1 text-2xl font-bold"><Star className="h-5 w-5 fill-warning text-warning" /> {bike.rating.toFixed(1)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Occupancy (30d)</p>
                <p className="mt-1 text-2xl font-bold">{occupancyPct}%</p>
              </Card>
            </div>

            {/* Metadata */}
            <Card className="p-5">
              <h3 className="font-semibold">Specifications</h3>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Brand</p><p>{bike.brand}</p></div>
                <div><p className="text-xs text-muted-foreground">Model</p><p>{bike.model}</p></div>
                <div><p className="text-xs text-muted-foreground">Year</p><p>{bike.year}</p></div>
                <div><p className="text-xs text-muted-foreground">Engine</p><p>{bike.engineCc}cc</p></div>
                <div><p className="text-xs text-muted-foreground">Transmission</p><p className="capitalize">{bike.transmission}</p></div>
                <div><p className="text-xs text-muted-foreground">License plate</p><p className="font-mono">{bike.licensePlate}</p></div>
                <div><p className="text-xs text-muted-foreground">Color</p><p>{bike.color || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Mileage</p><p>{bike.odometer.toLocaleString()} km</p></div>
                <div><p className="text-xs text-muted-foreground">Neighborhood</p><p>{bike.neighborhood}</p></div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="mt-5">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Return</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No bookings yet for this bike.</TableCell></TableRow>
                  ) : bookings.map((b) => {
                    const cust = agencyCustomers.find((c) => c.id === b.customerId);
                    return (
                      <TableRow key={b.id} className="cursor-pointer" onClick={() => navigate(`/agency/bookings/${b.id}`)}>
                        <TableCell className="font-mono text-xs">{b.ref}</TableCell>
                        <TableCell>{cust?.name || "—"}</TableCell>
                        <TableCell className="text-xs">{format(parseISO(b.pickupAt), "MMM d, HH:mm")}</TableCell>
                        <TableCell className="text-xs">{format(parseISO(b.returnAt), "MMM d, HH:mm")}</TableCell>
                        <TableCell><StatusChip status={b.status} /></TableCell>
                        <TableCell className="text-right font-medium">{b.totalAmount} MAD</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="mt-5 space-y-5">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Revenue (last 6 months)</h3>
                <span className="inline-flex items-center gap-1 text-sm text-success"><TrendingUp className="h-4 w-4" /> {totalRevenue.toLocaleString()} MAD total</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <RLine type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Top 5 customers</h3>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No data yet.</TableCell></TableRow>
                  ) : topCustomers.map((tc) => {
                    const c = agencyCustomers.find((x) => x.id === tc.customerId);
                    return (
                      <TableRow key={tc.customerId}>
                        <TableCell className="flex items-center gap-2">
                          <img src={c?.avatar} alt="" className="h-7 w-7 rounded-full" />
                          {c?.name || tc.customerId}
                        </TableCell>
                        <TableCell className="text-right">{tc.bookings}</TableCell>
                        <TableCell className="text-right font-medium">{tc.revenue.toLocaleString()} MAD</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-5">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold inline-flex items-center gap-2"><CalIcon className="h-4 w-4" /> {format(calMonth, "MMMM yyyy")}</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setCalMonth(addDays(monthStart, -1))}>←</Button>
                  <Button size="sm" variant="outline" onClick={() => setCalMonth(new Date())}>Today</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCalMonth(addDays(monthEnd, 1))}>→</Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1 text-xs">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="px-2 py-1 text-center font-medium text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((d) => {
                  const dayBks = dayBookings(d);
                  const today = isSameDay(d, new Date());
                  return (
                    <div key={d.toISOString()} className={cn("min-h-[80px] rounded-md border p-1.5 text-xs", today && "border-primary bg-primary/5", !isSameMonth(d, calMonth) && "opacity-50")}>
                      <div className={cn("mb-1 font-medium", today && "text-primary")}>{format(d, "d")}</div>
                      {dayBks.slice(0, 2).map((b) => {
                        const c = agencyCustomers.find((x) => x.id === b.customerId);
                        return (
                          <div key={b.id} onClick={() => navigate(`/agency/bookings/${b.id}`)} className={cn("mb-0.5 cursor-pointer truncate rounded px-1 py-0.5", b.status === "in_progress" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : b.status === "confirmed" ? "bg-primary/15 text-foreground" : "bg-muted")}>
                            {c?.name?.split(" ")[0] || b.ref}
                          </div>
                        );
                      })}
                      {dayBks.length > 2 && <div className="px-1 text-[10px] text-muted-foreground">+{dayBks.length - 2} more</div>}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="mt-5">
            <Card className="p-12 text-center">
              <p className="text-sm text-muted-foreground">A flat scrollable edit form is also available via the dedicated page.</p>
              <Button className="mt-4" onClick={() => navigate(`/agency/motorbikes/${bike.id}/edit`)}>Open full edit form</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AgencyLayout>
  );
};

export default MotorbikeDetail;
