import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimelineSkeleton } from "@/components/ui/bike-skeleton";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Send,
  FileText,
  StickyNote,
  CreditCard,
  User,
  RotateCcw,
  UserX
} from "lucide-react";
import { format } from "date-fns";
import type { BookingEvent } from "@/hooks/useBookingEvents";

interface BookingTimelineProps {
  events: BookingEvent[];
  isLoading: boolean;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'CREATED':
      return <Clock className="h-4 w-4" />;
    case 'CONFIRMED':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'UNCONFIRMED':
      return <RotateCcw className="h-4 w-4 text-warning" />;
    case 'REJECTED':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'UNREJECTED':
      return <RotateCcw className="h-4 w-4 text-warning" />;
    case 'ASSIGNED':
      return <Send className="h-4 w-4 text-info" />;
    case 'UNASSIGNED':
      return <UserX className="h-4 w-4 text-muted-foreground" />;
    case 'PAYMENT_RECORDED':
      return <CreditCard className="h-4 w-4 text-success" />;
    case 'CONTRACT_GENERATED':
    case 'CONTRACT_SENT':
    case 'CONTRACT_SIGNED':
      return <FileText className="h-4 w-4 text-info" />;
    case 'NOTE_ADDED':
      return <StickyNote className="h-4 w-4 text-purple-600" />;
    case 'REVIEWED':
      return <AlertCircle className="h-4 w-4 text-warning" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'CREATED':
      return 'Booking created';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'UNCONFIRMED':
      return 'Unconfirmed';
    case 'REJECTED':
      return 'Rejected';
    case 'UNREJECTED':
      return 'Unrejected';
    case 'ASSIGNED':
      return 'Assigned to business';
    case 'UNASSIGNED':
      return 'Business unassigned';
    case 'PAYMENT_RECORDED':
      return 'Payment recorded';
    case 'CONTRACT_GENERATED':
      return 'Contract generated';
    case 'CONTRACT_SENT':
      return 'Contract sent';
    case 'CONTRACT_SIGNED':
      return 'Contract signed';
    case 'NOTE_ADDED':
      return 'Note added';
    case 'REVIEWED':
      return 'Marked as reviewed';
    default:
      return action.replace(/_/g, ' ').toLowerCase();
  }
};

export const BookingTimeline = ({ events, isLoading }: BookingTimelineProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No activity recorded yet
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
              
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="relative flex gap-3">
                    {/* Icon dot */}
                    <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background border">
                      {getActionIcon(event.action)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {getActionLabel(event.action)}
                        </p>
                        <time className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(event.created_at), 'MMM d, HH:mm')}
                        </time>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.actor_type === 'system' 
                          ? 'System'
                          : event.actor_name || 'Admin'}
                      </p>
                      
                      {/* Show meta info if available */}
                      {event.meta && typeof event.meta === 'object' && !Array.isArray(event.meta) && (
                        <div className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          {(event.meta as Record<string, unknown>).reason && (
                            <p>Reason: {String((event.meta as Record<string, unknown>).reason)}</p>
                          )}
                          {(event.meta as Record<string, unknown>).amount && (
                            <p>Amount: {String((event.meta as Record<string, unknown>).amount)} DH</p>
                          )}
                          {(event.meta as Record<string, unknown>).business_name && (
                            <p>Business: {String((event.meta as Record<string, unknown>).business_name)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
