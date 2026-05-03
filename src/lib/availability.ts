import { startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type Availability = "available" | "unavailable" | "loading" | "idle";

export async function checkBikeAvailability(
  bikeId: string,
  fromDate: Date | undefined | null,
  toDate: Date | undefined | null,
): Promise<boolean> {
  if (!bikeId || !fromDate || !toDate) return false;

  const today = startOfDay(new Date());
  if (fromDate < today) return false;
  if (toDate < fromDate) return false;

  const { data, error } = await supabase.rpc("get_booked_date_ranges", {
    _bike_id: bikeId,
  });

  if (error) {
    console.error("availability check failed:", error);
    return false;
  }

  const requestedFrom = startOfDay(fromDate).getTime();
  const requestedTo = startOfDay(toDate).getTime();

  for (const range of (data as { pickup_date: string; return_date: string }[]) || []) {
    const bookedFrom = startOfDay(new Date(range.pickup_date)).getTime();
    const bookedTo = startOfDay(new Date(range.return_date)).getTime();
    // Half-open overlap: [pickup, return) — same convention as DB conflict check
    if (requestedFrom < bookedTo && requestedTo > bookedFrom) {
      return false;
    }
  }

  return true;
}
