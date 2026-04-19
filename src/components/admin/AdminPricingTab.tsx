import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Tag, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PricingTier {
  id: string;
  tier_name: string;
  tier_key: string;
  min_days: number;
  max_days: number | null;
  daily_price: number;
  display_order: number;
  is_active: boolean;
}

export const AdminPricingTab = () => {
  const queryClient = useQueryClient();
  const [editedTiers, setEditedTiers] = useState<Record<string, Partial<PricingTier>>>({});

  const { data: tiers, isLoading } = useQuery({
    queryKey: ["admin_pricing_tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_tiers")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PricingTier[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (tier: PricingTier) => {
      const { error } = await supabase
        .from("pricing_tiers")
        .update({
          daily_price: tier.daily_price,
          is_active: tier.is_active,
        })
        .eq("id", tier.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_pricing_tiers"] });
      queryClient.invalidateQueries({ queryKey: ["pricing_tiers"] });
      toast.success("Pricing updated successfully");
    },
    onError: (error) => {
      console.error("Error updating pricing:", error);
      toast.error("Failed to update pricing");
    },
  });

  const handlePriceChange = (tierId: string, value: string) => {
    const price = parseFloat(value) || 0;
    setEditedTiers((prev) => ({
      ...prev,
      [tierId]: { ...prev[tierId], daily_price: price },
    }));
  };

  const handleActiveChange = (tierId: string, isActive: boolean) => {
    setEditedTiers((prev) => ({
      ...prev,
      [tierId]: { ...prev[tierId], is_active: isActive },
    }));
  };

  const handleSave = (tier: PricingTier) => {
    const edited = editedTiers[tier.id];
    const updatedTier = {
      ...tier,
      daily_price: edited?.daily_price ?? tier.daily_price,
      is_active: edited?.is_active ?? tier.is_active,
    };
    updateMutation.mutate(updatedTier);
    setEditedTiers((prev) => {
      const newState = { ...prev };
      delete newState[tier.id];
      return newState;
    });
  };

  const hasChanges = (tierId: string) => {
    return tierId in editedTiers;
  };

  const getDaysLabel = (tier: PricingTier) => {
    if (tier.max_days === null) {
      return `${tier.min_days}+ days`;
    }
    if (tier.min_days === tier.max_days) {
      return `${tier.min_days} day${tier.min_days > 1 ? "s" : ""}`;
    }
    return `${tier.min_days}-${tier.max_days} days`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Pricing Management
          </h2>
          <p className="text-muted-foreground">
            Update daily rental prices for different duration tiers. Changes apply across the entire website.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tiers?.map((tier) => {
          const edited = editedTiers[tier.id];
          const currentPrice = edited?.daily_price ?? tier.daily_price;
          const currentActive = edited?.is_active ?? tier.is_active;

          return (
            <Card
              key={tier.id}
              className={`transition-all ${!currentActive ? "opacity-60" : ""} ${hasChanges(tier.id) ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.tier_name}</CardTitle>
                  <Badge variant={currentActive ? "default" : "secondary"}>
                    {currentActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>{getDaysLabel(tier)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`price-${tier.id}`}>Daily Price (DH)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`price-${tier.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={currentPrice}
                      onChange={(e) => handlePriceChange(tier.id, e.target.value)}
                      className="text-lg font-bold"
                    />
                    <span className="text-muted-foreground font-medium">DH/day</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`active-${tier.id}`}>Active</Label>
                  <Switch
                    id={`active-${tier.id}`}
                    checked={currentActive}
                    onCheckedChange={(checked) => handleActiveChange(tier.id, checked)}
                  />
                </div>

                {hasChanges(tier.id) && (
                  <Button
                    onClick={() => handleSave(tier)}
                    disabled={updateMutation.isPending}
                    className="w-full"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How Pricing Works</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Customers see the appropriate price based on their rental duration</li>
            <li>• Longer rentals automatically get better daily rates</li>
            <li>• The pricing page shows all tiers transparently</li>
            <li>• Deactivating a tier hides it from customers but keeps the data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
