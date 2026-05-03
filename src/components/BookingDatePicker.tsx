import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, X, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface BookingDatePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  triggerClassName?: string;
  placeholder?: string;
  align?: "start" | "center" | "end";
  /** When true, render only the inline panel (no trigger). Used when host opens it. */
  panelOnly?: boolean;
}

const today0 = () => startOfDay(new Date());

const Panel = ({
  range,
  setRange,
  focus,
  setFocus,
  isMobile,
  onClose,
}: {
  range: DateRange | undefined;
  setRange: (r: DateRange | undefined) => void;
  focus: "from" | "to";
  setFocus: (f: "from" | "to") => void;
  isMobile: boolean;
  onClose: () => void;
}) => {
  const days = range?.from && range?.to ? differenceInDays(range.to, range.from) : 0;

  const handleSelect = (next: DateRange | undefined) => {
    // The DayPicker fires with various shapes — implement custom logic so the
    // currently focused box (Pickup/Return) controls assignment.
    if (!next) {
      setRange(undefined);
      setFocus("from");
      return;
    }

    // Determine the date the user just clicked.
    const prev = range;
    let clicked: Date | undefined;
    if (next.from && (!prev?.from || next.from.getTime() !== prev.from.getTime())) {
      clicked = next.from;
    } else if (next.to && (!prev?.to || next.to.getTime() !== prev.to.getTime())) {
      clicked = next.to;
    } else {
      clicked = next.from;
    }
    if (!clicked) return;

    if (focus === "from") {
      // Start a new selection from this date
      setRange({ from: clicked, to: undefined });
      setFocus("to");
      return;
    }

    // focus === "to"
    if (!prev?.from) {
      setRange({ from: clicked, to: undefined });
      setFocus("to");
      return;
    }
    if (isBefore(clicked, prev.from)) {
      // Clicked earlier than pickup → make it the new pickup
      setRange({ from: clicked, to: undefined });
      setFocus("to");
      return;
    }
    setRange({ from: prev.from, to: clicked });
    // Auto-close after a short delay
    window.setTimeout(() => onClose(), 280);
  };

  const handleReset = () => {
    setRange(undefined);
    setFocus("from");
  };

  return (
    <div className="bg-white text-[#163300] rounded-2xl shadow-xl overflow-hidden">
      {/* Pickup / Return header boxes */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-[#163300]/10">
        <button
          type="button"
          onClick={() => setFocus("from")}
          className={cn(
            "rounded-xl border-2 px-3 py-2 text-left transition-colors",
            focus === "from"
              ? "border-[#9FE870] bg-[#9FE870]/10"
              : "border-[#163300]/15 bg-white hover:border-[#163300]/40",
          )}
        >
          <div className="text-[10px] font-semibold tracking-wider uppercase text-[#163300]/60">
            Pickup
          </div>
          <div className="text-sm font-semibold">
            {range?.from ? format(range.from, "MMM d, yyyy") : "Select"}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setFocus("to")}
          className={cn(
            "rounded-xl border-2 px-3 py-2 text-left transition-colors",
            focus === "to"
              ? "border-[#9FE870] bg-[#9FE870]/10"
              : "border-[#163300]/15 bg-white hover:border-[#163300]/40",
          )}
        >
          <div className="text-[10px] font-semibold tracking-wider uppercase text-[#163300]/60">
            Return
          </div>
          <div className="text-sm font-semibold">
            {range?.to ? format(range.to, "MMM d, yyyy") : "Select"}
          </div>
        </button>
      </div>

      <div className="p-2">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={isMobile ? 1 : 2}
          weekStartsOn={0}
          disabled={(d) => d < today0()}
          className="pointer-events-auto"
        />
      </div>

      {/* Long-rental warning */}
      {days > 30 && (
        <div className="px-4 pb-2 text-xs text-amber-700">
          Long rental — confirm dates with the agency after booking.
        </div>
      )}

      {/* Footer: legend + reset */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#163300]/10 text-xs">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-[#163300]/70 hover:text-[#163300] font-medium"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
        <div className="flex items-center gap-3 text-[#163300]/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-[#333] ring-inset" />
            Today
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#9FE870]" />
            Selected
          </span>
        </div>
      </div>
    </div>
  );
};

export const BookingDatePicker = ({
  value,
  onChange,
  triggerClassName,
  placeholder = "Pick-up → Return",
  align = "start",
  panelOnly = false,
}: BookingDatePickerProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(value);
  const [focus, setFocus] = useState<"from" | "to">("from");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setTempRange(value), [value]);

  // Close on outside click (desktop popover only)
  useEffect(() => {
    if (!open || isMobile) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        popoverRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) {
        return;
      }
      commitAndClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") commitAndClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile, tempRange]);

  // Position the desktop popover
  useEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 640;
    let left = rect.left + window.scrollX;
    if (align === "center") left = rect.left + rect.width / 2 - width / 2 + window.scrollX;
    if (align === "end") left = rect.right - width + window.scrollX;
    // clamp
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPopoverPos({ top: rect.bottom + 8 + window.scrollY, left });
  }, [open, isMobile, align]);

  const commitAndClose = () => {
    if (tempRange?.from && tempRange?.to) {
      onChange(tempRange);
    } else {
      // revert half-selection
      setTempRange(value);
    }
    setOpen(false);
  };

  const handleOpen = () => {
    setTempRange(value);
    setFocus(value?.from && !value?.to ? "to" : "from");
    setOpen(true);
  };

  const handleChange = (r: DateRange | undefined) => {
    setTempRange(r);
    if (r?.from && r?.to) {
      // Apply immediately and close shortly after (panel handles the timing)
      onChange(r);
    }
  };

  const label = value?.from && value?.to
    ? `${format(value.from, "MMM d")} → ${format(value.to, "MMM d")}`
    : value?.from
      ? `${format(value.from, "MMM d")} → ...`
      : placeholder;

  return (
    <>
      {!panelOnly && (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className={cn(
            "h-12 w-full rounded-md border-2 bg-white px-3 text-left text-sm flex items-center justify-between gap-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !value?.from && "text-muted-foreground",
            triggerClassName,
          )}
          aria-label="Pick rental dates"
        >
          <span className="truncate">{label}</span>
          <CalendarIcon className="h-4 w-4 opacity-60 shrink-0" />
        </button>
      )}

      {/* Desktop popover via portal */}
      {open && !isMobile && popoverPos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: popoverPos.top, left: popoverPos.left, width: 640 }}
            className="fixed z-[200]"
          >
            <Panel
              range={tempRange}
              setRange={handleChange}
              focus={focus}
              setFocus={setFocus}
              isMobile={false}
              onClose={() => setOpen(false)}
            />
          </div>,
          document.body,
        )}

      {/* Mobile bottom sheet */}
      {isMobile && (
        <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : commitAndClose())}>
          <SheetContent
            side="bottom"
            className="p-0 h-[70vh] rounded-t-2xl border-t-0 bg-transparent"
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-center pt-2 pb-1">
                <span className="h-1.5 w-12 rounded-full bg-white/60" />
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3">
                <Panel
                  range={tempRange}
                  setRange={handleChange}
                  focus={focus}
                  setFocus={setFocus}
                  isMobile
                  onClose={() => setOpen(false)}
                />
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={commitAndClose}
              className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-[#163300]" />
            </button>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
