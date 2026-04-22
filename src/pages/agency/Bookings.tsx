import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO, subDays } from "date-fns";
import { Search, Download, ArrowUpDown, Inbox, Phone } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { agencyBookings, AgencyBookingStatus, findBike, findCustomer } from "@/data/agencyMockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StatusFilter = "all" | AgencyBookingStatus;
type SortKey = "newest" | "oldest" | "value" | "pickup";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No-Show" },
];

const PER_PAGE = 20;

const Bookings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = (searchParams.get("status") as StatusFilter) || "all";

  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [dateFrom] = useState(subDays(new Date(), 30));

  const pendingCount = agencyBookings.filter((b) => b.status === "pending").length;

  const filtered = useMemo(() => {
    let result = agencyBookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (search) {
        const cust = findCustomer(b.customerId);
        const bike = findBike(b.bikeId);
        const haystack = [b.ref, cust?.name, cust?.phone, bike?.name].join(" ").toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sort) {
        case "newest": return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
        case "oldest": return parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
        case "value": return b.totalAmount - a.totalAmount;
        case "pickup": return parseISO(a.pickupAt).getTime() - parseISO(b.pickupAt).getTime();
      }
    });
    return result;
  }, [status, search, sort]);

  const paged = filtered.slice(0, page * PER_PAGE);

  const updateStatus = (s: StatusFilter) => {
    setStatus(s);
    setPage(1);
    if (s === "all") searchParams.delete("status");
    else searchParams.set("status", s);
    setSearchParams(searchParams);
  };

  const exportCSV = () => {
    const rows = [
      ["Ref", "Customer", "Bike", "Pickup", "Return", "Days", "Amount MAD", "Status"],
      ...filtered.map((b) => {
        const c = findCustomer(b.customerId);
        const bike = findBike(b.bikeId);
        return [b.ref, c?.name, bike?.name, b.pickupAt, b.returnAt, b.totalDays, b.totalAmount, b.status];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "booking" : "bookings"} · {format(dateFrom, "MMM d")}–{format(new Date(), "MMM d, yyyy")}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => updateStatus(f.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                status === f.key
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
              {f.key === "pending" && pendingCount > 0 && (
                <span className="rounded-full bg-warning/20 px-1.5 py-0 text-[10px] font-semibold text-warning">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID, customer, phone, bike…"
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-44">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="value">Highest value</SelectItem>
              <SelectItem value="pickup">By pickup date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop table */}
        <Card className="hidden overflow-hidden rounded-xl shadow-sm md:block">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No bookings yet"
              description="Your verified listings will bring bookings here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Motorbike</TableHead>
                  <TableHead>Pickup → Return</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((b) => {
                  const cust = findCustomer(b.customerId);
                  const bike = findBike(b.bikeId);
                  return (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover:bg-primary/5 hover:shadow-sm"
                      onClick={() => navigate(`/agency/bookings/${b.id}`)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{b.ref}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img src={cust?.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{cust?.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{cust?.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img src={bike?.thumbnail} alt="" className="h-7 w-7 rounded object-cover" />
                          <span className="text-sm">{bike?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(b.pickupAt), "MMM d")} → {format(parseISO(b.returnAt), "MMM d")}
                      </TableCell>
                      <TableCell className="text-right text-sm">{b.totalDays}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{b.totalAmount} MAD</TableCell>
                      <TableCell><StatusChip status={b.status} /></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">⋯</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/agency/bookings/${b.id}`)}>View details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Message thread placeholder")}>Message customer</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => toast.error("Cancel placeholder")}>Cancel</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {filtered.length === 0 ? (
            <Card className="rounded-xl shadow-sm">
              <EmptyState icon={Inbox} title="No bookings yet" description="Your verified listings will bring bookings here." />
            </Card>
          ) : (
            paged.map((b) => {
              const cust = findCustomer(b.customerId);
              const bike = findBike(b.bikeId);
              return (
                <Card
                  key={b.id}
                  onClick={() => navigate(`/agency/bookings/${b.id}`)}
                  className="cursor-pointer rounded-xl p-4 shadow-sm transition-all hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{b.ref}</span>
                    <StatusChip status={b.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <img src={cust?.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{cust?.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {cust?.phone}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{bike?.name}</span>
                    <span className="font-semibold">{b.totalAmount} MAD · {b.totalDays}d</span>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {paged.length < filtered.length && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              Load more ({filtered.length - paged.length} remaining)
            </Button>
          </div>
        )}
      </div>
    </AgencyLayout>
  );
};

export default Bookings;
