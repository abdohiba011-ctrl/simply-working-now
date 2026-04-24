import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  body: string;
  sender_id: string | null;
  sender_role: string;
  created_at: string;
}

interface BookingLite {
  id: string;
  user_id: string | null;
  assigned_to_business: string | null;
  customer_name: string | null;
  booking_status: string | null;
}

export default function BookingChat() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingLite | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load booking + messages
  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const { data: b } = await supabase
        .from("bookings")
        .select("id, user_id, assigned_to_business, customer_name, booking_status")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      setBooking(b as BookingLite | null);

      const { data: m } = await supabase
        .from("booking_messages")
        .select("*")
        .eq("booking_id", id)
        .order("created_at");
      if (active) {
        setMessages((m || []) as Message[]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`chat-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "booking_messages",
        filter: `booking_id=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.find((p) => p.id === (payload.new as any).id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const isRenter = user?.id === booking?.user_id;
  const isAgency = user?.id === booking?.assigned_to_business;
  const role = isRenter ? "renter" : isAgency ? "agency" : "viewer";

  // Detect contact-share violations (educational, soft block)
  const violation = (text: string) => {
    const lower = text.toLowerCase();
    return /\b\d{9,}\b/.test(text) || /whats?app|wa\.me|telegram/.test(lower) ||
      /\b(0[5-7])[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/.test(text);
  };
  const violates = body && violation(body);

  const send = async () => {
    if (!body.trim() || !user || !booking || sending) return;
    setSending(true);
    const { error } = await supabase.from("booking_messages").insert({
      booking_id: booking.id,
      sender_id: user.id,
      sender_role: role,
      body: body.trim(),
    });
    setSending(false);
    if (!error) setBody("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md p-12 text-center">
          <p className="text-muted-foreground">Conversation not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/booking-history">Back to bookings</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/booking-history"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            Booking #{String(booking.id).slice(0, 8).toUpperCase()} · {booking.booking_status}
          </div>
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No messages yet. Say hello to coordinate pickup.
              </div>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {format(new Date(m.created_at), "HH:mm")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t p-3">
            {violates && (
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-orange-600">
                <ShieldAlert className="h-3 w-3" />
                Phone numbers and external messaging links are not allowed. Please keep conversations on Motonita.
              </div>
            )}
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); send(); }}
            >
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message…"
                disabled={sending}
              />
              <Button type="submit" disabled={!body.trim() || sending} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </main>
    </div>
  );
}
