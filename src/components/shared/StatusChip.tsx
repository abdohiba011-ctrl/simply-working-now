import { cn } from "@/lib/utils";
import { AgencyBookingStatus } from "@/data/agencyMockData";

const styles: Record<AgencyBookingStatus, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary-foreground/80 border-primary/30 dark:text-primary",
  in_progress: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-border",
};

const labels: Record<AgencyBookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-Show",
};

interface Props {
  status: AgencyBookingStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusChip = ({ status, size = "sm", className }: Props) => {
  const sizing = size === "lg" ? "px-3 py-1 text-sm" : size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        styles[status],
        sizing,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
};
