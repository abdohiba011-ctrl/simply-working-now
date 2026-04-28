import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BookingPayment {
  id: string;
  booking_id: string;
  provider: string | null;
  method: string;
  amount: number;
  currency: string;
  status: string;
  external_reference: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useBookingPayments = (bookingId: string | undefined) => {
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchPayments = useCallback(async () => {
    if (!bookingId) return;
    
    try {
      const { data, error } = await supabase
        .from('booking_payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching booking payments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchPayments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`booking-payments-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_payments',
          filter: `booking_id=eq.${bookingId}`
        },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, fetchPayments]);

  const recordPayment = async (
    method: string,
    amount: number,
    notes?: string,
    provider?: string
  ) => {
    if (!bookingId || !user) return null;

    try {
      // Get user name from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('booking_payments')
        .insert({
          booking_id: bookingId,
          method,
          amount,
          currency: 'MAD',
          status: 'completed',
          provider: provider || null,
          recorded_by: user.id,
          recorded_by_name: profile?.name || user.email || 'Admin',
          notes: notes || null
        })
        .select()
        .single();

      if (error) throw error;
      await fetchPayments();
      return data;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  };

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return { payments, isLoading, fetchPayments, recordPayment, totalPaid };
};
