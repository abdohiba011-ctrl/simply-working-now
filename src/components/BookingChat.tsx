import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBookingMessages } from "@/hooks/useBookingMessages";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ShieldAlert, Loader2, ImagePlus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookingChatProps {
  bookingId: string;
  viewerRole: "renter" | "agency" | "admin";
  title?: string;
  className?: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const BookingChat = ({
  bookingId,
  viewerRole,
  title = "Message the agency",
  className,
}: BookingChatProps) => {
  const { user } = useAuth();
  const { messages, loading, sending, send } = useBookingMessages(bookingId);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

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
    if (!f.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large (max 5MB).");
      return;
    }
    setPendingFile(f);
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!pendingFile || !user) return null;
    setUploading(true);
    const ext = pendingFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, pendingFile, { contentType: pendingFile.type });
    if (error) {
      setUploading(false);
      toast.error("Failed to upload image. Please try again.");
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
      viewerRole
    );
    if (!error) {
      setDraft("");
      setPendingFile(null);
    } else {
      toast.error("Failed to send message.");
    }
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
          className="h-80 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 space-y-2"
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
              const isFlaggedByMe = mine && m.flagged;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    mine ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words space-y-2",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border text-foreground",
                      m.flagged && "ring-2 ring-destructive/60"
                    )}
                  >
                    {m.attachment_url && (
                      <a href={m.attachment_url} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={m.attachment_url}
                          alt="Attachment"
                          className="max-w-[240px] max-h-[240px] rounded-md object-cover"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {m.body && <div>{m.body}</div>}
                  </div>

                  {isFlaggedByMe && (
                    <div className="mt-1 flex items-start gap-1.5 rounded-md bg-destructive/10 border border-destructive/30 px-2 py-1 text-[11px] text-destructive max-w-full">
                      <ShieldAlert className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Your message was flagged for{" "}
                        <strong>{(m.flag_reasons || []).join(", ").replace(/_/g, " ") || "off-platform content"}</strong>.
                        Please keep all communication, contact info exchange and payment inside Motonita.
                      </span>
                    </div>
                  )}

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

        {pendingPreview && (
          <div className="relative inline-block">
            <img
              src={pendingPreview}
              alt="To send"
              className="max-h-32 rounded-md border border-border"
            />
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="absolute -top-2 -right-2 rounded-full bg-background border border-border p-1 shadow-sm hover:bg-muted"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
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
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            aria-label="Attach photo"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
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
          <Button
            onClick={handleSend}
            disabled={sending || uploading || (!draft.trim() && !pendingFile)}
            size="lg"
          >
            {sending || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
