import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, MessageSquare, Loader2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface BookingMessage {
  id: string;
  booking_id: string;
  sender_role: string;
  sender_id: string | null;
  body: string | null;
  message_type: string;
  attachment_url: string | null;
  flagged: boolean;
  flag_reasons: string[] | null;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  phone_number: "Phone number shared",
  off_platform_messenger: "Off-platform messenger (WhatsApp / Telegram)",
  off_platform_payment: "Off-platform payment request",
};

interface BookingMessagesCardProps {
  bookingId: string;
}

export const BookingMessagesCard = ({ bookingId }: BookingMessagesCardProps) => {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_messages")
      .select("id,booking_id,sender_role,sender_id,body,message_type,attachment_url,flagged,flag_reasons,created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    if (!error) setMessages((data as BookingMessage[]) || []);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`admin-bm-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_messages", filter: `booking_id=eq.${bookingId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, load]);

  const flagged = messages.filter((m) => m.flagged);
  const allReasons = Array.from(
    new Set(flagged.flatMap((m) => m.flag_reasons || []))
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Conversation
              <Badge variant="outline" className="text-xs ml-1">{messages.length}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Read-only view of messages exchanged between renter and agency.
            </CardDescription>
          </div>
          {flagged.length > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
              <ShieldAlert className="h-3 w-3 mr-1" />
              {flagged.length} flagged
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {flagged.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Policy violations detected
            </div>
            <ul className="text-xs text-destructive/90 list-disc pl-5 space-y-0.5">
              {allReasons.map((r) => (
                <li key={r}>{REASON_LABELS[r] || r}</li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          <ScrollArea className="h-[360px] pr-3">
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg border p-3 text-sm ${
                    m.flagged
                      ? "border-destructive/30 bg-destructive/5"
                      : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className="capitalize text-xs">
                      {m.sender_role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(m.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.attachment_url && (
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline text-primary mt-2 inline-block"
                    >
                      View attachment
                    </a>
                  )}
                  {m.flagged && m.flag_reasons && m.flag_reasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.flag_reasons.map((r) => (
                        <Badge
                          key={r}
                          variant="outline"
                          className="text-[10px] bg-destructive/10 text-destructive border-destructive/20"
                        >
                          {REASON_LABELS[r] || r}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
