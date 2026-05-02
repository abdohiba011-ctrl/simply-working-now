import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBookingMessages, type BookingMessage } from "@/hooks/useBookingMessages";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Paperclip,
  Send,
  X,
  Loader2,
  ShieldAlert,
  Check,
  CheckCheck,
  FileText,
  Download,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 5;
const ACCEPTED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_FILE = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface ChatThreadProps {
  bookingId: string;
  viewerRole: "renter" | "agency" | "admin";
  counterpartyName: string;
  counterpartySubtitle?: string;
  onBack?: () => void;
  className?: string;
}

const initials = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const dayLabel = (d: Date) => {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
};

const formatBytes = (b: number | null) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

interface PendingAttachment {
  file: File;
  previewUrl?: string;
}

export const ChatThread = ({
  bookingId,
  viewerRole,
  counterpartyName,
  counterpartySubtitle,
  onBack,
  className,
}: ChatThreadProps) => {
  const { user } = useAuth();
  const { messages, loading, sending, send } = useBookingMessages(bookingId);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 4 + 16;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, [draft]);

  // Mark inbound as read
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
      );
  }, [messages, user]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const slots = MAX_FILES - pending.length;
    if (slots <= 0) {
      toast.error(`Maximum ${MAX_FILES} attachments per message.`);
      return;
    }
    const accepted: PendingAttachment[] = [];
    for (const f of files.slice(0, slots)) {
      const isImage = ACCEPTED_IMAGE.includes(f.type);
      const isFile = ACCEPTED_FILE.includes(f.type);
      if (!isImage && !isFile) {
        toast.error(`${f.name}: file type not allowed.`);
        continue;
      }
      if (isImage && f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: too large. Maximum size is 10 MB for images.`);
        continue;
      }
      if (isFile && f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name}: too large. Maximum size is 25 MB for files.`);
        continue;
      }
      accepted.push({
        file: f,
        previewUrl: isImage ? URL.createObjectURL(f) : undefined,
      });
    }
    setPending((p) => [...p, ...accepted]);
  };

  const removePending = (idx: number) => {
    setPending((p) => {
      const removed = p[idx];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return p.filter((_, i) => i !== idx);
    });
  };

  const uploadOne = async (
    f: File
  ): Promise<{ url: string; mime: string; size: number; name: string } | null> => {
    if (!user) return null;
    const safeName = f.name.replace(/[^\w.\-]+/g, "_");
    const path = `${bookingId}/${user.id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, f, { contentType: f.type, upsert: false });
    if (error) {
      toast.error(`Upload failed for ${f.name}.`);
      return null;
    }
    const { data: signed } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (!signed?.signedUrl) {
      toast.error(`Could not get URL for ${f.name}.`);
      return null;
    }
    return { url: signed.signedUrl, mime: f.type, size: f.size, name: f.name };
  };

  const handleSend = async () => {
    if (!draft.trim() && pending.length === 0) return;
    setUploading(true);
    try {
      if (pending.length === 0) {
        const { error } = await send({ body: draft.trim(), messageType: "text" }, viewerRole);
        if (error) return toast.error("Failed to send message.");
        setDraft("");
        return;
      }
      // Upload each attachment, send each as its own message; first carries caption
      let captionUsed = false;
      for (const p of pending) {
        const up = await uploadOne(p.file);
        if (!up) continue;
        const isImage = up.mime.startsWith("image/");
        const { error } = await send(
          {
            body: !captionUsed ? draft.trim() || undefined : undefined,
            attachmentUrl: up.url,
            attachmentName: up.name,
            attachmentSize: up.size,
            attachmentMime: up.mime,
            messageType: isImage ? "image" : "file",
          },
          viewerRole
        );
        if (error) {
          toast.error(`Failed to send ${up.name}.`);
          continue;
        }
        captionUsed = true;
      }
      setDraft("");
      pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      setPending([]);
    } finally {
      setUploading(false);
    }
  };

  // Group messages with day separators and consecutive-from-same-sender flag
  const grouped = useMemo(() => {
    const out: Array<
      | { kind: "day"; label: string; key: string }
      | { kind: "msg"; m: BookingMessage; showAvatar: boolean; key: string }
    > = [];
    let lastDay = "";
    let lastSender: string | null | undefined = undefined;
    messages.forEach((m, i) => {
      const d = new Date(m.created_at);
      const label = dayLabel(d);
      if (label !== lastDay) {
        out.push({ kind: "day", label, key: `day-${i}` });
        lastDay = label;
        lastSender = undefined;
      }
      const next = messages[i + 1];
      const nextSameSender = next && next.sender_id === m.sender_id;
      // showAvatar = last in a consecutive group from this sender
      const showAvatar = !nextSameSender;
      out.push({ kind: "msg", m, showAvatar, key: m.id });
      lastSender = m.sender_id;
    });
    return out;
  }, [messages]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-4">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted md:hidden"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-foreground">
            {initials(counterpartyName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{counterpartyName}</p>
          {counterpartySubtitle && (
            <p className="truncate text-xs text-muted-foreground">{counterpartySubtitle}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto bg-[#FAFAFA] px-3 py-4 sm:px-6"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            No messages yet — say hi to get the conversation started.
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-1">
            {grouped.map((g) => {
              if (g.kind === "day") {
                return (
                  <div key={g.key} className="my-3 flex justify-center">
                    <span className="rounded-full bg-[#E8E8E8] px-3 py-1 text-[11px] font-medium text-[#666]">
                      {g.label}
                    </span>
                  </div>
                );
              }
              const m = g.m;
              const mine = m.sender_id === user?.id;
              const isImage = m.attachment_url && (m.message_type === "image" || m.attachment_mime?.startsWith("image/"));
              const isFile = m.attachment_url && !isImage;
              return (
                <div
                  key={g.key}
                  className={cn(
                    "flex items-end gap-2",
                    mine ? "justify-end" : "justify-start"
                  )}
                >
                  {!mine && (
                    <div className="w-7 shrink-0">
                      {g.showAvatar && (
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-foreground">
                            {initials(counterpartyName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "group max-w-[78%] sm:max-w-[70%]",
                      mine ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "flex flex-col gap-1 px-3 py-2 text-sm shadow-sm",
                        mine
                          ? "rounded-2xl rounded-br-sm bg-[#9FE870] text-[#163300]"
                          : "rounded-2xl rounded-bl-sm bg-[#F0F0F0] text-[#163300]",
                        m.flagged && "ring-2 ring-destructive/60"
                      )}
                    >
                      {isImage && (
                        <button
                          type="button"
                          onClick={() => setLightbox(m.attachment_url!)}
                          className="block overflow-hidden rounded-lg"
                        >
                          <img
                            src={m.attachment_url!}
                            alt={m.attachment_name || "Image"}
                            className="max-h-[280px] w-full max-w-[200px] rounded-lg object-cover sm:max-w-[280px]"
                            loading="lazy"
                          />
                        </button>
                      )}
                      {isFile && (
                        <a
                          href={m.attachment_url!}
                          target="_blank"
                          rel="noreferrer"
                          download={m.attachment_name || undefined}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors",
                            mine
                              ? "border-[#163300]/20 bg-white/40 hover:bg-white/60"
                              : "border-[#163300]/10 bg-white hover:bg-white/80"
                          )}
                        >
                          <FileText className="h-5 w-5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {m.attachment_name || "File"}
                            </p>
                            <p className="text-[10px] opacity-70">
                              {formatBytes(m.attachment_size)}
                            </p>
                          </div>
                          <Download className="h-4 w-4 shrink-0 opacity-70" />
                        </a>
                      )}
                      {m.body && (
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                      <div
                        className={cn(
                          "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                          mine ? "text-[#163300]/60" : "text-[#999]"
                        )}
                      >
                        <span>{format(new Date(m.created_at), "h:mm a")}</span>
                        {mine && (
                          m.read_at ? (
                            <CheckCheck className="h-3 w-3 text-[#3B82F6]" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )
                        )}
                      </div>
                    </div>
                    {mine && m.flagged && (
                      <div className="mt-1 flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                        <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          Flagged: keep all communication on Motonita.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-[#E0E0E0] bg-white px-3 py-2 sm:px-4 sm:py-3">
        {pending.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pending.map((p, i) => (
              <div
                key={i}
                className="relative flex items-center gap-2 rounded-md border border-[#E0E0E0] bg-[#FAFAFA] p-1.5 pr-7"
              >
                {p.previewUrl ? (
                  <img
                    src={p.previewUrl}
                    alt={p.file.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-white">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="max-w-[140px]">
                  <p className="truncate text-xs font-medium text-foreground">{p.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatBytes(p.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removePending(i)}
                  className="absolute right-1 top-1 rounded-full bg-white p-0.5 shadow-sm hover:bg-muted"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={[...ACCEPTED_IMAGE, ...ACCEPTED_FILE].join(",")}
            onChange={handleFilePick}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            aria-label="Attach"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            rows={1}
            className="min-h-[40px] flex-1 resize-none rounded-2xl border-[#E0E0E0] bg-[#FAFAFA] px-4 py-2 text-sm focus-visible:border-[#9FE870] focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || uploading || (!draft.trim() && pending.length === 0)}
            className="h-10 w-10 shrink-0 rounded-full bg-[#9FE870] p-0 text-[#163300] hover:bg-[#8FD862] disabled:opacity-50"
            aria-label="Send"
          >
            {sending || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
