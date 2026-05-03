import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceCityOption {
  id: string;
  name: string;
}

export interface ServiceLocationOption {
  id: string;
  name: string;
  city_id: string;
}

/**
 * Loads the admin-managed list of service cities + their neighborhoods
 * (service_locations). Used to keep the agency signup dropdowns in sync
 * with whatever the admin panel currently exposes.
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
            .select("id, name, display_order, is_available")
            .order("display_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("service_locations")
            .select("id, name, city_id, display_order, is_active")
            .order("display_order", { ascending: true })
            .order("name", { ascending: true }),
        ]);
        if (cancelled) return;
        const citiesData = (citiesRes.data || []).filter(
          (c: any) => c.is_available !== false,
        );
        const locsData = (locsRes.data || []).filter(
          (l: any) => l.is_active !== false,
        );
        setCities(citiesData.map((c: any) => ({ id: c.id, name: c.name })));
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
