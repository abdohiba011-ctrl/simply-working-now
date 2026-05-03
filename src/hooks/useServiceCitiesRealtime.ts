import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to all changes on `service_cities` and invalidates every
 * query that depends on it. Mount once near the App root.
 */
export function useServiceCitiesRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("service_cities_global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_cities" },
        () => {
          qc.invalidateQueries({ queryKey: ["service-cities-public"] });
          qc.invalidateQueries({ queryKey: ["service-cities-homepage"] });
          qc.invalidateQueries({ queryKey: ["city-bike-counts"] });
          qc.invalidateQueries({ queryKey: ["rent-city-row"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
