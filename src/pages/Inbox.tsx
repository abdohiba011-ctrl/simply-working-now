import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { ChatThread } from "@/components/chat/ChatThread";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import motonitaIconForest from "@/assets/motonita-icon-forest.svg";
import motonitaIconWhite from "@/assets/motonita-icon-white.svg";
import { useTranslation } from "react-i18next";

interface Conv {
  id: string;
  pickup_date: string;
  return_date: string;
  booking_status: string | null;
  agency_user_id: string | null;
  agency_name: string;
  agency_avatar_url: string | null;
  bike_name: string;
  bike_image_url: string | null;
  created_at: string;
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Honor ?booking=<id> deep-link from the booking-confirmed page.
  useEffect(() => {
    const wanted = searchParams.get("booking");
    if (!wanted || activeId) return;
    if (convs.some((c) => c.id === wanted)) {
      setActiveId(wanted);
      // Clean the param so back/forward doesn't keep re-selecting it.
      const next = new URLSearchParams(searchParams);
      next.delete("booking");
      setSearchParams(next, { replace: true });
    }
  }, [convs, searchParams, activeId, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          "id, pickup_date, return_date, booking_status, assigned_to_business, created_at, bikes(bike_types(name, main_image_url))"
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
        created_at: string;
        bikes?: { bike_types?: { name: string | null; main_image_url: string | null } | null } | null;
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
              .select("user_id, business_name, full_name, name, avatar_url, business_logo_url")
              .in("user_id", agencyIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const agencyMap = new Map<string, { name: string; avatar: string | null }>();
      ((agencies as any).data || []).forEach((a: any) => {
        agencyMap.set(a.user_id, {
          name: a.business_name || a.full_name || a.name || "Agency",
          avatar: a.business_logo_url || a.avatar_url || null,
        });
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
        const ag = b.assigned_to_business ? agencyMap.get(b.assigned_to_business) : null;
        return {
          id: b.id,
          pickup_date: b.pickup_date,
          return_date: b.return_date,
          booking_status: b.booking_status,
          agency_user_id: b.assigned_to_business,
          agency_name: ag?.name || "Agency",
          agency_avatar_url: ag?.avatar || null,
          bike_name: b.bikes?.bike_types?.name || "Motorbike",
          bike_image_url: b.bikes?.bike_types?.main_image_url || null,
          created_at: b.created_at,
          unread: unreadByBooking.get(b.id) || 0,
          last_at: last?.created_at ?? null,
          last_preview: last
            ? last.body ||
              (last.attachment_url
                ? last.attachment_mime?.startsWith("image/")
                  ? "Photo"
                  : "File"
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

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };



  return (
    <div className="flex min-h-[100dvh] flex-col bg-muted/30">
      {/* Main shell */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto flex h-[100dvh] w-full max-w-6xl flex-1 min-h-0 overflow-hidden md:my-4 md:h-[calc(100dvh-2rem)] md:rounded-2xl md:border md:border-border/60 md:bg-background md:shadow-sm">
          {showList && (
            <aside
              className={cn(
                "flex flex-col bg-background",
                isMobile
                  ? "w-full"
                  : "w-[320px] shrink-0 border-r border-border/60 xl:w-[360px]"
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                <button
                  onClick={handleBack}
                  aria-label="Back"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground hover:bg-muted transition-colors"
                >
                  {isRTL ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" />
                  )}
                </button>
                <h1 className="flex-1 text-base font-semibold tracking-tight text-foreground">
                  Messages
                </h1>
                <a
                  href="/"
                  aria-label="Motonita home"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted/70 transition-colors"
                >
                  <img
                    src={motonitaIconForest}
                    alt="Motonita"
                    className="h-8 w-auto block dark:hidden"
                  />
                  <img
                    src={motonitaIconWhite}
                    alt="Motonita"
                    className="h-8 w-auto hidden dark:block"
                  />
                </a>
              </div>
              <div className="scrollbar-hide flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : convs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                      <MessageCircle className="h-7 w-7 text-foreground/70" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No messages yet</p>
                    <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                      Book a bike to start chatting with an agency.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {convs.map((c) => {
                      const isActive = activeId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setActiveId(c.id)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                            isActive
                              ? "bg-primary/15 ring-1 ring-primary/30"
                              : "hover:bg-muted/60"
                          )}
                        >
                          <Avatar className="h-11 w-11 shrink-0">
                            {c.agency_avatar_url ? (
                              <AvatarImage src={c.agency_avatar_url} alt={c.agency_name} />
                            ) : null}
                            <AvatarFallback className="bg-primary/20 text-xs font-semibold text-foreground">
                              {initials(c.agency_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "truncate text-sm",
                                  c.unread > 0
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-foreground"
                                )}
                              >
                                {c.agency_name}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {timeLabel(c.last_at)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground/80">
                              Booking #{c.id.slice(0, 8)}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <p
                                className={cn(
                                  "truncate text-xs flex-1",
                                  c.unread > 0
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {c.last_preview || "No messages yet"}
                              </p>
                              {c.unread > 0 && (
                                <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#9FE870] px-1.5 text-[11px] font-semibold text-[#163300]">
                                  {c.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
                  counterpartyAvatarUrl={active.agency_avatar_url}
                  counterpartySubtitle={`Booking #${active.id.slice(0, 8)} · ${active.bike_name}`}
                  onBack={isMobile ? () => setActiveId(null) : undefined}
                  onRead={() => {
                    setConvs((prev) =>
                      prev.map((c) => (c.id === active.id ? { ...c, unread: 0 } : c))
                    );
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted/30 p-8">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
                      <MessageCircle className="h-9 w-9 text-foreground/70" />
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      Select a conversation
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pick a booking on the left to view your messages.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
