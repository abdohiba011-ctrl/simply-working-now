import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import {
  Search, Star, MoreVertical, Phone, Send, Paperclip, Smile, AlertTriangle,
  MessageCircle, Archive, BellOff, Ban, Flag, ChevronLeft, ExternalLink,
} from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  agencyConversations, agencyMessages, agencyCustomers,
  AgencyConversation, AgencyMessage, findCustomer,
} from "@/data/agencyMockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FilterKey = "all" | "unread" | "starred" | "pending" | "archived";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "starred", label: "Starred" },
  { key: "pending", label: "Pending bookings" },
  { key: "archived", label: "Archived" },
];

const QUICK_REPLIES = [
  "Yes, available",
  "What time works for pickup?",
  "Price confirmed",
  "Here's the address",
];

const MODERATION_PATTERNS: { name: string; regex: RegExp; label: string }[] = [
  { name: "phone-number", regex: /(?:\+?\d{1,3}[\s-]?)?(?:0?[67])\d{8}|(?:\+?\d{1,3}[\s-]?)?\d{9,12}/, label: "Phone number" },
  { name: "whatsapp", regex: /wa\.me|whats?app|واتساب/i, label: "WhatsApp" },
  { name: "email", regex: /[\w.+-]+@[\w-]+\.[\w.-]+/, label: "Email address" },
  { name: "bank-transfer", regex: /\b(virement|transfer|iban|swift|bic)\b/i, label: "Bank transfer" },
  { name: "off-platform-payment", regex: /\b(pay\s*cash|cash\s*payment|espèces|نقدًا|en main propre)\b/i, label: "Off-platform payment" },
];

const detectFlags = (text: string) => MODERATION_PATTERNS.filter((p) => p.regex.test(text));

const dateLabel = (d: Date) => {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
};

