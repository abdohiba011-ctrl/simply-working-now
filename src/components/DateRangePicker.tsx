import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, addDays } from "date-fns";
import { Calendar as CalendarIcon, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  dailyPrice?: number;
  showPriceBreakdown?: boolean;
  maxDays?: number;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

export const DateRangePicker = ({
  dateRange,
  onDateChange,
  dailyPrice = 0,
  showPriceBreakdown = false,
  maxDays = 30,
  className,
  triggerClassName,
  placeholder,
}: DateRangePickerProps) => {
  const { t, isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);

  // Sync tempRange when dateRange changes externally
  useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  const days = tempRange?.from && tempRange?.to 
    ? differenceInDays(tempRange.to, tempRange.from)
    : 0;

  const isOverMaxDays = days > maxDays;
  const totalPrice = days * dailyPrice;

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const daysDiff = differenceInDays(range.to, range.from);
      
      if (daysDiff > maxDays) {
        toast.error(t('datePicker.maxDaysError').replace('{{maxDays}}', String(maxDays)));
        // Clamp the end date to maxDays from start
        setTempRange({
          from: range.from,
          to: addDays(range.from, maxDays)
        });
        return;
      }
      
      if (daysDiff > 14) {
        toast.warning(t('datePicker.longRentalWarning'));
      }
    }
    
    setTempRange(range);
  };

  const handleApply = () => {
    if (!tempRange?.from || !tempRange?.to) {
      toast.error(t('datePicker.selectBothDates'));
      return;
    }
    
    onDateChange(tempRange);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempRange(undefined);
    onDateChange(undefined);
  };

  const handleCancel = () => {
    setTempRange(dateRange);
    setIsOpen(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const displayPlaceholder = placeholder || t('datePicker.selectDates');

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="lg" 
          className={cn(
            "w-full h-14 text-base justify-start bg-background border-2 hover:bg-muted",
            (!dateRange?.from || !dateRange?.to) && "text-muted-foreground",
            triggerClassName,
            className
          )}
        >
          <CalendarIcon className={`h-5 w-5 ${isRTL ? 'ml-3' : 'mr-3'} text-foreground`} />
          {dateRange?.from && dateRange?.to
            ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
            : displayPlaceholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-popover border shadow-xl z-[100]" align="center">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <CalendarIcon className="h-5 w-5 text-foreground" />
          <span className="font-semibold text-foreground">{t('datePicker.title')}</span>
        </div>

        <div className="p-3">
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={handleSelect}
            numberOfMonths={isMobile ? 1 : 2}
            disabled={(date) => date < today}
          />
          
          {/* Price Breakdown */}
          {showPriceBreakdown && days > 0 && dailyPrice > 0 && (
            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {dailyPrice} DH × {days} {days === 1 ? t('datePicker.day') : t('datePicker.days')}
                </span>
                <span className="font-semibold text-foreground">{totalPrice} DH</span>
              </div>
              
              {isOverMaxDays && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{t('datePicker.maxDaysWarning').replace('{{maxDays}}', String(maxDays))}</span>
                </div>
              )}
              
              {days > 14 && !isOverMaxDays && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-md text-amber-600 dark:text-amber-400 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{t('datePicker.longRentalNote')}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              {t('datePicker.reset')}
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                {t('datePicker.cancel')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={!tempRange?.from || !tempRange?.to || isOverMaxDays}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {t('datePicker.apply')}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
