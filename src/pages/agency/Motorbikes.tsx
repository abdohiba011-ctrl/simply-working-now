import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, LayoutGrid, List, Star, MoreVertical, Bike, Eye, EyeOff,
  Wrench, Trash2, Copy, Edit, Sparkles, TrendingUp,
} from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  agencyBikes, AgencyBike, BikeStatus, BikeCategory, neighborhoods,
} from "@/data/agencyMockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const STATUS_LABEL: Record<BikeStatus, string> = {
  available: "Available", rented: "Rented", maintenance: "Maintenance", hidden: "Hidden",
};
const STATUS_STYLES: Record<BikeStatus, string> = {
  available: "bg-success/10 text-success border-success/20",
  rented: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  maintenance: "bg-warning/10 text-warning border-warning/20",
  hidden: "bg-muted text-muted-foreground border-border",
};

type SortKey = "newest" | "most_booked" | "highest_revenue" | "price_asc" | "price_desc";

const Motorbikes = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | BikeStatus>("all");
  const [category, setCategory] = useState<"all" | BikeCategory>("all");
  const [licReq, setLicReq] = useState<"all" | "yes" | "no">("all");
  const [neighborhood, setNeighborhood] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [bikes, setBikes] = useState<AgencyBike[]>(agencyBikes);
  const [photoIdx, setPhotoIdx] = useState<Record<string, number>>({});
  const [confirmDelete, setConfirmDelete] = useState<AgencyBike | null>(null);

  const filtered = useMemo(() => {
    let arr = bikes.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (category !== "all" && b.category !== category) return false;
      if (licReq === "yes" && !b.licenseRequired) return false;
      if (licReq === "no" && b.licenseRequired) return false;
      if (neighborhood !== "all" && b.neighborhood !== neighborhood) return false;
      if (search && !b.name.toLowerCase().includes(search.toLowerCase()) &&
          !b.brand.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    switch (sort) {
      case "most_booked": arr.sort((a, b) => b.bookingsCount - a.bookingsCount); break;
      case "highest_revenue": arr.sort((a, b) => b.revenueLast30 - a.revenueLast30); break;
      case "price_asc": arr.sort((a, b) => a.pricePerDay - b.pricePerDay); break;
      case "price_desc": arr.sort((a, b) => b.pricePerDay - a.pricePerDay); break;
      default: arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return arr;
  }, [bikes, status, category, licReq, neighborhood, search, sort]);

  const updateStatus = (id: string, newStatus: BikeStatus) => {
    setBikes((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
    toast.success(`Marked as ${STATUS_LABEL[newStatus]}`);
  };
  const duplicate = (bike: AgencyBike) => {
    const copy: AgencyBike = { ...bike, id: `b${Date.now()}`, name: `${bike.name} (copy)`, createdAt: new Date().toISOString() };
    setBikes((prev) => [copy, ...prev]);
    toast.success("Motorbike duplicated");
  };
  const remove = (bike: AgencyBike) => {
    setBikes((prev) => prev.filter((b) => b.id !== bike.id));
    toast.success("Motorbike deleted");
    setConfirmDelete(null);
  };

  const cyclePhoto = (bike: AgencyBike) => {
    setPhotoIdx((prev) => ({ ...prev, [bike.id]: ((prev[bike.id] ?? 0) + 1) % bike.photos.length }));
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-7xl">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Motorbikes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} of {bikes.length} bikes in your fleet
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate("/agency/motorbikes/new")}>
            <Plus className="h-4 w-4" /> Add motorbike
          </Button>
        </div>

        {/* Filters */}
        <Card className="mt-6 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or brand…" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="scooter">Scooter</SelectItem>
                <SelectItem value="sport">Sport</SelectItem>
                <SelectItem value="cruiser">Cruiser</SelectItem>
                <SelectItem value="adventure">Adventure</SelectItem>
                <SelectItem value="touring">Touring</SelectItem>
                <SelectItem value="electric">Electric</SelectItem>
                <SelectItem value="offroad">Off-road</SelectItem>
              </SelectContent>
            </Select>
            <Select value={licReq} onValueChange={(v) => setLicReq(v as typeof licReq)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">License: any</SelectItem>
                <SelectItem value="yes">License required</SelectItem>
                <SelectItem value="no">No license</SelectItem>
              </SelectContent>
            </Select>
            <Select value={neighborhood} onValueChange={setNeighborhood}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All neighborhoods</SelectItem>
                {neighborhoods.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="most_booked">Most booked</SelectItem>
                <SelectItem value="highest_revenue">Highest revenue</SelectItem>
                <SelectItem value="price_asc">Price: low → high</SelectItem>
                <SelectItem value="price_desc">Price: high → low</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto inline-flex rounded-md border border-border bg-card">
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setView("grid")} className="rounded-r-none gap-1">
                <LayoutGrid className="h-4 w-4" /> Grid
              </Button>
              <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setView("list")} className="rounded-l-none gap-1">
                <List className="h-4 w-4" /> List
              </Button>
            </div>
          </div>
        </Card>

        {/* Body */}
        {filtered.length === 0 ? (
          <Card className="mt-6">
            <EmptyState icon={Bike} title="No motorbikes match your filters" description="Try clearing some filters or add a new motorbike to your fleet." action={{ label: "+ Add motorbike", onClick: () => navigate("/agency/motorbikes/new") }} />
          </Card>
        ) : view === "grid" ? (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((bike) => {
              const idx = photoIdx[bike.id] ?? 0;
              return (
                <Card key={bike.id} className="overflow-hidden transition-all hover:shadow-lg">
                  <div className="relative aspect-video cursor-pointer bg-muted" onClick={() => navigate(`/agency/motorbikes/${bike.id}`)}>
                    <img src={bike.photos[idx]} alt={bike.name} className="h-full w-full object-cover" loading="lazy" />
                    <span className={cn("absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", STATUS_STYLES[bike.status])}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {STATUS_LABEL[bike.status]}
                    </span>
                    {bike.featured && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                        <Sparkles className="h-3 w-3" /> Featured
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); cyclePhoto(bike); }}
                      className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur"
                    >
                      {idx + 1}/{bike.photos.length}
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{bike.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {bike.category} · {bike.engineCc}cc · {bike.year}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/agency/motorbikes/${bike.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicate(bike)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => updateStatus(bike.id, "maintenance")}>
                            <Wrench className="mr-2 h-4 w-4" /> Mark unavailable
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(bike.id, "hidden")}>
                            <EyeOff className="mr-2 h-4 w-4" /> Hide from search
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(bike)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold">{bike.pricePerDay} <span className="text-xs font-normal text-muted-foreground">MAD/day</span></p>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="font-medium">{bike.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>{bike.bookingsCount} bookings</span>
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {bike.revenueLast30.toLocaleString()} MAD / 30d
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="mt-6 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bike</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Price/day</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Revenue 30d</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((bike) => (
                  <TableRow key={bike.id} className="cursor-pointer" onClick={() => navigate(`/agency/motorbikes/${bike.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img src={bike.thumbnail} alt={bike.name} className="h-10 w-10 rounded object-cover" />
                        <div>
                          <p className="font-medium">{bike.name}</p>
                          <p className="text-xs text-muted-foreground">{bike.brand} · {bike.year}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{bike.category}</TableCell>
                    <TableCell className="font-mono text-xs">{bike.licensePlate}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_STYLES[bike.status])}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {STATUS_LABEL[bike.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{bike.pricePerDay} MAD</TableCell>
                    <TableCell className="text-right">{bike.bookingsCount}</TableCell>
                    <TableCell className="text-right">{bike.revenueLast30.toLocaleString()} MAD</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(parseISO(bike.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/agency/motorbikes/${bike.id}/edit`)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicate(bike)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(bike.id, "maintenance")}><Wrench className="mr-2 h-4 w-4" /> Mark unavailable</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(bike.id, "hidden")}><EyeOff className="mr-2 h-4 w-4" /> Hide</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(bike)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this motorbike?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{confirmDelete?.name}</strong> from your fleet. Existing bookings will not be affected. This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => confirmDelete && remove(confirmDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AgencyLayout>
  );
};

export default Motorbikes;
