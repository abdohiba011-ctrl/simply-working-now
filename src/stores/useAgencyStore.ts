import { create } from "zustand";

export type VerificationStatus = "unverified" | "partial" | "verified";

interface AgencyState {
  id: string;
  name: string;
  plan: "free" | "pro" | "business";
  verificationStatus: VerificationStatus;
  verificationStepsCompleted: number;
  verificationStepsTotal: number;
  walletBalance: number;
  unreadMessages: number;
  pendingBookings: number;
  setWalletBalance: (n: number) => void;
  setUnreadMessages: (n: number) => void;
  setPendingBookings: (n: number) => void;
  setAgency: (data: Partial<AgencyState>) => void;
}

export const useAgencyStore = create<AgencyState>((set) => ({
  id: "agency-casa-moto",
  name: "Casa Moto Rent",
  plan: "free",
  verificationStatus: "partial",
  verificationStepsCompleted: 3,
  verificationStepsTotal: 5,
  walletBalance: 245,
  unreadMessages: 3,
  pendingBookings: 4,
  setWalletBalance: (n) => set({ walletBalance: n }),
  setUnreadMessages: (n) => set({ unreadMessages: n }),
  setPendingBookings: (n) => set({ pendingBookings: n }),
  setAgency: (data) => set((s) => ({ ...s, ...data })),
}));
