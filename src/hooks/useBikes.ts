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
  main_image_url: string;
  features: string[];
  rating: number;
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
      
      // Use the safe public view that excludes sensitive columns
      // (license_plate, notes) for anonymous/public reads.
      let query = supabase
        .from("bikes_public" as any)
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
      return (data as unknown) as Bike[];
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

      // Try direct bikes.id lookup first
      const direct = await supabase
        .from("bikes")
        .select(`*, bike_type:bike_types(*)`)
        .eq("id", bikeId)
        .maybeSingle();

      if (direct.error) throw direct.error;
      if (direct.data) return direct.data as Bike;

      // Fallback: id may be a bike_type_id coming from listings cards
      const viaType = await supabase
        .from("bikes")
        .select(`*, bike_type:bike_types(*)`)
        .eq("bike_type_id", bikeId)
        .limit(1)
        .maybeSingle();

      if (viaType.error) throw viaType.error;
      if (!viaType.data) throw new Error("Bike not found");
      return viaType.data as Bike;
    },
    enabled: !!bikeId && isValidUUID(bikeId),
  });
};

export interface BikeReview {
  id: string;
  bike_type_id: string;
  rating: number;
  reviewer_name: string;
  comment: string | null;
  created_at: string;
}

export const useBikeReviews = (bikeTypeId: string) => {
  return useQuery({
    queryKey: ["bike-reviews", bikeTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_reviews")
        .select("*")
        .eq("bike_type_id", bikeTypeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BikeReview[];
    },
    enabled: !!bikeTypeId && isValidUUID(bikeTypeId),
  });
};

