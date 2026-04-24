import { useEffect, useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessageCircle, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { BookingChat } from "@/components/BookingChat";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BookingRow {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  pickup_date: string;
  return_date: string;
  booking_status: string | null;
  created_at: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, customer_name, customer_email, pickup_date, return_date, booking_status, created_at")
        .eq("assigned_to_business", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setBookings((data as BookingRow[]) || []);
      if (data && data.length > 0) setActiveId(data[0].id);
      setLoading(false);
    })();
  }, [user]);

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl py-8 px-4">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Messages</h1>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading conversations…
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Once a renter books one of your bikes, the chat will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
              {bookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setActiveId(b.id)}
                  className={cn(
                    "w-full text-left",
                    activeId === b.id ? "ring-2 ring-primary rounded-lg" : ""
                  )}
                >
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-foreground truncate">
                          {b.customer_name || b.customer_email || "Renter"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(b.pickup_date), "MMM d")} →{" "}
                        {format(new Date(b.return_date), "MMM d")}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                        {b.booking_status}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>

            <div className="md:col-span-2">
              {activeId ? (
                <BookingChat
                  bookingId={activeId}
                  viewerRole="agency"
                  title="Chat with renter"
                />
              ) : (
                <EmptyState
                  icon={MessageCircle}
                  title="Select a conversation"
                  description="Pick a booking on the left to view messages."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AgencyLayout>
  );
};

export default Messages;
