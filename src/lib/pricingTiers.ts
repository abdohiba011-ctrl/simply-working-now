// Shared helpers for the per-bike tiered pricing system.
// Tiers: 1, 3, 7, 15, 30 (min_days). Renter is charged the highest tier
// whose min_days is <= rental duration.

export const TIER_MIN_DAYS = [1, 3, 7, 15, 30] as const;
export type TierMinDays = (typeof TIER_MIN_DAYS)[number];

export interface BikePricingTier {
  id?: string;
  bike_type_id?: string;
  min_days: TierMinDays;
  daily_price_mad: number;
}

export const TIER_LABELS: Record<TierMinDays, string> = {
  1: "1+ days",
  3: "3+ days",
  7: "7+ days (weekly)",
  15: "15+ days (bi-weekly)",
  30: "30+ days (monthly)",
};

export const TIER_SHORT_LABELS: Record<TierMinDays, string> = {
  1: "Daily",
  3: "3+ days",
  7: "Weekly",
  15: "Bi-weekly",
  30: "Monthly",
};

/** Resolve the daily rate that applies for `days` rental duration. */
export function resolveTierPrice(
  tiers: BikePricingTier[] | null | undefined,
  days: number,
): { dailyPrice: number; tierMinDays: TierMinDays | null } {
  if (!tiers || tiers.length === 0) {
    return { dailyPrice: 0, tierMinDays: null };
  }
  const sorted = [...tiers].sort((a, b) => a.min_days - b.min_days);
  const d = Math.max(1, Math.floor(days || 1));
  let pick = sorted[0];
  for (const t of sorted) {
    if (t.min_days <= d) pick = t;
    else break;
  }
  return { dailyPrice: Number(pick.daily_price_mad) || 0, tierMinDays: pick.min_days };
}

/** Returns the base (1+ days) tier price, or 0 if not set. */
export function getBaseDailyPrice(tiers: BikePricingTier[] | null | undefined): number {
  if (!tiers) return 0;
  const base = tiers.find((t) => t.min_days === 1);
  return base ? Number(base.daily_price_mad) || 0 : 0;
}

/** Percent savings vs base rate. 0 if no savings or no base. */
export function tierSavingsPct(base: number, tierPrice: number): number {
  if (!base || tierPrice >= base) return 0;
  return Math.round(((base - tierPrice) / base) * 100);
}
