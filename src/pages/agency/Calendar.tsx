import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAgencyBookingsWithBikes } from "@/hooks/useAgencyData";
import { cn } from "@/lib/utils";

const Calendar = () => {
  const navigate = useNavigate();
  const { bookings, loading } = useAgencyBookingsWithBikes();
  const [month, setMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    bookings.forEach((b) => {
      try {
        [b.pickup_date, b.return_date].forEach((d) => {
          const key = format(parseISO(d), "yyyy-MM-dd");
          (map[key] = map[key] || []).push(b);
        });
      } catch {}
    });
    return map;
  }, [bookings]);

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-3 overflow-x-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex-1 min-w-28 text-center text-sm font-medium sm:min-w-32 sm:text-base">{format(month, "MMMM yyyy")}</span>
            <Button size="icon" variant="outline" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMonth(new Date())}>Today</Button>
          </div>
        </div>

        <Card className="overflow-hidden p-2 sm:p-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="mb-1.5 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:gap-1 sm:text-xs">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d}>
                    <span className="sm:hidden">{d[0]}</span>
                    <span className="hidden sm:inline">{d}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {days.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const events = eventsByDay[key] || [];
                  const inMonth = d.getMonth() === month.getMonth();
                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-14 rounded-md border border-border p-1 text-[10px] sm:min-h-24 sm:rounded-lg sm:p-1.5 sm:text-xs",
                        !inMonth && "opacity-40",
                        isSameDay(d, new Date()) && "border-primary bg-primary/5",
                      )}
                    >
                      <div className="font-medium">{format(d, "d")}</div>
                      <div className="mt-0.5 space-y-0.5 sm:mt-1">
                        {events.slice(0, 2).map((e, i) => (
                          <button
                            key={i}
                            onClick={() => navigate(`/agency/bookings/${e.id}`)}
                            className="block w-full truncate rounded bg-primary/15 px-1 text-left text-[9px] text-foreground hover:bg-primary/25 sm:text-[10px]"
                          >
                            {e.customer_name || "Booking"}
                          </button>
                        ))}
                        {events.length > 2 && (
                          <div className="text-[9px] text-muted-foreground sm:text-[10px]">+{events.length - 2}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {!loading && bookings.length === 0 && (
            <EmptyState icon={CalendarDays} title="No bookings to display" description="Confirmed bookings will appear here." />
          )}
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default Calendar;
