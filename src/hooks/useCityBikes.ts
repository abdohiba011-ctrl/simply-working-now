import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CityBikeType {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  deposit_amount: number | null;
  license_required: string | null;
  min_age: number | null;
  min_experience_years: number | null;
  main_image_url: string | null;
  engine_cc: number | null;
  fuel_type: string | null;
  transmission: string | null;
  features: string[] | null;
  rating: number | null;
  review_count: number | null;
  city_id: string | null;
  owner_id: string | null;
  neighborhood: string | null;
  year: number | null;
  color: string | null;
  mileage_km: number | null;
  availability_status: string | null;
  business_status: string | null;
  approval_status: string | null;
  bike_id?: string;
  bike_location?: string | null;
}

export const useCityBikes = (cityName: string) => {
  return useQuery({
    queryKey: ["city-bikes", cityName],
    queryFn: async () => {
      const { data: cities } = await supabase
        .from("service_cities")
        .select("id, name")
        .ilike("name", cityName)
        .limit(1);
      const city = cities?.[0];
      if (!city) return [] as CityBikeType[];

      const { data: types, error } = await supabase
        .from("bike_types")
        .select("*")
        .eq("city_id", city.id)
        .eq("is_approved", true)
        .eq("availability_status", "available");
      if (error) throw error;

      const typeIds = (types || []).map((t: any) => t.id);
      let bikeMap: Record<string, { id: string; location: string | null }> = {};
      if (typeIds.length) {
        const { data: bikes } = await supabase
          .from("bikes")
          .select("id, bike_type_id, location, available")
          .in("bike_type_id", typeIds)
          .eq("available", true);
        (bikes || []).forEach((b: any) => {
          if (!bikeMap[b.bike_type_id]) {
            bikeMap[b.bike_type_id] = { id: b.id, location: b.location };
          }
        });
      }

      return (types || [])
        .map((t: any) => ({
          ...t,
          bike_id: bikeMap[t.id]?.id,
          bike_location: bikeMap[t.id]?.location ?? t.neighborhood,
        }))
        .filter((t: any) => t.bike_id) as CityBikeType[];
    },
    enabled: !!cityName,
  });
};
