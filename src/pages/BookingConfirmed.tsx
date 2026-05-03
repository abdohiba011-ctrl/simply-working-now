import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Bike as BikeIcon,
  MessageCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookingRow {
  id: string;
  bike_id: string | null;
  pickup_date: string;
  return_date: string;
  total_days: number | null;
  total_price: number | null;
  delivery_method: string | null;
  pickup_location: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  booking_status: string | null;
  payment_status: string | null;
  bike_name?: string | null;
  bike_image?: string | null;
}

const BookingConfirmed = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `id, bike_id, pickup_date, return_date, total_days, total_price,
           delivery_method, pickup_location, customer_name, customer_email,
           customer_phone, booking_status, payment_status`,
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Booking not found.");
        navigate("/");
        return;
      }
      let bikeName: string | null = null;
      let bikeImage: string | null = null;
      if (data.bike_id) {
        const { data: bikeRow } = await supabase
          .from("bikes")
          .select("bike_type_id")
          .eq("id", data.bike_id)
          .maybeSingle();
        if (bikeRow?.bike_type_id) {
          const { data: bt } = await supabase
            .from("bike_types")
            .select("name, main_image_url")
            .eq("id", bikeRow.bike_type_id)
            .maybeSingle();
          bikeName = bt?.name ?? null;
          bikeImage = bt?.main_image_url ?? null;
        }
      }
      setBooking({ ...(data as any), bike_name: bikeName, bike_image: bikeImage });
      setLoading(false);
    };
    load();
  }, [bookingId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-10 max-w-2xl space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const isPaid = booking.payment_status === "paid";
  const isPending = booking.booking_status === "pending";
  const isConfirmed = booking.booking_status === "confirmed";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isPaid ? "Booking confirmed!" : "Almost there"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isPaid
              ? "Your booking fee was received. The agency will reach out shortly."
              : "We're waiting for payment confirmation. This usually takes a moment."}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Ref: {booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {booking.bike_image ? (
                  <img
                    src={booking.bike_image}
                    alt={booking.bike_name ?? "Motorbike"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BikeIcon className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground truncate">
                  {booking.bike_name ?? "Motorbike"}
                </h2>
                {booking.total_price != null && (
                  <p className="text-sm text-muted-foreground">
                    Trip total: {booking.total_price} MAD
                  </p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Pickup</p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.pickup_date), "EEE, MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Return</p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.return_date), "EEE, MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">
                    {booking.delivery_method === "delivery"
                      ? "Delivery"
                      : "Pickup at agency"}
                  </p>
                  <p className="text-muted-foreground">
                    {booking.pickup_location ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <p className="font-semibold text-foreground inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                What happens next
              </p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                <li>The agency receives your booking and has 24h to confirm.</li>
                <li>You'll be notified by email and in-app message.</li>
                <li>Coordinate pickup details directly with the agency.</li>
                <li>Pay the rental balance to the agency at pickup.</li>
              </ol>
            </div>

            {!isPaid && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-400" />
                <span className="text-amber-900 dark:text-amber-100">
                  Payment status: {booking.payment_status ?? "unpaid"}. Refresh
                  in a moment if you just paid.
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button asChild variant="hero" size="lg" className="flex-1">
                <Link to="/account/bookings">View my bookings</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link to={`/messages/${booking.id}`}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message agency
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingConfirmed;
