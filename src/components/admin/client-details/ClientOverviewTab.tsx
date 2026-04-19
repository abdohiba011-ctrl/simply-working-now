import { Card, CardContent } from "@/components/ui/card";
import {
  Bike,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Timer,
  CalendarDays,
} from "lucide-react";
import type { ClientData } from "./types";
import { formatDateTime } from "./helpers";

interface ClientOverviewTabProps {
  client: ClientData;
}

export const ClientOverviewTab = ({ client }: ClientOverviewTabProps) => {
  return (
    <div className="space-y-6">
      {/* Quick Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bike className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.totalBookings}</p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20 dark:bg-success/20">
                <CheckCircle className="h-5 w-5 text-success dark:text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.completedBookings}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20 dark:bg-warning/20">
                <XCircle className="h-5 w-5 text-warning dark:text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.cancelledBookings}</p>
                <p className="text-xs text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20 dark:bg-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive dark:text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.noShows}</p>
                <p className="text-xs text-muted-foreground">No-shows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.totalSpend} DH</p>
                <p className="text-xs text-muted-foreground">Total Spend</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20 dark:bg-warning/20">
                <CreditCard className="h-5 w-5 text-warning dark:text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.refundsCount}</p>
                <p className="text-xs text-muted-foreground">Refunds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Timer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.avgRentalDuration}</p>
                <p className="text-xs text-muted-foreground">Avg Days/Rental</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium truncate" title={formatDateTime(client.lastBookingAt)}>
                  {client.lastBookingAt ? formatDateTime(client.lastBookingAt).split(" ")[0] : "Never"}
                </p>
                <p className="text-xs text-muted-foreground">Last Booking</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
