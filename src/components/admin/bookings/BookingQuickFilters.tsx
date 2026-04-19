import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  CreditCard,
  Calendar,
  AlertTriangle,
  UserX
} from "lucide-react";

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
  color: string;
}

interface BookingQuickFiltersProps {
  activeFilters: string[];
  onToggleFilter: (filterId: string) => void;
  counts: {
    new: number;
    reviewed: number;
    confirmed: number;
    rejected: number;
    unpaid: number;
    partially_paid: number;
    paid: number;
    failed: number;
    pickupToday: number;
    pickupThisWeek: number;
    overdueReturn: number;
    unassigned: number;
  };
}

export const BookingQuickFilters = ({ 
  activeFilters, 
  onToggleFilter,
  counts 
}: BookingQuickFiltersProps) => {
  const adminStatusFilters: QuickFilter[] = [
    { id: 'admin_new', label: 'New', icon: Clock, count: counts.new, color: 'bg-info/10 text-info border-info/30 hover:bg-info/20' },
    { id: 'admin_reviewed', label: 'Reviewed', icon: AlertCircle, count: counts.reviewed, color: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/100/20' },
    { id: 'admin_confirmed', label: 'Confirmed', icon: CheckCircle, count: counts.confirmed, color: 'bg-success/10 text-success border-success/30 hover:bg-success/100/20' },
    { id: 'admin_rejected', label: 'Rejected', icon: XCircle, count: counts.rejected, color: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20' },
  ];

  const paymentFilters: QuickFilter[] = [
    { id: 'payment_unpaid', label: 'Unpaid', icon: CreditCard, count: counts.unpaid, color: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20' },
    { id: 'payment_partially_paid', label: 'Partial', icon: CreditCard, count: counts.partially_paid, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20' },
    { id: 'payment_paid', label: 'Paid', icon: CreditCard, count: counts.paid, color: 'bg-success/10 text-success border-success/30 hover:bg-success/100/20' },
    { id: 'payment_failed', label: 'Failed', icon: AlertTriangle, count: counts.failed, color: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20' },
  ];

  const specialFilters: QuickFilter[] = [
    { id: 'pickup_today', label: 'Pickup Today', icon: Calendar, count: counts.pickupToday, color: 'bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20' },
    { id: 'pickup_this_week', label: 'This Week', icon: Calendar, count: counts.pickupThisWeek, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/20' },
    { id: 'overdue_return', label: 'Overdue', icon: AlertTriangle, count: counts.overdueReturn, color: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20' },
    { id: 'unassigned', label: 'Unassigned', icon: UserX, count: counts.unassigned, color: 'bg-muted text-muted-foreground border-border hover:bg-muted' },
  ];

  const renderFilterChip = (filter: QuickFilter) => {
    const isActive = activeFilters.includes(filter.id);
    const Icon = filter.icon;
    
    return (
      <Button
        key={filter.id}
        variant="outline"
        size="sm"
        onClick={() => onToggleFilter(filter.id)}
        className={`
          h-8 gap-1.5 transition-all
          ${isActive ? `${filter.color} ring-2 ring-offset-1 ring-primary/50` : 'hover:bg-muted'}
        `}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{filter.label}</span>
        {filter.count !== undefined && filter.count > 0 && (
          <Badge 
            variant="secondary" 
            className="h-5 min-w-5 px-1.5 text-xs ml-1"
          >
            {filter.count}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Admin Status Row */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground font-medium self-center mr-2">
          Admin Status:
        </span>
        {adminStatusFilters.map(renderFilterChip)}
      </div>

      {/* Payment Status Row */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground font-medium self-center mr-2">
          Payment:
        </span>
        {paymentFilters.map(renderFilterChip)}
      </div>

      {/* Special Filters Row */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground font-medium self-center mr-2">
          Special:
        </span>
        {specialFilters.map(renderFilterChip)}
      </div>
    </div>
  );
};
