// Lightweight client-side UI store for agency dashboard.
// Real data (wallet balance, plan, bookings, transactions, etc.) now
// comes from Supabase via the hooks in `src/hooks/useAgencyData.ts`.
// This store only holds transient UI state.

import { create } from "zustand";

interface AgencyUiState {
  // UI-only counters used for badges; they are refreshed by pages from Supabase.
  unreadMessages: number;
  setUnreadMessages: (n: number) => void;
}

export const useAgencyStore = create<AgencyUiState>((set) => ({
  unreadMessages: 0,
  setUnreadMessages: (n) => set({ unreadMessages: n }),
}));
