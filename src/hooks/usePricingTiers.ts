import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PricingTier {
  id: string;
  tier_name: string;
  tier_key: string;
  min_days: number;
  max_days: number | null;
  daily_price: number;
  display_order: number;
  is_active: boolean;
}

export const usePricingTiers = () => {
  return useQuery({
    queryKey: ["pricing_tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PricingTier[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Utility function to get daily price based on rental duration
export const getDailyPriceForDuration = (tiers: PricingTier[] | undefined, days: number): number => {
  if (!tiers || tiers.length === 0) {
    // Fallback to default pricing if tiers not loaded
    if (days >= 30) return 59;
    if (days >= 15) return 69;
    if (days >= 7) return 79;
    if (days >= 3) return 89;
    return 99;
  }

  // Find the appropriate tier for the given number of days
  for (const tier of tiers.sort((a, b) => b.min_days - a.min_days)) {
    if (days >= tier.min_days) {
      return tier.daily_price;
    }
  }

  // Default to highest price tier (daily)
  return tiers[0]?.daily_price || 99;
};

// Get savings percentage compared to daily rate
export const getSavingsPercentage = (tiers: PricingTier[] | undefined, days: number): number => {
  if (!tiers || tiers.length === 0) return 0;
  
  const dailyTier = tiers.find(t => t.tier_key === 'daily');
  const currentPrice = getDailyPriceForDuration(tiers, days);
  
  if (!dailyTier || dailyTier.daily_price === currentPrice) return 0;
  
  return Math.round(((dailyTier.daily_price - currentPrice) / dailyTier.daily_price) * 100);
};
