import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessageCircle, Loader2, ChevronLeft, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BookingChat } from "@/components/BookingChat";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          "id, bike_id, pickup_date, return_date, booking_status, customer_name, bikes(bike_types(name))",
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
          (m) => m.sender_id && m.sender_id !== user.id && !m.read_at,
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

      // Conversations with messages first (newest), then by pickup date
      enriched.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt)
          return b.lastMessageAt.localeCompare(a.lastMessageAt);
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return b.pickup_date.localeCompare(a.pickup_date);
      });

      if (!cancelled) {
        setConversations(enriched);
        // Auto-select most recent on desktop
        if (!isMobile && enriched.length > 0 && !activeId) {
          setActiveId(enriched[0].id);
        }
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`inbox-messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "booking_messages" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Mark messages as read when a conversation is opened
  useEffect(() => {
    if (!user || !activeId) return;
    (async () => {
      await supabase
        .from("booking_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("booking_id", activeId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    })();
  }, [activeId, user]);

  const totalUnread = useMemo(
    () => conversations.reduce((acc, c) => acc + c.unread, 0),
    [conversations],
  );

  const activeConversation = conversations.find((c) => c.id === activeId);
  const showChatPane = !isMobile || !!activeId;
  const showListPane = !isMobile || !activeId;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {!isMobile || !activeId ? (
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            {totalUnread > 0 && (
              <Badge variant="destructive">{totalUnread} unread</Badge>
            )}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading conversations…
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Once you book a motorbike, your chat with the agency will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {showListPane && (
              <div className="md:col-span-1 space-y-2 md:max-h-[75vh] md:overflow-y-auto">
                {conversations.map((c) => {
                  const bikeName = c.bikes?.bike_types?.name || "Motorbike";
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "w-full text-left",
                        activeId === c.id ? "ring-2 ring-primary rounded-lg" : "",
                      )}
                    >
                      <Card className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm text-foreground truncate flex-1">
                              {bikeName}
                            </span>
                            {c.unread > 0 && (
                              <Badge variant="destructive" className="text-[10px] h-5">
                                {c.unread}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(c.pickup_date), "MMM d")} →{" "}
                            {format(new Date(c.return_date), "MMM d")}
                          </p>
                          {c.lastMessagePreview && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {c.lastMessagePreview}
                            </p>
                          )}
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                            {c.booking_status}
                          </p>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            )}

            {showChatPane && (
              <div className="md:col-span-2">
                {isMobile && activeId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-2 -ml-2"
                    onClick={() => setActiveId(null)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to conversations
                  </Button>
                )}
                {activeId ? (
                  <BookingChat
                    bookingId={activeId}
                    viewerRole="renter"
                    title={
                      activeConversation?.bikes?.bike_types?.name
                        ? `Chat — ${activeConversation.bikes.bike_types.name}`
                        : "Chat with agency"
                    }
                  />
                ) : (
                  <EmptyState
                    icon={MessageCircle}
                    title="Select a conversation"
                    description="Pick a booking on the left to view messages."
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Inbox;
