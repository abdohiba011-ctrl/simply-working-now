import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Search, Inbox, Download, CalendarIcon, X } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAgencyBookingsWithBikes } from "@/hooks/useAgencyData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const escapeCsv = (val: unknown) => {
  const s = val == null ? "" : String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const Bookings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const [status, setStatus] = useState<string>(initialStatus);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { bookings, loading } = useAgencyBookingsWithBikes();

  const filtered = useMemo(() => {
    let result = bookings;
    if (status !== "all") result = result.filter((b) => (b.booking_status || b.status) === status);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        (b.customer_name || "").toLowerCase().includes(q) ||
        (b.customer_email || "").toLowerCase().includes(q) ||
        (b.bike?.name || "").toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q),
      );
    }
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = endOfDay(dateRange.to ?? dateRange.from);
      result = result.filter((b) => {
        try {
          return isWithinInterval(parseISO(b.pickup_date), { start: from, end: to });
        } catch { return false; }
      });
    }
    return result;
  }, [bookings, status, search, dateRange]);

  const updateStatus = (s: string) => {
    setStatus(s);
    if (s === "all") setSearchParams({});
    else setSearchParams({ status: s });
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = ["ID", "Customer", "Email", "Phone", "Motorbike", "Pickup", "Return", "Total (MAD)", "Status"];
    const rows = filtered.map((b) => [
      b.id,
      b.customer_name || "",
      b.customer_email || "",
      b.customer_phone || "",
      b.bike?.name || "",
      b.pickup_date,
      b.return_date,
      Number(b.total_price || 0),
      b.booking_status || b.status || "pending",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} bookings`);
  };

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd MMM")} – ${format(dateRange.to, "dd MMM")}`
      : format(dateRange.from, "dd MMM yyyy")
    : "Pickup date";

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
            <p className="text-sm text-muted-foreground">{bookings.length} total · {filtered.length} shown</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, bike…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!dateRange?.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateLabel}
                  {dateRange?.from && (
                    <X
                      className="ml-2 h-3.5 w-3.5 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setDateRange(undefined); }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={status === f.key ? "default" : "outline"}
              onClick={() => updateStatus(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading bookings…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}
              description={bookings.length === 0 ? "Bookings assigned to your agency will appear here." : "Try adjusting search or filters."}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Motorbike</TableHead>
                  <TableHead>Pickup → Return</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => navigate(`/agency/bookings/${b.id}`)}>
                    <TableCell>
                      <div className="font-medium">{b.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{b.customer_email || b.customer_phone || ""}</div>
                    </TableCell>
                    <TableCell>{b.bike?.name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(parseISO(b.pickup_date), "dd MMM")} → {format(parseISO(b.return_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(b.total_price || 0).toLocaleString()} MAD</TableCell>
                    <TableCell><StatusChip status={b.booking_status || b.status || "pending"} /></TableCell>
                    <TableCell><Button size="sm" variant="ghost">Open</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default Bookings;
