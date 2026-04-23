// Lightweight client-side UI store for agency dashboard.
// Real data (wallet, plan, bookings, transactions) now comes from
// Supabase via the hooks in `src/hooks/useAgencyData.ts`.
// Legacy fields kept as no-ops so existing pages compile while we
// progressively migrate them to real data.

import { create } from "zustand";

export type VerificationStatus = "unverified" | "partial" | "verified";

interface AgencyUiState {
  // Real-data shadow fields (refreshed from hooks elsewhere)
  walletBalance: number;
  setWalletBalance: (n: number) => void;
  plan: "free" | "pro" | "business";
  name: string;
  unreadMessages: number;
  setUnreadMessages: (n: number) => void;
  pendingBookings: number;
  setPendingBookings: (n: number) => void;
  verificationStatus: VerificationStatus;
  verificationStepsCompleted: number;
  verificationStepsTotal: number;
  setAgency: (data: Partial<AgencyUiState>) => void;
}

export const useAgencyStore = create<AgencyUiState>((set) => ({
  walletBalance: 0,
  setWalletBalance: (n) => set({ walletBalance: n }),
  plan: "free",
  name: "",
  unreadMessages: 0,
  setUnreadMessages: (n) => set({ unreadMessages: n }),
  pendingBookings: 0,
  setPendingBookings: (n) => set({ pendingBookings: n }),
  verificationStatus: "unverified",
  verificationStepsCompleted: 0,
  verificationStepsTotal: 5,
  setAgency: (data) => set((s) => ({ ...s, ...data })),
}));
