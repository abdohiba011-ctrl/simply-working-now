import { useEffect, useMemo, useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ChatThread } from "@/components/chat/ChatThread";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Search } from "lucide-react";

interface Conv {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  pickup_date: string;
  return_date: string;
  booking_status: string | null;
  created_at: string;
  last_body: string | null;
  last_at: string | null;
  unread: number;
}

const initials = (s: string | null | undefined) =>
  (s || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const timeLabel = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

const Messages = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: bks } = await supabase
      .from("bookings")
      .select(
        "id, customer_name, customer_email, pickup_date, return_date, booking_status, created_at"
      )
      .eq("assigned_to_business", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const list = (bks || []) as Array<Omit<Conv, "last_body" | "last_at" | "unread">>;
    if (list.length === 0) {
      setConvs([]);
      setLoading(false);
      return;
    }
    const ids = list.map((b) => b.id);
    const { data: msgs } = await supabase
      .from("booking_messages")
      .select("booking_id, body, attachment_url, attachment_mime, created_at, sender_id, read_at")
      .in("booking_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);

    const lastByBooking = new Map<string, any>();
    const unreadByBooking = new Map<string, number>();
    (msgs || []).forEach((m: any) => {
      if (!lastByBooking.has(m.booking_id)) lastByBooking.set(m.booking_id, m);
      if (m.sender_id !== user.id && !m.read_at) {
        unreadByBooking.set(m.booking_id, (unreadByBooking.get(m.booking_id) || 0) + 1);
      }
    });

    const enriched: Conv[] = list
      .map((b) => {
        const last = lastByBooking.get(b.id);
        return {
          ...b,
          last_body: last
            ? last.body ||
              (last.attachment_url
                ? last.attachment_mime?.startsWith("image/")
                  ? "📷 Photo"
                  : "📎 File"
                : "")
            : null,
          last_at: last?.created_at ?? b.created_at,
          unread: unreadByBooking.get(b.id) || 0,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.last_at || 0).getTime() - new Date(a.last_at || 0).getTime()
      );

    setConvs(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`agency-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_messages" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return convs;
    const q = search.toLowerCase();
    return convs.filter(
      (c) =>
        (c.customer_name || "").toLowerCase().includes(q) ||
        (c.customer_email || "").toLowerCase().includes(q) ||
        (c.last_body || "").toLowerCase().includes(q)
    );
  }, [convs, search]);

  const active = useMemo(() => convs.find((c) => c.id === activeId) || null, [convs, activeId]);
  const showList = !isMobile || !activeId;
  const showChat = !isMobile || !!activeId;

  return (
    <AgencyLayout>
      {/* Negate AgencyShell main padding for a full-bleed chat experience */}
      <div className="-mx-4 -mt-2 -mb-24 h-[calc(100dvh-3.5rem)] lg:-mx-6 lg:-mb-8 lg:h-[calc(100dvh-3.5rem)]">
        <div className="flex h-full overflow-hidden bg-background">
          {showList && (
            <aside
              className={cn(
                "flex flex-col border-r border-border bg-card",
                isMobile ? "w-full" : "w-[340px] shrink-0 lg:w-[360px]"
              )}
            >
              <div className="space-y-2 border-b border-border px-4 py-3">
                <h1 className="text-lg font-bold tracking-tight text-foreground">Messages</h1>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search renter or message…"
                    className="h-9 pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">
                      {convs.length === 0 ? "No messages yet" : "Nothing matches"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {convs.length === 0
                        ? "You'll see renter messages here once bookings come in."
                        : "Try a different search term."}
                    </p>
                  </div>
                ) : (
                  filtered.map((c) => {
                    const name = c.customer_name || c.customer_email || "Renter";
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
                            {initials(name)}
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
                              {name}
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
                                "flex-1 truncate text-xs",
                                c.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                              )}
                            >
                              {c.last_body || "No messages yet"}
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
                  viewerRole="agency"
                  counterpartyName={active.customer_name || active.customer_email || "Renter"}
                  counterpartySubtitle={`Booking #${active.id.slice(0, 8)} · ${format(new Date(active.pickup_date), "MMM d")} → ${format(new Date(active.return_date), "MMM d")}`}
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
    </AgencyLayout>
  );
};

export default Messages;
