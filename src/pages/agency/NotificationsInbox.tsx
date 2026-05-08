import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

const NotificationsInbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
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
      .limit(100);
    setNotifs((data as Notif[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`agency-notifs-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
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

  const handleOpen = async (n: Notif) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    const target = n.action_url || n.link;
    if (target) {
      if (target.startsWith("/booking-history")) navigate("/agency/bookings");
      else if (target.startsWith("/billing")) navigate("/agency/finance#wallet");
      else if (target.startsWith("/inbox")) navigate("/agency/messages");
      else navigate(target);
    }
  };

  return (
    <div className="-mx-3 -mt-2">
      <header className="sticky top-16 z-20 flex items-center justify-between border-b border-border bg-agency-canvas/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => navigate("/agency/dashboard")}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground">Notifications</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={markAllRead}
          disabled={busy || unread === 0}
        >
          <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
        </Button>
      </header>

      <div className="divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Bell className="h-10 w-10" />
            <p className="text-sm">You&apos;re all caught up</p>
          </div>
        ) : (
          notifs.map((n) => (
            <button
              key={n.id}
              onClick={() => handleOpen(n)}
              className={cn(
                "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted",
                !n.is_read && "bg-primary/5"
              )}
            >
              <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-primary")} />
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium leading-tight text-foreground">{n.title}</p>
                {n.message && <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>}
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {n.is_read && <Check className="mt-1 h-3 w-3 text-muted-foreground" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsInbox;
