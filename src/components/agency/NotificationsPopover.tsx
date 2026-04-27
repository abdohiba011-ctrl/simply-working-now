import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  link: string | null;
  action_url: string | null;
  created_at: string;
}

export const NotificationsPopover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const unread = notifs.filter((n) => !n.is_read).length;

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, link, action_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    setNotifs((data as Notif[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`agency-notifs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    setBusy(true);
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setBusy(false);
  };

  const handleOpenItem = async (n: Notif) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    const target = n.action_url || n.link;
    if (target) {
      // Keep agency users inside agency. Translate generic links to agency equivalents when possible.
      if (target.startsWith("/booking-history")) navigate("/agency/bookings");
      else if (target.startsWith("/billing")) navigate("/agency/finance#wallet");
      else if (target.startsWith("/inbox")) navigate("/agency/messages");
      else navigate(target);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={markAllRead}
            disabled={busy || unread === 0}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Bell className="h-8 w-8" />
              <p className="text-sm">You&apos;re all caught up</p>
            </div>
          ) : (
            notifs.map((n) => (
              <button
                key={n.id}
                onClick={() => handleOpenItem(n)}
                className={cn(
                  "flex w-full gap-3 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted",
                  !n.is_read && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    n.is_read ? "bg-transparent" : "bg-primary"
                  )}
                />
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium leading-tight text-foreground">
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {n.is_read && <Check className="mt-1 h-3 w-3 text-muted-foreground" />}
              </button>
            ))
          )}
        </div>
        <div className="border-t px-3 py-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => {
              setOpen(false);
              navigate("/agency/settings#notifications");
            }}
          >
            View all & settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
