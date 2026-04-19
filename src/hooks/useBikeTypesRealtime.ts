import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to enable real-time updates for bike_types table
 * Automatically invalidates react-query cache when changes occur
 */
export const useBikeTypesRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('bike_types_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bike_types'
        },
        (payload) => {
          console.log('Bike types changed:', payload);
          // Invalidate all bike-types related queries
          queryClient.invalidateQueries({ queryKey: ['bike-types'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

/**
 * Hook to enable real-time updates for bike_inventory table
 */
export const useBikeInventoryRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('bike_inventory_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bike_inventory'
        },
        (payload) => {
          console.log('Bike inventory changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['bikes'] });
          queryClient.invalidateQueries({ queryKey: ['bike-inventory'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

/**
 * Hook to enable real-time updates for service_cities table
 */
export const useServiceCitiesRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('service_cities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_cities'
        },
        (payload) => {
          console.log('Service cities changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['service-cities'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

/**
 * Combined hook for all fleet-related real-time updates
 */
export const useFleetRealtime = () => {
  useBikeTypesRealtime();
  useBikeInventoryRealtime();
  useServiceCitiesRealtime();
};
