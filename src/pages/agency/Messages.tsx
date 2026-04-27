import { useEffect, useMemo, useRef, useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  MessageCircle,
  Search,
  Loader2,
  ChevronLeft,
  Send,
  ImagePlus,
  X,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBookingMessages } from "@/hooks/useBookingMessages";
import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StatusChip } from "@/components/shared/StatusChip";

interface Conv {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  pickup_date: string;
  return_date: string;
  booking_status: string | null;
  created_at: string;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const initials = (s: string | null | undefined) => {
  if (!s) return "?";
  return s
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const relTime = (iso: string | null) => {
  if (!iso) return "";
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: false });
  } catch {
    return "";
  }
};

const dayLabel = (d: Date) => {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
};

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showThreadMobile, setShowThreadMobile] = useState(false);

  const loadConvs = async () => {
    if (!user) return;
    setLoading(true);
    const { data: bks } = await supabase
      .from("bookings")
      .select(
        "id, customer_name, customer_email, pickup_date, return_date, booking_status, created_at"
      )
      .eq("assigned_to_business", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const list = (bks || []) as Omit<Conv, "last_message_body" | "last_message_at" | "unread_count">[];
    if (list.length === 0) {
      setConvs([]);
      setLoading(false);
      return;
    }
    const ids = list.map((b) => b.id);

    // Bulk-load latest message + unread counts
    const { data: msgs } = await supabase
      .from("booking_messages")
      .select("booking_id, body, created_at, sender_id, read_at")
      .in("booking_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);

    const lastByBooking = new Map<string, { body: string | null; created_at: string }>();
    const unreadByBooking = new Map<string, number>();
    (msgs || []).forEach((m) => {
      if (!lastByBooking.has(m.booking_id)) {
        lastByBooking.set(m.booking_id, { body: m.body, created_at: m.created_at });
      }
      if (m.sender_id !== user.id && !m.read_at) {
        unreadByBooking.set(m.booking_id, (unreadByBooking.get(m.booking_id) || 0) + 1);
      }
    });

    const enriched: Conv[] = list
      .map((b) => ({
        ...b,
        last_message_body: lastByBooking.get(b.id)?.body ?? null,
        last_message_at: lastByBooking.get(b.id)?.created_at ?? b.created_at,
        unread_count: unreadByBooking.get(b.id) || 0,
      }))
      .sort(
        (a, b) =>
          new Date(b.last_message_at || 0).getTime() -
          new Date(a.last_message_at || 0).getTime()
      );

    setConvs(enriched);
    if (!activeId) {
      const firstUnread = enriched.find((c) => c.unread_count > 0);
      setActiveId((firstUnread || enriched[0])?.id || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConvs();
    if (!user) return;
    const ch = supabase
      .channel(`agency-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_messages" },
        () => loadConvs()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    let list = convs;
    if (filter === "unread") list = list.filter((c) => c.unread_count > 0);
    else if (filter !== "all")
      list = list.filter((c) => (c.booking_status || "") === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.customer_name || "").toLowerCase().includes(q) ||
          (c.customer_email || "").toLowerCase().includes(q) ||
          (c.last_message_body || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [convs, filter, search]);

  const active = activeId ? convs.find((c) => c.id === activeId) || null : null;

  return (
    <AgencyLayout>
      <div className="mx-auto h-[calc(100vh-8rem)] max-w-7xl">
        <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card">
          {/* Conversation list */}
          <aside
            className={cn(
              "flex w-full shrink-0 flex-col border-r border-border md:w-[320px] lg:w-[360px]",
              showThreadMobile && "hidden md:flex"
            )}
          >
            <div className="space-y-2 border-b border-border p-3">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold tracking-tight">Messages</h1>
                {convs.reduce((s, c) => s + c.unread_count, 0) > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {convs.reduce((s, c) => s + c.unread_count, 0)} unread
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search renter or message…"
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                      filter === f.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={MessageCircle}
                    title={
                      convs.length === 0 ? "No conversations yet" : "Nothing matches"
                    }
                    description={
                      convs.length === 0
                        ? "Once a renter books one of your bikes, the chat will appear here."
                        : "Try a different filter or search term."
                    }
                  />
                </div>
              ) : (
                filtered.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveId(c.id);
                        setShowThreadMobile(true);
                      }}
                      className={cn(
                        "flex w-full gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted",
                        isActive && "bg-muted"
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(c.customer_name || c.customer_email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              c.unread_count > 0
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground"
                            )}
                          >
                            {c.customer_name || c.customer_email || "Renter"}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {relTime(c.last_message_at)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            c.unread_count > 0
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {c.last_message_body || "No messages yet — say hi"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {format(new Date(c.pickup_date), "MMM d")} →{" "}
                            {format(new Date(c.return_date), "MMM d")}
                          </span>
                          {c.unread_count > 0 && (
                            <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {c.unread_count}
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

          {/* Thread */}
          <section
            className={cn(
              "flex flex-1 flex-col",
              !showThreadMobile && "hidden md:flex"
            )}
          >
            {active ? (
              <ThreadPane
                conv={active}
                onBack={() => setShowThreadMobile(false)}
                onOpenBooking={() => navigate(`/agency/bookings/${active.id}`)}
                onAfterRead={() =>
                  setConvs((prev) =>
                    prev.map((c) =>
                      c.id === active.id ? { ...c, unread_count: 0 } : c
                    )
                  )
                }
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                  icon={MessageCircle}
                  title="Select a conversation"
                  description="Pick a booking on the left to view messages."
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </AgencyLayout>
  );
};

interface ThreadPaneProps {
  conv: Conv;
  onBack: () => void;
  onOpenBooking: () => void;
  onAfterRead: () => void;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ThreadPane = ({ conv, onBack, onOpenBooking, onAfterRead }: ThreadPaneProps) => {
  const { user } = useAuth();
  const { messages, sending, send } = useBookingMessages(conv.id);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // Mark inbound messages as read when viewing this thread
  useEffect(() => {
    if (!user) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at);
    if (unread.length === 0) return;
    void supabase
      .from("booking_messages")
      .update({ read_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((m) => m.id)
      )
      .then(() => onAfterRead());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, user]);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Only image files are allowed.");
    if (f.size > MAX_IMAGE_BYTES) return toast.error("Image too large (max 5MB).");
    setPendingFile(f);
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!pendingFile || !user) return null;
    setUploading(true);
    const ext = pendingFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${conv.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, pendingFile, { contentType: pendingFile.type });
    if (error) {
      setUploading(false);
      toast.error("Failed to upload image.");
      return null;
    }
    const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    setUploading(false);
    return data.publicUrl;
  };

  const handleSend = async () => {
    if (!draft.trim() && !pendingFile) return;
    let attachmentUrl: string | null = null;
    if (pendingFile) {
      attachmentUrl = await uploadAttachment();
      if (!attachmentUrl) return;
    }
    const { error } = await send(
      {
        body: draft.trim() || undefined,
        attachmentUrl: attachmentUrl ?? undefined,
        messageType: attachmentUrl ? "image" : "text",
      },
      "agency"
    );
    if (!error) {
      setDraft("");
      setPendingFile(null);
    } else {
      toast.error("Failed to send message.");
    }
  };

  // Group messages by day
  const grouped = useMemo(() => {
    const groups: { day: string; items: typeof messages }[] = [];
    messages.forEach((m) => {
      const d = new Date(m.created_at);
      const label = dayLabel(d);
      const last = groups[groups.length - 1];
      if (!last || last.day !== label) groups.push({ day: label, items: [m] });
      else last.items.push(m);
    });
    return groups;
  }, [messages]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted md:hidden"
          aria-label="Back to conversations"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(conv.customer_name || conv.customer_email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {conv.customer_name || conv.customer_email || "Renter"}
            </span>
            <StatusChip status={conv.booking_status || "pending"} />
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(conv.pickup_date), "MMM d")} →{" "}
            {format(new Date(conv.return_date), "MMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenBooking} className="gap-1">
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open booking</span>
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet — say hi to get the conversation started.
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.day} className="space-y-2">
              <div className="sticky top-0 z-10 mx-auto w-fit rounded-full bg-background/90 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm">
                {g.day}
              </div>
              {g.items.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col max-w-[75%]",
                      mine ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words space-y-2 shadow-sm",
                        mine
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-background border border-border text-foreground",
                        m.flagged && "ring-2 ring-destructive/60"
                      )}
                    >
                      {m.attachment_url && (
                        <a
                          href={m.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <img
                            src={m.attachment_url}
                            alt=""
                            className="max-h-[240px] max-w-[260px] rounded-md object-cover"
                            loading="lazy"
                          />
                        </a>
                      )}
                      {m.body && <div>{m.body}</div>}
                    </div>
                    <span className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(m.created_at), "HH:mm")}
                      {mine && m.read_at && " · Read"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="space-y-2 border-t border-border bg-background p-3">
        <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 px-2 py-1.5 text-[11px] text-foreground">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
          <span>
            Keep all conversation on Motonita. Sharing contact info or off-platform payment
            is flagged automatically.
          </span>
        </div>

        {pendingPreview && (
          <div className="relative inline-block">
            <img
              src={pendingPreview}
              alt="To send"
              className="max-h-28 rounded-md border border-border"
            />
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="absolute -top-2 -right-2 rounded-full border border-border bg-background p-1 shadow-sm hover:bg-muted"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFilePick}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            aria-label="Attach photo"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            rows={1}
            className="min-h-[40px] flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || uploading || (!draft.trim() && !pendingFile)}
            size="icon"
          >
            {sending || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default Messages;
