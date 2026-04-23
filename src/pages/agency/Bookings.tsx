import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Search, Inbox } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAgencyBookingsWithBikes } from "@/hooks/useAgencyData";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const Bookings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const [status, setStatus] = useState<string>(initialStatus);
  const [search, setSearch] = useState("");
  const { bookings, loading } = useAgencyBookingsWithBikes();

  const filtered = useMemo(() => {
    let result = bookings;
    if (status !== "all") result = result.filter((b) => b.status === status);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        (b.customer_name || "").toLowerCase().includes(q) ||
        (b.customer_email || "").toLowerCase().includes(q) ||
        (b.bike?.name || "").toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q),
      );
    }
    return result;
  }, [bookings, status, search]);

  const updateStatus = (s: string) => {
    setStatus(s);
    if (s === "all") setSearchParams({});
    else setSearchParams({ status: s });
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
            <p className="text-sm text-muted-foreground">{bookings.length} total · {filtered.length} shown</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, bike…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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
                    <TableCell><StatusChip status={b.status || "pending"} /></TableCell>
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
