import { CheckCircle2, Clock, XCircle, FileEdit, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bike {
  approval_status?: string | null;
  business_status?: string | null;
}

interface Props {
  bike: Bike;
  className?: string;
}

/**
 * Compact badge that summarizes a bike's publishing state for agency UI.
 * Combines approval_status + business_status into a single user-facing label.
 */
export const BikeApprovalBadge = ({ bike, className }: Props) => {
  const a = bike.approval_status || "draft";
  const b = bike.business_status || "inactive";

  // Approved but admin-suspended
  if (a === "approved" && b !== "active") {
    return (
      <span className={cn(badgeBase, "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400", className)}>
        <AlertTriangle className="h-3 w-3" /> Suspended
      </span>
    );
  }
  if (a === "approved") {
    return (
      <span className={cn(badgeBase, "border-success/30 bg-success/10 text-success", className)}>
        <CheckCircle2 className="h-3 w-3" /> Live on Motonita
      </span>
    );
  }
  if (a === "rejected") {
    return (
      <span className={cn(badgeBase, "border-destructive/30 bg-destructive/10 text-destructive", className)}>
        <XCircle className="h-3 w-3" /> Rejected — see reason
      </span>
    );
  }
  if (a === "pending") {
    return (
      <span className={cn(badgeBase, "border-warning/30 bg-warning/10 text-warning", className)}>
        <Clock className="h-3 w-3" /> Pending verification
      </span>
    );
  }
  return (
    <span className={cn(badgeBase, "border-border bg-muted text-muted-foreground", className)}>
      <FileEdit className="h-3 w-3" /> Draft
    </span>
  );
};

const badgeBase =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium";
