import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Shield,
  Bike,
  IdCard,
  Star,
  StickyNote,
  Activity,
  Calendar,
  CalendarDays,
  XCircle,
  Download,
} from "lucide-react";
import { format, parseISO, subMonths, subYears, startOfWeek, startOfMonth, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ClientData, TimelineEventData, TimelineEventType } from "./types";
import { formatDateTime, formatRelativeTime, getTimelineEventColor } from "./helpers";

interface ClientTimelineTabProps {
  client: ClientData;
  timelineEvents: TimelineEventData[];
}

const getTimelineEventIcon = (type: TimelineEventType) => {
  switch (type) {
    case "ADMIN_ACTION":
      return <Shield className="h-4 w-4" />;
    case "BOOKING":
      return <Bike className="h-4 w-4" />;
    case "KYC":
      return <IdCard className="h-4 w-4" />;
    case "TRUST":
      return <Star className="h-4 w-4" />;
    case "NOTE":
      return <StickyNote className="h-4 w-4" />;
    case "SYSTEM":
      return <Activity className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

export const ClientTimelineTab = ({ client, timelineEvents }: ClientTimelineTabProps) => {
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<string>("all");
  const [timelineDateFilter, setTimelineDateFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  const filteredTimeline = useMemo(() => {
    let filtered = timelineEvents;
    
    // Filter by type
    if (timelineTypeFilter !== "all") {
      filtered = filtered.filter((e) => e.type === timelineTypeFilter);
    }
    
    // Filter by date range
    if (timelineDateFilter === "custom" && customDateRange.from) {
      const fromDate = startOfDay(customDateRange.from);
      const toDate = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(new Date());
      
      filtered = filtered.filter((e) => {
        if (!e.datetime) return false;
        const eventDate = parseISO(e.datetime);
        return isAfter(eventDate, fromDate) && isBefore(eventDate, toDate);
      });
    } else if (timelineDateFilter !== "all" && timelineDateFilter !== "custom") {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (timelineDateFilter) {
        case "this_week":
          cutoffDate = startOfWeek(now, { weekStartsOn: 1 });
          break;
        case "this_month":
          cutoffDate = startOfMonth(now);
          break;
        case "last_3_months":
          cutoffDate = subMonths(now, 3);
          break;
        case "last_6_months":
          cutoffDate = subMonths(now, 6);
          break;
        case "last_year":
          cutoffDate = subYears(now, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      filtered = filtered.filter((e) => {
        if (!e.datetime) return false;
        const eventDate = parseISO(e.datetime);
        return isAfter(eventDate, cutoffDate);
      });
    }
    
    return filtered;
  }, [timelineEvents, timelineTypeFilter, timelineDateFilter, customDateRange]);

  const exportTimelineToCSV = () => {
    if (filteredTimeline.length === 0) {
      toast.error("No events to export");
      return;
    }
    
    const headers = ["Date", "Time", "Type", "Label", "Description", "Actor", "Related ID"];
    const rows = filteredTimeline.map((event) => {
      const date = event.datetime ? format(parseISO(event.datetime), "yyyy-MM-dd") : "N/A";
      const time = event.datetime ? format(parseISO(event.datetime), "HH:mm:ss") : "N/A";
      return [
        date,
        time,
        event.type,
        `"${event.label.replace(/"/g, '""')}"`,
        `"${event.description.replace(/"/g, '""')}"`,
        event.actor,
        event.relatedId || ""
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `timeline_${client.name?.replace(/\s+/g, "_") || "client"}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Timeline exported to CSV");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={timelineTypeFilter} onValueChange={setTimelineTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="ADMIN_ACTION">Admin Actions</SelectItem>
                <SelectItem value="BOOKING">Bookings</SelectItem>
                <SelectItem value="KYC">KYC</SelectItem>
                <SelectItem value="TRUST">Trust Changes</SelectItem>
                <SelectItem value="NOTE">Notes</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={timelineDateFilter} onValueChange={(value) => {
              setTimelineDateFilter(value);
              if (value === "custom") {
                setIsCustomDateOpen(true);
              }
            }}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2 opacity-50" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Custom Date Range Picker */}
            {timelineDateFilter === "custom" && (
              <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(
                    "justify-start text-left font-normal",
                    !customDateRange.from && "text-muted-foreground"
                  )}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {customDateRange.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, "MMM d")} - {format(customDateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        format(customDateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      "Pick dates"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange.from}
                    selected={{ from: customDateRange.from, to: customDateRange.to }}
                    onSelect={(range) => {
                      setCustomDateRange({ from: range?.from, to: range?.to });
                      if (range?.from && range?.to) {
                        setIsCustomDateOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}
            
            {(timelineTypeFilter !== "all" || timelineDateFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setTimelineTypeFilter("all");
                  setTimelineDateFilter("all");
                  setCustomDateRange({ from: undefined, to: undefined });
                }}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">
                {filteredTimeline.length} event{filteredTimeline.length !== 1 ? 's' : ''}
              </span>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportTimelineToCSV}
                disabled={filteredTimeline.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Complete audit log of all events</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTimeline.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No timeline events yet</p>
          ) : (
            <div className="space-y-4">
              {filteredTimeline.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn("p-2 rounded-full", getTimelineEventColor(event.type))}>
                      {getTimelineEventIcon(event.type)}
                    </div>
                    {index < filteredTimeline.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{event.label}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{event.actor}</span>
                          <span>•</span>
                          <span>{formatDateTime(event.datetime)}</span>
                          <span className="text-xs">({formatRelativeTime(event.datetime)})</span>
                        </div>
                      </div>
                      {event.relatedId && (
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                          {event.relatedId.slice(0, 8)}...
                        </code>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
