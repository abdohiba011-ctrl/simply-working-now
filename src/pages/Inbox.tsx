import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessageCircle, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface BookingRow {
  id: string;
  bike_id: string | null;
  pickup_date: string;
  return_date: string;
  booking_status: string | null;
  customer_name: string | null;
  bikes?: { bike_types?: { name: string | null } | null } | null;
}

interface Conversation extends BookingRow {
  unread: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

const Inbox = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          "id, bike_id, pickup_date, return_date, booking_status, customer_name, bikes(bike_types(name))"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      const list = (bookings as BookingRow[] | null) ?? [];
      const ids = list.map((b) => b.id);

      let messages: Array<{
        booking_id: string;
        body: string | null;
        attachment_url: string | null;
        created_at: string;
        sender_id: string | null;
        read_at: string | null;
      }> = [];
      if (ids.length > 0) {
        const { data: msgs } = await supabase
          .from("booking_messages")
          .select("booking_id, body, attachment_url, created_at, sender_id, read_at")
          .in("booking_id", ids)
          .order("created_at", { ascending: false });
        messages = (msgs as typeof messages) || [];
      }

      const byBooking = new Map<string, typeof messages>();
      for (const m of messages) {
        const arr = byBooking.get(m.booking_id) || [];
        arr.push(m);
        byBooking.set(m.booking_id, arr);
      }

      const enriched: Conversation[] = list.map((b) => {
        const ms = byBooking.get(b.id) || [];
        const last = ms[0];
        const unread = ms.filter(
          (m) => m.sender_id && m.sender_id !== user.id && !m.read_at
        ).length;
        return {
          ...b,
          unread,
          lastMessageAt: last?.created_at ?? null,
          lastMessagePreview: last
            ? last.body || (last.attachment_url ? "📷 Photo" : "")
            : null,
        };
      });

      // Sort: bookings with messages first (newest message), then others by pickup
      enriched.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt)
          return b.lastMessageAt.localeCompare(a.lastMessageAt);
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return b.pickup_date.localeCompare(a.pickup_date);
      });

      if (!cancelled) {
        setConversations(enriched);
        setLoading(false);
      }
    };

    load();

    // Realtime: refresh when new messages arrive in any of the user's bookings
    const channel = supabase
      .channel("inbox-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages" },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const totalUnread = useMemo(
    () => conversations.reduce((acc, c) => acc + c.unread, 0),
    [conversations]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
          {totalUnread > 0 && (
            <Badge variant="destructive">{totalUnread} unread</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your conversations…
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Once you book a motorbike, your chat with the agency will appear here."
          />
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => {
              const bikeName = c.bikes?.bike_types?.name || "Motorbike";
              return (
                <Link key={c.id} to={`/booking/${c.id}`} className="block">
                  <Card className="hover:border-primary/60 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground truncate">{bikeName}</p>
                          {c.unread > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-5">
                              {c.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(c.pickup_date), "MMM d")} →{" "}
                          {format(new Date(c.return_date), "MMM d")} ·{" "}
                          <span className="uppercase tracking-wide">{c.booking_status}</span>
                        </p>
                        {c.lastMessagePreview && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {c.lastMessagePreview}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Inbox;
