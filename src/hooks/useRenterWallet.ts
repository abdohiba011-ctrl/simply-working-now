import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type RenterWalletTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  balance_after: number | null;
  description: string | null;
  method: string | null;
  reference: string | null;
  related_payment_id: string | null;
  related_booking_id: string | null;
  currency: string;
  created_at: string;
};

export function useRenterWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("MAD");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<RenterWalletTransaction[]>([]);

  const fetchWallet = useCallback(async () => {
    if (!user) {
      setBalance(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("renter_wallets")
      .select("balance, currency")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data) {
      setBalance(Number(data.balance || 0));
      setCurrency(data.currency || "MAD");
    } else if (!data) {
      // Auto-create row if missing (handles users created before the wallet trigger)
      await supabase.from("renter_wallets").insert({ user_id: user.id }).select().maybeSingle();
      setBalance(0);
    }
    setIsLoading(false);
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("renter_wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setTransactions((data || []) as RenterWalletTransaction[]);
  }, [user]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [fetchWallet, fetchTransactions]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`renter-wallet-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "renter_wallets", filter: `user_id=eq.${user.id}` },
        () => fetchWallet(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "renter_wallet_transactions", filter: `user_id=eq.${user.id}` },
        () => fetchTransactions(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchWallet, fetchTransactions]);

  return { balance, currency, isLoading, transactions, refetch: fetchWallet, refetchTransactions: fetchTransactions };
}
