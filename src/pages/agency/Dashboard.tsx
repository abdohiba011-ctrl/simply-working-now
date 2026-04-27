import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO, startOfMonth } from "date-fns";
import {
  Wallet as WalletIcon, Calendar as CalendarIcon, TrendingUp, Clock,
  Plus, CalendarPlus, UserPlus, Sun, ArrowRight,
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

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Your business at a glance
            </h1>
          </div>
          {subscription && (
            <div className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm capitalize">
              Plan: <span className="font-semibold text-foreground">{subscription.plan}</span>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Wallet balance"
            value={`${Number(wallet?.balance || 0).toLocaleString()} MAD`}
            icon={WalletIcon}
            tone="primary"
            cta="Top up"
            onClick={() => navigate("/agency/finance#wallet")}
          />
          <MetricCard
            label="Pending bookings"
            value={pending.toString()}
            icon={Clock}
            tone="warning"
            cta={pending > 0 ? "Review" : undefined}
            onClick={() => navigate("/agency/bookings?status=pending")}
          />
          <MetricCard
            label="Bookings this month"
            value={bookingsThisMonth.length.toString()}
            icon={CalendarIcon}
            tone="info"
          />
          <MetricCard
            label="Revenue this month"
            value={`${revenueThisMonth.toLocaleString()} MAD`}
            icon={TrendingUp}
            tone="success"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="rounded-2xl border-border shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Today's schedule</h2>
                <p className="text-xs text-muted-foreground">Pickups and returns scheduled for today</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full gap-1"
                onClick={() => navigate("/agency/calendar")}
              >
                Open calendar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="px-3 pb-3">
              {loading ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">Loading…</div>
              ) : todays.length === 0 ? (
                <div className="rounded-xl bg-muted/40 px-4 py-10">
                  <EmptyState icon={Sun} title="No pickups or returns today" description="Enjoy the calm." />
                </div>
              ) : (
                <ul className="space-y-1">
                  {todays.map((b) => {
                    const isPickup = isToday(parseISO(b.pickup_date));
                    return (
                      <li key={b.id}>
                        <button
                          onClick={() => navigate(`/agency/bookings/${b.id}`)}
                          className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
                        >
                          <div className="w-14 shrink-0 text-sm font-mono text-muted-foreground">
                            {(isPickup ? b.pickup_time : b.return_time) || "—"}
                          </div>
                          {b.bike?.main_image_url ? (
                            <img src={b.bike.main_image_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                          ) : (
                            <div className="h-11 w-11 rounded-xl bg-muted" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {b.customer_name || "Customer"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{b.bike?.name || "—"}</div>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-medium",
                              isPickup
                                ? "bg-primary/15 text-foreground"
                                : "bg-info/15 text-info",
                            )}
                          >
                            {isPickup ? "Pickup" : "Return"}
                          </span>
                          <StatusChip status={b.booking_status || b.status || "pending"} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <QuickAction icon={Plus} label="Add motorbike" tone="primary" onClick={() => navigate("/agency/motorbikes/new")} />
            <QuickAction icon={CalendarPlus} label="View bookings" tone="info" onClick={() => navigate("/agency/bookings")} />
            <QuickAction icon={WalletIcon} label="Top up wallet" tone="success" onClick={() => navigate("/agency/finance#wallet")} />
            <QuickAction icon={UserPlus} label="Manage profile" tone="warning" onClick={() => navigate("/agency/agency-center#profile")} />
          </div>
        </section>
      </div>
    </AgencyLayout>
  );
};

type Tone = "primary" | "warning" | "info" | "success";

const TONE_BG: Record<Tone, string> = {
  primary: "bg-primary/15",
  warning: "bg-warning/15",
  info: "bg-info/15",
  success: "bg-success/15",
};
const TONE_FG: Record<Tone, string> = {
  primary: "text-foreground",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: Tone;
  cta?: string;
  onClick?: () => void;
}

const MetricCard = ({ label, value, icon: Icon, tone, cta, onClick }: MetricCardProps) => (
  <Card
    onClick={onClick}
    className={cn(
      "group rounded-2xl border-border p-5 shadow-sm transition-all",
      onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", TONE_BG[tone])}>
        <Icon className={cn("h-5 w-5", TONE_FG[tone])} />
      </span>
    </div>
    <p className="mt-3 text-[28px] font-bold leading-none tracking-tight text-foreground">{value}</p>
    {cta && (
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground/80 group-hover:text-foreground">
        {cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </p>
    )}
  </Card>
);

const QuickAction = ({
  icon: Icon, label, tone, onClick,
}: { icon: React.ElementType; label: string; tone: Tone; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
  >
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-105", TONE_BG[tone])}>
      <Icon className={cn("h-5 w-5", TONE_FG[tone])} />
    </div>
    <span className="text-sm font-semibold text-foreground">{label}</span>
  </button>
);

export default Dashboard;
