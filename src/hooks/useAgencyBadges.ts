import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

export interface AgencyBadgeCounts {
  pendingBookings: number;
  unreadMessages: number;
}

/**
 * Loads live counts for agency sidebar badges:
 *  - pendingBookings: bookings assigned to this agency with status = pending
 *  - unreadMessages : booking_messages on the agency's bookings sent by
 *                     someone else (renter/admin) and not yet read
 * Subscribes to realtime changes on both tables.
 */
export const useAgencyBadges = (): AgencyBadgeCounts & { refresh: () => void } => {
  const user = useAuthStore((s) => s.user);
  const [pendingBookings, setPending] = useState(0);
  const [unreadMessages, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setPending(0);
      setUnread(0);
      return;
    }

    // Pending bookings
    const { count: pCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to_business", user.id)
      .or("booking_status.eq.pending,status.eq.pending");
    setPending(pCount || 0);

    // Unread messages on this agency's bookings
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

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase.channel(`agency-badges-${user.id}`);
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      () => refresh()
    )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_messages" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  return { pendingBookings, unreadMessages, refresh };
};
