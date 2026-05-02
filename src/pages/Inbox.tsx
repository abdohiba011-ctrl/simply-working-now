import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { ChatThread } from "@/components/chat/ChatThread";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageCircle, Loader2 } from "lucide-react";

interface Conv {
  id: string;
  pickup_date: string;
  return_date: string;
  booking_status: string | null;
  agency_user_id: string | null;
  agency_name: string;
  bike_name: string;
  unread: number;
  last_at: string | null;
  last_preview: string | null;
}

const initials = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const timeLabel = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

const Inbox = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          "id, pickup_date, return_date, booking_status, assigned_to_business, bikes(bike_types(name))"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      const list = (bookings || []) as Array<{
        id: string;
        pickup_date: string;
        return_date: string;
        booking_status: string | null;
        assigned_to_business: string | null;
        bikes?: { bike_types?: { name: string | null } | null } | null;
      }>;
      const ids = list.map((b) => b.id);
      const agencyIds = Array.from(
        new Set(list.map((b) => b.assigned_to_business).filter(Boolean) as string[])
      );

      const [msgs, agencies] = await Promise.all([
        ids.length
          ? supabase
              .from("booking_messages")
              .select("booking_id, body, attachment_url, attachment_mime, created_at, sender_id, read_at")
              .in("booking_id", ids)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        agencyIds.length
          ? supabase
              .from("booking_counterparty_profiles")
              .select("user_id, business_name, full_name, name")
              .in("user_id", agencyIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const agencyMap = new Map<string, string>();
      ((agencies as any).data || []).forEach((a: any) => {
        agencyMap.set(a.user_id, a.business_name || a.full_name || a.name || "Agency");
      });

      const lastByBooking = new Map<string, any>();
      const unreadByBooking = new Map<string, number>();
      ((msgs as any).data || []).forEach((m: any) => {
        if (!lastByBooking.has(m.booking_id)) lastByBooking.set(m.booking_id, m);
        if (m.sender_id && m.sender_id !== user.id && !m.read_at) {
          unreadByBooking.set(m.booking_id, (unreadByBooking.get(m.booking_id) || 0) + 1);
        }
      });

      const enriched: Conv[] = list.map((b) => {
        const last = lastByBooking.get(b.id);
        return {
          id: b.id,
          pickup_date: b.pickup_date,
          return_date: b.return_date,
          booking_status: b.booking_status,
          agency_user_id: b.assigned_to_business,
          agency_name: b.assigned_to_business
            ? agencyMap.get(b.assigned_to_business) || "Agency"
            : "Agency",
          bike_name: b.bikes?.bike_types?.name || "Motorbike",
          unread: unreadByBooking.get(b.id) || 0,
          last_at: last?.created_at ?? null,
          last_preview: last
            ? last.body ||
              (last.attachment_url
                ? last.attachment_mime?.startsWith("image/")
                  ? "📷 Photo"
                  : "📎 File"
                : "")
            : null,
        };
      });

      enriched.sort((a, b) => {
        if (a.last_at && b.last_at) return b.last_at.localeCompare(a.last_at);
        if (a.last_at) return -1;
        if (b.last_at) return 1;
        return b.pickup_date.localeCompare(a.pickup_date);
      });

      if (!cancelled) {
        setConvs(enriched);
        setLoading(false);
      }
    };

    load();
    const ch = supabase
      .channel(`inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_messages" },
        () => load()
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const active = useMemo(() => convs.find((c) => c.id === activeId) || null, [convs, activeId]);
  const showList = !isMobile || !activeId;
  const showChat = !isMobile || !!activeId;

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <Header />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showList && (
          <aside
            className={cn(
              "flex flex-col border-r border-border bg-card",
              isMobile ? "w-full" : "w-[340px] shrink-0 lg:w-[360px]"
            )}
          >
            <div className="border-b border-border px-4 py-3">
              <h1 className="text-lg font-bold tracking-tight text-foreground">Messages</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : convs.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground">No messages yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Book a bike to start chatting with an agency.
                  </p>
                </div>
              ) : (
                convs.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted/60",
                        isActive && "bg-muted"
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-foreground">
                          {initials(c.agency_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              c.unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"
                            )}
                          >
                            {c.agency_name}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {timeLabel(c.last_at)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Booking #{c.id.slice(0, 8)}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p
                            className={cn(
                              "truncate text-xs flex-1",
                              c.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {c.last_preview || "No messages yet"}
                          </p>
                          {c.unread > 0 && (
                            <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#9FE870] px-1.5 text-[10px] font-bold text-[#163300]">
                              {c.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}
        {showChat && (
          <section className="flex-1 min-w-0">
            {active ? (
              <ChatThread
                bookingId={active.id}
                viewerRole="renter"
                counterpartyName={active.agency_name}
                counterpartySubtitle={`Booking #${active.id.slice(0, 8)} · ${active.bike_name}`}
                onBack={isMobile ? () => setActiveId(null) : undefined}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#FAFAFA] p-8">
                <div className="text-center">
                  <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground">Select a conversation</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick a booking on the left to view messages.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Inbox;
