import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { 
  AccountStatus, 
  KYCStatus, 
  PhoneStatus, 
  RiskLevel, 
  BookingStatus, 
  PaymentStatus,
  NoteCategory,
  TimelineEventType 
} from "./types";

// Date formatting helpers
export const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return "N/A";
  try {
    const date = parseISO(dateStr);
    return format(date, "yyyy-MM-dd HH:mm:ss") + " (GMT+1)";
  } catch {
    return dateStr;
  }
};

export const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return "";
  try {
    const date = parseISO(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
};

// Trust score helpers
export const getTrustLabel = (score: number): { label: string; color: string } => {
  if (score <= 3) return { label: "Low trust", color: "text-destructive" };
  if (score <= 7) return { label: "Medium trust", color: "text-warning dark:text-warning" };
  return { label: "High trust", color: "text-success dark:text-success" };
};

// Status mapping helpers for StatusBadge
export const mapAccountStatus = (status: AccountStatus): string => {
  const map: Record<AccountStatus, string> = {
    ACTIVE: "active",
    BLOCKED: "blocked",
    SUSPENDED: "suspended",
  };
  return map[status] || "pending";
};

export const mapKYCStatus = (status: KYCStatus): string => {
  const map: Record<KYCStatus, string> = {
    VERIFIED: "verified",
    PENDING: "pending",
    REVERIFY_REQUESTED: "reverify_requested",
    REJECTED: "rejected",
    NOT_STARTED: "not_started",
  };
  return map[status] || "pending";
};

export const mapPhoneStatus = (status: PhoneStatus): string => {
  return status === "VERIFIED" ? "verified" : "not_verified";
};

export const mapRiskLevel = (level: RiskLevel): string => {
  const map: Record<RiskLevel, string> = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
  };
  return map[level] || "medium";
};

export const mapBookingStatus = (status: BookingStatus): string => {
  const map: Record<BookingStatus, string> = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    ONGOING: "ongoing",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    REFUNDED: "refunded",
  };
  return map[status] || "pending";
};

export const mapPaymentStatus = (status: PaymentStatus): string => {
  const map: Record<PaymentStatus, string> = {
    PAID: "paid",
    UNPAID: "unpaid",
    FAILED: "failed",
    REFUNDED: "refunded",
  };
  return map[status] || "unpaid";
};

// Category badge colors
export const getCategoryBadgeColors = (category: NoteCategory): string => {
  const colors: Record<NoteCategory, string> = {
    Support: "bg-info/20 text-info dark:bg-info/20 dark:text-info",
    Risk: "bg-destructive/20 text-destructive dark:bg-destructive/20 dark:text-destructive",
    Payment: "bg-success/20 text-success dark:bg-success/20 dark:text-success",
    Booking: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    KYC: "bg-warning/20 text-warning dark:bg-warning/20 dark:text-warning",
  };
  return colors[category] || "bg-muted text-muted-foreground";
};

// Timeline event styling helpers
export const getTimelineEventColor = (type: TimelineEventType): string => {
  switch (type) {
    case "ADMIN_ACTION":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
    case "BOOKING":
      return "bg-info/20 text-info dark:bg-info/20 dark:text-info";
    case "KYC":
      return "bg-success/20 text-success dark:bg-success/20 dark:text-success";
    case "TRUST":
      return "bg-warning/20 text-warning dark:bg-warning/20 dark:text-warning";
    case "NOTE":
      return "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground";
    case "SYSTEM":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

// File type helpers
export const isImageFile = (type: string): boolean => 
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(type.toLowerCase());

export const isVideoFile = (type: string): boolean => 
  ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp'].includes(type.toLowerCase());

export const isPdfFile = (type: string): boolean => 
  type.toLowerCase() === 'pdf';

export const isDocumentFile = (type: string): boolean => {
  const docTypes = ["doc", "docx", "txt", "rtf"];
  return docTypes.some(t => type.toLowerCase().includes(t));
};

export const isSpreadsheetFile = (type: string): boolean => {
  const sheetTypes = ["xls", "xlsx", "csv"];
  return sheetTypes.some(t => type.toLowerCase().includes(t));
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Clipboard helper
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};