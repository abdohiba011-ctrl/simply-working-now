import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBookingMessages } from "@/hooks/useBookingMessages";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ShieldAlert, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BookingChatProps {
  bookingId: string;
  /** Who the current viewer is in the conversation. */
  viewerRole: "renter" | "agency" | "admin";
  title?: string;
  className?: string;
}

export const BookingChat = ({
  bookingId,
  viewerRole,
  title = "Message the agency",
  className,
}: BookingChatProps) => {
  const { user } = useAuth();
  const { messages, loading, sending, send } = useBookingMessages(bookingId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    const { error } = await send(draft, viewerRole);
    if (!error) setDraft("");
  };

  return (
    <Card className={cn("border-2 border-primary/20", className)}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>

        <div
          ref={scrollRef}
          className="h-72 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 space-y-2"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Say hi to get the conversation started.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={cn("flex flex-col max-w-[80%]", mine ? "ml-auto items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border text-foreground"
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {m.sender_role} · {format(new Date(m.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 p-2 text-xs text-yellow-800 dark:text-yellow-300">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Keep all communication on Motonita. Sharing phone numbers, WhatsApp, or off-platform
            payment requests is not allowed and will be flagged.
          </span>
        </div>

        <div className="flex gap-2 items-end">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message…"
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} disabled={sending || !draft.trim()} size="lg">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
