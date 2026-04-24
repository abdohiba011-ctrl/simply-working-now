import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string | null;
  sender_role: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export function useBookingMessages(bookingId: string | undefined) {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("booking_messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        if (!error && data) setMessages(data as BookingMessage[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`booking-messages-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as BookingMessage;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const send = useCallback(
    async (body: string, senderRole: "renter" | "agency" | "admin") => {
      if (!bookingId || !body.trim()) return { error: "empty" };
      setSending(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("booking_messages").insert({
        booking_id: bookingId,
        sender_id: user?.id ?? null,
        sender_role: senderRole,
        body: body.trim(),
      });
      setSending(false);
      return { error: error?.message ?? null };
    },
    [bookingId]
  );

  return { messages, loading, sending, send };
}
