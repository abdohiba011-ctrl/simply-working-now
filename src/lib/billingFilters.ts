import type { RenterWalletTransaction } from "@/hooks/useRenterWallet";

export type TxType = "all" | "topup" | "fee" | "refund";
export type TxStatus = "all" | "completed" | "pending" | "failed";

export interface BillingFilterState {
  type: TxType;
  status: TxStatus;
  from: string; // YYYY-MM-DD
  to: string;
  min: string; // string to keep input controlled
  max: string;
  q: string;
}

export const DEFAULT_FILTERS: BillingFilterState = {
  type: "all",
  status: "all",
  from: "",
  to: "",
  min: "",
  max: "",
  q: "",
};

export function readFiltersFromParams(params: URLSearchParams): BillingFilterState {
  return {
    type: (params.get("type") as TxType) || "all",
    status: (params.get("status") as TxStatus) || "all",
    from: params.get("from") || "",
    to: params.get("to") || "",
    min: params.get("min") || "",
    max: params.get("max") || "",
    q: params.get("q") || "",
  };
}

export function writeFiltersToParams(
  params: URLSearchParams,
  filters: BillingFilterState,
): URLSearchParams {
  const next = new URLSearchParams(params);
  (Object.keys(DEFAULT_FILTERS) as (keyof BillingFilterState)[]).forEach((key) => {
    const v = filters[key];
    if (v && v !== DEFAULT_FILTERS[key]) next.set(key, String(v));
    else next.delete(key);
  });
  return next;
}

export function activeFilterCount(filters: BillingFilterState): number {
  let n = 0;
  (Object.keys(DEFAULT_FILTERS) as (keyof BillingFilterState)[]).forEach((key) => {
    if (filters[key] && filters[key] !== DEFAULT_FILTERS[key]) n++;
  });
  return n;
}

export function applyFilters(
  list: RenterWalletTransaction[],
  filters: BillingFilterState,
): RenterWalletTransaction[] {
  const fromTs = filters.from ? new Date(filters.from + "T00:00:00").getTime() : null;
  const toTs = filters.to ? new Date(filters.to + "T23:59:59").getTime() : null;
  const min = filters.min ? Number(filters.min) : null;
  const max = filters.max ? Number(filters.max) : null;
  const q = filters.q.trim().toLowerCase();

  return list.filter((t) => {
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (filters.status !== "all" && t.status !== filters.status) return false;
    const created = new Date(t.created_at).getTime();
    if (fromTs !== null && created < fromTs) return false;
    if (toTs !== null && created > toTs) return false;
    const amt = Math.abs(Number(t.amount));
    if (min !== null && !Number.isNaN(min) && amt < min) return false;
    if (max !== null && !Number.isNaN(max) && amt > max) return false;
    if (q) {
      const hay = `${t.description ?? ""} ${t.reference ?? ""} ${t.type ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
