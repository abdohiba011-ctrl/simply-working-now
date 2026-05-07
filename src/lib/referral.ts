// Referral helpers — captures ?ref=CODE through signup and claims it after auth.
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "motonita_pending_ref";

export function captureRefFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^[A-Z0-9]{4,12}$/i.test(ref.trim())) {
      sessionStorage.setItem(STORAGE_KEY, ref.trim().toUpperCase());
    }
  } catch {
    /* ignore */
  }
}

export function getPendingRef(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingRef(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Claims a pending referral code for the currently authenticated user.
 * Safe to call multiple times — duplicates are rejected by the DB.
 */
export async function claimPendingReferral(): Promise<void> {
  const code = getPendingRef();
  if (!code) return;
  try {
    const { data, error } = await supabase.rpc("claim_referral", { _code: code });
    if (error) {
      console.warn("[referral] claim failed", error.message);
      return;
    }
    const result = data as { ok?: boolean; reason?: string } | null;
    if (result?.ok || result?.reason === "already_referred" || result?.reason === "self_referral") {
      clearPendingRef();
    }
  } catch (e) {
    console.warn("[referral] claim threw", e);
  }
}

export interface ReferralStats {
  invited: number;
  signedUp: number;
  booked: number;
  completed: number;
  approvedBalanceMad: number;
  paidTotalMad: number;
}

export async function fetchReferralStats(userId: string): Promise<ReferralStats> {
  const { data, error } = await supabase
    .from("referrals")
    .select("status, reward_amount_mad")
    .eq("referrer_id", userId);

  if (error || !data) {
    return { invited: 0, signedUp: 0, booked: 0, completed: 0, approvedBalanceMad: 0, paidTotalMad: 0 };
  }
  let signedUp = 0, booked = 0, completed = 0, approved = 0, paid = 0;
  for (const r of data) {
    const s = r.status as string;
    if (["signed_up", "booked", "completed", "approved", "paid"].includes(s)) signedUp++;
    if (["booked", "completed", "approved", "paid"].includes(s)) booked++;
    if (["completed", "approved", "paid"].includes(s)) completed++;
    if (s === "approved") approved += Number(r.reward_amount_mad) || 0;
    if (s === "paid") paid += Number(r.reward_amount_mad) || 0;
  }
  return {
    invited: data.length,
    signedUp,
    booked,
    completed,
    approvedBalanceMad: approved,
    paidTotalMad: paid,
  };
}
