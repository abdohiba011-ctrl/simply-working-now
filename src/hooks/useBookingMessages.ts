import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string | null;
  sender_role: string;
  body: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_mime: string | null;
  message_type: string;
  flagged: boolean;
  flag_reasons: string[] | null;
  read_at: string | null;
  created_at: string;
}

export interface SendMessageInput {
  body?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  messageType?: "text" | "image" | "file";
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
        if (!error && data) setMessages(data as unknown as BookingMessage[]);
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
            const next = payload.new as unknown as BookingMessage;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "booking_messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as BookingMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const send = useCallback(
    async (
      input: string | SendMessageInput,
      senderRole: "renter" | "agency" | "admin"
    ) => {
      if (!bookingId) return { error: "no_booking", message: null as BookingMessage | null };
      const payload: SendMessageInput =
        typeof input === "string" ? { body: input, messageType: "text" } : input;

      const body = payload.body?.trim() ?? "";
      const attachmentUrl = payload.attachmentUrl ?? null;
      if (!body && !attachmentUrl) return { error: "empty", message: null };

      setSending(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const inferredType =
        payload.messageType ??
        (attachmentUrl
          ? payload.attachmentMime?.startsWith("image/")
            ? "image"
            : "file"
          : "text");
      const { data, error } = await supabase
        .from("booking_messages")
        .insert({
          booking_id: bookingId,
          sender_id: user?.id ?? null,
          sender_role: senderRole,
          body: body || null,
          attachment_url: attachmentUrl,
          attachment_name: payload.attachmentName ?? null,
          attachment_size: payload.attachmentSize ?? null,
          attachment_mime: payload.attachmentMime ?? null,
          message_type: inferredType,
        } as never)
        .select("*")
        .single();
      setSending(false);
      return {
        error: error?.message ?? null,
        message: (data as unknown as BookingMessage) ?? null,
      };
    },
    [bookingId]
  );

  return { messages, loading, sending, send };
}
