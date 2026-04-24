import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// UUID validation helper to prevent database errors
const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export interface BikeType {
  id: string;
  name: string;
  description: string | null;
  daily_price: number;
  weekly_price?: number | null;
  monthly_price?: number | null;
  deposit_amount?: number | null;
  license_required?: string | null;
  min_age?: number | null;
  min_experience_years?: number | null;
  category?: string | null;
  engine_cc?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  main_image_url: string;
  features: string[];
  rating: number;
  review_count?: number | null;
  neighborhood?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BikeTypeImage {
  id: string;
  bike_type_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface Bike {
  id: string;
  bike_type_id: string;
  location: string;
  license_plate: string | null;
  available: boolean;
  created_at: string;
  updated_at: string;
  bike_type?: BikeType;
}

export const useBikeTypes = () => {
  return useQuery({
    queryKey: ["bike-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_types")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as BikeType[];
    },
  });
};

export const useBikeTypeImages = (bikeTypeId: string) => {
  return useQuery({
    queryKey: ["bike-type-images", bikeTypeId],
    queryFn: async () => {
      if (!isValidUUID(bikeTypeId)) {
        throw new Error("Invalid bike type ID format");
      }
      const { data, error } = await supabase
        .from("bike_type_images")
        .select("*")
        .eq("bike_type_id", bikeTypeId)
        .order("display_order");
      
      if (error) throw error;
      return data as BikeTypeImage[];
    },
    enabled: !!bikeTypeId && isValidUUID(bikeTypeId),
  });
};

export const useBikes = (location?: string, bikeTypeId?: string) => {
  return useQuery({
    queryKey: ["bikes", location, bikeTypeId],
    queryFn: async () => {
      // Validate bikeTypeId if provided
      if (bikeTypeId && !isValidUUID(bikeTypeId)) {
        throw new Error("Invalid bike type ID format");
      }
      
      let query = supabase
        .from("bikes")
        .select(`
          *,
          bike_type:bike_types(*)
        `)
        .eq("available", true);
      
      if (location) {
        query = query.eq("location", location);
      }
      
      if (bikeTypeId) {
        query = query.eq("bike_type_id", bikeTypeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Bike[];
    },
  });
};

export const useBike = (bikeId: string) => {
  return useQuery({
    queryKey: ["bike", bikeId],
    queryFn: async () => {
      if (!isValidUUID(bikeId)) {
        throw new Error("Invalid bike ID format");
      }
      const { data, error } = await supabase
        .from("bikes")
        .select(`
          *,
          bike_type:bike_types(*)
        `)
        .eq("id", bikeId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error("Bike not found");
      return data as Bike;
    },
    enabled: !!bikeId && isValidUUID(bikeId),
  });
};
