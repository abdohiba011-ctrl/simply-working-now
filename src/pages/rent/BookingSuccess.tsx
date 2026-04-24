import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

export default function BookingSuccess() {
  const { id = "" } = useParams();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("bookings").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => setBooking(data));
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardContent className="space-y-6 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">You're all set!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your bike is reserved. The agency has 24 hours to confirm.
              </p>
            </div>

            {booking && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-left text-sm">
                <div className="font-mono text-xs text-muted-foreground">Booking #{String(id).slice(0, 8).toUpperCase()}</div>
                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(parseISO(booking.pickup_date), "dd MMM")} → {format(parseISO(booking.return_date), "dd MMM yyyy")}
                </div>
                {booking.pickup_location && (
                  <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{booking.pickup_location}</div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Button asChild className="w-full" size="lg">
                <Link to={`/messages/${id}`}><MessageCircle className="mr-2 h-4 w-4" /> Chat with agency</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/booking-history">View my bookings</Link>
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              You'll receive an email and in-app notification once the agency confirms.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
