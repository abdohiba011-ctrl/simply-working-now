import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceCityOption {
  id: string;
  name: string;
  is_available: boolean;
  is_coming_soon: boolean;
}

export interface ServiceLocationOption {
  id: string;
  name: string;
  city_id: string;
}

/**
 * Loads the admin-managed list of service cities + their neighborhoods
 * (service_locations). Returns ALL cities (including coming-soon) so the UI
 * can show them disabled. Filtering is the caller's responsibility.
 */
export function useServiceCities() {
  const [cities, setCities] = useState<ServiceCityOption[]>([]);
  const [locations, setLocations] = useState<ServiceLocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [citiesRes, locsRes] = await Promise.all([
          supabase
            .from("service_cities")
            .select("id, name, display_order, is_available, is_coming_soon")
            .order("display_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("service_locations")
            .select("id, name, city_id, display_order, is_active")
            .order("display_order", { ascending: true })
            .order("name", { ascending: true }),
        ]);
        if (cancelled) return;
        const locsData = (locsRes.data || []).filter(
          (l: any) => l.is_active !== false,
        );
        setCities(
          (citiesRes.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            is_available: c.is_available !== false,
            is_coming_soon: !!c.is_coming_soon,
          })),
        );
        setLocations(
          locsData.map((l: any) => ({
            id: l.id,
            name: l.name,
            city_id: l.city_id,
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, locations, loading };
}
