import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface BookingEvent {
  id: string;
  booking_id: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  from_state: Json | null;
  to_state: Json | null;
  meta: Json | null;
  created_at: string;
}

export const useBookingEvents = (bookingId: string | undefined) => {
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    if (!bookingId) return;
    
    try {
      const { data, error } = await supabase
        .from('booking_events')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data || []) as BookingEvent[]);
    } catch (error) {
      console.error('Error fetching booking events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`booking-events-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_events',
          filter: `booking_id=eq.${bookingId}`
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, fetchEvents]);

  const addEvent = async (
    action: string,
    fromState?: Record<string, unknown>,
    toState?: Record<string, unknown>,
    meta?: Record<string, unknown>
  ) => {
    if (!bookingId || !user) return;

    try {
      // Get user name from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('booking_events')
        .insert({
          booking_id: bookingId,
          event_type: action,
          actor_type: 'admin',
          actor_id: user.id,
          actor_name: profile?.name || user.email || 'Admin',
          action,
          from_state: fromState || null,
          to_state: toState || null,
          meta: (meta || null) as Json
        } as never);

      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error adding booking event:', error);
    }
  };

  return { events, isLoading, fetchEvents, addEvent };
};
