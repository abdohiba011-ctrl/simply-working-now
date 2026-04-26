import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO, startOfMonth } from "date-fns";
import {
  AlertTriangle, Wallet as WalletIcon, Calendar as CalendarIcon, TrendingUp,
  Plus, CalendarPlus, UserPlus, Sun,
} from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useAgencyWallet, useAgencyBookingsWithBikes, useAgencySubscription,
} from "@/hooks/useAgencyData";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { wallet } = useAgencyWallet();
  const { subscription } = useAgencySubscription();
  const { bookings, loading } = useAgencyBookingsWithBikes();

  const monthStart = startOfMonth(new Date());
  const todays = useMemo(
    () =>
      bookings.filter((b) => {
        try {
          return isToday(parseISO(b.pickup_date)) || isToday(parseISO(b.return_date));
        } catch { return false; }
      }).slice(0, 6),
    [bookings],
  );
  const bookingsThisMonth = bookings.filter((b) => {
    try { return parseISO(b.created_at) >= monthStart; } catch { return false; }
  });
  const revenueThisMonth = bookingsThisMonth.reduce((s, b) => s + Number(b.total_price || 0), 0);
  const pending = bookings.filter((b) => (b.booking_status || b.status) === "pending").length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {greeting}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            {subscription && (
              <div className="rounded-full border border-border bg-card px-3 py-1.5 text-sm capitalize">
                Plan: <span className="font-semibold text-primary">{subscription.plan}</span>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Wallet balance"
            value={`${Number(wallet?.balance || 0).toLocaleString()} MAD`}
            chip={<Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => navigate("/agency/finance#wallet")}>Top up</Button>}
          />
          <MetricCard
            label="Pending bookings"
            value={pending.toString()}
            highlight={pending > 0 ? "warning" : undefined}
            onClick={() => navigate("/agency/bookings?status=pending")}
          />
          <MetricCard
            label="Bookings this month"
            value={bookingsThisMonth.length.toString()}
          />
          <MetricCard
            label="Revenue this month"
            value={`${revenueThisMonth.toLocaleString()} MAD`}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
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
              {loading ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
              ) : todays.length === 0 ? (
                <EmptyState icon={Sun} title="No pickups or returns today" description="Enjoy the calm." />
              ) : (
                todays.map((b) => {
                  const isPickup = isToday(parseISO(b.pickup_date));
                  return (
                    <div
                      key={b.id}
                      onClick={() => navigate(`/agency/bookings/${b.id}`)}
                      className="flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-primary/5"
                    >
                      <div className="w-14 shrink-0 text-sm font-mono text-muted-foreground">
                        {(isPickup ? b.pickup_time : b.return_time) || "—"}
                      </div>
                      {b.bike?.main_image_url && (
                        <img src={b.bike.main_image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{b.customer_name || "Customer"}</div>
                        <div className="truncate text-xs text-muted-foreground">{b.bike?.name || "—"}</div>
                      </div>
                      <span className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        isPickup ? "border-primary/30 bg-primary/10 text-foreground" : "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
                      )}>
                        {isPickup ? "Pickup" : "Return"}
                      </span>
                      <StatusChip status={b.booking_status || b.status || "pending"} />
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <QuickAction icon={Plus} label="Add motorbike" onClick={() => navigate("/agency/motorbikes/new")} />
            <QuickAction icon={CalendarPlus} label="View bookings" onClick={() => navigate("/agency/bookings")} />
            <QuickAction icon={WalletIcon} label="Top up wallet" onClick={() => navigate("/agency/finance#wallet")} />
            <QuickAction icon={UserPlus} label="Manage profile" onClick={() => navigate("/agency/agency-center#profile")} />
          </div>
        </section>
      </div>
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
