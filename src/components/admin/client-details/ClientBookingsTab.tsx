import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Bike, MapPin, Eye } from "lucide-react";
import type { BookingData } from "./types";
import { formatDateTime, mapBookingStatus, mapPaymentStatus } from "./helpers";

interface ClientBookingsTabProps {
  bookings: BookingData[];
}

export const ClientBookingsTab = ({ bookings }: ClientBookingsTabProps) => {
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [bookingCityFilter, setBookingCityFilter] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);

  const uniqueCities = useMemo(() => [...new Set(bookings.map((b) => b.city))], [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (bookingStatusFilter !== "all" && b.bookingStatus !== bookingStatusFilter) return false;
      if (bookingCityFilter !== "all" && b.city !== bookingCityFilter) return false;
      if (bookingSearch) {
        const search = bookingSearch.toLowerCase();
        if (!b.id.toLowerCase().includes(search) && !b.motorbikeName.toLowerCase().includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [bookings, bookingStatusFilter, bookingCityFilter, bookingSearch]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Booking History</CardTitle>
              <CardDescription>All bookings made by this client</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="ONGOING">Ongoing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bookingCityFilter} onValueChange={setBookingCityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Motorbike</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <code className="text-xs font-mono">{booking.id.slice(0, 8)}...</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Bike className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.motorbikeName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {booking.city}
                        <span className="text-muted-foreground"> / {booking.pickupLocation}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{formatDateTime(booking.startDate)}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(booking.endDate)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{booking.price} DH</div>
                      {booking.deposit > 0 && (
                        <div className="text-xs text-muted-foreground">+{booking.deposit} DH deposit</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={mapPaymentStatus(booking.paymentStatus)} size="sm" /></TableCell>
                  <TableCell><StatusBadge status={mapBookingStatus(booking.bookingStatus)} size="sm" /></TableCell>
                  <TableCell className="text-xs">{formatDateTime(booking.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setBookingDrawerOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Booking Detail Drawer */}
      <Sheet open={bookingDrawerOpen} onOpenChange={setBookingDrawerOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Booking Details</SheetTitle>
            <SheetDescription>
              {selectedBooking ? `Booking #${selectedBooking.id.slice(0, 8)}...` : ""}
            </SheetDescription>
          </SheetHeader>
          {selectedBooking && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Motorbike</h4>
                  <p className="font-medium">{selectedBooking.motorbikeName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">City</h4>
                    <p className="font-medium">{selectedBooking.city}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Pickup Location</h4>
                    <p className="font-medium">{selectedBooking.pickupLocation}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Start Date</h4>
                    <p className="font-medium">{formatDateTime(selectedBooking.startDate)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">End Date</h4>
                    <p className="font-medium">{formatDateTime(selectedBooking.endDate)}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Price</h4>
                    <p className="font-medium">{selectedBooking.price} DH</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Deposit</h4>
                    <p className="font-medium">{selectedBooking.deposit} DH</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Payment Status</h4>
                    <StatusBadge status={mapPaymentStatus(selectedBooking.paymentStatus)} size="sm" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Booking Status</h4>
                    <StatusBadge status={mapBookingStatus(selectedBooking.bookingStatus)} size="sm" />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Created At</h4>
                  <p className="font-medium">{formatDateTime(selectedBooking.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
