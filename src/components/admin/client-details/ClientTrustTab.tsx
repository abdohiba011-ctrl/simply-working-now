import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { ClientData, TrustEventData } from "./types";
import { formatDateTime, getTrustLabel } from "./helpers";

interface ClientTrustTabProps {
  client: ClientData;
  trustEvents: TrustEventData[];
}

export const ClientTrustTab = ({ client, trustEvents }: ClientTrustTabProps) => {
  const trustInfo = getTrustLabel(client.trustScore);

  return (
    <div className="space-y-6">
      {/* Trust Score Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className={`h-5 w-5 ${trustInfo.color}`} />
            Trust Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold">{client.trustScore}</div>
            <div className="text-2xl text-muted-foreground">/10</div>
            <Badge className={`${trustInfo.color} bg-transparent border`}>{trustInfo.label}</Badge>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium">Privileges</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <CheckCircle className="h-4 w-4 inline mr-2 text-success" />
                <strong>High trust (8-10) + Verified:</strong> Faster renting flow, priority support, reduced deposit requirements.
              </p>
              <p>
                <AlertTriangle className="h-4 w-4 inline mr-2 text-warning" />
                <strong>Medium trust (4-7):</strong> Standard booking flow, normal deposit.
              </p>
              <p>
                <XCircle className="h-4 w-4 inline mr-2 text-destructive" />
                <strong>Low trust (0-3):</strong> Additional checks required, manual review for bookings, higher deposit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trust History</CardTitle>
          <CardDescription>Complete history of trust point changes</CardDescription>
        </CardHeader>
        <CardContent>
          {trustEvents.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No trust events yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Related Booking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trustEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-xs">{formatDateTime(event.datetime)}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 font-medium ${event.delta > 0 ? "text-success" : "text-destructive"}`}>
                        {event.delta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {event.delta > 0 ? `+${event.delta}` : event.delta}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">{event.reason}</TableCell>
                    <TableCell>{event.actor}</TableCell>
                    <TableCell>
                      {event.relatedBookingId ? (
                        <code className="text-xs font-mono">{event.relatedBookingId.slice(0, 8)}...</code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
