import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

export interface AgencyBadgeCounts {
  pendingBookings: number;
  unreadMessages: number;
}

export const useAgencyBadges = (): AgencyBadgeCounts & { refresh: () => void } => {
  const user = useAuthStore((s) => s.user);
  const [pendingBookings, setPending] = useState(0);
  const [unreadMessages, setUnread] = useState(0);
  const refreshRef = useRef<() => void>(() => {});

  const refresh = useCallback(async () => {
    if (!user) {
      setPending(0);
      setUnread(0);
      return;
    }

    const { count: pCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to_business", user.id)
      .or("booking_status.eq.pending,status.eq.pending");
    setPending(pCount || 0);

    const { data: bks } = await supabase
      .from("bookings")
      .select("id")
      .eq("assigned_to_business", user.id)
      .limit(1000);
    const ids = (bks || []).map((b: any) => b.id);
    if (ids.length === 0) {
      setUnread(0);
      return;
    }
    const { count: mCount } = await supabase
      .from("booking_messages")
      .select("id", { count: "exact", head: true })
      .in("booking_id", ids)
      .neq("sender_id", user.id)
      .is("read_at", null);
    setUnread(mCount || 0);
  }, [user]);

  // Keep latest refresh in ref so the realtime effect doesn't resubscribe
  useEffect(() => {
    refreshRef.current = refresh;
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`agency-badges-${user.id}-${Date.now()}`);
    ch.on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "bookings" },
      () => refreshRef.current?.()
    );
    ch.on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "booking_messages" },
      () => refreshRef.current?.()
    );
    ch.subscribe();
    const onManualRefresh = () => refreshRef.current?.();
    window.addEventListener("agency:badges:refresh", onManualRefresh);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("agency:badges:refresh", onManualRefresh);
    };
  }, [user]);

  return { pendingBookings, unreadMessages, refresh };
};
