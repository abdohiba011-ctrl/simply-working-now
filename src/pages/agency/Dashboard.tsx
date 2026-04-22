import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO, differenceInCalendarDays, startOfMonth } from "date-fns";
import {
  AlertTriangle, Wallet as WalletIcon, Calendar as CalendarIcon, TrendingUp,
  Plus, CalendarPlus, UserPlus, ArrowUpRight, ArrowDownRight,
  Star, Bike as BikeIcon, MessageCircle, ShieldCheck,
  Sun, CloudSun,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgencyStore } from "@/stores/useAgencyStore";
import {
  agencyBookings, findCustomer, findBike, activityFeed, bookingsPerDay, revenuePerWeek,
} from "@/data/agencyMockData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AreaChartC = AreaChart as any;
const AreaC = Area as any;
const BarChartC = BarChart as any;
const BarC = Bar as any;
const XAxisC = XAxis as any;
const YAxisC = YAxis as any;
const CartesianGridC = CartesianGrid as any;
const TooltipC = Tooltip as any;
const ResponsiveContainerC = ResponsiveContainer as any;

const ICON_MAP: Record<string, any> = {
  "calendar-plus": CalendarPlus, wallet: WalletIcon, star: Star, bike: BikeIcon,
  "user-plus": UserPlus, "shield-check": ShieldCheck, calendar: CalendarIcon, "message-circle": MessageCircle,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const agency = useAgencyStore();
  const [bookingModal, setBookingModal] = useState(false);
  const [topUpModal, setTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("100");

  const verifiedComplete = agency.verificationStatus === "verified";
  const verificationRemaining = agency.verificationStepsTotal - agency.verificationStepsCompleted;

  const todays = useMemo(
    () =>
      agencyBookings
        .filter((b) => isToday(parseISO(b.pickupAt)) || isToday(parseISO(b.returnAt)))
        .slice(0, 6),
    [],
  );

  const monthStart = startOfMonth(new Date());
  const bookingsThisMonth = agencyBookings.filter((b) => parseISO(b.createdAt) >= monthStart);
  const revenueThisMonth = bookingsThisMonth.reduce((sum, b) => sum + b.totalAmount, 0);
  const pending = agencyBookings.filter((b) => b.status === "pending").length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const handleTopUp = () => {
    const amt = Number(topUpAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    agency.setWalletBalance(agency.walletBalance + amt);
    toast.success(`Wallet topped up with ${amt} MAD`);
    setTopUpModal(false);
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* A — Welcome strip */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {greeting}, <span className="text-primary">{agency.name}</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d, yyyy")} · Casablanca · 22°C
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
              <CloudSun className="h-4 w-4 text-warning" />
              <span className="font-medium">22°C</span>
              <span className="text-muted-foreground">Sunny</span>
            </div>
          </div>

          {!verifiedComplete && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Complete verification to appear in search</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {verificationRemaining} document{verificationRemaining > 1 ? "s" : ""} remaining
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate("/agency/verification")} className="shrink-0">
                Complete now
              </Button>
            </div>
          )}
        </section>

        {/* B — Key metrics */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Wallet balance"
            value={`${agency.walletBalance} MAD`}
            chip={<Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => setTopUpModal(true)}>Top up</Button>}
          />
          <MetricCard
            label="Pending bookings"
            value={pending.toString()}
            highlight={pending > 0 ? "warning" : undefined}
            onClick={() => navigate("/agency/bookings?status=pending")}
            chip={<DeltaChip delta={pending} positive />}
          />
          <MetricCard
            label="Bookings this month"
            value={bookingsThisMonth.length.toString()}
            chip={<DeltaChip delta={12.5} positive />}
          />
          <MetricCard
            label="Revenue this month"
            value={`${revenueThisMonth.toLocaleString()} MAD`}
            chip={<DeltaChip delta={8.3} positive />}
          />
        </section>

        {/* C + D — Today's schedule + Quick actions */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Today schedule (60%) */}
          <Card className="rounded-xl shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Today's schedule</h2>
                <p className="text-xs text-muted-foreground">Pickups and returns scheduled for today</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate("/agency/calendar")}>
                Open calendar
              </Button>
            </div>
            <div className="divide-y divide-border">
              {todays.length === 0 ? (
                <EmptyState icon={Sun} title="No pickups or returns today" description="Enjoy the calm." />
              ) : (
                todays.map((b) => {
                  const cust = findCustomer(b.customerId);
                  const bike = findBike(b.bikeId);
                  const isPickup = isToday(parseISO(b.pickupAt));
                  return (
                    <div
                      key={b.id}
                      onClick={() => navigate(`/agency/bookings/${b.id}`)}
                      className="flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-primary/5"
                    >
                      <div className="w-14 shrink-0 text-sm font-mono text-muted-foreground">
                        {format(parseISO(isPickup ? b.pickupAt : b.returnAt), "HH:mm")}
                      </div>
                      <img src={bike?.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{cust?.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{bike?.name}</div>
                      </div>
                      <span className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        isPickup ? "border-primary/30 bg-primary/10 text-foreground" : "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
                      )}>
                        {isPickup ? "Pickup" : "Return"}
                      </span>
                      <StatusChip status={b.status} />
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Quick actions (40%) */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <QuickAction icon={Plus} label="Add motorbike" onClick={() => navigate("/agency/motorbikes/new")} />
            <QuickAction icon={CalendarPlus} label="Walk-in booking" onClick={() => setBookingModal(true)} />
            <QuickAction icon={WalletIcon} label="Top up wallet" onClick={() => setTopUpModal(true)} />
            <QuickAction icon={UserPlus} label="Invite team" onClick={() => navigate("/agency/team")} />
          </div>
        </section>

        {/* E — Activity feed */}
        <section>
          <Card className="rounded-xl shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Recent activity</h2>
              <p className="text-xs text-muted-foreground">Last 10 events</p>
            </div>
            <ul className="divide-y divide-border">
              {activityFeed.map((event) => {
                const Icon = ICON_MAP[event.icon] || CalendarIcon;
                return (
                  <li
                    key={event.id}
                    onClick={() => navigate(event.link)}
                    className="flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-primary/5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="flex-1 text-sm text-foreground">{event.text}</p>
                    <span className="text-xs text-muted-foreground">
                      {differenceInCalendarDays(new Date(), event.at) === 0
                        ? "Today"
                        : `${differenceInCalendarDays(new Date(), event.at)}d ago`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>

        {/* F — Performance charts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="rounded-xl p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Bookings per day</h3>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <ResponsiveContainerC width="100%" height={220}>
              <AreaChartC data={bookingsPerDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGridC strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.1)" />
                <XAxisC dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxisC tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <TooltipC contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <AreaC type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#bookingFill)" />
              </AreaChartC>
            </ResponsiveContainerC>
          </Card>

          <Card className="rounded-xl p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Revenue per week</h3>
                <p className="text-xs text-muted-foreground">Last 12 weeks · MAD</p>
              </div>
              <WalletIcon className="h-4 w-4 text-primary" />
            </div>
            <ResponsiveContainerC width="100%" height={220}>
              <BarChartC data={revenuePerWeek} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGridC strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.1)" />
                <XAxisC dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxisC tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <TooltipC contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <BarC dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChartC>
            </ResponsiveContainerC>
          </Card>
        </section>
      </div>

      {/* Walk-in booking placeholder modal */}
      <Dialog open={bookingModal} onOpenChange={setBookingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a walk-in booking</DialogTitle>
            <DialogDescription>Quickly capture a customer who books in person.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Customer name</Label>
              <Input placeholder="Full name" />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input placeholder="+212 6…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Pickup</Label>
                <Input type="date" />
              </div>
              <div className="grid gap-1.5">
                <Label>Return</Label>
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingModal(false)}>Cancel</Button>
            <Button onClick={() => { toast.success("Walk-in booking saved"); setBookingModal(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top up modal */}
      <Dialog open={topUpModal} onOpenChange={setTopUpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top up wallet</DialogTitle>
            <DialogDescription>Each confirmed booking deducts 50 MAD as the Motonita fee.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Amount (MAD)</Label>
              <Input value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} type="number" min={1} />
            </div>
            <div className="flex gap-2">
              {[100, 250, 500, 1000].map((n) => (
                <Button key={n} type="button" size="sm" variant="outline" onClick={() => setTopUpAmount(String(n))}>
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpModal(false)}>Cancel</Button>
            <Button onClick={handleTopUp}>Confirm top up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AgencyLayout>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  chip?: React.ReactNode;
  highlight?: "warning";
  onClick?: () => void;
}

const MetricCard = ({ label, value, chip, highlight, onClick }: MetricCardProps) => (
  <Card
    onClick={onClick}
    className={cn(
      "rounded-xl p-5 shadow-sm transition-all",
      onClick && "cursor-pointer hover:shadow-lg",
      highlight === "warning" && "border-warning/40",
    )}
  >
    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={cn("mt-2 text-3xl font-bold tracking-tight", highlight === "warning" && "text-warning")}>{value}</p>
    {chip && <div className="mt-3">{chip}</div>}
  </Card>
);

const DeltaChip = ({ delta, positive }: { delta: number; positive?: boolean }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
      positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
    )}
  >
    {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
    {Math.abs(delta)}%
  </span>
);

const QuickAction = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-lg"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

export default Dashboard;
