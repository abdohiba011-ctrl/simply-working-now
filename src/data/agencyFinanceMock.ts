import { subDays, formatISO } from "date-fns";

const today = new Date();
const iso = (d: Date) => formatISO(d);

export type TxType = "topup" | "booking_fee" | "refund" | "withdrawal" | "bonus" | "subscription" | "adjustment";
export type TxStatus = "completed" | "pending" | "failed";
export type TxMethod = "youcanpay" | "cashplus" | "admin" | "wallet" | "card";

export interface AgencyTransaction {
  id: string;
  date: string;
  type: TxType;
  description: string;
  amount: number; // signed
  method: TxMethod;
  status: TxStatus;
  runningBalance: number;
  invoiceId?: string;
  receiptUrl?: string;
  meta?: Record<string, unknown>;
}

const seed: Array<Omit<AgencyTransaction, "id" | "runningBalance" | "date"> & { offset: number }> = [
  { offset: 0, type: "booking_fee", description: "Booking #8312 — Yamaha YBR125", amount: -50, method: "wallet", status: "completed" },
  { offset: 0, type: "booking_fee", description: "Booking #8311 — Honda CG125", amount: -50, method: "wallet", status: "completed" },
  { offset: 1, type: "topup", description: "Wallet top-up via YouCan Pay", amount: 500, method: "youcanpay", status: "completed", invoiceId: "INV-2025-0042" },
  { offset: 3, type: "booking_fee", description: "Booking #8307 — Kymco Agility", amount: -50, method: "wallet", status: "completed" },
  { offset: 5, type: "refund", description: "Refund — Booking #8298 cancelled", amount: 50, method: "wallet", status: "completed" },
  { offset: 7, type: "subscription", description: "Pro plan — Monthly", amount: -99, method: "youcanpay", status: "completed", invoiceId: "INV-2025-0039" },
  { offset: 10, type: "topup", description: "Wallet top-up — Cash Plus", amount: 1000, method: "cashplus", status: "completed", invoiceId: "INV-2025-0035" },
  { offset: 10, type: "bonus", description: "Top-up bonus (1000 MAD tier)", amount: 50, method: "admin", status: "completed" },
  { offset: 12, type: "booking_fee", description: "Booking #8302 — Peugeot Kisbee", amount: -50, method: "wallet", status: "completed" },
  { offset: 14, type: "withdrawal", description: "Withdrawal to RIB ****4521", amount: -300, method: "admin", status: "completed" },
  { offset: 18, type: "booking_fee", description: "Booking #8295 — Yamaha MT-07", amount: -50, method: "wallet", status: "completed" },
  { offset: 22, type: "topup", description: "Wallet top-up via YouCan Pay", amount: 500, method: "youcanpay", status: "completed", invoiceId: "INV-2025-0028" },
  { offset: 25, type: "booking_fee", description: "Booking #8290 — SYM Jet", amount: -50, method: "wallet", status: "completed" },
  { offset: 30, type: "subscription", description: "Pro plan — Monthly", amount: -99, method: "youcanpay", status: "completed", invoiceId: "INV-2025-0021" },
  { offset: 32, type: "booking_fee", description: "Booking #8285 — Honda CB500X", amount: -50, method: "wallet", status: "completed" },
  { offset: 35, type: "refund", description: "Refund — Booking #8284", amount: 50, method: "wallet", status: "completed" },
  { offset: 38, type: "booking_fee", description: "Booking #8278 — Yamaha YBR125", amount: -50, method: "wallet", status: "completed" },
  { offset: 42, type: "topup", description: "Wallet top-up via YouCan Pay", amount: 1000, method: "youcanpay", status: "completed", invoiceId: "INV-2025-0014" },
  { offset: 42, type: "bonus", description: "Top-up bonus (1000 MAD tier)", amount: 50, method: "admin", status: "completed" },
  { offset: 45, type: "booking_fee", description: "Booking #8270 — Kymco Agility", amount: -50, method: "wallet", status: "completed" },
  { offset: 50, type: "booking_fee", description: "Booking #8265 — Peugeot Kisbee", amount: -50, method: "wallet", status: "completed" },
  { offset: 55, type: "withdrawal", description: "Withdrawal to RIB ****4521", amount: -500, method: "admin", status: "completed" },
  { offset: 60, type: "subscription", description: "Pro plan — Monthly", amount: -99, method: "youcanpay", status: "completed", invoiceId: "INV-2025-0009" },
  { offset: 65, type: "topup", description: "Wallet top-up via YouCan Pay", amount: 2500, method: "youcanpay", status: "completed", invoiceId: "INV-2025-0005" },
  { offset: 65, type: "bonus", description: "Top-up bonus (2500 MAD tier)", amount: 200, method: "admin", status: "completed" },
  { offset: 70, type: "booking_fee", description: "Booking #8255 — Honda CG125", amount: -50, method: "wallet", status: "completed" },
  { offset: 75, type: "booking_fee", description: "Booking #8250 — Yamaha MT-07", amount: -50, method: "wallet", status: "completed" },
  { offset: 80, type: "adjustment", description: "Goodwill credit — support ticket #1287", amount: 100, method: "admin", status: "completed" },
  { offset: 88, type: "booking_fee", description: "Booking #8240 — SYM Jet", amount: -50, method: "wallet", status: "completed" },
  { offset: 95, type: "topup", description: "Wallet top-up via Cash Plus", amount: 500, method: "cashplus", status: "completed", invoiceId: "INV-2025-0001" },
  { offset: 100, type: "subscription", description: "Pro plan — Monthly", amount: -99, method: "youcanpay", status: "completed" },
  { offset: 110, type: "booking_fee", description: "Booking #8222 — Honda CB500X", amount: -50, method: "wallet", status: "completed" },
  { offset: 120, type: "topup", description: "Wallet top-up via YouCan Pay", amount: 500, method: "youcanpay", status: "completed" },
  { offset: 130, type: "booking_fee", description: "Booking #8210 — Yamaha YBR125", amount: -50, method: "wallet", status: "completed" },
  { offset: 140, type: "subscription", description: "Pro plan — Monthly", amount: -99, method: "youcanpay", status: "completed" },
  { offset: 150, type: "booking_fee", description: "Booking #8200 — Peugeot Kisbee", amount: -50, method: "wallet", status: "completed" },
  { offset: 160, type: "withdrawal", description: "Withdrawal to RIB ****4521", amount: -200, method: "admin", status: "completed" },
  { offset: 170, type: "topup", description: "Wallet top-up via YouCan Pay", amount: 500, method: "youcanpay", status: "completed" },
  { offset: 180, type: "booking_fee", description: "Booking #8185 — Yamaha MT-07", amount: -50, method: "wallet", status: "completed" },
  { offset: 1, type: "topup", description: "Pending top-up — Cash Plus reference KP-77821", amount: 200, method: "cashplus", status: "pending" },
];