const Messages = () => {
  const navigate = useNavigate();
  const [convs, setConvs] = useState<AgencyConversation[]>(agencyConversations);
  const [msgs, setMsgs] = useState<AgencyMessage[]>(agencyMessages);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(convs[0]?.id || null);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return convs.filter((c) => {
      if (filter === "unread" && c.unread === 0) return false;
      if (filter === "starred" && !c.starred) return false;
      if (filter === "archived" && !c.archived) return false;
      if (filter === "pending" && !c.bookingId) return false;
      if (filter !== "archived" && c.archived) return false;
      if (search) {
        const cust = findCustomer(c.customerId);
        const hay = `${cust?.name || ""} ${c.lastMessage}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [convs, filter, search]);

  const active = convs.find((c) => c.id === activeId);
  const activeCustomer = active ? findCustomer(active.customerId) : null;
  const thread = useMemo(() => msgs.filter((m) => m.conversationId === activeId), [msgs, activeId]);

  // Mark read on open
  useEffect(() => {
    if (!activeId) return;
    setConvs((cur) => cur.map((c) => c.id === activeId ? { ...c, unread: 0 } : c));
    setMsgs((cur) => cur.map((m) => m.conversationId === activeId ? { ...m, read: true } : m));
  }, [activeId]);

  // Scroll to bottom on new
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length, activeId]);

  const liveFlags = detectFlags(draft);
  const lastFromCustomer = thread.filter((m) => m.fromCustomer).slice(-1)[0];
  const conversationFlagged = !!(active?.flagged) || (lastFromCustomer && lastFromCustomer.flagged);

  const send = () => {
    if (!draft.trim() || !active) return;
    const newMsg: AgencyMessage = {
      id: `m${Date.now()}`,
      conversationId: active.id,
      fromCustomer: false,
      text: draft.trim(),
      at: new Date().toISOString(),
      read: true,
    };
    setMsgs((cur) => [...cur, newMsg]);
    setConvs((cur) => cur.map((c) => c.id === active.id ? { ...c, lastMessage: draft.trim(), lastAt: new Date().toISOString() } : c));
    setDraft("");
  };

  const action = (label: string) => toast.success(label);

  // Group messages by date
  const grouped = useMemo(() => {
    const out: { date: Date; items: AgencyMessage[] }[] = [];
    thread.forEach((m) => {
      const d = parseISO(m.at);
      const last = out[out.length - 1];
      if (last && format(last.date, "yyyy-MM-dd") === format(d, "yyyy-MM-dd")) last.items.push(m);
      else out.push({ date: d, items: [m] });
    });
    return out;
  }, [thread]);

  return (
    <AgencyLayout>
      <div className="mx-auto -mx-4 lg:-mx-8">
        <Card className="overflow-hidden h-[calc(100vh-7rem)] grid grid-cols-1 lg:grid-cols-[minmax(320px,30%)_1fr]">
          {/* LEFT: list */}
          <div className={cn("flex h-full min-w-0 flex-col border-r border-border", activeId && "hidden lg:flex")}>
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" className="pl-9" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button key={f.key} onClick={() => setFilter(f.key)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", filter === f.key ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted")}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <EmptyState icon={MessageCircle} title="No conversations" description="Try a different filter or wait for new messages." />
              ) : filtered.map((c) => {
                const cust = findCustomer(c.customerId);
                const isActive = c.id === activeId;
                return (
                  <button key={c.id} onClick={() => setActiveId(c.id)} className={cn("flex w-full gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-muted/50", isActive && "bg-primary/10 hover:bg-primary/15")}>
                    <div className="relative shrink-0">
                      <img src={cust?.avatar} alt="" className="h-10 w-10 rounded-full" />
                      {c.unread > 0 && <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{c.unread}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{cust?.name}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{formatDistanceToNow(parseISO(c.lastAt), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {c.starred && <Star className="h-3 w-3 fill-warning text-warning shrink-0" />}
                        {c.flagged && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                        <p className={cn("truncate text-xs", c.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>{c.lastMessage}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: thread */}
          <div className={cn("flex h-full min-w-0 flex-col", !activeId && "hidden lg:flex")}>
            {!active ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState icon={MessageCircle} title="Select a conversation to start messaging" description="When renters book your bikes, they'll appear here." />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border bg-background/50 px-4 py-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setActiveId(null)}><ChevronLeft className="h-4 w-4" /></Button>
                  <img src={activeCustomer?.avatar} alt="" className="h-9 w-9 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{activeCustomer?.name}</p>
                    <p className="truncate text-xs text-muted-foreground inline-flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {activeCustomer?.phone}
                      {active.bookingId && (
                        <>
                          <span>·</span>
                          <button onClick={() => navigate(`/agency/bookings/${active.bookingId}`)} className="inline-flex items-center gap-0.5 text-primary hover:underline">
                            View booking <ExternalLink className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setConvs((c) => c.map((x) => x.id === active.id ? { ...x, starred: !x.starred } : x)); action(active.starred ? "Unstarred" : "Starred"); }}>
                        <Star className="mr-2 h-4 w-4" /> {active.starred ? "Unstar" : "Star"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => action("Muted")}><BellOff className="mr-2 h-4 w-4" /> Mute</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setConvs((c) => c.map((x) => x.id === active.id ? { ...x, archived: !x.archived } : x)); action(active.archived ? "Unarchived" : "Archived"); }}>
                        <Archive className="mr-2 h-4 w-4" /> {active.archived ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => action("User blocked")}><Ban className="mr-2 h-4 w-4" /> Block</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => action("Reported to admin")}><Flag className="mr-2 h-4 w-4" /> Report</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Moderation banner */}
                {conversationFlagged && (
                  <div className="flex items-start gap-3 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Motonita detected potential off-platform communication</p>
                      <p className="mt-0.5 text-xs text-destructive/90">Completing bookings outside the app violates our Terms and may result in account suspension. This conversation has been logged for review.</p>
                    </div>
                  </div>
                )}

                {/* Thread */}
                <div ref={threadRef} className="flex-1 overflow-y-auto bg-muted/20 px-4 py-4">
                  {grouped.map(({ date, items }) => (
                    <div key={date.toISOString()}>
                      <div className="my-4 flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{dateLabel(date)}</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      {items.map((m) => (
                        <div key={m.id} className={cn("mb-2 flex", m.fromCustomer ? "justify-start" : "justify-end")}>
                          <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                            m.fromCustomer ? "bg-card border border-border" : "bg-primary text-primary-foreground",
                            m.flagged && "ring-2 ring-destructive/40")}>
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            <div className={cn("mt-1 flex items-center gap-1 text-[10px]", m.fromCustomer ? "text-muted-foreground" : "text-primary-foreground/80")}>
                              {format(parseISO(m.at), "HH:mm")}
                              {!m.fromCustomer && <span>· {m.read ? "Read" : "Sent"}</span>}
                              {m.flagged && (
                                <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-destructive/20 px-1.5 py-0.5 font-medium text-destructive">
                                  <AlertTriangle className="h-2.5 w-2.5" /> flagged
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Quick replies */}
                <div className="border-t border-border bg-background px-4 pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.map((q) => (
                      <button key={q} onClick={() => setDraft(q)} className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-muted">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live moderation hint */}
                {liveFlags.length > 0 && (
                  <div className="border-t border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning inline-flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Detected: {liveFlags.map((f) => f.label).join(", ")}. Sharing this may violate Motonita's Terms.</span>
                  </div>
                )}

                {/* Compose */}
                <div className="flex items-end gap-2 border-t border-border bg-background p-3">
                  <Button variant="ghost" size="icon" onClick={() => action("Attach file")}><Paperclip className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => action("Open emoji")}><Smile className="h-4 w-4" /></Button>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Type a message…"
                    rows={1}
                    className="min-h-[40px] max-h-32 flex-1 resize-none"
                  />
                  <Button onClick={send} disabled={!draft.trim()} className="gap-1"><Send className="h-4 w-4" /> Send</Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default Messages;
