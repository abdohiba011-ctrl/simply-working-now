import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  CircleDot,
  ShieldCheck,
  Snowflake,
  Eye,
  Loader2,
  Timer,
  CreditCard,
  Hourglass,
} from "lucide-react";

export type StatusType =
  | "new"
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "rejected"
  | "reviewed"
  | "verified"
  | "blocked"
  | "frozen"
  | "not_started"
  | "in_progress"
  | "upcoming"
  | "expired"
  | "processing"
  | "awaiting_payment"
  | "ongoing"
  | "refunded"
  | "paid"
  | "unpaid"
  | "failed"
  | "low"
  | "medium"
  | "high"
  | "reverify_requested"
  | "suspended";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Animation variant for special states */
  animate?: "none" | "pulse" | "loading";
}

const statusConfig: Record<
  StatusType,
  {
    variant: "status-new" | "status-pending" | "status-confirmed" | "status-active" | "status-completed" | "status-cancelled" | "status-rejected" | "status-reviewed" | "status-verified" | "status-blocked" | "status-frozen" | "status-expired" | "status-processing" | "status-awaiting-payment" | "outline";
    icon: React.ElementType;
    defaultLabel: string;
  }
> = {
  new: {
    variant: "status-new",
    icon: CircleDot,
    defaultLabel: "New",
  },
  pending: {
    variant: "status-pending",
    icon: Clock,
    defaultLabel: "Pending",
  },
  confirmed: {
    variant: "status-confirmed",
    icon: CheckCircle,
    defaultLabel: "Confirmed",
  },
  active: {
    variant: "status-active",
    icon: CheckCircle,
    defaultLabel: "Active",
  },
  completed: {
    variant: "status-completed",
    icon: CircleDot,
    defaultLabel: "Completed",
  },
  cancelled: {
    variant: "status-cancelled",
    icon: XCircle,
    defaultLabel: "Cancelled",
  },
  rejected: {
    variant: "status-rejected",
    icon: XCircle,
    defaultLabel: "Rejected",
  },
  reviewed: {
    variant: "status-reviewed",
    icon: Eye,
    defaultLabel: "Reviewed",
  },
  verified: {
    variant: "status-verified",
    icon: ShieldCheck,
    defaultLabel: "Verified",
  },
  blocked: {
    variant: "status-blocked",
    icon: XCircle,
    defaultLabel: "Blocked",
  },
  frozen: {
    variant: "status-frozen",
    icon: Snowflake,
    defaultLabel: "Frozen",
  },
  not_started: {
    variant: "status-completed",
    icon: AlertTriangle,
    defaultLabel: "Not Started",
  },
  in_progress: {
    variant: "status-pending",
    icon: Loader2,
    defaultLabel: "In Progress",
  },
  upcoming: {
    variant: "status-confirmed",
    icon: Clock,
    defaultLabel: "Upcoming",
  },
  expired: {
    variant: "status-expired",
    icon: Timer,
    defaultLabel: "Expired",
  },
  processing: {
    variant: "status-processing",
    icon: Loader2,
    defaultLabel: "Processing",
  },
  awaiting_payment: {
    variant: "status-awaiting-payment",
    icon: CreditCard,
    defaultLabel: "Awaiting Payment",
  },
  ongoing: {
    variant: "status-active",
    icon: Loader2,
    defaultLabel: "Ongoing",
  },
  refunded: {
    variant: "status-pending",
    icon: CreditCard,
    defaultLabel: "Refunded",
  },
  paid: {
    variant: "status-verified",
    icon: CheckCircle,
    defaultLabel: "Paid",
  },
  unpaid: {
    variant: "status-pending",
    icon: Clock,
    defaultLabel: "Unpaid",
  },
  failed: {
    variant: "status-rejected",
    icon: XCircle,
    defaultLabel: "Failed",
  },
  low: {
    variant: "status-verified",
    icon: ShieldCheck,
    defaultLabel: "Low",
  },
  medium: {
    variant: "status-pending",
    icon: AlertTriangle,
    defaultLabel: "Medium",
  },
  high: {
    variant: "status-rejected",
    icon: AlertTriangle,
    defaultLabel: "High",
  },
  reverify_requested: {
    variant: "status-pending",
    icon: Clock,
    defaultLabel: "Re-verify Requested",
  },
  suspended: {
    variant: "status-frozen",
    icon: Snowflake,
    defaultLabel: "Suspended",
  },
};

// Map common status strings to StatusType
const normalizeStatus = (status: string): StatusType => {
  const normalized = status.toLowerCase().replace(/[_-]/g, "_");
  
  const mappings: Record<string, StatusType> = {
    new: "new",
    pending: "pending",
    pending_review: "pending",
    confirmed: "confirmed",
    active: "active",
    completed: "completed",
    done: "completed",
    cancelled: "cancelled",
    canceled: "cancelled",
    rejected: "rejected",
    reviewed: "reviewed",
    under_review: "reviewed",
    verified: "verified",
    approved: "verified",
    blocked: "blocked",
    frozen: "frozen",
    not_started: "not_started",
    in_progress: "in_progress",
    upcoming: "upcoming",
    expired: "expired",
    processing: "processing",
    awaiting_payment: "awaiting_payment",
    waiting_payment: "awaiting_payment",
    payment_pending: "awaiting_payment",
    ongoing: "ongoing",
    refunded: "refunded",
    paid: "paid",
    unpaid: "unpaid",
    failed: "failed",
    low: "low",
    medium: "medium",
    high: "high",
    reverify_requested: "reverify_requested",
    suspended: "suspended",
    not_verified: "not_started",
  };

  return mappings[normalized] || "pending";
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

const animationClasses = {
  none: "",
  pulse: "animate-pulse",
  loading: "",
};

export const StatusBadge = ({
  status,
  label,
  showIcon = true,
  size = "md",
  className,
  animate = "none",
}: StatusBadgeProps) => {
  const normalizedStatus = normalizeStatus(status);
  const config = statusConfig[normalizedStatus] || statusConfig.pending;
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  // Determine if icon should spin (loading animation, in_progress, or processing status)
  const shouldSpin = animate === "loading" || normalizedStatus === "in_progress" || normalizedStatus === "processing";

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "gap-1",
        sizeClasses[size],
        animationClasses[animate],
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            iconSizes[size],
            shouldSpin && "animate-spin"
          )}
        />
      )}
      {displayLabel}
    </Badge>
  );
};

// Helper to get just the variant for a status (useful when you need more control)
export const getStatusVariant = (status: string) => {
  const normalizedStatus = normalizeStatus(status);
  return statusConfig[normalizedStatus]?.variant || "outline";
};

// Helper to get the icon component for a status
export const getStatusIcon = (status: string) => {
  const normalizedStatus = normalizeStatus(status);
  return statusConfig[normalizedStatus]?.icon || CircleDot;
};

export { statusConfig, normalizeStatus };