// Sort oldest → newest, compute running balance
const sorted = [...seed].sort((a, b) => b.offset - a.offset);
let bal = 0;
export const agencyTransactions: AgencyTransaction[] = sorted.map((s, i) => {
  if (s.status === "completed") bal += s.amount;
  return {
    id: `tx-${10000 + i}`,
    date: iso(subDays(today, s.offset)),
    type: s.type,
    description: s.description,
    amount: s.amount,
    method: s.method,
    status: s.status,
    runningBalance: bal,
    invoiceId: s.invoiceId,
  };
}).reverse();

export const walletBalance = bal; // current

// ===== Invoices =====
export interface AgencyInvoice {
  id: string;
  number: string;
  date: string;
  type: "subscription" | "topup" | "fees_summary";
  description: string;
  subtotal: number;
  vatRate: number; // e.g. 0.20
  vat: number;
  total: number;
  pdfUrl: string;
}

const mkInv = (number: string, dayOffset: number, type: AgencyInvoice["type"], description: string, subtotal: number): AgencyInvoice => {
  const vat = Math.round(subtotal * 0.2 * 100) / 100;
  return {
    id: `inv-${number}`,
    number,
    date: iso(subDays(today, dayOffset)),
    type,
    description,
    subtotal,
    vatRate: 0.2,
    vat,
    total: subtotal + vat,
    pdfUrl: "#",
  };
};

