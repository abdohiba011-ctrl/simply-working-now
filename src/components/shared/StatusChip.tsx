import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  pending_review: "bg-warning/10 text-warning border-warning/20",
  pending_confirmation: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary-foreground/80 border-primary/30 dark:text-primary",
  in_progress: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  active: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  completed: "bg-success/10 text-success border-success/20",
  approved: "bg-success/10 text-success border-success/20",
  paid: "bg-success/10 text-success border-success/20",
  draft: "bg-muted text-muted-foreground border-border",
  inactive: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  suspended: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled_by_renter: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled_by_agency: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled_by_agency_late: "bg-destructive/15 text-destructive border-destructive/30",
  declined: "bg-destructive/10 text-destructive border-destructive/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-border",
  unpaid: "bg-warning/10 text-warning border-warning/20",
};

const labels: Record<string, string> = {
  pending: "Pending",
  pending_review: "Pending verification",
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  active: "Active",
  completed: "Completed",
  approved: "Live on Motonita",
  paid: "Paid",
  draft: "Draft",
  inactive: "Suspended",
  suspended: "Suspended",
  cancelled: "Cancelled",
  cancelled_by_renter: "Cancelled by renter",
  cancelled_by_agency: "Cancelled by agency",
  cancelled_by_agency_late: "Late cancel (agency)",
  declined: "Declined",
  rejected: "Rejected",
  no_show: "No-Show",
  unpaid: "Unpaid",
};

interface Props {
  status: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusChip = ({ status, size = "sm", className }: Props) => {
  const sizing = size === "lg" ? "px-3 py-1 text-sm" : size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-xs";
  const style = styles[status] || "bg-muted text-muted-foreground border-border";
  const label = labels[status] || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium capitalize",
        style,
        sizing,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};
