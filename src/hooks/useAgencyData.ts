import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgencyWallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
}

export interface AgencyWalletTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number | null;
  currency: string;
  status: string;
  method: string | null;
  description: string | null;
  reference: string | null;
  related_booking_id: string | null;
  created_at: string;
}

export interface AgencySubscription {
  id: string;
  user_id: string;
  plan: "free" | "pro" | "business";
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface AgencyBookingRow {
  id: string;
  user_id: string | null;
  bike_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_date: string;
  return_date: string;
  pickup_time: string | null;
  return_time: string | null;
  pickup_location: string | null;
  return_location: string | null;
  total_price: number | null;
  total_days: number | null;
  amount_paid: number | null;
  status: string | null;
  payment_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface AgencyBike {
  id: string;
  name: string;
  description: string | null;
  daily_price: number | null;
  main_image_url: string | null;
  engine_cc: number | null;
  fuel_type: string | null;
  transmission: string | null;
  availability_status: string | null;
  business_status: string | null;
  approval_status: string | null;
  is_approved: boolean | null;
  rating: number | null;
  review_count: number | null;
  created_at: string;
}

export interface YouCanPayment {
  id: string;
  purpose: string;
  amount: number;
  currency: string;
  status: string;
  related_booking_id: string | null;
  related_subscription_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  created_at: string;
  paid_at: string | null;
}

const ensureWallet = async (userId: string): Promise<AgencyWallet> => {
  const { data: existing } = await supabase
    .from("agency_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing as AgencyWallet;
  const { data: created, error } = await supabase
    .from("agency_wallets")
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return created as AgencyWallet;
};

const ensureSubscription = async (userId: string): Promise<AgencySubscription> => {
  const { data: existing } = await supabase
    .from("agency_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing as AgencySubscription;
  const { data: created, error } = await supabase
    .from("agency_subscriptions")
    .insert({ user_id: userId, plan: "free", status: "active" })
    .select()
    .single();
  if (error) throw error;
  return created as AgencySubscription;
};

export const useCurrentUser = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUserId(data.user?.id ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return { userId, loading };
};

export const useAgencyWallet = () => {
  const { userId } = useCurrentUser();
  const [wallet, setWallet] = useState<AgencyWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setWallet(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const w = await ensureWallet(userId);
      setWallet(w);
    } catch (e) {
      console.error("useAgencyWallet:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { wallet, loading, refresh };
};

export const useAgencyWalletTransactions = (limit = 100) => {
  const { userId } = useCurrentUser();
  const [transactions, setTransactions] = useState<AgencyWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("agency_wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error) setTransactions((data || []) as AgencyWalletTransaction[]);
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { transactions, loading, refresh };
};

export const useAgencySubscription = () => {
  const { userId } = useCurrentUser();
  const [subscription, setSubscription] = useState<AgencySubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const s = await ensureSubscription(userId);
      setSubscription(s);
    } catch (e) {
      console.error("useAgencySubscription:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { subscription, loading, refresh };
};

export const useAgencyBookings = () => {
  const { userId } = useCurrentUser();
  const [bookings, setBookings] = useState<AgencyBookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_to_business", userId)
      .order("created_at", { ascending: false });
    if (!error) setBookings((data || []) as AgencyBookingRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { bookings, loading, refresh };
};

export const useAgencyBike = (id: string | undefined) => {
  const [bike, setBike] = useState<AgencyBike | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) {
      setBike(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("bike_types")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setBike(data as AgencyBike | null);
        setLoading(false);
      });
  }, [id]);
  return { bike, loading };
};

export const useAgencyBikes = () => {
  const { userId } = useCurrentUser();
  const [bikes, setBikes] = useState<AgencyBike[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBikes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("bike_types")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setBikes((data || []) as AgencyBike[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { bikes, loading, refresh };
};

export const useAgencyPayments = () => {
  const { userId } = useCurrentUser();
  const [payments, setPayments] = useState<YouCanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("youcanpay_payments")
      .select("*")
      .or(`user_id.eq.${userId},related_wallet_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setPayments((data || []) as YouCanPayment[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { payments, loading, refresh };
};

export interface AgencyBookingWithBike extends AgencyBookingRow {
  bike?: AgencyBike | null;
}

export const useAgencyBookingsWithBikes = () => {
  const { userId } = useCurrentUser();
  const [bookings, setBookings] = useState<AgencyBookingWithBike[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: bks } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_to_business", userId)
      .order("created_at", { ascending: false });
    const list = (bks || []) as AgencyBookingRow[];
    const bikeIds = Array.from(new Set(list.map((b) => b.bike_id).filter(Boolean))) as string[];
    let bikeMap: Record<string, AgencyBike> = {};
    if (bikeIds.length) {
      const { data: bks2 } = await supabase
        .from("bikes")
        .select("id, bike_type_id")
        .in("id", bikeIds);
      const typeIds = Array.from(
        new Set((bks2 || []).map((b: any) => b.bike_type_id).filter(Boolean)),
      );
      if (typeIds.length) {
        const { data: types } = await supabase
          .from("bike_types")
          .select("*")
          .in("id", typeIds);
        const typesMap: Record<string, AgencyBike> = {};
        (types || []).forEach((t: any) => (typesMap[t.id] = t as AgencyBike));
        (bks2 || []).forEach((b: any) => {
          if (b.bike_type_id && typesMap[b.bike_type_id]) bikeMap[b.id] = typesMap[b.bike_type_id];
        });
      }
    }
    setBookings(list.map((b) => ({ ...b, bike: b.bike_id ? bikeMap[b.bike_id] || null : null })));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { bookings, loading, refresh };
};