export const agencyInvoices: AgencyInvoice[] = [
  mkInv("INV-2025-0042", 1, "topup", "Wallet top-up — 500 MAD", 500),
  mkInv("INV-2025-0039", 7, "subscription", "Pro plan — Monthly subscription", 99),
  mkInv("INV-2025-0035", 10, "topup", "Wallet top-up — 1000 MAD", 1000),
  mkInv("INV-2025-0028", 22, "topup", "Wallet top-up — 500 MAD", 500),
  mkInv("INV-2025-0021", 30, "subscription", "Pro plan — Monthly subscription", 99),
  mkInv("INV-2025-0014", 42, "topup", "Wallet top-up — 1000 MAD", 1000),
  mkInv("INV-2025-0009", 60, "subscription", "Pro plan — Monthly subscription", 99),
  mkInv("INV-2025-0007", 60, "fees_summary", "Booking fees summary — Feb 2025", 350),
  mkInv("INV-2025-0005", 65, "topup", "Wallet top-up — 2500 MAD", 2500),
  mkInv("INV-2025-0001", 95, "topup", "Wallet top-up — 500 MAD", 500),
];

// ===== Saved bank accounts =====
export const savedBankAccounts = [
  { id: "ba-1", label: "Attijariwafa Bank", iban: "MA64 011 78000 12345678 4521", last4: "4521" },
  { id: "ba-2", label: "Bank of Africa", iban: "MA64 022 78000 87654321 9988", last4: "9988" },
];

// ===== Team members =====
export type TeamRole = "owner" | "manager" | "staff" | "readonly";
export type TeamStatus = "active" | "invited" | "disabled";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: TeamRole;
  status: TeamStatus;
  avatar: string;
  lastActive: string;
}

export const teamMembers: TeamMember[] = [
  { id: "tm-1", name: "Karim Bensaid", email: "karim@casa-moto.ma", phone: "+212 661 11 22 33", role: "owner", status: "active", avatar: "https://i.pravatar.cc/100?img=68", lastActive: iso(subDays(today, 0)) },
  { id: "tm-2", name: "Salma El Idrissi", email: "salma@casa-moto.ma", phone: "+212 662 44 55 66", role: "manager", status: "active", avatar: "https://i.pravatar.cc/100?img=45", lastActive: iso(subDays(today, 0)) },
  { id: "tm-3", name: "Hicham Talbi", email: "hicham@casa-moto.ma", phone: "+212 663 77 88 99", role: "staff", status: "active", avatar: "https://i.pravatar.cc/100?img=33", lastActive: iso(subDays(today, 1)) },
  { id: "tm-4", name: "Nadia Cherkaoui", email: "nadia@cabinet-fiduciaire.ma", phone: "+212 664 22 33 44", role: "readonly", status: "active", avatar: "https://i.pravatar.cc/100?img=44", lastActive: iso(subDays(today, 5)) },
  { id: "tm-5", name: "Younes Berrada", email: "younes@casa-moto.ma", phone: "+212 665 55 66 77", role: "staff", status: "invited", avatar: "https://i.pravatar.cc/100?img=14", lastActive: iso(subDays(today, 30)) },
];

// ===== Verification steps =====
export type VerifStatus = "not_started" | "uploaded" | "review" | "verified" | "rejected";
export interface VerifStep {
  key: string;
  title: string;
  description: string;
  status: VerifStatus;
  rejectionReason?: string;
  fileName?: string;
}

export const verificationSteps: VerifStep[] = [
  { key: "rc", title: "Business registration", description: "Upload your Registre de Commerce (RC) and ICE certificate.", status: "verified", fileName: "rc-ice-2024.pdf" },
  { key: "address", title: "Address verification", description: "Recent utility bill or rental contract (last 3 months).", status: "verified", fileName: "utility-bill-mar-2025.pdf" },
  { key: "insurance", title: "Insurance", description: "Valid motor insurance policy covering all listed bikes.", status: "verified", fileName: "insurance-axa-2025.pdf" },
  { key: "bank", title: "Bank account", description: "RIB / IBAN attestation. Run a 1 MAD micro-test to confirm.", status: "review", fileName: "rib-attijari.pdf" },
  { key: "identity", title: "Identity verification", description: "Owner's CIN (front + back) plus a selfie holding the ID.", status: "not_started" },
];
