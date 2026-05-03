import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

export type FavoriteRow = {
  id: string;
  user_id: string;
  bike_type_id: string;
  created_at: string;
};

export function useFavoriteIds() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Set<string>> => {
      if (!user) return new Set();
      const { data, error } = await supabase
        .from("favorites" as never)
        .select("bike_type_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return new Set((data || []).map((r: { bike_type_id: string }) => r.bike_type_id));
    },
  });
}

export function useFavorites() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["favorites-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("favorites" as never)
        .select(
          "id, bike_type_id, created_at, bike_type:bike_types(id, slug, name, category, fuel_type, daily_price, weekly_price, monthly_price, main_image_url, neighborhood, features, license_required, year, engine_cc, city_id)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useToggleFavorite() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bikeTypeId,
      isFavorited,
    }: {
      bikeTypeId: string;
      isFavorited: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFavorited) {
        const { error } = await supabase
          .from("favorites" as never)
          .delete()
          .eq("user_id", user.id)
          .eq("bike_type_id", bikeTypeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites" as never)
          .insert({ user_id: user.id, bike_type_id: bikeTypeId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] });
      qc.invalidateQueries({ queryKey: ["favorites-full", user?.id] });
    },
  });
}
